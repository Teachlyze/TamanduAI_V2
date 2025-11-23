import { logger } from '@/shared/utils/logger';
import { supabase } from './supabaseClient';
import { convertToDatabase } from '../utils/gradeConverter';

/**
 * Serviço para gerenciar correções de submissões
 */

/**
 * Busca submissões para corrigir com filtros
 */
export const getSubmissionsForCorrection = async (filters = {}) => {
  try {
    let query = supabase
      .from('submissions')
      .select(`
        *,
        activity:activities(
          id,
          title,
          type,
          max_score,
          content,
          plagiarism_enabled,
          created_by,
          activity_class_assignments(
            class:classes(
              grading_system
            )
          )
        ),
        student:profiles!student_id(
          id,
          full_name,
          avatar_url,
          email
        ),
        answers(
          id,
          question_id,
          answer_json,
          points_earned
        )
      `)
      .in('status', ['submitted', 'graded', 'needs_revision']);

    // Aplicar filtros
    if (filters.classId) {
      query = query.eq('activity.activity_class_assignments.class_id', filters.classId);
    }

    if (filters.activityId) {
      query = query.eq('activity_id', filters.activityId);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.studentId) {
      query = query.eq('student_id', filters.studentId);
    }

    if (filters.flagged) {
      // Usando o status 'needs_review' para identificar submissões que precisam de atenção
      query = query.eq('status', 'needs_review');
    }

    if (filters.plagiarism && filters.plagiarism < 100) {
      query = query.lt('plagiarism_score', filters.plagiarism);
    }

    // Ordenação
    const sortBy = filters.sortBy || 'oldest';
    switch (sortBy) {
      case 'newest':
        query = query.order('submitted_at', { ascending: false });
        break;
      case 'student':
        query = query.order('student.full_name', { ascending: true });
        break;
      case 'grade':
        query = query.order('grade', { ascending: false });
        break;
      default: // 'oldest'
        query = query.order('submitted_at', { ascending: true });
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Erro ao buscar submissões:', error)
    return { data: null, error };
  }
};

/**
 * Busca detalhes de uma submissão específica
 */
export const getSubmissionDetails = async (submissionId) => {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        activity:activities(
          id,
          title,
          description,
          type,
          max_score,
          content,
          plagiarism_enabled,
          due_date,
          created_by,
          activity_class_assignments(
            class:classes(
              grading_system
            )
          )
        ),
        student:profiles!student_id(
          id,
          full_name,
          avatar_url,
          email
        ),
        answers(*)
      `)
      .eq('id', submissionId)
      .single();

    if (error) throw error;

    // Buscar verificação de plágio se existir
    if (data.activity.plagiarism_enabled) {
      const { data: plagiarism } = await supabase
        .from('plagiarism_checks')
        .select('*')
        .eq('submission_id', submissionId)
        .order('checked_at', { ascending: false })
        .limit(1)
        .single();

      data.plagiarism_check = plagiarism;
    }

    return { data, error: null };
  } catch (error) {
    logger.error('Erro ao buscar detalhes da submissão:', error)
    return { data: null, error };
  }
};

/**
 * Salva correção de uma submissão
 */
export const saveCorrection = async (submissionId, correctionData) => {
  try {
    const {
      grade,
      feedback,
      rubricScores = [],
      status = 'graded',
      teacherId
    } = correctionData;

    logger.debug('📝 Salvando correção:', {
      submissionId,
      grade: grade,
      gradeType: typeof grade,
      feedback: feedback?.substring(0, 50),
      status
    });

    // ⚠️ IMPORTANTE: O banco SEMPRE armazena em escala 0-10 (constraint CHECK)
    // Mas a UI pode usar outras escalas (0-100, A-F, etc)
    
    // Buscar grading_system da turma e max_score da atividade
    const { data: submissionData } = await supabase
      .from('submissions')
      .select(`
        activity:activities(
          max_score,
          activity_class_assignments(
            class:classes(grading_system)
          )
        )
      `)
      .eq('id', submissionId)
      .single();
    
    const maxScore = submissionData?.activity?.max_score || 10;
    const gradingSystem = submissionData?.activity?.activity_class_assignments?.[0]?.class?.grading_system || '0-10';
    
    logger.debug('📊 Convertendo nota:', {
      gradeInput: grade,
      gradingSystem: gradingSystem,
      maxScore: maxScore
    });
    
    // Converter nota da escala da UI para escala do banco (0-10)
    let gradeNormalized;
    const originalGrade = grade;
    
    try {
      gradeNormalized = convertToDatabase(grade, gradingSystem);
      
      logger.debug(`✅ Conversão: "${grade}" (${gradingSystem}) → ${gradeNormalized.toFixed(2)}/10`);
    } catch (error) {
      logger.error('❌ Erro na conversão:', error)
      throw new Error(`Nota inválida para o sistema ${gradingSystem}: ${grade}`);
    }
    
    // Validar se está dentro do constraint do banco
    if (gradeNormalized > 10) {
      throw new Error(`Nota ${grade} resultou em ${gradeNormalized.toFixed(2)}/10, excedendo o limite.`);
    }
    
    if (gradeNormalized < 0) {
      throw new Error(`Nota não pode ser negativa.`);
    }
    
    if (isNaN(gradeNormalized)) {
      throw new Error(`Nota inválida: ${grade}`);
    }

    // Iniciar transação
    const updatePayload = {
      grade: gradeNormalized,
      feedback: feedback || '',
      status: status,
      graded_at: new Date().toISOString()
    };

    logger.debug('📤 Update payload:', updatePayload)

    const { data: submission, error: updateError } = await supabase
      .from('submissions')
      .update(updatePayload)
      .eq('id', submissionId)
      .select()
      .single();

    if (updateError) {
      logger.error('❌ Erro no update:', updateError)
      throw updateError;
    }
    
    logger.debug('✅ Correção salva com sucesso')

    // Salvar scores de rubrica se houver
    if (rubricScores.length > 0) {
      const rubricData = rubricScores.map(score => ({
        submission_id: submissionId,
        rubric_id: score.rubricId,
        score: score.score,
        comment: score.comment || null
      }));

      const { error: rubricError } = await supabase
        .from('submission_rubric_scores')
        .upsert(rubricData);

      if (rubricError) throw rubricError;
    }

    // Registrar no histórico
    await supabase
      .from('correction_history')
      .insert({
        submission_id: submissionId,
        teacher_id: teacherId,
        action: 'corrected',
        new_grade: gradeNormalized,
        notes: gradingSystem !== '0-10'
          ? `Correção realizada: "${originalGrade}" (${gradingSystem}) = ${gradeNormalized.toFixed(2)}/10`
          : `Correção realizada: ${gradeNormalized} pontos`
      });

    return { 
      data: submission, 
      error: null,
      converted: gradingSystem !== '0-10',
      gradingSystem: gradingSystem,
      originalGrade: originalGrade,
      normalizedGrade: gradeNormalized,
      maxScore: maxScore
    };
  } catch (error) {
    logger.error('Erro ao salvar correção:', error)
    return { data: null, error };
  }
};

/**
 * Salva rascunho de correção
 */
export const saveCorrectionDraft = async (submissionId, teacherId, draftData) => {
  try {
    const { data, error } = await supabase
      .from('correction_drafts')
      .upsert({
        submission_id: submissionId,
        teacher_id: teacherId,
        draft_data: draftData,
        last_saved_at: new Date().toISOString()
      }, {
        onConflict: 'submission_id,teacher_id'
      });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Erro ao salvar rascunho:', error)
    return { data: null, error };
  }
};

/**
 * Recupera rascunho de correção
 */
export const getCorrectionDraft = async (submissionId, teacherId) => {
  try {
    const { data, error } = await supabase
      .from('correction_drafts')
      .select('*')
      .eq('submission_id', submissionId)
      .eq('teacher_id', teacherId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignorar "not found"
    return { data, error: null };
  } catch (error) {
    logger.error('Erro ao recuperar rascunho:', error)
    return { data: null, error };
  }
};

/**
 * Correção em lote
 */
export const bulkCorrect = async (submissionIds, correctionData, teacherId) => {
  try {
    const results = [];
    const errors = [];

    for (const submissionId of submissionIds) {
      const result = await saveCorrection(submissionId, {
        ...correctionData,
        teacherId
      });

      if (result.error) {
        errors.push({ submissionId, error: result.error });
      } else {
        results.push(result.data);
      }
    }

    return {
      data: {
        success: results,
        failed: errors,
        successCount: results.length,
        failedCount: errors.length
      },
      error: null
    };
  } catch (error) {
    logger.error('Erro na correção em lote:', error)
    return { data: null, error };
  }
};

/**
 * Busca histórico de tentativas de um aluno
 */
export const getAttemptHistory = async (activityId, studentId) => {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('activity_id', activityId)
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Erro ao buscar histórico:', error)
    return { data: null, error };
  }
};

/**
 * Busca métricas de correção do professor
 */
export const getCorrectionMetrics = async (teacherId, period = 'week') => {
  try {
    // Calcular data início baseado no período
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Buscar métricas agregadas
    const { data: metrics, error } = await supabase
      .from('correction_metrics')
      .select('*')
      .eq('teacher_id', teacherId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;

    // Se não houver métricas, retornar valores padrão
    if (!metrics || metrics.length === 0) {
      return {
        data: {
          corrections_count: 0,
          total_time_seconds: 0,
          avg_grade: 0,
          avg_feedback_length: 0,
          avg_time_per_correction: 0,
          daily_metrics: []
        },
        error: null
      };
    }

    // Calcular totais
    const initialTotals = {
      corrections_count: 0,
      total_time_seconds: 0,
      grades: [],
      lengths: []
    };

    const totals = metrics.reduce((acc, day) => {
      const correctionsCount = Number(day.corrections_count) || 0;
      const totalSeconds = Number(day.total_time_seconds) || 0;
      const avgGrade = Number(day.avg_grade_given) || 0;
      const avgLength = Number(day.feedback_avg_length) || 0;

      return {
        corrections_count: acc.corrections_count + correctionsCount,
        total_time_seconds: acc.total_time_seconds + totalSeconds,
        grades: [...acc.grades, avgGrade],
        lengths: [...acc.lengths, avgLength]
      };
    }, initialTotals);

    // Calcular médias
    const avgGrade = totals.grades.length > 0
      ? parseFloat((totals.grades.reduce((a, b) => a + b, 0) / totals.grades.length).toFixed(1))
      : 0;

    const avgLength = totals.lengths.length > 0
      ? Math.round(totals.lengths.reduce((a, b) => a + b, 0) / totals.lengths.length)
      : 0;

    const avgTimePerCorrection = totals.corrections_count > 0
      ? Math.round(totals.total_time_seconds / totals.corrections_count)
      : 0;

    return {
      data: {
        ...totals,
        avg_grade: avgGrade,
        avg_feedback_length: avgLength,
        avg_time_per_correction: avgTimePerCorrection,
        daily_metrics: metrics
      },
      error: null
    };
  } catch (error) {
    logger.error('Erro ao buscar métricas:', error)
    return { data: null, error };
  }
};

/**
 * Atualiza métricas de correção
 */
export const updateCorrectionMetrics = async (teacherId, correctionTime, grade, feedbackLength) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Buscar métricas do dia
    const { data: existing } = await supabase
      .from('correction_metrics')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('date', today)
      .single();

    const newCorrectionsCount = (existing?.corrections_count || 0) + 1;
    const newTotalTime = (existing?.total_time_seconds || 0) + correctionTime;
    const newAvgGrade = existing
      ? ((existing.avg_grade_given * existing.corrections_count) + grade) / newCorrectionsCount
      : grade;
    const newAvgLength = existing
      ? ((existing.feedback_avg_length * existing.corrections_count) + feedbackLength) / newCorrectionsCount
      : feedbackLength;

    const { data, error } = await supabase
      .from('correction_metrics')
      .upsert({
        teacher_id: teacherId,
        date: today,
        corrections_count: newCorrectionsCount,
        total_time_seconds: newTotalTime,
        avg_time_per_correction: Math.round(newTotalTime / newCorrectionsCount),
        avg_grade_given: newAvgGrade,
        feedback_avg_length: newAvgLength
      }, {
        onConflict: 'teacher_id,date'
      });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Erro ao atualizar métricas:', error)
    return { data: null, error };
  }
};

export default {
  getSubmissionsForCorrection,
  getSubmissionDetails,
  saveCorrection,
  saveCorrectionDraft,
  getCorrectionDraft,
  bulkCorrect,
  getAttemptHistory,
  getCorrectionMetrics,
  updateCorrectionMetrics
};
