import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/services/supabaseClient';
import { EventCard, EmptyState } from '@/modules/student/components/redesigned';
import { Calendar, ChevronLeft, ChevronRight, Video, MapPin, FileText, Clock } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths, isToday, startOfDay, endOfDay, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const StudentCalendarPageRedesigned = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadEvents();
    }
  }, [user, currentMonth]);

  useEffect(() => {
    filterEventsByDate(selectedDate);
  }, [selectedDate, events]);

  const loadEvents = async () => {
    try {
      setLoading(true);

      // Buscar turmas do aluno
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('role', 'student');

      const classIds = memberships?.map(m => m.class_id) || [];

      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      // Buscar eventos da turma
      const { data: classEvents } = await supabase
        .from('calendar_events')
        .select('id, title, description, start_time, end_time, type, modality, location, meeting_link, class_id, activity_id')
        .in('class_id', classIds)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });

      // Buscar eventos onde é participante (reuniões)
      logger.debug('[Calendar] Buscando eventos como participante:', { userId: user.id });

      const { data: attendeeEvents, error: attendeeError } = await supabase
        .from('calendar_events')
        .select('id, title, description, start_time, end_time, type, modality, location, meeting_link, attendees, class_id, created_by, activity_id')
        .contains('attendees', [user.id])
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });

      if (attendeeError) {
        logger.error('[Calendar] Erro ao buscar eventos como participante:', attendeeError);
      } else {
        logger.debug('[Calendar] Eventos encontrados como participante:', { 
          count: attendeeEvents?.length || 0,
          events: attendeeEvents 
        });
      }

      // Buscar prazos de atividades
      const { data: assignments } = await supabase
        .from('activity_class_assignments')
        .select('activity_id, class_id')
        .in('class_id', classIds);

      const activityIds = assignments?.map(a => a.activity_id) || [];

      const { data: activities } = await supabase
        .from('activities')
        .select('id, title, due_date')
        .in('id', activityIds)
        .gte('due_date', start.toISOString())
        .lte('due_date', end.toISOString());

      // Buscar nomes das classes
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', classIds);

      const classesMap = {};
      classes?.forEach(c => { classesMap[c.id] = c; });

      // Combinar eventos
      const eventIds = new Set();
      const allEvents = [
        ...(classEvents || []).map(e => ({
          ...e,
          class_name: classesMap[e.class_id]?.name,
          event_type: 'class_event'
        })),
        ...(attendeeEvents || []).map(e => ({
          ...e,
          class_name: classesMap[e.class_id]?.name,
          event_type: 'meeting'
        }))
      ].filter(event => {
        if (eventIds.has(event.id)) return false;
        eventIds.add(event.id);
        return true;
      });

      // Adicionar prazos de atividades
      const activityEvents = (activities || []).map(a => {
        const assignment = assignments.find(as => as.activity_id === a.id);
        return {
          id: `activity-${a.id}`,
          title: a.title,
          start_time: a.due_date,
          end_time: a.due_date,
          type: 'deadline',
          class_name: classesMap[assignment?.class_id]?.name,
          event_type: 'activity_deadline',
          activity_id: a.id
        };
      });

      setEvents([...allEvents, ...activityEvents]);
    } catch (error) {
      logger.error('Erro ao carregar eventos:', error);
    } finally {
      setLoading(false);
      if (initialLoad) {
        setInitialLoad(false);
      }
    }
  };

  const filterEventsByDate = (date) => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const dayEvents = events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= dayStart && eventDate <= dayEnd;
    });

    setSelectedDayEvents(dayEvents);
  };

  const getEventsForDay = (day) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);

    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= dayStart && eventDate <= dayEnd;
    });
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  // Gerar dias do calendário
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getEventTypeLabel = (event) => {
    if (!event) return 'Evento';
    if (event.activity_id || event.type === 'activity') return 'Atividade';
    if (event.event_type === 'activity_deadline' || event.type === 'deadline') return 'Prazo de atividade';
    if (event.event_type === 'meeting' || event.type === 'meeting') return 'Reunião';
    if (event.event_type === 'class_event') return 'Evento da turma';
    return 'Evento';
  };

  if (loading && initialLoad) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 md:mb-8"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2 sm:gap-3">
          <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
          Minha Agenda
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
          Eventos, reuniões e prazos de atividades
        </p>
      </motion.div>

      {/* Controles do Calendário */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <Button onClick={handlePrevMonth} variant="outline" size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white text-center capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <Button onClick={handleNextMonth} variant="outline" size="sm">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button onClick={handleToday} variant="default" size="sm" className="w-full sm:w-auto">
          Hoje
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Calendário (2/3) */}
        <Card className="p-3 sm:p-4 md:p-6 lg:col-span-2">
          {/* Dias da Semana */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-4">
            {weekDays.map(day => (
              <div key={day} className="text-center font-bold text-slate-600 dark:text-slate-400 text-[10px] sm:text-xs md:text-sm py-1 sm:py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Dias do Mês */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {days.map(day => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);
              const isPastDay = isPast(day) && !isCurrentDay;

              return (
                <motion.button
                  key={day.toString()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    w-full h-14 sm:h-20 md:h-24 p-2 sm:p-3 rounded-lg border sm:border-2 transition-all flex flex-col items-center justify-center
                    ${isCurrentMonth ? 'bg-white dark:bg-slate-800' : 'bg-slate-100 dark:bg-slate-900'}
                    ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-transparent'}
                    ${isCurrentDay ? 'ring-1 sm:ring-2 ring-blue-500' : ''}
                    ${isPastDay ? 'opacity-50' : ''}
                    hover:border-blue-300 dark:hover:border-blue-700
                  `}
                >
                  <div className={`
                    text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1
                    ${isSelected ? 'text-blue-600' : 'text-slate-900 dark:text-white'}
                    ${!isCurrentMonth ? 'text-slate-400' : ''}
                  `}>
                    {format(day, 'd')}
                  </div>

                  {dayEvents.length > 0 && (
                    <div className="hidden sm:flex flex-wrap gap-0.5 justify-center">
                      {dayEvents.slice(0, 3).map((event, idx) => (
                        <div
                          key={idx}
                          className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${
                            event.type === 'deadline' ? 'bg-red-500' :
                            event.type === 'meeting' ? 'bg-purple-500' :
                            'bg-blue-500'
                          }`}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-slate-500">
                          +{dayEvents.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500"></div>
              <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Eventos</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-purple-500"></div>
              <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Reuniões</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500"></div>
              <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Prazos</span>
            </div>
          </div>
        </Card>

        {/* Eventos do Dia (1/3) */}
        <Card className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            {isToday(selectedDate) ? 'Hoje' : format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
          </h2>

          {selectedDayEvents.length > 0 ? (
            <div className="space-y-3">
              {selectedDayEvents.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => handleEventClick(event)}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="Nenhum evento"
              description="Nenhum evento agendado para este dia."
              variant="info"
            />
          )}
        </Card>
      </div>

      {/* Lista Completa de Eventos do Mês */}
      <Card className="p-4 sm:p-6 mt-4 sm:mt-6">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-4 sm:mb-6 capitalize">
          📅 Eventos de {format(currentMonth, 'MMMM', { locale: ptBR })}
        </h2>

        {events.length > 0 ? (
          <div className="space-y-4">
            {events
              .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
              .map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => handleEventClick(event)}
                  index={index}
                />
              ))}
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            title="Nenhum evento este mês"
            description="Não há eventos, reuniões ou prazos agendados para este mês."
          />
        )}
      </Card>
      {selectedEvent && (
        <div
          className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'
          onClick={() => setSelectedEvent(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card className='p-6 sm:p-8 max-w-xl sm:max-w-2xl w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-2xl'>
              <div className='flex flex-col gap-6'>
                <div className='flex items-start justify-between gap-4'>
                  <div className='space-y-2'>
                    <Badge>
                      {getEventTypeLabel(selectedEvent)}
                    </Badge>
                    <h3 className='text-xl sm:text-2xl font-bold text-slate-900 dark:text-white'>
                      {selectedEvent.title}
                    </h3>
                    <p className='text-xs sm:text-sm text-slate-500 dark:text-slate-400'>
                      {format(new Date(selectedEvent.start_time), `EEEE, d 'de' MMMM 'às' HH:mm`, { locale: ptBR })}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className='text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  >
                    Fechar
                  </button>
                </div>

                {selectedEvent.description && (
                  <p className='text-sm sm:text-base text-slate-600 dark:text-slate-300'>
                    {selectedEvent.description}
                  </p>
                )}

                <div className='grid gap-4 sm:grid-cols-2 text-sm sm:text-base'>
                  <div className='space-y-2'>
                    <div className='flex items-center gap-2 text-slate-700 dark:text-slate-300'>
                      <Clock className='w-4 h-4' />
                      {format(new Date(selectedEvent.start_time), `d 'de' MMMM 'às' HH:mm`, { locale: ptBR })}
                    </div>
                    {selectedEvent.class_name && (
                      <div className='flex items-center gap-2 text-slate-700 dark:text-slate-300'>
                        <FileText className='w-4 h-4' />
                        {selectedEvent.class_name}
                      </div>
                    )}
                    {selectedEvent.location && (
                      <div className='flex items-center gap-2 text-slate-700 dark:text-slate-300'>
                        <MapPin className='w-4 h-4' />
                        {selectedEvent.location}
                      </div>
                    )}
                  </div>

                  <div className='space-y-2'>
                    {selectedEvent.meeting_link && (
                      <a
                        href={selectedEvent.meeting_link}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base'
                      >
                        <Video className='w-4 h-4' />
                        Entrar na reunião
                      </a>
                    )}
                  </div>
                </div>

                <div className='mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 justify-end'>
                  {selectedEvent.activity_id && (
                    <Button
                      onClick={() => {
                        setSelectedEvent(null);
                        navigate(`/students/activities/${selectedEvent.activity_id}`);
                      }}
                      className='bg-emerald-600 hover:bg-emerald-700 text-white'
                    >
                      <FileText className='w-4 h-4 mr-2' />
                      Ir para atividade
                    </Button>
                  )}
                  {selectedEvent.meeting_link && !selectedEvent.activity_id && (
                    <a
                      href={selectedEvent.meeting_link}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm sm:text-base hover:bg-slate-50 dark:hover:bg-slate-800'
                    >
                      <Video className='w-4 h-4' />
                      Abrir reunião
                    </a>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default StudentCalendarPageRedesigned;
