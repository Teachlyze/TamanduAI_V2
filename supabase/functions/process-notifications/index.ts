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
// Generate reminder notifications based on calendar events
async function processCalendarReminders(supabase) {
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
  // Fetch events ending within next 48h
  const { data: events, error: evErr } = await supabase.from('calendar_events').select('id, title, end_time, activity_id').gt('end_time', now.toISOString()).lte('end_time', in48h);
  if (evErr) throw evErr;
  if (!events || events.length === 0) return {
    scheduled: 0
  };
  // Preload activity metadata for improved timing
  const activityIds = Array.from(new Set(events.map((e)=>e.activity_id).filter(Boolean)));
  let activityMap = {};
  if (activityIds.length > 0) {
    const { data: acts } = await supabase.from('class_activities').select('id, estimated_minutes, complexity').in('id', activityIds);
    activityMap = Object.fromEntries((acts || []).map((a)=>[
        a.id,
        a
      ]));
  }
  // For each event, collect attendees and schedule reminders
  let scheduled = 0;
  for (const ev of events){
    const end = new Date(ev.end_time);
    const act = ev.activity_id ? activityMap[ev.activity_id] : undefined;
    const est = act?.estimated_minutes || 60;
    const mult = act?.complexity === 'high' ? 2 : act?.complexity === 'medium' ? 1.2 : 1;
    const workload = Math.ceil(est * mult);
    const reminders = [
      {
        label: 'Iniciar preparo',
        when: new Date(end.getTime() - (workload + 120) * 60000)
      },
      {
        label: 'Lembrete 24h',
        when: new Date(end.getTime() - 24 * 60 * 60000)
      },
      {
        label: 'Lembrete 2h',
        when: new Date(end.getTime() - 2 * 60 * 60000)
      }
    ].filter((r)=>r.when > now); // only future
    if (reminders.length === 0) continue;
    const { data: attendees, error: atErr } = await supabase.from('event_attendees').select('user_id').eq('event_id', ev.id);
    if (atErr) throw atErr;
    const userIds = (attendees || []).map((a)=>a.user_id);
    for (const uid of userIds){
      for (const r of reminders){
        // schedule a notification if not already scheduled
        const { data: exists } = await supabase.from('scheduled_notifications').select('id').eq('user_id', uid).eq('reference_id', ev.id).eq('reference_type', 'calendar_event').eq('category', 'reminder').eq('title', r.label).maybeSingle();
        if (!exists) {
          await supabase.from('scheduled_notifications').insert({
            user_id: uid,
            title: r.label,
            message: `${ev.title || 'Evento'} acontece em breve`,
            type: 'event',
            category: 'reminder',
            priority: 'medium',
            reference_id: ev.id,
            reference_type: 'calendar_event',
            scheduled_for: r.when.toISOString(),
            metadata: {
              end_time: ev.end_time,
              activity_id: ev.activity_id
            }
          });
          scheduled++;
        }
      }
    }
  }
  return {
    scheduled
  };
}
// Detect overlapping events for each user in the next 7 days and notify
async function processCalendarConflicts(supabase) {
  const now = new Date();
  const to = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  // Pull upcoming events and attendance
  const { data: events, error: evErr } = await supabase.from('calendar_events').select('id, title, start_time, end_time').gt('end_time', now.toISOString()).lte('start_time', to);
  if (evErr) throw evErr;
  if (!events || events.length === 0) return {
    conflicts: 0
  };
  const eventMap = new Map(events.map((e)=>[
      e.id,
      e
    ]));
  const eventIds = events.map((e)=>e.id);
  const { data: attendees, error: atErr } = await supabase.from('event_attendees').select('event_id, user_id').in('event_id', eventIds);
  if (atErr) throw atErr;
  // group events by user
  const byUser = {};
  for (const a of attendees || []){
    const ev = eventMap.get(a.event_id);
    if (!ev) continue;
    (byUser[a.user_id] ||= []).push(ev);
  }
  let conflicts = 0;
  for (const [uid, evs] of Object.entries(byUser)){
    const sorted = evs.sort((a, b)=>+new Date(a.start_time) - +new Date(b.start_time));
    for(let i = 0; i < sorted.length - 1; i++){
      const a = sorted[i];
      const b = sorted[i + 1];
      if (new Date(b.start_time) < new Date(a.end_time)) {
        // conflict detected, notify once per pair if not exists
        const { data: exists } = await supabase.from('notifications').select('id').eq('user_id', uid).eq('reference_type', 'calendar_conflict').eq('reference_id', a.id).maybeSingle();
        if (!exists) {
          await supabase.from('notifications').insert({
            user_id: uid,
            title: 'Conflito de Agenda',
            message: `${a.title || 'Evento'} conflita com ${b.title || 'outro evento'}`,
            type: 'event',
            category: 'conflict',
            priority: 'high',
            reference_type: 'calendar_conflict',
            reference_id: a.id,
            metadata: {
              a,
              b
            }
          });
          conflicts++;
        }
      }
    }
  }
  return {
    conflicts
  };
}
async function processDueScheduledNotifications(supabase) {
  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabase.from("scheduled_notifications").select("*").lte("scheduled_for", nowIso).is("executed_at", null);
  if (error) throw error;
  if (!due || due.length === 0) return {
    sent: 0,
    failed: 0,
    total: 0
  };
  let sent = 0;
  let failed = 0;
  for (const n of due){
    try {
      const insert = {
        title: n.title,
        message: n.message,
        type: n.type,
        category: n.category,
        priority: n.priority,
        reference_id: n.reference_id,
        reference_type: n.reference_type,
        action_url: n.action_url,
        metadata: n.metadata,
        user_id: n.user_id
      };
      const { error: insErr } = await supabase.from("notifications").insert(insert);
      if (insErr) throw insErr;
      const { error: upErr } = await supabase.from("scheduled_notifications").update({
        executed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", n.id);
      if (upErr) throw upErr;
      sent++;
    } catch (e) {
      console.error("processDueScheduledNotifications error", e);
      failed++;
      await supabase.from("scheduled_notifications").update({
        error_count: (n.error_count || 0) + 1,
        last_error: String(e?.message || e),
        updated_at: new Date().toISOString()
      }).eq("id", n.id);
    }
  }
  return {
    sent,
    failed,
    total: due.length
  };
}
async function sendEmail(supabase, to, subject, html, text) {
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        to,
        subject,
        html,
        text
      }
    });
    if (error) throw error;
    return data;
  } catch (e) {
    console.error("sendEmail error", e);
    return null;
  }
}
async function processMissedDeadlines(supabase) {
  const now = new Date();
  const since = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const { data: activities, error: actErr } = await supabase.from("activities").select("id, title, class_id, due_date").lte("due_date", now.toISOString()).gte("due_date", since);
  if (actErr) throw actErr;
  if (!activities || activities.length === 0) return {
    checked: 0,
    notified: 0
  };
  let notified = 0;
  for (const act of activities){
    const { data: enrollments, error: enrErr } = await supabase.from("classes_students").select("student_id").eq("class_id", act.class_id);
    if (enrErr) throw enrErr;
    const studentIds = (enrollments || []).map((e)=>e.student_id);
    if (studentIds.length === 0) continue;
    const { data: profiles, error: profErr } = await supabase.from("profiles").select("id, email").in("id", studentIds);
    if (profErr) throw profErr;
    const emailById = Object.fromEntries((profiles || []).map((p)=>[
        p.id,
        p.email
      ]));
    for (const sid of studentIds){
      const { data: submission, error: subErr } = await supabase.from("submissions").select("id").eq("activity_id", act.id).eq("user_id", sid).maybeSingle();
      if (subErr) throw subErr;
      if (!submission) {
        // In-app notification
        await supabase.from("notifications").insert({
          user_id: sid,
          title: "Prazo vencido",
          message: `${act.title || "Atividade"} não foi entregue até ${act.due_date}`,
          type: "assignment",
          category: "deadline",
          priority: "high",
          reference_id: act.id,
          reference_type: "activity",
          metadata: {
            classId: act.class_id,
            missedDeadline: true
          }
        });
        // Email via existing function (best-effort)
        const to = emailById[sid];
        if (to) {
          await sendEmail(supabase, to, `Prazo vencido: ${act.title || "Atividade"}`, `<h2>Prazo vencido</h2><p>${act.title || "Atividade"} não foi entregue até ${act.due_date}</p>`);
        }
        notified++;
      }
    }
  }
  return {
    checked: activities.length,
    notified
  };
}
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    // Optional simple auth (e.g., scheduled cron can pass header CRON_KEY)
    const incomingKey = req.headers.get("x-cron-key");
    const cronKey = Deno.env.get("CRON_KEY");
    if (cronKey && incomingKey !== cronKey) {
      return new Response(JSON.stringify({
        error: "Unauthorized"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const supabase = getSupabase(req);
    const url = new URL(req.url);
    const task = url.searchParams.get("task") || "all"; // scheduled | missed | calendar-reminders | calendar-conflicts | all
    const results = {};
    if (task === "scheduled" || task === "all") {
      results.scheduled = await processDueScheduledNotifications(supabase);
    }
    if (task === "missed" || task === "all") {
      results.missed = await processMissedDeadlines(supabase);
    }
    if (task === "calendar-reminders" || task === "all") {
      results.calendarReminders = await processCalendarReminders(supabase);
    }
    if (task === "calendar-conflicts" || task === "all") {
      results.calendarConflicts = await processCalendarConflicts(supabase);
    }
    return new Response(JSON.stringify({
      success: true,
      ...results
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (e) {
    console.error("process-notifications error", e);
    return new Response(JSON.stringify({
      success: false,
      error: String(e?.message || e)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
