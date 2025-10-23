// src/services/meetingsService.js
import { supabase } from '@/lib/supabaseClient';
import CalendarService from '@/services/calendarService';

/**
 * MeetingsService centralizes meeting lifecycle and participants management.
 * Tables expected: meetings, meeting_participants
 * Status: scheduled | live | ended | canceled
 */
const MeetingsService = {
  // Create a meeting (scheduled) and optionally seed calendar_events
  async createMeeting({
    title,
    description = null,
    class_id = null,
    start_time = null,
    end_time = null,
    channel = null, // Agora channel name (optional)
    seedCalendar = true,
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error('Not authenticated');

    const payload = {
      title,
      description,
      class_id,
      start_time: start_time instanceof Date ? start_time.toISOString() : start_time,
      end_time: end_time instanceof Date ? end_time.toISOString() : end_time,
      status: 'scheduled',
      channel,
      created_by: user.id,
    };

    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;

    // Optionally seed calendar
    if (seedCalendar && meeting?.start_time && meeting?.end_time) {
      try {
        await CalendarService.createEvent({
          class_id: meeting.class_id,
          title: meeting.title || 'Meeting',
          description: meeting.description,
          start_time: meeting.start_time,
          end_time: meeting.end_time,
          type: 'meeting',
          color: '#3b82f6',
          meeting_id: meeting.id,
        });
      } catch (e) {
        console.warn('Failed to seed calendar for meeting', e);
      }
    }

    return meeting;
  },

  // Transition meeting to LIVE (teacher/owner)
  async startMeeting(meeting_id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error('Not authenticated');

    // Only creator can start (RLS should enforce too)
    const { data: meeting } = await supabase
      .from('meetings')
      .select('id, created_by, status')
      .eq('id', meeting_id)
      .single();
    if (!meeting) throw new Error('Meeting not found');

    if (meeting.created_by !== user.id) throw new Error('Not allowed to start this meeting');

    const { data, error } = await supabase
      .from('meetings')
      .update({ status: 'live', started_at: new Date().toISOString() })
      .eq('id', meeting_id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  // Transition meeting to ENDED
  async endMeeting(meeting_id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error('Not authenticated');

    const { data: meeting } = await supabase
      .from('meetings')
      .select('id, created_by, status')
      .eq('id', meeting_id)
      .single();
    if (!meeting) throw new Error('Meeting not found');

    if (meeting.created_by !== user.id) throw new Error('Not allowed to end this meeting');

    const { data, error } = await supabase
      .from('meetings')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', meeting_id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  // Transition meeting to CANCELED
  async cancelMeeting(meeting_id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error('Not authenticated');

    const { data: meeting } = await supabase
      .from('meetings')
      .select('id, created_by, status')
      .eq('id', meeting_id)
      .single();
    if (!meeting) throw new Error('Meeting not found');

    if (meeting.created_by !== user.id) throw new Error('Not allowed to cancel this meeting');

    const { data, error } = await supabase
      .from('meetings')
      .update({ status: 'canceled', canceled_at: new Date().toISOString() })
      .eq('id', meeting_id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  // Join a meeting (participant row)
  async joinMeeting(meeting_id, role = 'participant') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error('Not authenticated');

    // Upsert participant
    const { data, error } = await supabase
      .from('meeting_participants')
      .upsert({
        meeting_id,
        user_id: user.id,
        role,
        joined_at: new Date().toISOString(),
        left_at: null,
      }, { onConflict: 'meeting_id,user_id' })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  // Leave a meeting
  async leaveMeeting(meeting_id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('meeting_participants')
      .update({ left_at: new Date().toISOString() })
      .eq('meeting_id', meeting_id)
      .eq('user_id', user.id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  // List participants for a meeting
  async listParticipants(meeting_id) {
    const { data, error } = await supabase
      .from('meeting_participants')
      .select('id, user_id, status, role, joined_at, left_at, profiles:profiles(full_name, email, avatar_url)')
      .eq('meeting_id', meeting_id);
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      role: row.role,
      status: row.status || 'pending',
      joined_at: row.joined_at,
      left_at: row.left_at,
      name: row.profiles?.full_name || 'Usuário',
      email: row.profiles?.email || '',
      avatar_url: row.profiles?.avatar_url || null,
    }));
  },

  // Fetch meeting by id (basic details; participants fetched separately if needed)
  async getMeetingById(id) {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Fetch participants (alias to listParticipants)
  async getMeetingParticipants(meetingId) {
    return this.listParticipants(meetingId);
  },

  // Update meeting
  async updateMeeting(id, updates) {
    const { data, error } = await supabase
      .from('meetings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  // Delete meeting
  async deleteMeeting(id) {
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // Update participant status
  async updateParticipantStatus(meeting_id, participant_id, status) {
    const { data, error } = await supabase
      .from('meeting_participants')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', participant_id)
      .eq('meeting_id', meeting_id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  // Subscribe to meeting updates
  subscribeToMeetingUpdates(meeting_id, callback) {
    try {
      const channel = supabase
        .channel(`meetings-updates-${meeting_id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'meetings', filter: `id=eq.${meeting_id}` },
          (payload) => callback?.(payload)
        )
        .subscribe();

      return {
        unsubscribe: () => {
          try { supabase.removeChannel(channel); } catch (e) { /* noop */ }
        },
      };
    } catch (e) {
      console.warn('subscribeToMeetingUpdates failed', e);
      return { unsubscribe: () => {} };
    }
  },
};

export default MeetingsService;
export const MeetingService = MeetingsService;
