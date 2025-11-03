import { logger } from '@/shared/utils/logger';
import { supabase } from '@/shared/services/supabaseClient';
import { checkChatbotLimit } from '@/shared/services/rateLimiter';
import teacherSubscriptionService from '@/shared/services/teacherSubscriptionService';

/**
 * Serviço de Chatbot com Rate Limiting integrado
 */
class ChatbotWithRateLimit {
  /**
   * Envia mensagem para o chatbot com verificação de rate limit
   * @param {string} classId - ID da turma
   * @param {string} userId - ID do usuário
   * @param {string} message - Mensagem do usuário
   * @returns {Promise<Object>}
   */
  async sendMessage(classId, userId, message) {
    try {
      // 1. Buscar plano do usuário
      const userPlan = await this.getUserPlan(userId);

      // 2. Verificar rate limit
      const rateLimit = await checkChatbotLimit(userId, userPlan);

      if (!rateLimit.allowed) {
        return {
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: rateLimit.message,
          limit: rateLimit.limit,
          remaining: 0,
          resetAt: rateLimit.resetAt,
          upgrade: this.getUpgradeMessage(userPlan),
        };
      }

      // 3. Verificar se chatbot está habilitado para a turma
      const { data: config, error: configError } = await supabase
        .from('chatbot_configurations')
        .select('*')
        .eq('class_id', classId)
        .single();

      if (configError || !config?.enabled) {
        return {
          success: false,
          error: 'CHATBOT_DISABLED',
          message: 'Chatbot não está habilitado para esta turma.',
        };
      }

      // 4. Salvar mensagem do usuário
      const { data: conversation, error: convError } = await supabase
        .from('chatbot_conversations')
        .insert({
          class_id: classId,
          user_id: userId,
          message: message,
          role: 'user',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (convError) throw convError;

      // 5. Chamar edge function para processar com RAG
      const { data: response, error: aiError } = await supabase.functions.invoke(
        'chatbot-rag',
        {
          body: {
            class_id: classId,
            user_id: userId,
            message: message,
            conversation_id: conversation.id,
          },
        }
      );

      if (aiError) throw aiError;

      // 6. Salvar resposta do bot
      await supabase.from('chatbot_conversations').insert({
        class_id: classId,
        user_id: userId,
        message: response.answer,
        role: 'assistant',
        metadata: {
          sources: response.sources || [],
          confidence: response.confidence || null,
        },
        created_at: new Date().toISOString(),
      });

      // 7. Retornar sucesso com info de rate limit
      return {
        success: true,
        answer: response.answer,
        sources: response.sources || [],
        confidence: response.confidence || null,
        rateLimit: {
          remaining: rateLimit.remaining - 1,
          limit: rateLimit.limit,
          resetAt: rateLimit.resetAt,
        },
      };
    } catch (error) {
      logger.error('[ChatbotWithRateLimit] Error:', error)
      return {
        success: false,
        error: 'CHATBOT_ERROR',
        message: 'Erro ao processar mensagem. Tente novamente.',
        details: error.message,
      };
    }
  }

  /**
   * Busca plano do usuário (professor ou escola)
   */
  async getUserPlan(userId) {
    try {
      // Verificar se é professor
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (profile?.role === 'teacher') {
        const subscription = await teacherSubscriptionService.getSubscription(userId);
        return subscription.plan_type || 'free';
      }

      // Se for aluno, verificar plano da turma/escola
      if (profile?.role === 'student') {
        // Buscar turma do aluno
        const { data: classMember } = await supabase
          .from('class_members')
          .select('class_id, classes!inner(school_id)')
          .eq('user_id', userId)
          .limit(1)
          .single();

        if (classMember?.classes?.school_id) {
          // Turma vinculada a escola - sem limite
          return 'enterprise';
        }

        // Buscar plano do professor da turma
        const { data: classData } = await supabase
          .from('classes')
          .select('created_by')
          .eq('id', classMember.class_id)
          .single();

        if (classData) {
          const teacherSub = await teacherSubscriptionService.getSubscription(
            classData.created_by
          );
          return teacherSub.plan_type || 'free';
        }
      }

      // Default: free
      return 'free';
    } catch (error) {
      logger.error('[ChatbotWithRateLimit] Error getting user plan:', error)
      return 'free';
    }
  }

  /**
   * Gera mensagem de upgrade baseado no plano
   */
  getUpgradeMessage(currentPlan) {
    const upgrades = {
      free: 'Faça upgrade para Basic (50 msgs/dia) ou Pro (200 msgs/dia) para continuar usando o chatbot.',
      basic: 'Faça upgrade para Pro (200 msgs/dia) ou Enterprise (ilimitado) para mais mensagens.',
      pro: 'Faça upgrade para Enterprise para mensagens ilimitadas.',
      enterprise: null,
    };

    return upgrades[currentPlan] || upgrades.free;
  }

  /**
   * Busca histórico de conversas
   */
  async getConversationHistory(classId, userId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('chatbot_conversations')
        .select('*')
        .eq('class_id', classId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        success: true,
        conversations: data || [],
      };
    } catch (error) {
      logger.error('[ChatbotWithRateLimit] Error getting history:', error)
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verifica status do rate limit sem consumir
   */
  async checkLimit(userId) {
    try {
      const userPlan = await this.getUserPlan(userId);
      const rateLimit = await checkChatbotLimit(userId, userPlan);

      return {
        success: true,
        allowed: rateLimit.allowed,
        remaining: rateLimit.remaining,
        limit: rateLimit.limit,
        resetAt: rateLimit.resetAt,
        plan: userPlan,
        message: rateLimit.message,
      };
    } catch (error) {
      logger.error('[ChatbotWithRateLimit] Error checking limit:', error)
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Registra feedback do usuário sobre a resposta
   */
  async submitFeedback(conversationId, rating, comment = null) {
    try {
      const { error } = await supabase.from('chatbot_feedback').insert({
        conversation_id: conversationId,
        rating: rating, // 1-5 ou thumbs up/down
        comment: comment,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      logger.error('[ChatbotWithRateLimit] Error submitting feedback:', error)
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new ChatbotWithRateLimit();
