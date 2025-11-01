// Edge Function para dados de Relatórios com Cache Redis
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

    const { reportType, targetId, period = '30' } = await req.json();

    if (!reportType) {
      return new Response(JSON.stringify({ error: 'reportType is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Inicializar Redis
    const redis = new Redis({
      url: Deno.env.get('UPSTASH_REDIS_REST_URL') ?? '',
      token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN') ?? '',
    });

    // Cache key por tipo de relatório
    const cacheKey = `report:${reportType}:${targetId || 'all'}:${user.id}:${period}`;
    const cacheTTL = 600; // 10 minutos (relatórios mudam menos)

    // Tentar cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log('Cache HIT for report:', cacheKey);
      return new Response(JSON.stringify({ data: cached, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log('Cache MISS for report:', cacheKey);

    let reportData: any = {};

    // Data filter
    const dateFilter = period === 'all' ? null : 
      new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString();

    switch (reportType) {
      case 'individual-student':
        if (!targetId) {
          return new Response(JSON.stringify({ error: 'studentId required' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        // Dados do aluno
        const [studentProfile, studentSubmissions, studentAttendance] = await Promise.all([
          supabaseClient
            .from('profiles')
            .select('id, full_name, email, avatar_url, age')
            .eq('id', targetId)
            .single(),
          
          supabaseClient
            .from('submissions')
            .select(`
              id,
              grade,
              status,
              submitted_at,
              graded_at,
              activity:activities(id, title, max_score, due_date)
            `)
            .eq('student_id', targetId)
            .order('submitted_at', { ascending: false }),

          supabaseClient
            .from('class_members')
            .select('class_id, classes(id, name, subject)')
            .eq('user_id', targetId)
        ]);

        const grades = studentSubmissions.data?.filter(s => s.grade !== null) || [];
        const avgGrade = grades.length > 0
          ? grades.reduce((sum, s) => sum + s.grade, 0) / grades.length
          : 0;

        const onTimeSubmissions = studentSubmissions.data?.filter(s => 
          s.submitted_at && s.activity?.due_date && 
          new Date(s.submitted_at) <= new Date(s.activity.due_date)
        ).length || 0;

        reportData = {
          student: studentProfile.data,
          statistics: {
            totalActivities: studentSubmissions.data?.length || 0,
            submittedActivities: studentSubmissions.data?.filter(s => s.status === 'submitted' || s.status === 'graded').length || 0,
            avgGrade: parseFloat(avgGrade.toFixed(2)),
            onTimeRate: studentSubmissions.data?.length > 0 
              ? Math.round((onTimeSubmissions / studentSubmissions.data.length) * 100)
              : 0
          },
          submissions: studentSubmissions.data,
          classes: studentAttendance.data?.map(c => c.classes)
        };
        break;

      case 'class-report':
        if (!targetId) {
          return new Response(JSON.stringify({ error: 'classId required' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        // Dados da turma
        const [classInfo, classMembers, classActivities, classSubmissions] = await Promise.all([
          supabaseClient
            .from('classes')
            .select('id, name, subject, description, created_at')
            .eq('id', targetId)
            .single(),

          supabaseClient
            .from('class_members')
            .select('user_id, role, profiles(id, full_name, email)')
            .eq('class_id', targetId),

          supabaseClient
            .from('activity_class_assignments')
            .select('activity_id, activities(id, title, max_score, status)')
            .eq('class_id', targetId),

          supabaseClient
            .from('submissions')
            .select(`
              id,
              grade,
              status,
              student_id,
              activity_id,
              activities!inner(activity_class_assignments!inner(class_id))
            `)
            .not('grade', 'is', null)
            .eq('activities.activity_class_assignments.class_id', targetId)
        ]);

        const students = classMembers.data?.filter(m => m.role === 'student') || [];
        const classGrades = classSubmissions.data || [];
        const classAvgGrade = classGrades.length > 0
          ? classGrades.reduce((sum, s) => sum + s.grade, 0) / classGrades.length
          : 0;

        // Distribuição de notas
        const distribution = [
          { range: '0-2', count: 0 },
          { range: '2-4', count: 0 },
          { range: '4-6', count: 0 },
          { range: '6-8', count: 0 },
          { range: '8-10', count: 0 }
        ];

        classGrades.forEach(({ grade }) => {
          if (grade < 2) distribution[0].count++;
          else if (grade < 4) distribution[1].count++;
          else if (grade < 6) distribution[2].count++;
          else if (grade < 8) distribution[3].count++;
          else distribution[4].count++;
        });

        reportData = {
          class: classInfo.data,
          statistics: {
            totalStudents: students.length,
            totalActivities: classActivities.data?.length || 0,
            avgGrade: parseFloat(classAvgGrade.toFixed(2)),
            submissionsCount: classGrades.length
          },
          distribution,
          students: students.map(s => s.profiles),
          activities: classActivities.data?.map(a => a.activities)
        };
        break;

      case 'activity-report':
        if (!targetId) {
          return new Response(JSON.stringify({ error: 'activityId required' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        // Dados da atividade
        const [activityInfo, activitySubmissions] = await Promise.all([
          supabaseClient
            .from('activities')
            .select('id, title, description, max_score, due_date, status')
            .eq('id', targetId)
            .single(),

          supabaseClient
            .from('submissions')
            .select(`
              id,
              grade,
              status,
              submitted_at,
              student:profiles!submissions_student_id_fkey(id, full_name, email)
            `)
            .eq('activity_id', targetId)
        ]);

        const activityGrades = activitySubmissions.data?.filter(s => s.grade !== null) || [];
        const activityAvg = activityGrades.length > 0
          ? activityGrades.reduce((sum, s) => sum + s.grade, 0) / activityGrades.length
          : 0;

        reportData = {
          activity: activityInfo.data,
          statistics: {
            totalSubmissions: activitySubmissions.data?.length || 0,
            gradedSubmissions: activityGrades.length,
            avgGrade: parseFloat(activityAvg.toFixed(2)),
            submissionRate: 0 // Precisaria do total de alunos
          },
          submissions: activitySubmissions.data
        };
        break;

      case 'teacher-performance':
        // Dados do professor
        const [teacherClasses, teacherActivities, teacherCorrections] = await Promise.all([
          supabaseClient
            .from('classes')
            .select('id, name, subject')
            .eq('created_by', user.id)
            .eq('is_active', true),

          supabaseClient
            .from('activities')
            .select('id, title, created_at')
            .eq('created_by', user.id),

          supabaseClient
            .from('submissions')
            .select(`
              id,
              graded_at,
              submitted_at,
              activity:activities!inner(created_by)
            `)
            .eq('status', 'graded')
            .eq('activities.created_by', user.id)
        ]);

        // Tempo médio de correção
        const corrections = teacherCorrections.data?.filter(s => 
          s.graded_at && s.submitted_at
        ) || [];

        const avgCorrectionTime = corrections.length > 0
          ? corrections.reduce((sum, s) => {
              const diff = new Date(s.graded_at).getTime() - new Date(s.submitted_at).getTime();
              return sum + diff;
            }, 0) / corrections.length / (1000 * 60 * 60 * 24) // em dias
          : 0;

        reportData = {
          teacher: {
            id: user.id,
            email: user.email
          },
          statistics: {
            totalClasses: teacherClasses.data?.length || 0,
            totalActivities: teacherActivities.data?.length || 0,
            totalCorrections: corrections.length,
            avgCorrectionTimeDays: parseFloat(avgCorrectionTime.toFixed(1))
          },
          classes: teacherClasses.data,
          recentActivities: teacherActivities.data?.slice(0, 10)
        };
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid report type' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
    }

    const response = {
      reportType,
      targetId,
      period,
      data: reportData,
      generatedAt: new Date().toISOString()
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
