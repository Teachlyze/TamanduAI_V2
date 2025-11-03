import { logger } from '@/shared/utils/logger';
import { supabase } from '@/shared/services/supabaseClient';

/**
 * LogService - Grava logs no banco de dados (tabela logger)
 * Substitui console.log/error/warn para ter rastreabilidade
 */

class LogService {
  /**
   * Grava log genérico no banco
   * @param {string} level - 'info', 'warn', 'error', 'debug'
   * @param {string} message - Mensagem do log
   * @param {object} metadata - Dados adicionais (opcional)
   * @param {Error} error - Objeto de erro (opcional)
   */
  async log(level, message, metadata = {}, error = null) {
    try {
      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();

      // Preparar payload
      const logEntry = {
        level,
        message,
        metadata: {
          ...metadata,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          url: typeof window !== 'undefined' ? window.location.href : null,
          timestamp: new Date().toISOString(),
        },
        user_id: user?.id || null,
        error_stack: error?.stack || null,
        error_name: error?.name || null,
        error_message: error?.message || null,
        created_at: new Date().toISOString(),
      };

      // Inserir no banco
      const { error: dbError } = await supabase
        .from('logger')
        .insert([logEntry]);

      if (dbError) {
        // Fallback para console se falhar
        logger.error('[LogService] Erro ao gravar log no banco:', dbError)
        this._fallbackToConsole(level, message, metadata, error);
      }
    } catch (err) {
      // Fallback para console em caso de erro crítico
      this._fallbackToConsole(level, message, metadata, error);
      logger.error('[LogService] Erro crítico:', err)
    }
  }

  /**
   * Fallback para console quando DB falha
   */
  _fallbackToConsole(level, message, metadata, error) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] ${level.toUpperCase()}:`;
    
    switch (level) {
      case 'error':
        logger.error(prefix, message, metadata, error)
        break;
      case 'warn':
        logger.warn(prefix, message, metadata)
        break;
      case 'info':
        logger.debug(prefix, message, metadata)
        break;
      case 'debug':
        logger.debug(prefix, message, metadata)
        break;
      default:
        logger.debug(prefix, message, metadata)
    }
  }

  /**
   * Log de informação
   */
  async info(message, metadata = {}) {
    await this.log('info', message, metadata);
  }

  /**
   * Log de aviso
   */
  async warn(message, metadata = {}) {
    await this.log('warn', message, metadata);
  }

  /**
   * Log de erro
   */
  async error(message, metadata = {}, error = null) {
    await this.log('error', message, metadata, error);
  }

  /**
   * Log de debug
   */
  async debug(message, metadata = {}) {
    await this.log('debug', message, metadata);
  }

  /**
   * Buscar logs do banco (para admin/debug)
   * @param {object} filters - Filtros opcionais
   * @returns {Promise<Array>}
   */
  async getLogs(filters = {}) {
    try {
      let query = supabase
        .from('logger')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters.limit || 100);

      // Filtro por nível
      if (filters.level) {
        query = query.eq('level', filters.level);
      }

      // Filtro por usuário
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      // Filtro por data
      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('[LogService] Erro ao buscar logs:', error)
      return [];
    }
  }

  /**
   * Limpar logs antigos (manutenção)
   * @param {number} daysToKeep - Dias para manter (padrão 30)
   */
  async cleanOldLogs(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { error } = await supabase
        .from('logger')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) throw error;
      
      this.info('Logs antigos limpos', { daysToKeep, cutoffDate: cutoffDate.toISOString() });
    } catch (error) {
      this.error('Erro ao limpar logs antigos', {}, error);
    }
  }
}

export default new LogService();
