import { supabase } from '@/shared/services/supabaseClient';

/**
 * Calculate weighted grade for a student in a class
 */
export const calculateWeightedGrade = async (studentId, classId) => {
  try {
    // Get all activities for this class
    const { data: assignments } = await supabase
      .from('activity_class_assignments')
      .select('activity_id, activities(id, weight, total_points)')
      .eq('class_id', classId);

    if (!assignments || assignments.length === 0) {
      return { weightedGrade: null, details: [] };
    }

    const activityIds = assignments.map(a => a.activity_id);

    // Get student's submissions for these activities
    const { data: submissions } = await supabase
      .from('submissions')
      .select('activity_id, grade')
      .eq('user_id', studentId)
      .in('activity_id', activityIds)
      .not('grade', 'is', null);

    if (!submissions || submissions.length === 0) {
      return { weightedGrade: null, details: [] };
    }

    // Create a map of submissions by activity
    const submissionMap = {};
    submissions.forEach(sub => {
      submissionMap[sub.activity_id] = sub.grade;
    });

    // Calculate weighted grade
    let totalWeight = 0;
    let weightedSum = 0;
    const details = [];

    assignments.forEach(assignment => {
      const activity = assignment.activities;
      const weight = activity?.weight || 1.0;
      const grade = submissionMap[assignment.activity_id];

      if (grade !== undefined) {
        weightedSum += grade * weight;
        totalWeight += weight;
        details.push({
          activityId: assignment.activity_id,
          grade,
          weight,
          contribution: grade * weight
        });
      }
    });

    const weightedGrade = totalWeight > 0 ? weightedSum / totalWeight : null;

    return {
      weightedGrade: weightedGrade ? Math.round(weightedGrade * 10) / 10 : null,
      totalWeight,
      details
    };
  } catch (error) {
    console.error('Error calculating weighted grade:', error);
    throw error;
  }
};

/**
 * Calculate weighted grades for all students in a class
 */
export const calculateClassWeightedGrades = async (classId) => {
  try {
    // Get all students in class
    const { data: members } = await supabase
      .from('class_members')
      .select('user_id, profiles(id, full_name)')
      .eq('class_id', classId)
      .eq('role', 'student');

    if (!members || members.length === 0) {
      return [];
    }

    const results = [];
    for (const member of members) {
      const calculation = await calculateWeightedGrade(member.user_id, classId);
      results.push({
        studentId: member.user_id,
        studentName: member.profiles?.full_name || 'Aluno',
        ...calculation
      });
    }

    return results.sort((a, b) => (b.weightedGrade || 0) - (a.weightedGrade || 0));
  } catch (error) {
    console.error('Error calculating class weighted grades:', error);
    throw error;
  }
};

/**
 * Get grade distribution for a class
 */
export const getGradeDistribution = async (classId) => {
  const grades = await calculateClassWeightedGrades(classId);
  
  const distribution = {
    excellent: 0,  // >= 90
    good: 0,       // 70-89
    satisfactory: 0, // 50-69
    needsImprovement: 0 // < 50
  };

  grades.forEach(g => {
    if (g.weightedGrade === null) return;
    
    if (g.weightedGrade >= 90) distribution.excellent++;
    else if (g.weightedGrade >= 70) distribution.good++;
    else if (g.weightedGrade >= 50) distribution.satisfactory++;
    else distribution.needsImprovement++;
  });

  return {
    distribution,
    totalStudents: grades.length,
    averageGrade: grades.length > 0
      ? grades.reduce((sum, g) => sum + (g.weightedGrade || 0), 0) / grades.filter(g => g.weightedGrade !== null).length
      : 0
  };
};

export default {
  calculateWeightedGrade,
  calculateClassWeightedGrades,
  getGradeDistribution
};
