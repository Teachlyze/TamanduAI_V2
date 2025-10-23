// Edge Function: Chatbot Query with RAG
// Recebe pergunta do aluno, busca contexto relevante e responde usando OpenAI
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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
// Gerar resposta usando OpenAI com contexto
async function generateResponse(query, context, conversationHistory, openaiKey) {
  try {
    // Montar contexto
    const contextText = context.map((c, i)=>`[Fonte ${i + 1}: ${c.source}]\n${c.content}`).join('\n\n---\n\n');
    // Montar mensagens
    const messages = [
      {
        role: 'system',
        content: `Você é um assistente educacional inteligente. Use o contexto fornecido abaixo para responder às perguntas dos alunos de forma clara e educativa.

CONTEXTO DISPONÍVEL:
${contextText}

INSTRUÇÕES:
- Responda baseado APENAS no contexto fornecido
- Se a resposta não estiver no contexto, diga: "Não encontrei essa informação nos materiais disponíveis"
- Seja claro, didático e use exemplos quando possível
- Mantenha um tom amigável e encorajador
- Cite as fontes quando relevante`
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
    const { class_id, user_id, message, conversation_history = [] } = body;
    if (!class_id || !user_id || !message) {
      return new Response(JSON.stringify({
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`Processing chatbot query for class ${class_id}...`);
    // 1. Gerar embedding da pergunta
    const queryEmbedding = await generateQueryEmbedding(message, openaiKey);
    // 2. Buscar contexto relevante
    const context = await searchRelevantContext(supabaseClient, class_id, queryEmbedding, 5);
    // 3. Gerar resposta com OpenAI
    const { response, sources } = await generateResponse(message, context, conversation_history, openaiKey);
    // 4. Salvar mensagem no histórico
    await supabaseClient.from('chatbot_messages').insert({
      class_id: class_id,
      user_id: user_id,
      message: message,
      response: response,
      sources_used: sources,
      context_retrieved: context.length,
      created_at: new Date().toISOString()
    });
    // 5. Atualizar analytics
    const today = new Date().toISOString().split('T')[0];
    await supabaseClient.rpc('increment_chatbot_analytics', {
      p_class_id: class_id,
      p_date: today
    });
    return new Response(JSON.stringify({
      response: response,
      sources: sources,
      context_used: context.length
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
