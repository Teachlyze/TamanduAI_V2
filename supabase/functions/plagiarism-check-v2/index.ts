// supabase/functions/plagiarism-check-v2/index.ts
// POST { submission_id, activity_id, class_id, text, recheck?: boolean }
// Integrates Winston AI, stores in plagiarism_checks_v2, maps severity via plagiarism_notification_settings,
// updates submissions, and notifies via notifications (+ optional email via Resend)
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WINSTON_API_KEY = Deno.env.get("WINSTON_API_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// Winston AI API (example endpoint; adjust to actual)
const WINSTON_ENDPOINT = "https://api.winston-ai.com/v2/check";
// Default thresholds (0..1)
const DEFAULT_THRESHOLDS = {
  low: 0.2,
  medium: 0.4,
  high: 0.7
};
// Severity mapping helper
function severityFromScore(score, t) {
  if (score >= t.high) return "high";
  if (score >= t.medium) return "medium";
  if (score >= t.low) return "low";
  return "none";
}
async function callWinstonAI(text) {
  if (!WINSTON_API_KEY) throw new Error("Missing WINSTON_API_KEY");
  const res = await fetch(WINSTON_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WINSTON_API_KEY}`
    },
    body: JSON.stringify({
      text
    })
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Winston API error: ${res.status} ${body}`);
  }
  const data = await res.json();
  // Expecting data like { score: number, details: object }
  return data;
}
async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY) return {
    skipped: true
  };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "alerts@tamandu.ai",
      to,
      subject,
      html
    })
  });
  if (!res.ok) throw new Error(`Resend email error: ${await res.text()}`);
  return await res.json();
}
serve(async (req)=>{
  if (req.method !== "POST") {
    return new Response(JSON.stringify({
      error: "Method not allowed"
    }), {
      status: 405,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(()=>({}));
    const { submission_id, activity_id, class_id, text, recheck } = body || {};
    if (!submission_id || !activity_id || !text) {
      return new Response(JSON.stringify({
        error: "Missing submission_id, activity_id, or text"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // Load activity + class + owner info
    const { data: activity, error: actErr } = await admin.from("activities").select("id, title, class_id").eq("id", activity_id).maybeSingle();
    if (actErr) throw actErr;
    const effectiveClassId = class_id || activity?.class_id || null;
    let classOwner = null;
    if (effectiveClassId) {
      const { data: cls } = await admin.from("classes").select("id, name, created_by").eq("id", effectiveClassId).maybeSingle();
      classOwner = cls?.created_by ?? null;
    }
    // Load thresholds and notification settings
    let thresholds = {
      ...DEFAULT_THRESHOLDS
    };
    let notifyEmail = false;
    let notifyInApp = true;
    let emailTo = null;
    if (classOwner) {
      const { data: settings } = await admin.from("plagiarism_notification_settings").select("low_threshold, medium_threshold, high_threshold, notify_email, notify_in_app").eq("owner_id", classOwner).maybeSingle();
      if (settings) {
        thresholds = {
          low: settings.low_threshold ?? thresholds.low,
          medium: settings.medium_threshold ?? thresholds.medium,
          high: settings.high_threshold ?? thresholds.high
        };
        notifyEmail = !!settings.notify_email;
        notifyInApp = settings.notify_in_app != null ? !!settings.notify_in_app : true;
      }
      // Fetch owner email if we are to send emails
      if (notifyEmail) {
        const { data: ownerProf } = await admin.from("profiles").select("email, full_name").eq("id", classOwner).maybeSingle();
        emailTo = ownerProf?.email ?? null;
      }
    }
    // If not recheck, avoid duplicate check for same submission
    if (!recheck) {
      const { data: existing } = await admin.from("plagiarism_checks_v2").select("id").eq("submission_id", submission_id).limit(1).maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({
          skipped: true,
          reason: "already_checked"
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        });
      }
    }
    // Call Winston AI
    const winston = await callWinstonAI(text);
    const score = typeof winston?.score === "number" ? winston.score : 0;
    const severity = severityFromScore(score, thresholds);
    // Store check
    const { data: checkRow, error: insErr } = await admin.from("plagiarism_checks_v2").insert([
      {
        submission_id,
        activity_id,
        class_id: effectiveClassId,
        score,
        severity,
        provider: "winston_ai",
        raw_result: winston,
        created_at: new Date().toISOString()
      }
    ]).select().single();
    if (insErr) throw insErr;
    // Update submission flags
    const { error: updErr } = await admin.from("submissions").update({
      is_plagiarized: severity === "high" || severity === "medium",
      plagiarism_severity: severity,
      updated_at: new Date().toISOString()
    }).eq("id", submission_id);
    if (updErr) throw updErr;
    // Notifications
    if (notifyInApp && classOwner) {
      await admin.from("notifications").insert([
        {
          user_id: classOwner,
          type: "plagiarismAlert",
          title: "Plagiarism check flagged",
          body: `Submission ${submission_id} scored ${Math.round(score * 100)}% (${severity}).`,
          metadata: {
            submission_id,
            activity_id,
            score,
            severity
          },
          created_at: new Date().toISOString()
        }
      ]);
    }
    if (notifyEmail && emailTo) {
      try {
        await sendEmail(emailTo, "Plagiarism alert", `<p>Submission ${submission_id} scored <b>${Math.round(score * 100)}%</b> (${severity}).</p>`);
      } catch (e) {
        console.warn("Email send failed:", e);
      }
    }
    return new Response(JSON.stringify({
      ok: true,
      score,
      severity,
      check_id: checkRow?.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (e) {
    console.error("plagiarism-check-v2 error", e);
    return new Response(JSON.stringify({
      error: String(e?.message || e)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
