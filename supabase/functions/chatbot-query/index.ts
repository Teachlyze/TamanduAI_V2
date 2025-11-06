// Edge Function: Chatbot Query with RAG + Socratic Method
// Recebe pergunta do aluno, valida escopo, busca contexto e responde usando método socrático
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ActivityContext {
  id: string;
  title: string;
  description?: string;
  content?: string;
  type?: string;
}
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Gerar embedding para a query
async function generateQueryEmbedding(query, openaiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
        encoding_format: 'float'
      })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating query embedding:', error);
    throw error;
  }
}
// Buscar contexto relevante
async function searchRelevantContext(supabase, classId, queryEmbedding, matchCount = 5) {
  try {
    // Usar função de busca vetorial
    const { data, error } = await supabase.rpc('search_rag_vectors', {
      query_embedding: queryEmbedding,
      class_id_filter: classId,
      match_threshold: 0.7,
      match_count: matchCount
    });
    if (error) throw error;
    return (data || []).map((item)=>({
        content: item.content_chunk,
        source: item.metadata?.source_name || 'Material da turma',
        similarity: item.similarity
      }));
  } catch (error) {
    console.error('Error searching context:', error);
    return [];
  }
}
// Validar se a pergunta está no escopo da atividade
async function validateQueryScope(
  query: string,
  activityContext: ActivityContext | null,
  openaiKey: string
): Promise<{ in_scope: boolean; reason: string; redirect_message?: string }> {
  // Se não há atividade, aceita qualquer pergunta da turma
  if (!activityContext) {
    return { in_scope: true, reason: 'No activity context' };
  }

  try {
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
            content: `Você é um validador educacional FLEXÍVEL. Analise se a pergunta do aluno tem ALGUMA relação com a atividade ou seus conceitos.

Atividade: ${activityContext.title}
Descrição: ${activityContext.description || 'Não fornecida'}
Tipo: ${activityContext.type || 'Não especificado'}

REGRAS (seja LIBERAL, não restritivo):
✅ ACEITAR se a pergunta:
- Está diretamente relacionada ao tema da atividade
- Pede conceitos básicos necessários para resolver a atividade
- Pede esclarecimentos sobre terminologia relacionada
- Pede exemplos similares (não a resposta exata)
- Pergunta sobre ferramentas/linguagens mencionadas
- Pede dicas de como começar ou organizar a solução
- Está relacionada ao contexto educacional geral da disciplina

❌ REJEITAR APENAS se a pergunta:
- É sobre outra disciplina completamente diferente (ex: química em aula de programação)
- É pessoal/administrativa (ex: "quando é a prova?", "posso faltar?")
- É completamente off-topic sem relação alguma

🎯 NA DÚVIDA, ACEITE! O objetivo é AJUDAR o aluno, não bloquear perguntas legítimas.

Responda com JSON:
{
  "in_scope": true/false,
  "reason": "explicação curta",
  "redirect_message": "mensagem educada se fora do escopo (opcional)"
}`
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      console.error('Scope validation failed, assuming in scope');
      return { in_scope: true, reason: 'Validation error' };
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('Error validating scope:', error);
    return { in_scope: true, reason: 'Error in validation' };
  }
}

// Gerar resposta usando método socrático
async function generateResponse(
  query: string,
  context: any[],
  conversationHistory: any[],
  activityContext: ActivityContext | null,
  openaiKey: string
) {
  try {
    // Montar contexto
    const contextText = context.map((c, i) => `[Fonte ${i + 1}: ${c.source}]\n${c.content}`).join('\n\n---\n\n');
    
    // Contexto da atividade
    const activityInfo = activityContext
      ? `**CONTEXTO DA ATIVIDADE:**
Atividade: ${activityContext.title}
Descrição: ${activityContext.description || 'Não fornecida'}
Conteúdo: ${activityContext.content ? activityContext.content.substring(0, 500) : 'Não fornecido'}...`
      : 'Turma geral - sem atividade específica selecionada';

    // Montar mensagens com prompt socrático
    const messages = [
      {
        role: 'system',
        content: `Você é um tutor educacional que usa o método socrático para ensinar. Seu objetivo é GUIAR o aluno até a resposta, NÃO dar a resposta direta.

${activityInfo}

**MATERIAIS RELEVANTES:**
${contextText}

**REGRAS ESSENCIAIS:**
1. ❌ NUNCA dê a resposta completa ou direta de exercícios
2. ✅ Faça perguntas que levem o aluno a pensar e raciocinar
3. ✅ Quebre problemas complexos em etapas menores
4. ✅ Forneça dicas progressivas se o aluno travar
5. ✅ Explique CONCEITOS, não resolva EXERCÍCIOS
6. ✅ Use exemplos SIMILARES, não o exercício exato
7. ✅ Se o aluno pedir a resposta direta, redirecione: "Vamos pensar juntos! O que você já tentou?"
8. ✅ Celebre o raciocínio correto, mesmo que parcial

**MÉTODO SOCRÁTICO:**
- Primeira dúvida: Faça uma pergunta para entender o raciocínio atual
- Se errou: Aponte o erro SEM corrigir, pergunte "por que você pensou assim?"
- Se travou: Dê uma dica sobre o CONCEITO necessário (não a resposta)
- Se pediu resposta: "Interessante pergunta! Que tal começarmos pelo conceito X? O que você sabe sobre ele?"
- Use perguntas guia: "E se...", "O que acontece quando...", "Por que você acha que..."

**TOM:**
- Encorajador e paciente
- Celebre tentativas: "Boa observação!", "Você está no caminho certo!"
- Use emojis moderadamente: 💡🤔✨🎯
- Mostre que errar faz parte do aprendizado

**IMPORTANTE:**
- Se a resposta não estiver nos materiais, seja honesto: "Não encontrei isso nos materiais, mas posso te ajudar a pensar sobre o conceito relacionado"
- Sempre cite as fontes quando usar informação dos materiais`
      },
      ...conversationHistory,
      {
        role: 'user',
        content: query
      }
    ];
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }
    const data = await response.json();
    const answer = data.choices[0].message.content;
    // Extrair fontes únicas
    const sources = [
      ...new Set(context.map((c)=>c.source))
    ];
    return {
      response: answer,
      sources: sources
    };
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}
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
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const openaiKey = Deno.env.get('VITE_OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }
    // Parse request body
    const body = await req.json();
    const { 
      class_id, 
      activity_id, 
      user_id, 
      message, 
      conversation_history = [],
      conversation_id
    } = body;
    if (!class_id || !user_id || !message) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: class_id, user_id, message'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Buscar contexto da atividade se fornecido
    let activityContext: ActivityContext | null = null;
    if (activity_id) {
      const { data: activity } = await supabaseClient
        .from('activities')
        .select('id, title, description, content, type')
        .eq('id', activity_id)
        .single();
      
      if (activity) {
        activityContext = activity;
      }
    }
    const startTime = Date.now();
    console.log(`Processing chatbot query for class ${class_id}, activity ${activity_id || 'none'}`);
    
    // 1. Validar escopo (se há atividade)
    const scopeValidation = await validateQueryScope(message, activityContext, openaiKey);
    
    if (!scopeValidation.in_scope && scopeValidation.redirect_message) {
      // Pergunta fora do escopo
      const responseTime = Date.now() - startTime;
      
      // Salvar mensagem como fora do escopo
      await supabaseClient.from('chatbot_messages').insert({
        conversation_id: conversation_id || null,
        class_id: class_id,
        activity_id: activity_id || null,
        user_id: user_id,
        message: message,
        response: scopeValidation.redirect_message,
        sources_used: [],
        context_retrieved: 0,
        is_out_of_scope: true,
        response_time_ms: responseTime,
        metadata: { scope_reason: scopeValidation.reason }
      });
      
      return new Response(JSON.stringify({
        response: scopeValidation.redirect_message,
        sources: [],
        context_used: 0,
        out_of_scope: true
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // 2. Gerar embedding da pergunta
    const queryEmbedding = await generateQueryEmbedding(message, openaiKey);
    
    // 3. Buscar contexto relevante (priorizar activity_id se fornecido)
    const context = await searchRelevantContext(supabaseClient, class_id, queryEmbedding, 5);
    
    // 4. Gerar resposta com método socrático
    const { response, sources } = await generateResponse(
      message, 
      context, 
      conversation_history, 
      activityContext,
      openaiKey
    );
    
    const responseTime = Date.now() - startTime;
    // 5. Salvar mensagem no histórico
    await supabaseClient.from('chatbot_messages').insert({
      conversation_id: conversation_id || null,
      class_id: class_id,
      activity_id: activity_id || null,
      user_id: user_id,
      message: message,
      response: response,
      sources_used: sources,
      context_retrieved: context.length,
      is_out_of_scope: false,
      response_time_ms: responseTime,
      metadata: {
        activity_title: activityContext?.title,
        scope_validation: scopeValidation.reason
      }
    });
    
    // 6. Atualizar analytics
    const today = new Date().toISOString().split('T')[0];
    await supabaseClient.rpc('increment_chatbot_analytics', {
      p_class_id: class_id,
      p_activity_id: activity_id || null,
      p_date: today
    });
    
    // 7. Atualizar contagem de alunos únicos
    await supabaseClient.rpc('update_unique_students', {
      p_class_id: class_id,
      p_activity_id: activity_id || null,
      p_date: today
    });
    return new Response(JSON.stringify({
      response: response,
      sources: sources,
      context_used: context.length,
      out_of_scope: false,
      response_time_ms: responseTime,
      activity_context: activityContext ? {
        id: activityContext.id,
        title: activityContext.title
      } : null
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
