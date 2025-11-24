import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Card } from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';
import { logger } from '@/shared/utils/logger';
import { showErrorToast } from '@/shared/utils/toastUtils';

const BulkActivityEditModal = ({ activities = [], onClose, onSuccess }) => {
  const { toast } = useToast();

  const [dueDate, setDueDate] = useState('');
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const validActivities = useMemo(
    () => (activities || []).filter((a) => a && a.id),
    [activities]
  );

  const totalActivities = validActivities.length;

  const handleApply = async () => {
    if (!dueDate) {
      toast({
        title: 'Defina um prazo',
        description: 'Informe uma nova data de entrega para aplicar em lote.',
        variant: 'destructive'
      });
      return;
    }

    if (totalActivities === 0) {
      onClose?.();
      return;
    }

    const parsed = new Date(dueDate);
    if (Number.isNaN(parsed.getTime())) {
      toast({
        title: 'Data inválida',
        description: 'Use um formato de data e hora válido.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const isoDue = parsed.toISOString();
      const ids = validActivities.map((a) => a.id);

      const { error: updateError } = await supabase
        .from('activities')
        .update({
          due_date: isoDue,
          updated_at: new Date().toISOString()
        })
        .in('id', ids);

      if (updateError) {
        throw updateError;
      }

      if (notifyStudents) {
        const assignmentMap = new Map();

        validActivities.forEach((activity) => {
          const baseTitle = activity.title || 'Atividade';
          const assignments = activity.assignments || [];

          assignments.forEach((assignment) => {
            const classId = assignment.class_id || assignment.class?.id;
            if (!classId) return;

            const key = `${activity.id}-${classId}`;
            if (!assignmentMap.has(key)) {
              assignmentMap.set(key, {
                activityId: activity.id,
                activityTitle: baseTitle,
                classId,
                className: assignment.class?.name || null
              });
            }
          });
        });

        const assignmentsToNotify = Array.from(assignmentMap.values());

        for (const item of assignmentsToNotify) {
          const { classId, activityId, activityTitle, className } = item;

          const { data: students, error: studentsError } = await supabase
            .from('class_members')
            .select('user_id')
            .eq('class_id', classId)
            .eq('role', 'student');

          if (studentsError) {
            logger.warn('Erro ao buscar alunos para notificação em lote:', studentsError);
            continue;
          }

          if (!students || students.length === 0) {
            continue;
          }

          const baseMessage = notificationMessage.trim()
            ? notificationMessage.trim()
            : `O prazo da atividade "${activityTitle}" foi atualizado. Novo prazo: ${parsed.toLocaleString('pt-BR')}.`;

          const notifications = students.map((student) => ({
            user_id: student.user_id,
            title: 'Prazo de atividade atualizado',
            message: baseMessage,
            type: 'assignment',
            data: {
              activity_id: activityId,
              class_id: classId,
              class_name: className,
              due_date: isoDue
            }
          }));

          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notifications);

          if (notifError) {
            logger.warn('Erro ao criar notificações em lote:', notifError);
          }
        }
      }

      toast({
        title: 'Prazos atualizados',
        description: `${totalActivities} atividade(s) tiveram o prazo ajustado.${notifyStudents ? ' Alunos foram notificados.' : ''}`
      });

      onSuccess?.();
    } catch (error) {
      showErrorToast(
        toast,
        'Não foi possível atualizar os prazos em lote.',
        error,
        { logPrefix: '[BulkActivityEditModal] Erro ao aplicar edição em lote' }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl sm:ml-auto sm:mr-8">
        <DialogHeader>
          <DialogTitle>Editar prazos em lote</DialogTitle>
          <DialogDescription>
            Ajuste o prazo de entrega de {totalActivities} atividade(s) de uma vez.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Card className="p-4 max-h-40 overflow-y-auto">
            <h4 className="font-semibold mb-2">Atividades selecionadas</h4>
            <ul className="space-y-1 text-sm">
              {validActivities.map((activity) => (
                <li key={activity.id} className="flex justify-between gap-2">
                  <span className="font-medium truncate">{activity.title || 'Atividade sem título'}</span>
                  {activity.classNames && activity.classNames.length > 0 && (
                    <span className="text-gray-500 truncate">
                      {activity.classNames.join(', ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="bulk-due-date">Novo prazo de entrega</Label>
            <Input
              id="bulk-due-date"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="max-w-xs"
            />
          </div>

          <Card className="p-4 space-y-3 bg-slate-50 dark:bg-slate-900/40">
            <div className="flex items-start gap-3">
              <Checkbox
                id="notify-students"
                checked={notifyStudents}
                onCheckedChange={(checked) => setNotifyStudents(Boolean(checked))}
              />
              <div className="space-y-1 flex-1">
                <Label htmlFor="notify-students">Notificar alunos sobre a mudança de prazo</Label>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Serão criadas notificações para os alunos das turmas onde essas atividades já estão postadas.
                </p>
              </div>
            </div>

            {notifyStudents && (
              <div className="space-y-1">
                <Label htmlFor="bulk-message">Mensagem opcional</Label>
                <Textarea
                  id="bulk-message"
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Explique brevemente o motivo da alteração do prazo (opcional)"
                  rows={3}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Se vazio, uma mensagem padrão será usada com o novo prazo formatado.
                </p>
              </div>
            )}
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={loading || totalActivities === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Aplicando...' : 'Aplicar alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkActivityEditModal;
