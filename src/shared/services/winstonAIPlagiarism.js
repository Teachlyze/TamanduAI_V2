import axios from 'axios';
import { supabase } from '@/shared/services/supabaseClient';

/**
 * Serviço de Anti-Plágio com Winston AI
 * Verifica originalidade de textos submetidos
 */

const WINSTON_API_URL = 'https://api.gowinston.ai/v1';
const API_KEY = import.meta.env.VITE_WINSTON_API_KEY;

export const winstonAIPlagiarism = {
  /**
   * Verifica plágio em uma submissão
   * @param {string} text - Texto a ser verificado
   * @param {string} submissionId - ID da submissão
   * @param {number} threshold - Percentual de plágio aceitável (padrão: 50%)
   */
  async checkPlagiarism(text, submissionId, threshold = 50) {
    try {
      if (!text || text.trim().length < 50) {
        throw new Error('Texto muito curto para análise (mínimo 50 caracteres)');
      }

      // 1. Enviar para Winston AI
      const response = await axios.post(
        `${WINSTON_API_URL}/plagiarism`,
        {
          text: text.trim(),
          language: 'pt',
          include_sources: true,
          threshold: threshold / 100
        },
        {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 segundos
        }
      );

      const result = {
        submissionId,
        percentage: Math.round(response.data.plagiarism_score * 100),
        aiGenerated: response.data.ai_generated || false,
        aiScore: response.data.ai_score ? Math.round(response.data.ai_score * 100) : 0,
        sources: response.data.sources?.map(source => ({
          url: source.url,
          title: source.title || 'Fonte desconhecida',
          matchedPercentage: Math.round(source.match_percentage * 100),
          excerpt: source.excerpt
        })) || [],
        timestamp: new Date().toISOString(),
        rawData: response.data
      };

      // 2. Salvar no banco de dados
      await this.saveResult(result);

      // 3. Notificar professor se necessário
      if (result.percentage >= threshold) {
        await this.notifyProfessor(submissionId, result);
      }

      // 4. Notificar se detectado IA
      if (result.aiGenerated && result.aiScore >= 70) {
        await this.notifyAIDetection(submissionId, result);
      }

      return result;
    } catch (error) {
      console.error('Erro ao verificar plágio:', error);
      
      // Salvar erro no log
      await this.logError(submissionId, error);
      
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Erro ao verificar plágio'
      );
    }
  },

  /**
   * Verifica apenas se texto foi gerado por IA
   */
  async checkAIGeneration(text) {
    try {
      const response = await axios.post(
        `${WINSTON_API_URL}/detect`,
        {
          text: text.trim(),
          language: 'pt'
        },
        {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        isAI: response.data.is_ai_generated,
        score: Math.round(response.data.ai_score * 100),
        confidence: response.data.confidence
      };
    } catch (error) {
      console.error('Erro ao verificar IA:', error);
      throw error;
    }
  },

  /**
   * Salva resultado no banco de dados
   */
  async saveResult(result) {
    try {
      const { error } = await supabase
        .from('plagiarism_checks')
        .insert({
          submission_id: result.submissionId,
          plagiarism_percentage: result.percentage,
          ai_generated: result.aiGenerated,
          ai_score: result.aiScore,
          sources: result.sources,
          checked_at: result.timestamp,
          raw_data: result.rawData
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao salvar resultado:', error);
      throw error;
    }
  },

  /**
   * Notifica professor sobre plágio detectado
   */
  async notifyProfessor(submissionId, result) {
    try {
      // Buscar dados da submissão
      const { data: submission, error: subError } = await supabase
        .from('submissions')
        .select(`
          id,
          student_id,
          activity_id,
          activities (
            title,
            created_by
          ),
          profiles:student_id (
            full_name
          )
        `)
        .eq('id', submissionId)
        .single();

      if (subError) throw subError;

      // Criar notificação para o professor
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: submission.activities.created_by,
          type: 'plagiarism_alert',
          title: '🚨 Plágio Detectado',
          message: `Detectado ${result.percentage}% de plágio na atividade "${submission.activities.title}" - Aluno: ${submission.profiles.full_name}`,
          data: {
            submissionId,
            studentId: submission.student_id,
            activityId: submission.activity_id,
            percentage: result.percentage,
            aiGenerated: result.aiGenerated,
            aiScore: result.aiScore,
            sourcesCount: result.sources.length
          },
          read: false
        });

      if (notifError) throw notifError;
    } catch (error) {
      console.error('Erro ao notificar professor:', error);
    }
  },

  /**
   * Notifica sobre detecção de IA
   */
  async notifyAIDetection(submissionId, result) {
    try {
      const { data: submission } = await supabase
        .from('submissions')
        .select('activity_id, activities(created_by, title)')
        .eq('id', submissionId)
        .single();

      await supabase.from('notifications').insert({
        user_id: submission.activities.created_by,
        type: 'ai_detection',
        title: '🤖 Conteúdo Gerado por IA Detectado',
        message: `Detectado ${result.aiScore}% de probabilidade de IA na atividade "${submission.activities.title}"`,
        data: {
          submissionId,
          aiScore: result.aiScore,
          plagiarismPercentage: result.percentage
        },
        read: false
      });
    } catch (error) {
      console.error('Erro ao notificar IA:', error);
    }
  },

  /**
   * Busca histórico de verificações
   */
  async getHistory(submissionId) {
    try {
      const { data, error } = await supabase
        .from('plagiarism_checks')
        .select('*')
        .eq('submission_id', submissionId)
        .order('checked_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }
  },

  /**
   * Busca estatísticas de plágio por atividade
   */
  async getActivityStats(activityId) {
    try {
      const { data, error } = await supabase
        .from('plagiarism_checks')
        .select(`
          *,
          submissions!inner(activity_id)
        `)
        .eq('submissions.activity_id', activityId);

      if (error) throw error;

      const stats = {
        total: data.length,
        withPlagiarism: data.filter(d => d.plagiarism_percentage >= 50).length,
        withAI: data.filter(d => d.ai_generated).length,
        averagePlagiarism: data.reduce((sum, d) => sum + d.plagiarism_percentage, 0) / data.length,
        averageAI: data.reduce((sum, d) => sum + d.ai_score, 0) / data.length
      };

      return stats;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return null;
    }
  },

  /**
   * Log de erros
   */
  async logError(submissionId, error) {
    try {
      await supabase.from('plagiarism_logs').insert({
        submission_id: submissionId,
        error_message: error.message,
        error_stack: error.stack,
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Erro ao registrar log:', logError);
    }
  }
};

export default winstonAIPlagiarism;
