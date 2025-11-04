import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { X, Edit, Trash2, Copy, ExternalLink, Clock, MapPin, Users, User, BookOpen, Video } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { toast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';

const EventDetailsModal = ({ isOpen, onClose, event, onEdit, onDelete }) => {
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [activity, setActivity] = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (isOpen && event) {
      loadEventDetails();
    }
  }, [isOpen, event]);

  const loadEventDetails = async () => {
    try {
      setLoadingDetails(true);

      // Carregar participantes (se for reunião)
      if (event.type === 'meeting' || event.type === 'reunião') {
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
      setLoadingDetails(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);

      // Deletar evento (cascade irá deletar relacionamentos)
      const { error: eventError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', event.id);

      if (eventError) throw eventError;

      toast({
        title: 'Evento excluído!',
        description: 'O evento foi removido com sucesso.'
      });

      onDelete();
      onClose();
    } catch (error) {
      logger.error('Erro ao excluir evento:', error)
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o evento.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = () => {
    // Implementar lógica de duplicação
    toast({
      title: 'Em desenvolvimento',
      description: 'Funcionalidade em breve.'
    });
  };

  const getEventTypeLabel = (type) => {
    const types = {
      event: 'Aula',
      activity: 'Atividade',
      meeting: 'Reunião',
      deadline: 'Prazo'
    };
    return types[type] || 'Evento';
  };

  const getEventTypeColor = (type) => {
    const colors = {
      event: 'bg-blue-100 text-blue-700',
      activity: 'bg-orange-100 text-orange-700',
      meeting: 'bg-purple-100 text-purple-700',
      deadline: 'bg-red-100 text-red-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const calculateDuration = () => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const diff = end - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-500 p-6 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">{event.title}</h2>
              <Badge className={getEventTypeColor(event.type)}>
                {getEventTypeLabel(event.type)}
              </Badge>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Data e Horário */}
          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <div className="font-medium">
                {format(new Date(event.start_time), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </div>
              <div className="text-sm text-slate-500">
                {format(new Date(event.start_time), 'HH:mm')} - {format(new Date(event.end_time), 'HH:mm')}
                {' • '}
                {calculateDuration()}
              </div>
            </div>
          </div>

          {/* Descrição */}
          {event.description && (
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Descrição</h3>
              <p className="text-slate-700 dark:text-slate-300">{event.description}</p>
            </div>
          )}

          {/* Modalidade */}
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <div className="font-medium text-slate-900 dark:text-white">
                {event.modality === 'online' ? 'Online' : 'Presencial'}
              </div>
              {event.modality === 'online' && event.meeting_link && (
                <a
                  href={event.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1"
                >
                  Abrir link da reunião
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {event.modality === 'presential' && event.location && (
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {event.location}
                </div>
              )}
            </div>
          </div>

          {/* Turma */}
          {(classInfo || event.class) && (
            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border-l-4 border-green-500">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Turma
              </h3>
              <div className="font-medium">{classInfo?.name || event.class?.name}</div>
              {(classInfo?.subject || event.class?.subject) && (
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {classInfo?.subject || event.class?.subject}
                </div>
              )}
            </div>
          )}

          {/* Atividade Linkada */}
          {activity && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-l-4 border-blue-500">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Atividade Linkada
              </h3>
              <div className="font-medium mb-1">{activity.title}</div>
              {activity.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{activity.description}</p>
              )}
              <div className="flex gap-2">
                <Badge variant="outline">{activity.type}</Badge>
                {activity.max_score && (
                  <Badge variant="outline">{activity.max_score} pontos</Badge>
                )}
              </div>
            </div>
          )}

          {/* Participantes */}
          {attendees.length > 0 && (
            <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border-l-4 border-purple-500">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Participantes ({attendees.length})
              </h3>
              <div className="space-y-2">
                {attendees.map((attendee) => (
                  <div 
                    key={attendee.user_id}
                    className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-sm font-medium">{attendee.profiles?.full_name}</div>
                        <div className="text-xs text-slate-500">{attendee.profiles?.email}</div>
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
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">LINK DA REUNIÃO:</span>
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

          {/* Confirmação de Exclusão */}
          {showDeleteConfirm && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleDelete}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Excluindo...
                    </>
                  ) : (
                    'Confirmar Exclusão'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onEdit}
              className="flex-1"
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button
              variant="outline"
              onClick={handleDuplicate}
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              Duplicar
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModal;
