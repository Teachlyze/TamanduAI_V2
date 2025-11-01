import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { submissionData, grade, activityType } = await req.json()

    // Validar dados
    if (!submissionData || grade === undefined) {
      return new Response(
        JSON.stringify({ error: 'Dados incompletos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Preparar prompt baseado no tipo de atividade
    let prompt = ''
    
    if (activityType === 'assignment') {
      // Atividade aberta
      const text = typeof submissionData === 'string' ? submissionData : submissionData.text
      
      prompt = `Você é um professor avaliador experiente. Analise a seguinte submissão de aluno e forneça um feedback construtivo.

Submissão do Aluno:
${text}

Nota Atribuída: ${grade}/10

Forneça um feedback que:
1. Reconheça os pontos fortes da resposta
2. Identifique áreas que precisam de melhoria
3. Seja encorajador e construtivo
4. Seja específico e detalhado
5. Sugira próximos passos para o aprendizado

Feedback (em português, aproximadamente 150-200 palavras):`

    } else {
      // Atividade objetiva
      const percentage = (grade / 10) * 100
      
      prompt = `Você é um professor avaliador. Um aluno obteve ${grade}/10 (${percentage}%) em uma avaliação objetiva.

Forneça um feedback breve e encorajador que:
1. Reconheça o desempenho do aluno
2. Seja apropriado para a nota obtida
3. Incentive o aluno a continuar estudando
4. Seja positivo mas honesto

Feedback (em português, aproximadamente 50-100 palavras):`
    }

    // Chamar GPT-4o-mini
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um professor experiente que fornece feedback construtivo e encorajador para alunos.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!openaiResponse.ok) {
      throw new Error('Erro ao chamar API da OpenAI')
    }

    const data = await openaiResponse.json()
    const feedback = data.choices[0].message.content.trim()

    return new Response(
      JSON.stringify({ 
        feedback,
        warning: 'Este é um feedback gerado por IA. Revise e personalize antes de enviar ao aluno.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Erro ao gerar feedback:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
