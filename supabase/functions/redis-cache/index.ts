import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Upstash Redis REST API configuration
const UPSTASH_REDIS_REST_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const UPSTASH_REDIS_REST_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
  console.error("Missing Upstash Redis configuration");
}
// Enhanced cache configuration
const CACHE_CONFIG = {
  DEFAULT_TTL: 300,
  MAX_TTL: 3600,
  MIN_TTL: 60,
  MAX_BATCH_SIZE: 100,
  RATE_LIMIT_PER_MINUTE: 1000
};
// Metrics storage (in-memory for edge function)
const metrics = {
  requests: {
    total: 0,
    successful: 0,
    failed: 0
  },
  operations: {},
  rateLimitHits: 0,
  lastReset: new Date().toISOString()
};
// Simple in-memory rate limiting
const rateLimitMap = new Map();
/**
 * Reset metrics daily
 */ function resetMetrics() {
  const now = new Date();
  const lastReset = new Date(metrics.lastReset);
  const hoursDiff = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
  if (hoursDiff >= 24) {
    metrics.requests = {
      total: 0,
      successful: 0,
      failed: 0
    };
    metrics.operations = {};
    metrics.rateLimitHits = 0;
    metrics.lastReset = now.toISOString();
  }
}
/**
 * Check rate limiting for IP
 */ function checkRateLimit(clientIP) {
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  if (!rateLimitMap.has(clientIP)) {
    rateLimitMap.set(clientIP, []);
  }
  const requests = rateLimitMap.get(clientIP);
  // Remove old requests outside the window
  const validRequests = requests.filter((timestamp)=>timestamp > windowStart);
  if (validRequests.length >= CACHE_CONFIG.RATE_LIMIT_PER_MINUTE) {
    metrics.rateLimitHits++;
    return false;
  }
  validRequests.push(now);
  rateLimitMap.set(clientIP, validRequests);
  return true;
}
/**
 * Track operation metrics
 */ function trackOperation(action, success) {
  if (!metrics.operations[action]) {
    metrics.operations[action] = {
      total: 0,
      successful: 0,
      failed: 0
    };
  }
  metrics.operations[action].total++;
  if (success) {
    metrics.operations[action].successful++;
  } else {
    metrics.operations[action].failed++;
  }
}
/**
 * Make authenticated request to Upstash Redis REST API with retry logic
 */ async function redisRequest(command, ...args) {
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    throw new Error("Upstash Redis not configured");
  }
  
  const maxRetries = 3;
  let lastError = null;
  
  for(let attempt = 1; attempt <= maxRetries; attempt++){
    try {
      // Construir endpoint correto para Upstash REST API
      let endpoint = UPSTASH_REDIS_REST_URL;
      let method = "GET";
      
      // Formatar comandos para a API REST do Upstash
      if (command === 'GET') {
        endpoint = `${UPSTASH_REDIS_REST_URL}/get/${args[0]}`;
      } else if (command === 'SET') {
        const [key, value, ...opts] = args;
        endpoint = `${UPSTASH_REDIS_REST_URL}/set/${key}/${encodeURIComponent(value)}`;
        if (opts.length > 0) {
          endpoint += `/${opts.join('/')}`;
        }
      } else if (command === 'DEL') {
        endpoint = `${UPSTASH_REDIS_REST_URL}/del/${args.join('/')}`;
      } else if (command === 'EXISTS') {
        endpoint = `${UPSTASH_REDIS_REST_URL}/exists/${args[0]}`;
      } else if (command === 'INCR') {
        endpoint = `${UPSTASH_REDIS_REST_URL}/incr/${args[0]}`;
      } else if (command === 'EXPIRE') {
        endpoint = `${UPSTASH_REDIS_REST_URL}/expire/${args[0]}/${args[1]}`;
      } else if (command === 'TTL') {
        endpoint = `${UPSTASH_REDIS_REST_URL}/ttl/${args[0]}`;
      } else if (command === 'PING') {
        endpoint = `${UPSTASH_REDIS_REST_URL}/ping`;
      } else {
        throw new Error(`Unsupported command: ${command}`);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(()=>controller.abort(), 10000);
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Authorization": `Bearer ${UPSTASH_REDIS_REST_TOKEN}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Redis API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.error) {
        throw new Error(`Redis command error: ${data.error}`);
      }
      
      return data.result || null;
    } catch (error) {
      lastError = error;
      console.warn(`Redis request attempt ${attempt} failed:`, error);
      if (attempt < maxRetries) {
        await new Promise((resolve)=>setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
  }
  throw lastError || new Error("All retry attempts failed");
}
/**
 * Batch multiple Redis operations (executa sequencialmente com a nova API)
 */ async function batchRedisRequests(operations) {
  if (operations.length > CACHE_CONFIG.MAX_BATCH_SIZE) {
    throw new Error(`Batch size exceeds maximum of ${CACHE_CONFIG.MAX_BATCH_SIZE}`);
  }
  
  // Executa todas as operações em paralelo
  const results = await Promise.all(
    operations.map(op => redisRequest(op.command, ...op.args))
  );
  
  return results;
}
/**
 * Validate TTL parameter
 */ function validateTTL(ttl) {
  const numTTL = parseInt(ttl);
  if (isNaN(numTTL) || numTTL < CACHE_CONFIG.MIN_TTL || numTTL > CACHE_CONFIG.MAX_TTL) {
    throw new Error(`TTL must be between ${CACHE_CONFIG.MIN_TTL} and ${CACHE_CONFIG.MAX_TTL} seconds`);
  }
  return numTTL;
}
/**
 * Get client IP address
 */ function getClientIP(request) {
  // Try various headers that might contain the real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  if (realIP) return realIP;
  if (clientIP) return clientIP;
  // Fallback for local development
  return '127.0.0.1';
}
/**
 * CORS headers for all responses
 */ const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
/**
 * Main edge function handler
 */ serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
      status: 200
    });
  }
  // Reset metrics periodically
  resetMetrics();
  const clientIP = getClientIP(req);
  // Check rate limiting
  if (!checkRateLimit(clientIP)) {
    return new Response(JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Maximum ${CACHE_CONFIG.RATE_LIMIT_PER_MINUTE} requests per minute.`,
      retryAfter: 60
    }), {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': '60'
      }
    });
  }
  // Only allow POST requests
  if (req.method !== 'POST') {
    metrics.requests.total++;
    metrics.requests.failed++;
    trackOperation('invalid_method', false);
    return new Response(JSON.stringify({
      error: 'Method not allowed',
      message: 'Only POST requests are allowed'
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  try {
    const body = await req.json();
    const { action, key, value, ttl, pattern, operations } = body;
    // Track request
    metrics.requests.total++;
    // Validate required parameters
    if (!action && !operations) {
      metrics.requests.failed++;
      trackOperation('invalid_params', false);
      return new Response(JSON.stringify({
        error: 'Invalid parameters',
        message: 'Action or operations array is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    let result;
    // Handle batch operations
    if (operations && Array.isArray(operations)) {
      try {
        const batchResults = await batchRedisRequests(operations);
        result = {
          batch: true,
          results: batchResults,
          count: batchResults.length
        };
        metrics.requests.successful++;
        trackOperation('batch', true);
      } catch (error) {
        metrics.requests.failed++;
        trackOperation('batch', false);
        throw error;
      }
    } else {
      // Handle single operations
      switch(action){
        case 'get':
          result = await redisRequest('GET', key);
          break;
        case 'set':
          const cacheTTL = ttl ? validateTTL(ttl) : CACHE_CONFIG.DEFAULT_TTL;
          result = await redisRequest('SET', key, value, 'EX', cacheTTL);
          break;
        case 'del':
        case 'delete':
          result = await redisRequest('DEL', key);
          break;
        case 'exists':
          result = await redisRequest('EXISTS', key);
          break;
        case 'incr':
          result = await redisRequest('INCR', key);
          break;
        case 'expire':
          const expireTTL = validateTTL(ttl);
          result = await redisRequest('EXPIRE', key, expireTTL);
          break;
        case 'ttl':
          result = await redisRequest('TTL', key);
          break;
        case 'keys':
          if (!pattern) {
            return new Response(JSON.stringify({
              error: 'Invalid parameters',
              message: 'Pattern is required for keys action'
            }), {
              status: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }
          result = await redisRequest('KEYS', pattern);
          break;
        case 'mget':
          if (!Array.isArray(value)) {
            return new Response(JSON.stringify({
              error: 'Invalid parameters',
              message: 'Value must be an array for mget action'
            }), {
              status: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }
          result = await redisRequest('MGET', ...value);
          break;
        case 'mset':
          if (!Array.isArray(value) || value.length % 2 !== 0) {
            return new Response(JSON.stringify({
              error: 'Invalid parameters',
              message: 'Value must be an array of key-value pairs for mset action'
            }), {
              status: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }
          result = await redisRequest('MSET', ...value);
          break;
        case 'flush':
          // Only allow flush in development
          if (Deno.env.get('ENVIRONMENT') !== 'development') {
            return new Response(JSON.stringify({
              error: 'Forbidden',
              message: 'Flush operation only allowed in development'
            }), {
              status: 403,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }
          result = await redisRequest('FLUSHALL');
          break;
        case 'ping':
          result = await redisRequest('PING');
          break;
        case 'info':
          result = await redisRequest('INFO');
          break;
        case 'metrics':
          // Return current metrics (admin only in production)
          if (Deno.env.get('ENVIRONMENT') === 'production' && !Deno.env.get('ADMIN_TOKEN')) {
            return new Response(JSON.stringify({
              error: 'Forbidden',
              message: 'Metrics endpoint requires admin authentication'
            }), {
              status: 403,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }
          result = {
            ...metrics,
            uptime: Date.now()
          };
          break;
        default:
          return new Response(JSON.stringify({
            error: 'Invalid action',
            message: `Unsupported action: ${action}`,
            supportedActions: [
              'get',
              'set',
              'del',
              'exists',
              'incr',
              'expire',
              'ttl',
              'keys',
              'mget',
              'mset',
              'flush',
              'ping',
              'info',
              'metrics',
              'batch'
            ]
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
      }
      // Track successful operation
      metrics.requests.successful++;
      trackOperation(action, true);
    }
    // Prepare response
    const responseData = {
      success: true,
      action: action || 'batch',
      key,
      result,
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Redis cache function error:', error);
    // Track failed request
    metrics.requests.failed++;
    if (req.url.includes('action')) {
      const body = await req.clone().json().catch(()=>({}));
      trackOperation(body.action || 'unknown', false);
    }
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString(),
      ...Deno.env.get('ENVIRONMENT') === 'development' && {
        stack: error.stack
      }
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
