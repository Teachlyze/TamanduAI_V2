import { supabase } from '@/lib/supabaseClient';
import { 
  checkPlagiarismEdge, 
  getCachedPlagiarismCheck,
  savePlagiarismResult 
} from '@/services/edgeFunctions';
import { 
  sendPlagiarismAlert, 
  sendAIDetectionAlert 
} from '@/services/edgeFunctions';

/**
 * Serviço de detecção de plágio usando WinstonAI + Edge Functions
 * Integra com Edge Functions para cache, rate limiting e segurança
 */
class PlagiarismWinstonAI {
  constructor() {
    this.apiKey = import.meta.env.VITE_WINSTON_AI_API_KEY;
    this.apiUrl = 'https://api.gowinston.ai/v1/plagiarism';
    this.useEdgeFunctions = true; // Flag para usar Edge Functions
  }

  /**
   * Verifica plágio em um texto usando WinstonAI + Edge Functions
   * @param {string} text - Texto a ser verificado
   * @param {string} submissionId - ID da submissão
   * @param {string} activityId - ID da atividade (opcional, para compatibilidade)
   * @param {string} studentId - ID do aluno (opcional, para compatibilidade)
   * @returns {Promise<Object>} - Resultado da verificação
   */
  async checkPlagiarism(text, submissionId, activityId = null, studentId = null) {
    try {
      // Se submissionId não for fornecido, usar activityId (compatibilidade)
      const checkId = submissionId || activityId;

      // 1. Verificar cache primeiro (Edge Function)
      if (this.useEdgeFunctions && checkId) {
        const cached = await getCachedPlagiarismCheck(checkId);
        if (cached) {
          console.log('✅ Resultado de plágio encontrado em cache');
          return {
            success: true,
            percentage: cached.plagiarism_percentage,
            aiGenerated: cached.ai_generated,
            aiScore: cached.ai_score,
            sources: cached.sources,
            status: this.getStatus(cached.plagiarism_percentage),
            cached: true
          };
        }
      }

      // 2. Usar Edge Function para verificação com cache e rate limiting
      let result;
      if (this.useEdgeFunctions && checkId) {
        console.log('🔄 Usando Edge Function para verificação de plágio...');
        result = await checkPlagiarismEdge(text, checkId);
      } else {
        // Fallback: chamar API diretamente
        console.log('🔄 Usando API WinstonAI diretamente...');
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            text: text,
            language: 'pt',
            check_internet: true,
            check_database: true
          })
        });

        if (!response.ok) {
          throw new Error(`WinstonAI API Error: ${response.status}`);
        }

        result = await response.json();
      }

      // 3. Salvar resultado usando Edge Function
      if (checkId) {
        await savePlagiarismResult(checkId, {
          plagiarismPercentage: result.plagiarism_score || result.plagiarismPercentage || 0,
          isAiGenerated: result.ai_generated || result.isAiGenerated || false,
          aiScore: result.ai_score || result.aiScore || 0,
          sources: result.sources || [],
          rawData: result
        });
      }

      // 4. Notificar professor se necessário (usando Edge Functions)
      const plagiarismPercentage = result.plagiarism_score || result.plagiarismPercentage || 0;
      const aiScore = result.ai_score || result.aiScore || 0;

      if (plagiarismPercentage >= 50 && activityId && studentId) {
        await this.notifyTeacher(activityId, studentId, plagiarismPercentage, aiScore);
      }

      return {
        success: true,
        percentage: plagiarismPercentage,
        aiGenerated: result.ai_generated || result.isAiGenerated || false,
        aiScore: aiScore,
        sources: result.sources || [],
        status: this.getStatus(plagiarismPercentage),
        report: result,
        cached: false
      };

    } catch (error) {
      console.error('Erro ao verificar plágio:', error);
      return {
        success: false,
        error: error.message,
        percentage: 0,
        sources: []
      };
    }
  }

  /**
   * Salva relatório de plágio no banco de dados
   */
  async savePlagiarismReport(data) {
    try {
      const { error } = await supabase
        .from('plagiarism_reports')
        .insert([data]);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao salvar relatório:', error);
    }
  }

  /**
   * Notifica professor sobre plágio detectado usando Edge Functions
   */
  async notifyTeacher(activityId, studentId, plagiarismPercentage, aiScore = 0) {
    try {
      // Buscar dados da atividade e aluno
      const [activityResult, studentResult] = await Promise.all([
        supabase.from('activities').select('title, created_by').eq('id', activityId).single(),
        supabase.from('profiles').select('full_name').eq('id', studentId).single()
      ]);

      const activity = activityResult.data;
      const student = studentResult.data;

      if (!activity || !student) return;

      // Usar Edge Functions para enviar notificações
      if (this.useEdgeFunctions) {
        // Notificação de plágio
        if (plagiarismPercentage >= 50) {
          await sendPlagiarismAlert(
            activity.created_by,
            student.full_name,
            activity.title,
            plagiarismPercentage
          );
        }

        // Notificação de IA
        if (aiScore >= 70) {
          await sendAIDetectionAlert(
            activity.created_by,
            student.full_name,
            activity.title,
            aiScore
          );
        }
      } else {
        // Fallback: criar notificação diretamente
        await supabase.from('notifications').insert([{
          user_id: activity.created_by,
          type: 'plagiarism_alert',
          title: '⚠️ Plágio Detectado',
          message: `${plagiarismPercentage}% de plágio detectado na submissão de ${student.full_name} para "${activity.title}"`,
          data: {
            activityId,
            studentId,
            percentage: plagiarismPercentage,
            aiScore
          }
        }]);
      }

    } catch (error) {
      console.error('Erro ao notificar professor:', error);
    }
  }

  /**
   * Determina status baseado na porcentagem
   */
  getStatus(percentage) {
    if (percentage >= 70) return 'high';
    if (percentage >= 50) return 'medium';
    if (percentage >= 30) return 'low';
    return 'clean';
  }

  /**
   * Busca relatórios de plágio de uma submissão
   */
  async getReports(activityId, studentId) {
    try {
      const { data, error } = await supabase
        .from('plagiarism_reports')
        .select('*')
        .eq('activity_id', activityId)
        .eq('student_id', studentId)
        .order('checked_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar relatórios:', error);
      return [];
    }
  }

  /**
   * Verifica se uma submissão já foi checada
   */
  async isAlreadyChecked(activityId, studentId) {
    const reports = await this.getReports(activityId, studentId);
    return reports.length > 0;
  }

  /**
   * Re-verifica uma submissão
   */
  async recheckPlagiarism(text, activityId, studentId) {
    return await this.checkPlagiarism(text, activityId, studentId);
  }
}

export default new PlagiarismWinstonAI();
