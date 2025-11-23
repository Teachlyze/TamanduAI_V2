import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { submissionId, text } = await req.json()

    if (!submissionId || !text) {
      return new Response(
        JSON.stringify({ error: 'Submission ID e texto são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Inicializar Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Chamar WinstonAI Plagiarism API v2
    const winstonKey = Deno.env.get('WINSTON_AI_KEY')
    
    const winstonResponse = await fetch('https://api.gowinston.ai/v2/plagiarism', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${winstonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        language: 'pt',
        country: 'br',
      }),
    })

    if (!winstonResponse.ok) {
      console.error('Erro Winston AI:', await winstonResponse.text())
      throw new Error('Erro ao verificar plágio com Winston AI')
    }

    const winstonData = await winstonResponse.json()

    // Processar resultado conforme a API /v2/plagiarism
    const result = winstonData?.result || {}
    const plagiarismScore = typeof result.score === 'number' ? result.score : 0
    const sources = Array.isArray(winstonData?.sources) ? winstonData.sources : []
    // A API de plágio não garante score de IA; manter campo para compatibilidade
    const aiScore = typeof winstonData?.ai_score === 'number' ? winstonData.ai_score : 0
    
    // Determinar severidade (quanto maior o score, mais grave)
    let severity = 'low'
    if (plagiarismScore >= 85) {
      severity = 'high'
    } else if (plagiarismScore >= 70) {
      severity = 'medium'
    }

    // Salvar resultado no banco
    const { data: plagiarismCheck, error: insertError } = await supabaseClient
      .from('plagiarism_checks')
      .insert({
        submission_id: submissionId,
        plagiarism_percentage: Math.round(plagiarismScore),
        ai_generated: aiScore > 50,
        ai_score: Math.round(aiScore),
        sources: sources,
        raw_data: winstonData,
        checked_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Erro ao salvar verificação:', insertError)
      throw insertError
    }

    // Atualizar submission com score
    const { error: updateError } = await supabaseClient
      .from('submissions')
      .update({
        plagiarism_score: Math.round(plagiarismScore),
        plagiarism_check_status: 'completed',
        plagiarism_checked_at: new Date().toISOString(),
      })
      .eq('id', submissionId)

    if (updateError) {
      console.error('Erro ao atualizar submission:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        plagiarismScore: Math.round(plagiarismScore),
        aiScore: Math.round(aiScore),
        severity,
        sources: sources.slice(0, 5), // Top 5 fontes
        message: plagiarismScore < 70 
          ? 'Atenção: Baixa originalidade detectada'
          : plagiarismScore < 85
          ? 'Originalidade moderada'
          : 'Boa originalidade'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Erro ao verificar plágio:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
