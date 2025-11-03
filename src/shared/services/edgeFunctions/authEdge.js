import { logger } from '@/shared/utils/logger';
/**
 * 🔐 EDGE FUNCTION WRAPPER - AUTHENTICATION
 * 
 * Wrapper para Edge Functions de autenticação:
 * - Guards de login/registro
 * - Callbacks de sucesso
 * - Onboarding de usuários
 */

import { supabase } from '@/shared/services/supabaseClient';

/**
 * Valida login antes de processar
 * @param {string} email - Email do usuário
 * @param {string} password - Senha
 * @returns {Promise<Object>} Resultado da validação
 */
export const validateLogin = async (email, password) => {
  try {
    const { data, error } = await supabase.functions.invoke('auth-guard-login', {
      body: { email, password }
    });

    if (error) {
      logger.error('Erro na Edge Function auth-guard-login:', error)
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Erro ao validar login:', error)
    throw error;
  }
};

/**
 * Valida registro antes de processar
 * @param {Object} userData - Dados do usuário
 * @returns {Promise<Object>} Resultado da validação
 */
export const validateRegister = async (userData) => {
  try {
    const { data, error } = await supabase.functions.invoke('auth-guard-register', {
      body: userData
    });

    if (error) {
      logger.error('Erro na Edge Function auth-guard-register:', error)
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Erro ao validar registro:', error)
    throw error;
  }
};

/**
 * Callback executado após login bem-sucedido
 * @param {string} userId - ID do usuário
 * @returns {Promise<Object>} Resultado do callback
 */
export const onLoginSuccess = async (userId) => {
  try {
    const { data, error } = await supabase.functions.invoke('auth-login-success', {
      body: { userId }
    });

    if (error) {
      logger.error('Erro na Edge Function auth-login-success:', error)
      // Não lançar erro - não deve bloquear o login
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Erro no callback de login:', error)
    return null;
  }
};

/**
 * Callback executado após registro bem-sucedido
 * @param {string} userId - ID do usuário
 * @param {Object} userData - Dados do usuário
 * @returns {Promise<Object>} Resultado do callback
 */
export const onRegisterSuccess = async (userId, userData) => {
  try {
    const { data, error } = await supabase.functions.invoke('auth-register-success', {
      body: { userId, userData }
    });

    if (error) {
      logger.error('Erro na Edge Function auth-register-success:', error)
      // Não lançar erro - não deve bloquear o registro
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Erro no callback de registro:', error)
    return null;
  }
};

/**
 * Processa onboarding de novo usuário
 * @param {string} userId - ID do usuário
 * @param {Object} onboardingData - Dados do onboarding
 * @returns {Promise<Object>} Resultado do onboarding
 */
export const processUserOnboarding = async (userId, onboardingData) => {
  try {
    const { data, error } = await supabase.functions.invoke('user-onboarding', {
      body: {
        userId,
        role: onboardingData.role,
        subjects: onboardingData.subjects || [],
        preferences: onboardingData.preferences || {}
      }
    });

    if (error) {
      logger.error('Erro na Edge Function user-onboarding:', error)
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Erro ao processar onboarding:', error)
    throw error;
  }
};

/**
 * Busca informações do usuário autenticado
 * @returns {Promise<Object|null>} Dados do usuário
 */
export const getAuthenticatedUser = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('auth-me');

    if (error) {
      logger.error('Erro na Edge Function auth-me:', error)
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Erro ao buscar usuário autenticado:', error)
    return null;
  }
};

/**
 * Valida termos de uso aceitos
 * @param {string} userId - ID do usuário
 * @param {string} termsVersion - Versão dos termos
 * @returns {Promise<Object>} Resultado da validação
 */
export const acceptTerms = async (userId, termsVersion) => {
  try {
    const { data, error } = await supabase.functions.invoke('terms-acceptance-audit', {
      body: {
        userId,
        termsVersion,
        acceptedAt: new Date().toISOString()
      }
    });

    if (error) {
      logger.error('Erro ao registrar aceite de termos:', error)
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Erro ao aceitar termos:', error)
    throw error;
  }
};
