import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { useAuth } from '@/shared/hooks/useAuth';
import { toast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';
import { redisCache } from '@/shared/services/redisCache';
import CreateEventModal from './components/CreateEventModal';
import EventDetailsModal from './components/EventDetailsModal';
import CalendarFilters from './components/CalendarFilters';

// Componente CalendarDay memoizado para performance
const CalendarDay = React.memo(({ day, dayEvents, isCurrentDay, isSameMonthDay, onClick, onEventClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`
        min-h-[120px] p-3 border rounded-xl cursor-pointer transition-all hover:shadow-lg group relative
        ${isCurrentDay ? 'border-2 border-blue-600 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}
        ${!isSameMonthDay && 'opacity-40'}
        hover:bg-gradient-to-br hover:from-slate-50 hover:to-blue-50 dark:hover:from-slate-800 dark:hover:to-blue-950/30
      `}
    >
      <div className={`
        text-sm font-bold mb-2 flex items-center justify-between
        ${isCurrentDay ? 'text-blue-600' : 'text-slate-900 dark:text-white'}
      `}>
        <span>{format(day, 'd')}</span>
        {dayEvents.length > 0 && (
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
            {dayEvents.length}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {dayEvents.slice(0, 2).map((event) => (
          <div
            key={event.id}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick(event);
            }}
            className={`
              text-xs px-2 py-1.5 rounded-lg truncate font-medium shadow-sm transition-all
              ${event.event_type === 'class' && 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-900 dark:to-blue-800 dark:text-blue-200 hover:shadow-md'}
              ${event.event_type === 'exam' && 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 dark:from-red-900 dark:to-red-800 dark:text-red-200 hover:shadow-md'}
              ${event.event_type === 'meeting' && 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 dark:from-purple-900 dark:to-purple-800 dark:text-purple-200 hover:shadow-md'}
              ${event.event_type === 'other' && 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-900 dark:to-gray-800 dark:text-gray-200 hover:shadow-md'}
              hover:scale-105
            `}
          >
            <div className="flex items-center gap-1">
              <span className="font-semibold">{format(new Date(event.start_time), 'HH:mm')}</span>
              <span className="truncate">{event.title}</span>
            </div>
          </div>
        ))}
        {dayEvents.length > 2 && (
          <div className="text-xs text-blue-600 dark:text-blue-400 px-2 py-1 bg-blue-50 dark:bg-blue-950/30 rounded-lg font-medium">
            +{dayEvents.length - 2} evento{dayEvents.length - 2 > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </motion.div>
  );
});

CalendarDay.displayName = 'CalendarDay';

const TeacherCalendarPage = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [showDaySidebar, setShowDaySidebar] = useState(false);
  const [filters, setFilters] = useState({
    types: [],
    classes: [],
    modality: 'all'
  });

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      // Usar cache Redis para eventos do mês
      const cacheKey = redisCache.generateKey('calendar', user.id, format(currentDate, 'yyyy-MM'));
      
      const cachedEvents = await redisCache.cacheQuery(
        cacheKey,
        async () => {
          const { data, error } = await supabase
            .from('calendar_events')
            .select(`
              *,
              class:classes(id, name)
            `)
            .eq('created_by', user.id)
            .gte('start_time', monthStart.toISOString())
            .lte('start_time', monthEnd.toISOString())
            .order('start_time');

          if (error) throw error;
          return data || [];
        },
        300 // 5 minutos de cache
      );

      setEvents(cachedEvents);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      toast({
        title: 'Erro ao carregar eventos',
        description: 'Não foi possível carregar seus eventos.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [currentDate, user?.id]);

  const applyFilters = useCallback(() => {
    let filtered = [...events];

    if (filters.types.length > 0) {
      filtered = filtered.filter(e => filters.types.includes(e.event_type));
    }

    if (filters.classes.length > 0) {
      filtered = filtered.filter(e => 
        e.class_id && filters.classes.includes(e.class_id)
      );
    }

    if (filters.modality !== 'all') {
      filtered = filtered.filter(e => e.modality === filters.modality);
    }

    setFilteredEvents(filtered);
  }, [events, filters]);

  // useEffects após definições das funções
  useEffect(() => {
    if (user?.id) {
      loadEvents();
    }
  }, [user?.id, loadEvents]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handlePrevMonth = useCallback(() => {
    setCurrentDate(prev => subMonths(prev, 1));
    setShowDaySidebar(false); // Fechar sidebar ao mudar mês
  }, []);
  
  const handleNextMonth = useCallback(() => {
    setCurrentDate(prev => addMonths(prev, 1));
    setShowDaySidebar(false);
  }, []);
  
  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
    setShowDaySidebar(false);
  }, []);

  const handleDayClick = (day) => {
    setSelectedDate(day);
    const dayEvents = getDayEvents(day);
    setSelectedDayEvents(dayEvents);
    setShowDaySidebar(true);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowDetailsModal(true);
  };

  const getDayEvents = (day) => {
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.start_time);
      return format(eventDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
    });
  };

  // Memoizar cálculos pesados
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentDate]);

  const weekDays = useMemo(() => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'], []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold mb-2">Minha Agenda</h1>
            <p className="text-cyan-100">Gerencie aulas, reuniões e eventos</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleToday}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
            >
              Hoje
            </Button>
            <Button
              onClick={() => {
                setSelectedDate(new Date());
                setShowCreateModal(true);
              }}
              className="bg-white text-blue-600 hover:bg-white/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Evento
            </Button>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendário Principal */}
        <div className={showDaySidebar ? 'lg:col-span-8 transition-all duration-300' : 'lg:col-span-9 transition-all duration-300'}>
          <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {/* Navegação do Mês */}
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevMonth}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </h2>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Grid do Calendário */}
            <div className="grid grid-cols-7 gap-2">
              {/* Dias da Semana */}
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-slate-600 dark:text-slate-400 py-2"
                >
                  {day}
                </div>
              ))}

              {/* Dias do Mês */}
              <AnimatePresence>
                {calendarDays.map((day, idx) => {
                  const dayEvents = getDayEvents(day);
                  const isCurrentDay = isToday(day);
                  const isSameMonthDay = isSameMonth(day, currentDate);

                  return (
                    <CalendarDay
                      key={`${format(day, 'yyyy-MM-dd')}-${idx}`}
                      day={day}
                      dayEvents={dayEvents}
                      isCurrentDay={isCurrentDay}
                      isSameMonthDay={isSameMonthDay}
                      onClick={() => handleDayClick(day)}
                      onEventClick={handleEventClick}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          </Card>
        </div>

        {/* Filtros Sidebar */}
        {!showDaySidebar && (
          <div className="lg:col-span-3 space-y-4">
            <CalendarFilters
              filters={filters}
              setFilters={setFilters}
              teacherId={user?.id}
            />
          </div>
        )}

        {/* Day Events Sidebar */}
        {showDaySidebar && selectedDate && (
          <div className="lg:col-span-4">
            <Card className="p-6 bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-800 sticky top-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                    {format(selectedDate, 'EEEE', { locale: ptBR })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDaySidebar(false)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  ✕
                </Button>
              </div>

              {/* Botão Criar Evento */}
              <Button
                onClick={() => setShowCreateModal(true)}
                className="w-full mb-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Evento
              </Button>

              {/* Lista de Eventos */}
              <div className="space-y-3 max-h-[calc(100vh-24rem)] overflow-y-auto">
                {selectedDayEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Nenhum evento neste dia
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Clique em "Novo Evento" para adicionar
                    </p>
                  </div>
                ) : (
                  selectedDayEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => handleEventClick(event)}
                      className={`
                        p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md group
                        ${event.event_type === 'class' ? 'border-blue-300 bg-blue-50 dark:bg-blue-950/30' : ''}
                        ${event.event_type === 'exam' ? 'border-red-300 bg-red-50 dark:bg-red-950/30' : ''}
                        ${event.event_type === 'meeting' ? 'border-purple-300 bg-purple-50 dark:bg-purple-950/30' : ''}
                        ${!['class', 'exam', 'meeting'].includes(event.event_type) ? 'border-gray-300 bg-gray-50 dark:bg-gray-950/30' : ''}
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`
                              text-xs font-semibold px-2 py-1 rounded-full
                              ${event.event_type === 'class' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}
                              ${event.event_type === 'exam' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : ''}
                              ${event.event_type === 'meeting' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' : ''}
                              ${!['class', 'exam', 'meeting'].includes(event.event_type) ? 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300' : ''}
                            `}>
                              {event.event_type === 'class' ? '📚 Aula' :
                               event.event_type === 'exam' ? '📝 Prova' :
                               event.event_type === 'meeting' ? '👥 Reunião' : '📅 Evento'}
                            </span>
                          </div>
                          <h4 className="font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600">
                            {event.title}
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                            {format(new Date(event.start_time), 'HH:mm')} - {format(new Date(event.end_time), 'HH:mm')}
                          </p>
                          {event.class?.name && (
                            <p className="text-xs text-slate-500 dark:text-slate-500">
                              🎓 {event.class.name}
                            </p>
                          )}
                          {event.location && (
                            <p className="text-xs text-slate-500 dark:text-slate-500">
                              📍 {event.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateEventModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedDate(null);
          }}
          onSuccess={loadEvents}
          selectedDate={selectedDate}
          teacherId={user?.id}
        />
      )}

      {showDetailsModal && selectedEvent && (
        <EventDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedEvent(null);
          }}
          event={selectedEvent}
          onEdit={() => {
            setShowDetailsModal(false);
            setShowCreateModal(true);
          }}
          onDelete={loadEvents}
        />
      )}
    </div>
  );
};

export default TeacherCalendarPage;
