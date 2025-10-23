// Edge Function: Generate Thumbnail
// Gera thumbnails automaticamente para imagens enviadas no storage
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Inicializa o cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { bucket, filePath, width = 300, height = 300, quality = 80 } = await req.json();
    if (!bucket || !filePath) {
      return new Response(JSON.stringify({
        error: 'bucket and filePath are required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Baixa o arquivo original do storage
    const { data: originalFile, error: downloadError } = await supabase.storage.from(bucket).download(filePath);
    if (downloadError) {
      console.error('Error downloading file:', downloadError);
      return new Response(JSON.stringify({
        error: 'Failed to download original file',
        details: downloadError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Verifica se é uma imagem
    const fileType = originalFile.type;
    if (!fileType.startsWith('image/')) {
      return new Response(JSON.stringify({
        error: 'File is not an image',
        type: fileType
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Converte Blob para ArrayBuffer
    const arrayBuffer = await originalFile.arrayBuffer();
    const imageData = new Uint8Array(arrayBuffer);
    // Usa ImageMagick via Deno FFI (ou alternativa leve)
    // Para uma solução mais simples, vamos usar a API de transformação do Supabase
    // que está disponível no plano Pro
    // Gera o caminho do thumbnail
    const thumbnailPath = filePath.replace(/(\.[^.]+)$/, '_thumb$1');
    // Para uma implementação básica sem processamento de imagem:
    // Vamos criar uma entrada de metadados e retornar a URL de transformação do Supabase
    // URL com transformação automática (disponível no Supabase Pro)
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath, {
      transform: {
        width,
        height,
        resize: 'cover',
        quality
      }
    });
    // Retorna os dados do thumbnail
    return new Response(JSON.stringify({
      success: true,
      originalPath: filePath,
      thumbnailUrl: publicUrlData.publicUrl,
      dimensions: {
        width,
        height
      },
      quality
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
