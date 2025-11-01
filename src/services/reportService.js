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
    // Buscar todas as turmas do professor
    const { data: classes } = await supabase
      .from('classes')
      .select('id, name, subject')
      .eq('created_by', teacherId);

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
    // Buscar turmas
    const { data: classes } = await supabase
      .from('classes')
      .select('id')
      .eq('created_by', teacherId);

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
   * Roteador para gerar relatório baseado no template
   */
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
        // Implementar boletim
        return {
          title: 'Boletim Geral',
          templateName: 'Boletim Geral',
          generatedAt: new Date().toISOString(),
          summary: {},
          details: 'Em desenvolvimento'
        };
      
      default:
        throw new Error('Template de relatório não encontrado');
    }
  }
}

export default new ReportService();
