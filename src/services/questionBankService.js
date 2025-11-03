import { logger } from '@/shared/utils/logger';
/**
 * 🏦 BANCO DE QUESTÕES SERVICE
 * Sistema completo de gestão de questões colaborativas
 */

import { supabase } from '@/lib/supabaseClient';

/**
 * Criar Nova Questão
 */
export const createQuestion = async (questionData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('question_bank')
      .insert({
        author_id: user.id,
        title: questionData.title,
        question_text: questionData.question_text,
        question_type: questionData.question_type, // 'multiple_choice', 'true_false', 'open'
        options: questionData.options || null, // Array para múltipla escolha
        correct_answer: questionData.correct_answer,
        explanation: questionData.explanation,
        difficulty: questionData.difficulty, // 1-5
        subject: questionData.subject,
        topic: questionData.topic,
        tags: questionData.tags || [],
        reference: questionData.reference, // Ex: "ENEM-2023"
        visibility: questionData.visibility || 'public', // 'public', 'private', 'school'
        school_id: questionData.school_id || null,
        status: 'pending', // 'pending', 'approved', 'rejected'
        points: questionData.points || 10
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    logger.error('Erro ao criar questão:', error)
    return { success: false, error: error.message };
  }
};

/**
 * Buscar Questões com Filtros
 */
export const searchQuestions = async (filters = {}) => {
  try {
    let query = supabase
      .from('question_bank')
      .select(`
        *,
        profiles:author_id(full_name)
      `);

    // Filtros
    if (filters.subject) {
      query = query.eq('subject', filters.subject);
    }
    if (filters.topic) {
      query = query.ilike('topic', `%${filters.topic}%`);
    }
    if (filters.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }
    if (filters.questionType) {
      query = query.eq('question_type', filters.questionType);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.visibility) {
      query = query.eq('visibility', filters.visibility);
    }
    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }
    if (filters.authorId) {
      query = query.eq('author_id', filters.authorId);
    }
    if (filters.schoolId) {
      query = query.eq('school_id', filters.schoolId);
    }

    // Apenas questões aprovadas por padrão (exceto se filtrar por status)
    if (!filters.status) {
      query = query.eq('status', 'approved');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    logger.error('Erro ao buscar questões:', error)
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Aprovar Questão (moderador/escola)
 */
export const approveQuestion = async (questionId, moderatorNotes = null) => {
  try {
    const { data, error } = await supabase
      .from('question_bank')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        moderator_notes: moderatorNotes
      })
      .eq('id', questionId)
      .select()
      .single();

    if (error) throw error;

    // Incrementar contador de contribuições do autor
    await incrementAuthorContributions(data.author_id);

    return { success: true, data };
  } catch (error) {
    logger.error('Erro ao aprovar questão:', error)
    return { success: false, error: error.message };
  }
};

/**
 * Rejeitar Questão
 */
export const rejectQuestion = async (questionId, reason) => {
  try {
    const { data, error } = await supabase
      .from('question_bank')
      .update({
        status: 'rejected',
        moderator_notes: reason
      })
      .eq('id', questionId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    logger.error('Erro ao rejeitar questão:', error)
    return { success: false, error: error.message };
  }
};

/**
 * Incrementar Contribuições do Autor
 */
const incrementAuthorContributions = async (authorId) => {
  try {
    // Contar questões aprovadas
    const { count } = await supabase
      .from('question_bank')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', authorId)
      .eq('status', 'approved');

    // Calcular desconto (até 25%)
    const discount = Math.min(25, Math.floor(count / 50) * 2); // 2% a cada 50 questões

    // Atualizar profile (se tiver campo discount_percentage)
    await supabase
      .from('profiles')
      .update({
        questions_contributed: count,
        discount_percentage: discount
      })
      .eq('id', authorId);

    return count;
  } catch (error) {
    logger.error('Erro ao incrementar contribuições:', error)
    return 0;
  }
};

/**
 * Obter Estatísticas do Autor
 */
export const getAuthorStats = async (authorId) => {
  try {
    const { data: questions } = await supabase
      .from('question_bank')
      .select('status, uses_count')
      .eq('author_id', authorId);

    if (!questions) return null;

    const stats = {
      total: questions.length,
      approved: questions.filter(q => q.status === 'approved').length,
      pending: questions.filter(q => q.status === 'pending').length,
      rejected: questions.filter(q => q.status === 'rejected').length,
      totalUses: questions.reduce((sum, q) => sum + (q.uses_count || 0), 0),
      discountEarned: Math.min(25, Math.floor(questions.filter(q => q.status === 'approved').length / 50) * 2)
    };

    return stats;
  } catch (error) {
    logger.error('Erro ao buscar stats do autor:', error)
    return null;
  }
};

/**
 * Registrar Uso de Questão
 */
export const recordQuestionUse = async (questionId) => {
  try {
    // Incrementar contador de usos
    const { error } = await supabase.rpc('increment_question_uses', {
      question_id: questionId
    });

    if (error) {
      // Fallback se RPC não existir
      const { data: question } = await supabase
        .from('question_bank')
        .select('uses_count')
        .eq('id', questionId)
        .single();

      await supabase
        .from('question_bank')
        .update({ uses_count: (question?.uses_count || 0) + 1 })
        .eq('id', questionId);
    }

    return { success: true };
  } catch (error) {
    logger.error('Erro ao registrar uso:', error)
    return { success: false };
  }
};

/**
 * Registrar Feedback de Questão
 */
export const submitQuestionFeedback = async (questionId, feedback) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('question_feedback')
      .insert({
        question_id: questionId,
        user_id: user.id,
        rating: feedback.rating, // 1-5
        comment: feedback.comment,
        issue_type: feedback.issueType // 'error', 'unclear', 'duplicate', 'other'
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    logger.error('Erro ao enviar feedback:', error)
    return { success: false, error: error.message };
  }
};

/**
 * Obter Estatísticas da Questão
 */
export const getQuestionStats = async (questionId) => {
  try {
    const { data: question } = await supabase
      .from('question_bank')
      .select('uses_count, correct_rate')
      .eq('id', questionId)
      .single();

    // Buscar feedbacks
    const { data: feedbacks } = await supabase
      .from('question_feedback')
      .select('rating')
      .eq('question_id', questionId);

    const avgRating = feedbacks && feedbacks.length > 0
      ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
      : 0;

    return {
      usesCount: question?.uses_count || 0,
      correctRate: question?.correct_rate || 0,
      avgRating: Math.round(avgRating * 10) / 10,
      totalFeedbacks: feedbacks?.length || 0
    };
  } catch (error) {
    logger.error('Erro ao buscar stats da questão:', error)
    return null;
  }
};

/**
 * Modo Treino Adaptativo
 * Recomenda questões baseado no desempenho
 */
export const getAdaptiveQuestions = async (userId, filters = {}) => {
  try {
    // Buscar histórico do usuário
    const { data: history } = await supabase
      .from('user_question_attempts')
      .select('question_id, is_correct, difficulty')
      .eq('user_id', userId)
      .order('attempted_at', { ascending: false })
      .limit(20);

    let targetDifficulty = 3; // Médio por padrão

    if (history && history.length > 5) {
      const recentCorrect = history.slice(0, 5).filter(h => h.is_correct).length;
      
      // Ajustar dificuldade baseado em acertos
      if (recentCorrect >= 4) {
        targetDifficulty = Math.min(5, (history[0]?.difficulty || 3) + 1);
      } else if (recentCorrect <= 1) {
        targetDifficulty = Math.max(1, (history[0]?.difficulty || 3) - 1);
      }
    }

    // Buscar questões no nível adequado
    const { data: questions } = await supabase
      .from('question_bank')
      .select('*')
      .eq('status', 'approved')
      .eq('difficulty', targetDifficulty)
      .eq('subject', filters.subject || '')
      .not('id', 'in', history?.map(h => h.question_id) || [])
      .limit(10);

    return {
      success: true,
      questions: questions || [],
      targetDifficulty,
      recommendation: targetDifficulty > 3 ? 'Desafiante' : targetDifficulty < 3 ? 'Revisão' : 'Adequado'
    };
  } catch (error) {
    logger.error('Erro ao buscar questões adaptativas:', error)
    return { success: false, questions: [] };
  }
};

/**
 * Gerar Quiz Aleatório
 */
export const generateRandomQuiz = async (params) => {
  try {
    let query = supabase
      .from('question_bank')
      .select('*')
      .eq('status', 'approved');

    if (params.subject) query = query.eq('subject', params.subject);
    if (params.difficulty) query = query.eq('difficulty', params.difficulty);
    if (params.questionType) query = query.eq('question_type', params.questionType);

    const { data: allQuestions } = await query;

    if (!allQuestions || allQuestions.length === 0) {
      return { success: false, message: 'Nenhuma questão encontrada' };
    }

    // Selecionar aleatoriamente
    const count = Math.min(params.count || 10, allQuestions.length);
    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    return {
      success: true,
      questions: selected,
      totalAvailable: allQuestions.length
    };
  } catch (error) {
    logger.error('Erro ao gerar quiz:', error)
    return { success: false, message: 'Erro ao gerar quiz' };
  }
};

export default {
  createQuestion,
  searchQuestions,
  approveQuestion,
  rejectQuestion,
  getAuthorStats,
  recordQuestionUse,
  submitQuestionFeedback,
  getQuestionStats,
  getAdaptiveQuestions,
  generateRandomQuiz
};
