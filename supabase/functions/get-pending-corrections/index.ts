// Edge Function para Correções Pendentes com Cache Redis
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Redis } from 'https://esm.sh/@upstash/redis@1.20.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const { filterBy = 'all', sortBy = 'oldest' } = await req.json();

    // Inicializar Redis
    const redis = new Redis({
      url: Deno.env.get('UPSTASH_REDIS_REST_URL') ?? '',
      token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN') ?? '',
    });

    // Cache key
    const cacheKey = `corrections:${user.id}:${filterBy}:${sortBy}`;
    const cacheTTL = 180; // 3 minutos (atualiza mais rápido que analytics)

    // Tentar cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log('Cache HIT for corrections:', cacheKey);
      return new Response(JSON.stringify({ data: cached, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log('Cache MISS for corrections:', cacheKey);

    // Buscar turmas do professor
    const { data: teacherClasses } = await supabaseClient
      .from('classes')
      .select('id, name, subject, color')
      .eq('created_by', user.id)
      .eq('is_active', true);

    if (!teacherClasses || teacherClasses.length === 0) {
      const emptyResponse = {
        pending: [],
        stats: {
          totalPending: 0,
          urgent: 0,
          overdue: 0,
          byClass: []
        }
      };

      await redis.setex(cacheKey, cacheTTL, JSON.stringify(emptyResponse));

      return new Response(JSON.stringify({ data: emptyResponse, cached: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const classIds = teacherClasses.map(c => c.id);

    // Buscar submissões pendentes
    const { data: pendingSubmissions } = await supabaseClient
      .from('submissions')
      .select(`
        id,
        submitted_at,
        content,
        status,
        student_id,
        student:profiles!submissions_student_id_fkey(id, full_name, avatar_url, email),
        activity:activities!inner(
          id,
          title,
          max_score,
          due_date,
          activity_class_assignments!inner(class_id)
        )
      `)
      .eq('status', 'submitted')
      .in('activities.activity_class_assignments.class_id', classIds)
      .limit(500)
      .order('submitted_at', { ascending: sortBy === 'oldest' });

    // Processar dados
    const now = new Date();
    const pendingList = [];
    const byClass = {};

    pendingSubmissions?.forEach(sub => {
      const classId = sub.activity?.activity_class_assignments?.[0]?.class_id;
      if (!classId) return;

      const classInfo = teacherClasses.find(c => c.id === classId);
      if (!classInfo) return;

      const submittedDate = new Date(sub.submitted_at);
      const daysWaiting = Math.floor((now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24));
      const isUrgent = daysWaiting >= 7; // Mais de 7 dias esperando

      // Verificar se está atrasado (submissão após prazo)
      const dueDate = sub.activity?.due_date ? new Date(sub.activity.due_date) : null;
      const isOverdue = dueDate ? submittedDate > dueDate : false;

      const item = {
        id: sub.id,
        student: {
          id: sub.student?.id,
          name: sub.student?.full_name || 'Sem nome',
          avatar: sub.student?.avatar_url,
          email: sub.student?.email
        },
        activity: {
          id: sub.activity?.id,
          title: sub.activity?.title || 'Sem título',
          maxScore: sub.activity?.max_score || 100
        },
        class: {
          id: classInfo.id,
          name: classInfo.name,
          subject: classInfo.subject,
          color: classInfo.color
        },
        submittedAt: sub.submitted_at,
        daysWaiting,
        isUrgent,
        isOverdue
      };

      pendingList.push(item);

      // Agrupar por turma
      if (!byClass[classId]) {
        byClass[classId] = {
          classId,
          className: classInfo.name,
          count: 0,
          urgent: 0
        };
      }
      byClass[classId].count++;
      if (isUrgent) byClass[classId].urgent++;
    });

    // Aplicar filtros
    let filteredList = pendingList;
    if (filterBy === 'urgent') {
      filteredList = pendingList.filter(p => p.isUrgent);
    } else if (filterBy === 'overdue') {
      filteredList = pendingList.filter(p => p.isOverdue);
    }

    // Estatísticas
    const stats = {
      totalPending: pendingList.length,
      urgent: pendingList.filter(p => p.isUrgent).length,
      overdue: pendingList.filter(p => p.isOverdue).length,
      byClass: Object.values(byClass)
    };

    const response = {
      pending: filteredList,
      stats,
      timestamp: new Date().toISOString()
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
