import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Users, BookOpen } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import ClassInviteService from '@/shared/services/classInviteService';
import ClassService from '@/shared/services/classService';

const JoinClassPage = () => {
  const { invitationCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [classData, setClassData] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [inviteMeta, setInviteMeta] = useState(null);

  useEffect(() => {
    // Esperar carregamento do estado de autenticação
    if (authLoading) return;

    // Se não estiver autenticado, redirecionar para login preservando a URL do convite
    if (!user || !profile) {
      navigate('/login', {
        replace: true,
        state: {
          redirectTo: location.pathname + location.search,
        },
      });
      return;
    }

    // Autenticado: carregar dados da turma
    loadClassData();
  }, [authLoading, user, profile, invitationCode, navigate, location]);

  const loadClassData = async () => {
    try {
      setLoading(true);
      setError(null);
      setInviteMeta(null);

      // Normalizar código
      const code = invitationCode?.replace(/\s/g, '').trim().toUpperCase();

      if (!code) {
        setError('Código de convite inválido');
        return;
      }
      let loadedClass = null;
      let loadedInvite = null;

      // 1) Tentar tratar como código de convite da tabela class_invitations
      try {
        const invite = await ClassInviteService.getInviteDetails(code);

        if (invite?.class) {
          loadedInvite = invite;
          loadedClass = {
            ...invite.class,
            invite_code: code,
            profiles: invite.class.teacher
              ? { full_name: invite.class.teacher.full_name }
              : undefined,
          };
        }
      } catch (inviteErr) {
        // Se o convite existir mas estiver expirado/inativo/sem vagas, tratamos com mensagem específica
        if (
          inviteErr?.message === 'Invitation is no longer active' ||
          inviteErr?.message === 'Invitation has expired' ||
          inviteErr?.message === 'Invitation has reached maximum uses'
        ) {
          setError('Este convite não está mais válido. Peça um novo link ao professor.');
          return;
        }

        // Para códigos que não existem em class_invitations, seguimos para o fallback em classes.invite_code
        logger.warn('Código não encontrado em class_invitations, tentando classes.invite_code', inviteErr);
      }

      // 2) Fallback: tratar como código direto da turma (classes.invite_code)
      if (!loadedClass) {
        try {
          const classInfo = await ClassService.getClassByInviteCode(code);

          loadedClass = {
            ...classInfo,
            profiles: classInfo.teacher
              ? { full_name: classInfo.teacher.full_name }
              : classInfo.profiles,
          };
        } catch (classErr) {
          logger.error('Erro ao buscar turma por código:', classErr);
          setError('Turma não encontrada ou código inválido');
          return;
        }
      }

      if (!loadedClass) {
        setError('Turma não encontrada ou código inválido');
        return;
      }

      setInviteMeta(loadedInvite);
      setClassData(loadedClass);

      // Verificar se já é membro
      const { data: membership } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', loadedClass.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (membership) {
        setError('Você já é membro desta turma');
        // Redirecionar para a turma após 2 segundos
        setTimeout(() => {
          if (profile.role === 'student') {
            navigate(`/students/classes/${loadedClass.id}`);
          } else {
            navigate(`/dashboard/classes/${loadedClass.id}`);
          }
        }, 2000);
        return;
      }
    } catch (err) {
      logger.error('Erro ao carregar turma:', err)
      setError('Erro ao processar convite');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async () => {
    if (!classData || !user) return;

    try {
      setJoining(true);
      setError(null);
      const normalizedCode = invitationCode?.replace(/\s/g, '').trim().toUpperCase();

      if (inviteMeta) {
        // Fluxo via ClassInviteService (convite dedicado na tabela class_invitations)
        try {
          const result = await ClassInviteService.acceptInvite(normalizedCode, user.id);

          setSuccess(true);

          const targetClassId = result.classId || inviteMeta.class_id || classData.id;

          setTimeout(() => {
            if (profile.role === 'student') {
              navigate(`/students/classes/${targetClassId}`);
            } else {
              navigate(`/dashboard/classes/${targetClassId}`);
            }
          }, 1500);
        } catch (inviteErr) {
          logger.error('Erro ao aceitar convite:', inviteErr);
          setError(inviteErr.message || 'Erro ao entrar na turma. Tente novamente.');
        }
      } else {
        // Fluxo por código direto da turma (classes.invite_code)
        const { error: joinError } = await supabase
          .from('class_members')
          .insert({
            class_id: classData.id,
            user_id: user.id,
            role: profile.role === 'teacher' ? 'teacher' : 'student',
            joined_at: new Date().toISOString()
          });

        if (joinError) throw joinError;

        setSuccess(true);

        // Redirecionar após 1.5 segundos
        setTimeout(() => {
          if (profile.role === 'student') {
            navigate(`/students/classes/${classData.id}`);
          } else {
            navigate(`/dashboard/classes/${classData.id}`);
          }
        }, 1500);
      }
    } catch (err) {
      logger.error('Erro ao entrar na turma:', err)
      setError('Erro ao entrar na turma. Tente novamente.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6">
        <Card className="p-12 text-center max-w-md w-full">
          <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-spin" />
          <h2 className="text-xl font-bold mb-2">Carregando convite...</h2>
          <p className="text-slate-600 dark:text-slate-400">Aguarde um momento</p>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6">
        <Card className="p-12 text-center max-w-md w-full">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-green-900 dark:text-green-100">
            🎉 Bem-vindo(a)!
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
            Você entrou na turma <strong>{classData?.name}</strong>
          </p>
          <p className="text-sm text-slate-500">
            Redirecionando...
          </p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6">
        <Card className="p-12 text-center max-w-md w-full">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-red-900 dark:text-red-100">
            Ops! Algo deu errado
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
            {error}
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Voltar
            </Button>
            <Button
              onClick={() => {
                if (profile?.role === 'student') {
                  navigate('/student/classes');
                } else {
                  navigate('/dashboard');
                }
              }}
            >
              Ir para Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6">
        <Card className="p-12 text-center max-w-md w-full">
          <p className="text-slate-600 dark:text-slate-400">
            Carregando informações da turma...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6">
      <Card className="p-8 max-w-lg w-full">
        {/* Banner */}
        <div className={`h-32 -mx-8 -mt-8 mb-6 rounded-t-xl bg-gradient-to-r ${classData.banner_color || 'from-blue-500 to-purple-500'} flex items-center justify-center`}>
          <BookOpen className="w-16 h-16 text-white" />
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">
            Convite para Turma
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Você foi convidado(a) para entrar em:
          </p>
        </div>

        {/* Class Info */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {classData.name}
          </h2>
          {classData.subject && (
            <p className="text-lg text-slate-700 dark:text-slate-300 mb-3">
              📚 {classData.subject}
            </p>
          )}
          {classData.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              {classData.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users className="w-4 h-4" />
            <span>Professor(a): {classData.profiles?.full_name || 'Professor'}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(-1)}
            disabled={joining}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
            onClick={handleJoinClass}
            disabled={joining}
          >
            {joining ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar na Turma'
            )}
          </Button>
        </div>

        {/* Code Display */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500 mb-2">Código de Convite</p>
          <code className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded">
            {classData.invite_code}
          </code>
        </div>
      </Card>
    </div>
  );
};

export default JoinClassPage;
