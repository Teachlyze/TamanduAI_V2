import React, { useState, useEffect } from 'react';
import { UserPlus, Users, Download, Upload } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { redisCache } from '@/shared/services/redisCache';
import AddStudentModal from '../components/AddStudentModal';

const StudentsTab = ({ classId, classData }) => {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadStudents();
  }, [classId]);

  const loadStudents = async () => {
    try {
      setLoading(true);

      // Usar cache Redis para lista de alunos
      const cachedStudents = await redisCache.getClassStudents(classId, async () => {
        const { data, error } = await supabase
          .from('class_members')
          .select(`
            *,
            user:profiles(id, full_name, email, avatar_url)
          `)
          .eq('class_id', classId)
          .eq('role', 'student')
          .order('joined_at', { ascending: false });

        if (error) throw error;
        return data || [];
      });

      setStudents(cachedStudents);

    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
      setStudents([]);
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
        <div>
          <h2 className="text-2xl font-bold">Alunos da Turma</h2>
          <p className="text-slate-600 dark:text-slate-400">
            {students.length} {students.length === 1 ? 'aluno' : 'alunos'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Importar Lista
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar Lista
          </Button>
          <Button 
            className="bg-gradient-to-r from-blue-600 to-cyan-600"
            onClick={() => setShowAddModal(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Adicionar Aluno
          </Button>
        </div>
      </div>

      {students.length > 0 ? (
        <div className="grid gap-4">
          {students.map((member) => (
            <Card key={member.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                    {member.user?.full_name?.[0] || 'A'}
                  </div>
                  <div>
                    <div className="font-semibold">
                      {member.user?.full_name || 'Nome não disponível'}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {member.user?.email || 'Email não disponível'}
                    </div>
                    <div className="text-xs text-slate-500">
                      Entrou em {new Date(member.joined_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                  <Button variant="outline" size="sm">
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <h3 className="text-lg font-semibold mb-2">Nenhum aluno na turma ainda</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Adicione alunos ou compartilhe o link de convite
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => setShowAddModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar Primeiro Aluno
            </Button>
            <Button variant="outline" onClick={() => setShowAddModal(true)}>
              Gerar Link de Convite
            </Button>
          </div>
        </Card>
      )}

      {/* Modal de Adicionar Aluno */}
      <AddStudentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        classId={classId}
        classData={classData}
        onSuccess={() => {
          setShowAddModal(false);
          loadStudents(); // Recarregar lista
        }}
      />
    </div>
  );
};

export default StudentsTab;
