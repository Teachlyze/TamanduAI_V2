import React, { useState, useEffect } from 'react';
import { X, Save, BookOpen, FileText, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/shared/components/ui/button';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { toast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';
import { redisCache } from '@/shared/services/redisCache';

const CreateEventModal = ({ isOpen, onClose, onSuccess, selectedDate, teacherId }) => {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'class',
    start_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    start_time: '08:00',
    end_time: '09:00',
    modality: 'online',
    meeting_link: '',
    location: '',
    selected_classes: [],
    color: '#3B82F6'
  });

  useEffect(() => {
    loadClasses();
  }, [teacherId]);

  const loadClasses = async () => {
    try {
      const { data } = await supabase
        .from('classes')
        .select('id, name')
        .eq('created_by', teacherId)
        .eq('is_active', true)
        .order('name');

      setClasses(data || []);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validações
    if (!formData.title.trim()) {
      toast({
        title: 'Erro de validação',
        description: 'O título é obrigatório.',
        variant: 'destructive'
      });
      return;
    }

    if (formData.modality === 'online' && !formData.meeting_link.trim()) {
      toast({
        title: 'Erro de validação',
        description: 'Link da reunião é obrigatório para eventos online.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      // Criar timestamps
      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
      const endDateTime = new Date(`${formData.start_date}T${formData.end_time}`);

      // Se múltiplas turmas, criar evento para cada uma
      // Se nenhuma turma, criar evento sem class_id (pessoal)
      const eventsToCreate = formData.selected_classes.length > 0
        ? formData.selected_classes.map(classId => ({
            title: formData.title,
            description: formData.description,
            event_type: formData.event_type,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            modality: formData.modality,
            meeting_link: formData.modality === 'online' ? formData.meeting_link : null,
            location: formData.modality === 'presential' ? formData.location : null,
            created_by: teacherId,
            teacher_id: teacherId,
            class_id: classId,
            color: formData.color
          }))
        : [{
            title: formData.title,
            description: formData.description,
            event_type: formData.event_type,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            modality: formData.modality,
            meeting_link: formData.modality === 'online' ? formData.meeting_link : null,
            location: formData.modality === 'presential' ? formData.location : null,
            created_by: teacherId,
            teacher_id: teacherId,
            color: formData.color
          }];

      // Inserir eventos
      const { error: eventError } = await supabase
        .from('calendar_events')
        .insert(eventsToCreate);

      if (eventError) throw eventError;

      // Invalidar cache do calendário para o mês do evento
      const eventMonth = format(startDateTime, 'yyyy-MM');
      const cacheKey = redisCache.generateKey('calendar', teacherId, eventMonth);
      await redisCache.invalidatePattern(`calendar:${teacherId}:*`);

      toast({
        title: 'Evento criado!',
        description: 'Seu evento foi criado com sucesso.'
      });

      // Chamar onSuccess para atualizar estado local (SEM reload)
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      toast({
        title: 'Erro ao criar evento',
        description: 'Não foi possível criar o evento.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const eventTypes = [
    { value: 'class', label: 'Aula', icon: BookOpen, color: 'blue' },
    { value: 'exam', label: 'Prova', icon: FileText, color: 'red' },
    { value: 'meeting', label: 'Reunião', icon: Users, color: 'purple' },
    { value: 'personal', label: 'Pessoal', icon: Calendar, color: 'gray' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-500 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Novo Evento</h2>
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
          {/* Tipo de Evento */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Tipo de Evento
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {eventTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.event_type === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, event_type: type.value })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Título *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
              placeholder="Ex: Aula de Matemática"
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
              placeholder="Detalhes do evento..."
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
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
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
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
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
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
                required
              />
            </div>
          </div>

          {/* Turmas */}
          {(formData.event_type === 'class' || formData.event_type === 'exam') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Turmas
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto p-2 border border-slate-200 dark:border-slate-700 rounded-lg">
                {classes.map((classItem) => (
                  <label
                    key={classItem.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={formData.selected_classes.includes(classItem.id)}
                      onChange={(e) => {
                        const newClasses = e.target.checked
                          ? [...formData.selected_classes, classItem.id]
                          : formData.selected_classes.filter(id => id !== classItem.id);
                        setFormData({ ...formData, selected_classes: newClasses });
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">{classItem.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Modalidade */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Modalidade
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="online"
                  checked={formData.modality === 'online'}
                  onChange={(e) => setFormData({ ...formData, modality: e.target.value })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">Online</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="presential"
                  checked={formData.modality === 'presential'}
                  onChange={(e) => setFormData({ ...formData, modality: e.target.value })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">Presencial</span>
              </label>
            </div>
          </div>

          {/* Link ou Local */}
          {formData.modality === 'online' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Link da Reunião *
              </label>
              <input
                type="url"
                value={formData.meeting_link}
                onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
                placeholder="https://meet.google.com/..."
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Local
              </label>
              <textarea
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
                placeholder="Ex: Sala 203, Bloco B"
              />
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
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Criando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Criar Evento
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEventModal;
