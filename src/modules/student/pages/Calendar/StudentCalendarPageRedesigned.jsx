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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allEvents, setAllEvents] = useState([]); // Todos os eventos (sem filtro)
  const [events, setEvents] = useState([]); // Eventos filtrados por mês
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user?.id) {
      loadEvents();
    }
  }, [user]);

  useEffect(() => {
    // Filtrar eventos por mês sem recarregar
    filterEventsByMonth();
  }, [currentMonth, allEvents]);

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

      // Carregar eventos de um período maior (6 meses para trás e 6 para frente)
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 7, 0); // Último dia do 6º mês

      // Buscar eventos da turma
      const { data: classEvents } = await supabase
        .from('calendar_events')
        .select('id, title, description, start_time, end_time, type, modality, location, meeting_link, class_id')
        .in('class_id', classIds)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });

      // Buscar eventos onde é participante (reuniões)
      // NOTA: participants é UUID[], usar filter com @>
      logger.debug('[Calendar] Buscando eventos como participante:', { userId: user.id });
      
      // Buscar todos eventos e filtrar no cliente (workaround para operador)
      const { data: allAttendeeEvents, error: attendeeError } = await supabase
        .from('calendar_events')
        .select('id, title, description, start_time, end_time, type, modality, location, meeting_link, participants, class_id, created_by')
        .not('participants', 'is', null)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });
      
      // Filtrar no cliente onde user está em participants
      const attendeeEvents = allAttendeeEvents?.filter(event => 
        event.participants && Array.isArray(event.participants) && 
        event.participants.includes(user.id)
      ) || [];

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

      const combinedEvents = [...allEvents, ...activityEvents];
      
      // Salvar TODOS os eventos
      setAllEvents(combinedEvents);
      // Filtrar para o mês atual inicialmente
      setEvents(combinedEvents.filter(e => {
        const eventDate = new Date(e.start_time);
        return isSameMonth(eventDate, currentMonth);
      }));
    } catch (error) {
      logger.error('Erro ao carregar eventos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEventsByMonth = () => {
    // Filtrar eventos do mês selecionado sem fazer nova requisição
    const filtered = allEvents.filter(event => {
      const eventDate = new Date(event.start_time);
      return isSameMonth(eventDate, currentMonth);
    });
    setEvents(filtered);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
          <Calendar className="w-8 h-8 text-blue-600" />
          Minha Agenda
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Eventos, reuniões e prazos de atividades
        </p>
      </motion.div>

      {/* Controles do Calendário */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button onClick={handlePrevMonth} variant="outline" size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white min-w-[200px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <Button onClick={handleNextMonth} variant="outline" size="sm">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button onClick={handleToday} variant="default">
          Hoje
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário (2/3) */}
        <Card className="p-6 lg:col-span-2">
          {/* Dias da Semana */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {weekDays.map(day => (
              <div key={day} className="text-center font-bold text-slate-600 dark:text-slate-400 text-sm py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Dias do Mês */}
          <div className="grid grid-cols-7 gap-2">
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
                    aspect-square p-2 rounded-lg border-2 transition-all
                    ${isCurrentMonth ? 'bg-white dark:bg-slate-800' : 'bg-slate-100 dark:bg-slate-900'}
                    ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-transparent'}
                    ${isCurrentDay ? 'ring-2 ring-blue-500' : ''}
                    ${isPastDay ? 'opacity-50' : ''}
                    hover:border-blue-300 dark:hover:border-blue-700
                  `}
                >
                  <div className={`
                    text-sm font-semibold mb-1
                    ${isSelected ? 'text-blue-600' : 'text-slate-900 dark:text-white'}
                    ${!isCurrentMonth ? 'text-slate-400' : ''}
                  `}>
                    {format(day, 'd')}
                  </div>

                  {dayEvents.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 justify-center">
                      {dayEvents.slice(0, 3).map((event, idx) => (
                        <div
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${
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
          <div className="flex items-center gap-6 mt-6 pt-6 border-t">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Eventos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Reuniões</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Prazos</span>
            </div>
          </div>
        </Card>

        {/* Eventos do Dia (1/3) */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            {isToday(selectedDate) ? 'Hoje' : format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
          </h2>

          {selectedDayEvents.length > 0 ? (
            <div className="space-y-3">
              {selectedDayEvents.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => {
                    if (event.event_type === 'activity_deadline') {
                      navigate(`/students/activities/${event.activity_id}`);
                    } else {
                      navigate('/students/calendar');
                    }
                  }}
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
      <Card className="p-6 mt-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
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
                  onClick={() => {
                    if (event.event_type === 'activity_deadline') {
                      navigate(`/students/activities/${event.activity_id}`);
                    }
                  }}
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
    </div>
  );
};

export default StudentCalendarPageRedesigned;
