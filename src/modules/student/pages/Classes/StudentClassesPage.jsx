import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Users, FileText, Plus, Search } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import {
  DashboardHeader,
  StatsCard,
  EmptyState,
  SearchInput
} from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { ClassService } from '@/shared/services/classService';
import { useAuth } from '@/shared/hooks/useAuth';

const StudentClassesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    loadClasses();
  }, [user]);

  const loadClasses = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: memberships } = await supabase
        .from('class_members')
        .select(`
          class_id,
          classes:class_id (
            id,
            name,
            subject,
            color,
            created_by,
            teacher:created_by (
              id,
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('role', 'student');

      const classList = (memberships || []).map(m => m.classes).filter(Boolean);
      setClasses(classList);

    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async () => {
    if (!joinCode.trim()) {
      alert('Digite o código da turma');
      return;
    }

    try {
      await ClassService.joinClassByCode(joinCode.trim().toUpperCase(), user.id);
      alert('Você entrou na turma com sucesso!');
      setShowJoinModal(false);
      setJoinCode('');
      loadClasses(); // Reload classes
    } catch (error) {
      console.error('Erro:', error);
      alert(error.message || 'Erro ao entrar na turma');
    }
  };

  const filteredClasses = classes.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <DashboardHeader
        title="Minhas Turmas"
        subtitle="Acompanhe suas turmas e atividades"
        role="student"
      />

      {/* Actions */}
      <div className="flex items-center justify-between mb-8">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar turmas..."
        />
        <Button
          onClick={() => setShowJoinModal(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Entrar em Turma
        </Button>
      </div>

      {/* Classes Grid */}
      {filteredClasses.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredClasses.map((cls, index) => (
            <motion.div
              key={cls.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                onClick={() => navigate(`/student/classes/${cls.id}`)}
                className="p-6 cursor-pointer hover:shadow-lg transition-all bg-white dark:bg-slate-900"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: cls.color || '#3B82F6' }}
                  >
                    📚
                  </div>
                  <Badge>{cls.subject || 'Sem matéria'}</Badge>
                </div>

                <h3 className="font-bold text-lg mb-2">{cls.name}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Prof. {cls.teacher?.name || 'Desconhecido'}
                </p>

                <Button variant="ghost" className="w-full">
                  Ver Turma
                </Button>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Nenhuma turma encontrada"
          description="Entre em uma turma usando o código de convite"
          actionLabel="Entrar em Turma"
          actionIcon={Plus}
          action={() => setShowJoinModal(true)}
        />
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full bg-white dark:bg-slate-900">
            <h3 className="text-xl font-bold mb-4">Entrar em Turma</h3>
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Digite o código da turma"
              className="mb-4"
            />
            <div className="flex gap-2">
              <Button onClick={handleJoinClass} className="flex-1">
                Entrar
              </Button>
              <Button variant="outline" onClick={() => setShowJoinModal(false)}>
                Cancelar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StudentClassesPage;
