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

    // Chamar WinstonAI API
    const winstonKey = Deno.env.get('WINSTON_AI_KEY')
    
    const winstonResponse = await fetch('https://api.gowinston.ai/v2/plagiarism', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${winstonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        language: 'pt',
        sentences: true, // Análise por sentença
      }),
    })

    if (!winstonResponse.ok) {
      console.error('Erro Winston AI:', await winstonResponse.text())
      throw new Error('Erro ao verificar plágio com Winston AI')
    }

    const winstonData = await winstonResponse.json()

    // Processar resultado
    const plagiarismScore = winstonData.score || 0
    const aiScore = winstonData.ai_score || 0
    const sources = winstonData.sources || []
    
    // Determinar severidade
    let severity = 'low'
    if (plagiarismScore < 70) {
      severity = 'high'
    } else if (plagiarismScore < 85) {
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
