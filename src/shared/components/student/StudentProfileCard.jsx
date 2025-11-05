import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Bell, User, Settings, BookOpen, Award, TrendingUp, FileText } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/shared/hooks/useAuth';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { supabase } from '@/shared/services/supabaseClient';
import { Link } from 'react-router-dom';

export const StudentProfileCard = ({ className = '' }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    completedActivities: 0,
    pendingActivities: 0,
    avgGrade: 0
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  // Usar o hook useTheme para gerenciar o tema
  const { theme, toggleTheme, isDark } = useTheme();

  useEffect(() => {
    if (user?.id) {
      loadProfile();
      // Carregar stats com delay para não bloquear a renderização inicial
      setTimeout(() => {
        loadStats();
      }, 100);
    }
  }, [user]);

  // O hook useTheme já cuida de aplicar o tema no documento

  // Atualizar hora a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadProfile = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(data);
    } catch (error) {
      logger.error('Error loading profile:', error)
    }
  };

  const loadStats = async () => {
    if (!user?.id) return;

    try {
      // Buscar submissões do aluno
      const { data: submissions } = await supabase
        .from('submissions')
        .select('status, grade')
        .eq('student_id', user.id);

      const completed = submissions?.filter(s => 
        s.status === 'submitted' || s.status === 'graded'
      ).length || 0;

      const graded = submissions?.filter(s => s.grade !== null) || [];
      const avgGrade = graded.length > 0
        ? graded.reduce((sum, s) => sum + parseFloat(s.grade), 0) / graded.length
        : 0;

      // Buscar atividades pendentes
      const { data: myMemberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('role', 'student');

      const classIds = myMemberships?.map(m => m.class_id) || [];

      if (classIds.length > 0) {
        const { data: activityAssignments } = await supabase
          .from('activity_class_assignments')
          .select('activity_id, activity:activities(id, is_published, status)')
          .in('class_id', classIds);

        const publishedActivities = activityAssignments
          ?.map(a => a.activity)
          .filter(a => a?.is_published && a?.status === 'active') || [];

        const submissionsMap = new Map(
          submissions?.map(s => [s.activity_id, s]) || []
        );

        const pending = publishedActivities.filter(act =>
          !submissionsMap.has(act.id)
        ).length;

        setStats({
          completedActivities: completed,
          pendingActivities: pending,
          avgGrade: parseFloat(avgGrade.toFixed(1))
        });
      } else {
        setStats({
          completedActivities: completed,
          pendingActivities: 0,
          avgGrade: parseFloat(avgGrade.toFixed(1))
        });
      }
    } catch (error) {
      logger.error('Error loading stats:', error)
    }
  };

  // toggleTheme agora é fornecido pelo hook useTheme

  const getCurrentDateTime = () => {
    return currentTime.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name) => {
    if (!name) return 'ES';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className={className}>
      <Card className="relative overflow-hidden border-0 shadow-md">
        {/* Gradiente azul claro */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-sky-400 to-blue-500 dark:from-cyan-600 dark:via-sky-600 dark:to-blue-700" />
        
        {/* Efeito de pontos decorativos */}
        <div className="absolute inset-0 opacity-10 dark:opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '16px 16px'
          }} />
        </div>

        {/* Conteúdo */}
        <div className="relative z-10 p-4">
          {/* Header: Badge + Data/Hora + Ícones */}
          <div className="flex items-center justify-between mb-2">
            <Badge 
              variant="secondary" 
              className="bg-white/90 dark:bg-white/95 text-sky-700 dark:text-sky-800 px-2 py-0.5 text-[10px] font-semibold border border-white/50 shadow-sm"
              aria-label="Tipo de usuário: Estudante"
            >
              Aluno
            </Badge>

            {/* Data/Hora centralizada */}
            <time className="text-white/90 dark:text-white/80 text-[10px] font-medium">
              {getCurrentDateTime()}
            </time>

            {/* Ícones */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={isDark ? 'Modo Claro' : 'Modo Escuro'}
              >
                {isDark ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
              <button
                className="p-1 rounded-md bg-white/20 hover:bg-white/30 dark:bg-white/10 dark:hover:bg-white/20 transition-all duration-200 relative focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="3 notificações não lidas"
                title="Notificações"
              >
                <Bell className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-orange-500 dark:bg-orange-600 rounded-full text-[8px] text-white flex items-center justify-center font-bold" aria-hidden="true">
                  3
                </span>
              </button>
            </div>
          </div>

          {/* Avatar e Info - Layout horizontal compacto */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-full bg-white/20 dark:bg-white/10 backdrop-blur-sm border-2 border-white/30 dark:border-white/20 flex items-center justify-center shadow-md flex-shrink-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={`Foto de perfil de ${profile.full_name || 'estudante'}`}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-white" aria-label="Iniciais do nome">
                  {getInitials(profile?.full_name || user?.email)}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-white dark:text-white truncate">
                {profile?.full_name || 'Estudante'}
              </h2>
              <p className="text-white/80 dark:text-white/70 text-xs truncate">
                {user?.email || 'email@example.com'}
              </p>
            </div>
          </div>

          {/* Stats Cards - 3 cards compactos */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-white/20 dark:bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/30 dark:border-white/20 text-center hover:bg-white/25 dark:hover:bg-white/15 transition-colors">
              <BookOpen className="w-4 h-4 text-yellow-300 dark:text-yellow-400 mx-auto mb-1" aria-hidden="true" />
              <p className="text-base font-bold text-white dark:text-white" aria-label={`${stats.completedActivities} atividades concluídas`}>
                {stats.completedActivities}
              </p>
              <p className="text-[10px] text-white/80 dark:text-white/70 font-medium leading-tight">
                Concluídas
              </p>
            </div>

            <div className="bg-white/20 dark:bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/30 dark:border-white/20 text-center hover:bg-white/25 dark:hover:bg-white/15 transition-colors">
              <TrendingUp className="w-4 h-4 text-orange-300 dark:text-orange-400 mx-auto mb-1" aria-hidden="true" />
              <p className="text-base font-bold text-white dark:text-white" aria-label={`${stats.pendingActivities} atividades pendentes`}>
                {stats.pendingActivities}
              </p>
              <p className="text-[10px] text-white/80 dark:text-white/70 font-medium leading-tight">
                Pendentes
              </p>
            </div>

            <div className="bg-white/20 dark:bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/30 dark:border-white/20 text-center hover:bg-white/25 dark:hover:bg-white/15 transition-colors">
              <Award className="w-4 h-4 text-cyan-300 dark:text-cyan-400 mx-auto mb-1" aria-hidden="true" />
              <p className="text-base font-bold text-white dark:text-white" aria-label={`Nota média ${stats.avgGrade.toFixed(1)}`}>
                {stats.avgGrade.toFixed(1)}
              </p>
              <p className="text-[10px] text-white/80 dark:text-white/70 font-medium leading-tight">
                Média
              </p>
            </div>
          </div>

          {/* Botões de Ação - 3 botões */}
          <div className="grid grid-cols-3 gap-2">
            <Link to="/students/profile" className="block">
              <button
                className="w-full bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 text-white border border-white/30 dark:border-white/20 text-xs h-9 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-md flex items-center justify-center gap-1 px-2"
                aria-label="Acessar meu perfil"
              >
                <User className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">Perfil</span>
              </button>
            </Link>
            
            <Link to="/students/history" className="block">
              <button
                className="w-full bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 text-white border border-white/30 dark:border-white/20 text-xs h-9 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-md flex items-center justify-center gap-1 px-2"
                aria-label="Ver histórico de atividades"
              >
                <FileText className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">Histórico</span>
              </button>
            </Link>
            
            <Link to="/students/settings" className="block">
              <button
                className="w-full bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 text-white border border-white/30 dark:border-white/20 text-xs h-9 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-md flex items-center justify-center gap-1 px-2"
                aria-label="Acessar configurações"
              >
                <Settings className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">Config</span>
              </button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StudentProfileCard;
