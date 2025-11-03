import { logger } from '@/shared/utils/logger';
import { supabase } from '@/shared/services/supabaseClient';

/**
 * GamificationService - Gerencia XP, níveis, badges e achievements
 */

// Tabela de níveis (XP necessário para cada nível)
const LEVEL_THRESHOLDS = [
  0,      // Nível 1
  100,    // Nível 2
  250,    // Nível 3
  500,    // Nível 4
  1000,   // Nível 5
  2000,   // Nível 6
  3500,   // Nível 7
  5500,   // Nível 8
  8000,   // Nível 9
  11000,  // Nível 10
  15000,  // Nível 11
  20000,  // Nível 12
  26000,  // Nível 13
  33000,  // Nível 14
  41000,  // Nível 15
  50000,  // Nível 16
  60000,  // Nível 17
  72000,  // Nível 18
  85000,  // Nível 19
  100000, // Nível 20
  // Continua crescendo exponencialmente
];

const calculateLevel = (totalXP) => {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  // Se ultrapassar o último threshold, continua crescendo
  if (totalXP > LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]) {
    const lastThreshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    const excess = totalXP - lastThreshold;
    level = LEVEL_THRESHOLDS.length + Math.floor(excess / 10000);
  }
  return level;
};

const getXPForNextLevel = (currentXP) => {
  const currentLevel = calculateLevel(currentXP);
  if (currentLevel < LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[currentLevel];
  }
  // Após o último threshold, cada nível requer +10k XP
  const lastThreshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const levelsAbove = currentLevel - LEVEL_THRESHOLDS.length;
  return lastThreshold + ((levelsAbove + 1) * 10000);
};

// Helper: aggregate XP from xp_log if profiles table is unavailable
const aggregateXPFromLog = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('xp_log')
      .select('xp')
      .eq('user_id', userId);
    if (error) throw error;
    const total = (data || []).reduce((sum, r) => sum + (Number(r.xp) || 0), 0);
    const level = calculateLevel(total);
    return { totalXP: total, level };
  } catch (e) {
    return { totalXP: 0, level: 1 };
  }
};

class GamificationService {
  /**
   * Inicializa perfil de gamificação do usuário
   */
  async initializeProfile(userId) {
    try {
      const { data: existing } = await supabase
        .from('gamification_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (existing) return existing;

      const { data, error } = await supabase
        .from('gamification_profiles')
        .insert({
          user_id: userId,
          xp_total: 0,
          level: 1,
          current_streak: 0,
          longest_streak: 0,
          last_activity_at: null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      // Table may not exist; return a minimal synthetic profile
      const agg = await aggregateXPFromLog(userId);
      return {
        user_id: userId,
        xp_total: agg.totalXP,
        level: agg.level,
        current_streak: 0,
        longest_streak: 0,
        last_activity_at: null,
      };
    }
  }

  /**
   * Adiciona XP ao usuário
   * @param {string} userId 
   * @param {number} xp 
   * @param {string} source - origem do XP (ex: 'submission_on_time', 'quiz_completed')
   * @param {object} meta - metadados adicionais
   */
  async addXP(userId, xp, source, meta = {}) {
    try {
      // 1. Registrar no log
      const { error: logError } = await supabase
        .from('xp_log')
        .insert({
          user_id: userId,
          source,
          xp,
          meta,
        });

      if (logError) throw logError;

      // 2. Buscar/atualizar perfil quando disponível, senão seguir com fallback agregado
      let profile = null;
      let newTotalXP = 0;
      let newLevel = 1;
      let leveledUp = false;
      try {
        const { data: prof } = await supabase
          .from('gamification_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        profile = prof;
        if (!profile) {
          await this.initializeProfile(userId);
          profile = {
            user_id: userId,
            xp_total: 0,
            level: 1,
          };
        }
        newTotalXP = (profile.xp_total || 0) + xp;
        newLevel = calculateLevel(newTotalXP);
        leveledUp = newLevel > (profile.level || 1);
        const { error: updateError } = await supabase
          .from('gamification_profiles')
          .update({
            xp_total: newTotalXP,
            level: newLevel,
            last_activity_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
        if (updateError) throw updateError;
      } catch {
        // Fallback: compute from xp_log only
        const agg = await aggregateXPFromLog(userId);
        newTotalXP = agg.totalXP;
        newLevel = agg.level;
        leveledUp = false;
      }

      // 4. Verificar conquistas (badges)
      await this.checkBadges(userId, newLevel, newTotalXP);

      return {
        success: true,
        xp_added: xp,
        new_total_xp: newTotalXP,
        new_level: newLevel,
        leveled_up: leveledUp,
        xp_for_next_level: getXPForNextLevel(newTotalXP),
      };
    } catch (error) {
      logger.error('[GamificationService] Error adding XP:', error)
      throw error;
    }
  }

  /**
   * Verifica e concede badges baseado em critérios
   */
  async checkBadges(userId, currentLevel, totalXP) {
    try {
      // Buscar badges do catálogo
      const { data: badges } = await supabase
        .from('badges_catalog')
        .select('*');

      if (!badges) return;

      // Buscar badges já conquistados
      const { data: userBadges } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', userId);

      const earnedBadgeIds = new Set(userBadges?.map(b => b.badge_id) || []);

      // Verificar cada badge
      for (const badge of badges) {
        if (earnedBadgeIds.has(badge.id)) continue;

        let shouldGrant = false;
        const criteria = badge.criteria || {};

        // Badge de nível
        if (criteria.level && currentLevel >= criteria.level) {
          shouldGrant = true;
        }

        // Badge de streak (verificar depois em updateStreak)
        // Badge de conquistas específicas (verificar em outros métodos)

        if (shouldGrant) {
          await this.grantBadge(userId, badge.id);
        }
      }
    } catch (error) {
      logger.error('[GamificationService] Error checking badges:', error)
    }
  }

  /**
   * Concede um badge ao usuário
   */
  async grantBadge(userId, badgeId) {
    try {
      const { error } = await supabase
        .from('user_badges')
        .insert({
          user_id: userId,
          badge_id: badgeId,
        });

      if (error && error.code !== '23505') { // Ignora erro de duplicata
        throw error;
      }

      // Buscar info do badge para notificação
      const { data: badge } = await supabase
        .from('badges_catalog')
        .select('name, description')
        .eq('id', badgeId)
        .single();

      if (badge) {
        // Enviar notificação de badge desbloqueada
        try {
          const { NotificationOrchestrator } = await import('@/services/notificationOrchestrator');
          await NotificationOrchestrator.send('badgeEarned', {
            userId: userId,
            variables: {
              badgeName: badge.name,
              badgeDescription: badge.description,
              profileUrl: `/profile/${userId}`
            }
          });
        } catch (notifError) {
          logger.warn('[GamificationService] Badge notification error:', notifError)
        }
      }

      return { success: true };
    } catch (error) {
      logger.error('[GamificationService] Error granting badge:', error)
      throw error;
    }
  }

  /**
   * Atualiza streak do usuário
   */
  async updateStreak(userId) {
    try {
      const { data: profile } = await supabase
        .from('gamification_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profile) return; // silently skip if table/profile doesn't exist

      const now = new Date();
      const lastActivity = profile.last_activity_at ? new Date(profile.last_activity_at) : null;

      let newStreak = profile.current_streak;

      if (!lastActivity) {
        // Primeira atividade
        newStreak = 1;
      } else {
        const daysDiff = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
          // Mesma data, mantém streak
          return;
        } else if (daysDiff === 1) {
          // Dia seguido, incrementa
          newStreak = profile.current_streak + 1;
        } else {
          // Quebrou o streak
          newStreak = 1;
        }
      }

      const longestStreak = Math.max(newStreak, profile.longest_streak);

      await supabase
        .from('gamification_profiles')
        .update({
          current_streak: newStreak,
          longest_streak: longestStreak,
        })
        .eq('user_id', userId);

      // Verificar badges de streak
      const { data: streakBadges } = await supabase
        .from('badges_catalog')
        .select('*')
        .like('code', 'streak_%');

      for (const badge of streakBadges || []) {
        if (badge.criteria?.streak && newStreak >= badge.criteria.streak) {
          await this.grantBadge(userId, badge.id);
        }
      }

      // XP bônus por streaks
      if (newStreak === 7) {
        await this.addXP(userId, 50, 'streak_7_days', { streak: 7 });
      } else if (newStreak === 30) {
        await this.addXP(userId, 150, 'streak_30_days', { streak: 30 });
      } else if (newStreak === 100) {
        await this.addXP(userId, 500, 'streak_100_days', { streak: 100 });
      }

      return { current_streak: newStreak, longest_streak: longestStreak };
    } catch (error) {
      logger.error('[GamificationService] Error updating streak:', error)
      throw error;
    }
  }

  /**
   * Busca perfil completo de gamificação
   */
  async getProfile(userId) {
    try {
      const { data: profile, error } = await supabase
        .from('gamification_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!profile) {
        // Fallback synth profile from xp_log
        const agg = await aggregateXPFromLog(userId);
        const xpForNext = getXPForNextLevel(agg.totalXP);
        const currentLevelXP = agg.level < LEVEL_THRESHOLDS.length 
          ? LEVEL_THRESHOLDS[agg.level - 1] 
          : LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + ((agg.level - LEVEL_THRESHOLDS.length) * 10000);
        const progressToNext = agg.totalXP - currentLevelXP;
        const xpNeededForNext = xpForNext - currentLevelXP;
        const progressPercent = Math.min(100, Math.round((progressToNext / xpNeededForNext) * 100));
        return {
          user_id: userId,
          xp_total: agg.totalXP,
          level: agg.level,
          current_streak: 0,
          longest_streak: 0,
          last_activity_at: null,
          xp_for_next_level: xpForNext,
          progress_to_next_level: progressPercent,
          badges: [],
        };
      }

      const xpForNext = getXPForNextLevel(profile.xp_total);
      const currentLevelXP = profile.level < LEVEL_THRESHOLDS.length 
        ? LEVEL_THRESHOLDS[profile.level - 1] 
        : LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + ((profile.level - LEVEL_THRESHOLDS.length) * 10000);
      
      const progressToNext = profile.xp_total - currentLevelXP;
      const xpNeededForNext = xpForNext - currentLevelXP;
      const progressPercent = Math.min(100, Math.round((progressToNext / xpNeededForNext) * 100));

      // Buscar badges
      const { data: badges } = await supabase
        .from('user_badges')
        .select(`
          badge_id,
          granted_at,
          badges_catalog (
            code,
            name,
            icon_url
          )
        `)
        .eq('user_id', userId)
        .order('granted_at', { ascending: false });

      return {
        ...profile,
        xp_for_next_level: xpForNext,
        progress_to_next_level: progressPercent,
        badges: badges || [],
      };
    } catch (error) {
      // Final fallback to avoid breaking UI: return synthetic profile
      const agg = await aggregateXPFromLog(userId);
      const xpForNext = getXPForNextLevel(agg.totalXP);
      const currentLevelXP = agg.level < LEVEL_THRESHOLDS.length 
        ? LEVEL_THRESHOLDS[agg.level - 1] 
        : LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + ((agg.level - LEVEL_THRESHOLDS.length) * 10000);
      const progressToNext = agg.totalXP - currentLevelXP;
      const xpNeededForNext = xpForNext - currentLevelXP;
      const progressPercent = Math.min(100, Math.round((progressToNext / xpNeededForNext) * 100));
      return {
        user_id: userId,
        xp_total: agg.totalXP,
        level: agg.level,
        current_streak: 0,
        longest_streak: 0,
        last_activity_at: null,
        xp_for_next_level: xpForNext,
        progress_to_next_level: progressPercent,
        badges: [],
      };
    }
  }

  /**
   * Busca ranking da turma
   */
  async getClassRanking(classId, period = 'weekly') {
    try {
      // Buscar snapshot mais recente
      const { data: snapshot } = await supabase
        .from('class_rank_snapshots')
        .select('*')
        .eq('class_id', classId)
        .eq('period', period)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (snapshot) {
        return snapshot.rank_data;
      }

      // Se não existe snapshot, gerar na hora (fallback)
      return await this.generateClassRanking(classId, period);
    } catch (error) {
      logger.error('[GamificationService] Error getting class ranking:', error)
      throw error;
    }
  }

  /**
   * Gera ranking da turma (chamado por job ou on-demand)
   */
  async generateClassRanking(classId, period = 'weekly') {
    try {
      // Buscar membros da turma
      const { data: members } = await supabase
        .from('class_members')
        .select('user_id')
        .eq('class_id', classId)
        .eq('role', 'student');

      if (!members || members.length === 0) return [];

      const userIds = members.map(m => m.user_id);

      // Buscar perfis de gamificação; se indisponível, usar soma do xp_log
      let profiles = [];
      try {
        const { data: profs } = await supabase
          .from('gamification_profiles')
          .select('user_id, xp_total, level')
          .in('user_id', userIds)
          .order('xp_total', { ascending: false });
        profiles = profs || [];
      } catch {
        profiles = [];
      }

      if (!profiles || profiles.length === 0) {
        const { data: xpAgg } = await supabase
          .from('xp_log')
          .select('user_id, xp');
        const sums = new Map();
        for (const r of xpAgg || []) {
          if (!userIds.includes(r.user_id)) continue;
          sums.set(r.user_id, (sums.get(r.user_id) || 0) + (Number(r.xp) || 0));
        }
        profiles = Array.from(sums.entries()).map(([uid, total]) => ({
          user_id: uid,
          xp_total: total,
          level: calculateLevel(total),
        })).sort((a, b) => b.xp_total - a.xp_total);
      }

      // Buscar nomes dos usuários
      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const userMap = new Map(users?.map(u => [u.id, u.full_name]) || []);

      const ranking = profiles.map((p, index) => ({
        position: index + 1,
        user_id: p.user_id,
        user_name: userMap.get(p.user_id) || 'Usuário',
        xp: p.xp_total,
        level: p.level,
      }));

      return ranking;
    } catch (error) {
      logger.error('[GamificationService] Error generating ranking:', error)
      throw error;
    }
  }
}

export default new GamificationService();
