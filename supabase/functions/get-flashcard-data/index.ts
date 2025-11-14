/**
 * 🎴 Get Flashcard Data Edge Function
 * Cached endpoint para buscar dados de flashcards com Upstash Redis
 * 
 * @endpoint POST /api/get-flashcard-data
 * @auth Bearer token required
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Upstash Redis config
const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL') || Deno.env.get('VITE_UPSTASH_REDIS_REST_URL');
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || Deno.env.get('VITE_UPSTASH_REDIS_REST_TOKEN');

// Cache TTL: 5 minutos
const CACHE_TTL = 300;

interface RedisGetResponse {
  result: string | null;
}

interface RedisSetResponse {
  result: string;
}

/**
 * Get data from Redis cache
 */
async function getFromCache(key: string): Promise<any | null> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.log('⚠️ Redis não configurado');
    return null;
  }

  try {
    const response = await fetch(`${REDIS_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });

    if (!response.ok) {
      console.error('Redis GET error:', response.status);
      return null;
    }

    const data: RedisGetResponse = await response.json();
    
    if (!data.result) {
      return null;
    }

    return JSON.parse(data.result);
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Save data to Redis cache
 */
async function saveToCache(key: string, value: any, ttl: number = CACHE_TTL): Promise<void> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return;
  }

  try {
    const response = await fetch(`${REDIS_URL}/setex/${key}/${ttl}`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(value),
    });

    if (!response.ok) {
      console.error('Redis SET error:', response.status);
    }
  } catch (error) {
    console.error('Cache save error:', error);
  }
}

/**
 * Invalidate cache for a user
 */
async function invalidateUserCache(userId: string): Promise<void> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return;
  }

  try {
    // Delete all user-related keys
    const patterns = [
      `flashcards:decks:${userId}`,
      `flashcards:deck:*:${userId}`,
      `flashcards:cards:*:${userId}`,
    ];

    for (const pattern of patterns) {
      await fetch(`${REDIS_URL}/del/${pattern}`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      });
    }
  } catch (error) {
    console.error('Cache invalidate error:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verificar usuário
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parsear request
    const { type, deckId, invalidate } = await req.json();

    // Invalidar cache se solicitado
    if (invalidate) {
      await invalidateUserCache(user.id);
      return new Response(
        JSON.stringify({ success: true, message: 'Cache invalidated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let cacheKey: string;
    let data: any;
    let fromCache = false;

    // TIPO 1: Buscar todos os decks do usuário
    if (type === 'decks') {
      cacheKey = `flashcards:decks:${user.id}`;
      
      // Tentar buscar do cache
      const cachedData = await getFromCache(cacheKey);
      if (cachedData) {
        fromCache = true;
        data = cachedData;
      } else {
        // Buscar do banco
        const { data: decksData, error: decksError } = await supabaseClient
          .from('decks')
          .select(`
            *,
            deck_stats(*)
          `)
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (decksError) throw decksError;
        
        data = decksData;
        await saveToCache(cacheKey, data);
      }
    }
    
    // TIPO 2: Buscar um deck específico
    else if (type === 'deck' && deckId) {
      cacheKey = `flashcards:deck:${deckId}:${user.id}`;
      
      const cachedData = await getFromCache(cacheKey);
      if (cachedData) {
        fromCache = true;
        data = cachedData;
      } else {
        const { data: deckData, error: deckError } = await supabaseClient
          .from('decks')
          .select(`
            *,
            deck_stats(*)
          `)
          .eq('id', deckId)
          .eq('user_id', user.id)
          .single();

        if (deckError) throw deckError;
        
        data = deckData;
        await saveToCache(cacheKey, data);
      }
    }
    
    // TIPO 3: Buscar cards de um deck
    else if (type === 'cards' && deckId) {
      cacheKey = `flashcards:cards:${deckId}:${user.id}`;
      
      const cachedData = await getFromCache(cacheKey);
      if (cachedData) {
        fromCache = true;
        data = cachedData;
      } else {
        const { data: cardsData, error: cardsError } = await supabaseClient
          .from('cards')
          .select(`
            *,
            card_stats(*)
          `)
          .eq('deck_id', deckId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (cardsError) throw cardsError;
        
        data = cardsData;
        await saveToCache(cacheKey, data);
      }
    }
    
    else {
      return new Response(
        JSON.stringify({ error: 'Invalid type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Retornar resposta com header de cache
    return new Response(
      JSON.stringify({
        success: true,
        data,
        cached: fromCache,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Cache': fromCache ? 'HIT' : 'MISS',
          'Cache-Control': `private, max-age=${CACHE_TTL}`,
        },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
