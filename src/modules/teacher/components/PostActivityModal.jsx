import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { Send, Users, Calendar, Clock, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { useToast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';

const PostActivityModal = ({ open, onClose, activity, onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('23:59');
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadClasses();
      
      // Definir data padrão (7 dias a partir de hoje)
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setDueDate(defaultDate.toISOString().split('T')[0]);
    }
  }, [open, user]);

  const loadClasses = async () => {
    try {
      setLoadingClasses(true);
      
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, subject, is_active')
        .eq('created_by', user.id)
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      setClasses(data || []);
    } catch (error) {
      logger.error('Erro ao carregar turmas:', error);
      toast({
        title: 'Erro ao carregar turmas',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoadingClasses(false);
    }
  };

  const handlePost = async () => {
    if (!selectedClass) {
      toast({
        title: 'Selecione uma turma',
        description: 'Escolha a turma para postar a atividade.',
        variant: 'destructive'
      });
      return;
    }

    if (!dueDate) {
      toast({
        title: 'Defina a data de entrega',
        description: 'A data de entrega é obrigatória.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      // Combinar data e hora para due_date
      const dueDatetime = `${dueDate}T${dueTime}:00`;

      // 1. Atualizar a atividade com due_date
      const { error: activityError } = await supabase
        .from('activities')
        .update({
          due_date: dueDatetime
        })
        .eq('id', activity.id);

      if (activityError) {
        logger.error('Erro ao atualizar atividade:', activityError);
        throw activityError;
      }

      // 2. Verificar se já existe assignment
      const { data: existingAssignment } = await supabase
        .from('activity_class_assignments')
        .select('id')
        .eq('activity_id', activity.id)
        .eq('class_id', selectedClass)
        .single();

      if (existingAssignment) {
        toast({
          title: 'Atividade já postada',
          description: 'Esta atividade já foi postada para esta turma.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // 3. Criar assignment na tabela activity_class_assignments (apenas relacionamento)
      const { data: assignment, error: assignmentError } = await supabase
        .from('activity_class_assignments')
        .insert({
          activity_id: activity.id,
          class_id: selectedClass,
          assigned_at: new Date().toISOString()
        })
        .select()
        .single();

      if (assignmentError) {
        logger.error('Erro ao criar assignment:', assignmentError);
        throw assignmentError;
      }

      toast({
        title: '✅ Atividade postada!',
        description: `A atividade foi postada para a turma selecionada.`
      });

      if (onSuccess) {
        onSuccess(assignment);
      }

      onClose();
    } catch (error) {
      logger.error('Erro ao postar atividade:', error);
      toast({
        title: 'Erro ao postar atividade',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedClass('');
      setDueDate('');
      setDueTime('23:59');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            Postar Atividade
          </DialogTitle>
          <DialogDescription>
            Escolha a turma e defina a data de entrega para postar esta atividade.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nome da Atividade */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Atividade:</p>
            <p className="font-semibold">{activity?.title}</p>
          </div>

          {/* Selecionar Turma */}
          <div className="space-y-2">
            <Label htmlFor="class">
              <Users className="w-4 h-4 inline mr-1" />
              Turma *
            </Label>
            {loadingClasses ? (
              <div className="flex items-center justify-center p-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger id="class">
                  <SelectValue placeholder="Selecione a turma..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} {cls.subject && `- ${cls.subject}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Data de Entrega */}
          <div className="space-y-2">
            <Label htmlFor="due-date">
              <Calendar className="w-4 h-4 inline mr-1" />
              Data de Entrega *
            </Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Hora de Entrega */}
          <div className="space-y-2">
            <Label htmlFor="due-time">
              <Clock className="w-4 h-4 inline mr-1" />
              Hora de Entrega
            </Label>
            <Input
              id="due-time"
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            onClick={handlePost} 
            disabled={loading || !selectedClass || !dueDate}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Postando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Postar Atividade
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PostActivityModal;
