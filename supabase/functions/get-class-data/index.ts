// Edge Function para carregar dados de turma com cache Redis
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Redis } from 'https://esm.sh/@upstash/redis@1.20.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Inicializar Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verificar autenticação
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Get request data
    const { classId } = await req.json();

    if (!classId) {
      return new Response(JSON.stringify({ error: 'classId is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Inicializar Redis (Upstash)
    const redis = new Redis({
      url: Deno.env.get('UPSTASH_REDIS_REST_URL') ?? '',
      token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN') ?? '',
    });

    // Cache key
    const cacheKey = `class:${classId}:data:${user.id}`;
    const cacheTTL = 300; // 5 minutos

    // Tentar buscar do cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log('Cache HIT for', cacheKey);
      return new Response(JSON.stringify({ data: cached, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log('Cache MISS for', cacheKey);

    // Verificar se usuário é membro da turma
    const { data: membership } = await supabaseClient
      .from('class_members')
      .select('role')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Not a class member' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Buscar dados da turma em paralelo
    const [classInfo, materials, discussions, activities, members] = await Promise.all([
      // 1. Info da turma
      supabaseClient
        .from('classes')
        .select('id, name, subject, description, color, banner_color')
        .eq('id', classId)
        .single(),

      // 2. Materiais (posts, comunicados, biblioteca)
      supabaseClient
        .from('class_materials')
        .select(`
          id,
          title,
          description,
          file_url,
          file_type,
          file_size,
          category,
          tags,
          created_at,
          creator:profiles!class_materials_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq('class_id', classId)
        .order('created_at', { ascending: false })
        .limit(50),

      // 3. Discussões
      supabaseClient
        .from('discussions')
        .select(`
          id,
          title,
          description,
          created_at,
          is_pinned,
          author:profiles!discussions_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq('class_id', classId)
        .order('created_at', { ascending: false })
        .limit(20),

      // 4. Atividades
      supabaseClient
        .from('activity_class_assignments')
        .select(`
          activity_id,
          activity:activities(
            id,
            title,
            description,
            due_date,
            max_score,
            type,
            status
          )
        `)
        .eq('class_id', classId),

      // 5. Membros
      supabaseClient
        .from('class_members')
        .select(`
          id,
          role,
          joined_at,
          profile:profiles!class_members_user_id_fkey(
            id,
            full_name,
            avatar_url,
            email
          )
        `)
        .eq('class_id', classId)
        .order('role', { ascending: true }),
    ]);

    // Separar materiais por categoria
    const allMaterials = materials.data || [];
    console.log('📦 Total de materiais:', allMaterials.length);
    console.log('📦 Categorias dos materiais:', allMaterials.map(m => ({ id: m.id, title: m.title, category: m.category || 'NULL' })));
    
    // Posts: category = 'post' OU category = null/undefined
    const posts = allMaterials.filter(m => !m.category || m.category === 'post');
    
    // Comunicados: category = 'announcement'
    const announcements = allMaterials.filter(m => m.category === 'announcement');
    
    // Biblioteca: qualquer outra categoria (material, pdf, video, document, etc)
    const library = allMaterials.filter(m => m.category && m.category !== 'post' && m.category !== 'announcement');

    console.log('📊 Separação final:', {
      posts: posts.length,
      announcements: announcements.length,
      library: library.length,
      activities: activities.data?.length || 0,
      members: members.data?.length || 0
    });
    
    console.log('📢 Comunicados:', announcements.map(a => ({ title: a.title, category: a.category })));
    console.log('📚 Biblioteca:', library.map(l => ({ title: l.title, category: l.category })));

    // Montar resposta
    const response = {
      classInfo: classInfo.data,
      posts,
      announcements,
      library,
      discussions: discussions.data || [],
      activities: activities.data?.map(a => a.activity).filter(Boolean) || [],
      members: members.data || [],
      timestamp: new Date().toISOString(),
    };

    // Salvar no cache
    await redis.setex(cacheKey, cacheTTL, JSON.stringify(response));

    return new Response(JSON.stringify({ data: response, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
