import React, { useState, useEffect } from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { redisCache } from '@/shared/services/redisCache';
import { useNavigate } from 'react-router-dom';

const ActivitiesTab = ({ classId }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    loadActivities();
  }, [classId]);

  const loadActivities = async () => {
    try {
      setLoading(true);

      // Usar cache Redis para lista de atividades
      const cachedActivities = await redisCache.getClassActivities(classId, async () => {
        const { data, error } = await supabase
          .from('activity_class_assignments')
          .select(`
            id,
            assigned_at,
            activity:activities(
              id,
              title,
              description,
              type,
              due_date,
              max_score,
              status
            )
          `)
          .eq('class_id', classId)
          .order('assigned_at', { ascending: false })
          .limit(50); // Limitar para melhor performance

        if (error) throw error;
        return data || [];
      });

      setActivities(cachedActivities);

    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Atividades da Turma</h2>
        <div className="flex gap-2">
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Postar Atividade Existente
          </Button>
          <Button 
            className="bg-gradient-to-r from-blue-600 to-cyan-600"
            onClick={() => navigate(`/dashboard/activities/create?classId=${classId}`)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Atividade
          </Button>
        </div>
      </div>

      {activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map((assignment) => (
            <Card key={assignment.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2">
                    {assignment.activity?.title || 'Sem título'}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>{assignment.activity?.type || 'assignment'}</Badge>
                    {assignment.activity?.due_date && (
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Prazo: {new Date(assignment.activity.due_date).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    {assignment.activity?.description || 'Sem descrição'}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Ver Submissões
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <ClipboardList className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma atividade postada ainda</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Crie ou poste uma atividade para começar
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate(`/dashboard/activities/create?classId=${classId}`)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Nova Atividade
            </Button>
            <Button variant="outline">
              Postar Atividade Existente
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ActivitiesTab;
