import { supabase } from '@/lib/supabaseClient';

/**
 * Class Analytics Service
 * Serviço completo para analytics de turmas
 */

/**
 * Get class performance overview
 * @param {string} classId - Class ID
 * @returns {Promise<Object>} Performance metrics
 */
export const getClassOverview = async (classId) => {
  try {
    const { data, error } = await supabase
      .from('class_performance_overview')
      .select('*')
      .eq('class_id', classId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting class overview:', error);
    throw error;
  }
};

/**
 * Get daily activity for last 30 days
 * @param {string} classId - Class ID
 * @returns {Promise<Array>} Daily activity data
 */
export const getDailyActivity = async (classId) => {
  try {
    const { data, error } = await supabase
      .from('class_daily_activity')
      .select('*')
      .eq('class_id', classId)
      .order('activity_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting daily activity:', error);
    throw error;
  }
};

/**
 * Get student ranking for class
 * @param {string} classId - Class ID
 * @param {number} limit - Optional limit
 * @returns {Promise<Array>} Student ranking
 */
export const getStudentRanking = async (classId, limit = null) => {
  try {
    let query = supabase
      .from('class_student_ranking')
      .select('*')
      .eq('class_id', classId)
      .order('rank_position', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting student ranking:', error);
    throw error;
  }
};

/**
 * Get activity performance for class
 * @param {string} classId - Class ID
 * @returns {Promise<Array>} Activity performance data
 */
export const getActivityPerformance = async (classId) => {
  try {
    const { data, error } = await supabase
      .from('class_activity_performance')
      .select('*')
      .eq('class_id', classId)
      .order('due_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting activity performance:', error);
    throw error;
  }
};

/**
 * Get AI-powered insights for class
 * @param {string} classId - Class ID
 * @returns {Promise<Object>} Insights object
 */
export const getClassInsights = async (classId) => {
  try {
    const { data, error } = await supabase
      .rpc('get_class_insights', { p_class_id: classId });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting class insights:', error);
    throw error;
  }
};

/**
 * Compare classes for a teacher
 * @param {string} teacherId - Teacher ID
 * @returns {Promise<Array>} Comparison data
 */
export const compareClasses = async (teacherId) => {
  try {
    const { data, error } = await supabase
      .rpc('compare_classes', { p_teacher_id: teacherId });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error comparing classes:', error);
    throw error;
  }
};

/**
 * Get performance trend (last 7 days vs previous 7 days)
 * @param {string} classId - Class ID
 * @returns {Promise<Object>} Trend data
 */
export const getPerformanceTrend = async (classId) => {
  try {
    const dailyData = await getDailyActivity(classId);
    
    if (!dailyData || dailyData.length === 0) {
      return {
        submissions_trend: 0,
        grading_trend: 0,
        engagement_trend: 0,
      };
    }

    // Split into last 7 and previous 7
    const last7 = dailyData.slice(-7);
    const previous7 = dailyData.slice(-14, -7);

    const calculateAvg = (arr, key) => {
      const sum = arr.reduce((acc, item) => acc + (item[key] || 0), 0);
      return sum / arr.length || 0;
    };

    const last7SubmissionsAvg = calculateAvg(last7, 'submissions_count');
    const previous7SubmissionsAvg = calculateAvg(previous7, 'submissions_count');

    const last7GradedAvg = calculateAvg(last7, 'graded_count');
    const previous7GradedAvg = calculateAvg(previous7, 'graded_count');

    const last7EngagementAvg = calculateAvg(last7, 'posts_count') + calculateAvg(last7, 'comments_count');
    const previous7EngagementAvg = calculateAvg(previous7, 'posts_count') + calculateAvg(previous7, 'comments_count');

    const calculateTrend = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      submissions_trend: calculateTrend(last7SubmissionsAvg, previous7SubmissionsAvg),
      grading_trend: calculateTrend(last7GradedAvg, previous7GradedAvg),
      engagement_trend: calculateTrend(last7EngagementAvg, previous7EngagementAvg),
      last_7_days: {
        submissions: last7SubmissionsAvg,
        graded: last7GradedAvg,
        engagement: last7EngagementAvg,
      },
      previous_7_days: {
        submissions: previous7SubmissionsAvg,
        graded: previous7GradedAvg,
        engagement: previous7EngagementAvg,
      },
    };
  } catch (error) {
    console.error('Error getting performance trend:', error);
    throw error;
  }
};

/**
 * Get grade distribution for class
 * @param {string} classId - Class ID
 * @returns {Promise<Object>} Grade distribution
 */
export const getGradeDistribution = async (classId) => {
  try {
    const activities = await getActivityPerformance(classId);

    const distribution = {
      excellent: 0, // 90-100%
      good: 0,      // 70-89%
      average: 0,   // 50-69%
      below: 0,     // < 50%
    };

    activities.forEach(activity => {
      distribution.excellent += activity.excellent_count || 0;
      distribution.good += activity.good_count || 0;
      distribution.average += activity.average_count || 0;
      distribution.below += activity.below_average_count || 0;
    });

    const total = distribution.excellent + distribution.good + distribution.average + distribution.below;

    return {
      ...distribution,
      total,
      percentages: {
        excellent: total > 0 ? (distribution.excellent / total) * 100 : 0,
        good: total > 0 ? (distribution.good / total) * 100 : 0,
        average: total > 0 ? (distribution.average / total) * 100 : 0,
        below: total > 0 ? (distribution.below / total) * 100 : 0,
      },
    };
  } catch (error) {
    console.error('Error getting grade distribution:', error);
    throw error;
  }
};

/**
 * Get engagement metrics
 * @param {string} classId - Class ID
 * @returns {Promise<Object>} Engagement metrics
 */
export const getEngagementMetrics = async (classId) => {
  try {
    const overview = await getClassOverview(classId);
    const ranking = await getStudentRanking(classId);

    const activeStudents = ranking.filter(s => 
      (s.posts_created || 0) + (s.comments_made || 0) > 0
    ).length;

    const totalStudents = overview.total_students || 1;
    const participationRate = (activeStudents / totalStudents) * 100;

    return {
      total_posts: overview.total_posts || 0,
      total_comments: overview.total_comments || 0,
      active_students: activeStudents,
      total_students: totalStudents,
      participation_rate: participationRate,
      avg_posts_per_student: (overview.total_posts || 0) / totalStudents,
      avg_comments_per_student: (overview.total_comments || 0) / totalStudents,
    };
  } catch (error) {
    console.error('Error getting engagement metrics:', error);
    throw error;
  }
};

/**
 * Export analytics to CSV
 * @param {string} classId - Class ID
 * @returns {Promise<string>} CSV string
 */
export const exportAnalyticsToCSV = async (classId) => {
  try {
    const [overview, ranking, activities] = await Promise.all([
      getClassOverview(classId),
      getStudentRanking(classId),
      getActivityPerformance(classId),
    ]);

    let csv = 'ANALYTICS DA TURMA\n\n';
    
    // Overview
    csv += 'VISÃO GERAL\n';
    csv += `Turma,${overview.class_name}\n`;
    csv += `Alunos,${overview.total_students}\n`;
    csv += `Atividades,${overview.total_activities}\n`;
    csv += `Média Geral,${overview.average_grade}\n`;
    csv += `Taxa de Entrega,${overview.submission_rate}%\n`;
    csv += `Taxa de Correção,${overview.grading_rate}%\n\n`;

    // Student Ranking
    csv += 'RANKING DE ALUNOS\n';
    csv += 'Posição,Nome,Média,Percentual,Entregas,Comentários\n';
    ranking.forEach(student => {
      csv += `${student.rank_position},${student.student_name},${student.average_grade || 'N/A'},${student.average_percentage || 'N/A'}%,${student.total_submissions},${student.comments_made}\n`;
    });
    csv += '\n';

    // Activities
    csv += 'PERFORMANCE POR ATIVIDADE\n';
    csv += 'Atividade,Tipo,Média,Taxa de Entrega,Excelentes,Bons,Regulares,Abaixo\n';
    activities.forEach(activity => {
      csv += `${activity.activity_title},${activity.activity_type},${activity.average_grade || 'N/A'},${activity.submission_rate || 0}%,${activity.excellent_count || 0},${activity.good_count || 0},${activity.average_count || 0},${activity.below_average_count || 0}\n`;
    });

    return csv;
  } catch (error) {
    console.error('Error exporting analytics:', error);
    throw error;
  }
};

/**
 * Download CSV file
 * @param {string} classId - Class ID
 * @param {string} className - Class name
 */
export const downloadAnalyticsCSV = async (classId, className) => {
  try {
    const csv = await exportAnalyticsToCSV(classId);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics_${className}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading CSV:', error);
    throw error;
  }
};

export default {
  getClassOverview,
  getDailyActivity,
  getStudentRanking,
  getActivityPerformance,
  getClassInsights,
  compareClasses,
  getPerformanceTrend,
  getGradeDistribution,
  getEngagementMetrics,
  exportAnalyticsToCSV,
  downloadAnalyticsCSV,
};
