// Edge Function: record-class
// Purpose: Handle class recording uploads and metadata

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      classId, 
      recordedDate, 
      recordingUrl, 
      storagePath,
      durationMinutes,
      fileSizeMb,
      googleDriveId 
    } = await req.json();

    // Validate required fields
    if (!classId || !recordedDate) {
      return new Response(
        JSON.stringify({ error: 'classId and recordedDate are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Insert recording metadata
    const { data: recording, error: recordingError } = await supabaseClient
      .from('class_recordings')
      .insert({
        class_id: classId,
        recorded_date: recordedDate,
        recording_url: recordingUrl,
        storage_path: storagePath,
        duration_minutes: durationMinutes,
        file_size_mb: fileSizeMb,
        google_drive_id: googleDriveId,
        status: recordingUrl ? 'ready' : 'processing'
      })
      .select()
      .single();

    if (recordingError) {
      console.error('Error inserting recording:', recordingError);
      return new Response(
        JSON.stringify({ error: recordingError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get class members to notify
    const { data: members } = await supabaseClient
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)
      .eq('role', 'student');

    // Create notifications for students
    if (members && members.length > 0) {
      const notifications = members.map(member => ({
        user_id: member.user_id,
        type: 'recording_available',
        title: '🎥 Nova Gravação Disponível',
        message: `Uma nova gravação da aula está disponível para assistir.`,
        metadata: {
          class_id: classId,
          recording_id: recording.id,
          recorded_date: recordedDate
        }
      }));

      await supabaseClient
        .from('notifications')
        .insert(notifications);

      console.log(`Created ${notifications.length} notifications for new recording`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        recording,
        notificationsSent: members?.length || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in record-class function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
