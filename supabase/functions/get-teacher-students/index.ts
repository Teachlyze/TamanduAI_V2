// Edge Function para Lista de Alunos do Professor com Cache Redis
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

    const { selectedClasses = [] } = await req.json();

    // Inicializar Redis
    const redis = new Redis({
      url: Deno.env.get('UPSTASH_REDIS_REST_URL') ?? '',
      token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN') ?? '',
    });

    // Cache key
    const cacheKey = `students:${user.id}:${selectedClasses.sort().join(',')}`;
    const cacheTTL = 600; // 10 minutos (lista de alunos muda raramente)

    // Tentar cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log('Cache HIT for students:', cacheKey);
      return new Response(JSON.stringify({ data: cached, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log('Cache MISS for students:', cacheKey);

    // Buscar turmas do professor
    const { data: teacherClasses } = await supabaseClient
      .from('classes')
      .select('id, name, subject, color')
      .eq('created_by', user.id)
      .eq('is_active', true);

    if (!teacherClasses || teacherClasses.length === 0) {
      const emptyResponse = {
        students: [],
        classes: [],
        stats: { total: 0, byClass: [] }
      };

      await redis.setex(cacheKey, cacheTTL, JSON.stringify(emptyResponse));

      return new Response(JSON.stringify({ data: emptyResponse, cached: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const classIds = selectedClasses.length > 0 ? selectedClasses : teacherClasses.map(c => c.id);

    // Buscar membros das turmas (alunos)
    const { data: classMembers } = await supabaseClient
      .from('class_members')
      .select(`
        user_id,
        class_id,
        joined_at,
        profile:profiles!class_members_user_id_fkey(id, full_name, email, avatar_url, age)
      `)
      .in('class_id', classIds)
      .eq('role', 'student');

    // Buscar submissões dos alunos para calcular estatísticas
    const studentIds = [...new Set(classMembers?.map(m => m.user_id) || [])];
    
    if (studentIds.length === 0) {
      const emptyResponse = {
        students: [],
        classes: teacherClasses.filter(c => classIds.includes(c.id)),
        stats: { total: 0, byClass: [] }
      };

      await redis.setex(cacheKey, cacheTTL, JSON.stringify(emptyResponse));

      return new Response(JSON.stringify({ data: emptyResponse, cached: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { data: submissions } = await supabaseClient
      .from('submissions')
      .select(`
        student_id,
        grade,
        status,
        activity_id,
        activities!inner(activity_class_assignments!inner(class_id))
      `)
      .in('student_id', studentIds)
      .in('activities.activity_class_assignments.class_id', classIds)
      .limit(5000);

    // Processar dados dos alunos
    const studentStats = {};

    submissions?.forEach(sub => {
      const studentId = sub.student_id;
      if (!studentStats[studentId]) {
        studentStats[studentId] = {
          totalActivities: 0,
          submitted: 0,
          graded: 0,
          grades: [],
          avgGrade: 0
        };
      }

      studentStats[studentId].totalActivities++;
      
      if (sub.status === 'submitted' || sub.status === 'graded') {
        studentStats[studentId].submitted++;
      }
      
      if (sub.status === 'graded' && sub.grade !== null) {
        studentStats[studentId].graded++;
        studentStats[studentId].grades.push(sub.grade);
      }
    });

    // Calcular médias
    Object.keys(studentStats).forEach(studentId => {
      const stats = studentStats[studentId];
      if (stats.grades.length > 0) {
        stats.avgGrade = parseFloat(
          (stats.grades.reduce((sum, g) => sum + g, 0) / stats.grades.length).toFixed(2)
        );
      }
      delete stats.grades; // Remover array para economizar espaço
    });

    // Montar lista de alunos
    const studentsList = classMembers?.map(member => {
      const classInfo = teacherClasses.find(c => c.id === member.class_id);
      const stats = studentStats[member.user_id] || {
        totalActivities: 0,
        submitted: 0,
        graded: 0,
        avgGrade: 0
      };

      return {
        id: member.profile?.id,
        name: member.profile?.full_name || 'Sem nome',
        email: member.profile?.email,
        avatar: member.profile?.avatar_url,
        age: member.profile?.age,
        class: {
          id: classInfo?.id,
          name: classInfo?.name,
          subject: classInfo?.subject,
          color: classInfo?.color
        },
        joinedAt: member.joined_at,
        stats
      };
    }) || [];

    // Remover duplicatas (aluno em múltiplas turmas)
    const uniqueStudents = [];
    const seen = new Set();

    studentsList.forEach(student => {
      if (!seen.has(student.id)) {
        seen.add(student.id);
        uniqueStudents.push(student);
      }
    });

    // Estatísticas gerais
    const byClass = {};
    classMembers?.forEach(member => {
      const classId = member.class_id;
      if (!byClass[classId]) {
        const classInfo = teacherClasses.find(c => c.id === classId);
        byClass[classId] = {
          classId,
          className: classInfo?.name,
          count: 0
        };
      }
      byClass[classId].count++;
    });

    const response = {
      students: uniqueStudents.sort((a, b) => a.name.localeCompare(b.name)),
      classes: teacherClasses.filter(c => classIds.includes(c.id)),
      stats: {
        total: uniqueStudents.length,
        byClass: Object.values(byClass)
      },
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
