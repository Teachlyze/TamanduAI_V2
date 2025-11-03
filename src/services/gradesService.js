import { logger } from '@/shared/utils/logger';
import { supabase } from '@/lib/supabaseClient';

/**
 * Grades Service
 * Gerencia o painel de notas, estatísticas e exportação
 */

/**
 * Get student grades summary for a class
 * @param {string} classId - Class ID
 * @returns {Promise<Array>} Student grades
 */
export const getStudentGrades = async (classId) => {
  try {
    const { data, error } = await supabase
      .from('student_grades')
      .select('*')
      .eq('class_id', classId)
      .order('student_name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Error getting student grades:', error)
    throw error;
  }
};

/**
 * Get activity grades summary for a class
 * @param {string} classId - Class ID
 * @returns {Promise<Array>} Activity grades
 */
export const getActivityGrades = async (classId) => {
  try {
    const { data, error } = await supabase
      .from('activity_grades')
      .select('*')
      .eq('class_id', classId)
      .order('due_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Error getting activity grades:', error)
    throw error;
  }
};

/**
 * Get grade matrix (student x activity)
 * @param {string} classId - Class ID
 * @returns {Promise<Array>} Grade matrix
 */
export const getGradeMatrix = async (classId) => {
  try {
    const { data, error } = await supabase
      .from('class_grade_matrix')
      .select('*')
      .eq('class_id', classId)
      .order('student_name')
      .order('due_date');

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Error getting grade matrix:', error)
    throw error;
  }
};

/**
 * Get class grade statistics
 * @param {string} classId - Class ID
 * @returns {Promise<Object>} Statistics
 */
export const getClassGradeStats = async (classId) => {
  try {
    const { data, error } = await supabase
      .rpc('get_class_grade_stats', { p_class_id: classId });

    if (error) throw error;
    return data?.[0] || {};
  } catch (error) {
    logger.error('Error getting class stats:', error)
    throw error;
  }
};

/**
 * Update a grade (inline edit)
 * @param {string} submissionId - Submission ID
 * @param {number} grade - New grade
 * @param {string} feedback - Optional feedback
 * @returns {Promise<Object>} Updated submission
 */
export const updateGrade = async (submissionId, grade, feedback = null) => {
  try {
    const updateData = {
      grade,
      status: 'graded',
      graded_at: new Date().toISOString(),
    };

    if (feedback !== null) {
      updateData.feedback = feedback;
    }

    const { data, error } = await supabase
      .from('submissions')
      .update(updateData)
      .eq('id', submissionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error updating grade:', error)
    throw error;
  }
};

/**
 * Get export data for Excel/PDF
 * @param {string} classId - Class ID
 * @returns {Promise<Array>} Export data
 */
export const getGradesExportData = async (classId) => {
  try {
    const { data, error } = await supabase
      .rpc('get_class_grades_export', { p_class_id: classId });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Error getting export data:', error)
    throw error;
  }
};

/**
 * Transform matrix data for table display
 * @param {Array} matrixData - Raw matrix data
 * @returns {Object} { students, activities, grades }
 */
export const transformMatrixData = (matrixData) => {
  // Get unique students
  const studentsMap = new Map();
  matrixData.forEach(row => {
    if (!studentsMap.has(row.student_id)) {
      studentsMap.set(row.student_id, {
        id: row.student_id,
        name: row.student_name,
      });
    }
  });
  const students = Array.from(studentsMap.values());

  // Get unique activities
  const activitiesMap = new Map();
  matrixData.forEach(row => {
    if (!activitiesMap.has(row.activity_id)) {
      activitiesMap.set(row.activity_id, {
        id: row.activity_id,
        title: row.activity_title,
        total_points: row.total_points,
        due_date: row.due_date,
      });
    }
  });
  const activities = Array.from(activitiesMap.values());

  // Build grades map: student_id -> { activity_id -> grade_data }
  const grades = {};
  matrixData.forEach(row => {
    if (!grades[row.student_id]) {
      grades[row.student_id] = {};
    }
    grades[row.student_id][row.activity_id] = {
      submission_id: row.submission_id,
      grade: row.grade,
      status: row.status,
      percentage: row.percentage,
      is_late: row.is_late,
      submitted_at: row.submitted_at,
      graded_at: row.graded_at,
      feedback: row.feedback,
    };
  });

  return { students, activities, grades };
};

/**
 * Calculate student average
 * @param {string} studentId - Student ID
 * @param {Object} grades - Grades object
 * @returns {number} Average grade percentage
 */
export const calculateStudentAverage = (studentId, grades) => {
  const studentGrades = grades[studentId] || {};
  const gradedActivities = Object.values(studentGrades).filter(
    g => g.status === 'graded' && g.percentage !== null
  );

  if (gradedActivities.length === 0) return null;

  const sum = gradedActivities.reduce((acc, g) => acc + g.percentage, 0);
  return Math.round((sum / gradedActivities.length) * 10) / 10;
};

/**
 * Calculate activity average
 * @param {string} activityId - Activity ID
 * @param {Object} grades - Grades object
 * @returns {number} Average grade percentage
 */
export const calculateActivityAverage = (activityId, grades) => {
  const activityGrades = [];
  
  Object.values(grades).forEach(studentGrades => {
    const grade = studentGrades[activityId];
    if (grade && grade.status === 'graded' && grade.percentage !== null) {
      activityGrades.push(grade.percentage);
    }
  });

  if (activityGrades.length === 0) return null;

  const sum = activityGrades.reduce((acc, p) => acc + p, 0);
  return Math.round((sum / activityGrades.length) * 10) / 10;
};

export default {
  getStudentGrades,
  getActivityGrades,
  getGradeMatrix,
  getClassGradeStats,
  updateGrade,
  getGradesExportData,
  transformMatrixData,
  calculateStudentAverage,
  calculateActivityAverage,
};
