import { logger } from '@/shared/utils/logger';
/**
 * 🔒 EDGE FUNCTION WRAPPER - PLAGIARISM CHECK
 * 
 * Wrapper para a Edge Function de verificação de plágio com:
 * - Cache de resultados
 * - Rate limiting
 * - Segurança da API key
 * - Retry automático
 */

import { supabase } from '@/lib/supabaseClient';

/**
 * Verifica plágio usando Edge Function com cache
 * @param {string} text - Texto a ser verificado
 * @param {string} submissionId - ID da submissão
 * @returns {Promise<Object>} Resultado da verificação
 */
export const checkPlagiarismEdge = async (text, submissionId) => {
  try {
    // Chamar Edge Function com cache
    const { data, error } = await supabase.functions.invoke('plagiarism-check-v2', {
      body: {
        text,
        submissionId,
        useCache: true
      }
    });

    if (error) {
      logger.error('Erro na Edge Function plagiarism-check-v2:', error)
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Erro ao chamar Edge Function de plágio:', error)
    throw error;
  }
};

/**
 * Busca resultado de verificação em cache
 * @param {string} submissionId - ID da submissão
 * @returns {Promise<Object|null>} Resultado em cache ou null
 */
export const getCachedPlagiarismCheck = async (submissionId) => {
  try {
    const { data, error } = await supabase.functions.invoke('plagiarism-check-cached', {
      body: { submissionId }
    });

    if (error) {
      logger.error('Erro ao buscar cache:', error)
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Erro ao buscar cache de plágio:', error)
    return null;
  }
};

/**
 * Processa verificações de plágio em lote
 * @param {Array<Object>} submissions - Array de submissões
 * @returns {Promise<Array<Object>>} Resultados das verificações
 */
export const processPlagiarismBatch = async (submissions) => {
  try {
    const { data, error } = await supabase.functions.invoke('process-plagiarism-checks', {
      body: { submissions }
    });

    if (error) {
      logger.error('Erro no processamento em lote:', error)
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Erro ao processar lote de plágio:', error)
    throw error;
  }
};

/**
 * Salva resultado de verificação no banco
 * @param {string} submissionId - ID da submissão
 * @param {Object} result - Resultado da verificação
 * @returns {Promise<Object>} Registro salvo
 */
export const savePlagiarismResult = async (submissionId, result) => {
  try {
    const { data, error } = await supabase
      .from('plagiarism_checks')
      .insert({
        submission_id: submissionId,
        plagiarism_percentage: result.plagiarismPercentage || 0,
        ai_generated: result.isAiGenerated || false,
        ai_score: result.aiScore || 0,
        sources: result.sources || [],
        raw_data: result.rawData || {}
      })
      .select()
      .single();

    if (error) {
      logger.error('Erro ao salvar resultado:', error)
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Erro ao salvar resultado de plágio:', error)
    throw error;
  }
};

/**
 * Busca histórico de verificações de uma submissão
 * @param {string} submissionId - ID da submissão
 * @returns {Promise<Array<Object>>} Histórico de verificações
 */
export const getPlagiarismHistory = async (submissionId) => {
  try {
    const { data, error } = await supabase
      .from('plagiarism_checks')
      .select('*')
      .eq('submission_id', submissionId)
      .order('checked_at', { ascending: false });

    if (error) {
      logger.error('Erro ao buscar histórico:', error)
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('Erro ao buscar histórico de plágio:', error)
    return [];
  }
};
