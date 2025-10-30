import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { useAuth } from '@/shared/hooks/useAuth';
import { toast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';
import CreateEventModal from './components/CreateEventModal';
import EventDetailsModal from './components/EventDetailsModal';
import CalendarFilters from './components/CalendarFilters';

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
  const [filters, setFilters] = useState({
    types: [],
    classes: [],
    modality: 'all'
  });

  useEffect(() => {
    if (user?.id) {
      loadEvents();
    }
  }, [user, currentDate]);

  useEffect(() => {
    applyFilters();
  }, [events, filters]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          event_classes(class:classes(id, name)),
          event_participants(user:profiles(id, full_name))
        `)
        .eq('created_by', user.id)
        .gte('start_time', monthStart.toISOString())
        .lte('start_time', monthEnd.toISOString())
        .order('start_time');

      if (error) throw error;

      setEvents(data || []);
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
  };

  const applyFilters = () => {
    let filtered = [...events];

    if (filters.types.length > 0) {
      filtered = filtered.filter(e => filters.types.includes(e.event_type));
    }

    if (filters.classes.length > 0) {
      filtered = filtered.filter(e => 
        e.event_classes?.some(ec => filters.classes.includes(ec.class.id))
      );
    }

    if (filters.modality !== 'all') {
      filtered = filtered.filter(e => e.modality === filters.modality);
    }

    setFilteredEvents(filtered);
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleDayClick = (day) => {
    setSelectedDate(day);
    setShowCreateModal(true);
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

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendário Principal */}
        <div className="lg:col-span-3">
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
              {calendarDays.map((day, idx) => {
                const dayEvents = getDayEvents(day);
                const isCurrentDay = isToday(day);
                const isSameMonthDay = isSameMonth(day, currentDate);

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.01 }}
                    onClick={() => handleDayClick(day)}
                    className={`
                      min-h-[100px] p-2 border rounded-lg cursor-pointer transition-all
                      ${isCurrentDay ? 'border-2 border-blue-600 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-700'}
                      ${!isSameMonthDay && 'opacity-40'}
                      hover:bg-slate-50 dark:hover:bg-slate-800
                    `}
                  >
                    <div className={`text-sm font-medium mb-1 ${isCurrentDay ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}>
                      {format(day, 'd')}
                    </div>

                    {/* Eventos do Dia */}
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                          className={`
                            text-xs px-2 py-1 rounded truncate
                            ${event.event_type === 'class' && 'bg-blue-100 text-blue-700'}
                            ${event.event_type === 'exam' && 'bg-red-100 text-red-700'}
                            ${event.event_type === 'meeting' && 'bg-purple-100 text-purple-700'}
                            ${event.event_type === 'personal' && 'bg-gray-100 text-gray-700'}
                            hover:opacity-80
                          `}
                        >
                          {format(new Date(event.start_time), 'HH:mm')} {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-slate-500 px-2">
                          +{dayEvents.length - 3} mais
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <CalendarFilters
            filters={filters}
            setFilters={setFilters}
            teacherId={user?.id}
          />
        </div>
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
