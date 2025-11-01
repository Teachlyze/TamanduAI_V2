import { supabase } from './supabaseClient';

/**
 * Serviço para gerenciar templates de feedback
 */

/**
 * Lista templates de feedback do professor
 */
export const getFeedbackTemplates = async (teacherId) => {
  try {
    const { data, error } = await supabase
      .from('feedback_templates')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('usage_count', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao buscar templates:', error);
    return { data: null, error };
  }
};

/**
 * Cria novo template de feedback
 */
export const createFeedbackTemplate = async (teacherId, templateData) => {
  try {
    const { data, error } = await supabase
      .from('feedback_templates')
      .insert({
        teacher_id: teacherId,
        template_text: templateData.text,
        category: templateData.category,
        usage_count: 0
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao criar template:', error);
    return { data: null, error };
  }
};

/**
 * Atualiza template de feedback
 */
export const updateFeedbackTemplate = async (templateId, templateData) => {
  try {
    const { data, error} = await supabase
      .from('feedback_templates')
      .update({
        template_text: templateData.text,
        category: templateData.category
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao atualizar template:', error);
    return { data: null, error };
  }
};

/**
 * Deleta template de feedback
 */
export const deleteFeedbackTemplate = async (templateId) => {
  try {
    const { error } = await supabase
      .from('feedback_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Erro ao deletar template:', error);
    return { error };
  }
};

/**
 * Incrementa contador de uso de template
 */
export const useFeedbackTemplate = async (templateId) => {
  try {
    const { data, error } = await supabase
      .rpc('increment_template_usage', { template_id: templateId });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    // Fallback se a function não existir
    console.warn('RPC não disponível, usando UPDATE:', error);
    
    const { data: template } = await supabase
      .from('feedback_templates')
      .select('usage_count')
      .eq('id', templateId)
      .single();

    if (template) {
      await supabase
        .from('feedback_templates')
        .update({ usage_count: (template.usage_count || 0) + 1 })
        .eq('id', templateId);
    }

    return { data: null, error: null };
  }
};

/**
 * Sugere feedback com IA usando Edge Function
 */
export const suggestFeedbackWithAI = async (submissionData) => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/generate-feedback`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submissionData: submissionData.content,
        grade: submissionData.grade,
        activityType: submissionData.activityType || 'assignment',
      }),
    });

    if (!response.ok) {
      throw new Error('Erro ao gerar feedback com IA');
    }

    const data = await response.json();

    return {
      data: {
        suggestion: data.feedback,
        isAI: true,
        warning: data.warning || 'Esta é uma sugestão gerada por IA. Revise e personalize antes de usar.'
      },
      error: null
    };
  } catch (error) {
    console.error('Erro ao gerar sugestão com IA:', error);
    
    // Fallback para sugestão genérica
    const { grade, maxScore = 10 } = submissionData;
    const percentage = (grade / maxScore) * 100;

    let suggestion = '';
    
    if (percentage >= 90) {
      suggestion = 'Excelente trabalho! Sua resposta demonstra compreensão profunda do tema. Continue assim!';
    } else if (percentage >= 70) {
      suggestion = 'Bom trabalho! Você demonstrou entendimento do tema, mas alguns pontos podem ser aprimorados.';
    } else if (percentage >= 50) {
      suggestion = 'Seu trabalho mostra algum entendimento, mas há aspectos importantes que precisam ser revisados.';
    } else {
      suggestion = 'Recomendo revisar o material e buscar apoio para compreender melhor os conceitos.';
    }

    return {
      data: {
        suggestion,
        isAI: false,
        warning: 'Falha ao conectar com IA. Usando feedback genérico.'
      },
      error: null
    };
  }
};

export default {
  getFeedbackTemplates,
  createFeedbackTemplate,
  updateFeedbackTemplate,
  deleteFeedbackTemplate,
  useFeedbackTemplate,
  suggestFeedbackWithAI
};
