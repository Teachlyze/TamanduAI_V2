import React, { useState, useEffect } from 'react';
import { X, Search, Calendar, CheckCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { toast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PostExistingActivityModal = ({ isOpen, onClose, classId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActivity, setSelectedActivity] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadMyActivities();
    }
  }, [isOpen]);

  const loadMyActivities = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar atividades do professor que ainda não estão nesta turma
      const { data: myActivities, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (activitiesError) throw activitiesError;

      // Buscar atividades já postadas nesta turma
      const { data: assignedActivities, error: assignedError } = await supabase
        .from('activity_class_assignments')
        .select('activity_id')
        .eq('class_id', classId);

      if (assignedError) throw assignedError;

      const assignedIds = assignedActivities.map(a => a.activity_id);
      
      // Filtrar apenas atividades não postadas
      const availableActivities = myActivities.filter(a => !assignedIds.includes(a.id));

      setActivities(availableActivities);

    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
      toast({
        title: 'Erro ao carregar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePostActivity = async () => {
    if (!selectedActivity) {
      toast({
        title: 'Selecione uma atividade',
        description: 'Escolha uma atividade para postar na turma',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      // Criar assignment
      const { error } = await supabase
        .from('activity_class_assignments')
        .insert({
          activity_id: selectedActivity.id,
          class_id: classId,
          assigned_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: '✅ Atividade postada!',
        description: `"${selectedActivity.title}" foi adicionada à turma`
      });

      onSuccess?.();
      onClose();

    } catch (error) {
      console.error('Erro ao postar atividade:', error);
      toast({
        title: 'Erro ao postar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredActivities = activities.filter(activity =>
    activity.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activity.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 p-6 rounded-t-xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Postar Atividade Existente</h2>
              <p className="text-cyan-100 text-sm">Escolha uma atividade criada anteriormente</p>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar atividades..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista de Atividades */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
              <h3 className="text-lg font-semibold mb-2">
                {activities.length === 0 ? 'Nenhuma atividade disponível' : 'Nenhum resultado encontrado'}
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                {activities.length === 0 
                  ? 'Crie atividades primeiro para poder postá-las aqui'
                  : 'Tente buscar por outro termo'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredActivities.map((activity) => (
                <Card
                  key={activity.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedActivity?.id === activity.id
                      ? 'border-2 border-blue-600 bg-blue-50 dark:bg-blue-950/20'
                      : 'border hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedActivity(activity)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{activity.title}</h3>
                        <Badge variant={activity.status === 'active' ? 'default' : 'secondary'}>
                          {activity.status === 'active' ? 'Publicada' : 'Rascunho'}
                        </Badge>
                      </div>
                      
                      {activity.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                          {activity.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        {activity.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Prazo: {format(new Date(activity.due_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        )}
                        {activity.max_grade && (
                          <span>Nota: {activity.max_grade} pts</span>
                        )}
                      </div>
                    </div>
                    
                    {selectedActivity?.id === activity.id && (
                      <div className="ml-4">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 justify-end pt-4 border-t dark:border-slate-700">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handlePostActivity}
              disabled={loading || !selectedActivity}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
            >
              {loading ? 'Postando...' : 'Postar Atividade'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PostExistingActivityModal;
