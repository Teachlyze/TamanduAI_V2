import { logger } from '@/shared/utils/logger';
import { supabase } from '@/shared/services/supabaseClient';
import gamificationService from './gamificationService';

/**
 * FocusService - Gerencia sessões de foco/Pomodoro
 */

const POMODORO_CONFIGS = {
  pomodoro25: {
    work: 25,
    break: 5,
    xp: 5,
    label: 'Pomodoro Clássico (25/5)',
  },
  pomodoro50: {
    work: 50,
    break: 10,
    xp: 12,
    label: 'Pomodoro Longo (50/10)',
  },
  pomodoro30: {
    work: 30,
    break: 5,
    xp: 7,
    label: 'Pomodoro Médio (30/5)',
  },
};

const DAILY_XP_LIMIT = 50; // Limite diário de XP por foco

class FocusService {
  /**
   * Inicia uma sessão de foco
   */
  async startSession(userId, technique = 'pomodoro25') {
    try {
      const { data, error } = await supabase
        .from('focus_sessions')
        .insert({
          user_id: userId,
          started_at: new Date().toISOString(),
          technique,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        session: data,
        config: POMODORO_CONFIGS[technique],
      };
    } catch (error) {
      logger.error('[FocusService] Error starting session:', error)
      throw error;
    }
  }

  /**
   * Finaliza uma sessão de foco
   */
  async endSession(sessionId, userId) {
    try {
      const endedAt = new Date().toISOString();

      // Buscar sessão
      const { data: session, error: fetchError } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Calcular duração
      const startedAt = new Date(session.started_at);
      const endTime = new Date(endedAt);
      const durationMin = Math.floor((endTime - startedAt) / (1000 * 60));

      // Atualizar sessão
      const { error: updateError } = await supabase
        .from('focus_sessions')
        .update({
          ended_at: endedAt,
          duration_min: durationMin,
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Calcular XP (somente se completou tempo mínimo)
      const config = POMODORO_CONFIGS[session.technique];
      let xpEarned = 0;

      if (durationMin >= config.work) {
        // Verificar limite diário
        const dailyXP = await this.getDailyFocusXP(userId);

        if (dailyXP < DAILY_XP_LIMIT) {
          xpEarned = Math.min(config.xp, DAILY_XP_LIMIT - dailyXP);
          
          if (xpEarned > 0) {
            await gamificationService.addXP(
              userId,
              xpEarned,
              'focus_session',
              {
                session_id: sessionId,
                technique: session.technique,
                duration_min: durationMin,
              }
            );
          }
        }
      }

      return {
        success: true,
        duration_min: durationMin,
        xp_earned: xpEarned,
        completed: durationMin >= config.work,
      };
    } catch (error) {
      logger.error('[FocusService] Error ending session:', error)
      throw error;
    }
  }

  /**
   * Busca XP de foco ganho hoje
   */
  async getDailyFocusXP(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('xp_log')
        .select('xp')
        .eq('user_id', userId)
        .eq('source', 'focus_session')
        .gte('created_at', today.toISOString());

      if (error) throw error;

      const total = data?.reduce((sum, log) => sum + log.xp, 0) || 0;
      return total;
    } catch (error) {
      logger.error('[FocusService] Error getting daily focus XP:', error)
      return 0;
    }
  }

  /**
   * Busca estatísticas de foco do usuário
   */
  async getStats(userId) {
    try {
      const { data: sessions, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', userId)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false });

      if (error) throw error;

      const totalSessions = sessions?.length || 0;
      const totalMinutes = sessions?.reduce((sum, s) => sum + (s.duration_min || 0), 0) || 0;
      const totalHours = Math.floor(totalMinutes / 60);

      // Sessões por técnica
      const byTechnique = {
        pomodoro25: 0,
        pomodoro50: 0,
        pomodoro30: 0,
      };

      sessions?.forEach(s => {
        if (byTechnique[s.technique] !== undefined) {
          byTechnique[s.technique]++;
        }
      });

      // Últimas 7 sessões
      const recentSessions = sessions?.slice(0, 7) || [];

      // XP ganho hoje
      const dailyXP = await this.getDailyFocusXP(userId);
      const dailyXPRemaining = Math.max(0, DAILY_XP_LIMIT - dailyXP);

      return {
        total_sessions: totalSessions,
        total_minutes: totalMinutes,
        total_hours: totalHours,
        by_technique: byTechnique,
        recent_sessions: recentSessions,
        daily_xp_earned: dailyXP,
        daily_xp_remaining: dailyXPRemaining,
        daily_xp_limit: DAILY_XP_LIMIT,
      };
    } catch (error) {
      logger.error('[FocusService] Error getting stats:', error)
      throw error;
    }
  }

  /**
   * Busca sessão ativa do usuário
   */
  async getActiveSession(userId) {
    try {
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', userId)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        return {
          session: data,
          config: POMODORO_CONFIGS[data.technique],
        };
      }

      return null;
    } catch (error) {
      logger.error('[FocusService] Error getting active session:', error)
      return null;
    }
  }

  /**
   * Cancela sessão ativa
   */
  async cancelSession(sessionId, userId) {
    try {
      const { error } = await supabase
        .from('focus_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      logger.error('[FocusService] Error canceling session:', error)
      throw error;
    }
  }

  /**
   * Retorna configurações disponíveis
   */
  getConfigs() {
    return POMODORO_CONFIGS;
  }
}

export default new FocusService();
