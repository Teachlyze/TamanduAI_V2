// Edge Function: Reset de Missões
// Reseta missões expiradas (diárias e semanais)
// Deve rodar via cron: Diário às 00:00 (diárias) e Domingo 00:00 (semanais)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: {
        persistSession: false
      }
    });
    const { type } = await req.json();
    // Validar tipo
    if (![
      'daily',
      'weekly',
      'all'
    ].includes(type)) {
      throw new Error('Type must be "daily", "weekly", or "all"');
    }
    console.log(`🔄 Starting mission reset for type: ${type}`);
    const now = new Date();
    let dailyReset = 0;
    let weeklyReset = 0;
    // 1. Buscar missões expiradas
    const { data: expiredMissions, error: fetchError } = await supabaseClient.from('user_missions').select(`
        id,
        user_id,
        mission_id,
        status,
        reset_at,
        missions_catalog (
          type,
          code,
          name,
          rules,
          reward_xp
        )
      `).lte('reset_at', now.toISOString()).neq('status', 'completed');
    if (fetchError) throw fetchError;
    if (!expiredMissions || expiredMissions.length === 0) {
      console.log('ℹ️  No expired missions to reset');
      return new Response(JSON.stringify({
        success: true,
        message: 'No missions to reset',
        daily_reset: 0,
        weekly_reset: 0
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    console.log(`📋 Found ${expiredMissions.length} expired missions`);
    // 2. Filtrar por tipo
    const missionsToReset = type === 'all' ? expiredMissions : expiredMissions.filter((m)=>m.missions_catalog?.type === type);
    // 3. Resetar cada missão
    for (const mission of missionsToReset){
      try {
        const missionType = mission.missions_catalog?.type;
        const missionCode = mission.missions_catalog?.code;
        // Calcular próximo reset
        const resetAt = new Date();
        if (missionType === 'daily') {
          resetAt.setDate(resetAt.getDate() + 1);
          resetAt.setHours(23, 59, 59, 999);
          dailyReset++;
        } else if (missionType === 'weekly') {
          // Próximo domingo
          const daysUntilSunday = 7 - resetAt.getDay();
          resetAt.setDate(resetAt.getDate() + daysUntilSunday);
          resetAt.setHours(23, 59, 59, 999);
          weeklyReset++;
        }
        // Resetar progresso
        const { error: updateError } = await supabaseClient.from('user_missions').update({
          status: 'active',
          progress: {},
          reset_at: resetAt.toISOString(),
          updated_at: now.toISOString()
        }).eq('id', mission.id);
        if (updateError) {
          console.error(`❌ Error resetting mission ${missionCode}:`, updateError);
        } else {
          console.log(`✅ Reset mission ${missionCode} for user ${mission.user_id}`);
        }
      } catch (missionError) {
        console.error('❌ Error processing mission:', missionError);
      }
    }
    // 4. Limpar missões completadas antigas (mais de 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { error: deleteError } = await supabaseClient.from('user_missions').delete().eq('status', 'completed').lte('updated_at', thirtyDaysAgo.toISOString());
    if (deleteError) {
      console.warn('⚠️  Error cleaning old missions:', deleteError);
    } else {
      console.log('🧹 Cleaned old completed missions');
    }
    const result = {
      success: true,
      type,
      daily_reset: dailyReset,
      weekly_reset: weeklyReset,
      total_reset: dailyReset + weeklyReset,
      timestamp: now.toISOString()
    };
    console.log('🎉 Mission reset completed:', result);
    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
