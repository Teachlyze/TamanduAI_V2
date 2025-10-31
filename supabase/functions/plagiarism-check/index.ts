import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
function getSupabase(req) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") ?? ""
      }
    }
  });
  return supabase;
}
function classifySeverity(percent) {
  if (percent > 50) return 'gravissimo';
  if (percent > 35) return 'grave';
  if (percent > 20) return 'medio';
  return 'none';
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') return new Response('ok', {
    headers: corsHeaders
  });
  try {
    const supabase = getSupabase(req);
    const body = await req.json();
    const submissionId = body.submissionId;
    const activityId = body.activityId;
    const classId = body.classId;
    const text = body.text; // prefer text
    const website = body.url || body.website; // optional
    const excluded_sources = body.exclude_urls || body.excluded_sources;
    const language = body.language || 'en';
    const country = body.country || 'us';
    if (!submissionId || !text && !website) {
      return new Response(JSON.stringify({
        error: 'missing submissionId or content (text/website)'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const token = Deno.env.get('WINSTON_AI_API_KEY');
    if (!token) {
      return new Response(JSON.stringify({
        error: 'WINSTON_AI_API_KEY not configured'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Insert processing row
    const { data: checkRow, error: insErr } = await supabase.from('plagiarism_checks_v2').insert({
      submission_id: submissionId,
      activity_id: activityId ?? null,
      class_id: classId ?? null,
      status: 'processing',
      provider: 'winston'
    }).select('*').single();
    if (insErr) throw insErr;
    // Call Winston AI v2 plagiarism API (single request)
    const res = await fetch('https://api.gowinston.ai/v2/plagiarism', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        website,
        excluded_sources,
        language,
        country
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      await supabase.from('plagiarism_checks_v2').update({
        status: 'failed',
        error: `Winston API ${res.status}: ${errText?.slice(0, 200)}`
      }).eq('id', checkRow.id);
      return new Response(JSON.stringify({
        success: false,
        error: 'winston_api_error'
      }), {
        status: 502,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const final = await res.json();
    const plag = Number(final?.result?.score ?? 0);
    const severity = classifySeverity(plag);
    await supabase.from('plagiarism_checks_v2').update({
      status: 'completed',
      plag_percent: plag,
      unique_percent: final?.result?.textWordCounts ? Math.max(0, 100 - plag) : null,
      rephrased_percent: null,
      exact_matched_percent: null,
      severity,
      raw: final
    }).eq('id', checkRow.id);
    // Notify teacher if Grave/Gravíssimo
    if (severity === 'grave' || severity === 'gravissimo') {
      // get submission -> activity -> class -> teacher and student profile
      const { data: sub } = await supabase.from('submissions').select('id, activity_id, user_id').eq('id', submissionId).single();
      if (sub) {
        const [{ data: activity }, { data: student }, { data: cls }] = await Promise.all([
          supabase.from('activities').select('id, title, class_id').eq('id', sub.activity_id).single(),
          supabase.from('profiles').select('id, full_name').eq('id', sub.user_id).single(),
          supabase.from('classes').select('id, name, teacher_id').eq('id', activity?.class_id || classId || '').maybeSingle()
        ]);
        const teacherId = cls?.teacher_id;
        if (teacherId) {
          await supabase.from('notifications').insert({
            user_id: teacherId,
            title: 'Plágio detectado',
            message: `Turma: ${cls?.name || ''} | Aluno: ${student?.full_name || ''} | Atividade: ${activity?.title || ''} | Plágio: ${plag}%`,
            type: 'assignment',
            category: 'plagiarism',
            priority: 'high',
            reference_id: submissionId,
            reference_type: 'submission',
            metadata: {
              classId: cls?.id,
              activityId: activity?.id,
              submissionId
            }
          });
        }
      }
    }
    return new Response(JSON.stringify({
      success: true,
      checkId: checkRow.id,
      severity
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (e) {
    console.error('plagiarism-check error', e);
    return new Response(JSON.stringify({
      success: false,
      error: String(e?.message || e)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
