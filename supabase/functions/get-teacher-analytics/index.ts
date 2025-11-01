// Edge Function para Analytics do Professor com Cache Redis
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

    const { period = '30', selectedClasses = [] } = await req.json();

    // Inicializar Redis
    const redis = new Redis({
      url: Deno.env.get('UPSTASH_REDIS_REST_URL') ?? '',
      token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN') ?? '',
    });

    // Cache key dinâmica baseada em filtros
    const cacheKey = `analytics:${user.id}:${period}:${selectedClasses.sort().join(',')}`;
    const cacheTTL = 300; // 5 minutos

    // Tentar cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log('Cache HIT for analytics:', cacheKey);
      return new Response(JSON.stringify({ data: cached, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log('Cache MISS for analytics:', cacheKey);

    // Data filter
    const dateFilter = period === 'all' ? null : 
      new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString();

    // Buscar turmas do professor
    const { data: classes } = await supabaseClient
      .from('classes')
      .select('id, name, subject, color')
      .eq('created_by', user.id)
      .eq('is_active', true);

    const classIds = selectedClasses.length > 0 ? selectedClasses : classes?.map(c => c.id) || [];

    if (classIds.length === 0) {
      return new Response(JSON.stringify({ 
        data: { 
          kpis: { totalStudents: 0, totalActivities: 0, pendingCorrections: 0, avgGrade: 0, onTimeRate: 0, openActivities: 0 },
          classes: []
        }, 
        cached: false 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Queries em paralelo
    const [membersData, activitiesData, pendingData, gradesData, onTimeData, openData] = await Promise.all([
      // 1. Total de alunos únicos
      supabaseClient
        .from('class_members')
        .select('user_id')
        .in('class_id', classIds)
        .eq('role', 'student'),

      // 2. Atividades no período
      supabaseClient
        .from('activity_class_assignments')
        .select('activity_id, activities!inner(id, created_at, status)')
        .in('class_id', classIds)
        .then(result => {
          if (!dateFilter || !result.data) return result;
          return {
            ...result,
            data: result.data.filter(a => 
              new Date(a.activities.created_at) >= new Date(dateFilter)
            )
          };
        }),

      // 3. Correções pendentes
      supabaseClient
        .from('submissions')
        .select('id, activity_id, activities!inner(id, activity_class_assignments!inner(class_id))')
        .eq('status', 'submitted')
        .in('activities.activity_class_assignments.class_id', classIds),

      // 4. Notas para média
      supabaseClient
        .from('submissions')
        .select('grade, graded_at, activity_id, activities!inner(activity_class_assignments!inner(class_id))')
        .not('grade', 'is', null)
        .in('activities.activity_class_assignments.class_id', classIds)
        .then(result => {
          if (!dateFilter || !result.data) return result;
          return {
            ...result,
            data: result.data.filter(s => 
              s.graded_at && new Date(s.graded_at) >= new Date(dateFilter)
            )
          };
        }),

      // 5. Taxa de entrega no prazo
      supabaseClient
        .from('submissions')
        .select('submitted_at, activity_id, activities!inner(due_date, activity_class_assignments!inner(class_id))')
        .eq('status', 'submitted')
        .in('activities.activity_class_assignments.class_id', classIds)
        .not('submitted_at', 'is', null)
        .not('activities.due_date', 'is', null),

      // 6. Atividades em aberto
      supabaseClient
        .from('activity_class_assignments')
        .select('activity_id, activities!inner(status, due_date)')
        .in('class_id', classIds)
        .eq('activities.status', 'active')
        .gte('activities.due_date', new Date().toISOString())
    ]);

    // Calcular KPIs
    const uniqueStudents = new Set(membersData.data?.map(m => m.user_id) || []).size;
    const totalActivities = new Set(activitiesData.data?.map(a => a.activity_id) || []).size;
    const pendingCorrections = pendingData.data?.length || 0;
    
    const grades = gradesData.data || [];
    const avgGrade = grades.length > 0
      ? parseFloat((grades.reduce((sum, s) => sum + (s.grade || 0), 0) / grades.length).toFixed(1))
      : 0;

    const onTimeSubmissions = onTimeData.data?.filter(s => 
      new Date(s.submitted_at) <= new Date(s.activities.due_date)
    ).length || 0;
    const onTimeRate = onTimeData.data?.length > 0
      ? Math.round((onTimeSubmissions / onTimeData.data.length) * 100)
      : 0;

    const openActivities = openData.data?.length || 0;

    // Buscar dados adicionais para gráficos (simplificado)
    const { data: topStudentsData } = await supabaseClient
      .from('submissions')
      .select(`
        grade,
        student_id,
        student:profiles!submissions_student_id_fkey(id, full_name, avatar_url),
        activity_id,
        activities!inner(activity_class_assignments!inner(class_id))
      `)
      .not('grade', 'is', null)
      .in('activities.activity_class_assignments.class_id', classIds)
      .limit(500);

    // Processar top 10 alunos
    const studentGrades: Record<string, any> = {};
    topStudentsData?.forEach(s => {
      if (!studentGrades[s.student_id]) {
        studentGrades[s.student_id] = {
          student: s.student,
          grades: [],
          total: 0
        };
      }
      studentGrades[s.student_id].grades.push(s.grade);
      studentGrades[s.student_id].total++;
    });

    const topStudents = Object.entries(studentGrades)
      .map(([id, data]: [string, any]) => ({
        id,
        name: data.student?.full_name || 'Sem nome',
        avatar: data.student?.avatar_url,
        avgGrade: parseFloat((data.grades.reduce((sum: number, g: number) => sum + g, 0) / data.grades.length).toFixed(2)),
        activities: data.total
      }))
      .sort((a, b) => b.avgGrade - a.avgGrade)
      .slice(0, 10);

    const response = {
      kpis: {
        totalStudents: uniqueStudents,
        totalActivities,
        pendingCorrections,
        avgGrade,
        onTimeRate,
        openActivities
      },
      classes: classes || [],
      topStudents,
      timestamp: new Date().toISOString(),
      period,
      classIds
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
