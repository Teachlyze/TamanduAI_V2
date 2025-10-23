import { supabase } from '@/lib/supabaseClient';

/**
 * Attendance Service
 * Gerencia presença de alunos nas aulas
 */

/**
 * Get attendance for a class
 * @param {string} classId - Class ID
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Promise<Array>} Attendance records
 */
export const getClassAttendance = async (classId, startDate = null, endDate = null) => {
  try {
    let query = supabase
      .from('class_attendance')
      .select(`
        *,
        student:user_id(id, full_name, email, avatar_url)
      `)
      .eq('class_id', classId)
      .order('attended_date', { ascending: false });

    if (startDate) {
      query = query.gte('attended_date', startDate.toISOString().split('T')[0]);
    }

    if (endDate) {
      query = query.lte('attended_date', endDate.toISOString().split('T')[0]);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting class attendance:', error);
    throw error;
  }
};

/**
 * Get attendance rate for class
 * @param {string} classId - Class ID
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Promise<Object>} Attendance rate stats
 */
export const getAttendanceRate = async (classId, startDate = null, endDate = null) => {
  try {
    const { data, error } = await supabase.rpc('get_class_attendance_rate', {
      p_class_id: classId,
      p_start_date: startDate ? startDate.toISOString().split('T')[0] : null,
      p_end_date: endDate ? endDate.toISOString().split('T')[0] : null,
    });

    if (error) throw error;
    return data?.[0] || { total_students: 0, total_classes: 0, total_attendances: 0, attendance_rate: 0 };
  } catch (error) {
    console.error('Error getting attendance rate:', error);
    throw error;
  }
};

/**
 * Log student attendance
 * @param {string} classId - Class ID
 * @param {string} userId - User ID
 * @param {Date} joinedAt - When student joined (optional)
 * @returns {Promise<string>} Attendance ID
 */
export const logAttendance = async (classId, userId, joinedAt = new Date()) => {
  try {
    const { data, error } = await supabase.rpc('log_class_attendance', {
      p_class_id: classId,
      p_user_id: userId,
      p_joined_at: joinedAt.toISOString(),
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error logging attendance:', error);
    throw error;
  }
};

/**
 * Manually mark attendance
 * @param {string} classId - Class ID
 * @param {string} userId - User ID
 * @param {Date} attendedDate - Date of attendance
 * @param {boolean} wasOnTime - Was on time
 * @returns {Promise<Object>} Created attendance
 */
export const markAttendance = async (classId, userId, attendedDate, wasOnTime = true) => {
  try {
    const { data, error } = await supabase
      .from('class_attendance')
      .insert({
        class_id: classId,
        user_id: userId,
        attended_date: attendedDate.toISOString().split('T')[0],
        joined_at: attendedDate,
        was_on_time: wasOnTime,
        duration_minutes: null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error marking attendance:', error);
    throw error;
  }
};

/**
 * Bulk mark attendance for multiple students
 * @param {string} classId - Class ID
 * @param {Array} userIds - Array of user IDs
 * @param {Date} attendedDate - Date of attendance
 * @returns {Promise<Array>} Created attendances
 */
export const bulkMarkAttendance = async (classId, userIds, attendedDate) => {
  try {
    const records = userIds.map(userId => ({
      class_id: classId,
      user_id: userId,
      attended_date: attendedDate.toISOString().split('T')[0],
      joined_at: attendedDate,
      was_on_time: true,
    }));

    const { data, error } = await supabase
      .from('class_attendance')
      .insert(records)
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error bulk marking attendance:', error);
    throw error;
  }
};

/**
 * Update attendance record
 * @param {string} attendanceId - Attendance ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated attendance
 */
export const updateAttendance = async (attendanceId, updates) => {
  try {
    const { data, error } = await supabase
      .from('class_attendance')
      .update(updates)
      .eq('id', attendanceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating attendance:', error);
    throw error;
  }
};

/**
 * Delete attendance record
 * @param {string} attendanceId - Attendance ID
 * @returns {Promise<void>}
 */
export const deleteAttendance = async (attendanceId) => {
  try {
    const { error } = await supabase
      .from('class_attendance')
      .delete()
      .eq('id', attendanceId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting attendance:', error);
    throw error;
  }
};

/**
 * Get student attendance history
 * @param {string} classId - Class ID
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Attendance history
 */
export const getStudentAttendanceHistory = async (classId, userId) => {
  try {
    const { data, error } = await supabase
      .from('class_attendance')
      .select('*')
      .eq('class_id', classId)
      .eq('user_id', userId)
      .order('attended_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting student attendance history:', error);
    throw error;
  }
};

/**
 * Get attendance summary by student
 * @param {string} classId - Class ID
 * @returns {Promise<Array>} Summary by student
 */
export const getAttendanceSummary = async (classId) => {
  try {
    // Get all class members (students)
    const { data: members, error: membersError } = await supabase
      .from('class_members')
      .select('user_id, profiles:user_id(id, full_name, email, avatar_url)')
      .eq('class_id', classId)
      .eq('role', 'student');

    if (membersError) throw membersError;

    // Get all attendance records
    const { data: attendances, error: attendanceError } = await supabase
      .from('class_attendance')
      .select('user_id, attended_date, was_on_time')
      .eq('class_id', classId);

    if (attendanceError) throw attendanceError;

    // Get total class days
    const uniqueDates = [...new Set(attendances?.map(a => a.attended_date) || [])];
    const totalClasses = uniqueDates.length;

    // Build summary
    const summary = members.map(member => {
      const studentAttendances = attendances?.filter(a => a.user_id === member.user_id) || [];
      const presentCount = studentAttendances.length;
      const onTimeCount = studentAttendances.filter(a => a.was_on_time).length;
      const absentCount = totalClasses - presentCount;
      const attendanceRate = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

      return {
        user_id: member.user_id,
        student_name: member.profiles?.full_name,
        email: member.profiles?.email,
        avatar_url: member.profiles?.avatar_url,
        total_classes: totalClasses,
        present_count: presentCount,
        absent_count: absentCount,
        on_time_count: onTimeCount,
        late_count: presentCount - onTimeCount,
        attendance_rate: attendanceRate,
      };
    });

    return summary.sort((a, b) => b.attendance_rate - a.attendance_rate);
  } catch (error) {
    console.error('Error getting attendance summary:', error);
    throw error;
  }
};

/**
 * Get attendance by date (for roll call)
 * @param {string} classId - Class ID
 * @param {Date} date - Date
 * @returns {Promise<Object>} Attendance for that date
 */
export const getAttendanceByDate = async (classId, date) => {
  try {
    const dateStr = date.toISOString().split('T')[0];

    // Get all students
    const { data: members, error: membersError } = await supabase
      .from('class_members')
      .select('user_id, profiles:user_id(id, full_name, email, avatar_url)')
      .eq('class_id', classId)
      .eq('role', 'student');

    if (membersError) throw membersError;

    // Get attendance for this date
    const { data: attendances, error: attendanceError } = await supabase
      .from('class_attendance')
      .select('*')
      .eq('class_id', classId)
      .eq('attended_date', dateStr);

    if (attendanceError) throw attendanceError;

    // Map students with their attendance status
    const rollCall = members.map(member => {
      const attendance = attendances?.find(a => a.user_id === member.user_id);
      
      return {
        user_id: member.user_id,
        student_name: member.profiles?.full_name,
        email: member.profiles?.email,
        avatar_url: member.profiles?.avatar_url,
        is_present: !!attendance,
        was_on_time: attendance?.was_on_time || false,
        joined_at: attendance?.joined_at,
        attendance_id: attendance?.id,
      };
    });

    const presentCount = rollCall.filter(r => r.is_present).length;
    const absentCount = rollCall.length - presentCount;

    return {
      date: dateStr,
      students: rollCall,
      total_students: rollCall.length,
      present_count: presentCount,
      absent_count: absentCount,
      attendance_rate: rollCall.length > 0 ? (presentCount / rollCall.length) * 100 : 0,
    };
  } catch (error) {
    console.error('Error getting attendance by date:', error);
    throw error;
  }
};

/**
 * Export attendance to CSV
 * @param {string} classId - Class ID
 * @param {string} className - Class name
 * @returns {Promise<void>}
 */
export const exportAttendanceCSV = async (classId, className) => {
  try {
    const summary = await getAttendanceSummary(classId);

    let csv = `RELATÓRIO DE FREQUÊNCIA - ${className}\n\n`;
    csv += 'Aluno,Email,Total de Aulas,Presenças,Faltas,No Horário,Atrasado,Taxa de Presença\n';

    summary.forEach(student => {
      csv += `${student.student_name},${student.email},${student.total_classes},${student.present_count},${student.absent_count},${student.on_time_count},${student.late_count},${student.attendance_rate.toFixed(1)}%\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `frequencia_${className}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting attendance CSV:', error);
    throw error;
  }
};

export default {
  getClassAttendance,
  getAttendanceRate,
  logAttendance,
  markAttendance,
  bulkMarkAttendance,
  updateAttendance,
  deleteAttendance,
  getStudentAttendanceHistory,
  getAttendanceSummary,
  getAttendanceByDate,
  exportAttendanceCSV,
};
