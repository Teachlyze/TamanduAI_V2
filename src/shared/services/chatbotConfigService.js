import { supabase } from '@/shared/services/supabaseClient';
import { 
  trainChatbot as trainChatbotEdge,
  getChatbotConfig,
  updateChatbotConfig,
  saveChatbotTrainingData 
} from '@/shared/services/edgeFunctions';

/**
 * Serviço de configuração do Chatbot Educacional
 */
class ChatbotConfigService {
  /**
   * Configura o chatbot para uma turma específica
   * @param {string} classId - ID da turma
   * @param {Object} config - Configurações do chatbot
   */
  async configureChatbot(classId, config) {
    try {
      const { data, error } = await supabase
        .from('chatbot_configurations')
        .upsert([{
          class_id: classId,
          keywords: config.keywords || [],
          themes: config.themes || [],
          scope_restrictions: config.scopeRestrictions || [],
          enabled: config.enabled !== false,
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao configurar chatbot:', error);
      throw error;
    }
  }

  /**
   * Coleta materiais da turma para treinamento
   * @param {string} classId - ID da turma
   */
  async collectClassMaterials(classId) {
    try {
      // Buscar todos os materiais postados na turma
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('id, title, description, attachments')
        .eq('class_id', classId);

      if (activitiesError) throw activitiesError;

      // Buscar posts da turma
      const { data: posts, error: postsError } = await supabase
        .from('class_posts')
        .select('id, content, attachments')
        .eq('class_id', classId);

      if (postsError) throw postsError;

      // Filtrar arquivos de texto/documentos
      const materials = [];

      activities.forEach(activity => {
        if (activity.description) {
          materials.push({
            type: 'activity_description',
            id: activity.id,
            content: activity.description,
            title: activity.title
          });
        }

        if (activity.attachments) {
          activity.attachments.forEach(attachment => {
            if (this.isDocumentFile(attachment.type)) {
              materials.push({
                type: 'activity_file',
                id: activity.id,
                url: attachment.url,
                name: attachment.name,
                fileType: attachment.type
              });
            }
          });
        }
      });

      posts?.forEach(post => {
        if (post.content) {
          materials.push({
            type: 'class_post',
            id: post.id,
            content: post.content
          });
        }

        if (post.attachments) {
          post.attachments.forEach(attachment => {
            if (this.isDocumentFile(attachment.type)) {
              materials.push({
                type: 'post_file',
                id: post.id,
                url: attachment.url,
                name: attachment.name,
                fileType: attachment.type
              });
            }
          });
        }
      });

      return materials;
    } catch (error) {
      console.error('Erro ao coletar materiais:', error);
      throw error;
    }
  }

  /**
   * Treina o chatbot com os materiais coletados usando Edge Functions
   * @param {string} classId - ID da turma
   * @param {Array} materials - Materiais para treinamento
   */
  async trainChatbot(classId, materials) {
    try {
      // Processar materiais em lote
      const trainingData = await this.processMaterials(materials);

      // Usar Edge Function para treinamento (RAG com embeddings)
      console.log('🤖 Usando Edge Function para treinamento do chatbot...');
      const result = await trainChatbotEdge(classId, trainingData, {
        chunkSize: 1000,
        chunkOverlap: 200
      });

      // Salvar dados de treinamento usando Edge Function
      await saveChatbotTrainingData(classId, trainingData.map(item => ({
        content: item.content,
        contentType: 'text',
        metadata: item.metadata || {}
      })));

      // Marcar chatbot como treinado usando Edge Function
      await updateChatbotConfig(classId, {
        is_trained: true,
        last_training: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error('Erro ao treinar chatbot:', error);
      throw error;
    }
  }

  /**
   * Processa materiais para formato de treinamento
   */
  async processMaterials(materials) {
    const processed = [];

    for (const material of materials) {
      if (material.content) {
        // Texto já disponível
        processed.push({
          source: material.type,
          content: material.content,
          metadata: {
            id: material.id,
            title: material.title
          }
        });
      } else if (material.url) {
        // Baixar e extrair texto de arquivos
        try {
          const text = await this.extractTextFromFile(material.url, material.fileType);
          if (text) {
            processed.push({
              source: material.type,
              content: text,
              metadata: {
                id: material.id,
                filename: material.name,
                fileType: material.fileType
              }
            });
          }
        } catch (error) {
          console.error(`Erro ao processar arquivo ${material.name}:`, error);
        }
      }
    }

    return processed;
  }

  /**
   * Extrai texto de arquivos
   */
  async extractTextFromFile(url, fileType) {
    // Implementação simplificada - na prática, usar bibliotecas específicas
    // para cada tipo de arquivo (pdf.js para PDF, docx para DOCX, etc)
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      if (fileType.includes('text')) {
        return await blob.text();
      }
      
      // Para outros formatos, retornar null
      // Implementar parsers específicos conforme necessário
      return null;
    } catch (error) {
      console.error('Erro ao extrair texto:', error);
      return null;
    }
  }

  /**
   * Verifica se é um arquivo de documento válido
   */
  isDocumentFile(mimeType) {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/msword', // DOC
      'text/plain',
      'text/markdown'
    ];
    return validTypes.includes(mimeType);
  }

  /**
   * Registra interação do chatbot
   */
  async logInteraction(classId, studentId, question, answer) {
    try {
      const { error } = await supabase
        .from('chatbot_interactions')
        .insert([{
          class_id: classId,
          student_id: studentId,
          question,
          answer,
          timestamp: new Date().toISOString()
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao registrar interação:', error);
    }
  }

  /**
   * Busca histórico de interações
   */
  async getInteractionHistory(classId, options = {}) {
    try {
      let query = supabase
        .from('chatbot_interactions')
        .select(`
          *,
          student:profiles!student_id(id, full_name)
        `)
        .eq('class_id', classId)
        .order('timestamp', { ascending: false });

      if (options.studentId) {
        query = query.eq('student_id', options.studentId);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }
  }

  /**
   * Atualiza restrições de escopo
   */
  async updateScopeRestrictions(classId, restrictions) {
    try {
      const { error } = await supabase
        .from('chatbot_configurations')
        .update({ scope_restrictions: restrictions })
        .eq('class_id', classId);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar restrições:', error);
      throw error;
    }
  }

  /**
   * Verifica se pergunta está no escopo permitido
   */
  async validateQuestion(question, classId) {
    try {
      const { data: config, error } = await supabase
        .from('chatbot_configurations')
        .select('scope_restrictions, themes, keywords')
        .eq('class_id', classId)
        .single();

      if (error) throw error;

      // Verificar se a pergunta contém palavras-chave relevantes
      const hasKeywords = config.keywords?.some(keyword => 
        question.toLowerCase().includes(keyword.toLowerCase())
      );

      // Verificar se está dentro dos temas permitidos
      const hasTheme = config.themes?.some(theme => 
        question.toLowerCase().includes(theme.toLowerCase())
      );

      return {
        allowed: hasKeywords || hasTheme || (!config.keywords?.length && !config.themes?.length),
        reason: hasKeywords || hasTheme ? null : 'Pergunta fora do escopo definido pelo professor'
      };
    } catch (error) {
      console.error('Erro ao validar pergunta:', error);
      return { allowed: false, reason: 'Erro ao validar pergunta' };
    }
  }

  /**
   * Gera relatório de uso do chatbot
   */
  async generateUsageReport(classId, startDate, endDate) {
    try {
      const { data: interactions, error } = await supabase
        .from('chatbot_interactions')
        .select('*')
        .eq('class_id', classId)
        .gte('timestamp', startDate)
        .lte('timestamp', endDate);

      if (error) throw error;

      const totalInteractions = interactions?.length || 0;
      const uniqueStudents = new Set(interactions?.map(i => i.student_id)).size;
      const avgInteractionsPerStudent = uniqueStudents > 0 ? totalInteractions / uniqueStudents : 0;

      return {
        totalInteractions,
        uniqueStudents,
        avgInteractionsPerStudent,
        interactions
      };
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      return null;
    }
  }
}

export default new ChatbotConfigService();
