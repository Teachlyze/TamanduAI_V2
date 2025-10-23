import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Redis } from 'https://esm.sh/@upstash/redis@1.20.1';

// Initialize Redis client
const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL') || '',
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || '',
});

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

const WINSTON_API_KEY = Deno.env.get('WINSTON_API_KEY');
const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days

interface PlagiarismRequest {
  submission_id: string;
  text: string;
  activity_id: string;
  user_id: string;
}

interface PlagiarismResult {
  similarity_score: number;
  is_plagiarized: boolean;
  sources: Array<{
    url: string;
    title: string;
    similarity: number;
  }>;
  ai_generated_probability?: number;
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { submission_id, text, activity_id, user_id }: PlagiarismRequest = await req.json();

    if (!submission_id || !text || !activity_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate cache key from text hash
    const textHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(text)
    );
    const hashArray = Array.from(new Uint8Array(textHash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const cacheKey = `plagiarism:${hashHex}`;

    // Check cache first
    console.log('Checking cache for key:', cacheKey);
    const cachedResult = await redis.get(cacheKey);
    
    if (cachedResult) {
      console.log('Cache hit! Returning cached result');
      const result = typeof cachedResult === 'string' ? JSON.parse(cachedResult) : cachedResult;
      
      // Update submission with cached result
      await supabase
        .from('submissions')
        .update({
          plagiarism_checked: true,
          plagiarism_score: result.similarity_score,
          is_plagiarized: result.is_plagiarized,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submission_id);

      // Store in plagiarism_checks table
      await supabase.from('plagiarism_checks').insert({
        submission_id,
        similarity_score: result.similarity_score,
        sources: result.sources,
        ai_probability: result.ai_generated_probability,
        checked_at: new Date().toISOString(),
        from_cache: true,
      });

      return new Response(
        JSON.stringify({ ...result, from_cache: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Not in cache, call Winston AI
    console.log('Cache miss. Calling Winston AI...');
    
    if (!WINSTON_API_KEY) {
      throw new Error('Winston AI API key not configured');
    }

    const winstonResponse = await fetch('https://api.gowinston.ai/v1/plagiarism', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WINSTON_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        language: 'pt',
        include_ai_detection: true,
      }),
    });

    if (!winstonResponse.ok) {
      const errorText = await winstonResponse.text();
      throw new Error(`Winston AI error: ${winstonResponse.status} - ${errorText}`);
    }

    const winstonData = await winstonResponse.json();

    // Transform Winston response to our format
    const result: PlagiarismResult = {
      similarity_score: winstonData.similarity_score || 0,
      is_plagiarized: (winstonData.similarity_score || 0) > 35, // Default threshold
      sources: winstonData.sources || [],
      ai_generated_probability: winstonData.ai_score,
    };

    // Cache the result
    console.log('Caching result with TTL:', CACHE_TTL);
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

    // Update submission
    await supabase
      .from('submissions')
      .update({
        plagiarism_checked: true,
        plagiarism_score: result.similarity_score,
        is_plagiarized: result.is_plagiarized,
        updated_at: new Date().toISOString(),
      })
      .eq('id', submission_id);

    // Store detailed results
    await supabase.from('plagiarism_checks').insert({
      submission_id,
      similarity_score: result.similarity_score,
      sources: result.sources,
      ai_probability: result.ai_generated_probability,
      checked_at: new Date().toISOString(),
      from_cache: false,
    });

    // Create alert if plagiarism detected
    if (result.is_plagiarized) {
      // Get activity to check threshold
      const { data: activity } = await supabase
        .from('activities')
        .select('plagiarism_threshold, class_id')
        .eq('id', activity_id)
        .single();

      const threshold = activity?.plagiarism_threshold || 35;
      
      if (result.similarity_score >= threshold) {
        // Get class_id from activity_class_assignments
        const { data: assignments } = await supabase
          .from('activity_class_assignments')
          .select('class_id')
          .eq('activity_id', activity_id)
          .limit(1)
          .single();

        if (assignments?.class_id) {
          await supabase.from('student_alerts').insert({
            student_id: user_id,
            class_id: assignments.class_id,
            alert_type: 'plagiarism',
            severity: result.similarity_score >= 50 ? 'critical' : 'warning',
            details: {
              submission_id,
              similarity_score: result.similarity_score,
              sources_count: result.sources.length,
            },
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    // Track usage for billing
    await redis.incr(`usage:plagiarism:${user_id}:${new Date().toISOString().slice(0, 7)}`);

    return new Response(
      JSON.stringify({ ...result, from_cache: false }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );

  } catch (error) {
    console.error('Error in plagiarism-check:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack 
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );
  }
});
