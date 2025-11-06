// Edge Function: Processar análise diária do chatbot com IA
// Roda automaticamente à meia-noite via cron job

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

interface Message {
  id: string;
  message: string;
  class_id: string;
  activity_id?: string;
  metadata?: {
    activity_title?: string;
  };
  created_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openaiKey = Deno.env.get('VITE_OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('🤖 Iniciando processamento diário do chatbot...');

    // Buscar todas as turmas ativas
    const { data: classes, error: classesError } = await supabaseClient
      .from('classes')
      .select('id, name')
      .eq('is_active', true);

    if (classesError) throw classesError;

    console.log(`📚 Processando ${classes?.length || 0} turmas...`);

    const results = [];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    for (const classItem of classes || []) {
      try {
        console.log(`\n🔄 Processando turma: ${classItem.name} (${classItem.id})`);

        // Buscar mensagens das últimas 24h
        const { data: messages, error: messagesError } = await supabaseClient
          .from('chatbot_messages')
          .select('id, message, class_id, activity_id, metadata, created_at')
          .eq('class_id', classItem.id)
          .gte('created_at', yesterday.toISOString())
          .order('created_at', { ascending: false });

        if (messagesError) {
          console.error(`Erro ao buscar mensagens da turma ${classItem.id}:`, messagesError);
          continue;
        }

        if (!messages || messages.length === 0) {
          console.log(`⏭️ Nenhuma mensagem encontrada para ${classItem.name}`);
          continue;
        }

        console.log(`📊 ${messages.length} mensagens encontradas`);

        // Processar com IA
        const analysis = await processWithAI(messages, openaiKey);

        // Salvar análise
        const { error: insertError } = await supabaseClient
          .from('chatbot_daily_analysis')
          .upsert({
            class_id: classItem.id,
            analysis_date: new Date().toISOString().split('T')[0],
            frequent_questions: analysis.frequentQuestions,
            difficult_topics: analysis.difficultTopics,
            total_messages_analyzed: messages.length,
            processing_time_ms: Date.now() - startTime,
            processed_at: new Date().toISOString()
          }, {
            onConflict: 'class_id,analysis_date'
          });

        if (insertError) {
          console.error(`Erro ao salvar análise da turma ${classItem.id}:`, insertError);
          continue;
        }

        results.push({
          class_id: classItem.id,
          class_name: classItem.name,
          messages_analyzed: messages.length,
          frequent_questions_found: analysis.frequentQuestions.length,
          difficult_topics_found: analysis.difficultTopics.length
        });

        console.log(`✅ Análise salva para ${classItem.name}`);

      } catch (error) {
        console.error(`❌ Erro ao processar turma ${classItem.id}:`, error);
        results.push({
          class_id: classItem.id,
          class_name: classItem.name,
          error: error.message
        });
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`\n✅ Processamento concluído em ${processingTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        processed_classes: results.length,
        total_time_ms: processingTime,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Erro fatal:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Processar mensagens com OpenAI
async function processWithAI(messages: Message[], openaiKey: string) {
  console.log('🤖 Processando com OpenAI...');

  // Preparar dados para análise
  const messagesText = messages
    .map((m, idx) => `${idx + 1}. "${m.message}" (Atividade: ${m.metadata?.activity_title || 'Geral'})`)
    .join('\n');

  const prompt = `Você é um analista educacional. Analise as seguintes perguntas de alunos em um chatbot educacional e forneça:

1. PERGUNTAS MAIS FREQUENTES: Agrupe perguntas SIMILARES por tema/conceito (não pela frase exata). Identifique os 5 temas mais perguntados.

2. TÓPICOS MAIS DIFÍCEIS: Identifique os 5 tópicos que parecem causar mais dificuldade aos alunos (baseado em perguntas repetidas, confusão, ou pedidos de ajuda explícitos).

MENSAGENS DOS ALUNOS (${messages.length} total):
${messagesText}

Responda APENAS com JSON válido neste formato:
{
  "frequentQuestions": [
    {
      "theme": "Título do tema (ex: 'Como implementar listas ligadas')",
      "count": 15,
      "examples": ["exemplo1", "exemplo2"],
      "activity": "Nome da atividade principal"
    }
  ],
  "difficultTopics": [
    {
      "topic": "Nome do tópico",
      "difficulty_score": 85,
      "reason": "Por que é difícil (evidências nas perguntas)",
      "questions_count": 10
    }
  ]
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um analista educacional. Responda APENAS com JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  const parsed = JSON.parse(content);

  console.log(`✅ IA identificou ${parsed.frequentQuestions?.length || 0} temas frequentes`);
  console.log(`✅ IA identificou ${parsed.difficultTopics?.length || 0} tópicos difíceis`);

  return {
    frequentQuestions: parsed.frequentQuestions || [],
    difficultTopics: parsed.difficultTopics || []
  };
}
