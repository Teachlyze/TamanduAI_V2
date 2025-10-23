import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getSupabase(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  return supabase;
}

const ALLOWED_EXT = new Set(["pdf", "docx", "odt", "txt"]);
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
  "text/plain",
]);

function ext(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = getSupabase(req);
    const body = await req.json();
    const context: "meeting"|"event" = body.context;
    const contextId: string = body.contextId; // meeting_id or event_id
    const bucket: string = body.bucket; // e.g., 'meeting-attachments' or 'event-attachments'
    const filePath: string = body.filePath; // path inside bucket
    const originalName: string = body.originalName || filePath.split("/").pop();
    const mimeType: string | undefined = body.mimeType;
    const uploaderId: string | undefined = body.uploaderId;

    if (!context || !contextId || !bucket || !filePath) {
      return new Response(JSON.stringify({ error: "missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const extension = ext(originalName);
    const isExtOk = ALLOWED_EXT.has(extension);
    const isMimeOk = mimeType ? ALLOWED_MIME.has(mimeType) : true; // if unknown, let ext gate it

    const table = context === "meeting" ? "meeting_attachments" : "event_attachments";

    // Default status
    let status: "pending"|"approved"|"quarantine"|"rejected" = "approved";
    let reason: string | null = null;

    if (!isExtOk || !isMimeOk) {
      status = "quarantine";
      reason = `Blocked by validation: ext=${extension} ok=${isExtOk}, mime=${mimeType || "unknown"} ok=${isMimeOk}`;
      // Move file to quarantine/ subfolder
      const quarantinePath = `quarantine/${filePath.split("/").pop()}`;
      const { error: copyErr } = await supabase.storage.from(bucket).copy(filePath, quarantinePath);
      if (!copyErr) {
        await supabase.storage.from(bucket).remove([filePath]);
      }
    }

    // Create attachment record
    const insertPayload: any = {
      storage_path: status === "quarantine" ? `quarantine/${filePath.split("/").pop()}` : filePath,
      original_name: originalName,
      mime_type: mimeType || null,
      ext: extension,
      status,
      reason,
      uploader_id: uploaderId || null,
    };
    if (context === "meeting") insertPayload.meeting_id = contextId;
    else insertPayload.event_id = contextId;

    const { data: attachment, error: insErr } = await supabase.from(table).insert(insertPayload).select("*").single();
    if (insErr) throw insErr;

    // Log
    await supabase.from("file_validation_logs").insert({
      context,
      context_id: contextId,
      uploader_id: uploaderId || null,
      original_name: originalName,
      mime_type: mimeType || null,
      ext: extension,
      status,
      details: { bucket, filePath, attachment_id: attachment.id, reason },
    });

    return new Response(JSON.stringify({ success: true, attachment }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("validate-upload error", e);
    return new Response(JSON.stringify({ success: false, error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
