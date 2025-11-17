import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// ============================================
// CONFIGURAÇÃO
// ============================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const UPSTASH_REDIS_REST_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const UPSTASH_REDIS_REST_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

const CACHE_TTL = 120; // 2 minutos

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// HELPERS REDIS
// ============================================

async function redisGet(key: string): Promise<string | null> {
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) return null;
  
  try {
    const response = await fetch(`${UPSTASH_REDIS_REST_URL}/get/${key}`, {
      headers: { 'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.result;
  } catch (error) {
    console.warn('Redis GET error:', error);
    return null;
  }
}

async function redisSet(key: string, value: string, ttl: number): Promise<void> {
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) return;
  
  try {
    await fetch(
      `${UPSTASH_REDIS_REST_URL}/set/${key}/${encodeURIComponent(value)}/EX/${ttl}`,
      {
        headers: { 'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
      }
    );
  } catch (error) {
    console.warn('Redis SET error:', error);
  }
}

async function redisDel(pattern: string): Promise<void> {
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) return;
  
  try {
    // Invalidar todas as chaves que começam com o padrão
    await fetch(`${UPSTASH_REDIS_REST_URL}/del/${pattern}`, {
      headers: { 'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
    });
  } catch (error) {
    console.warn('Redis DEL error:', error);
  }
}

// ============================================
// VALIDAÇÕES
// ============================================

function validateIdeaInput(body: any): { valid: boolean; error?: string } {
  if (!body.title || typeof body.title !== 'string') {
    return { valid: false, error: 'Título é obrigatório' };
  }
  
  if (body.title.length < 3 || body.title.length > 200) {
    return { valid: false, error: 'Título deve ter entre 3 e 200 caracteres' };
  }
  
  if (body.problem && body.problem.length > 1000) {
    return { valid: false, error: 'Descrição do problema deve ter no máximo 1000 caracteres' };
  }
  
  if (body.solution && body.solution.length > 1000) {
    return { valid: false, error: 'Descrição da solução deve ter no máximo 1000 caracteres' };
  }
  
  if (body.identification && body.identification.length > 100) {
    return { valid: false, error: 'Identificação deve ter no máximo 100 caracteres' };
  }
  
  const validSegments = ['fundamental-1', 'fundamental-2', 'medio', 'tecnico', 'superior'];
  if (body.segment && !validSegments.includes(body.segment)) {
    return { valid: false, error: 'Segmento inválido' };
  }
  
  return { valid: true };
}

// ============================================
// HANDLERS
// ============================================

async function handleGetIdeas(url: URL) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Parse query params
  const status = url.searchParams.get('status') || 'todos';
  const sort = url.searchParams.get('sort') || 'votos';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '6');
  
  // Validar paginação
  const validPage = Math.max(1, page);
  const validLimit = Math.min(Math.max(1, limit), 50); // max 50 por página
  const offset = (validPage - 1) * validLimit;
  
  // Gerar chave de cache
  const cacheKey = `ideas:list:${status}:${sort}:${validPage}:${validLimit}`;
  
  // Tentar buscar do cache
  const cached = await redisGet(cacheKey);
  if (cached) {
    console.log('Cache HIT:', cacheKey);
    return new Response(cached, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }
  
  console.log('Cache MISS:', cacheKey);
  
  // Query Supabase com paginação
  let query = supabase
    .from('public_ideas')
    .select('*', { count: 'exact' });
  
  // Filtro por status
  if (status !== 'todos') {
    query = query.eq('status', status);
  }
  
  // Ordenação
  if (sort === 'votos') {
    query = query.order('votes_count', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }
  
  // Paginação
  query = query.range(offset, offset + validLimit - 1);
  
  const { data, error, count } = await query;
  
  if (error) {
    console.error('Supabase error:', error);
    return new Response(JSON.stringify({ error: 'Erro ao buscar ideias' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  const totalPages = count ? Math.ceil(count / validLimit) : 0;
  
  const response = JSON.stringify({ 
    ideas: data || [], 
    pagination: {
      page: validPage,
      limit: validLimit,
      total: count || 0,
      totalPages,
      hasNext: validPage < totalPages,
      hasPrev: validPage > 1,
    }
  });
  
  // Salvar no cache
  await redisSet(cacheKey, response, CACHE_TTL);
  
  return new Response(response, {
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
  });
}

async function handleCreateIdea(body: any) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Validação básica
  if (!body.title || body.title.trim().length < 3) {
    return new Response(JSON.stringify({ error: 'Título deve ter no mínimo 3 caracteres' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  if (!body.identification || body.identification.trim().length < 3) {
    return new Response(JSON.stringify({ error: 'Nome é obrigatório (mínimo 3 caracteres)' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Validar email se fornecido
  if (body.email && body.email.trim().length > 0) {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(body.email)) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
  
  // Inserir ideia
  const { data, error } = await supabase
    .from('public_ideas')
    .insert({
      title: body.title,
      problem: body.problem || null,
      solution: body.solution || null,
      segment: body.segment || null,
      identification: body.identification,
      email: body.email || null,
      status: 'em-analise',
    })
    .select()
    .single();
  
  if (error) {
    console.error('Supabase insert error:', error);
    return new Response(JSON.stringify({ error: 'Erro ao criar ideia' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Invalidar cache
  await redisDel('ideas:list:*');
  
  return new Response(JSON.stringify({ idea: data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleVoteIdea(body: any) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { idea_id, visitor_id } = body;
  
  if (!idea_id || !visitor_id) {
    return new Response(JSON.stringify({ error: 'idea_id e visitor_id são obrigatórios' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Chamar função SQL que faz toggle do voto
  const { data, error } = await supabase
    .rpc('toggle_idea_vote', {
      p_idea_id: idea_id,
      p_visitor_id: visitor_id,
    });
  
  if (error) {
    console.error('Vote error:', error);
    return new Response(JSON.stringify({ error: 'Erro ao processar voto' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Invalidar cache
  await redisDel('ideas:list:*');
  
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleGetUserVotes(url: URL) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const visitor_id = url.searchParams.get('visitor_id');
  
  if (!visitor_id) {
    return new Response(JSON.stringify({ error: 'visitor_id é obrigatório' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Buscar votos do usuário
  const { data, error } = await supabase
    .from('public_idea_votes')
    .select('idea_id')
    .eq('visitor_id', visitor_id);
  
  if (error) {
    console.error('Get votes error:', error);
    return new Response(JSON.stringify({ error: 'Erro ao buscar votos' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  const votedIds = (data || []).map(v => v.idea_id);
  
  return new Response(JSON.stringify({ voted_ids: votedIds }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200
    });
  }
  
  const url = new URL(req.url);
  const path = url.pathname;
  
  try {
    // GET /ideas-public - Listar ideias
    if (req.method === 'GET' && path === '/ideas-public') {
      return await handleGetIdeas(url);
    }
    
    // GET /ideas-public/votes - Buscar votos do usuário
    if (req.method === 'GET' && path === '/ideas-public/votes') {
      return await handleGetUserVotes(url);
    }
    
    // POST /ideas-public - Criar nova ideia
    if (req.method === 'POST' && path === '/ideas-public') {
      const body = await req.json();
      return await handleCreateIdea(body);
    }
    
    // POST /ideas-public/vote - Votar/Desvotar ideia
    if (req.method === 'POST' && path === '/ideas-public/vote') {
      const body = await req.json();
      return await handleVoteIdea(body);
    }
    
    // Rota não encontrada
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
