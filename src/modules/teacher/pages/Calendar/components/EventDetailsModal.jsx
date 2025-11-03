import { logger } from '@/shared/utils/logger';
import React, { useState } from 'react';
import { X, Edit, Trash2, Copy, ExternalLink, Clock, MapPin, Users } from 'lucide-react';
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
          {event.class && (
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Turma
              </h3>
              <Badge variant="outline">
                {event.class.name}
              </Badge>
            </div>
          )}

          {/* Participantes */}
          {event.participants && Array.isArray(event.participants) && event.participants.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Participantes
              </h3>
              <div className="space-y-2">
                {event.participants.map((participant, idx) => (
                  <div key={idx} className="text-sm text-slate-700 dark:text-slate-300">
                    {participant.name || participant.email || 'Participante'}
                  </div>
                ))}
              </div>
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
