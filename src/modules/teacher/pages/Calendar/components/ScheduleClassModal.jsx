import { logger } from '@/shared/utils/logger';
/**
 * Modal Rápido para Agendar Aula
 * Versão simplificada do CreateEventModal focada em aulas
 */

import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, Clock } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Button } from '@/shared/components/ui/button';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { toast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';

const ScheduleClassModal = ({ isOpen, onClose, onSuccess, teacherId }) => {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '08:00',
    endTime: '09:30',
    selectedClass: '',
    modality: 'presential',
    location: '',
    meetingLink: '',
    recurring: false,
    recurrencePattern: 'weekly', // daily, weekly, monthly
    recurrenceEnd: format(addDays(new Date(), 30), 'yyyy-MM-dd')
  });

  useEffect(() => {
    if (isOpen) {
      loadClasses();
    }
  }, [isOpen, teacherId]);

  const loadClasses = async () => {
    try {
      const { data } = await supabase
        .from('classes')
        .select('id, name, subject')
        .eq('created_by', teacherId)
        .eq('is_active', true)
        .order('name');

      setClasses(data || []);
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, selectedClass: data[0].id }));
      }
    } catch (error) {
      logger.error('Erro ao carregar turmas:', error)
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.selectedClass) {
      toast({
        title: 'Selecione uma turma',
        variant: 'destructive'
      });
      return;
    }

    if (formData.modality === 'online' && !formData.meetingLink.trim()) {
      toast({
        title: 'Link da aula online é obrigatório',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      const selectedClassData = classes.find(c => c.id === formData.selectedClass);
      const title = formData.subject || `Aula de ${selectedClassData?.subject || 'Aula'}`;

      // Criar aula(s)
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      const eventsToCreate = [];

      if (formData.recurring) {
        // Criar aulas recorrentes
        const endDate = new Date(formData.recurrenceEnd);
        let currentDate = new Date(formData.date);

        while (currentDate <= endDate) {
          const eventStart = new Date(currentDate);
          eventStart.setHours(parseInt(formData.startTime.split(':')[0]), parseInt(formData.startTime.split(':')[1]));
          
          const eventEnd = new Date(currentDate);
          eventEnd.setHours(parseInt(formData.endTime.split(':')[0]), parseInt(formData.endTime.split(':')[1]));

          eventsToCreate.push({
            title,
            description: formData.description,
            type: 'event',
            start_time: eventStart.toISOString(),
            end_time: eventEnd.toISOString(),
            modality: formData.modality,
            meeting_link: formData.modality === 'online' ? formData.meetingLink : null,
            location: formData.modality === 'presential' ? formData.location : null,
            created_by: teacherId,
            class_id: formData.selectedClass,
            is_recurring: true,
            recurrence_pattern: {
              type: formData.recurrencePattern,
              endDate: formData.recurrenceEnd
            },
            color: '#3B82F6'
          });

          // Próxima data
          if (formData.recurrencePattern === 'daily') {
            currentDate.setDate(currentDate.getDate() + 1);
          } else if (formData.recurrencePattern === 'weekly') {
            currentDate.setDate(currentDate.getDate() + 7);
          } else if (formData.recurrencePattern === 'monthly') {
            currentDate.setMonth(currentDate.getMonth() + 1);
          }
        }
      } else {
        // Aula única
        eventsToCreate.push({
          title,
          description: formData.description,
          type: 'event',
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          modality: formData.modality,
          meeting_link: formData.modality === 'online' ? formData.meetingLink : null,
          location: formData.modality === 'presential' ? formData.location : null,
          created_by: teacherId,
          class_id: formData.selectedClass,
          color: '#3B82F6'
        });
      }

      // Inserir no banco
      const { error } = await supabase
        .from('calendar_events')
        .insert(eventsToCreate);

      if (error) throw error;

      toast({
        title: '✅ Aula agendada!',
        description: eventsToCreate.length > 1 
          ? `${eventsToCreate.length} aulas criadas`
          : `${title} foi adicionada ao calendário`
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      logger.error('Erro ao agendar aula:', error)
      toast({
        title: '❌ Erro ao agendar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-white" />
              <h2 className="text-2xl font-bold text-white">Agendar Aula</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Turma */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Turma *
            </label>
            <select
              value={formData.selectedClass}
              onChange={(e) => setFormData({ ...formData, selectedClass: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
              required
            >
              <option value="">Selecione uma turma</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} - {cls.subject}
                </option>
              ))}
            </select>
          </div>

          {/* Assunto */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Assunto da Aula
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
              placeholder="Ex: Introdução a Funções Quadráticas"
            />
            <p className="text-xs text-slate-500 mt-1">Deixe vazio para usar o nome da disciplina</p>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Descrição (opcional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
              placeholder="Conteúdo que será abordado..."
            />
          </div>

          {/* Data e Horários */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Data *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Início *
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Fim *
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
                required
              />
            </div>
          </div>

          {/* Modalidade */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Modalidade
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, modality: 'presential' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.modality === 'presential'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                }`}
              >
                Presencial
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, modality: 'online' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.modality === 'online'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                }`}
              >
                Online
              </button>
            </div>
          </div>

          {/* Local ou Link */}
          {formData.modality === 'presential' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Local
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
                placeholder="Ex: Sala 203, Bloco B"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Link da Aula Online *
              </label>
              <input
                type="url"
                value={formData.meetingLink}
                onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
                placeholder="https://meet.google.com/..."
                required
              />
            </div>
          )}

          {/* Recorrência */}
          <div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.recurring}
                onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Aula recorrente
              </label>
            </div>
          </div>

          {formData.recurring && (
            <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-blue-300">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Repetir
                </label>
                <select
                  value={formData.recurrencePattern}
                  onChange={(e) => setFormData({ ...formData, recurrencePattern: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
                >
                  <option value="daily">Diariamente</option>
                  <option value="weekly">Semanalmente</option>
                  <option value="monthly">Mensalmente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Até
                </label>
                <input
                  type="date"
                  value={formData.recurrenceEnd}
                  onChange={(e) => setFormData({ ...formData, recurrenceEnd: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
                />
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Agendando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Agendar Aula
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleClassModal;
