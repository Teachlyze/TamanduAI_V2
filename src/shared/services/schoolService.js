import { supabase } from '@/shared/services/supabaseClient';

/**
 * SchoolService - Gerencia operações de escola
 */

class SchoolService {
  /**
   * Busca dados do dashboard da escola
   */
  async getDashboardStats(schoolId) {
    try {
      // 1. Buscar professores vinculados
      const { data: teachers, error: teachersError } = await supabase
        .from('school_teachers')
        .select('user_id, status')
        .eq('school_id', schoolId)
        .eq('status', 'active');

      if (teachersError) throw teachersError;

      const teacherIds = teachers?.map(t => t.user_id) || [];

      // 2. Buscar turmas vinculadas (duas etapas para evitar joins recursivos)
      const { data: schoolClasses, error: classesError } = await supabase
        .from('school_classes')
        .select('class_id')
        .eq('school_id', schoolId);

      if (classesError) throw classesError;

      const classIds = schoolClasses?.map(sc => sc.class_id) || [];

      // Buscar dados das classes em chamada separada
      let classesById = {};
      if (classIds.length > 0) {
        const { data: classesData, error: cErr } = await supabase
          .from('classes')
          .select('id, name, created_by, subject')
          .in('id', classIds);
        if (cErr) throw cErr;
        classesById = (classesData || []).reduce((acc, c) => { acc[c.id] = c; return acc; }, {});
      }

      // 3. Buscar alunos das turmas vinculadas (usando RPC SECURITY DEFINER)
      let totalStudents = 0;
      if (schoolId) {
        const { data: countData, error: studentsError } = await supabase
          .rpc('count_school_students', { p_school_id: schoolId });

        if (studentsError) {
          console.warn('[SchoolService] Error counting students, using fallback:', studentsError);
          // Fallback: contar via query normal (pode falhar se RLS recursivo)
          const { count } = await supabase
            .from('class_members')
            .select('user_id', { count: 'exact', head: true })
            .in('class_id', classIds)
            .eq('role', 'student');
          totalStudents = count || 0;
        } else {
          totalStudents = countData || 0;
        }
      }

      // 4. Buscar submissões recentes (últimos 30 dias) das turmas vinculadas
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let submissionsData = { total: 0, onTime: 0, late: 0 };
      
      if (classIds.length > 0) {
        // Buscar atividades das turmas
        const { data: activities } = await supabase
          .from('activity_class_assignments')
          .select('activity_id, activities (id, due_date)')
          .in('class_id', classIds);

        const activityIds = activities?.map(a => a.activity_id) || [];

        if (activityIds.length > 0) {
          const { data: submissions } = await supabase
            .from('submissions')
            .select('id, submitted_at, activity_id')
            .in('activity_id', activityIds)
            .eq('status', 'submitted')
            .gte('submitted_at', thirtyDaysAgo.toISOString());

          submissionsData.total = submissions?.length || 0;

          // Calcular entregas no prazo vs atrasadas
          const activityDueDates = new Map(
            activities?.map(a => [a.activity_id, a.activities?.due_date]) || []
          );

          submissions?.forEach(sub => {
            const dueDate = activityDueDates.get(sub.activity_id);
            if (dueDate) {
              const submitted = new Date(sub.submitted_at);
              const due = new Date(dueDate);
              if (submitted <= due) {
                submissionsData.onTime++;
              } else {
                submissionsData.late++;
              }
            }
          });
        }
      }

      // 5. Calcular taxa de entrega no prazo
      const onTimeRate = submissionsData.total > 0
        ? Math.round((submissionsData.onTime / submissionsData.total) * 100)
        : 0;

      // 6. Buscar média geral (notas das submissões)
      let averageGrade = null;
      if (classIds.length > 0) {
        const { data: activities } = await supabase
          .from('activity_class_assignments')
          .select('activity_id')
          .in('class_id', classIds);

        const activityIds = activities?.map(a => a.activity_id) || [];

        if (activityIds.length > 0) {
          const { data: gradedSubmissions } = await supabase
            .from('submissions')
            .select('grade')
            .in('activity_id', activityIds)
            .not('grade', 'is', null);

          if (gradedSubmissions && gradedSubmissions.length > 0) {
            const sum = gradedSubmissions.reduce((acc, s) => acc + (s.grade || 0), 0);
            averageGrade = (sum / gradedSubmissions.length).toFixed(1);
          }
        }
      }

      return {
        totalTeachers: teacherIds.length,
        totalStudents,
        totalClasses: classIds.length,
        onTimeRate,
        averageGrade,
        submissionsLast30Days: submissionsData.total,
        classIds,
        teacherIds,
      };
    } catch (error) {
      console.error('[SchoolService] Error getting dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Busca professores da escola
   */
  async getTeachers(schoolId) {
    try {
      const { data, error } = await supabase
        .from('school_teachers')
        .select('user_id, status, joined_at')
        .eq('school_id', schoolId)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      // Buscar perfis em chamada separada (evita joins ambíguos)
      const userIds = (data || []).map(st => st.user_id);
      let profilesById = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);
        
        profilesById = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }

      return (data || []).map(st => {
        const profile = profilesById[st.user_id] || {};
        return {
          id: st.user_id,
          name: profile.full_name || 'Professor',
          email: profile.email || '',
          avatar: profile.avatar_url,
          status: st.status,
          joinedAt: st.joined_at,
        };
      });
    } catch (error) {
      console.error('[SchoolService] Error getting teachers:', error);
      throw error;
    }
  }

  /**
   * Busca turmas da escola
   */
  async getClasses(schoolId) {
    try {
      const { data, error } = await supabase
        .from('school_classes')
        .select('class_id, created_at')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const classIds = (data || []).map(sc => sc.class_id);

      // Buscar detalhes das classes separadamente
      let classesById = {};
      if (classIds.length > 0) {
        const { data: classesData } = await supabase
          .from('classes')
          .select('id, name, subject, color, created_by')
          .in('id', classIds);
        classesById = (classesData || []).reduce((acc, c) => { acc[c.id] = c; return acc; }, {});
      }

      // Buscar nomes de professores em chamada separada (evita PGRST201)
      const createdByIds = Array.from(
        new Set(Object.values(classesById).map(c => c.created_by).filter(Boolean))
      );
      
      let teacherNameById = {};
      if (createdByIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', createdByIds);
        
        teacherNameById = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.full_name || 'Professor';
          return acc;
        }, {});
      }

      // Buscar contagem de alunos usando RPC SECURITY DEFINER (batch)
      let studentCountByClass = {};
      if (classIds.length > 0) {
        const { data: countsData, error: countsError } = await supabase
          .rpc('count_class_students_batch', { p_class_ids: classIds });
        
        if (countsError) {
          console.warn('[SchoolService] Error counting students batch, using 0:', countsError);
        } else {
          studentCountByClass = (countsData || []).reduce((acc, row) => {
            acc[row.class_id] = row.student_count;
            return acc;
          }, {});
        }
      }

      return (data || []).map(sc => {
        const klass = classesById[sc.class_id] || {};
        return {
          id: sc.class_id,
          name: klass.name || 'Turma',
          subject: klass.subject,
          color: klass.color,
          teacherName: teacherNameById[klass.created_by] || 'Professor',
          studentCount: studentCountByClass[sc.class_id] || 0,
          linkedAt: sc.created_at,
        };
      });
    } catch (error) {
      console.error('[SchoolService] Error getting classes:', error);
      throw error;
    }
  }

  /**
   * Vincula professor à escola
   */
  async linkTeacher(schoolId, teacherEmail) {
    try {
      // Buscar usuário por email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_metadata->role')
        .eq('email', teacherEmail)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        throw new Error('Professor não encontrado com este email');
      }

      // Verificar se já está vinculado
      const { data: existing } = await supabase
        .from('school_teachers')
        .select('user_id')
        .eq('school_id', schoolId)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (existing) {
        throw new Error('Professor já está vinculado a esta escola');
      }

      // Vincular professor
      const { error: linkError } = await supabase
        .from('school_teachers')
        .insert({
          school_id: schoolId,
          user_id: profile.id,
          status: 'active',
        });

      if (linkError) throw linkError;

      return { success: true, teacherId: profile.id };
    } catch (error) {
      console.error('[SchoolService] Error linking teacher:', error);
      throw error;
    }
  }

  /**
   * Remove vínculo de professor
   */
  async unlinkTeacher(schoolId, teacherId) {
    try {
      const { error } = await supabase
        .from('school_teachers')
        .delete()
        .eq('school_id', schoolId)
        .eq('user_id', teacherId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('[SchoolService] Error unlinking teacher:', error);
      throw error;
    }
  }

  /**
   * Vincula turma à escola
   */
  async linkClass(schoolId, classId) {
    try {
      // Verificar se turma existe
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, created_by')
        .eq('id', classId)
        .single();

      if (classError) throw classError;
      if (!classData) {
        throw new Error('Turma não encontrada');
      }

      // Verificar se professor da turma está vinculado à escola
      const { data: teacherLink } = await supabase
        .from('school_teachers')
        .select('user_id')
        .eq('school_id', schoolId)
        .eq('user_id', classData.created_by)
        .maybeSingle();

      if (!teacherLink) {
        throw new Error('O professor desta turma não está vinculado à escola');
      }

      // Verificar se já está vinculada
      const { data: existing } = await supabase
        .from('school_classes')
        .select('class_id')
        .eq('school_id', schoolId)
        .eq('class_id', classId)
        .maybeSingle();

      if (existing) {
        throw new Error('Turma já está vinculada a esta escola');
      }

      // Vincular turma
      const { error: linkError } = await supabase
        .from('school_classes')
        .insert({
          school_id: schoolId,
          class_id: classId,
        });

      if (linkError) throw linkError;

      return { success: true };
    } catch (error) {
      console.error('[SchoolService] Error linking class:', error);
      throw error;
    }
  }

  /**
   * Remove vínculo de turma
   */
  async unlinkClass(schoolId, classId) {
    try {
      const { error } = await supabase
        .from('school_classes')
        .delete()
        .eq('school_id', schoolId)
        .eq('class_id', classId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('[SchoolService] Error unlinking class:', error);
      throw error;
    }
  }

  /**
   * Busca escola do usuário (admin)
   * IMPORTANTE: Agora school.id = user.id quando role='school' (criado automaticamente via trigger)
   */
  async getUserSchool(userId) {
    try {
      // Buscar escola diretamente usando userId (school.id = user.id para role='school')
      const { data: school, error } = await supabase
        .from('schools')
        .select('id, name, logo_url, settings')
        .eq('id', userId)
        .single();

      if (error) {
        // Se não encontrar por ID, tentar por owner_id (legacy)
        const { data: schoolByOwner, error: ownerError } = await supabase
          .from('schools')
          .select('id, name, logo_url, settings')
          .eq('owner_id', userId)
          .limit(1)
          .single();

        if (ownerError || !schoolByOwner) {
          console.error('[SchoolService] School not found for user:', userId);
          return null;
        }

        return {
          id: schoolByOwner.id,
          name: schoolByOwner.name,
          logo: schoolByOwner.logo_url,
          settings: schoolByOwner.settings,
          adminRole: 'owner',
        };
      }

      return {
        id: school.id,
        name: school.name,
        logo: school.logo_url,
        settings: school.settings,
        adminRole: 'owner',
      };
    } catch (error) {
      console.error('[SchoolService] Error getting user school:', error);
      return null;
    }
  }

  /**
   * Busca todas as escolas onde o professor está afiliado
   * @param {string} teacherId - ID do professor
   * @returns {Promise<Array>} Lista de escolas
   */
  async getTeacherAffiliatedSchools(teacherId) {
    try {
      const { data, error } = await supabase
        .from('school_teachers')
        .select(`
          school_id,
          status,
          joined_at,
          schools:school_id (
            id,
            name,
            logo_url,
            status
          )
        `)
        .eq('user_id', teacherId)
        .eq('status', 'active')
        .eq('schools.status', 'active')
        .order('joined_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.schools.id,
        name: item.schools.name,
        logo_url: item.schools.logo_url,
        joined_at: item.joined_at
      }));
    } catch (error) {
      console.error('[SchoolService] Error getting teacher affiliated schools:', error);
      return [];
    }
  }

  /**
   * Verifica se um professor está afiliado a uma escola específica
   * @param {string} teacherId - ID do professor
   * @param {string} schoolId - ID da escola
   * @returns {Promise<boolean>}
   */
  async isTeacherAffiliatedToSchool(teacherId, schoolId) {
    try {
      const { data, error } = await supabase
        .from('school_teachers')
        .select('id')
        .eq('user_id', teacherId)
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      console.error('[SchoolService] Error checking teacher affiliation:', error);
      return false;
    }
  }
}

export default new SchoolService();
