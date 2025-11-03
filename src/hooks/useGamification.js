import { logger } from '@/shared/utils/logger';
import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import gamificationService from '@/services/gamificationService';
import missionsService from '@/services/missionsService';
import { NotificationOrchestrator } from '@/services/notificationOrchestrator';

// Event bus para notificações de XP
const xpEventBus = {
  listeners: [],
  emit: (xp, reason) => {
    xpEventBus.listeners.forEach(listener => listener(xp, reason));
  },
  subscribe: (listener) => {
    xpEventBus.listeners.push(listener);
    return () => {
      xpEventBus.listeners = xpEventBus.listeners.filter(l => l !== listener);
    };
  },
};

/**
 * Hook para integração de gamificação
 * Facilita a adição de XP e tracking de eventos
 */
export const useGamification = () => {
  const { user } = useAuth();

  /**
   * Registra submissão de atividade e adiciona XP
   */
  const trackSubmission = useCallback(async (submissionData) => {
    if (!user?.id) return;

    try {
      const { dueDate, submittedAt, grade } = submissionData;
      const now = new Date(submittedAt || new Date());
      const due = dueDate ? new Date(dueDate) : null;

      let xp = 0;
      const events = [];

      // XP por entrega no prazo
      if (due) {
        const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 1) {
          // Entrega com antecedência
          xp += 15;
          events.push({ type: 'early_submission' });
        } else if (diffDays >= 0) {
          // Entrega no prazo
          xp += 10;
        }
        // Se atrasado, não ganha XP de prazo
      } else {
        // Sem prazo definido, dá XP base
        xp += 10;
      }

      // XP por nota (se já tiver nota)
      if (grade !== null && grade !== undefined) {
        if (grade >= 9.0) {
          xp += 20;
          events.push({ type: 'perfect_score' });
        } else if (grade >= 7.0) {
          xp += 15;
        }
      }

      // Adicionar XP
      if (xp > 0) {
        const result = await gamificationService.addXP(
          user.id,
          xp,
          'submission',
          {
            activity_id: submissionData.activityId,
            on_time: due ? now <= due : true,
            early: due ? now < due : false,
            grade: grade,
          }
        );
        
        // Emitir evento para notificação
        xpEventBus.emit(xp, 'submission');
        
        // Notificação de XP ganho
        try {
          await NotificationOrchestrator.send('xpEarned', {
            userId: user.id,
            variables: {
              xp: xp.toString(),
              reason: 'Atividade submetida',
              totalXP: (result?.profile?.xp_total || 0).toString()
            }
          });
        } catch (notifError) {
          logger.warn('[useGamification] Notification error:', notifError)
        }
      }

      // Atualizar streak
      await gamificationService.updateStreak(user.id);

      // Tracking de missões
      await missionsService.trackEvent(user.id, 'submit');
      
      // Eventos adicionais
      for (const event of events) {
        await missionsService.trackEvent(user.id, event.type);
      }

      return { success: true, xp_earned: xp };
    } catch (error) {
      logger.error('[useGamification] Error tracking submission:', error)
      return { success: false, error };
    }
  }, [user?.id]);

  /**
   * Registra completar quiz
   */
  const trackQuiz = useCallback(async (quizData) => {
    if (!user?.id) return;

    try {
      const xp = 10; // XP base por quiz

      await gamificationService.addXP(
        user.id,
        xp,
        'quiz_completed',
        {
          quiz_id: quizData.quizId,
          score: quizData.score,
        }
      );
      
      // Emitir evento para notificação
      xpEventBus.emit(xp, 'quiz');

      await missionsService.trackEvent(user.id, 'quiz');

      return { success: true, xp_earned: xp };
    } catch (error) {
      logger.error('[useGamification] Error tracking quiz:', error)
      return { success: false, error };
    }
  }, [user?.id]);

  /**
   * Registra nota atribuída (para quando professor corrigir)
   * Com multiplicador baseado na nota (quanto maior, mais XP)
   */
  const trackGradeAssigned = useCallback(async (submissionData) => {
    if (!user?.id) return;

    try {
      const { grade, studentId } = submissionData;
      let xp = 0;
      let multiplier = 1.0;
      let bonusReason = null;

      // XP BASE por receber nota (independente do valor)
      const baseXP = 10;

      // MULTIPLICADOR baseado na nota (0-10)
      // Nota 0-4.9: 0.5x (5 XP)
      // Nota 5-6.9: 1.0x (10 XP)
      // Nota 7-7.9: 1.5x (15 XP)
      // Nota 8-8.9: 2.0x (20 XP)
      // Nota 9-9.5: 2.5x (25 XP)
      // Nota 9.6-10: 3.0x (30 XP)
      
      if (grade >= 9.6) {
        multiplier = 3.0;
        bonusReason = 'perfect_score';
        await missionsService.trackEvent(studentId, 'perfect_score');
      } else if (grade >= 9.0) {
        multiplier = 2.5;
        bonusReason = 'excellent_grade';
      } else if (grade >= 8.0) {
        multiplier = 2.0;
        bonusReason = 'great_grade';
      } else if (grade >= 7.0) {
        multiplier = 1.5;
        bonusReason = 'good_grade';
      } else if (grade >= 5.0) {
        multiplier = 1.0;
      } else {
        multiplier = 0.5;
      }

      // Calcular XP final
      xp = Math.floor(baseXP * multiplier);

      // BÔNUS ADICIONAL para notas 10.0
      if (grade === 10.0) {
        const perfectBonus = 20;
        xp += perfectBonus;
        bonusReason = 'perfect_10';
      }

      if (xp > 0) {
        const result = await gamificationService.addXP(
          studentId,
          xp,
          'grade_received',
          {
            grade: grade,
            multiplier: multiplier,
            base_xp: baseXP,
            bonus_reason: bonusReason,
            activity_id: submissionData.activityId,
          }
        );

        // Emitir evento para notificação
        xpEventBus.emit(xp, 'grade', { grade, multiplier });
        
        // Notificação de XP ganho por nota
        try {
          await NotificationOrchestrator.send('xpEarned', {
            userId: studentId,
            variables: {
              xp: xp.toString(),
              reason: `Nota ${grade.toFixed(1)} recebida`,
              totalXP: (result?.profile?.xp_total || 0).toString()
            }
          });
        } catch (notifError) {
          logger.warn('[useGamification] Notification error:', notifError)
        }
      }

      return { 
        success: true, 
        xp_earned: xp, 
        multiplier: multiplier,
        bonus_reason: bonusReason 
      };
    } catch (error) {
      logger.error('[useGamification] Error tracking grade:', error)
      return { success: false, error };
    }
  }, [user?.id]);

  /**
   * Inicializa perfil de gamificação (primeira vez)
   */
  const initializeProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      await gamificationService.initializeProfile(user.id);
      await missionsService.initializeMissions(user.id);
      return { success: true };
    } catch (error) {
      logger.error('[useGamification] Error initializing profile:', error)
      return { success: false, error };
    }
  }, [user?.id]);

  return {
    trackSubmission,
    trackQuiz,
    trackGradeAssigned,
    initializeProfile,
  };
};

export { xpEventBus };
export default useGamification;
