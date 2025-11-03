import { logger } from '@/shared/utils/logger';
import { supabase } from '@/shared/services/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import gamificationService from './gamificationService';

// Helpers to detect objective type from schema property
const getPropType = (prop) => {
  if (!prop) return 'string';
  if (prop.format === 'date') return 'date';
  if (prop.type === 'number') return 'number';
  if (Array.isArray(prop.enum)) return 'select';
  if (prop.type === 'array' && prop.items?.enum) return 'checkboxes';
  if (prop.format === 'textarea') return 'textarea';
  return 'string';
};

/**
 * Grade a submission automatically
 * @param {string} submissionId - The submission ID
 * @returns {Promise<Object>} The grading results
 */
export const autoGradeSubmission = async (submissionId) => {
  try {
    // Load submission, its activity (schema), and data
    const { data: submission, error: subErr } = await supabase
      .from('submissions')
      .select('id, user_id, activity_id, status, data')
      .eq('id', submissionId)
      .single();
    if (subErr) throw subErr;

    // Check if already graded
    if (submission.status === 'graded') {
      throw new Error('This submission has already been graded');
    }
    // Activity with schema
    const { data: activity, error: actErr } = await supabase
      .from('activities')
      .select('id, schema')
      .eq('id', submission.activity_id)
      .single();
    if (actErr) throw actErr;

    // Build answers array from submission.data
    let answers = [];
    const raw = submission?.data;
    if (Array.isArray(raw)) {
      answers = raw.map((item, idx) => ({ id: `${submissionId}-${idx}`, question_index: idx, value: item?.answer_text ?? item }));
    } else if (raw && typeof raw === 'object') {
      const entries = Object.entries(raw);
      answers = entries.map(([key, val], idx) => ({ id: `${submissionId}-${key}`, question_index: idx, value: val?.answer_text ?? val }));
    }

    const schema = activity?.schema || {};
    const properties = schema?.properties || {};
    const meta = schema?.meta || {};
    const answerKey = meta?.answer_key || schema?.answer_key || {};
    const pointsMap = meta?.points || {};

    let totalPossible = 0;
    let totalEarned = 0;
    let needsReview = false;

    for (const a of (answers || [])) {
      const idx = a.question_index;
      const fieldName = `question_${idx}`;
      const prop = properties[fieldName];
      const qType = getPropType(prop);

      // Determine if objective type
      const isObjective = ['select', 'checkboxes', 'number', 'date'].includes(qType);
      if (!isObjective) { needsReview = true; continue; }

      // Points for this question
      const points = typeof pointsMap[idx] === 'number' ? pointsMap[idx] : 1;
      totalPossible += points;

      // Expected answer from answer_key
      const expected = answerKey[idx];
      let isCorrect = false;

      if (qType === 'select' || qType === 'date' || qType === 'string') {
        isCorrect = a.value === expected;
      } else if (qType === 'number') {
        // Accept numeric equality; allow tolerance if provided
        const tol = typeof meta.tolerance === 'number' ? meta.tolerance : 0;
        const valNum = typeof a.value === 'number' ? a.value : Number(a.value);
        const expNum = typeof expected === 'number' ? expected : Number(expected);
        isCorrect = isFinite(valNum) && isFinite(expNum) && Math.abs(valNum - expNum) <= tol;
      } else if (qType === 'checkboxes') {
        const vSet = new Set(Array.isArray(a.value) ? a.value : []);
        const expSet = new Set(Array.isArray(expected) ? expected : []);
        if (vSet.size === expSet.size) {
          isCorrect = [...vSet].every(x => expSet.has(x));
        } else {
          isCorrect = false;
        }
      }

      const earned = isCorrect ? points : 0;
      totalEarned += earned;
    }

    const finalGrade = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : null;
    const status = needsReview ? 'submitted' : 'graded';

    const { data: updatedSubmission, error: updateError } = await supabase
      .from('submissions')
      .update({
        grade: needsReview ? null : finalGrade,
        status,
        graded_at: needsReview ? null : new Date().toISOString(),
        feedback: needsReview ? 'Needs manual review' : 'Automatically graded',
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .select()
      .single();
    if (updateError) throw updateError;
    
    // ✅ ADICIONAR XP ao receber nota automaticamente
    if (!needsReview && finalGrade !== null) {
      try {
        await gamificationService.trackGradeAssigned(submission.user_id, finalGrade);
        logger.debug('[GradingService] XP awarded for grade:', finalGrade)
      } catch (xpError) {
        logger.error('[GradingService] Error awarding XP:', xpError)
        // Não bloquear o fluxo se gamificação falhar
      }
    }
    
    // Add to feedback history
    if (!needsReview && finalGrade !== null) {
      await supabase
        .from('feedback_history')
        .insert([
          {
            id: uuidv4(),
            submission_id: submissionId,
            user_id: 'system',
            feedback: 'Automatically graded',
            feedback_type: 'automatic',
            created_at: new Date().toISOString()
          }
        ]);
      
      // Notify student
      await supabase
        .from('notifications')
        .insert([
          {
            id: uuidv4(),
            user_id: submission.user_id,
            type: 'grade_posted',
            title: 'Grade Posted',
            message: `Your submission has been automatically graded. Grade: ${finalGrade}%`,
            reference_id: submissionId,
            is_read: false,
            created_at: new Date().toISOString()
          }
        ]);
    }
    
    return {
      ...updatedSubmission,
      needs_review: needsReview,
      total_points_earned: totalEarned,
      total_points_possible: totalPossible
    };
  } catch (error) {
    logger.error('Error auto-grading submission:', error)
    throw error;
  }
};

/**
 * Get grading statistics for a class
 * @param {string} classId - The class ID
 * @returns {Promise<Object>} Grading statistics
 */
export const getClassGradingStats = async (classId) => {
  try {
    // Get all activities for the class
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('id, title, due_date')
      .eq('class_id', classId);

    if (activitiesError) throw activitiesError;
    // Get submissions for each activity
    const activityStats = await Promise.all(
      activities.map(async (activity) => {
        const { data: submissions, error: subsError } = await supabase
          .from('submissions')
          .select('id, status, grade, is_plagiarized, submitted_at')
          .eq('activity_id', activity.id);

        if (subsError) throw subsError;

        const graded = submissions.filter(s => s.status === 'graded');
        const averageGrade = graded.length > 0
          ? Math.round(graded.reduce((sum, s) => sum + (s.grade || 0), 0) / graded.length)
          : 0;

        return {
          activity_id: activity.id,
          title: activity.title,
          due_date: activity.due_date,
          total_submissions: submissions.length,
          graded_submissions: graded.length,
          average_grade: averageGrade,
          plagiarism_count: submissions.filter(s => s.is_plagiarized).length
        };
      })
    );

    // Calculate class-wide statistics
    const allSubmissions = activityStats.flatMap(a => 
      Array(a.total_submissions).fill({
        graded: a.graded_submissions,
        average_grade: a.average_grade
      })
    );

    const totalSubmissions = allSubmissions.length;
    const totalGraded = allSubmissions.reduce((sum, s) => sum + (s.graded || 0), 0);
    const overallAverage = totalGraded > 0
      ? Math.round(allSubmissions.reduce((sum, s) => sum + (s.average_grade || 0), 0) / totalGraded)
      : 0;

    return {
      class_id: classId,
      total_activities: activities.length,
      total_submissions: totalSubmissions,
      submission_rate: activities.length > 0 ? Math.round((totalSubmissions / activities.length) * 100) : 0,
      average_grade: overallAverage,
      activities: activityStats
    };
  } catch (error) {
    logger.error('Error getting class grading stats:', error)
    throw error;
  }
};

/**
 * Get submissions that need grading
 * @param {string} teacherId - The teacher's user ID
 * @returns {Promise<Array>} List of submissions needing grading
 */
export const getSubmissionsNeedingGrading = async (teacherId) => {
  try {
    // Get classes where the user is a teacher
    const { data: classes, error: classesError } = await supabase
      .from('class_members')
      .select('class_id')
      .eq('user_id', teacherId)
      .eq('role', 'teacher');

    if (classesError) throw classesError;
    
    if (!classes.length) return [];

    const classIds = classes.map(c => c.class_id);

    // Get activities for these classes
    const { data: activityAssignments, error: activitiesError } = await supabase
      .from('activity_class_assignments')
      .select(`
        activity_id,
        class_id,
        activities (
          id,
          title
        ),
        classes (
          name
        )
      `)
      .in('class_id', classIds);

    if (activitiesError) throw activitiesError;
    
    if (!activityAssignments?.length) return [];

    // Flatten to activities with class info
    const activities = activityAssignments.map(assignment => ({
      id: assignment.activities.id,
      title: assignment.activities.title,
      class_id: assignment.class_id,
      classes: { name: assignment.classes.name }
    }));


    // Get submissions that need grading
    const submissionsNeedingGrading = [];
    
    for (const activity of activities) {
      const { data: submissions, error: subsError } = await supabase
        .from('submissions')
        .select(`
          id,
          student_id,
          status,
          submitted_at,
          profiles:student_id (
            id,
            full_name
          )
        `)
        .eq('activity_id', activity.id)
        .in('status', ['submitted', 'returned']);

      if (subsError) throw subsError;

      submissions?.forEach(sub => {
        submissionsNeedingGrading.push({
          submission_id: sub.id,
          activity_id: activity.id,
          activity_title: activity.title,
          class_id: activity.class_id,
          class_name: activity.classes?.name || 'Unknown Class',
          user_id: sub.student_id,
          user_name: sub.profiles?.full_name || 'Unknown User',
          submitted_at: sub.submitted_at,
          status: sub.status
        });
      });
    }

    return submissionsNeedingGrading;
  } catch (error) {
    logger.error('Error getting submissions needing grading:', error)
    throw error;
  }
};

/**
 * Provide feedback on a submission
 * @param {string} submissionId - The submission ID
 * @param {Object} feedbackData - The feedback data
 * @param {string} feedbackData.feedback - The feedback text
 * @param {number} [feedbackData.grade] - The final grade (if applicable)
 * @param {string} userId - The ID of the user providing feedback
 * @returns {Promise<Object>} The updated submission
 */
export const provideFeedback = async (submissionId, feedbackData, userId) => {
  try {
    const { feedback, grade } = feedbackData;
    
    // Update the submission
    const updateData = {
      feedback,
      updated_at: new Date().toISOString()
    };
    
    // If grade is provided, update the grade
    if (typeof grade !== 'undefined') {
      updateData.grade = grade;
      updateData.graded_at = new Date().toISOString();
      updateData.status = 'graded';
    }
    
    const { data: submission, error: updateError } = await supabase
      .from('submissions')
      .update(updateData)
      .eq('id', submissionId)
      .select()
      .single();

    if (updateError) throw updateError;
    
    // ✅ ADICIONAR XP ao receber nota manualmente
    if (typeof grade !== 'undefined' && grade !== null) {
      try {
        await gamificationService.trackGradeAssigned(submission.user_id, grade);
        logger.debug('[GradingService] XP awarded for manual grade:', grade)
      } catch (xpError) {
        logger.error('[GradingService] Error awarding XP:', xpError)
        // Não bloquear o fluxo se gamificação falhar
      }
    }
    
    // Add to feedback history
    const { error: historyError } = await supabase
      .from('feedback_history')
      .insert([
        {
          id: uuidv4(),
          submission_id: submissionId,
          user_id: userId,
          feedback,
          feedback_type: 'manual',
          created_at: new Date().toISOString()
        }
      ]);

    if (historyError) throw historyError;
    
    // Notify student
    await supabase
      .from('notifications')
      .insert([
        {
          id: uuidv4(),
          user_id: submission.user_id,
          type: 'feedback_received',
          title: 'Feedback Received',
          message: `You have received feedback on your submission. ${typeof grade !== 'undefined' ? `Grade: ${grade}%` : ''}`,
          reference_id: submissionId,
          is_read: false,
          created_at: new Date().toISOString()
        }
      ]);

    return submission;
  } catch (error) {
    logger.error('Error providing feedback:', error)
    throw error;
  }
};

/**
 * Get grading queue prioritized
 * @param {string} teacherId - Teacher's ID
 * @param {Object} filters - Filters (classId, status, priority)
 * @returns {Promise<Array>} Prioritized queue
 */
export const getGradingQueue = async (teacherId, filters = {}) => {
  try {
    let query = supabase
      .from('grading_queue')
      .select('*')
      .eq('teacher_id', teacherId);

    if (filters.classId) {
      const { data: activities } = await supabase
        .from('activities')
        .select('id')
        .eq('class_id', filters.classId);
      
      const activityIds = activities?.map(a => a.id) || [];
      if (activityIds.length > 0) {
        query = query.in('activity_id', activityIds);
      }
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }

    const { data, error } = await query.limit(50);
    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Error getting grading queue:', error)
    throw error;
  }
};

/**
 * Grade submission with rubric
 */
export const gradeSubmission = async (submissionId, gradingData) => {
  try {
    const { grade, feedback, rubricScores, latePenalty = 0 } = gradingData;

    const { data, error } = await supabase
      .from('submissions')
      .update({
        grade: grade - latePenalty,
        feedback,
        rubric_scores: rubricScores || {},
        late_penalty: latePenalty,
        status: 'graded',
        graded_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
      .select('*, activity:activities(title), student:profiles!submissions_user_id_fkey(full_name)')
      .single();

    if (error) throw error;

    if (grade && data.user_id) {
      try {
        await gamificationService.trackGradeAssigned(data.user_id, grade);
      } catch (xpError) {
        logger.error('Error awarding XP:', xpError)
      }
    }

    return data;
  } catch (error) {
    logger.error('Error grading submission:', error)
    throw error;
  }
};

// Rubrics
export const createRubric = async (rubricData) => {
  const user = (await supabase.auth.getUser()).data.user;
  const { data, error } = await supabase
    .from('grading_rubrics')
    .insert([{ ...rubricData, teacher_id: user.id }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getRubrics = async (filters = {}) => {
  let query = supabase.from('grading_rubrics').select('*').eq('is_active', true);
  if (filters.activityId) query = query.eq('activity_id', filters.activityId);
  if (filters.teacherId) query = query.eq('teacher_id', filters.teacherId);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const updateRubric = async (rubricId, updates) => {
  const { data, error } = await supabase
    .from('grading_rubrics')
    .update(updates)
    .eq('id', rubricId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteRubric = async (rubricId) => {
  const { error } = await supabase.from('grading_rubrics').delete().eq('id', rubricId);
  if (error) throw error;
  return true;
};

// Feedback Templates
export const createFeedbackTemplate = async (templateData) => {
  const user = (await supabase.auth.getUser()).data.user;
  const { data, error } = await supabase
    .from('feedback_templates')
    .insert([{ ...templateData, teacher_id: user.id }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getFeedbackTemplates = async (filters = {}) => {
  const user = (await supabase.auth.getUser()).data.user;
  let query = supabase.from('feedback_templates').select('*').eq('teacher_id', filters.teacherId || user?.id);
  if (filters.category) query = query.eq('category', filters.category);
  const { data, error } = await query.order('usage_count', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const useFeedbackTemplate = async (templateId) => {
  await supabase.rpc('increment_template_usage', { template_id: templateId });
  const { data, error } = await supabase.from('feedback_templates').select('*').eq('id', templateId).single();
  if (error) throw error;
  return data;
};

export const deleteFeedbackTemplate = async (templateId) => {
  const { error } = await supabase.from('feedback_templates').delete().eq('id', templateId);
  if (error) throw error;
  return true;
};

export const getGradeHistory = async (submissionId) => {
  const { data, error } = await supabase
    .from('grade_history')
    .select('*, changer:profiles!grade_history_changed_by_fkey(id, full_name)')
    .eq('submission_id', submissionId)
    .order('changed_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export default {
  autoGradeSubmission,
  getClassGradingStats,
  getSubmissionsNeedingGrading,
  provideFeedback,
  getGradingQueue,
  gradeSubmission,
  createRubric,
  getRubrics,
  updateRubric,
  deleteRubric,
  createFeedbackTemplate,
  getFeedbackTemplates,
  useFeedbackTemplate,
  deleteFeedbackTemplate,
  getGradeHistory,
};
