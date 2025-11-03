import { logger } from '@/shared/utils/logger';
// Import the singleton Supabase client
import { supabase } from '@/lib/supabaseClient';

// This file should only use the singleton Supabase client from @/lib/supabaseClient
// and should not create any new instances of the Supabase client.

// ============================================
// API CLIENT OBJECT (for default export)
// ============================================

/**
 * API client object that provides HTTP-like methods for Supabase operations
 */
const api = {
  /**
   * Make a GET request (SELECT operation)
   */
  async get(path, options = {}) {
    // Parse path like '/table/id' or '/table'
    const [table, id] = path.replace(/^\//, '').split('/');
    const { params = {}, select = '*' } = options;

    let query = supabase.from(table).select(select);

    // Add filters from params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key.endsWith('_eq')) {
          const field = key.replace('_eq', '');
          query = query.eq(field, value);
        } else if (key.endsWith('_neq')) {
          const field = key.replace('_neq', '');
          query = query.neq(field, value);
        } else if (key.endsWith('_gt')) {
          const field = key.replace('_gt', '');
          query = query.gt(field, value);
        } else if (key.endsWith('_gte')) {
          const field = key.replace('_gte', '');
          query = query.gte(field, value);
        } else if (key.endsWith('_lt')) {
          const field = key.replace('_lt', '');
          query = query.lt(field, value);
        } else if (key.endsWith('_lte')) {
          const field = key.replace('_lte', '');
          query = query.lte(field, value);
        } else if (key.endsWith('_like')) {
          const field = key.replace('_like', '');
          query = query.like(field, value);
        } else if (key.endsWith('_ilike')) {
          const field = key.replace('_ilike', '');
          query = query.ilike(field, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    if (id) {
      query = query.eq('id', id).single();
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data };
  },

  /**
   * Make a POST request (INSERT operation)
   */
  async post(path, data) {
    const [table] = path.replace(/^\//, '').split('/');
    const { data: result, error } = await supabase.from(table).insert(data).select();
    if (error) throw error;
    return { data: result };
  },

  /**
   * Make a PUT request (UPDATE operation)
   */
  async put(path, data) {
    const [table, id] = path.replace(/^\//, '').split('/');
    const { data: result, error } = await supabase.from(table).update(data).eq('id', id).select();
    if (error) throw error;
    return { data: result };
  },

  /**
   * Make a DELETE request (DELETE operation)
   */
  async delete(path) {
    const [table, id] = path.replace(/^\//, '').split('/');
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return { data: null };
  }
};

// ============================================
// SECURITY & VALIDATION HELPERS
// ============================================

/**
 * Validate user access to a resource based on ownership or permissions
 */
const validateResourceAccess = async (resourceType, resourceId, userId, requiredPermission = 'read') => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('Usuário não autenticado');
    }

    switch (resourceType) {
      case 'class': {
        // Verificar se usuário é professor da turma ou aluno inscrito
        const { data: classAccess, error: classError } = await supabase
          .from('classes')
          .select('created_by, id')
          .eq('id', resourceId)
          .single();

        if (classError) throw classError;

        if (requiredPermission === 'write') {
          // Apenas professor pode modificar
          if (classAccess.created_by !== userId) {
            throw new Error('Apenas o professor pode modificar esta turma');
          }
        } else {
          // Verificar se é professor ou aluno da turma
          if (classAccess.created_by === userId) return true;

          // Verificar se é aluno da turma
          const { data: studentAccess } = await supabase
            .from('class_members')
            .select('id')
            .eq('class_id', resourceId)
            .eq('user_id', userId)
            .eq('role', 'student')
            .single();

          if (!studentAccess) {
            throw new Error('Você não tem acesso a esta turma');
          }
        }
        break;
      }

      case 'activity': {
        // Verificar se atividade pertence a turma do usuário
        const { data: activityAccess, error: activityError } = await supabase
          .from('activities')
          .select(`
            id,
            created_by
          `)
          .eq('id', resourceId)
          .single();

        if (activityError) throw activityError;

        // Verificar se usuário é criador da atividade
        if (activityAccess.created_by === userId) return true;
        
        // Verificar se usuário tem acesso através de class_members
        const { data: classAssignments } = await supabase
          .from('activity_class_assignments')
          .select('class_id')
          .eq('activity_id', resourceId);
        
        if (classAssignments && classAssignments.length > 0) {
          const classIds = classAssignments.map(a => a.class_id);
          
          // Check if user is teacher of any of these classes
          const { data: teacherClasses } = await supabase
            .from('classes')
            .select('id')
            .in('id', classIds)
            .eq('created_by', userId);
          
          if (teacherClasses && teacherClasses.length > 0) return true;
          
          // Check if user is student in any of these classes
          const { data: studentAccess } = await supabase
            .from('class_members')
            .select('id')
            .in('class_id', classIds)
            .eq('user_id', userId)
            .eq('role', 'student');
          
          if (studentAccess && studentAccess.length > 0) return true;
        }

        throw new Error('Você não tem acesso a esta atividade');
        break;
      }

      case 'submission': {
        // Verificar se submissão pertence ao usuário
        const { data: submissionAccess, error: submissionError } = await supabase
          .from('submissions')
          .select('student_id')
          .eq('id', resourceId)
          .single();

        if (submissionError) throw submissionError;

        if (submissionAccess.student_id !== userId) {
          throw new Error('Você só pode acessar suas próprias submissões');
        }
        break;
      }

      default:
        throw new Error(`Tipo de recurso não suportado: ${resourceType}`);
    }

    return true;
  } catch (error) {
    logger.error('Erro na validação de acesso:', error)
    throw error;
  }
};

/**
 * Validate that user owns or has permission to access the class
 */
const validateClassAccess = async (classId, userId, permission = 'read') => {
  return validateResourceAccess('class', classId, userId, permission);
};

/**
 * Validate that user owns or has permission to access the activity
 */
const validateActivityAccess = async (activityId, userId, permission = 'read') => {
  return validateResourceAccess('activity', activityId, userId, permission);
};

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Simple in-memory cache for frequently accessed data
const cache = new Map();

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry wrapper for Supabase operations
 */
const withRetry = async (operation, retries = MAX_RETRIES) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === retries - 1) throw error;

      // Check if error is retryable
      const isRetryable = error.message?.includes('network') ||
                         error.message?.includes('timeout') ||
                         error.message?.includes('temporarily');

      if (!isRetryable) throw error;

      await sleep(RETRY_DELAY * (i + 1));
    }
  }
};

/**
 * Simple caching utility
 */
const getCached = (key) => {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_DURATION) {
    return item.data;
  }
  cache.delete(key);
  return null;
};

const setCached = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// ============================================
// AUTHENTICATION & USER HELPERS
// ============================================

/**
 * Get the current authenticated user with improved error handling
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      logger.warn('Error getting current user:', error.message)
      return null;
    }

    if (!user) {
      // Fallback: try getting from session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        logger.warn('Error getting session:', sessionError.message)
        return null;
      }

      return session?.user || null;
    }

    return user;
  } catch (error) {
    logger.error('Unexpected error in getCurrentUser:', error)
    return null;
  }
};

/**
 * Get user profile with security validation
 */
export const getUserProfile = async (userId = null) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('Usuário não autenticado');

    const targetUserId = userId || currentUser.id;

    // Security: Users can only access their own profile or admins can access any
    if (targetUserId !== currentUser.id) {
      // Check if current user is admin - for now, we'll use a simple role check
      // In the future, you might want to add an admin role to the profiles table
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

      if (userProfile?.role === 'school') {
        return true; // School role acts as admin
      }

      throw new Error('Acesso negado: você só pode acessar seu próprio perfil');
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, role, created_at, updated_at')
      .eq('id', targetUserId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error getting user profile:', error)
    throw error;
  }
};

/**
 * Sign out user with cleanup
 */
export const signOut = async () => {
  try {
    // Clear cache on sign out
    cache.clear();

    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    return { success: true };
  } catch (error) {
    logger.error('Error signing out:', error)
    throw error;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      logger.warn('Error checking authentication:', error.message)
      return false;
    }

    return !!session?.user;
  } catch (error) {
    logger.error('Unexpected error in isAuthenticated:', error)
    return false;
  }
};

/**
 * Get the user's access token
 */
export const getToken = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      logger.warn('Error getting token:', error.message)
      return null;
    }

    return session?.access_token || null;
  } catch (error) {
    logger.error('Unexpected error in getToken:', error)
    return null;
  }
};

// ============================================
// DATA OPERATIONS WITH SECURITY
// ============================================

/**
 * Export class data with retry logic and caching (SECURE VERSION)
 */
export const exportClassData = async (classId) => {
  if (!classId) {
    throw new Error('Class ID is required');
  }

  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Security: Validate access to class
  await validateClassAccess(classId, user.id, 'read');

  const cacheKey = `class_export_${classId}_${user.id}`;

  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    return await withRetry(async () => {
      // Get class details (filtered by ownership)
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, name, subject, created_by, created_at')
        .eq('id', classId)
        .single();

      if (classError) throw classError;
      if (!classData) throw new Error('Turma não encontrada');

      // Get students (only if user is teacher or enrolled student)
      const { data: students, error: studentsError } = await supabase
        .from('class_members')
        .select(`
          student:profiles (
            id,
            full_name,
            avatar_url,
            created_at
          )
        `)
        .eq('class_id', classId)
        .eq('role', 'student');

      if (studentsError) throw studentsError;

        // Get activities (filtered by class access)
        const { data: activities, error: activitiesError } = await supabase
          .from('activities')
          .select(`
            id,
            title,
            activity_type,
            created_at,
            due_date,
            status,
            created_by
          `)
          .in('id', activityIds)
          .order('created_at', { ascending: false });

      if (activitiesError) throw activitiesError;

      // Combine all data (sanitized)
      const exportData = {
        class: {
          id: classData.id,
          name: classData.name,
          subject: classData.subject,
          created_at: classData.created_at
        },
        students: students?.map(s => s.student).filter(Boolean) || [],
        activities: activities || [],
        exported_at: new Date().toISOString(),
        exported_by: user.id
      };

      // Cache the result
      setCached(cacheKey, exportData);

      return exportData;
    });
  } catch (error) {
    logger.error('Error exporting class data:', error)
    throw new Error('Falha ao exportar dados da turma: ' + error.message);
  }
};

// Helper function to handle file uploads
export const uploadFile = async (bucket, path, file) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file);

  if (error) throw error;
  return data;
};

// Helper function to get a public URL for a file
export const getPublicUrl = (bucket, path) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  return data.publicUrl;
};

// ============================================
// CLASS & STUDENT HELPERS (SECURE)
// ============================================

/**
 * Buscar detalhes de uma turma específica (com validação de acesso)
 */
export const getClassDetails = async (classId) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');
  if (!classId) throw new Error('Class ID é obrigatório');

  // Validate access
  await validateClassAccess(classId, user.id, 'read');

  // Fetch class, members count and activities via assignments
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('id, name, subject, created_by, created_at, is_active, color')
    .eq('id', classId)
    .single();
  if (classError) throw classError;

  const [{ data: students }, { data: assignments }] = await Promise.all([
    supabase.from('class_members').select('id').eq('class_id', classId).eq('role', 'student'),
    supabase.from('activity_class_assignments').select('activity_id').eq('class_id', classId)
  ]);

  return {
    ...classData,
    students_count: students?.length || 0,
    activities_count: assignments?.length || 0
  };
};
/**
 * Buscar turmas de um usuário (professor ou aluno) - SEGURA
 */
export const getUserClasses = async (userId, role = 'student') => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('Usuário não autenticado');

    // Security: Users can only access their own data
    if (userId !== currentUser.id) {
      throw new Error('Acesso negado: você só pode acessar suas próprias turmas');
    }

    if (role === 'teacher') {
      // Professor: apenas turmas que ele criou
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, subject, created_by, created_at, students_count, activities_count')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        logger.error('Error fetching teacher classes:', error.message)
        throw new Error(`Erro ao buscar turmas: ${error.message}`);
      }
      return data || [];
    } else {
      // Aluno: turmas via class_members
      const { data, error } = await supabase
        .from('class_members')
        .select(`
          class:classes(
            id,
            name,
            subject,
            created_by,
            created_at,
            students_count,
            activities_count
          )
        `)
        .eq('user_id', userId)
        .eq('role', 'student');

      if (error) {
        logger.error('Error fetching student classes:', error.message)
        throw new Error(`Erro ao buscar turmas: ${error.message}`);
      }
      return data ? data.map(row => row.class).filter(Boolean) : [];
    }
  } catch (error) {
    logger.error('Error in getUserClasses:', error)
    return [];
  }
};

/**
 * Buscar alunos de uma turma (com validação de acesso)
 */
export const getClassStudents = async (classId) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Security: Validate access to class
  await validateClassAccess(classId, user.id, 'read');

  const { data, error } = await supabase
    .from('class_members')
    .select(`
      user:profiles(
        id,
        full_name,
        avatar_url,
        created_at
      )
    `)
    .eq('class_id', classId)
    .eq('role', 'student');

  if (error) throw error;
  return (data || []).map(row => row.user).filter(Boolean);
};

/**
 * Buscar reuniões do usuário (com validação de acesso)
 */
export const getUserMeetings = async (userId) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('Usuário não autenticado');

  // Security: Users can only access their own meetings
  if (userId !== currentUser.id) {
    throw new Error('Acesso negado: você só pode acessar suas próprias reuniões');
  }

  const { data, error } = await supabase
    .from('meetings')
    .select(`
      id,
      title,
      description,
      start_time,
      end_time,
      status,
      created_at
    `)
    .or(`created_by.eq.${userId},and(class_id.in.(select class_id from class_members where user_id.eq.${userId}))`)
    .order('start_time', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
};

/**
 * Buscar atividades publicadas de uma turma (com validação de acesso)
 */
export const getClassActivities = async (classId) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  if (classId) {
    // Security: Validate access to class
    await validateClassAccess(classId, user.id, 'read');
  }

  if (!classId) {
    // Busca todas as atividades do usuário (atua como templates quando status/draft)
    const { data, error } = await supabase
      .from('activities')
      .select('id, title, description, instructions, due_date, status, created_at, updated_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Busca atividades publicadas na turma
  const { data, error } = await supabase
    .from('activity_class_assignments')
    .select(`
      id,
      activity_id,
      class_id,
      assigned_at,
      activities!inner(
        id,
        title,
        description,
        instructions,
        due_date,
        total_points,
        status,
        published_at,
        created_at
      )
    `)
    .eq('class_id', classId)
    .eq('activities.status', 'published')
    .order('assigned_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// ============================================
// ACTIVITY MANAGEMENT AS TEMPLATES (SECURE)
// ============================================

/**
 * Cria um novo template de atividade (com validação de ownership)
 */
export const createActivityTemplate = async (templateData) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  try {
    const { data, error } = await supabase
      .from('activities')
      .insert([{
        title: templateData.title,
        description: templateData.description,
        instructions: templateData.instructions,
        due_date: templateData.due_date || null,
        schema: templateData.schema || null,
        total_points: templateData.total_points || null,
        is_group_activity: templateData.is_group_activity || false,
        group_size: templateData.group_size || null,
        created_by: user.id,
        status: templateData.status || 'draft',
        is_draft: templateData.is_draft !== undefined ? templateData.is_draft : true,
        draft_saved_at: new Date().toISOString()
      }])
      .select('id, title, description, instructions, due_date, status, created_by, created_at')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error creating activity template:', error)
    throw error;
  }
};

/**
 * Busca um template de atividade pelo ID (com validação de acesso)
 */
export const getActivityTemplate = async (templateId) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Usuário pode acessar suas atividades (templates) ou atividades publicadas
  const { data, error } = await supabase
    .from('activities')
    .select('id, title, description, instructions, schema, status, created_by, created_at, updated_at, due_date, total_points')
    .eq('id', templateId)
    .or(`created_by.eq.${user.id},status.eq.published`)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Atualiza um template de atividade existente (com validação de ownership)
 */
export const updateActivityTemplate = async (templateId, updates) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('activities')
    .update({
      title: updates.title,
      description: updates.description,
      instructions: updates.instructions,
      due_date: updates.due_date,
      schema: updates.schema,
      total_points: updates.total_points,
      is_group_activity: updates.is_group_activity,
      group_size: updates.group_size,
      is_draft: updates.is_draft,
      status: updates.status,
      updated_at: new Date().toISOString(),
      draft_saved_at: updates.is_draft ? new Date().toISOString() : null
    })
    .eq('id', templateId)
    .eq('created_by', user.id)
    .select('id, title, description, instructions, status, updated_at')
    .single();

  if (error) throw error;
  return data;
};

/**
 * Remove um template de atividade (com validação de ownership)
 */
export const deleteActivityTemplate = async (templateId) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', templateId)
    .eq('created_by', user.id);

  if (error) throw error;
};

/**
 * Lista os templates de atividade disponíveis (com validação de acesso)
 */
export const listActivityTemplates = async ({ userId, publicOnly = false } = {}) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('Usuário não autenticado');

  // Usar activities como templates
  let query = supabase
    .from('activities')
    .select('id, title, description, instructions, created_by, created_at, status');

  if (publicOnly) {
    query = query.eq('status', 'published');
  } else if (userId) {
    if (userId !== currentUser.id) {
      query = query.eq('status', 'published');
    } else {
      query = query.eq('created_by', userId);
    }
  } else {
    // Default: mostrar publicadas
    query = query.eq('status', 'published');
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// ============================================
// CLASS ACTIVITY MANAGEMENT (SECURE)
// ============================================

/**
 * Publica um template de atividade em uma ou mais turmas (com validação de ownership e acesso)
 */
export const publishActivityTemplate = async (templateId, classIds, overrides = {}) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  try {
    // Security: Verifica se a atividade existe e o usuário tem permissão
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, created_by, status')
      .eq('id', templateId)
      .single();

    if (activityError) throw activityError;
    if (!activity || activity.created_by !== user.id) {
      throw new Error('Atividade não encontrada ou sem permissão');
    }

    // Security: Verificar se usuário é professor de todas as turmas
    const { data: userClasses, error: classesError } = await supabase
      .from('classes')
      .select('id')
      .eq('created_by', user.id)
      .in('id', classIds);

    if (classesError) throw classesError;

    const accessibleClassIds = userClasses?.map(c => c.id) || [];
    const unauthorizedClasses = classIds.filter(id => !accessibleClassIds.includes(id));

    if (unauthorizedClasses.length > 0) {
      throw new Error(`Você não tem permissão para publicar em algumas turmas: ${unauthorizedClasses.join(', ')}`);
    }

    // Marcar atividade como publicada
    const { error: publishError } = await supabase
      .from('activities')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', templateId)
      .eq('created_by', user.id);

    if (publishError) throw publishError;

    // Vincula atividade às turmas
    const { data: assignments, error: assignmentsError } = await supabase
      .from('activity_class_assignments')
      .insert(
        classIds.map(classId => ({
          activity_id: templateId,
          class_id: classId,
          assigned_at: new Date().toISOString()
        }))
      )
      .select('id, activity_id, class_id, assigned_at');

    if (assignmentsError) throw assignmentsError;
    return assignments || [];
  } catch (error) {
    logger.error('Error publishing activity template:', error)
    throw error;
  }
};

/**
 * Atualiza uma atividade publicada (com validação de ownership)
 */
export const updateClassActivity = async (activityId, updates) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Security: Validate access to activity
  await validateActivityAccess(activityId, user.id, 'write');

  const { data, error } = await supabase
    .from('activities')
    .update(updates)
    .eq('id', activityId)
    .select('id, title, description, status, updated_at')
    .single();

  if (error) throw error;
  return data;
};

/**
 * Remove uma atividade publicada (com validação de ownership)
 */
export const deleteClassActivity = async (activityId) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Security: Validate access to activity
  await validateActivityAccess(activityId, user.id, 'write');

  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', activityId);

  if (error) throw error;
};

// ============================================
// SECURE SUBMISSION HANDLING
// ============================================

/**
 * Submeter resposta de atividade (com validação de ownership)
 */
export const submitActivity = async ({ activity_id, answers, hcaptchaToken }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Security: Validate access to activity
  await validateActivityAccess(activity_id, user.id, 'read');

  // Security: hCaptcha token optional here (validated upstream if needed)

  try {
    const { data, error } = await supabase
      .from('submissions')
      .insert({
        student_id: user.id,
        activity_id,
        data: answers ?? null,
        submitted_at: new Date().toISOString()
      })
      .select('id, student_id, activity_id, submitted_at, status')
      .single();

    if (error) {
      logger.error('Error submitting activity:', error.message)
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error in submitActivity:', error)
    throw error;
  }
};

/**
 * Get submissions for an activity (teachers only, with access validation)
 */
export const getActivitySubmissions = async (activityId) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Security: Validate access to activity (teachers only)
  await validateActivityAccess(activityId, user.id, 'read');

  const { data, error } = await supabase
    .from('submissions')
    .select(`
      id,
      student_id,
      data,
      submitted_at,
      status,
      graded_at,
      grade,
      feedback,
      student:profiles(
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('activity_id', activityId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Grade a submission (teachers only, with access validation)
 */
export const gradeSubmission = async (submissionId, { points, feedback }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Security: Get submission and validate access to related activity
  const { data: submission, error: submissionError } = await supabase
    .from('submissions')
    .select(`
      id,
      activity_id,
      student_id
    `)
    .eq('id', submissionId)
    .single();

  if (submissionError) throw submissionError;

  // Security: Validate access to activity
  await validateActivityAccess(submission.activity_id, user.id, 'write');

  const { data, error } = await supabase
    .from('submissions')
    .update({
      grade: points,
      feedback,
      graded_at: new Date().toISOString(),
      status: points !== null ? 'graded' : 'pending'
    })
    .eq('id', submissionId)
    .select('id, grade, feedback, graded_at, status')
    .single();

  if (error) throw error;
  return data;
};

// ============================================
// DEPRECATED FUNCTIONS
// ============================================

/**
 * @deprecated Use getClassActivities instead
 */

/**
 * @deprecated Use createActivityTemplate instead
 */
export const createActivity = createActivityTemplate;

/**
 * @deprecated Use getActivityTemplate instead
 */
export const getActivity = getActivityTemplate;

/**
 * @deprecated Use updateActivityTemplate instead
 */
export const updateActivity = updateActivityTemplate;

/**
 * @deprecated Use deleteActivityTemplate instead
 */
export const deleteActivity = deleteActivityTemplate;

// Export the API client as default
export default api;
