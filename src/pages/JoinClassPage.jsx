import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Users, BookOpen } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';

const JoinClassPage = () => {
  const { invitationCode } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [classData, setClassData] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user && profile) {
      loadClassData();
    }
  }, [invitationCode, user, profile]);

  const loadClassData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Normalizar código
      const code = invitationCode?.replace(/\s/g, '').trim().toUpperCase();

      if (!code) {
        setError('Código de convite inválido');
        return;
      }

      // Buscar turma pelo código
      const { data: classInfo, error: classError } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          subject,
          description,
          color,
          banner_color,
          invite_code,
          created_by,
          profiles:created_by(full_name)
        `)
        .eq('invite_code', code)
        .eq('is_active', true)
        .single();

      if (classError || !classInfo) {
        setError('Turma não encontrada ou código inválido');
        return;
      }

      // Verificar se já é membro
      const { data: membership } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', classInfo.id)
        .eq('user_id', user.id)
        .single();

      if (membership) {
        setError('Você já é membro desta turma');
        // Redirecionar para a turma após 2 segundos
        setTimeout(() => {
          if (profile.role === 'student') {
            navigate(`/student/classes/${classInfo.id}`);
          } else {
            navigate(`/dashboard/classes/${classInfo.id}`);
          }
        }, 2000);
        return;
      }

      setClassData(classInfo);
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

      // Adicionar como membro
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
          navigate(`/student/classes/${classData.id}`);
        } else {
          navigate(`/dashboard/classes/${classData.id}`);
        }
      }, 1500);

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
