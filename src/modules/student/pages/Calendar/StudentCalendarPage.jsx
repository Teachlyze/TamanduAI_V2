import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  BookOpen,
  Video,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const EVENT_COLORS = {
  aula: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500' },
  prova: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', border: 'border-red-500' },
  reunião: { bg: 'bg-cyan-100 dark:bg-cyan-900/40', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-500' },
  prazo: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-500' },
  feriado: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', border: 'border-green-500' },
  evento: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-500' }
};

const StudentCalendarPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadEvents();
    }
  }, [user, currentMonth]);

  const loadEvents = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Buscar turmas do aluno
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('role', 'student');

      const classIds = memberships?.map(m => m.class_id) || [];

      if (classIds.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      // 1. Buscar eventos do calendário
      // 1a. Eventos da turma
      const { data: classCalendarEvents } = await supabase
        .from('calendar_events')
        .select(`
          id,
          title,
          description,
          start_time,
          end_time,
          type,
          modality,
          location,
          meeting_link,
          class_id,
          class:classes(id, name, subject)
        `)
        .in('class_id', classIds)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString());

      // 1b. Eventos onde o aluno é participante (attendees)
      const { data: attendeeEvents } = await supabase
        .from('calendar_events')
        .select(`
          id,
          title,
          description,
          start_time,
          end_time,
          type,
          modality,
          location,
          meeting_link,
          attendees,
          created_by,
          class_id,
          class:classes(id, name, subject)
        `)
        .contains('attendees', [user.id])
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString());

      // Combinar eventos (remover duplicatas)
      const eventIds = new Set();
      const calendarEvents = [
        ...(classCalendarEvents || []),
        ...(attendeeEvents || [])
      ].filter(event => {
        if (eventIds.has(event.id)) return false;
        eventIds.add(event.id);
        return true;
      });

      logger.debug('[StudentCalendar] Eventos carregados:', {
        classEvents: classCalendarEvents?.length || 0,
        attendeeEvents: attendeeEvents?.length || 0,
        total: calendarEvents.length
      });

      // 2. Buscar reuniões
      const { data: meetings } = await supabase
        .from('meetings')
        .select(`
          id,
          title,
          description,
          start_time,
          end_time,
          meeting_url,
          class_id,
          class:classes(id, name, subject)
        `)
        .in('class_id', classIds)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString());

      // 3. Buscar prazos de atividades não entregues
      const { data: activities } = await supabase
        .from('activity_class_assignments')
        .select(`
          activity:activities(
            id,
            title,
            description,
            due_date,
            max_score
          ),
          class:classes(id, name, subject)
        `)
        .in('class_id', classIds);

      // Filtrar apenas atividades com prazo no mês atual e ainda não entregues
      const activityIds = activities?.map(a => a.activity?.id).filter(Boolean) || [];
      
      const { data: submissions } = await supabase
        .from('submissions')
        .select('activity_id')
        .eq('student_id', user.id)
        .in('activity_id', activityIds);

      const submittedIds = new Set(submissions?.map(s => s.activity_id) || []);

      const deadlineEvents = (activities || [])
        .filter(a => 
          a.activity?.due_date &&
          new Date(a.activity.due_date) >= start &&
          new Date(a.activity.due_date) <= end &&
          !submittedIds.has(a.activity.id)
        )
        .map(a => ({
          id: `deadline-${a.activity.id}`,
          title: `Prazo: ${a.activity.title}`,
          description: a.activity.description,
          start: new Date(a.activity.due_date),
          end: new Date(a.activity.due_date),
          type: 'prazo',
          className: a.class?.name,
          activityId: a.activity.id,
          maxScore: a.activity.max_score
        }));

      // 4. Buscar horários recorrentes das turmas
      const { data: classesData } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          subject,
          settings:class_settings(schedule)
        `)
        .in('id', classIds);

      // Converter horários recorrentes em eventos do calendário
      const scheduleEvents = [];
      const daysMap = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6
      };

      classesData?.forEach(classItem => {
        const schedules = classItem.settings?.schedule || [];
        
        schedules.forEach((schedule, scheduleIndex) => {
          const targetDay = daysMap[schedule.day];
          
          // Encontrar todas as ocorrências desse dia no mês
          const daysInMonth = eachDayOfInterval({ start, end });
          daysInMonth.forEach(day => {
            if (day.getDay() === targetDay) {
              const [startHour, startMinute] = schedule.start_time.split(':');
              const [endHour, endMinute] = schedule.end_time.split(':');
              
              const eventStart = new Date(day);
              eventStart.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
              
              const eventEnd = new Date(day);
              eventEnd.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
              
              scheduleEvents.push({
                id: `schedule-${classItem.id}-${scheduleIndex}-${day.toISOString()}`,
                title: classItem.name,
                description: schedule.location || classItem.subject,
                start: eventStart,
                end: eventEnd,
                type: 'aula',
                className: classItem.name,
                modality: schedule.modality,
                location: schedule.location,
                recurring: true
              });
            }
          });
        });
      });

      // Normalizar todos os eventos
      const allEvents = [
        ...(calendarEvents || []).map(e => ({
          id: `event-${e.id}`,
          title: e.title,
          description: e.description,
          start: new Date(e.start_time),
          end: new Date(e.end_time),
          type: e.type || 'evento',
          className: e.class?.name
        })),
        ...(meetings || []).map(m => ({
          id: `meeting-${m.id}`,
          title: m.title,
          description: m.description,
          start: new Date(m.start_time),
          end: new Date(m.end_time),
          type: 'reunião',
          className: m.class?.name,
          meetingUrl: m.meeting_url
        })),
        ...scheduleEvents,
        ...deadlineEvents
      ];

      setEvents(allEvents);
    } catch (error) {
      logger.error('Erro ao carregar eventos:', error)
    } finally {
      setLoading(false);
    }
  };

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getEventsForDay = (day) => {
    return events.filter(event => isSameDay(event.start, day));
  };

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const handleToday = () => setCurrentMonth(new Date());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <h1 className="text-3xl font-bold mb-2">Minha Agenda</h1>
          <p className="text-cyan-100">Acompanhe suas aulas, eventos e prazos</p>
        </motion.div>
      </div>

      {/* Navegação do Calendário */}
      <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <Button size="sm" variant="outline" onClick={handleToday}>
              Hoje
            </Button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handlePrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Grid do Calendário */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-slate-600 dark:text-slate-400 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isDayToday = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[100px] p-2 rounded-lg border transition-colors ${
                  isDayToday
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-800'
                } ${
                  isCurrentMonth 
                    ? 'bg-white dark:bg-slate-900' 
                    : 'bg-slate-50 dark:bg-slate-900/50 opacity-50'
                }`}
              >
                <div className={`text-sm font-semibold mb-1 ${
                  isDayToday 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-slate-900 dark:text-white'
                }`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map(event => {
                    const colors = EVENT_COLORS[event.type] || EVENT_COLORS.evento;
                    return (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`w-full text-left text-xs px-2 py-1 rounded ${colors.bg} ${colors.text} hover:opacity-80 transition-opacity truncate`}
                      >
                        {event.title}
                      </button>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 pl-2">
                      +{dayEvents.length - 2} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Legenda */}
      <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap gap-4">
          {Object.entries(EVENT_COLORS).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${colors.bg} ${colors.border} border-2`} />
              <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{type}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Modal de Detalhes do Evento */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="p-6 max-w-lg w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800">
              <div className="flex items-start justify-between mb-4">
                <Badge className={`${EVENT_COLORS[selectedEvent.type]?.bg} ${EVENT_COLORS[selectedEvent.type]?.text}`}>
                  {selectedEvent.type}
                </Badge>
                <button onClick={() => setSelectedEvent(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {selectedEvent.title}
              </h3>

              {selectedEvent.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  {selectedEvent.description}
                </p>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Clock className="w-4 h-4" />
                  {format(selectedEvent.start, "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </div>
                {selectedEvent.className && (
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <BookOpen className="w-4 h-4" />
                    {selectedEvent.className}
                  </div>
                )}
                {selectedEvent.meetingUrl && (
                  <a
                    href={selectedEvent.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    <Video className="w-4 h-4" />
                    Acessar reunião
                  </a>
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default StudentCalendarPage;
