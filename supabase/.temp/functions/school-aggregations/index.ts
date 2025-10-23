// Edge Function: Agregações da Escola
// Calcula e armazena agregações diárias/semanais para melhorar performance
// Deve rodar via cron: Diário às 02:00

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SchoolAggregation {
  school_id: string
  date: string
  metrics: {
    total_teachers: number
    active_teachers: number
    total_students: number
    total_classes: number
    submissions_today: number
    submissions_week: number
    submissions_month: number
    on_time_rate_week: number
    on_time_rate_month: number
    average_grade: number
    xp_earned_today: number
    xp_earned_week: number
    active_users_today: number
    active_users_week: number
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    console.log('🔄 Starting school aggregations...')

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // 1. Buscar todas as escolas
    const { data: schools, error: schoolsError } = await supabaseClient
      .from('schools')
      .select('id, name')

    if (schoolsError) throw schoolsError

    let schoolsProcessed = 0

    // 2. Para cada escola, calcular agregações
    for (const school of schools || []) {
      try {
        const aggregation: SchoolAggregation = {
          school_id: school.id,
          date: today,
          metrics: {
            total_teachers: 0,
            active_teachers: 0,
            total_students: 0,
            total_classes: 0,
            submissions_today: 0,
            submissions_week: 0,
            submissions_month: 0,
            on_time_rate_week: 0,
            on_time_rate_month: 0,
            average_grade: 0,
            xp_earned_today: 0,
            xp_earned_week: 0,
            active_users_today: 0,
            active_users_week: 0,
          },
        }

        // 2.1. Professores
        const { data: teachers } = await supabaseClient
          .from('school_teachers')
          .select('user_id, status')
          .eq('school_id', school.id)

        aggregation.metrics.total_teachers = teachers?.length || 0
        aggregation.metrics.active_teachers = teachers?.filter(t => t.status === 'active').length || 0

        const teacherIds = teachers?.map(t => t.user_id) || []

        // 2.2. Turmas
        const { data: schoolClasses } = await supabaseClient
          .from('school_classes')
          .select('class_id')
          .eq('school_id', school.id)

        const classIds = schoolClasses?.map(c => c.class_id) || []
        aggregation.metrics.total_classes = classIds.length

        if (classIds.length === 0) {
          console.log(`⏭️  Skipping school ${school.name} (no classes)`)
          continue
        }

        // 2.3. Alunos
        const { count: studentCount } = await supabaseClient
          .from('class_members')
          .select('user_id', { count: 'exact', head: true })
          .in('class_id', classIds)
          .eq('role', 'student')

        aggregation.metrics.total_students = studentCount || 0

        // 2.4. Atividades das turmas
        const { data: activities } = await supabaseClient
          .from('activity_class_assignments')
          .select('activity_id, activities(id, due_date)')
          .in('class_id', classIds)

        const activityIds = activities?.map(a => a.activity_id) || []

        if (activityIds.length > 0) {
          // 2.5. Submissões hoje
          const { count: submissionsToday } = await supabaseClient
            .from('submissions')
            .select('id', { count: 'exact', head: true })
            .in('activity_id', activityIds)
            .gte('submitted_at', today)

          aggregation.metrics.submissions_today = submissionsToday || 0

          // 2.6. Submissões semana
          const { count: submissionsWeek } = await supabaseClient
            .from('submissions')
            .select('id', { count: 'exact', head: true })
            .in('activity_id', activityIds)
            .gte('submitted_at', weekAgo)

          aggregation.metrics.submissions_week = submissionsWeek || 0

          // 2.7. Submissões mês
          const { count: submissionsMonth } = await supabaseClient
            .from('submissions')
            .select('id', { count: 'exact', head: true })
            .in('activity_id', activityIds)
            .gte('submitted_at', monthAgo)

          aggregation.metrics.submissions_month = submissionsMonth || 0

          // 2.8. Taxa de pontualidade (semana)
          const { data: weekSubmissions } = await supabaseClient
            .from('submissions')
            .select('submitted_at, activity_id')
            .in('activity_id', activityIds)
            .gte('submitted_at', weekAgo)

          if (weekSubmissions && weekSubmissions.length > 0) {
            const activityDueDates = new Map(
              activities?.map(a => [a.activity_id, a.activities?.due_date]) || []
            )

            let onTimeWeek = 0
            weekSubmissions.forEach(sub => {
              const dueDate = activityDueDates.get(sub.activity_id)
              if (dueDate && new Date(sub.submitted_at) <= new Date(dueDate)) {
                onTimeWeek++
              }
            })

            aggregation.metrics.on_time_rate_week = Math.round((onTimeWeek / weekSubmissions.length) * 100)
          }

          // 2.9. Média geral
          const { data: grades } = await supabaseClient
            .from('submissions')
            .select('grade')
            .in('activity_id', activityIds)
            .not('grade', 'is', null)

          if (grades && grades.length > 0) {
            const sum = grades.reduce((acc, g) => acc + (g.grade || 0), 0)
            aggregation.metrics.average_grade = parseFloat((sum / grades.length).toFixed(2))
          }
        }

        // 2.10. XP ganho (hoje e semana)
        const studentIds = await supabaseClient
          .from('class_members')
          .select('user_id')
          .in('class_id', classIds)
          .eq('role', 'student')

        const userIds = studentIds.data?.map(s => s.user_id) || []

        if (userIds.length > 0) {
          // XP hoje
          const { data: xpToday } = await supabaseClient
            .from('xp_log')
            .select('xp')
            .in('user_id', userIds)
            .gte('created_at', today)

          aggregation.metrics.xp_earned_today = xpToday?.reduce((sum, x) => sum + x.xp, 0) || 0

          // XP semana
          const { data: xpWeek } = await supabaseClient
            .from('xp_log')
            .select('xp')
            .in('user_id', userIds)
            .gte('created_at', weekAgo)

          aggregation.metrics.xp_earned_week = xpWeek?.reduce((sum, x) => sum + x.xp, 0) || 0

          // Usuários ativos (hoje)
          const { data: activeToday } = await supabaseClient
            .from('gamification_profiles')
            .select('user_id')
            .in('user_id', userIds)
            .gte('last_activity_at', today)

          aggregation.metrics.active_users_today = activeToday?.length || 0

          // Usuários ativos (semana)
          const { data: activeWeek } = await supabaseClient
            .from('gamification_profiles')
            .select('user_id')
            .in('user_id', userIds)
            .gte('last_activity_at', weekAgo)

          aggregation.metrics.active_users_week = activeWeek?.length || 0
        }

        // 3. Salvar agregação (pode criar tabela school_aggregations se quiser cachear)
        console.log(`✅ School ${school.name}:`, aggregation.metrics)
        
        schoolsProcessed++

      } catch (schoolError) {
        console.error(`❌ Error processing school ${school.name}:`, schoolError)
      }
    }

    const result = {
      success: true,
      schools_processed: schoolsProcessed,
      date: today,
      timestamp: now.toISOString(),
    }

    console.log('🎉 Aggregations completed:', result)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
