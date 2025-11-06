import { logger } from '@/shared/utils/logger';
import { supabase } from '@/shared/services/supabaseClient';
import NotificationOrchestrator from '@/shared/services/notificationOrchestrator';

/**
 * Activity Service
 * Handles all activity-related operations with Supabase
 */

/**
 * Get activities by class
 * @param {string} classId - Class ID
 * @returns {Promise<Array>} - Array of activities
 */
const getActivitiesByClass = async (classId) => {
  try {
    const { data, error } = await supabase
      .from('activity_class_assignments')
      .select(`
        activity:activities (
          id,
          title,
          description,
          created_at,
          due_date,
          status,
          max_score
        )
      `)
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Mapeia os dados para o formato esperado
    return data.map(item => ({
      ...item.activity,
      class_assignment_id: item.id
    }));
  } catch (error) {
    logger.error('Error fetching activities by class:', error);
    throw error;
  }
};

export const ActivityService = {
  /**
   * Create a new activity
   * @param {Object} activityData - Activity data
   * @param {string} activityData.title - Activity title
   * @param {string} activityData.description - Activity description
   * @param {string} activityData.created_by - Teacher ID
   * @param {number} activityData.max_score - Maximum score
   * @param {string} activityData.due_date - Due date
   * @param {string} activityData.type - Activity type
   * @param {boolean} activityData.plagiarism_enabled - Enable plagiarism check
   * @param {number} activityData.plagiarism_threshold - Plagiarism threshold (0-100)
   * @returns {Promise<Object>} - Created activity
   */
  async createActivity(activityData) {
    const {
      title,
      description,
      created_by,
      max_score = 100,
      due_date,
      type = 'assignment',
      plagiarism_enabled = false,
      plagiarism_threshold = 35,
      instructions,
      content
    } = activityData;

    const { data, error } = await supabase
      .from('activities')
      .insert({
        title,
        description,
        instructions: instructions || description,
        content: content || {},
        created_by,
        max_score,
        max_grade: max_score, // Compatibilidade
        due_date,
        type,
        status: 'draft',
        is_draft: true,
        is_published: false,
        plagiarism_enabled,
        plagiarism_threshold,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating activity:', error)
      throw error;
    }

    return data;
  },

  /**
   * Update an existing activity
   * @param {string} activityId - Activity ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} - Updated activity
   */
  async updateActivity(activityId, updates) {
    const { data, error } = await supabase
      .from('activities')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', activityId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating activity:', error)
      throw error;
    }

    return data;
  },

  /**
   * Publish activity to specific classes
   * @param {string} activityId - Activity ID
   * @param {Array<string>} classIds - Array of class IDs
   * @param {boolean} plagiarismEnabled - Enable plagiarism check
   * @returns {Promise<Object>} - Published activity
   */
  async publishActivity(activityId, classIds, plagiarismEnabled = false) {
    // Update activity status
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .update({
        status: 'active',
        is_published: true,
        is_draft: false,
        plagiarism_enabled: plagiarismEnabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', activityId)
      .select()
      .single();

    if (activityError) {
      logger.error('Error publishing activity:', activityError)
      throw activityError;
    }

    // Assign to classes
    if (classIds && classIds.length > 0) {
      const assignments = classIds.map(classId => ({
        activity_id: activityId,
        class_id: classId,
        assigned_at: new Date().toISOString()
      }));

      const { error: assignError } = await supabase
        .from('activity_class_assignments')
        .insert(assignments);

      if (assignError && assignError.code !== '23505') { // Ignore duplicates
        logger.error('Error assigning activity to classes:', assignError)
        throw assignError;
      }

      // Notify students in those classes
      try {
        for (const classId of classIds) {
          const { data: members } = await supabase
            .from('class_members')
            .select('user_id')
            .eq('class_id', classId)
            .eq('role', 'student');

          const studentIds = members?.map(m => m.user_id) || [];

          for (const studentId of studentIds) {
            await NotificationOrchestrator.send('activityPublished', {
              userId: studentId,
              variables: {
                activityTitle: activity.title,
                dueDate: activity.due_date ? new Date(activity.due_date).toLocaleDateString('pt-BR') : 'Sem prazo'
              },
              channelOverride: 'push',
              metadata: { activityId, classId }
            });
          }
        }
      } catch (e) {
        logger.warn('Failed to notify students:', e)
      }
    }

    return activity;
  },

  /**
   * Get activity by ID
   * @param {string} activityId - Activity ID
   * @returns {Promise<Object>} - Activity data
   */
  async getActivityById(activityId) {
    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        created_by_user:profiles!activities_created_by_fkey(id, full_name, avatar_url),
        assignments:activity_class_assignments(
          class_id,
          class:classes(id, name, subject, color)
        )
      `)
      .eq('id', activityId)
      .single();

    if (error) {
      logger.error('Error fetching activity:', error)
      throw error;
    }

    return data;
  },

  /**
   * Get activities by teacher
   * @param {string} teacherId - Teacher ID
   * @param {Object} options - Filter options
   * @param {string} [options.status] - Filter by status
   * @param {boolean} [options.includeDrafts=true] - Include drafts
   * @returns {Promise<Array>} - Array of activities
   */
  async getActivitiesByTeacher(teacherId, { status, includeDrafts = true } = {}) {
    let query = supabase
      .from('activities')
      .select(`
        *,
        assignments:activity_class_assignments(
          class_id,
          class:classes(id, name, subject)
        )
      `)
      .eq('created_by', teacherId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (!includeDrafts) {
      query = query.eq('is_draft', false);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching activities:', error)
      throw error;
    }

    return data;
  },

  /**
   * Get submissions for an activity
   * @param {string} activityId - Activity ID
   * @returns {Promise<Array>} - Array of submissions
   */
  async getActivitySubmissions(activityId) {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        student:profiles!submissions_student_id_fkey(id, full_name, avatar_url)
      `)
      .eq('activity_id', activityId)
      .order('submitted_at', { ascending: false });

    if (error) {
      logger.error('Error fetching submissions:', error)
      throw error;
    }

    return data;
  },

  /**
   * Delete an activity
   * @param {string} activityId - Activity ID
   * @returns {Promise<boolean>} - Success
   */
  async deleteActivity(activityId) {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', activityId);

    if (error) {
      logger.error('Error deleting activity:', error)
      throw error;
    }

    return true;
  },

  /**
   * Get activities by class
   * @param {string} classId - Class ID
   * @returns {Promise<Array>} - Array of activities
   */
  async getActivitiesByClass(classId) {
    const { data, error } = await supabase
      .from('activity_class_assignments')
      .select(`
        activity_id,
        activity:activities(
          id,
          title,
          description,
          due_date,
          created_at,
          created_by_user:profiles!activities_created_by_fkey(id, full_name, avatar_url)
        )
      `)
      .eq('class_id', classId);

    if (error) {
      logger.error('Error fetching activities:', error)
      throw error;
    }

    return data.map(a => a.activity);
  },

  /**
   * Get activity statistics
   * @param {string} activityId - Activity ID
   * @returns {Promise<Object>} - Statistics
   */
  async getActivityStats(activityId) {
    const { data: submissions } = await supabase
      .from('submissions')
      .select('id, status, grade, submitted_at')
      .eq('activity_id', activityId);

    const total = submissions?.length || 0;
    const submitted = submissions?.filter(s => s.submitted_at).length || 0;
    const graded = submissions?.filter(s => s.grade !== null).length || 0;
    const pending = submitted - graded;

    const grades = submissions?.filter(s => s.grade !== null).map(s => parseFloat(s.grade)) || [];
    const avgGrade = grades.length > 0
      ? grades.reduce((a, b) => a + b, 0) / grades.length
      : 0;

    return {
      total,
      submitted,
      graded,
      pending,
      avgGrade: avgGrade.toFixed(2),
      submissionRate: total > 0 ? ((submitted / total) * 100).toFixed(1) : 0
    };
  }
};

export default ActivityService;
