/**
 * 👨‍🏫 TEACHER SERVICE
 * Serviços específicos para professores
 */

import { supabase } from './supabaseClient';

/**
 * Buscar perfil completo do professor
 * @param {string} teacherId - ID do professor
 * @returns {Promise<Object>} Dados do professor
 */
export const getTeacherProfile = async (teacherId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', teacherId)
      .eq('role', 'teacher')
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao buscar perfil do professor:', error);
    return { data: null, error };
  }
};

/**
 * Atualizar perfil do professor
 * @param {string} teacherId - ID do professor
 * @param {Object} profileData - Dados a atualizar
 * @returns {Promise<Object>} Resultado da atualização
 */
export const updateTeacherProfile = async (teacherId, profileData) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .eq('id', teacherId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao atualizar perfil do professor:', error);
    return { data: null, error };
  }
};

/**
 * Buscar estatísticas gerais do professor
 * @param {string} teacherId - ID do professor
 * @returns {Promise<Object>} Estatísticas
 */
export const getTeacherStats = async (teacherId) => {
  try {
    // 1. Total de turmas ativas
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id')
      .eq('created_by', teacherId)
      .eq('is_active', true);

    if (classesError) throw classesError;

    const totalClasses = classes?.length || 0;
    const classIds = classes?.map(c => c.id) || [];

    // 2. Total de alunos únicos
    const { data: students, error: studentsError } = await supabase
      .from('class_members')
      .select('user_id')
      .in('class_id', classIds)
      .eq('role', 'student');

    if (studentsError) throw studentsError;

    const uniqueStudents = new Set(students?.map(s => s.user_id) || []);
    const totalStudents = uniqueStudents.size;

    // 3. Total de atividades
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('id')
      .eq('created_by', teacherId);

    if (activitiesError) throw activitiesError;

    const totalActivities = activities?.length || 0;
    const activityIds = activities?.map(a => a.id) || [];

    // 4. Submissões pendentes
    const { data: pendingSubmissions, error: pendingError } = await supabase
      .from('submissions')
      .select('id')
      .in('activity_id', activityIds)
      .eq('status', 'submitted');

    if (pendingError) throw pendingError;

    const pendingGrading = pendingSubmissions?.length || 0;

    // 5. Média geral de notas
    const { data: grades, error: gradesError } = await supabase
      .from('submissions')
      .select('grade')
      .in('activity_id', activityIds)
      .not('grade', 'is', null);

    if (gradesError) throw gradesError;

    const avgGrade = grades?.length > 0
      ? grades.reduce((sum, s) => sum + s.grade, 0) / grades.length
      : 0;

    // 6. Correções do dia
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: todayGraded, error: todayError } = await supabase
      .from('submissions')
      .select('id')
      .in('activity_id', activityIds)
      .gte('graded_at', today.toISOString())
      .lt('graded_at', tomorrow.toISOString());

    if (todayError) throw todayError;

    const todayCorrections = todayGraded?.length || 0;

    return {
      data: {
        totalClasses,
        totalStudents,
        totalActivities,
        pendingGrading,
        avgGrade: Number(avgGrade.toFixed(1)),
        todayCorrections
      },
      error: null
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas do professor:', error);
    return { data: null, error };
  }
};

/**
 * Buscar resumo do dashboard
 * @param {string} teacherId - ID do professor
 * @returns {Promise<Object>} Resumo completo
 */
export const getDashboardSummary = async (teacherId) => {
  try {
    // Buscar estatísticas gerais
    const { data: stats, error: statsError } = await getTeacherStats(teacherId);
    if (statsError) throw statsError;

    // Buscar turmas recentes (últimas 5)
    const { data: recentClasses, error: classesError } = await supabase
      .from('classes')
      .select(`
        *,
        class_members(count)
      `)
      .eq('created_by', teacherId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (classesError) throw classesError;

    // Buscar atividades recentes (últimas 5)
    const { data: recentActivities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        *,
        activity_class_assignments(class:classes(name))
      `)
      .eq('created_by', teacherId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (activitiesError) throw activitiesError;

    return {
      data: {
        stats,
        recentClasses: recentClasses || [],
        recentActivities: recentActivities || []
      },
      error: null
    };
  } catch (error) {
    console.error('Erro ao buscar resumo do dashboard:', error);
    return { data: null, error };
  }
};

/**
 * Atualizar preferências do professor
 * @param {string} teacherId - ID do professor
 * @param {Object} preferences - Preferências a atualizar
 * @returns {Promise<Object>} Resultado da atualização
 */
export const updatePreferences = async (teacherId, preferences) => {
  try {
    // Buscar preferências atuais
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', teacherId)
      .single();

    const currentPreferences = currentProfile?.preferences || {};

    // Mesclar com novas preferências
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences,
      updated_at: new Date().toISOString()
    };

    // Atualizar
    const { data, error } = await supabase
      .from('profiles')
      .update({ preferences: updatedPreferences })
      .eq('id', teacherId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao atualizar preferências:', error);
    return { data: null, error };
  }
};

/**
 * Upload de foto de perfil
 * @param {string} teacherId - ID do professor
 * @param {File} file - Arquivo de imagem
 * @returns {Promise<Object>} URL da foto
 */
export const uploadAvatar = async (teacherId, file) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${teacherId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload para Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl;

    // Atualizar perfil
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', teacherId);

    if (updateError) throw updateError;

    return { data: { avatar_url: avatarUrl }, error: null };
  } catch (error) {
    console.error('Erro ao fazer upload do avatar:', error);
    return { data: null, error };
  }
};

export default {
  getTeacherProfile,
  updateTeacherProfile,
  getTeacherStats,
  getDashboardSummary,
  updatePreferences,
  uploadAvatar
};
