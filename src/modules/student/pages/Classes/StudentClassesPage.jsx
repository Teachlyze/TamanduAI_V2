import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Users, FileText, LogIn, Calendar, X } from 'lucide-react';
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
  const [joiningClass, setJoiningClass] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadClasses();
  }, [user]);

  const loadClasses = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Buscar turmas do aluno
      const { data: memberships } = await supabase
        .from('class_members')
        .select(`
          class_id,
          joined_at,
          classes:class_id (
            id,
            name,
            subject,
            color,
            banner_color,
            created_by,
            teacher:created_by (
              id,
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('role', 'student')
        .order('joined_at', { ascending: false });

      // Para cada turma, buscar estatísticas
      const classesWithStats = await Promise.all(
        (memberships || []).map(async (m) => {
          const classData = m.classes;
          if (!classData) return null;

          // Contar membros da turma
          const { count: memberCount } = await supabase
            .from('class_members')
            .select('id', { count: 'exact', head: true })
            .eq('class_id', classData.id);

          // Contar atividades da turma
          const { count: activityCount } = await supabase
            .from('activity_class_assignments')
            .select('id', { count: 'exact', head: true })
            .eq('class_id', classData.id);

          return {
            ...classData,
            memberCount: memberCount || 0,
            activityCount: activityCount || 0
          };
        })
      );

      setClasses(classesWithStats.filter(Boolean));

    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async () => {
    const code = joinCode.trim().toUpperCase();
    
    if (!code) {
      setError('Digite o código da turma');
      return;
    }

    if (code.length > 8) {
      setError('Código inválido (máximo 8 caracteres)');
      return;
    }

    try {
      setJoiningClass(true);
      setError('');

      // Buscar turma pelo código
      const { data: classData, error: searchError } = await supabase
        .from('classes')
        .select('id, name')
        .ilike('invite_code', code)
        .single();

      if (searchError || !classData) {
        setError('Código inválido!');
        return;
      }

      // Verificar se já é membro
      const { data: existingMembership } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', classData.id)
        .eq('user_id', user.id)
        .single();

      if (existingMembership) {
        setError('Você já está nesta turma!');
        return;
      }

      // Adicionar como membro
      const { error: insertError } = await supabase
        .from('class_members')
        .insert({
          class_id: classData.id,
          user_id: user.id,
          role: 'student',
          joined_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      // Sucesso!
      setShowJoinModal(false);
      setJoinCode('');
      setError('');
      loadClasses();
      
      // Mostrar notificação de sucesso
      alert(`Você entrou na turma "${classData.name}" com sucesso!`);
    } catch (error) {
      console.error('Erro ao entrar na turma:', error);
      setError('Erro ao entrar na turma. Tente novamente.');
    } finally {
      setJoiningClass(false);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      <DashboardHeader
        title="Minhas Turmas"
        subtitle="Acompanhe suas turmas e atividades"
        role="student"
      />

      {/* Actions */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
        <div className="flex-1 max-w-md">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar turmas..."
          />
        </div>
        <Button
          onClick={() => setShowJoinModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex-shrink-0"
        >
          <LogIn className="w-4 h-4 mr-2" />
          Entrar com Código
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
                className="overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-200 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              >
                {/* Banner Superior */}
                <div className="h-32 bg-gradient-to-r from-blue-600 to-cyan-500 relative overflow-hidden">
                  <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-white opacity-90" />
                  </div>
                </div>

                {/* Corpo do Card */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-2">
                      {cls.name}
                    </h3>
                  </div>
                  
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    {cls.subject || 'Disciplina não informada'}
                  </p>

                  {/* Estatísticas */}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{cls.memberCount || 0} {cls.memberCount === 1 ? 'membro' : 'membros'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{cls.activityCount || 0} {cls.activityCount === 1 ? 'atividade' : 'atividades'}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="text-center max-w-md">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Nenhuma turma ainda
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Entre em uma turma usando um código de acesso
            </p>
            <Button
              onClick={() => setShowJoinModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Entrar em uma Turma
            </Button>
          </div>
        </div>
      )}

      {/* Join Modal - APRIMORADO */}
      {showJoinModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowJoinModal(false);
            setJoinCode('');
            setError('');
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="p-8 max-w-md w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-2xl">
              {/* Header do Modal */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Entrar em uma Turma
                </h3>
                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinCode('');
                    setError('');
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Texto Explicativo */}
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Digite o código fornecido pelo professor
              </p>

              {/* Input do Código */}
              <div className="mb-6">
                <Input
                  value={joinCode}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    if (value.length <= 8) {
                      setJoinCode(value);
                      setError('');
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleJoinClass();
                    }
                  }}
                  placeholder="CÓDIGO DA TURMA"
                  maxLength={8}
                  className="text-center text-2xl font-mono tracking-widest uppercase h-14 border-2 focus:border-blue-500"
                  autoFocus
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 text-center">
                    {error}
                  </p>
                )}
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinCode('');
                    setError('');
                  }}
                  className="flex-1 border-slate-300 dark:border-slate-700"
                  disabled={joiningClass}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleJoinClass} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={joiningClass || !joinCode.trim()}
                >
                  {joiningClass ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default StudentClassesPage;
