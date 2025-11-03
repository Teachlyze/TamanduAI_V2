import { logger } from '@/shared/utils/logger';
import { supabase } from '@/shared/services/supabaseClient';
import gamificationService from './gamificationService';

/**
 * MissionsService - Gerencia missões diárias e semanais
 */

class MissionsService {
  /**
   * Inicializa missões do usuário (diárias e semanais)
   */
  async initializeMissions(userId) {
    try {
      // Buscar catálogo de missões
      const { data: missions, error } = await supabase
        .from('missions_catalog')
        .select('*');

      if (error) throw error;

      // Verificar quais missões o usuário já tem
      const { data: userMissions } = await supabase
        .from('user_missions')
        .select('mission_id')
        .eq('user_id', userId);

      const existingMissionIds = new Set(userMissions?.map(m => m.mission_id) || []);

      // Criar missões que faltam
      const now = new Date();
      const dailyReset = new Date(now);
      dailyReset.setHours(23, 59, 59, 999);

      const weeklyReset = new Date(now);
      weeklyReset.setDate(now.getDate() + (7 - now.getDay())); // Próximo domingo
      weeklyReset.setHours(23, 59, 59, 999);

      const newMissions = missions
        ?.filter(m => !existingMissionIds.has(m.id))
        .map(m => ({
          user_id: userId,
          mission_id: m.id,
          status: 'active',
          progress: {},
          reset_at: m.type === 'daily' ? dailyReset.toISOString() : weeklyReset.toISOString(),
        })) || [];

      if (newMissions.length > 0) {
        // Usar UPSERT para evitar conflito 409 com PRIMARY KEY (user_id, mission_id)
        await supabase
          .from('user_missions')
          .upsert(newMissions, { onConflict: 'user_id,mission_id' });
      }

      return { success: true, initialized: newMissions.length };
    } catch (error) {
      logger.error('[MissionsService] Error initializing missions:', error)
      throw error;
    }
  }

  /**
   * Busca missões do usuário
   */
  async getUserMissions(userId, type = null) {
    try {
      let query = supabase
        .from('user_missions')
        .select(`
          *,
          missions_catalog (
            id,
            type,
            code,
            name,
            rules,
            reward_xp
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (type) {
        query = query.eq('missions_catalog.type', type);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Verificar se precisa resetar missões expiradas
      const now = new Date();
      const expired = data?.filter(m => new Date(m.reset_at) < now) || [];

      if (expired.length > 0) {
        await this.resetExpiredMissions(userId, expired);
        // Recarregar após reset
        return this.getUserMissions(userId, type);
      }

      return data || [];
    } catch (error) {
      logger.error('[MissionsService] Error getting user missions:', error)
      throw error;
    }
  }

  /**
   * Reseta missões expiradas
   */
  async resetExpiredMissions(userId, expiredMissions) {
    try {
      const now = new Date();
      
      const updates = expiredMissions.map(m => {
        const catalog = m.missions_catalog;
        let newResetAt;

        if (catalog.type === 'daily') {
          newResetAt = new Date(now);
          newResetAt.setHours(23, 59, 59, 999);
        } else {
          newResetAt = new Date(now);
          newResetAt.setDate(now.getDate() + (7 - now.getDay()));
          newResetAt.setHours(23, 59, 59, 999);
        }

        return {
          user_id: userId,
          mission_id: m.mission_id,
          status: 'active',
          progress: {},
          reset_at: newResetAt.toISOString(),
        };
      });

      // Deletar antigas
      const missionIds = expiredMissions.map(m => m.mission_id);
      await supabase
        .from('user_missions')
        .delete()
        .eq('user_id', userId)
        .in('mission_id', missionIds);

      // Usar UPSERT para inserir/atualizar missões resetadas
      await supabase
        .from('user_missions')
        .upsert(updates, { onConflict: 'user_id,mission_id' });

      return { success: true, reset: updates.length };
    } catch (error) {
      logger.error('[MissionsService] Error resetting missions:', error)
      throw error;
    }
  }

  /**
   * Atualiza progresso de uma missão
   */
  async updateProgress(userId, missionCode, progressData) {
    try {
      // Buscar missão
      const { data: catalog } = await supabase
        .from('missions_catalog')
        .select('id, rules, reward_xp')
        .eq('code', missionCode)
        .single();

      if (!catalog) return { success: false, message: 'Mission not found' };

      const { data: userMission } = await supabase
        .from('user_missions')
        .select('*')
        .eq('user_id', userId)
        .eq('mission_id', catalog.id)
        .eq('status', 'active')
        .single();

      if (!userMission) return { success: false, message: 'User mission not found' };

      // Atualizar progresso
      const currentProgress = userMission.progress || {};
      const newProgress = { ...currentProgress, ...progressData };

      // Verificar se completou
      const completed = this.checkMissionComplete(catalog.rules, newProgress);

      if (completed) {
        // Marcar como completa
        await supabase
          .from('user_missions')
          .update({
            status: 'completed',
            progress: newProgress,
          })
          .eq('user_id', userId)
          .eq('mission_id', catalog.id);

        // Dar XP
        await gamificationService.addXP(
          userId,
          catalog.reward_xp,
          `mission_${missionCode}`,
          { mission_code: missionCode }
        );

        return {
          success: true,
          completed: true,
          xp_earned: catalog.reward_xp,
        };
      } else {
        // Apenas atualizar progresso
        await supabase
          .from('user_missions')
          .update({ progress: newProgress })
          .eq('user_id', userId)
          .eq('mission_id', catalog.id);

        return {
          success: true,
          completed: false,
          progress: newProgress,
        };
      }
    } catch (error) {
      logger.error('[MissionsService] Error updating progress:', error)
      throw error;
    }
  }

  /**
   * Verifica se missão foi completada baseado nas regras
   */
  checkMissionComplete(rules, progress) {
    const type = rules.type;

    switch (type) {
      case 'submit':
        return (progress.submissions || 0) >= rules.count;
      case 'quiz':
        return (progress.quizzes || 0) >= rules.count;
      case 'focus':
        if (rules.minutes) {
          return (progress.minutes || 0) >= rules.minutes;
        }
        if (rules.hours) {
          return (progress.minutes || 0) >= (rules.hours * 60);
        }
        return false;
      case 'login':
        return progress.logged_in === true;
      case 'perfect_score':
        return (progress.perfect_scores || 0) >= 1;
      case 'early_submission':
        return (progress.early_submissions || 0) >= 1;
      case 'all_on_time':
        return progress.all_on_time === true;
      case 'perfect_scores':
        return (progress.perfect_scores || 0) >= rules.count;
      case 'streak':
        return (progress.streak_days || 0) >= rules.days;
      case 'improve_average':
        return (progress.improvement_percent || 0) >= rules.percent;
      default:
        return false;
    }
  }

  /**
   * Registra evento de missão (ex: submission, quiz, etc)
   */
  async trackEvent(userId, eventType, data = {}) {
    try {
      // Buscar missões ativas relevantes
      const missions = await this.getUserMissions(userId);

      for (const mission of missions) {
        const rules = mission.missions_catalog.rules;
        
        if (rules.type === eventType) {
          const currentProgress = mission.progress || {};
          let newProgress = { ...currentProgress };

          switch (eventType) {
            case 'submit':
              newProgress.submissions = (currentProgress.submissions || 0) + 1;
              break;
            case 'quiz':
              newProgress.quizzes = (currentProgress.quizzes || 0) + 1;
              break;
            case 'focus':
              newProgress.minutes = (currentProgress.minutes || 0) + (data.minutes || 0);
              break;
            case 'login':
              newProgress.logged_in = true;
              break;
            case 'perfect_score':
              newProgress.perfect_scores = (currentProgress.perfect_scores || 0) + 1;
              break;
            case 'early_submission':
              newProgress.early_submissions = (currentProgress.early_submissions || 0) + 1;
              break;
          }

          await this.updateProgress(userId, mission.missions_catalog.code, newProgress);
        }
      }

      return { success: true };
    } catch (error) {
      logger.error('[MissionsService] Error tracking event:', error)
      throw error;
    }
  }
}

export default new MissionsService();
