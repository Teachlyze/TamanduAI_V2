import { supabase } from '@/shared/services/supabaseClient';

class ReportService {
  /**
   * Gera relatório de desempenho individual do aluno
   */
  async generateStudentReport(studentId, period = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // Buscar dados do aluno
    const { data: student } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', studentId)
      .single();

    // Buscar turmas do aluno
    const { data: classes } = await supabase
      .from('class_members')
      .select('class:classes(id, name, subject)')
      .eq('user_id', studentId)
      .eq('role', 'student');

    // Buscar submissões
    const { data: submissions } = await supabase
      .from('submissions')
      .select(`
        grade,
        submitted_at,
        activity:activities(title, max_score, type)
      `)
      .eq('student_id', studentId)
      .gte('submitted_at', startDate.toISOString())
      .not('grade', 'is', null);

    // Calcular estatísticas
    const grades = submissions?.map(s => s.grade) || [];
    const avgGrade = grades.length > 0 
      ? grades.reduce((a, b) => a + b, 0) / grades.length 
      : 0;

    const maxGrade = grades.length > 0 ? Math.max(...grades) : 0;
    const minGrade = grades.length > 0 ? Math.min(...grades) : 0;

    // Preparar dados do gráfico
    const chartData = submissions?.map(s => ({
      name: s.activity.title.substring(0, 20),
      value: s.grade
    })) || [];

    return {
      title: `Relatório de Desempenho - ${student?.full_name || 'Aluno'}`,
      templateName: 'Desempenho Individual (Aluno)',
      generatedAt: new Date().toISOString(),
      studentId,
      summary: {
        totalActivities: submissions?.length || 0,
        avgGrade: avgGrade.toFixed(1),
        maxGrade: maxGrade.toFixed(1),
        minGrade: minGrade.toFixed(1),
        totalClasses: classes?.length || 0
      },
      charts: [
        {
          title: 'Notas por Atividade',
          type: 'bar',
          data: chartData
        },
        {
          title: 'Evolução do Desempenho',
          type: 'line',
          data: chartData
        }
      ],
      tables: [
        {
          title: 'Turmas Inscritas',
          headers: ['Nome', 'Matéria'],
          rows: classes?.map(c => [c.class.name, c.class.subject || '-']) || []
        }
      ],
      details: `Relatório gerado para o período de ${period} dias. Total de ${submissions?.length || 0} atividades avaliadas.`
    };
  }

  /**
   * Gera relatório de desempenho da turma
   */
  async generateClassReport(classId, period = 30) {
    // Buscar dados da turma
    const { data: classData } = await supabase
      .from('classes')
      .select('name, subject, created_by')
      .eq('id', classId)
      .single();

    // Buscar alunos
    const { data: members } = await supabase
      .from('class_members')
      .select('user_id, profiles:user_id(full_name)')
      .eq('class_id', classId)
      .eq('role', 'student');

    // Buscar atividades da turma
    const { data: activities } = await supabase
      .from('activity_class_assignments')
      .select('activity_id, activity:activities(id, title)')
      .eq('class_id', classId);

    const activityIds = activities?.map(a => a.activity_id) || [];

    // Buscar submissões
    const { data: submissions } = await supabase
      .from('submissions')
      .select('grade, student_id, activity_id')
      .in('activity_id', activityIds)
      .not('grade', 'is', null);

    // Calcular média geral
    const grades = submissions?.map(s => s.grade) || [];
    const avgGrade = grades.length > 0 
      ? grades.reduce((a, b) => a + b, 0) / grades.length 
      : 0;

    // Calcular distribuição de notas
    const ranges = {
      'Excelente (90-100)': 0,
      'Bom (70-89)': 0,
      'Regular (50-69)': 0,
      'Insuficiente (0-49)': 0
    };

    grades.forEach(g => {
      if (g >= 90) ranges['Excelente (90-100)']++;
      else if (g >= 70) ranges['Bom (70-89)']++;
      else if (g >= 50) ranges['Regular (50-69)']++;
      else ranges['Insuficiente (0-49)']++;
    });

    const distributionData = Object.entries(ranges).map(([name, value]) => ({
      name,
      value
    }));

    return {
      title: `Relatório de Turma - ${classData?.name || 'Turma'}`,
      templateName: 'Relatório de Turma',
      generatedAt: new Date().toISOString(),
      classId,
      summary: {
        totalStudents: members?.length || 0,
        totalActivities: activities?.length || 0,
        avgGrade: avgGrade.toFixed(1),
        submissionsCount: submissions?.length || 0
      },
      charts: [
        {
          title: 'Distribuição de Notas',
          type: 'pie',
          data: distributionData
        }
      ],
      tables: [
        {
          title: 'Lista de Alunos',
          headers: ['Nome', 'Submissões'],
          rows: members?.map(m => {
            const count = submissions?.filter(s => s.student_id === m.user_id).length || 0;
            return [m.profiles.full_name, count];
          }) || []
        }
      ],
      details: `Turma: ${classData?.name}\nMatéria: ${classData?.subject || 'Não especificada'}\nPeríodo: últimos ${period} dias`
    };
  }

  /**
   * Gera relatório comparativo
   */
  async generateComparativeReport(teacherId) {
    // Buscar turmas ativas do professor
    const { data: classes } = await supabase
      .from('classes')
      .select('id, name, subject')
      .eq('created_by', teacherId)
      .eq('is_active', true);

    const classIds = classes?.map(c => c.id) || [];

    // Para cada turma, calcular média
    const classStats = await Promise.all(
      classes?.map(async (cls) => {
        const { data: activities } = await supabase
          .from('activity_class_assignments')
          .select('activity_id')
          .eq('class_id', cls.id);

        const activityIds = activities?.map(a => a.activity_id) || [];

        const { data: submissions } = await supabase
          .from('submissions')
          .select('grade')
          .in('activity_id', activityIds)
          .not('grade', 'is', null);

        const grades = submissions?.map(s => s.grade) || [];
        const avg = grades.length > 0 
          ? grades.reduce((a, b) => a + b, 0) / grades.length 
          : 0;

        return {
          name: cls.name,
          value: avg
        };
      }) || []
    );

    return {
      title: 'Relatório Comparativo de Turmas',
      templateName: 'Comparativo de Desempenho',
      generatedAt: new Date().toISOString(),
      teacherId,
      summary: {
        totalClasses: classes?.length || 0,
        avgGrade: (classStats.reduce((a, b) => a + b.value, 0) / (classStats.length || 1)).toFixed(1)
      },
      charts: [
        {
          title: 'Média por Turma',
          type: 'bar',
          data: classStats
        }
      ],
      tables: [
        {
          title: 'Detalhamento por Turma',
          headers: ['Turma', 'Matéria', 'Média'],
          rows: classes?.map((cls, i) => [
            cls.name,
            cls.subject || '-',
            classStats[i]?.value.toFixed(1) || '0'
          ]) || []
        }
      ]
    };
  }

  /**
   * Gera relatório do professor
   */
  async generateTeacherReport(teacherId) {
    // Buscar turmas ativas
    const { data: classes } = await supabase
      .from('classes')
      .select('id')
      .eq('created_by', teacherId)
      .eq('is_active', true);

    // Buscar total de alunos
    const { count: studentsCount } = await supabase
      .from('class_members')
      .select('id', { count: 'exact', head: true })
      .in('class_id', classes?.map(c => c.id) || [])
      .eq('role', 'student');

    // Buscar atividades
    const { data: activities } = await supabase
      .from('activities')
      .select('id')
      .eq('created_by', teacherId);

    // Buscar submissões
    const { data: submissions } = await supabase
      .from('submissions')
      .select('grade')
      .in('activity_id', activities?.map(a => a.id) || [])
      .not('grade', 'is', null);

    const grades = submissions?.map(s => s.grade) || [];
    const avgGrade = grades.length > 0 
      ? grades.reduce((a, b) => a + b, 0) / grades.length 
      : 0;

    return {
      title: 'Relatório de Desempenho do Professor',
      templateName: 'Desempenho (Professor)',
      generatedAt: new Date().toISOString(),
      teacherId,
      summary: {
        totalClasses: classes?.length || 0,
        totalStudents: studentsCount || 0,
        totalActivities: activities?.length || 0,
        avgGrade: avgGrade.toFixed(1)
      },
      details: `Relatório consolidado de todas as turmas e atividades criadas.`
    };
  }

  /**
   * Gera boletim formal por período
   */
  async generateBulletinReport(teacherId, options = {}) {
    const { period = 30, classId, studentId } = options;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // Se tem studentId, gera boletim individual
    if (studentId) {
      return await this.generateStudentBulletin(studentId, period);
    }

    // Se tem classId, gera boletim da turma
    if (classId) {
      return await this.generateClassBulletin(classId, period);
    }

    // Caso contrário, gera boletim geral do professor
    return await this.generateTeacherBulletin(teacherId, period);
  }

  /**
   * Gera boletim individual do aluno
   */
  async generateStudentBulletin(studentId, period = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // Buscar dados do aluno
    const { data: student } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', studentId)
      .single();

    // Buscar turmas do aluno
    const { data: classes } = await supabase
      .from('class_members')
      .select(`
        class:classes(id, name, subject, created_by),
        joined_at
      `)
      .eq('user_id', studentId)
      .eq('role', 'student');

    // Buscar submissões com detalhes das atividades
    const { data: submissions } = await supabase
      .from('submissions')
      .select(`
        grade,
        submitted_at,
        graded_at,
        status,
        activity:activities(
          id,
          title,
          type,
          max_score,
          due_date,
          activity_class_assignments!inner(class_id)
        )
      `)
      .eq('student_id', studentId)
      .gte('submitted_at', startDate.toISOString())
      .eq('status', 'graded');

    // Agrupar por turma e calcular estatísticas
    const classIds = classes?.map(c => c.class.id) || [];
    const bulletinData = [];

    for (const classItem of classes || []) {
      const classSubmissions = submissions?.filter(s => 
        s.activity?.activity_class_assignments?.[0]?.class_id === classItem.class.id
      ) || [];

      const grades = classSubmissions.map(s => s.grade).filter(g => g !== null);
      const avgGrade = grades.length > 0 
        ? grades.reduce((a, b) => a + b, 0) / grades.length 
        : 0;

      const totalActivities = classSubmissions.length;
      const onTimeDeliveries = classSubmissions.filter(s => 
        s.submitted_at && s.activity?.due_date && 
        new Date(s.submitted_at) <= new Date(s.activity.due_date)
      ).length;

      const attendanceRate = totalActivities > 0 ? (onTimeDeliveries / totalActivities) * 100 : 0;

      bulletinData.push({
        className: classItem.class.name,
        subject: classItem.class.subject || '-',
        activities: totalActivities,
        avgGrade: avgGrade.toFixed(1),
        attendanceRate: attendanceRate.toFixed(1),
        maxGrade: grades.length > 0 ? Math.max(...grades).toFixed(1) : '-',
        minGrade: grades.length > 0 ? Math.min(...grades).toFixed(1) : '-',
        details: classSubmissions.map(s => ({
          activityName: s.activity.title,
          grade: s.grade,
          maxGrade: s.activity.max_score || 100,
          date: new Date(s.graded_at).toLocaleDateString('pt-BR'),
          status: s.submitted_at <= s.activity.due_date ? 'No prazo' : 'Atrasado'
        }))
      });
    }

    // Calcular estatísticas gerais
    const allGrades = submissions?.map(s => s.grade).filter(g => g !== null) || [];
    const generalAvg = allGrades.length > 0 
      ? allGrades.reduce((a, b) => a + b, 0) / allGrades.length 
      : 0;

    return {
      title: `Boletim Escolar - ${student?.full_name || 'Aluno'}`,
      templateName: 'Boletim Individual',
      generatedAt: new Date().toISOString(),
      studentId,
      period,
      summary: {
        studentName: student?.full_name || '-',
        email: student?.email || '-',
        period: `${period} dias`,
        totalClasses: classes?.length || 0,
        totalActivities: submissions?.length || 0,
        generalAvg: generalAvg.toFixed(1)
      },
      tables: [
        {
          title: 'Resumo por Turma',
          headers: ['Turma', 'Matéria', 'Atividades', 'Média', 'Frequência', 'Maior Nota', 'Menor Nota'],
          rows: bulletinData.map(d => [
            d.className,
            d.subject,
            d.activities,
            d.avgGrade,
            `${d.attendanceRate}%`,
            d.maxGrade,
            d.minGrade
          ])
        }
      ],
      details: bulletinData,
      observations: `Boletim gerado automaticamente para o período de ${period} dias. ` +
                   `Total de ${submissions?.length || 0} atividades avaliadas. ` +
                   `Média geral: ${generalAvg.toFixed(1)}.`
    };
  }

  /**
   * Gera boletim da turma
   */
  async generateClassBulletin(classId, period = 30) {
    // Buscar dados da turma
    const { data: classData } = await supabase
      .from('classes')
      .select('name, subject, created_by')
      .eq('id', classId)
      .single();

    // Buscar alunos
    const { data: members } = await supabase
      .from('class_members')
      .select(`
        user_id,
        profile:profiles!class_members_user_id_fkey(full_name, email)
      `)
      .eq('class_id', classId)
      .eq('role', 'student');

    // Buscar atividades da turma
    const { data: activities } = await supabase
      .from('activity_class_assignments')
      .select(`
        activity_id,
        activity:activities(id, title, type, max_score, due_date)
      `)
      .eq('class_id', classId);

    const activityIds = activities?.map(a => a.activity_id) || [];

    // Buscar todas as submissões
    const { data: submissions } = await supabase
      .from('submissions')
      .select(`
        grade,
        student_id,
        submitted_at,
        activity_id,
        activity:activities(title, max_score)
      `)
      .in('activity_id', activityIds)
      .eq('status', 'graded');

    // Gerar boletim para cada aluno
    const studentsData = [];
    
    for (const member of members || []) {
      const studentSubmissions = submissions?.filter(s => s.student_id === member.user_id) || [];
      const grades = studentSubmissions.map(s => s.grade).filter(g => g !== null);
      
      const avgGrade = grades.length > 0 
        ? grades.reduce((a, b) => a + b, 0) / grades.length 
        : 0;

      const onTimeCount = studentSubmissions.filter(s => 
        s.submitted_at && s.activity?.due_date && 
        new Date(s.submitted_at) <= new Date(s.activity.due_date)
      ).length;

      const attendanceRate = studentSubmissions.length > 0 
        ? (onTimeCount / studentSubmissions.length) * 100 
        : 0;

      // Status baseado na média
      let status = 'Aprovado';
      if (avgGrade < 6) status = 'Reprovado';
      else if (avgGrade < 7) status = 'Recuperação';

      studentsData.push({
        studentName: member.profile?.full_name || '-',
        email: member.profile?.email || '-',
        activities: studentSubmissions.length,
        avgGrade: avgGrade.toFixed(1),
        attendanceRate: attendanceRate.toFixed(1),
        status,
        details: studentSubmissions.map(s => ({
          activityName: s.activity.title,
          grade: s.grade,
          maxGrade: s.activity.max_score
        }))
      });
    }

    // Estatísticas da turma
    const allGrades = submissions?.map(s => s.grade).filter(g => g !== null) || [];
    const classAvg = allGrades.length > 0 
      ? allGrades.reduce((a, b) => a + b, 0) / allGrades.length 
      : 0;

    const approved = studentsData.filter(s => s.status === 'Aprovado').length;
    const recovery = studentsData.filter(s => s.status === 'Recuperação').length;
    const failed = studentsData.filter(s => s.status === 'Reprovado').length;

    return {
      title: `Boletim da Turma - ${classData?.name || 'Turma'}`,
      templateName: 'Boletim da Turma',
      generatedAt: new Date().toISOString(),
      classId,
      period,
      summary: {
        className: classData?.name || '-',
        subject: classData?.subject || '-',
        period: `${period} dias`,
        totalStudents: members?.length || 0,
        totalActivities: activities?.length || 0,
        classAvg: classAvg.toFixed(1),
        approved,
        recovery,
        failed
      },
      tables: [
        {
          title: 'Boletim dos Alunos',
          headers: ['Aluno', 'Email', 'Atividades', 'Média', 'Frequência', 'Status'],
          rows: studentsData.map(d => [
            d.studentName,
            d.email,
            d.activities,
            d.avgGrade,
            `${d.attendanceRate}%`,
            d.status
          ])
        }
      ],
      details: studentsData,
      observations: `Boletim gerado para a turma ${classData?.name}. ` +
                   `Total de ${members?.length || 0} alunos. ` +
                   `Média da turma: ${classAvg.toFixed(1)}. ` +
                   `Aprovados: ${approved}, Recuperação: ${recovery}, Reprovados: ${failed}.`
    };
  }

  /**
   * Gera boletim geral do professor
   */
  async generateTeacherBulletin(teacherId, period = 30) {
    // Buscar turmas do professor
    const { data: classes } = await supabase
      .from('classes')
      .select('id, name, subject')
      .eq('created_by', teacherId)
      .eq('is_active', true);

    const classIds = classes?.map(c => c.id) || [];

    // Buscar todos os alunos das turmas
    const { data: members } = await supabase
      .from('class_members')
      .select(`
        user_id,
        class_id,
        profile:profiles!class_members_user_id_fkey(full_name, email)
      `)
      .in('class_id', classIds)
      .eq('role', 'student');

    // Buscar todas as atividades
    const { data: activities } = await supabase
      .from('activity_class_assignments')
      .select('activity_id, class_id')
      .in('class_id', classIds);

    const activityIds = activities?.map(a => a.activity_id) || [];

    // Buscar todas as submissões
    const { data: submissions } = await supabase
      .from('submissions')
      .select(`
        grade,
        student_id,
        activity_id,
        activity:activities(title, max_score, due_date),
        activity_class_assignments!inner(class_id)
      `)
      .in('activity_id', activityIds)
      .eq('status', 'graded');

    // Agrupar por turma
    const classesData = [];
    
    for (const classItem of classes || []) {
      const classMembers = members?.filter(m => m.class_id === classItem.id) || [];
      const classSubmissions = submissions?.filter(s => 
        s.activity_class_assignments?.[0]?.class_id === classItem.id
      ) || [];

      const grades = classSubmissions.map(s => s.grade).filter(g => g !== null);
      const avgGrade = grades.length > 0 
        ? grades.reduce((a, b) => a + b, 0) / grades.length 
        : 0;

      const onTimeCount = classSubmissions.filter(s => 
        s.submitted_at && s.activity?.due_date && 
        new Date(s.submitted_at) <= new Date(s.activity.due_date)
      ).length;

      const attendanceRate = classSubmissions.length > 0 
        ? (onTimeCount / classSubmissions.length) * 100 
        : 0;

      classesData.push({
        className: classItem.name,
        subject: classItem.subject || '-',
        students: classMembers.length,
        activities: activities?.filter(a => a.class_id === classItem.id).length || 0,
        submissions: classSubmissions.length,
        avgGrade: avgGrade.toFixed(1),
        attendanceRate: attendanceRate.toFixed(1)
      });
    }

    // Estatísticas gerais
    const allGrades = submissions?.map(s => s.grade).filter(g => g !== null) || [];
    const generalAvg = allGrades.length > 0 
      ? allGrades.reduce((a, b) => a + b, 0) / allGrades.length 
      : 0;

    return {
      title: 'Boletim Geral - Todas as Turmas',
      templateName: 'Boletim Geral',
      generatedAt: new Date().toISOString(),
      teacherId,
      period,
      summary: {
        period: `${period} dias`,
        totalClasses: classes?.length || 0,
        totalStudents: members?.length || 0,
        totalActivities: activities?.length || 0,
        totalSubmissions: submissions?.length || 0,
        generalAvg: generalAvg.toFixed(1)
      },
      tables: [
        {
          title: 'Resumo por Turma',
          headers: ['Turma', 'Matéria', 'Alunos', 'Atividades', 'Submissões', 'Média', 'Frequência'],
          rows: classesData.map(d => [
            d.className,
            d.subject,
            d.students,
            d.activities,
            d.submissions,
            d.avgGrade,
            `${d.attendanceRate}%`
          ])
        }
      ],
      details: classesData,
      observations: `Boletim geral gerado para ${classes?.length || 0} turmas. ` +
                   `Total de ${members?.length || 0} alunos e ${submissions?.length || 0} submissões. ` +
                   `Média geral: ${generalAvg.toFixed(1)}.`
    };
  }
  async generateReport(templateId, targetId, options = {}) {
    switch (templateId) {
      case 'individual-student':
        return await this.generateStudentReport(targetId, options.period);
      
      case 'class-report':
        return await this.generateClassReport(targetId, options.period);
      
      case 'comparative':
        return await this.generateComparativeReport(targetId);
      
      case 'teacher-performance':
        return await this.generateTeacherReport(targetId);
      
      case 'activity-report':
        // Implementar relatório de atividade específica
        return {
          title: 'Relatório de Atividade',
          templateName: 'Relatório de Atividade',
          generatedAt: new Date().toISOString(),
          summary: {},
          details: 'Em desenvolvimento'
        };
      
      case 'bulletin':
        return await this.generateBulletinReport(targetId, options);
      
      default:
        throw new Error('Template de relatório não encontrado');
    }
  }
}

export default new ReportService();
