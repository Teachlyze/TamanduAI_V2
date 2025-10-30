import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { DashboardHeader } from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { ClassService } from '@/shared/services/classService';

const ClassSchedulePage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    loadData();
  }, [classId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const classInfo = await ClassService.getClassById(classId);
      setClassData(classInfo);

      // Mock events
      const mockEvents = [
        {
          id: '1',
          title: 'Atividade: Cap. 1',
          type: 'activity',
          date: new Date(2025, 9, 25),
          time: '23:59'
        },
        {
          id: '2',
          title: 'Prova Mensal',
          type: 'exam',
          date: new Date(2025, 9, 30),
          time: '14:00'
        },
        {
          id: '3',
          title: 'Aula: Introdução',
          type: 'class',
          date: new Date(2025, 9, 23),
          time: '09:00'
        }
      ];

      setEvents(mockEvents);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const getEventColor = (type) => {
    const colors = {
      activity: 'bg-blue-500',
      exam: 'bg-red-500',
      class: 'bg-green-500',
      special: 'bg-blue-700'
    };
    return colors[type] || 'bg-slate-500';
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const changeMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Next 7 days events
  const upcomingEvents = events
    .filter(e => e.date >= today)
    .sort((a, b) => a.date - b.date)
    .slice(0, 7);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <Button
        variant="ghost"
        onClick={() => navigate(`/teacher/classes/${classId}`)}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <DashboardHeader
        title={`Agenda - ${classData?.name || 'Turma'}`}
        subtitle="Calendário de eventos e atividades"
        role="teacher"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card className="p-6 bg-white dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white capitalize">
                {monthName}
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>
                  ←
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
                  Hoje
                </Button>
                <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>
                  →
                </Button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="text-center text-sm font-semibold text-slate-600 dark:text-slate-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty cells before first day */}
              {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                const dayEvents = getEventsForDate(date);
                const isToday = date.toDateString() === today.toDateString();
                const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(date)}
                    className={`
                      aspect-square p-2 rounded-lg border transition-all
                      ${isToday ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-700'}
                      ${isSelected ? 'ring-2 ring-blue-500' : ''}
                      hover:bg-slate-50 dark:hover:bg-slate-800
                    `}
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                      {day}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {dayEvents.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          className={`w-1.5 h-1.5 rounded-full ${getEventColor(event.type)}`}
                          title={event.title}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-slate-600 dark:text-slate-400">Atividades</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-slate-600 dark:text-slate-400">Aulas</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-slate-600 dark:text-slate-400">Provas</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-blue-700" />
                <span className="text-slate-600 dark:text-slate-400">Especiais</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Add Event */}
          <Card className="p-6 bg-white dark:bg-slate-900">
            <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Evento
            </Button>
          </Card>

          {/* Upcoming Events */}
          <Card className="p-6 bg-white dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Próximos Eventos
            </h3>
            
            <div className="space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map(event => (
                  <div key={event.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-full rounded-full ${getEventColor(event.type)}`} />
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-slate-900 dark:text-white mb-1">
                          {event.title}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          {event.date.toLocaleDateString('pt-BR')} • {event.time}
                        </div>
                        <div className="mt-2">
                          <Badge className={`text-xs ${getEventColor(event.type)} text-white`}>
                            {event.type === 'activity' ? 'Atividade' :
                             event.type === 'exam' ? 'Prova' :
                             event.type === 'class' ? 'Aula' : 'Evento'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-4">
                  Nenhum evento próximo
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClassSchedulePage;
