import { supabase } from '@/shared/services/supabaseClient';

/**
 * Busca atividades de uma classe específica
 */
export async function getClassActivities(classId) {
  const { data, error } = await supabase
    .from('activity_class_assignments')
    .select(`
      activity_id,
      assigned_at,
      activities (
        id,
        title,
        description,
        instructions,
        due_date,
        status,
        is_published,
        is_draft,
        max_score,
        created_by,
        teacher_id,
        created_at,
        updated_at,
        plagiarism_enabled,
        is_group_activity,
        group_size,
        weight
      )
    `)
    .eq('class_id', classId)
    .order('assigned_at', { ascending: false });

  if (error) throw error;

  // Flatten structure and add class_id for compatibility
  return data?.map(item => ({
    ...item.activities,
    assigned_at: item.assigned_at,
    class_id: classId // Add for backward compatibility
  })) || [];
}

/**
 * Busca classes de uma atividade
 */
export async function getActivityClasses(activityId) {
  // 1) Buscar mapeamentos da atividade -> classes
  const { data: assignments, error } = await supabase
    .from('activity_class_assignments')
    .select('class_id, assigned_at')
    .eq('activity_id', activityId);

  if (error) throw error;

  const classIds = (assignments || []).map(a => a.class_id);
  if (classIds.length === 0) return [];

  // 2) Buscar classes em chamada separada
  const { data: classesData, error: cErr } = await supabase
    .from('classes')
    .select('id, name, subject, description, created_by, school_id, is_active')
    .in('id', classIds);
  if (cErr) throw cErr;

  const byId = (classesData || []).reduce((acc, c) => { acc[c.id] = c; return acc; }, {});
  return (assignments || []).map(a => ({
    ...byId[a.class_id],
    assigned_at: a.assigned_at,
  })).filter(Boolean);
}

/**
 * Busca atividades com informações das classes (usando VIEW)
 */
export async function getActivitiesWithClasses(filters = {}) {
  let query = supabase
    .from('activities_with_classes')
    .select('*');

  if (filters.class_id) {
    query = query.eq('class_id', filters.class_id);
  }

  if (filters.created_by) {
    query = query.eq('created_by', filters.created_by);
  }

  if (filters.is_published !== undefined) {
    query = query.eq('is_published', filters.is_published);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Atribuir atividade a uma ou mais classes
 */
export async function assignActivityToClasses(activityId, classIds) {
  const assignments = classIds.map(classId => ({
    activity_id: activityId,
    class_id: classId,
    assigned_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('activity_class_assignments')
    .insert(assignments)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Remover atividade de uma classe
 */
export async function unassignActivityFromClass(activityId, classId) {
  const { error } = await supabase
    .from('activity_class_assignments')
    .delete()
    .eq('activity_id', activityId)
    .eq('class_id', classId);

  if (error) throw error;
}

/**
 * Busca submissões de atividades de uma classe
 */
export async function getClassSubmissions(classId, filters = {}) {
  let query = supabase
    .from('submissions')
    .select(`
      *,
      activities!inner (
        id,
        title,
        max_score,
        activity_class_assignments!inner (
          class_id
        )
      ),
      profiles:student_id (
        id,
        full_name
      )
    `)
    .eq('activities.activity_class_assignments.class_id', classId);

  if (filters.activity_id) {
    query = query.eq('activity_id', filters.activity_id);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Busca atividades que um aluno pode ver (publicadas e de suas classes)
 */
export async function getStudentActivities(studentId) {
  // 1) Buscar classes do aluno
  const { data: memberships, error: mErr } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('user_id', studentId)
    .eq('role', 'student');
  if (mErr) throw mErr;

  const classIds = (memberships || []).map(m => m.class_id);
  if (classIds.length === 0) return [];

  // 2) Buscar assignments para essas turmas
  const { data: assignments, error: aErr } = await supabase
    .from('activity_class_assignments')
    .select('activity_id, class_id, assigned_at')
    .in('class_id', classIds);
  if (aErr) throw aErr;

  const activityIds = Array.from(new Set((assignments || []).map(a => a.activity_id)));
  if (activityIds.length === 0) return [];

  // 3) Buscar atividades publicadas
  const { data: activities, error: actErr } = await supabase
    .from('activities')
    .select('id, title, description, due_date, is_published, max_score, created_by')
    .in('id', activityIds)
    .eq('is_published', true)
    .order('due_date', { ascending: true });
  if (actErr) throw actErr;

  // 4) Opcional: nome da classe (melhor evitar join; buscar classes separadas se necessário)
  const oneClassPerActivity = new Map();
  (assignments || []).forEach(a => {
    if (!oneClassPerActivity.has(a.activity_id)) oneClassPerActivity.set(a.activity_id, a);
  });

  return (activities || []).map(act => ({
    ...act,
    class_id: oneClassPerActivity.get(act.id)?.class_id,
    assigned_at: oneClassPerActivity.get(act.id)?.assigned_at,
  }));
}

/**
 * Busca estatísticas de uma classe
 */
export async function getClassStats(classId) {
  // Total de atividades
  const { count: totalActivities } = await supabase
    .from('activity_class_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', classId);

  // Total de submissões
  const { count: totalSubmissions } = await supabase
    .from('submissions')
    .select(`
      *,
      activities!inner (
        activity_class_assignments!inner (
          class_id
        )
      )
    `, { count: 'exact', head: true })
    .eq('activities.activity_class_assignments.class_id', classId);

  // Membros da classe
  const { count: totalMembers } = await supabase
    .from('class_members')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', classId);

  return {
    totalActivities: totalActivities || 0,
    totalSubmissions: totalSubmissions || 0,
    totalMembers: totalMembers || 0
  };
}

/**
 * Helper para queries de atividades com paginação
 */
export async function getActivitiesPaginated(filters = {}, page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  
  let query = supabase
    .from('activities_with_classes')
    .select('*', { count: 'exact' });

  // Aplicar filtros
  if (filters.class_id) {
    query = query.eq('class_id', filters.class_id);
  }

  if (filters.created_by) {
    query = query.eq('created_by', filters.created_by);
  }

  if (filters.teacher_id) {
    query = query.eq('teacher_id', filters.teacher_id);
  }

  if (filters.is_published !== undefined) {
    query = query.eq('is_published', filters.is_published);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    data: data || [],
    count: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit)
  };
}
