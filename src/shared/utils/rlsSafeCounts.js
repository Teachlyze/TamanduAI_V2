import { supabase } from '@/shared/services/supabaseClient';

/**
 * Utilitários para contagens seguras usando funções SECURITY DEFINER
 * que bypassam RLS e evitam recursão infinita
 */

/**
 * Conta estudantes de uma turma específica
 * @param {string} classId - UUID da turma
 * @returns {Promise<number>} Número de estudantes
 */
export async function countClassStudents(classId) {
  try {
    const { data, error } = await supabase.rpc('count_class_students', {
      p_class_id: classId,
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('[rlsSafeCounts] Error counting class students:', error);
    return 0;
  }
}

/**
 * Conta estudantes de múltiplas turmas em batch
 * @param {string[]} classIds - Array de UUIDs de turmas
 * @returns {Promise<Object>} Mapa { classId: studentCount }
 */
export async function countClassStudentsBatch(classIds) {
  try {
    if (!classIds || classIds.length === 0) return {};

    const { data, error } = await supabase.rpc('count_class_students_batch', {
      p_class_ids: classIds,
    });

    if (error) throw error;

    // Converter array em mapa { class_id: student_count }
    return (data || []).reduce((acc, row) => {
      acc[row.class_id] = row.student_count;
      return acc;
    }, {});
  } catch (error) {
    console.error('[rlsSafeCounts] Error counting students batch:', error);
    return {};
  }
}

/**
 * Conta todos os membros de uma turma (estudantes + professores)
 * @param {string} classId - UUID da turma
 * @returns {Promise<number>} Número total de membros
 */
export async function countClassMembers(classId) {
  try {
    const { data, error } = await supabase.rpc('count_class_members', {
      p_class_id: classId,
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('[rlsSafeCounts] Error counting class members:', error);
    return 0;
  }
}

/**
 * Obtém estatísticas completas de uma turma
 * @param {string} classId - UUID da turma
 * @returns {Promise<Object>} { totalStudents, totalTeachers, totalActivities, totalSubmissions }
 */
export async function getClassStats(classId) {
  try {
    const { data, error } = await supabase.rpc('get_class_stats', {
      p_class_id: classId,
    });

    if (error) throw error;

    if (data && data.length > 0) {
      return data[0];
    }

    return {
      total_students: 0,
      total_teachers: 0,
      total_activities: 0,
      total_submissions: 0,
    };
  } catch (error) {
    console.error('[rlsSafeCounts] Error getting class stats:', error);
    return {
      total_students: 0,
      total_teachers: 0,
      total_activities: 0,
      total_submissions: 0,
    };
  }
}

/**
 * Verifica se usuário é membro de uma turma
 * @param {string} classId - UUID da turma
 * @param {string} userId - UUID do usuário (optional, defaults to current user)
 * @returns {Promise<boolean>}
 */
export async function isClassMember(classId, userId = null) {
  try {
    const params = { p_class_id: classId };
    if (userId) params.p_user_id = userId;
    
    const { data, error } = await supabase.rpc('is_class_member', params);

    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error('[rlsSafeCounts] Error checking class membership:', error);
    return false;
  }
}

/**
 * Verifica se usuário é professor de uma turma
 * @param {string} classId - UUID da turma
 * @param {string} userId - UUID do usuário (optional, defaults to current user)
 * @returns {Promise<boolean>}
 */
export async function isClassTeacher(classId, userId = null) {
  try {
    const params = { p_class_id: classId };
    if (userId) params.p_user_id = userId;
    
    const { data, error } = await supabase.rpc('is_class_teacher', params);

    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error('[rlsSafeCounts] Error checking teacher status:', error);
    return false;
  }
}

/**
 * Conta estudantes únicos de uma escola
 * @param {string} schoolId - UUID da escola
 * @returns {Promise<number>} Número de estudantes únicos
 */
export async function countSchoolStudents(schoolId) {
  try {
    const { data, error } = await supabase.rpc('count_school_students', {
      p_school_id: schoolId,
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('[rlsSafeCounts] Error counting school students:', error);
    return 0;
  }
}

export default {
  countClassStudents,
  countClassStudentsBatch,
  countClassMembers,
  getClassStats,
  isClassMember,
  isClassTeacher,
  countSchoolStudents,
};
