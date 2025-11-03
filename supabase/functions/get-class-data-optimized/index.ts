/**
 * Edge Function OTIMIZADA com Redis Cache
 * Busca dados da turma para alunos com cache inteligente
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { cache, generateCacheKey, TTL } from '../_shared/redisCache.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { classId } = await req.json();

    if (!classId) {
      return new Response(
        JSON.stringify({ error: 'classId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gerar chave de cache
    const cacheKey = generateCacheKey('class-data', classId);

    // Tentar obter do cache
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      console.log(`[CACHE HIT] ${cacheKey}`);
      return new Response(
        JSON.stringify({
          data: cachedData,
          cached: true,
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Cache': 'HIT'
          } 
        }
      );
    }

    console.log(`[CACHE MISS] ${cacheKey}`);

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ✅ QUERY OTIMIZADA - Tudo em uma única chamada
    const { data: classInfo, error: classError } = await supabase
      .from('classes')
      .select(`
        id,
        name,
        subject,
        description,
        color,
        banner_color,
        created_at
      `)
      .eq('id', classId)
      .eq('is_active', true)
      .single();

    if (classError || !classInfo) {
      throw new Error('Turma não encontrada');
    }

    // ✅ EAGER LOADING - Buscar tudo em paralelo
    const [
      { data: posts },
      { data: discussions },
      { data: announcements },
      { data: library },
      { data: activities },
      { data: members }
    ] = await Promise.all([
      // Posts/Materials
      supabase
        .from('class_materials')
        .select('id, title, description, file_url, file_type, created_at')
        .eq('class_id', classId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20),

      // Discussions
      supabase
        .from('discussions')
        .select('id, title, description, created_at, is_pinned')
        .eq('class_id', classId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20),

      // Announcements
      supabase
        .from('announcements')
        .select('id, title, content, created_at')
        .eq('class_id', classId)
        .order('created_at', { ascending: false })
        .limit(10),

      // Library
      supabase
        .from('class_materials')
        .select('id, title, file_url, file_type, file_size, created_at')
        .eq('class_id', classId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50),

      // Activities (apenas publicadas, não deletadas)
      supabase
        .from('activities')
        .select(`
          id,
          title,
          description,
          due_date,
          max_score,
          status,
          created_at,
          assignments:activity_class_assignments!inner(class_id)
        `)
        .eq('assignments.class_id', classId)
        .eq('status', 'published')
        .is('deleted_at', null)
        .order('due_date', { ascending: true })
        .limit(50),

      // Members
      supabase
        .from('class_members')
        .select(`
          id,
          role,
          created_at,
          profile:profiles(id, full_name, email, avatar_url)
        `)
        .eq('class_id', classId)
        .order('role', { ascending: false })
        .limit(100)
    ]);

    // Montar resposta
    const responseData = {
      classInfo,
      posts: posts || [],
      discussions: discussions || [],
      announcements: announcements || [],
      library: library || [],
      activities: (activities || []).map(a => ({
        ...a,
        assignments: undefined // Remover join desnecessário
      })),
      members: members || []
    };

    // ✅ Salvar no cache com TTL de 5 minutos e tags
    await cache.set(cacheKey, responseData, {
      ttl: TTL.FIVE_MINUTES,
      tags: [`class:${classId}`]
    });

    return new Response(
      JSON.stringify({
        data: responseData,
        cached: false,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Cache': 'MISS'
        } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
