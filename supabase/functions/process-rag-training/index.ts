// Edge Function: Process RAG Training Queue
// Monitora rag_training_sources com embedding_status='pending' e gera embeddings
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Função para extrair texto de PDFs (simplificada - usar biblioteca real em produção)
async function extractTextFromFile(fileUrl, fileType) {
  // TODO: Implementar extração real de PDF/DOCX
  // Por enquanto, retorna placeholder
  console.log(`Extracting text from ${fileType}: ${fileUrl}`);
  return `Conteúdo extraído de ${fileUrl}`;
}
// Função para gerar embeddings usando OpenAI
async function generateEmbeddings(text, openaiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
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
    console.error('Error generating embeddings:', error);
    throw error;
  }
}
// Função para armazenar vectors no Supabase
async function storeVectors(supabase, sourceId, text, embeddings) {
  // Dividir texto em chunks (simplificado - melhorar em produção)
  const chunkSize = 1000;
  const chunks = [];
  for(let i = 0; i < text.length; i += chunkSize){
    chunks.push(text.substring(i, i + chunkSize));
  }
  const vectorIds = [];
  // Armazenar cada chunk com seu embedding
  for(let i = 0; i < chunks.length; i++){
    const chunk = chunks[i];
    // Gerar embedding específico para este chunk
    // (simplificado - na prática, dividir embeddings proporcionalmente)
    const { data, error } = await supabase.from('rag_vectors').insert({
      source_id: sourceId,
      content_chunk: chunk,
      embedding: embeddings,
      chunk_index: i,
      metadata: {
        total_chunks: chunks.length,
        chunk_size: chunk.length
      }
    }).select();
    if (error) {
      console.error('Error storing vector:', error);
      throw error;
    }
    if (data && data[0]) {
      vectorIds.push(data[0].id);
    }
  }
  return vectorIds;
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
    const openaiKey = Deno.env.get('VITE_OPENAI_API_KEY') || Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }
    // Buscar sources pendentes
    const { data: pendingSources, error: fetchError } = await supabaseClient.from('rag_training_sources').select('*').eq('embedding_status', 'pending').eq('is_active', true).limit(10) // Processar 10 por vez
    ;
    if (fetchError) throw fetchError;
    if (!pendingSources || pendingSources.length === 0) {
      return new Response(JSON.stringify({
        message: 'No pending sources to process',
        processed: 0
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const results = [];
    for (const source of pendingSources){
      try {
        // Atualizar status para 'processing'
        await supabaseClient.from('rag_training_sources').update({
          embedding_status: 'processing'
        }).eq('id', source.id);
        let textContent = '';
        // Se é material (PDF, DOCX), extrair texto
        if (source.material_id && source.file_url) {
          textContent = await extractTextFromFile(source.file_url, source.file_type);
        } else if (source.activity_id && source.content_extracted) {
          textContent = source.content_extracted;
        } else {
          throw new Error('No content available for processing');
        }
        // Gerar embeddings
        console.log(`Generating embeddings for source ${source.id}...`);
        const embeddings = await generateEmbeddings(textContent, openaiKey);
        // Armazenar vectors
        console.log(`Storing vectors for source ${source.id}...`);
        const vectorIds = await storeVectors(supabaseClient, source.id, textContent, embeddings);
        // Atualizar status para 'completed'
        await supabaseClient.from('rag_training_sources').update({
          embedding_status: 'completed',
          content_extracted: textContent,
          vector_ids: vectorIds,
          updated_at: new Date().toISOString()
        }).eq('id', source.id);
        results.push({
          id: source.id,
          file_name: source.file_name,
          status: 'completed',
          vectors_created: vectorIds.length
        });
        console.log(`✓ Successfully processed source ${source.id}`);
      } catch (error) {
        console.error(`Error processing source ${source.id}:`, error);
        // Atualizar status para 'failed'
        await supabaseClient.from('rag_training_sources').update({
          embedding_status: 'failed',
          updated_at: new Date().toISOString()
        }).eq('id', source.id);
        results.push({
          id: source.id,
          file_name: source.file_name,
          status: 'failed',
          error: error.message
        });
      }
    }
    return new Response(JSON.stringify({
      message: 'RAG training processing completed',
      processed: results.length,
      results
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
