import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, User, BookOpen, Video, MapPin, FileText, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { supabase } from '@/shared/services/supabaseClient';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';

const EventDetailsModal = ({ open, onClose, event }) => {
  const [loading, setLoading] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [activity, setActivity] = useState(null);
  const [classInfo, setClassInfo] = useState(null);

  useEffect(() => {
    if (open && event) {
      loadEventDetails();
    }
  }, [open, event]);

  const loadEventDetails = async () => {
    try {
      setLoading(true);

      // Carregar participantes (se for reunião)
      if (event.type === 'reunião' || event.type === 'meeting') {
        const { data: attendeesData, error: attendeesError } = await supabase
          .from('event_attendees')
          .select(`
            user_id,
            status,
            profiles:profiles!event_attendees_user_id_fkey(id, full_name, email)
          `)
          .eq('event_id', event.id);

        if (attendeesError) throw attendeesError;
        setAttendees(attendeesData || []);
      }

      // Carregar atividade linkada (se houver)
      if (event.activity_id) {
        const { data: activityData, error: activityError } = await supabase
          .from('activities')
          .select('id, title, type, description, max_score')
          .eq('id', event.activity_id)
          .single();

        if (activityError && activityError.code !== 'PGRST116') throw activityError;
        setActivity(activityData);
      }

      // Carregar informações da turma (se houver)
      if (event.class_id) {
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('id, name, subject')
          .eq('id', event.class_id)
          .single();

        if (classError && classError.code !== 'PGRST116') throw classError;
        setClassInfo(classData);
      }

    } catch (error) {
      logger.error('Erro ao carregar detalhes do evento:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!event) return null;

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventTypeColor = (type) => {
    const colors = {
      atividade: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      reunião: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      meeting: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      aula: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      prova: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      evento: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
    };
    return colors[type?.toLowerCase()] || colors.evento;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Detalhes do Evento
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Título e Tipo */}
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-xl font-bold">{event.title}</h3>
              {event.type && (
                <Badge className={getEventTypeColor(event.type)}>
                  {event.type}
                </Badge>
              )}
            </div>

            {/* Descrição */}
            {event.description && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Data</p>
                  <p className="font-semibold">{formatDate(event.start_time)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Horário</p>
                  <p className="font-semibold">
                    {formatTime(event.start_time)} - {formatTime(event.end_time)}
                  </p>
                </div>
              </div>
            </div>

            {/* Turma */}
            {classInfo && (
              <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border-l-4 border-green-500">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-green-600" />
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400">TURMA:</p>
                </div>
                <p className="font-semibold">{classInfo.name}</p>
                {classInfo.subject && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{classInfo.subject}</p>
                )}
              </div>
            )}

            {/* Atividade Linkada */}
            {activity && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">ATIVIDADE LINKADA:</p>
                </div>
                <p className="font-semibold mb-1">{activity.title}</p>
                {activity.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{activity.description}</p>
                )}
                <div className="flex gap-2">
                  <Badge variant="outline">{activity.type}</Badge>
                  {activity.max_score && (
                    <Badge variant="outline">{activity.max_score} pontos</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Participantes/Alunos */}
            {attendees.length > 0 && (
              <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border-l-4 border-purple-500">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-purple-600" />
                  <p className="text-xs font-semibold text-purple-700 dark:text-purple-400">
                    PARTICIPANTES ({attendees.length}):
                  </p>
                </div>
                <div className="space-y-2">
                  {attendees.map((attendee) => (
                    <div 
                      key={attendee.user_id}
                      className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">{attendee.profiles?.full_name}</p>
                          <p className="text-xs text-gray-500">{attendee.profiles?.email}</p>
                        </div>
                      </div>
                      <Badge 
                        variant={attendee.status === 'accepted' ? 'success' : 'secondary'}
                        className="text-xs"
                      >
                        {attendee.status === 'accepted' ? 'Confirmado' : 
                         attendee.status === 'declined' ? 'Recusado' : 'Pendente'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Link de Reunião */}
            {event.meeting_url && (
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-4 h-4 text-indigo-600" />
                  <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">LINK DA REUNIÃO:</p>
                </div>
                <a 
                  href={event.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline break-all"
                >
                  {event.meeting_url}
                </a>
              </div>
            )}

            {/* Local */}
            {event.location && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <MapPin className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Local</p>
                  <p className="font-semibold">{event.location}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailsModal;
