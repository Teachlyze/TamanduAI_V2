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
    const { submissionData, grade, activityType, activityTitle, activityDescription, maxGrade = 10 } = await req.json()

    // Validar dados
    if (!submissionData) {
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
      
      if (grade !== null && grade !== undefined) {
        // Já tem nota - gerar apenas feedback específico
        prompt = `Você é um professor avaliador experiente. Analise a submissão do aluno e forneça um feedback detalhado e específico.

ATIVIDADE: ${activityTitle || 'Não informado'}
${activityDescription ? `\nENUNCIADO/DESCRIÇÃO:\n${activityDescription}\n` : ''}
SUBMISSÃO DO ALUNO:
${text}

NOTA ATRIBUÍDA: ${grade}/${maxGrade}

Baseado na nota ${grade}/${maxGrade} e considerando o enunciado da atividade:

1. FORNEÇA UM FEEDBACK ESPECÍFICO que:
   - Justifique a nota atribuída com base nos critérios da atividade
   - Compare a resposta com o que foi solicitado no enunciado
   - Identifique ESPECIFICAMENTE pontos fortes (mencione partes concretas da resposta)
   - Identifique ESPECIFICAMENTE o que está faltando ou pode melhorar
   - Seja detalhado e personalizado (evite feedback genérico)
   - Sugira ações concretas para melhorar

Responda APENAS com JSON neste formato:
{
  "suggestedGrade": ${grade},
  "feedback": "Seu feedback específico aqui (150-200 palavras)"
}`
      } else {
        // Sem nota - avaliar e sugerir nota + feedback
        prompt = `Você é um professor avaliador experiente. Analise a seguinte submissão de aluno e forneça uma nota sugerida e um feedback construtivo.

ATIVIDADE: ${activityTitle || 'Não informado'}
${activityDescription ? `\nENUNCIADO/DESCRIÇÃO:\n${activityDescription}\n` : ''}
SUBMISSÃO DO ALUNO:
${text}

ESCALA DE NOTAS: 0 a ${maxGrade}

Considerando o enunciado da atividade e a resposta do aluno:

1. AVALIE e SUGIRA UMA NOTA (de 0 a ${maxGrade}) baseado em:
   - Cumprimento dos requisitos da atividade
   - Qualidade e profundidade da resposta
   - Correção técnica
   - Clareza e organização

2. FORNEÇA UM FEEDBACK ESPECÍFICO que:
   - Justifique a nota sugerida
   - Compare a resposta com o que foi solicitado no enunciado
   - Identifique ESPECIFICAMENTE pontos fortes (mencione partes concretas)
   - Identifique ESPECIFICAMENTE o que está faltando ou pode melhorar
   - Seja detalhado e personalizado (evite feedback genérico)
   - Sugira próximos passos concretos

Responda APENAS com JSON neste formato:
{
  "suggestedGrade": 7.5,
  "feedback": "Seu feedback específico aqui (150-200 palavras)"
}`
      }

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
    const openaiKey = Deno.env.get('VITE_OPENAI_API_KEY') || Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
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
            content: 'Você é um professor experiente que fornece feedback construtivo e nota sugerida para alunos. Responda APENAS com JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 600,
        response_format: { type: 'json_object' }
      }),
    })

    if (!openaiResponse.ok) {
      throw new Error('Erro ao chamar API da OpenAI')
    }

    const data = await openaiResponse.json()
    const content = data.choices[0].message.content.trim()
    
    // Parsear JSON da resposta
    let result
    try {
      result = JSON.parse(content)
    } catch (e) {
      // Fallback se não vier JSON
      result = {
        suggestedGrade: grade || Math.round(maxGrade * 0.7), // Fallback para 70%
        feedback: content
      }
    }
    
    // Garantir que feedback é string
    const feedbackText = typeof result.feedback === 'string' 
      ? result.feedback 
      : JSON.stringify(result.feedback);

    return new Response(
      JSON.stringify({ 
        feedback: feedbackText,
        suggestedGrade: result.suggestedGrade,
        warning: 'Esta é uma sugestão gerada por IA. Revise e ajuste a nota e feedback conforme necessário.'
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
