import { supabase } from '@/shared/services/supabaseClient';
import { checkTextForPlagiarism, invokeEdgeCheck } from './plagiarismService';
import NotificationOrchestrator from '@/shared/services/notificationOrchestrator';

/**
 * Create a new submission
 * @param {Object} submissionData - The submission data
 * @param {string} submissionData.activity_id - The activity ID
 * @param {string} submissionData.user_id - The user ID
 * @param {Object|Array} submissionData.data - Submission payload (JSON)
 * @param {boolean} [submit=false] - Whether to submit the submission
 * @returns {Promise<Object>} The created submission
 */
export const createSubmission = async (submissionData, submit = false) => {
  try {
    const { activity_id, user_id, data, ...rest } = submissionData;
    
    // Start a transaction
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .insert([
        {
          activity_id,
          user_id,
          status: submit ? 'submitted' : 'draft',
          submitted_at: submit ? new Date().toISOString() : null,
          data: data ?? null,
          ...rest
        }
      ])
      .select()
      .single();

    if (submissionError) throw submissionError;

    // Answers are embedded in submissions.data now; no separate table writes

    // If submitted, notify teacher and optionally check for plagiarism
    if (submit) {
      // Notify teacher: activity submitted (push)
      try {
        // Get activity and class info
        const { data: activity } = await supabase
          .from('activities')
          .select('id, title')
          .eq('id', activity_id)
          .single();

        // Get classes this activity is assigned to
        const { data: classAssignments } = await supabase
          .from('activity_class_assignments')
          .select(`
            class_id,
            classes (
              id,
              name,
              created_by
            )
          `)
          .eq('activity_id', activity_id);

        const { data: studentProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user_id)
          .single();

        // Notify teachers of all classes
        for (const assignment of classAssignments || []) {
          const cls = assignment.classes;
          if (!cls?.created_by) continue;

          await NotificationOrchestrator.send('activitySubmitted', {
            userId: cls.created_by,
            variables: {
              studentName: studentProfile?.full_name || 'Aluno',
              activityName: activity?.title || 'Atividade'
            },
            channelOverride: 'push',
            metadata: { activityId: activity_id, classId: cls.id }
          });
        }
      } catch (e) {
        console.warn('Falha ao notificar submissão de atividade:', e);
      }

      // Check plagiarism only if enabled at the activity level
      try {
        const { data: activityCfg } = await supabase
          .from('activities')
          .select('id, plagiarism_enabled')
          .eq('id', activity_id)
          .single();

        if (activityCfg?.plagiarism_enabled) {
          // Extract text from submission data (supports array or object)
          const items = Array.isArray(data) ? data : Object.values(data || {});
          const textAnswers = (items || [])
            .map(v => (typeof v === 'string' ? v : (typeof v?.answer_text === 'string' ? v.answer_text : '')))
            .filter(s => s && s.trim().length > 0)
            .join('\n\n');

          if (textAnswers.length > 0) {
            // Non-blocking: prefer Edge Function; fallback to local if needed
            const res = await invokeEdgeCheck({
              submissionId: submission.id,
              activityId: activityCfg.id,
              classId: null, // Will be handled by plagiarism service
              text: textAnswers,
              rephrased: true,
            });
            if (!res) {
              // Best-effort fallback, still non-blocking
              try { await checkTextForPlagiarism(textAnswers); } catch (e) { console.warn('checkTextForPlagiarism fallback failed:', e); }
            }
          }
        }
      } catch (plagErr) {
        console.warn('Plagiarism check skipped (non-blocking):', plagErr);
      }
    }

    return submission;
  } catch (error) {
    console.error('Error creating submission:', error);
    throw error;
  }
};

/**
 * Get a submission by ID
 * @param {string} submissionId - The submission ID
 * @param {string} [userId] - Optional user ID to verify ownership
 * @returns {Promise<Object>} The submission with answers
 */
export const getSubmission = async (submissionId, userId = null) => {
  try {
    let query = supabase
      .from('submissions')
      .select(`
        *,
        activities (*)
      `)
      .eq('id', submissionId);

    // If userId is provided, ensure the user owns the submission
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting submission:', error);
    throw error;
  }
};

/**
 * Get all submissions for an activity
 * @param {string} activityId - The activity ID
 * @param {Object} [options] - Additional options
 * @param {string} [options.status] - Filter by status
 * @param {string} [options.userId] - Filter by user ID
 * @returns {Promise<Array>} Array of submissions
 */
export const getSubmissionsForActivity = async (activityId, options = {}) => {
  try {
    let query = supabase
      .from('submissions')
      .select(`
        *,
        profiles:student_id (id, full_name),
        activities (id, title)
      `)
      .eq('activity_id', activityId)
      .order('submitted_at', { ascending: false });

    // Apply filters
    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting submissions:', error);
    throw error;
  }
};

/**
 * Grade a submission
 * @param {string} submissionId - The submission ID
 * @param {Object} gradingData - The grading data
 * @param {number} gradingData.grade - The final grade (0-100)
 * @param {string} gradingData.feedback - The feedback
 * @returns {Promise<Object>} The updated submission
 */
export const gradeSubmission = async (submissionId, gradingData) => {
  try {
    const { answers = [], ...updateData } = gradingData;
    
    // Fetch current submission before update (to detect grade changes)
    const { data: currentSub } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    // Update
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .update({
        grade: updateData.grade ?? null,
        feedback: updateData.feedback ?? null,
        graded_at: new Date().toISOString(),
        status: 'graded',
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (submissionError) throw submissionError;

    // Answers table removed from flow; keep only feedback history and notifications

    // Add to feedback history
    if (gradingData.feedback) {
      const { error: feedbackError } = await supabase
        .from('feedback_history')
        .insert([
          {
            submission_id: submissionId,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            feedback: gradingData.feedback,
            feedback_type: 'manual'
          }
        ]);

      if (feedbackError) throw feedbackError;
    }

    // Notify student: activity corrected (email + push)
    try {
      // get activity title
      const { data: activity } = await supabase
        .from('activities')
        .select('id, title, max_score')
        .eq('id', submission.activity_id)
        .single();

      // get student email
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', submission.user_id)
        .single();

      // Activity corrected
      await NotificationOrchestrator.send('activityCorrected', {
        userId: submission.user_id,
        email: studentProfile?.email || undefined,
        variables: {
          activityName: activity?.title || 'Atividade',
          grade: updateData.grade ?? submission.grade ?? 0,
          maxGrade: activity?.max_score || 100,
          viewUrl: `/dashboard/activities/${submission.activity_id}/submissions/${submissionId}`
        },
        metadata: { submissionId, activityId: submission.activity_id }
      });

      // Feedback added
      if (gradingData.feedback) {
        await NotificationOrchestrator.send('feedbackAdded', {
          userId: submission.user_id,
          email: studentProfile?.email || undefined,
          variables: { activityName: activity?.title || 'Atividade' },
          metadata: { submissionId, activityId: submission.activity_id }
        });
      }

      // Grade changed
      if (currentSub?.grade != null && updateData.grade != null && currentSub.grade !== updateData.grade) {
        await NotificationOrchestrator.send('gradeChanged', {
          userId: submission.user_id,
          email: studentProfile?.email || undefined,
          variables: {
            activityName: activity?.title || 'Atividade',
            oldGrade: currentSub.grade,
            newGrade: updateData.grade
          }
        });
      }
    } catch (e) {
      console.warn('Falha ao notificar correção/feedback:', e);
    }

    return submission;
  } catch (error) {
    console.error('Error grading submission:', error);
    throw error;
  }
};

/**
 * Get submission statistics for an activity
 * @param {string} activityId - The activity ID
 * @returns {Promise<Object>} Statistics about submissions
 */
export const getSubmissionStats = async (activityId) => {
  try {
    // Get total students in classes where this activity is assigned
    const { count: totalStudents, error: countError } = await supabase
      .from('class_members')
      .select('*', { count: 'exact', head: true })
      .in('class_id', 
        supabase.from('activity_class_assignments').select('class_id').eq('activity_id', activityId)
      );

    if (countError) throw countError;

    // Get submission counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('submissions')
      .select('status, count', { count: 'exact' })
      .eq('activity_id', activityId)
      .group('status');

    if (statusError) throw statusError;

    // Format the results
    const stats = {
      total_students: totalStudents || 0,
      submitted: 0,
      graded: 0,
      late: 0,
      not_submitted: 0,
      average_grade: 0,
      plagiarism_detected: 0
    };

    // Process status counts
    statusCounts?.forEach(item => {
      if (item.status === 'submitted') stats.submitted = item.count;
      if (item.status === 'graded') stats.graded = item.count;
      if (item.status === 'late') stats.late = item.count;
    });

    stats.not_submitted = stats.total_students - (stats.submitted + stats.graded + stats.late);

    // Get average grade
    const { data: gradeData, error: gradeError } = await supabase
      .from('submissions')
      .select('grade')
      .eq('activity_id', activityId)
      .not('grade', 'is', null);

    if (!gradeError && gradeData?.length > 0) {
      const total = gradeData.reduce((sum, item) => sum + (item.grade || 0), 0);
      stats.average_grade = parseFloat((total / gradeData.length).toFixed(2));
    }

    // Get plagiarism count
    const { count: plagiarismCount, error: plagiarismError } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('activity_id', activityId)
      .eq('is_plagiarized', true);

    if (!plagiarismError) {
      stats.plagiarism_detected = plagiarismCount || 0;
    }

    return stats;
  } catch (error) {
    console.error('Error getting submission stats:', error);
    throw error;
  }
};

/**
 * Submit a draft submission
 * @param {string} submissionId - The submission ID
 * @returns {Promise<Object>} The updated submission
 */
export const submitDraft = async (submissionId) => {
  try {
    // Get the current submission
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError) throw fetchError;

    // Check if already submitted
    if (submission.status !== 'draft') {
      throw new Error('This submission has already been submitted');
    }

    // Update the submission status
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('submissions')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Conditional plagiarism check (only if activity has it enabled)
    try {
      const { data: subActivity } = await supabase
        .from('activities')
        .select('id, class_id, plagiarism_enabled')
        .eq('id', submission.activity_id)
        .single();

      if (subActivity?.plagiarism_enabled) {
        // Load submission data and extract text
        const { data: sub } = await supabase
          .from('submissions')
          .select('data')
          .eq('id', submissionId)
          .single();

        const items = Array.isArray(sub?.data) ? sub.data : Object.values(sub?.data || {});
        const textContent = (items || [])
          .map(v => (typeof v === 'string' ? v : (typeof v?.answer_text === 'string' ? v.answer_text : '')))
          .filter(Boolean)
          .join('\n\n');

        if (textContent) {
          const res = await invokeEdgeCheck({
            submissionId,
            activityId: subActivity.id,
            classId: null, // Will be handled by plagiarism service
            text: textContent,
            rephrased: true,
          });
          if (!res) { try { await checkTextForPlagiarism(textContent); } catch (e) { console.warn('checkTextForPlagiarism fallback failed:', e); } }
        }
      }
    } catch (plagErr) {
      console.warn('Plagiarism check skipped (non-blocking):', plagErr);
    }

    return updatedSubmission;
  } catch (error) {
    console.error('Error submitting draft:', error);
    throw error;
  }
};
