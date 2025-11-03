import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Users, BookOpen, ArrowRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';

const JoinClassWithCodePage = () => {
  const { code: urlCode } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [code, setCode] = useState(urlCode || '');
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [classData, setClassData] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Se veio código na URL, buscar automaticamente
    if (urlCode && user && profile) {
      handleSearchClass(urlCode);
    }
  }, [urlCode, user, profile]);

  const handleSearchClass = async (searchCode = code) => {
    try {
      setLoading(true);
      setError(null);
      setClassData(null);

      const normalizedCode = searchCode.replace(/\s/g, '').trim().toUpperCase();

      if (!normalizedCode) {
        setError('Digite um código válido');
        return;
      }

      if (normalizedCode.length !== 8) {
        setError('O código deve ter 8 caracteres');
        return;
      }

      // Buscar turma
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
        .eq('invite_code', normalizedCode)
        .eq('is_active', true)
        .single();

      if (classError || !classInfo) {
        setError('Turma não encontrada. Verifique o código e tente novamente.');
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
      logger.error('Erro ao buscar turma:', err)
      setError('Erro ao buscar turma. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async () => {
    if (!classData || !user) return;

    try {
      setJoining(true);
      setError(null);

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

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6">
        <Card className="p-12 text-center max-w-md w-full">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-green-900 dark:text-green-100">
            🎉 Parabéns!
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
            Você entrou na turma <strong>{classData?.name}</strong>
          </p>
          <p className="text-sm text-slate-500">
            Redirecionando para a turma...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6">
      <Card className="p-8 max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">
            Entrar em uma Turma
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Digite o código de convite da turma
          </p>
        </div>

        {/* Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Código da Turma
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={code}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                if (value.length <= 8) {
                  setCode(value);
                  setError(null);
                  setClassData(null);
                }
              }}
              placeholder="EX: ABC12345"
              className="font-mono text-lg text-center tracking-wider"
              maxLength={8}
              disabled={loading || joining}
            />
            <Button
              onClick={() => handleSearchClass()}
              disabled={loading || joining || !code.trim() || code.length !== 8}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            O código tem 8 caracteres e é fornecido pelo professor
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Class Preview */}
        {classData && (
          <div className="mb-6">
            <div className={`h-24 -mx-8 mb-4 rounded-xl bg-gradient-to-r ${classData.banner_color || 'from-blue-500 to-purple-500'} flex items-center justify-center`}>
              <BookOpen className="w-12 h-12 text-white" />
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {classData.name}
              </h3>
              {classData.subject && (
                <p className="text-slate-700 dark:text-slate-300 mb-2">
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

            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
              onClick={handleJoinClass}
              disabled={joining}
              size="lg"
            >
              {joining ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Entrar nesta Turma
                </>
              )}
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => {
              if (profile?.role === 'student') {
                navigate('/student/classes');
              } else {
                navigate('/dashboard');
              }
            }}
            disabled={loading || joining}
          >
            Cancelar
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default JoinClassWithCodePage;
