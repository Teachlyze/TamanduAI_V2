import { logger } from '@/shared/utils/logger';
import { supabase } from '@/shared/services/supabaseClient';
import NotificationOrchestrator from '@/shared/services/notificationOrchestrator';

// Winston AI API Configuration
const WINSTON_API_KEY = import.meta.env.VITE_WINSTON_API_KEY || '';
const WINSTON_API_URL = 'https://api.gowinston.ai/v2';

// Plagiarism severity thresholds
const PLAGIARISM_THRESHOLDS = {
  NONE: 0,
  LOW: 20,
  MEDIUM: 35,
  HIGH: 50,
  CRITICAL: 75
};

/**
 * Map Winston AI score to plagiarism severity
 */
const mapScoreToSeverity = (score) => {
  if (score >= PLAGIARISM_THRESHOLDS.CRITICAL) return 'critical';
  if (score >= PLAGIARISM_THRESHOLDS.HIGH) return 'high';
  if (score >= PLAGIARISM_THRESHOLDS.MEDIUM) return 'medium';
  if (score >= PLAGIARISM_THRESHOLDS.LOW) return 'low';
  return 'none';
};

/**
 * Check text for plagiarism using Winston AI API
 * @param {string} text - The text to check for plagiarism
 * @param {Object} options - Additional options for the plagiarism check
 * @returns {Promise<Object>} - The plagiarism check results
 */
export const checkTextForPlagiarism = async (text, options = {}) => {
  try {
    if (!WINSTON_API_KEY) {
      throw new Error('Winston AI API key not configured');
    }

    const response = await fetch(`${WINSTON_API_URL}/plagiarism`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WINSTON_API_KEY}`,
      },
      body: JSON.stringify({
        text,
        file: options.file,
        website: options.website,
        excluded_sources: options.excluded_sources || options.excludedSources || [],
        language: options.language || 'pt',
        country: options.country || 'br',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `Winston AI error: ${response.status}`);
    }

    const payload = await response.json();

    const score = typeof payload?.result?.score === 'number' ? payload.result.score : 0;

    return {
      score,
      severity: mapScoreToSeverity(score),
      // A API de plágio não traz IA; manter campos para compatibilidade
      aiDetected: false,
      sources: Array.isArray(payload?.sources) ? payload.sources : [],
      rawResponse: payload,
      confidence: 0,
    };
  } catch (error) {
    logger.error('Error checking for plagiarism with Winston AI:', error)
    throw error;
  }
};

/**
 * Check submission for plagiarism using Winston AI
 * @param {string} submissionId - The submission ID
 * @param {string} text - The text content to check
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - The plagiarism check results
 */
export const checkSubmissionForPlagiarism = async (submissionId, text, options = {}) => {
  try {
    // Get submission details
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select(`
        id,
        activity_id,
        student_id,
        activities (
          id,
          class_id,
          plagiarism_enabled
        )
      `)
      .eq('id', submissionId)
      .single();

    if (submissionError) throw submissionError;

    if (!submission?.activities?.plagiarism_enabled) {
      return { message: 'Plagiarism check disabled for this activity' };
    }

    // Check if already checked recently (within 1 hour)
    const { data: existingCheck } = await supabase
      .from('plagiarism_checks_v2')
      .select('*')
      .eq('submission_id', submissionId)
      .gte('checked_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('checked_at', { ascending: false })
      .limit(1)
      .single();

    if (existingCheck) {
      return existingCheck;
    }

    // Perform plagiarism check
    const plagiarismResult = await checkTextForPlagiarism(text, options);

    // Get class_id from activity
    const { data: activityData } = await supabase
      .from('activity_class_assignments')
      .select('class_id')
      .eq('activity_id', submission.activity_id)
      .limit(1)
      .single();

    // Store the result in the database
    const { data: checkResult, error: insertError } = await supabase
      .from('plagiarism_checks_v2')
      .insert([
        {
          submission_id: submissionId,
          activity_id: submission.activity_id,
          class_id: null, // Will be populated by trigger or separate query
          plag_percent: plagiarismResult.score,
          unique_percent: plagiarismResult.rawResponse?.unique_percent || (100 - plagiarismResult.score),
          rephrased_percent: plagiarismResult.rawResponse?.rephrased_percent || 0,
          exact_matched_percent: plagiarismResult.rawResponse?.exact_matched_percent || 0,
          severity: plagiarismResult.severity,
          sources_detected: plagiarismResult.sources,
          winston_api_response: plagiarismResult.rawResponse,
          status: 'completed',
        }
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    // Update submission plagiarism check status
    await supabase
      .from('submissions')
      .update({
        plagiarism_check_status: 'completed',
        plagiarism_checked_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    if (insertError) throw insertError;

    // Notify teacher if plagiarism detected
    if (plagiarismResult.severity !== 'none') {
      await notifyTeacherOfPlagiarism(submission, plagiarismResult);
    }

    return checkResult;

  } catch (error) {
    logger.error('Error in checkSubmissionForPlagiarism:', error)
    throw error;
  }
};

/**
 * Get plagiarism check for a specific submission
 * @param {string} submissionId - The submission ID
 * @returns {Promise<Object|null>} - The plagiarism check result or null
 */
export const getPlagiarismCheckForSubmission = async (submissionId) => {
  try {
    const { data, error } = await supabase
      .from('plagiarism_checks_v2')
      .select('*')
      .eq('submission_id', submissionId)
      .order('checked_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return data || null;
  } catch (error) {
    logger.error('Error getting plagiarism check:', error)
    return null;
  }
};

/**
 * Get all plagiarism checks for an activity
 * @param {string} activityId - The activity ID
 * @returns {Promise<Array>} - Array of plagiarism checks
 */
export const getPlagiarismChecksForActivity = async (activityId) => {
  try {
    const { data, error } = await supabase
      .from('plagiarism_checks_v2')
      .select(`
        *,
        submissions (
          id,
          student_id,
          profiles (full_name)
        )
      `)
      .eq('submissions.activity_id', activityId)
      .order('checked_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error('Error getting plagiarism checks for activity:', error)
    return [];
  }
};

/**
 * Get all plagiarism checks for a class (across all activities in the class)
 * @param {string} classId - The class ID
 * @returns {Promise<Array>} - Array of plagiarism checks
 */
export const getPlagiarismChecksForClass = async (classId) => {
  try {
    // 1) Fetch all activity IDs for the class
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('id')
      .eq('class_id', classId);

    if (activitiesError) throw activitiesError;

    const activityIds = (activities || []).map((a) => a.id);
    if (activityIds.length === 0) {
      return [];
    }

    // 2) Fetch checks for submissions that belong to those activities
    const { data, error } = await supabase
      .from('plagiarism_checks_v2')
      .select(`
        *,
        submissions (
          id,
          activity_id,
          student_id,
          profiles (full_name)
        )
      `)
      .in('submissions.activity_id', activityIds)
      .order('checked_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error('Error getting plagiarism checks for class:', error)
    return [];
  }
};

/**
 * Get plagiarism notification settings for a class
 * @param {string} classId - The class ID
 * @returns {Promise<Object|null>} - The notification settings or null
 */
export const getPlagiarismNotificationSettings = async (classId) => {
  try {
    const { data, error } = await supabase
      .from('plagiarism_notification_settings')
      .select('*')
      .eq('class_id', classId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  } catch (error) {
    logger.error('Error getting plagiarism notification settings:', error)
    return null;
  }
};

/**
 * Update plagiarism notification settings for a class
 * @param {string} classId - The class ID
 * @param {Object} settings - The notification settings
 * @returns {Promise<Object>} - The updated settings
 */
export const updatePlagiarismNotificationSettings = async (classId, settings) => {
  try {
    const { data, error } = await supabase
      .from('plagiarism_notification_settings')
      .upsert([
        {
          class_id: classId,
          ...settings,
          updated_at: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('Error updating plagiarism notification settings:', error)
    throw error;
  }
};

/**
 * Generate a content hash for duplicate detection
 * @param {string} content - The content to hash
 * @returns {Promise<string>} - The content hash
 */
const generateContentHash = async (content) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Notify teacher of plagiarism detection
 * @param {Object} submission - The submission data
 * @param {Object} plagiarismResult - The plagiarism check result
 */
const notifyTeacherOfPlagiarism = async (submission, plagiarismResult) => {
  try {
    const { activities, user_id } = submission;

    if (!activities?.id) return;

    // Get class info from activity_class_assignments
    const { data: classAssignments } = await supabase
      .from('activity_class_assignments')
      .select(`
        class_id,
        classes (
          id,
          name,
          created_by,
          professor_id
        )
      `)
      .eq('activity_id', activities.id);

    if (!classAssignments?.length) return;

    // Get student profile
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user_id)
      .single();

    // Notify teachers of all classes this activity is assigned to
    for (const assignment of classAssignments) {
      const classData = assignment.classes;
      if (!classData?.created_by) continue;

      // Get notification settings
      const settings = await getPlagiarismNotificationSettings(assignment.class_id);

      // Check if we should notify based on severity thresholds
      if (settings && !shouldNotifyForSeverity(plagiarismResult.severity, settings)) {
        continue;
      }

      // Send notification
      await NotificationOrchestrator.send('plagiarismDetected', {
        userId: classData.created_by,
        variables: {
          studentName: studentProfile?.full_name || 'Aluno',
          activityName: activities.title || 'Atividade',
          severity: plagiarismResult.severity,
          score: Math.round(plagiarismResult.score),
        },
        channelOverride: settings?.notify_push !== false ? 'push' : undefined,
        email: settings?.notify_email !== false ? true : undefined,
        metadata: {
          submissionId: submission.id,
          activityId: activities.id,
          classId: assignment.class_id,
          severity: plagiarismResult.severity,
          score: plagiarismResult.score,
        }
      });
    }

  } catch (error) {
    logger.error('Error notifying teacher of plagiarism:', error)
  }
};

/**
 * Check if we should notify for a given severity level
 * @param {string} severity - The plagiarism severity
 * @param {Object} settings - The notification settings
 * @returns {boolean} - Whether to notify
 */
const shouldNotifyForSeverity = (severity, settings) => {
  if (!settings?.notify_immediately) return false;

  switch (severity) {
    case 'critical':
      return true;
    case 'high':
      return settings.threshold_high <= PLAGIARISM_THRESHOLDS.HIGH;
    case 'medium':
      return settings.threshold_medium <= PLAGIARISM_THRESHOLDS.MEDIUM;
    case 'low':
      return settings.threshold_low <= PLAGIARISM_THRESHOLDS.LOW;
    default:
      return false;
  }
};

/**
 * Get plagiarism statistics for a class
 * @param {string} classId - The class ID
 * @returns {Promise<Object>} - Statistics object
 */
export const getPlagiarismStatsForClass = async (classId) => {
  try {
    const { data, error } = await supabase
      .from('plagiarism_checks_v2')
      .select(`
        plagiarism_severity,
        ai_detected,
        winston_score,
        checked_at,
        submissions (
          activity_id,
          user_id,
          profiles (full_name)
        )
      `)
      .in('submissions.activity_id',
        supabase.from('activity_class_assignments').select('activity_id').eq('class_id', classId)
      );

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      bySeverity: {
        none: 0,
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
      aiDetected: 0,
      averageScore: 0,
      recentChecks: data?.slice(0, 10) || [],
    };

    if (data && data.length > 0) {
      // Count by severity
      data.forEach(check => {
        stats.bySeverity[check.plagiarism_severity]++;
        if (check.ai_detected) stats.aiDetected++;
      });

      // Calculate average score
      const scores = data.map(check => check.winston_score || 0).filter(score => score > 0);
      stats.averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    }

    return stats;
  } catch (error) {
    logger.error('Error getting plagiarism stats:', error)
    return {
      total: 0,
      bySeverity: { none: 0, low: 0, medium: 0, high: 0, critical: 0 },
      aiDetected: 0,
      averageScore: 0,
      recentChecks: [],
    };
  }
};

/**
 * Batch check multiple submissions for plagiarism
 * @param {Array} submissions - Array of submission objects with id and text
 * @returns {Promise<Array>} - Array of plagiarism check results
 */
export const batchCheckPlagiarism = async (submissions) => {
  const results = [];

  for (const submission of submissions) {
    try {
      const result = await checkSubmissionForPlagiarism(submission.id, submission.text);
      results.push({
        submissionId: submission.id,
        success: true,
        result,
      });
    } catch (error) {
      results.push({
        submissionId: submission.id,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
};

/**
 * Invoke Edge Function to run Winston AI plagiarism check asynchronously
 * @param {Object} params - The parameters for the edge function
 * @returns {Promise<Object|null>} - The edge function result or null on error
 */
export const invokeEdgeCheck = async ({ submissionId, activityId, classId, text, recheck = false }) => {
  try {
    const { data, error } = await supabase.functions.invoke('plagiarism-check-v2', {
      body: { submission_id: submissionId, activity_id: activityId, class_id: classId, text, recheck },
    });

    if (error) throw error;
    return data;
  } catch (e) {
    logger.warn('Edge function plagiarism check failed:', e)
    return null;
  }
};

/**
 * Verificar plágio usando Edge Function (versão nova e otimizada)
 * @param {string} submissionId - ID da submissão
 * @param {string} text - Texto para verificar
 * @returns {Promise<Object>} - Resultado da verificação
 */
export const checkPlagiarismWithEdgeFunction = async (submissionId, text) => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/check-plagiarism`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submissionId,
        text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao verificar plágio');
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    logger.error('Erro ao verificar plágio com edge function:', error)
    
    // Fallback: usar método direto
    try {
      const result = await checkSubmissionForPlagiarism(submissionId, text);
      return { data: result, error: null };
    } catch (fallbackError) {
      return { data: null, error: fallbackError };
    }
  }
};
