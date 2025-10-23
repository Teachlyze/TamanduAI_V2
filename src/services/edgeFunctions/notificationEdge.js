/**
 * 🔔 EDGE FUNCTION WRAPPER - NOTIFICATIONS
 * 
 * Wrapper para Edge Functions de notificações:
 * - Processamento em lote
 * - Notificações em tempo real
 * - Envio de emails
 */

import { supabase } from '@/lib/supabaseClient';

/**
 * Processa notificações em lote
 * @param {Array<Object>} notifications - Array de notificações
 * @returns {Promise<Object>} Resultado do processamento
 */
export const processNotificationsBatch = async (notifications) => {
  try {
    const { data, error } = await supabase.functions.invoke('process-notifications', {
      body: { notifications }
    });

    if (error) {
      console.error('Erro na Edge Function process-notifications:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao processar notificações em lote:', error);
    throw error;
  }
};

/**
 * Cria e envia uma notificação
 * @param {string} userId - ID do usuário
 * @param {Object} notification - Dados da notificação
 * @returns {Promise<Object>} Notificação criada
 */
export const createAndSendNotification = async (userId, notification) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar notificação:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    throw error;
  }
};

/**
 * Envia email usando Edge Function
 * @param {string} to - Email destinatário
 * @param {string} subject - Assunto
 * @param {string} template - Nome do template
 * @param {Object} data - Dados do template
 * @returns {Promise<Object>} Resultado do envio
 */
export const sendEmail = async (to, subject, template, data = {}) => {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-email-v2', {
      body: {
        to,
        subject,
        template,
        data
      }
    });

    if (error) {
      console.error('Erro na Edge Function send-email-v2:', error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    throw error;
  }
};

/**
 * Envia notificação de plágio detectado
 * @param {string} teacherId - ID do professor
 * @param {string} studentName - Nome do aluno
 * @param {string} activityTitle - Título da atividade
 * @param {number} plagiarismPercentage - Porcentagem de plágio
 * @returns {Promise<Object>} Notificação criada
 */
export const sendPlagiarismAlert = async (teacherId, studentName, activityTitle, plagiarismPercentage) => {
  try {
    const notification = {
      type: 'plagiarism_alert',
      title: '⚠️ Plágio Detectado',
      message: `Plágio de ${plagiarismPercentage}% detectado na submissão de ${studentName} para "${activityTitle}"`,
      data: {
        studentName,
        activityTitle,
        plagiarismPercentage
      }
    };

    return await createAndSendNotification(teacherId, notification);
  } catch (error) {
    console.error('Erro ao enviar alerta de plágio:', error);
    throw error;
  }
};

/**
 * Envia notificação de IA detectada
 * @param {string} teacherId - ID do professor
 * @param {string} studentName - Nome do aluno
 * @param {string} activityTitle - Título da atividade
 * @param {number} aiScore - Score de IA
 * @returns {Promise<Object>} Notificação criada
 */
export const sendAIDetectionAlert = async (teacherId, studentName, activityTitle, aiScore) => {
  try {
    const notification = {
      type: 'ai_detection',
      title: '🤖 Conteúdo Gerado por IA',
      message: `Possível uso de IA (${aiScore}%) detectado na submissão de ${studentName} para "${activityTitle}"`,
      data: {
        studentName,
        activityTitle,
        aiScore
      }
    };

    return await createAndSendNotification(teacherId, notification);
  } catch (error) {
    console.error('Erro ao enviar alerta de IA:', error);
    throw error;
  }
};

/**
 * Envia notificação de nova submissão
 * @param {string} teacherId - ID do professor
 * @param {string} studentName - Nome do aluno
 * @param {string} activityTitle - Título da atividade
 * @returns {Promise<Object>} Notificação criada
 */
export const sendSubmissionNotification = async (teacherId, studentName, activityTitle) => {
  try {
    const notification = {
      type: 'activity_submitted',
      title: '📝 Nova Submissão',
      message: `${studentName} submeteu a atividade "${activityTitle}"`,
      data: {
        studentName,
        activityTitle
      }
    };

    return await createAndSendNotification(teacherId, notification);
  } catch (error) {
    console.error('Erro ao enviar notificação de submissão:', error);
    throw error;
  }
};

/**
 * Envia notificação de nota recebida
 * @param {string} studentId - ID do aluno
 * @param {string} activityTitle - Título da atividade
 * @param {number} grade - Nota
 * @returns {Promise<Object>} Notificação criada
 */
export const sendGradeNotification = async (studentId, activityTitle, grade) => {
  try {
    const notification = {
      type: 'grade_received',
      title: '✅ Nota Atribuída',
      message: `Você recebeu nota ${grade} na atividade "${activityTitle}"`,
      data: {
        activityTitle,
        grade
      }
    };

    return await createAndSendNotification(studentId, notification);
  } catch (error) {
    console.error('Erro ao enviar notificação de nota:', error);
    throw error;
  }
};

/**
 * Envia notificação de prazo próximo
 * @param {string} studentId - ID do aluno
 * @param {string} activityTitle - Título da atividade
 * @param {Date} deadline - Data limite
 * @returns {Promise<Object>} Notificação criada
 */
export const sendDeadlineNotification = async (studentId, activityTitle, deadline) => {
  try {
    const daysUntil = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    
    const notification = {
      type: 'deadline_approaching',
      title: '⏰ Prazo Próximo',
      message: `A atividade "${activityTitle}" vence em ${daysUntil} dia(s)`,
      data: {
        activityTitle,
        deadline,
        daysUntil
      }
    };

    return await createAndSendNotification(studentId, notification);
  } catch (error) {
    console.error('Erro ao enviar notificação de prazo:', error);
    throw error;
  }
};
