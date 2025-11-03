import { logger } from '@/shared/utils/logger';
/**
 * 🤖 EDGE FUNCTION WRAPPER - CHATBOT
 * 
 * Wrapper para Edge Functions do chatbot:
 * - Consultas ao chatbot
 * - Treinamento com materiais da turma
 * - Histórico de conversas
 */

import { supabase } from '@/shared/services/supabaseClient';

/**
 * Envia uma consulta ao chatbot
 * @param {string} classId - ID da turma
 * @param {string} userId - ID do usuário
 * @param {string} message - Mensagem do usuário
 * @param {Array<Object>} conversationHistory - Histórico da conversa
 * @returns {Promise<Object>} Resposta do chatbot
 */
export const queryChatbot = async (classId, userId, message, conversationHistory = []) => {
  try {
    const { data, error } = await supabase.functions.invoke('chatbot-query', {
      body: {
        classId,
        userId,
        message,
        conversationHistory
      }
    });

    if (error) {
      logger.error('Erro na Edge Function chatbot-query:', error)
      throw error;
    }

    // Salvar interação no histórico
    await saveChatbotInteraction(classId, userId, message, data.response);

    return data;
  } catch (error) {
    logger.error('Erro ao consultar chatbot:', error)
    throw error;
  }
};

/**
 * Treina o chatbot com materiais da turma
 * @param {string} classId - ID da turma
 * @param {Array<Object>} materials - Materiais para treinamento
 * @param {Object} config - Configuração do treinamento
 * @returns {Promise<Object>} Resultado do treinamento
 */
export const trainChatbot = async (classId, materials, config = {}) => {
  try {
    const { data, error } = await supabase.functions.invoke('process-rag-training', {
      body: {
        classId,
        materials,
        config: {
          chunkSize: config.chunkSize || 1000,
          chunkOverlap: config.chunkOverlap || 200,
          embedModel: config.embedModel || 'text-embedding-ada-002',
          ...config
        }
      }
    });

    if (error) {
      logger.error('Erro na Edge Function process-rag-training:', error)
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Erro ao treinar chatbot:', error)
    throw error;
  }
};

/**
 * Salva interação do chatbot no banco
 * @param {string} classId - ID da turma
 * @param {string} userId - ID do usuário
 * @param {string} userMessage - Mensagem do usuário
 * @param {string} botResponse - Resposta do bot
 * @returns {Promise<Object>} Registro salvo
 */
export const saveChatbotInteraction = async (classId, userId, userMessage, botResponse) => {
  try {
    const { data, error } = await supabase
      .from('chatbot_interactions')
      .insert({
        class_id: classId,
        user_id: userId,
        user_message: userMessage,
        bot_response: botResponse,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error('Erro ao salvar interação:', error)
      // Não lançar erro - a interação já foi feita
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Erro ao salvar interação do chatbot:', error)
    return null;
  }
};

/**
 * Busca histórico de conversas do usuário
 * @param {string} classId - ID da turma
 * @param {string} userId - ID do usuário
 * @param {number} limit - Limite de mensagens
 * @returns {Promise<Array<Object>>} Histórico de conversas
 */
export const getChatbotHistory = async (classId, userId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('chatbot_interactions')
      .select('*')
      .eq('class_id', classId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Erro ao buscar histórico:', error)
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('Erro ao buscar histórico do chatbot:', error)
    return [];
  }
};

/**
 * Busca configuração do chatbot da turma
 * @param {string} classId - ID da turma
 * @returns {Promise<Object|null>} Configuração do chatbot
 */
export const getChatbotConfig = async (classId) => {
  try {
    const { data, error } = await supabase
      .from('chatbot_configurations')
      .select('*')
      .eq('class_id', classId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Nenhum registro encontrado
        return null;
      }
      logger.error('Erro ao buscar configuração:', error)
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Erro ao buscar configuração do chatbot:', error)
    return null;
  }
};

/**
 * Atualiza configuração do chatbot
 * @param {string} classId - ID da turma
 * @param {Object} config - Nova configuração
 * @returns {Promise<Object>} Configuração atualizada
 */
export const updateChatbotConfig = async (classId, config) => {
  try {
    const { data, error } = await supabase
      .from('chatbot_configurations')
      .upsert({
        class_id: classId,
        ...config,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error('Erro ao atualizar configuração:', error)
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Erro ao atualizar configuração do chatbot:', error)
    throw error;
  }
};

/**
 * Salva dados de treinamento do chatbot
 * @param {string} classId - ID da turma
 * @param {Array<Object>} trainingData - Dados de treinamento
 * @returns {Promise<Array<Object>>} Dados salvos
 */
export const saveChatbotTrainingData = async (classId, trainingData) => {
  try {
    const records = trainingData.map(item => ({
      class_id: classId,
      content: item.content,
      content_type: item.contentType || 'text',
      metadata: item.metadata || {},
      embedding: item.embedding || null,
      created_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('chatbot_training_data')
      .insert(records)
      .select();

    if (error) {
      logger.error('Erro ao salvar dados de treinamento:', error)
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Erro ao salvar dados de treinamento:', error)
    throw error;
  }
};
