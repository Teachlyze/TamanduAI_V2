import { supabase } from '@/lib/supabaseClient';

/**
 * Create an alert for a student
 */
export const createStudentAlert = async (studentId, classId, alertType, severity, details = {}) => {
  const { data, error } = await supabase
    .from('student_alerts')
    .insert([{
      student_id: studentId,
      class_id: classId,
      alert_type: alertType,
      severity,
      details,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Get alerts for a class
 */
export const getClassAlerts = async (classId, includeResolved = false) => {
  let query = supabase
    .from('student_alerts')
    .select(`
      *,
      student:profiles!student_alerts_student_id_fkey(id, full_name, email),
      resolved_by_user:profiles!student_alerts_resolved_by_fkey(id, full_name)
    `)
    .eq('class_id', classId)
    .order('created_at', { ascending: false });

  if (!includeResolved) {
    query = query.eq('resolved', false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Resolve an alert
 */
export const resolveAlert = async (alertId) => {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error} = await supabase
    .from('student_alerts')
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: userData?.user?.id
    })
    .eq('id', alertId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Auto-generate alerts for students based on performance
 */
export const generateAlertsForClass = async (classId) => {
  try {
    // Get all students in class
    const { data: members } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)
      .eq('role', 'student');

    if (!members || members.length === 0) return [];

    const studentIds = members.map(m => m.user_id);

    // Get submissions for this class
    const { data: activities } = await supabase
      .from('activities')
      .select('id')
      .contains('class_ids', [classId]); // Assuming class_ids is an array

    if (!activities || activities.length === 0) return [];

    const activityIds = activities.map(a => a.id);

    // Get all submissions
    const { data: submissions } = await supabase
      .from('submissions')
      .select('user_id, grade, status, submitted_at, is_plagiarized')
      .in('activity_id', activityIds)
      .in('user_id', studentIds);

    const alerts = [];

    // Analyze each student
    for (const studentId of studentIds) {
      const studentSubmissions = (submissions || []).filter(s => s.user_id === studentId);
      
      if (studentSubmissions.length === 0) {
        // No submissions at all
        alerts.push({
          studentId,
          alertType: 'no_submissions',
          severity: 'critical',
          details: { message: 'Aluno não realizou nenhuma submissão' }
        });
        continue;
      }

      const gradedSubmissions = studentSubmissions.filter(s => s.grade !== null);
      if (gradedSubmissions.length > 0) {
        const avgGrade = gradedSubmissions.reduce((sum, s) => sum + s.grade, 0) / gradedSubmissions.length;
        
        if (avgGrade < 50) {
          alerts.push({
            studentId,
            alertType: 'low_grade',
            severity: 'critical',
            details: { average_grade: avgGrade, count: gradedSubmissions.length }
          });
        } else if (avgGrade < 70) {
          alerts.push({
            studentId,
            alertType: 'low_grade',
            severity: 'warning',
            details: { average_grade: avgGrade, count: gradedSubmissions.length }
          });
        }
      }

      // Check late submissions
      const lateCount = studentSubmissions.filter(s => s.status === 'late').length;
      if (lateCount >= 3) {
        alerts.push({
          studentId,
          alertType: 'late_submissions',
          severity: lateCount >= 5 ? 'critical' : 'warning',
          details: { late_count: lateCount }
        });
      }

      // Check plagiarism
      const plagiarismCount = studentSubmissions.filter(s => s.is_plagiarized).length;
      if (plagiarismCount > 0) {
        alerts.push({
          studentId,
          alertType: 'plagiarism',
          severity: plagiarismCount >= 2 ? 'critical' : 'attention',
          details: { plagiarism_count: plagiarismCount }
        });
      }
    }

    // Insert new alerts (check for duplicates first)
    const inserted = [];
    for (const alert of alerts) {
      const { data: existing } = await supabase
        .from('student_alerts')
        .select('id')
        .eq('student_id', alert.studentId)
        .eq('class_id', classId)
        .eq('alert_type', alert.alertType)
        .eq('resolved', false)
        .maybeSingle();

      if (!existing) {
        const created = await createStudentAlert(
          alert.studentId,
          classId,
          alert.alertType,
          alert.severity,
          alert.details
        );
        inserted.push(created);
      }
    }

    return inserted;
  } catch (error) {
    console.error('Error generating alerts:', error);
    throw error;
  }
};

export default {
  createStudentAlert,
  getClassAlerts,
  resolveAlert,
  generateAlertsForClass
};
