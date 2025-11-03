import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, MapPin, Video, Edit, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { toast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import ScheduleClassModal from '../components/ScheduleClassModal';

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Segunda', short: 'SEG' },
  { id: 'tuesday', label: 'Terça', short: 'TER' },
  { id: 'wednesday', label: 'Quarta', short: 'QUA' },
  { id: 'thursday', label: 'Quinta', short: 'QUI' },
  { id: 'friday', label: 'Sexta', short: 'SEX' },
  { id: 'saturday', label: 'Sábado', short: 'SÁB' },
  { id: 'sunday', label: 'Domingo', short: 'DOM' }
];

/**
 * TAB DE HORÁRIOS - Professor configura horários de aula
 */
const ScheduleTab = ({ classId }) => {
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [classSettings, setClassSettings] = useState(null);

  useEffect(() => {
    loadSchedules();
  }, [classId]);

  const loadSchedules = async () => {
    try {
      setLoading(true);

      // Buscar configurações da turma
      const { data: settings, error } = await supabase
        .from('class_settings')
        .select('*')
        .eq('class_id', classId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setClassSettings(settings);
      setSchedules(settings?.schedule || []);

    } catch (error) {
      logger.error('Erro ao carregar horários:', error);
      toast({
        title: 'Erro ao carregar horários',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async (scheduleData) => {
    try {
      let updatedSchedules;

      if (editingSchedule !== null) {
        // Editar existente
        updatedSchedules = schedules.map((s, i) =>
          i === editingSchedule ? scheduleData : s
        );
      } else {
        // Adicionar novo
        updatedSchedules = [...schedules, scheduleData];
      }

      // Salvar no banco
      const { error } = await supabase
        .from('class_settings')
        .upsert({
          class_id: classId,
          schedule: updatedSchedules,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setSchedules(updatedSchedules);
      setShowModal(false);
      setEditingSchedule(null);

      toast({
        title: editingSchedule !== null ? 'Horário atualizado!' : 'Horário adicionado!',
        description: 'O horário foi salvo com sucesso.'
      });

    } catch (error) {
      logger.error('Erro ao salvar horário:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteSchedule = async (index) => {
    if (!confirm('Tem certeza que deseja remover este horário?')) return;

    try {
      const updatedSchedules = schedules.filter((_, i) => i !== index);

      const { error } = await supabase
        .from('class_settings')
        .upsert({
          class_id: classId,
          schedule: updatedSchedules,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setSchedules(updatedSchedules);

      toast({
        title: 'Horário removido',
        description: 'O horário foi removido com sucesso.'
      });

    } catch (error) {
      logger.error('Erro ao remover horário:', error);
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleEditSchedule = (index) => {
    setEditingSchedule(index);
    setShowModal(true);
  };

  const getSchedulesForDay = (dayId) => {
    return schedules
      .map((s, index) => ({ ...s, originalIndex: index }))
      .filter(s => s.day === dayId)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Horários de Aula</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Configure os horários recorrentes das aulas
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingSchedule(null);
            setShowModal(true);
          }}
          className="bg-gradient-to-r from-blue-600 to-cyan-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Horário
        </Button>
      </div>

      {/* Calendário Semanal */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {DAYS_OF_WEEK.map(day => {
          const daySchedules = getSchedulesForDay(day.id);

          return (
            <Card key={day.id} className="p-4">
              {/* Cabeçalho do Dia */}
              <div className="text-center mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {day.short}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {day.label}
                </div>
              </div>

              {/* Horários do Dia */}
              {daySchedules.length > 0 ? (
                <div className="space-y-2">
                  {daySchedules.map((schedule) => (
                    <div
                      key={schedule.originalIndex}
                      className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 group hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-1 text-blue-700 dark:text-blue-300">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs font-semibold">
                            {schedule.start_time} - {schedule.end_time}
                          </span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditSchedule(schedule.originalIndex)}
                            className="p-1 hover:bg-blue-200 dark:hover:bg-blue-900 rounded"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(schedule.originalIndex)}
                            className="p-1 hover:bg-red-200 dark:hover:bg-red-900 rounded text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {schedule.location && (
                        <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                          {schedule.modality === 'online' ? (
                            <>
                              <Video className="w-3 h-3" />
                              <span className="truncate">{schedule.location}</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{schedule.location}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 dark:text-slate-600">
                  <Calendar className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Sem aulas</p>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Resumo */}
      {schedules.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Horários Configurados</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Você tem {schedules.length} {schedules.length === 1 ? 'horário' : 'horários'} de aula configurado(s).
                Os alunos verão esses horários em sua agenda pessoal.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Modal */}
      <ScheduleClassModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingSchedule(null);
        }}
        onSave={handleSaveSchedule}
        initialData={editingSchedule !== null ? schedules[editingSchedule] : null}
      />
    </div>
  );
};

export default ScheduleTab;
