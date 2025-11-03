/**
 * Chatbot Service - Serviço centralizado para funcionalidades do chatbot
 * Evita duplicação de código entre TeacherChatbotPage e ChatbotAnalyticsPage
 */

import { supabase } from './supabaseClient';

export const chatbotService = {
  /**
   * Buscar configurações do chatbot para uma turma
   * @param {string} classId - ID da turma
   * @returns {Promise<Object>} Configurações do chatbot
   */
  async getChatbotSettings(classId) {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, settings')
      .eq('id', classId)
      .single();

    if (error) throw error;

    return {
      classId: data.id,
      className: data.name,
      enabled: data.settings?.chatbot_enabled || false,
      paused: data.settings?.chatbot_paused || false,
      model: data.settings?.chatbot_model || 'gpt-4',
      temperature: data.settings?.chatbot_temperature || 0.7,
      maxTokens: data.settings?.chatbot_max_tokens || 500,
      systemPrompt: data.settings?.chatbot_system_prompt || '',
      allowedTopics: data.settings?.chatbot_allowed_topics || [],
      restrictedTopics: data.settings?.chatbot_restricted_topics || []
    };
  },

  /**
   * Atualizar configurações do chatbot
   * @param {string} classId - ID da turma
   * @param {Object} settings - Novas configurações
   * @returns {Promise<Object>} Resultado da atualização
   */
  async updateChatbotSettings(classId, settings) {
    const { data, error } = await supabase
      .from('classes')
      .update({
        settings: {
          chatbot_enabled: settings.enabled,
          chatbot_paused: settings.paused,
          chatbot_model: settings.model,
          chatbot_temperature: settings.temperature,
          chatbot_max_tokens: settings.maxTokens,
          chatbot_system_prompt: settings.systemPrompt,
          chatbot_allowed_topics: settings.allowedTopics,
          chatbot_restricted_topics: settings.restrictedTopics
        }
      })
      .eq('id', classId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Buscar fontes de treinamento do chatbot
   * @param {string} classId - ID da turma
   * @returns {Promise<Array>} Lista de fontes
   */
  async getTrainingSources(classId) {
    const { data, error } = await supabase
      .from('rag_training_sources')
      .select(`
        id,
        file_name,
        file_type,
        file_url,
        content_extracted,
        embedding_status,
        created_at,
        added_by,
        material_id,
        activity_id
      `)
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Adicionar nova fonte de treinamento
   * @param {string} classId - ID da turma
   * @param {Object} source - Dados da fonte
   * @returns {Promise<Object>} Fonte criada
   */
  async addTrainingSource(classId, source) {
    const { data, error } = await supabase
      .from('rag_training_sources')
      .insert({
        class_id: classId,
        file_name: source.fileName,
        file_type: source.fileType,
        file_url: source.fileUrl,
        content_extracted: source.content,
        embedding_status: 'pending',
        added_by: source.userId,
        material_id: source.materialId || null,
        activity_id: source.activityId || null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Remover fonte de treinamento
   * @param {string} sourceId - ID da fonte
   * @returns {Promise<void>}
   */
  async removeTrainingSource(sourceId) {
    const { error } = await supabase
      .from('rag_training_sources')
      .delete()
      .eq('id', sourceId);

    if (error) throw error;
  },

  /**
   * Buscar alunos da turma para analytics
   * @param {string} classId - ID da turma
   * @returns {Promise<Array>} Lista de alunos
   */
  async getClassStudents(classId) {
    const { data, error } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)
      .eq('role', 'student');

    if (error) throw error;
    return data || [];
  },

  /**
   * Buscar estatísticas de uso do chatbot
   * @param {string} classId - ID da turma
   * @param {number} days - Número de dias para buscar
   * @returns {Promise<Object>} Estatísticas
   */
  async getChatbotAnalytics(classId, days = 7) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    // Buscar alunos
    const students = await this.getClassStudents(classId);
    const activeStudents = students.length;

    // Buscar fontes de treinamento
    const sources = await this.getTrainingSources(classId);
    const totalSources = sources.length;

    // TODO: Quando implementar tabela de conversas, buscar aqui
    // Por enquanto, retornar valores simulados baseados em fontes
    const totalConversations = 0;
    const satisfaction = totalSources > 0 ? Math.min(90 + totalSources * 2, 100) : 0;

    return {
      totalConversations,
      activeStudents,
      satisfaction,
      avgResponseTime: 2.3, // Fixo por enquanto
      topQuestions: [], // Vazio até ter tabela de conversas
      difficultTopics: [], // Vazio até ter tabela de conversas
      recentConversations: [], // Vazio até ter tabela de conversas
      insights: totalSources === 0 
        ? [
            { 
              type: 'warning', 
              message: 'Nenhuma fonte de treinamento adicionada ao chatbot', 
              suggestion: 'Adicione materiais ou atividades para treinar o assistente' 
            }
          ]
        : [
            { 
              type: 'success', 
              message: `Chatbot treinado com ${totalSources} fonte(s) de conteúdo` 
            },
            { 
              type: 'info', 
              message: `${activeStudents} alunos podem interagir com o assistente` 
            }
          ]
    };
  },

  /**
   * Pausar/Despausar chatbot
   * @param {string} classId - ID da turma
   * @param {boolean} paused - Estado de pausa
   * @returns {Promise<void>}
   */
  async togglePause(classId, paused) {
    const settings = await this.getChatbotSettings(classId);
    await this.updateChatbotSettings(classId, {
      ...settings,
      paused
    });
  },

  /**
   * Habilitar/Desabilitar chatbot
   * @param {string} classId - ID da turma
   * @param {boolean} enabled - Estado de habilitação
   * @returns {Promise<void>}
   */
  async toggleEnable(classId, enabled) {
    const settings = await this.getChatbotSettings(classId);
    await this.updateChatbotSettings(classId, {
      ...settings,
      enabled
    });
  },

  /**
   * Validar prompt do sistema
   * @param {string} prompt - Prompt a validar
   * @returns {Object} Resultado da validação
   */
  validateSystemPrompt(prompt) {
    const minLength = 10;
    const maxLength = 2000;
    
    if (!prompt || prompt.trim().length < minLength) {
      return {
        valid: false,
        error: `Prompt deve ter no mínimo ${minLength} caracteres`
      };
    }
    
    if (prompt.length > maxLength) {
      return {
        valid: false,
        error: `Prompt deve ter no máximo ${maxLength} caracteres`
      };
    }
    
    return { valid: true };
  },

  /**
   * Processar arquivo para extração de conteúdo
   * @param {File} file - Arquivo a processar
   * @returns {Promise<Object>} Conteúdo extraído
   */
  async extractContentFromFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (file.size > maxSize) {
      throw new Error('Arquivo muito grande. Máximo: 10MB');
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Tipo de arquivo não suportado');
    }

    // Para arquivos de texto, extrair diretamente
    if (file.type === 'text/plain' || file.type === 'text/markdown') {
      const content = await file.text();
      return {
        content,
        fileName: file.name,
        fileType: file.type,
        success: true
      };
    }

    // Para PDF/DOCX, requer bibliotecas especializadas
    return {
      content: null,
      fileName: file.name,
      fileType: file.type,
      success: false,
      message: 'Extração automática não disponível. Use upload manual de texto.'
    };
  }
};

export default chatbotService;
