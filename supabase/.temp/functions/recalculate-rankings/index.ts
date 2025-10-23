// Edge Function: Recalcular Rankings
// Recalcula rankings semanais e mensais para todas as turmas
// Deve rodar via cron: Domingos 23:59 (semanal) e último dia do mês (mensal)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RankingEntry {
  user_id: string
  class_id: string
  xp: number
  level: number
  position: number
  user_name: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const { period } = await req.json()
    
    // Validar período
    if (!['weekly', 'monthly'].includes(period)) {
      throw new Error('Period must be "weekly" or "monthly"')
    }

    console.log(`🔄 Starting ranking recalculation for ${period}...`)

    // 1. Buscar todas as turmas
    const { data: classes, error: classesError } = await supabaseClient
      .from('classes')
      .select('id, name')

    if (classesError) throw classesError

    let totalRankingsCreated = 0
    let classesProcessed = 0

    // 2. Para cada turma, gerar ranking
    for (const classItem of classes || []) {
      try {
        // 2.1. Buscar alunos da turma
        const { data: members, error: membersError } = await supabaseClient
          .from('class_members')
          .select('user_id')
          .eq('class_id', classItem.id)
          .eq('role', 'student')

        if (membersError) throw membersError

        const userIds = members?.map(m => m.user_id) || []
        
        if (userIds.length === 0) {
          console.log(`⏭️  Skipping class ${classItem.name} (no students)`)
          continue
        }

        // 2.2. Buscar perfis de gamificação dos alunos
        const { data: profiles, error: profilesError } = await supabaseClient
          .from('gamification_profiles')
          .select(`
            user_id,
            xp_total,
            level,
            profiles (
              full_name
            )
          `)
          .in('user_id', userIds)
          .order('xp_total', { ascending: false })

        if (profilesError) throw profilesError

        if (!profiles || profiles.length === 0) {
          console.log(`⏭️  Skipping class ${classItem.name} (no profiles)`)
          continue
        }

        // 2.3. Criar ranking
        const ranking: RankingEntry[] = profiles.map((p: any, index: number) => ({
          user_id: p.user_id,
          class_id: classItem.id,
          xp: p.xp_total || 0,
          level: p.level || 1,
          position: index + 1,
          user_name: p.profiles?.full_name || 'Aluno',
        }))

        // 2.4. Salvar snapshot
        const snapshot = {
          class_id: classItem.id,
          period,
          ranking_data: ranking,
          snapshot_date: new Date().toISOString(),
        }

        const { error: insertError } = await supabaseClient
          .from('class_rank_snapshots')
          .insert(snapshot)

        if (insertError) throw insertError

        totalRankingsCreated++
        classesProcessed++
        
        console.log(`✅ Class ${classItem.name}: ${ranking.length} students ranked`)

      } catch (classError) {
        console.error(`❌ Error processing class ${classItem.name}:`, classError)
        // Continua com próxima turma
      }
    }

    const result = {
      success: true,
      period,
      classes_processed: classesProcessed,
      rankings_created: totalRankingsCreated,
      timestamp: new Date().toISOString(),
    }

    console.log('🎉 Ranking recalculation completed:', result)

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
