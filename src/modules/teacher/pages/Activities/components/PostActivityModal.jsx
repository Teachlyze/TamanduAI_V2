import { logger } from '@/shared/utils/logger';
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Switch } from '@/shared/components/ui/switch';
import { Calendar, Users, AlertCircle } from 'lucide-react';
import { supabase } from '@/shared/services/supabaseClient';
import { useToast } from '@/shared/components/ui/use-toast';
import { format } from 'date-fns';

const PostActivityModal = ({ activities, classes, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState(activities[0]?.max_score || 10);
  const [weight, setWeight] = useState(1.0);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [allowLateSubmission, setAllowLateSubmission] = useState(false);
  const [enablePlagiarism, setEnablePlagiarism] = useState(false);
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [loading, setLoading] = useState(false);

  const canEnablePlagiarism = React.useMemo(() => {
    if (!activities || activities.length === 0) return false;
    return activities.every((activity) => {
      const rawType = (activity.activity_type || activity.type || '').toLowerCase();
      if (!rawType) return true;
      // Em atividades do tipo 'project' (upload-only), antiplágio não deve ser usado
      return !['quiz', 'closed', 'objective', 'project'].includes(rawType);
    });
  }, [activities]);

  const handleClassToggle = (classId) => {
    setSelectedClasses(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const handlePost = async () => {
    if (selectedClasses.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos uma turma.',
        variant: 'destructive'
      });
      return;
    }

    if (!dueDate) {
      toast({
        title: 'Erro',
        description: 'Defina uma data de entrega.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      for (const activity of activities) {
        for (const classId of selectedClasses) {
          // Verificar se atividade já está vinculada a alguma turma
          const { data: existingAssignments } = await supabase
            .from('activity_class_assignments')
            .select('id')
            .eq('activity_id', activity.id);

          let activityIdToUse = activity.id;
          const rawType = (activity.activity_type || activity.type || '').toLowerCase();
          const plagiarismForThisActivity = rawType === 'project' ? false : enablePlagiarism;

          // Se já existe assignment, criar uma CÓPIA da atividade para esta turma
          if (existingAssignments && existingAssignments.length > 0) {
            const { data: newActivity, error: copyError } = await supabase
              .from('activities')
              .insert({
                title: activity.title,
                description: activity.description,
                content: activity.content,
                type: activity.type,
                max_score: maxScore,
                due_date: dueDate,
                weight: weight,
                instructions: additionalInstructions || activity.instructions,
                plagiarism_enabled: plagiarismForThisActivity,
                status: 'published',
                created_by: activity.created_by
              })
              .select()
              .single();

            if (copyError) throw copyError;
            activityIdToUse = newActivity.id;
          } else {
            // Se é a primeira vez postando, apenas atualizar
            const { error: updateError } = await supabase
              .from('activities')
              .update({
                due_date: dueDate,
                max_score: maxScore,
                weight: weight,
                instructions: additionalInstructions || activity.instructions,
                plagiarism_enabled: plagiarismForThisActivity,
                status: 'published'
              })
              .eq('id', activity.id);

            if (updateError) throw updateError;
          }

          // Criar assignment com o activity_id correto
          const { error: assignError } = await supabase
            .from('activity_class_assignments')
            .insert({
              activity_id: activityIdToUse,
              class_id: classId
            });

          if (assignError) throw assignError;

          // Atualizar data de atualização da turma para refletir nova atividade postada
          const { error: classUpdateError } = await supabase
            .from('classes')
            .update({
              updated_at: new Date().toISOString()
            })
            .eq('id', classId);

          if (classUpdateError) {
            logger.warn('Erro ao atualizar updated_at da turma ao postar atividade:', classUpdateError);
          }

          // Notificar alunos se marcado
          if (notifyStudents) {
            const { data: students } = await supabase
              .from('class_members')
              .select('user_id')
              .eq('class_id', classId)
              .eq('role', 'student');

            if (students) {
              const notifications = students.map(student => ({
                user_id: student.user_id,
                title: 'Nova Atividade Postada',
                message: `A atividade "${activity.title}" foi postada e está disponível.`,
                type: 'activity_posted',
                data: {
                  activity_id: activity.id,
                  class_id: classId,
                  due_date: dueDate
                }
              }));

              await supabase.from('notifications').insert(notifications);
            }
          }
        }
      }

      toast({
        title: 'Sucesso!',
        description: `Atividade${activities.length > 1 ? 's' : ''} postada${activities.length > 1 ? 's' : ''} em ${selectedClasses.length} turma${selectedClasses.length > 1 ? 's' : ''}.`
      });

      onSuccess();
    } catch (error) {
      logger.error('Erro ao postar atividade:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível postar a atividade.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Postar Atividade{activities.length > 1 ? 's' : ''}: {activities[0]?.title}
            {activities.length > 1 && ` (+${activities.length - 1})`}
          </DialogTitle>
          <DialogDescription>
            Configure as opções de postagem e selecione as turmas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Seleção de Turmas */}
          <div>
            <Label className="text-base font-semibold mb-3 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Selecionar Turmas
            </Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {classes.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>Você não tem turmas ativas.</p>
                  <p className="text-sm">Crie uma turma primeiro.</p>
                </div>
              ) : (
                classes.map((classItem) => (
                  <div key={classItem.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                    <Checkbox
                      id={classItem.id}
                      checked={selectedClasses.includes(classItem.id)}
                      onCheckedChange={() => handleClassToggle(classItem.id)}
                    />
                    <Label htmlFor={classItem.id} className="flex-1 cursor-pointer">
                      {classItem.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Configurações de Postagem */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dueDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Prazo de Entrega *
              </Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="maxScore">Pontuação Total *</Label>
              <Input
                id="maxScore"
                type="number"
                min="0"
                step="0.1"
                value={maxScore}
                onChange={(e) => setMaxScore(parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="weight">Peso na Média</Label>
              <Input
                id="weight"
                type="number"
                min="0"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>

          {/* Instruções Adicionais */}
          <div>
            <Label htmlFor="instructions">Instruções Adicionais (Opcional)</Label>
            <Textarea
              id="instructions"
              placeholder="Adicione instruções específicas para esta postagem..."
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              className="mt-1 min-h-[100px]"
            />
          </div>

          {/* Configurações Avançadas */}
          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h4 className="font-semibold text-sm">Configurações Avançadas</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="allowLate" className="cursor-pointer">
                  Permitir Envio Atrasado
                </Label>
                <p className="text-xs text-gray-500">
                  Alunos poderão submeter após o prazo
                </p>
              </div>
              <Switch
                id="allowLate"
                checked={allowLateSubmission}
                onCheckedChange={setAllowLateSubmission}
              />
            </div>

            {canEnablePlagiarism && (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="plagiarism" className="cursor-pointer">
                    Ativar Antiplágio
                  </Label>
                  <p className="text-xs text-gray-500">
                    Verificar originalidade das respostas
                  </p>
                </div>
                <Switch
                  id="plagiarism"
                  checked={enablePlagiarism}
                  onCheckedChange={setEnablePlagiarism}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="notify" className="cursor-pointer">
                  Notificar Alunos
                </Label>
                <p className="text-xs text-gray-500">
                  Enviar notificação sobre nova atividade
                </p>
              </div>
              <Switch
                id="notify"
                checked={notifyStudents}
                onCheckedChange={setNotifyStudents}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handlePost} disabled={loading || selectedClasses.length === 0}>
            {loading ? 'Postando...' : 'Postar Agora'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PostActivityModal;
