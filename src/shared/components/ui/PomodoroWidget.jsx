import { logger } from '@/shared/utils/logger';
import React, { useEffect, useRef, useState } from 'react';
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen';
import { Clock, Play, Pause, RotateCcw, Award, Target } from 'lucide-react';
import { PremiumCard, PremiumButton, toast } from '@/components/ui';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';

  const PomodoroWidget = ({ variant = 'full', onComplete }) => {
  const { user } = useAuth();
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            handleSessionComplete();
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
  return () => clearInterval(intervalRef.current);
  }, [isActive, minutes, seconds]);

  const handleSessionComplete = async () => {
    setIsActive(false);
    playSound();

    if (!isBreak) {
      // Pomodoro completo - dar XP ao aluno
      setSessionsCompleted((prev) => prev + 1);

      // Calcular XP baseado no tempo de sessão
      const xpEarned = minutes === 25 ? 10 : minutes === 50 ? 20 : 5;

      if (user && user.user_metadata?.role === 'student') {
        try {
          // Registrar XP
          await supabase.from('xp_log').insert({
            user_id: user.id,
            xp: xpEarned,
            reason: `Pomodoro completo (${minutes + 1} min)`,
            source: 'pomodoro',
          });

          toast({
            title: '🎉 Sessão Completa!',
            description: `Parabéns! Você ganhou ${xpEarned} XP!`,
            variant: 'success',
          });
        } catch (error) {
          logger.error('Erro ao registrar XP:', error)
        }
      } else {
        toast({
          title: '✅ Sessão Completa!',
          description: 'Ótimo trabalho! Hora de uma pausa.',
          variant: 'success',
        });
      }

      // Iniciar intervalo automático
      setIsBreak(true);
      setMinutes(5);
      setSeconds(0);
    } else {
      // Intervalo completo
      toast({
        title: '⏰ Intervalo Completo!',
        description: 'Hora de voltar ao trabalho!',
        variant: 'default',
      });
      setIsBreak(false);
      setMinutes(25);
      setSeconds(0);
    }

    if (onComplete) onComplete();
  };

  const playSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {
        // Fallback se não tiver o arquivo de som
        if (window.navigator.vibrate) {
          window.navigator.vibrate([200, 100, 200]);
        }
      });
    } catch (e) {
      // Silently fail
    }
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setMinutes(25);
    setSeconds(0);
  };

  const setCustomTime = (mins) => {
    setIsActive(false);
    setIsBreak(false);
    setMinutes(mins);
    setSeconds(0);
  };

  const progress = ((((isBreak ? 5 : 25) - minutes) * 60 + (60 - seconds)) / ((isBreak ? 5 : 25) * 60)) * 100;

  if (variant === 'compact') {
  return (
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-200 dark:border-blue-800 text-white hover:opacity-90">
        <Clock className="w-5 h-5 text-blue-600" />
        <div className="flex-1">
          <div className="text-2xl font-bold font-mono">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <div className="text-xs text-muted-foreground">{isBreak ? 'Intervalo' : 'Foco'}</div>
        </div>
        <PremiumButton size="sm" onClick={toggleTimer} variant={isActive ? 'destructive' : 'default'}>
          {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </PremiumButton>
      </div>
    );
  }
  return (
    <PremiumCard variant="elevated">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-slate-900 dark:text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Pomodoro Timer</h3>
              <p className="text-sm text-muted-foreground">{isBreak ? 'Tempo de Intervalo' : 'Tempo de Foco'}</p>
            </div>
          </div>
          {user?.user_metadata?.role === 'student' && (
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 rounded-lg">
              <Award className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-semibold text-yellow-600">
                {sessionsCompleted * 10} XP hoje
              </span>
            </div>
          )}
        </div>

        {/* Timer Display */}
        <div className="relative">
          {/* Progress Circle */}
          <svg className="w-full h-64" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-muted"
            />
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 90}`}
              strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
              transform="rotate(-90 100 100)"
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>

          {/* Time Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-6xl font-bold font-mono bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent text-white hover:opacity-90">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            <div className="text-sm text-muted-foreground mt-2">{Math.round(progress)}% completo</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <PremiumButton onClick={toggleTimer} className="flex-1" size="lg" variant={isActive ? 'destructive' : 'default'}>
            {isActive ? (
              <>
                <Pause className="w-5 h-5 mr-2" />
                Pausar
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Iniciar
              </>
            )}
          </PremiumButton>
          <PremiumButton onClick={resetTimer} variant="outline" size="lg">
            <RotateCcw className="w-5 h-5" />
          </PremiumButton>
        </div>

        {/* Preset Times */}
        {!isActive && (
          <div className="flex gap-2">
            <button onClick={() => setCustomTime(25)} className="flex-1 px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors">
              25 min
            </button>
            <button onClick={() => setCustomTime(50)} className="flex-1 px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors">
              50 min
            </button>
            <button onClick={() => setCustomTime(5)} className="flex-1 px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors">
              5 min
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{sessionsCompleted}</div>
            <div className="text-xs text-muted-foreground">Sessões Hoje</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-600">{sessionsCompleted * 25}</div>
            <div className="text-xs text-muted-foreground">Minutos de Foco</div>
          </div>
        </div>

        {/* Info */}
        {user?.user_metadata?.role === 'student' && (
          <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 p-3 rounded-lg text-center text-white hover:opacity-90">
            <p className="text-sm text-muted-foreground">
              ✨ Complete sessões e ganhe <strong className="text-blue-600">10 XP</strong> por sessão de 25min!
            </p>
          </div>
        )}
      </div>
    </PremiumCard>
  );
};

export default PomodoroWidget;
