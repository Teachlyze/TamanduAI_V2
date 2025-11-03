import { logger } from '@/shared/utils/logger';
// src/services/calendarService.js
import { supabase } from '@/lib/supabaseClient';
import { addMinutes } from 'date-fns';

const CalendarService = {
  // List events visible to a user (creator or attendee) within a date range
  async getUserCalendar({ from, to, userId = null, userRole = null }) {
    try {
      // Se é aluno: confiar nas policies RLS (turma e/ou participants) e filtrar apenas por intervalo
      if (userId && userRole === 'student') {
        const { data: events, error } = await supabase
          .from('calendar_events')
          .select('id, class_id, title, description, start_time, end_time, activity_id, type, created_by')
          .gte('start_time', from.toISOString())
          .lte('end_time', to.toISOString())
          .order('start_time', { ascending: true });
        if (error) {
          logger.error('CalendarService.getUserCalendar error:', error)
          return [];
        }
        return events || [];
      }
      
      // Professor: filtrar por created_by quando disponível
      let query = supabase
        .from('calendar_events')
        .select('id, class_id, title, description, start_time, end_time, activity_id, type, created_by')
        .gte('start_time', from.toISOString())
        .lte('end_time', to.toISOString())
        .order('start_time', { ascending: true });

      if (userRole === 'teacher' && userId) {
        query = query.eq('created_by', userId);
      }

      const { data: events, error } = await query;

      if (error) {
        logger.error('CalendarService.getUserCalendar error:', error)
        return [];
      }
      return events || [];
    } catch (err) {
      logger.error('CalendarService.getUserCalendar exception:', err)
      return [];
    }
  },

  // Create a calendar event (unified for meetings, deadlines, exams)
  async createEvent({
    class_id,
    title,
    description = null,
    start_time,
    end_time,
    type = 'event', // allowed: event | meeting | activity | deadline
    activity_id = null
  }) {
    // Resolve authenticated user
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id || null;

    const payload = {
      class_id,
      title,
      description,
      start_time: start_time instanceof Date ? start_time.toISOString() : start_time,
      end_time: end_time instanceof Date ? end_time.toISOString() : end_time,
      type,
      activity_id,
      created_by: userId,
    };
    const { data, error } = await supabase
      .from('calendar_events')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Update a calendar event
  async updateEvent(id, updates) {
    const toIso = (val) => (val instanceof Date ? val.toISOString() : val);
    const patch = { ...updates };
    // Normalize time fields
    if (patch.start_time) patch.start_time = toIso(patch.start_time);
    if (patch.end_time) patch.end_time = toIso(patch.end_time);

    const { data, error } = await supabase
      .from('calendar_events')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Delete a calendar event
  async deleteEvent(id) {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // List events for a class within a date range
  async getClassCalendar(classId, { from, to }) {
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('id, class_id, title, description, start_time, end_time, activity_id')
      .eq('class_id', classId)
      .gte('start_time', from.toISOString())
      .lte('end_time', to.toISOString())
      .order('start_time', { ascending: true });

    if (error) throw error;
    return events || [];
  },

  // Subscribe to changes in calendar_events and event_attendees for a user
  subscribeUserCalendar(userId, cb) {
    const channel = supabase.channel(`calendar-user-${userId}`);

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, () => cb('calendar_events'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_attendees', filter: `user_id=eq.${userId}` }, () => cb('event_attendees'))
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch (e) { /* noop */ }
    };
  },

  // Subscribe to a class calendar
  subscribeClassCalendar(classId, cb) {
    const channel = supabase.channel(`calendar-class-${classId}`);

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events', filter: `class_id=eq.${classId}` }, () => cb('calendar_events'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_attendees' }, () => cb('event_attendees'))
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch (e) { /* noop */ }
    };
  },

  // Detect conflicts (overlaps) between events
  detectConflicts(events) {
    const conflicts = [];
    const sorted = [...events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (new Date(b.start_time) < new Date(a.end_time)) {
        conflicts.push([a, b]);
      }
    }
    return conflicts;
  },

  // Compute reminder suggestions based on due date, estimated_minutes and complexity
  computeReminderWindows(event) {
    // Fallbacks
    const end = new Date(event.end_time);
    const est = event.estimated_minutes || 60;
    const multiplier = event.complexity === 'high' ? 2 : event.complexity === 'medium' ? 1.2 : 1;
    const workload = Math.ceil(est * multiplier);

    const reminders = [
      { label: 'Iniciar preparo', when: addMinutes(end, -workload - 120) },
      { label: 'Lembrete 24h', when: addMinutes(end, -24 * 60) },
      { label: 'Lembrete 2h', when: addMinutes(end, -120) },
    ];
    return reminders;
  },

  // Use compact RPC to fetch events for a user between a range
  async getUserCalendarCompact({ from, to, userId }) {
    const p_from = from instanceof Date ? from.toISOString() : from;
    const p_to = to instanceof Date ? to.toISOString() : to;
    // If userId not provided, rely on RLS and the RPC membership filters
    const uid = userId || (await supabase.auth.getUser()).data?.user?.id || null;
    const { data, error } = await supabase.rpc('get_user_calendar_compact', {
      p_user: uid,
      p_from,
      p_to,
    });
    if (error) throw error;
    return data || [];
  },
};

export default CalendarService;
