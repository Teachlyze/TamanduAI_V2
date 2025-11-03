import { logger } from '@/shared/utils/logger';
/**
 * 🤖 ANALYTICS ML SERVICE
 * Machine Learning para previsões e insights educacionais
 */

import { supabase } from '@/shared/services/supabaseClient';

/**
 * Previsão de Desempenho Futuro
 * Usa regressão linear simples baseada em histórico
 */
export const predictPerformance = async (studentId, classId) => {
  try {
    // Buscar submissões do aluno
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select(`
        grade,
        submitted_at,
        activities!inner(class_id)
      `)
      .eq('student_id', studentId)
      .eq('activities.class_id', classId)
      .not('grade', 'is', null)
      .order('submitted_at', { ascending: true });

    if (error) throw error;
    if (!submissions || submissions.length < 3) {
      return {
        prediction: null,
        confidence: 0,
        trend: 'insufficient_data',
        message: 'Mínimo 3 atividades necessárias'
      };
    }

    // Calcular tendência usando regressão linear
    const grades = submissions.map(s => parseFloat(s.grade));
    const n = grades.length;
    
    // Calcular média móvel e tendência
    const recentGrades = grades.slice(-5); // últimas 5
    const avgRecent = recentGrades.reduce((a, b) => a + b, 0) / recentGrades.length;
    const avgTotal = grades.reduce((a, b) => a + b, 0) / n;
    
    // Tendência simples
    const trend = avgRecent > avgTotal + 5 ? 'improving' :
                  avgRecent < avgTotal - 5 ? 'declining' : 'stable';
    
    // Previsão próxima nota (média ponderada)
    const weights = [0.1, 0.15, 0.2, 0.25, 0.3]; // mais peso nas recentes
    let prediction = 0;
    const last5 = grades.slice(-5);
    
    for (let i = 0; i < last5.length; i++) {
      prediction += last5[i] * (weights[i] || 0.2);
    }
    
    // Confiança baseada em consistência
    const variance = grades.reduce((sum, g) => sum + Math.pow(g - avgTotal, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const confidence = Math.max(0, Math.min(100, 100 - (stdDev * 2)));

    return {
      prediction: Math.round(prediction * 10) / 10,
      confidence: Math.round(confidence),
      trend,
      avgRecent: Math.round(avgRecent * 10) / 10,
      avgTotal: Math.round(avgTotal * 10) / 10,
      totalSubmissions: n,
      message: trend === 'improving' ? 'Aluno em evolução!' :
               trend === 'declining' ? 'Atenção: queda de desempenho' :
               'Desempenho estável'
    };
  } catch (error) {
    logger.error('Erro ao prever desempenho:', error)
    return null;
  }
};

/**
 * Identificar Alunos em Risco
 * Detecta padrões de risco: notas baixas, ausências, queda
 */
export const identifyAtRiskStudents = async (classId) => {
  try {
    // Buscar todos alunos da turma com suas métricas
    const { data: members, error } = await supabase
      .from('class_members')
      .select(`
        user_id,
        role,
        profiles:user_id(full_name, email)
      `)
      .eq('class_id', classId)
      .eq('role', 'student');

    if (error) throw error;

    const atRiskStudents = [];

    for (const member of members) {
      // Buscar submissões do aluno
      const { data: submissions } = await supabase
        .from('submissions')
        .select('grade, submitted_at, status')
        .eq('student_id', member.user_id)
        .order('submitted_at', { ascending: false })
        .limit(10);

      if (!submissions || submissions.length === 0) continue;

      const grades = submissions
        .filter(s => s.grade !== null)
        .map(s => parseFloat(s.grade));
      
      if (grades.length === 0) continue;

      const avgGrade = grades.reduce((a, b) => a + b, 0) / grades.length;
      const recentGrades = grades.slice(0, 3);
      const avgRecent = recentGrades.reduce((a, b) => a + b, 0) / recentGrades.length;
      
      // Critérios de risco
      const lowGrades = avgGrade < 60;
      const declining = avgRecent < avgGrade - 10;
      const inconsistent = Math.max(...grades) - Math.min(...grades) > 40;
      
      let riskLevel = 0;
      const reasons = [];

      if (lowGrades) {
        riskLevel += 3;
        reasons.push('Média baixa');
      }
      if (declining) {
        riskLevel += 2;
        reasons.push('Queda recente');
      }
      if (inconsistent) {
        riskLevel += 1;
        reasons.push('Inconsistente');
      }

      if (riskLevel > 0) {
        atRiskStudents.push({
          studentId: member.user_id,
          name: member.profiles?.full_name,
          email: member.profiles?.email,
          avgGrade: Math.round(avgGrade * 10) / 10,
          avgRecent: Math.round(avgRecent * 10) / 10,
          riskLevel: riskLevel >= 4 ? 'high' : riskLevel >= 2 ? 'medium' : 'low',
          reasons,
          totalSubmissions: submissions.length
        });
      }
    }

    // Ordenar por nível de risco
    return atRiskStudents.sort((a, b) => {
      const levels = { high: 3, medium: 2, low: 1 };
      return levels[b.riskLevel] - levels[a.riskLevel];
    });
  } catch (error) {
    logger.error('Erro ao identificar alunos em risco:', error)
    return [];
  }
};

/**
 * Clustering de Alunos (K-Means simplificado)
 * Agrupa alunos por desempenho similar
 */
export const clusterStudents = async (classId) => {
  try {
    // Buscar métricas de todos alunos
    const { data: members } = await supabase
      .from('class_members')
      .select(`
        student_id,
        profiles!inner(full_name)
      `)
      .eq('class_id', classId);

    if (!members || members.length < 3) {
      return { clusters: [], message: 'Mínimo 3 alunos necessários' };
    }

    const studentMetrics = [];

    for (const member of members) {
      const { data: submissions } = await supabase
        .from('submissions')
        .select('grade, submitted_at')
        .eq('student_id', member.student_id)
        .not('grade', 'is', null);

      if (!submissions || submissions.length === 0) continue;

      const grades = submissions.map(s => parseFloat(s.grade));
      const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
      const variance = grades.reduce((sum, g) => sum + Math.pow(g - avg, 2), 0) / grades.length;

      studentMetrics.push({
        studentId: member.student_id,
        name: member.profiles.full_name,
        avgGrade: avg,
        consistency: 100 - Math.sqrt(variance), // quanto maior, mais consistente
        totalSubmissions: submissions.length
      });
    }

    // Clustering simples por faixas
    const clusters = {
      excelente: studentMetrics.filter(s => s.avgGrade >= 85),
      bom: studentMetrics.filter(s => s.avgGrade >= 70 && s.avgGrade < 85),
      regular: studentMetrics.filter(s => s.avgGrade >= 60 && s.avgGrade < 70),
      atencao: studentMetrics.filter(s => s.avgGrade < 60)
    };

    return {
      clusters: [
        {
          name: 'Excelente',
          color: 'green',
          students: clusters.excelente,
          avgGrade: clusters.excelente.length > 0 ? 
            Math.round(clusters.excelente.reduce((sum, s) => sum + s.avgGrade, 0) / clusters.excelente.length * 10) / 10 : 0,
          count: clusters.excelente.length
        },
        {
          name: 'Bom',
          color: 'blue',
          students: clusters.bom,
          avgGrade: clusters.bom.length > 0 ?
            Math.round(clusters.bom.reduce((sum, s) => sum + s.avgGrade, 0) / clusters.bom.length * 10) / 10 : 0,
          count: clusters.bom.length
        },
        {
          name: 'Regular',
          color: 'yellow',
          students: clusters.regular,
          avgGrade: clusters.regular.length > 0 ?
            Math.round(clusters.regular.reduce((sum, s) => sum + s.avgGrade, 0) / clusters.regular.length * 10) / 10 : 0,
          count: clusters.regular.length
        },
        {
          name: 'Atenção',
          color: 'red',
          students: clusters.atencao,
          avgGrade: clusters.atencao.length > 0 ?
            Math.round(clusters.atencao.reduce((sum, s) => sum + s.avgGrade, 0) / clusters.atencao.length * 10) / 10 : 0,
          count: clusters.atencao.length
        }
      ],
      totalStudents: studentMetrics.length
    };
  } catch (error) {
    logger.error('Erro ao clusterizar alunos:', error)
    return { clusters: [], message: 'Erro ao processar' };
  }
};

/**
 * Análise de Sentimento (simplificada)
 * Detecta feedbacks negativos em comentários
 */
export const analyzeSentiment = (text) => {
  if (!text) return { score: 0, label: 'neutral' };

  const lowerText = text.toLowerCase();
  
  // Palavras negativas
  const negative = ['ruim', 'difícil', 'complicado', 'confuso', 'péssimo', 
    'horrível', 'não entendi', 'muito difícil', 'impossível', 'frustrado'];
  
  // Palavras positivas
  const positive = ['bom', 'ótimo', 'excelente', 'legal', 'entendi', 
    'fácil', 'claro', 'adorei', 'perfeito', 'incrível'];

  let score = 0;
  negative.forEach(word => {
    if (lowerText.includes(word)) score -= 1;
  });
  positive.forEach(word => {
    if (lowerText.includes(word)) score += 1;
  });

  return {
    score,
    label: score < -1 ? 'negative' : score > 1 ? 'positive' : 'neutral',
    needsAttention: score < -1
  };
};

/**
 * Recomendações Adaptativas
 * Sugere materiais baseado em dificuldades
 */
export const generateRecommendations = async (studentId, classId) => {
  try {
    // Buscar atividades do aluno
    const { data: submissions } = await supabase
      .from('submissions')
      .select(`
        grade,
        activities!inner(
          title,
          activity_type,
          class_id
        )
      `)
      .eq('student_id', studentId)
      .eq('activities.class_id', classId)
      .not('grade', 'is', null);

    if (!submissions || submissions.length < 3) {
      return {
        recommendations: [],
        message: 'Mais atividades necessárias para recomendações'
      };
    }

    // Identificar áreas de dificuldade
    const lowGradeActivities = submissions
      .filter(s => parseFloat(s.grade) < 70)
      .map(s => s.activities);

    const recommendations = [];

    if (lowGradeActivities.length > 0) {
      recommendations.push({
        type: 'review',
        priority: 'high',
        title: 'Revisão Necessária',
        description: `Revisar conceitos de ${lowGradeActivities.length} atividade(s) com baixo desempenho`,
        activities: lowGradeActivities.slice(0, 3)
      });
    }

    // Recomendar prática
    const quizzes = submissions.filter(s => s.activities.activity_type === 'quiz');
    if (quizzes.length < 3) {
      recommendations.push({
        type: 'practice',
        priority: 'medium',
        title: 'Prática com Quizzes',
        description: 'Fazer mais quizzes para fixar conteúdo',
        suggestion: 'Banco de Questões disponível'
      });
    }

    return {
      recommendations,
      totalAnalyzed: submissions.length,
      weakAreas: lowGradeActivities.length
    };
  } catch (error) {
    logger.error('Erro ao gerar recomendações:', error)
    return { recommendations: [], message: 'Erro ao processar' };
  }
};

/**
 * Previsão de Churn
 * Identifica alunos com risco de abandonar
 */
export const predictChurn = async (classId) => {
  try {
    const { data: members } = await supabase
      .from('class_members')
      .select(`
        student_id,
        joined_at,
        profiles!inner(full_name, email)
      `)
      .eq('class_id', classId);

    if (!members) return [];

    const churnRisks = [];
    const now = new Date();

    for (const member of members) {
      // Buscar última atividade
      const { data: lastSubmission } = await supabase
        .from('submissions')
        .select('submitted_at')
        .eq('student_id', member.student_id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();

      if (!lastSubmission) {
        churnRisks.push({
          studentId: member.student_id,
          name: member.profiles.full_name,
          email: member.profiles.email,
          riskLevel: 'high',
          reason: 'Nenhuma atividade realizada',
          daysSinceActivity: Math.floor((now - new Date(member.joined_at)) / (1000 * 60 * 60 * 24))
        });
        continue;
      }

      const daysSince = Math.floor((now - new Date(lastSubmission.submitted_at)) / (1000 * 60 * 60 * 24));

      if (daysSince > 14) {
        churnRisks.push({
          studentId: member.student_id,
          name: member.profiles.full_name,
          email: member.profiles.email,
          riskLevel: daysSince > 30 ? 'high' : 'medium',
          reason: `${daysSince} dias sem atividade`,
          daysSinceActivity: daysSince
        });
      }
    }

    return churnRisks.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
  } catch (error) {
    logger.error('Erro ao prever churn:', error)
    return [];
  }
};

/**
 * Análise de Desempenho de Turmas
 */
export const analyzeClassPerformance = async (classId) => {
  try {
    // Buscar todas submissões da turma
    const { data: submissions } = await supabase
      .from('submissions')
      .select(`
        grade,
        submitted_at,
        student_id,
        activities!inner(class_id, activity_type)
      `)
      .eq('activities.class_id', classId)
      .not('grade', 'is', null);

    if (!submissions || submissions.length === 0) {
      return null;
    }

    // Buscar XP da turma
    const { data: xpLogs } = await supabase
      .from('xp_log')
      .select('amount, source, student_id, created_at')
      .in('student_id', [...new Set(submissions.map(s => s.student_id))]);

    const grades = submissions.map(s => parseFloat(s.grade));
    const avgGrade = grades.reduce((a, b) => a + b, 0) / grades.length;
    const variance = grades.reduce((sum, g) => sum + Math.pow(g - avgGrade, 2), 0) / grades.length;
    const stdDev = Math.sqrt(variance);

    // Analisar XP
    const totalXP = xpLogs?.reduce((sum, log) => sum + log.amount, 0) || 0;
    const xpSources = {};
    xpLogs?.forEach(log => {
      xpSources[log.source] = (xpSources[log.source] || 0) + log.amount;
    });

    // Calcular tendência (últimas 4 semanas)
    const now = new Date();
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const recentSubmissions = submissions.filter(s => new Date(s.submitted_at) > fourWeeksAgo);
    const recentGrades = recentSubmissions.map(s => parseFloat(s.grade));
    const avgRecent = recentGrades.length > 0 
      ? recentGrades.reduce((a, b) => a + b, 0) / recentGrades.length 
      : avgGrade;

    const trend = avgRecent > avgGrade + 3 ? 'improving' :
                  avgRecent < avgGrade - 3 ? 'declining' : 'stable';

    // Ajustar média com XP (peso 10%)
    const xpBonus = Math.min(5, totalXP / 1000); // Máx 5 pontos de bônus
    const adjustedAvg = avgGrade * 0.9 + xpBonus * 0.1;

    // Distribuição de notas (buckets)
    const gradeBuckets = { '0-49': 0, '50-69': 0, '70-84': 0, '85-100': 0 };
    grades.forEach(g => {
      const v = Math.round(g);
      if (v <= 49) gradeBuckets['0-49']++;
      else if (v <= 69) gradeBuckets['50-69']++;
      else if (v <= 84) gradeBuckets['70-84']++;
      else gradeBuckets['85-100']++;
    });

    // Intervalo médio entre submissões (em dias)
    const sortedSubs = submissions.slice().sort((a,b) => new Date(a.submitted_at) - new Date(b.submitted_at));
    let totalIntervals = 0;
    let intervalsCount = 0;
    for (let i = 1; i < sortedSubs.length; i++) {
      const d = (new Date(sortedSubs[i].submitted_at) - new Date(sortedSubs[i-1].submitted_at)) / (1000*60*60*24);
      if (isFinite(d) && d >= 0) { totalIntervals += d; intervalsCount++; }
    }
    const avgDaysBetweenSubmissions = intervalsCount > 0 ? Math.round((totalIntervals/intervalsCount) * 10)/10 : null;

    // Submissões por aluno (média)
    const byStudent = {};
    submissions.forEach(s => { byStudent[s.student_id] = (byStudent[s.student_id] || 0) + 1; });
    const submissionsPerStudentAvg = Object.keys(byStudent).length > 0
      ? Math.round((Object.values(byStudent).reduce((a,b)=>a+b,0) / Object.keys(byStudent).length) * 10)/10
      : 0;

    return {
      avgGrade: Math.round(avgGrade * 10) / 10,
      adjustedAvg: Math.round(adjustedAvg * 10) / 10,
      stdDev: Math.round(stdDev * 10) / 10,
      trend,
      totalSubmissions: submissions.length,
      totalStudents: new Set(submissions.map(s => s.student_id)).size,
      totalXP,
      xpSources,
      gradeBuckets,
      avgDaysBetweenSubmissions,
      submissionsPerStudentAvg,
      consistency: stdDev < 15 ? 'high' : stdDev < 25 ? 'medium' : 'low',
      engagement: totalXP > 5000 ? 'high' : totalXP > 2000 ? 'medium' : 'low'
    };
  } catch (error) {
    logger.error('Erro ao analisar turma:', error)
    return null;
  }
};

/**
 * Análise de Desempenho de Professor
 */
export const analyzeTeacherPerformance = async (teacherId) => {
  try {
    // Buscar turmas do professor
    const { data: classes } = await supabase
      .from('classes')
      .select('id, name')
      .eq('created_by', teacherId);

    if (!classes || classes.length === 0) {
      return null;
    }

    const classAnalyses = [];
    let totalStudents = 0;
    let totalActivities = 0;
    let totalSubmissions = 0;
    let totalXP = 0;
    let avgGradeSum = 0;

    for (const cls of classes) {
      const analysis = await analyzeClassPerformance(cls.id);
      
      if (analysis) {
        classAnalyses.push({
          classId: cls.id,
          className: cls.name,
          ...analysis
        });

        totalStudents += analysis.totalStudents;
        totalSubmissions += analysis.totalSubmissions;
        totalXP += analysis.totalXP;
        avgGradeSum += analysis.avgGrade;
      }

      // Contar atividades
      const { count } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', cls.id);
      
      totalActivities += count || 0;
    }

    const avgGrade = classAnalyses.length > 0 
      ? avgGradeSum / classAnalyses.length 
      : 0;

    return {
      teacherId,
      totalClasses: classes.length,
      totalStudents,
      totalActivities,
      totalSubmissions,
      totalXP,
      avgGrade: Math.round(avgGrade * 10) / 10,
      classAnalyses,
      engagementScore: totalXP / totalStudents || 0,
      activityRate: totalActivities / classes.length || 0
    };
  } catch (error) {
    logger.error('Erro ao analisar professor:', error)
    return null;
  }
};

/**
 * Comparar Professores (para escola)
 */
export const compareTeachers = async (schoolId) => {
  try {
    // Buscar todos professores ativos da escola
    const { data: schoolTeachers } = await supabase
      .from('school_teachers')
      .select('user_id, status')
      .eq('school_id', schoolId)
      .eq('status', 'active');

    if (!schoolTeachers || schoolTeachers.length === 0) {
      return [];
    }

    const teacherIds = schoolTeachers.map(st => st.user_id);
    const comparisons = [];

    for (const teacherId of teacherIds) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', teacherId)
        .single();

      const analysis = await analyzeTeacherPerformance(teacherId);
      
      if (analysis && profile) {
        comparisons.push({
          teacherId,
          name: profile.name,
          ...analysis
        });
      }
    }

    // Ordenar por avgGrade
    return comparisons.sort((a, b) => b.avgGrade - a.avgGrade);
  } catch (error) {
    logger.error('Erro ao comparar professores:', error)
    return [];
  }
};

/**
 * Comparar Turmas (para escola)
 */
export const compareClasses = async (schoolId) => {
  try {
    // Buscar classes vinculadas à escola
    const { data: schoolClasses } = await supabase
      .from('school_classes')
      .select('class_id')
      .eq('school_id', schoolId);

    const classIds = (schoolClasses || []).map(sc => sc.class_id);

    if (!classIds || classIds.length === 0) {
      return [];
    }

    // Buscar detalhes das classes e nomes de professores
    const { data: classes } = await supabase
      .from('classes')
      .select('id, name, created_by')
      .in('id', classIds);

    const teacherIds = [...new Set((classes || []).map(c => c.created_by).filter(Boolean))];
    let teacherNameById = {};
    if (teacherIds.length > 0) {
      const { data: teachers } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', teacherIds);
      teacherNameById = (teachers || []).reduce((acc, t) => { acc[t.id] = t.name; return acc; }, {});
    }

    const comparisons = [];
    for (const cls of (classes || [])) {
      const analysis = await analyzeClassPerformance(cls.id);
      if (analysis) {
        comparisons.push({
          classId: cls.id,
          className: cls.name,
          teacherName: teacherNameById[cls.created_by] || 'Professor',
          ...analysis
        });
      }
    }

    return comparisons.sort((a, b) => b.avgGrade - a.avgGrade);
  } catch (error) {
    logger.error('Erro ao comparar turmas:', error)
    return [];
  }
};

/**
 * Insights com OpenAI
 * Usa a edge function openai-chat para análises mais profundas
 */
export const generateAIInsights = async (data, type = 'student') => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    let prompt = '';

    if (type === 'student') {
      prompt = `Analise este aluno e forneça insights educacionais:
      
Dados:
- Média: ${data.avgGrade}
- Tendência: ${data.trend}
- Total XP: ${data.totalXP || 0}
- Submissões: ${data.totalSubmissions}
- Consistência: ${data.consistency || 'N/A'}
 - Observação: XP tem peso menor (10%) em análises de desempenho.

Forneça em JSON:
{
  "strengths": ["força 1", "força 2"],
  "weaknesses": ["fraqueza 1", "fraqueza 2"],
  "recommendations": ["recomendação 1", "recomendação 2"],
  "motivationalMessage": "mensagem motivacional"
}`;
    } else if (type === 'class') {
      prompt = `Analise esta turma e forneça insights educacionais:
      
Dados:
- Média: ${data.avgGrade}
- Desvio Padrão: ${data.stdDev}
- Tendência: ${data.trend}
- Total XP: ${data.totalXP}
- Alunos: ${data.totalStudents}
- Engajamento: ${data.engagement}
 - Fontes de XP (top 5): ${JSON.stringify(data.xpSources || {})}
 - Observação: XP tem peso reduzido (10%) para média ajustada.
 - Distribuição de notas: ${JSON.stringify(data.gradeBuckets || {})}
 - Dias médios entre submissões: ${data.avgDaysBetweenSubmissions ?? 'N/D'}
 - Submissões por aluno (média): ${data.submissionsPerStudentAvg ?? 'N/D'}

Forneça em JSON:
{
  "strengths": ["força 1", "força 2"],
  "concerns": ["preocupação 1", "preocupação 2"],
  "recommendations": ["recomendação 1", "recomendação 2"],
  "teachingTips": ["dica 1", "dica 2"]
}`;
    } else if (type === 'teacher') {
      // Montar resumos agregados quando disponíveis
      const classCount = data.totalClasses ?? (data.classAnalyses?.length || 0);
      const trendCounts = (data.classAnalyses || []).reduce((acc, c) => {
        acc[c.trend || 'stable'] = (acc[c.trend || 'stable'] || 0) + 1;
        return acc;
      }, {});
      const topClass = (data.classAnalyses || []).slice().sort((a, b) => (b.avgGrade || 0) - (a.avgGrade || 0))[0] || null;
      const bottomClass = (data.classAnalyses || []).slice().sort((a, b) => (a.avgGrade || 0) - (b.avgGrade || 0))[0] || null;
      // Agregar fontes de XP por turma
      const aggregatedXpSources = (data.classAnalyses || []).reduce((acc, c) => {
        const src = c.xpSources || {};
        Object.keys(src).forEach(k => {
          acc[k] = (acc[k] || 0) + src[k];
        });
        return acc;
      }, {});

      prompt = `Analise este professor e forneça insights:
      
Dados:
- Turmas: ${data.totalClasses}
- Alunos: ${data.totalStudents}
- Média Geral: ${data.avgGrade}
- Total XP gerado: ${data.totalXP}
- Taxa de atividades: ${data.activityRate}
 - Tendências por turma: ${JSON.stringify(trendCounts)}
 - Turma com melhor desempenho: ${topClass ? `${topClass.className} (média ${topClass.avgGrade}, engajamento ${topClass.engagement})` : 'N/D'}
 - Turma com pior desempenho: ${bottomClass ? `${bottomClass.className} (média ${bottomClass.avgGrade}, engajamento ${bottomClass.engagement})` : 'N/D'}
 - Fontes de XP agregadas (top 5): ${JSON.stringify(Object.fromEntries(Object.entries(aggregatedXpSources).sort((a,b)=>b[1]-a[1]).slice(0,5)))}
 - Observação: XP influencia apenas 10% da média ajustada.

Forneça em JSON:
{
  "strengths": ["força 1", "força 2"],
  "improvements": ["melhoria 1", "melhoria 2"],
  "recommendations": ["recomendação 1", "recomendação 2"],
  "recognition": "mensagem de reconhecimento"
}`;
    }

    const { data: response, error } = await supabase.functions.invoke('openai-chat', {
      body: {
        messages: [
          { role: 'system', content: 'Você é um especialista em análise educacional. Responda APENAS em JSON válido.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      }
    });

    if (error) throw error;

    // Parse do JSON da resposta
    const content = response.choices?.[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    logger.error('Erro ao gerar insights AI:', error)
    return null;
  }
};

/**
 * Obter sugestões de estudo para um aluno
 */
export const getStudySuggestions = async (studentId) => {
  try {
    // Buscar performance recente do aluno
    const { data: submissions } = await supabase
      .from('submissions')
      .select('grade, activity:activities(title, type)')
      .eq('student_id', studentId)
      .not('grade', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(10);

    if (!submissions || submissions.length === 0) {
      return [];
    }

    const avgGrade = submissions.reduce((sum, s) => sum + s.grade, 0) / submissions.length;
    const suggestions = [];

    if (avgGrade < 6) {
      suggestions.push({ text: 'Revise os conceitos fundamentais da disciplina', icon: 'BookOpen' });
      suggestions.push({ text: 'Procure ajuda do professor ou monitoria', icon: 'Users' });
    } else if (avgGrade < 7.5) {
      suggestions.push({ text: 'Pratique mais exercícios para fixar o conteúdo', icon: 'Target' });
      suggestions.push({ text: 'Faça resumos dos tópicos principais', icon: 'FileText' });
    } else {
      suggestions.push({ text: 'Continue seu excelente trabalho!', icon: 'Trophy' });
      suggestions.push({ text: 'Ajude colegas que têm dificuldades', icon: 'Users' });
    }

    return suggestions;
  } catch (error) {
    logger.error('Erro ao obter sugestões:', error)
    return [
      { text: 'Continue praticando regularmente', icon: 'Target' },
      { text: 'Revise conceitos fundamentais', icon: 'BookOpen' }
    ];
  }
};

/**
 * Identificar áreas que precisam de atenção
 */
export const getAttentionAreas = async (studentId) => {
  try {
    // Buscar submissions por disciplina
    const { data: submissions } = await supabase
      .from('submissions')
      .select(`
        grade,
        activity:activities(
          title,
          activity_class_assignments(
            class:classes(name, subject)
          )
        )
      `)
      .eq('student_id', studentId)
      .not('grade', 'is', null);

    if (!submissions || submissions.length === 0) {
      return [];
    }

    // Agrupar por disciplina
    const bySubject = {};
    submissions.forEach(s => {
      const subject = s.activity?.activity_class_assignments?.[0]?.class?.subject || 'Geral';
      if (!bySubject[subject]) {
        bySubject[subject] = [];
      }
      bySubject[subject].push(s.grade);
    });

    // Identificar disciplinas com média baixa
    const attentionAreas = [];
    Object.entries(bySubject).forEach(([subject, grades]) => {
      const avg = grades.reduce((sum, g) => sum + g, 0) / grades.length;
      if (avg < 7) {
        attentionAreas.push({
          subject,
          title: subject,
          description: `Média atual: ${avg.toFixed(1)}. Foque mais nesta disciplina.`,
          avgGrade: avg
        });
      }
    });

    return attentionAreas;
  } catch (error) {
    logger.error('Erro ao identificar áreas de atenção:', error)
    return [];
  }
};

export default {
  predictPerformance,
  identifyAtRiskStudents,
  clusterStudents,
  analyzeSentiment,
  generateRecommendations,
  predictChurn,
  analyzeClassPerformance,
  analyzeTeacherPerformance,
  compareTeachers,
  compareClasses,
  generateAIInsights,
  getStudentGradeBuckets,
  getStudySuggestions,
  getAttentionAreas
};

/**
 * Buckets de notas por aluno em uma turma
 */
export async function getStudentGradeBuckets(studentId, classId) {
  try {
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('grade, activities!inner(class_id)')
      .eq('student_id', studentId)
      .eq('activities.class_id', classId)
      .not('grade', 'is', null);
    if (error) throw error;

    const buckets = { '0-49': 0, '50-69': 0, '70-84': 0, '85-100': 0 };
    (submissions || []).forEach(s => {
      const g = Math.round(parseFloat(s.grade));
      if (g <= 49) buckets['0-49']++;
      else if (g <= 69) buckets['50-69']++;
      else if (g <= 84) buckets['70-84']++;
      else buckets['85-100']++;
    });
    return buckets;
  } catch (err) {
    logger.error('Erro ao calcular buckets do aluno:', err)
    return { '0-49': 0, '50-69': 0, '70-84': 0, '85-100': 0 };
  }
}
