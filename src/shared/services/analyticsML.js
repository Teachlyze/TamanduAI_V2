import { supabase } from '@/shared/services/supabaseClient';

/**
 * Serviço de Analytics com Machine Learning
 * Implementa modelos básicos de ML para insights educacionais
 */

/**
 * Previsão de Desempenho do Aluno
 * Usa regressão linear simples para prever nota final
 */
export async function predictStudentPerformance(studentId, classId) {
  try {
    // 1. Buscar histórico de notas
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select(`
        grade,
        submitted_at,
        activities!inner(
          due_date,
          activity_class_assignments!inner(
            class_id
          )
        )
      `)
      .eq('student_id', studentId)
      .eq('activities.activity_class_assignments.class_id', classId)
      .not('grade', 'is', null)
      .order('submitted_at', { ascending: true });

    if (error) throw error;
    if (!submissions || submissions.length < 3) {
      return {
        success: false,
        error: 'INSUFFICIENT_DATA',
        message: 'Dados insuficientes para previsão (mínimo 3 notas)',
      };
    }

    // 2. Calcular estatísticas básicas
    const grades = submissions.map((s) => parseFloat(s.grade));
    const average = grades.reduce((a, b) => a + b, 0) / grades.length;
    const variance = grades.reduce((sum, g) => sum + Math.pow(g - average, 2), 0) / grades.length;
    const stdDev = Math.sqrt(variance);

    // 3. Calcular tendência (regressão linear simples)
    const n = grades.length;
    const x = grades.map((_, i) => i); // índices como x
    const y = grades; // notas como y

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // 4. Prever próximas notas
    const nextGrade = slope * n + intercept;
    const prediction = Math.max(0, Math.min(10, nextGrade));

    // 5. Calcular probabilidade de aprovação (nota >= 7)
    const approvalThreshold = 7.0;
    const passCount = grades.filter((g) => g >= approvalThreshold).length;
    const approvalRate = passCount / n;
    
    // Ajustar pela tendência
    let approvalProbability = approvalRate;
    if (slope > 0.1) approvalProbability = Math.min(1, approvalRate + 0.15);
    if (slope < -0.1) approvalProbability = Math.max(0, approvalRate - 0.15);

    // 6. Identificar risco
    const isAtRisk = average < 6.0 || (slope < -0.2 && average < 7.0);
    const needsAttention = average >= 6.0 && average < 7.0;

    // 7. Buscar engajamento (uso do chatbot, streak, etc)
    const { data: profile } = await supabase
      .from('gamification_profiles')
      .select('xp_total, level, current_streak')
      .eq('user_id', studentId)
      .single();

    const engagementScore = profile
      ? Math.min(100, (profile.xp_total / 1000) * 100 + profile.current_streak * 5)
      : 0;

    return {
      success: true,
      studentId,
      classId,
      prediction: {
        nextGrade: parseFloat(prediction.toFixed(2)),
        trend: slope > 0.1 ? 'improving' : slope < -0.1 ? 'declining' : 'stable',
        trendValue: parseFloat(slope.toFixed(3)),
        approvalProbability: parseFloat((approvalProbability * 100).toFixed(1)),
      },
      current: {
        average: parseFloat(average.toFixed(2)),
        stdDev: parseFloat(stdDev.toFixed(2)),
        consistency: stdDev < 1.5 ? 'high' : stdDev < 2.5 ? 'medium' : 'low',
        totalGrades: n,
      },
      status: {
        isAtRisk,
        needsAttention,
        engagementScore: parseFloat(engagementScore.toFixed(1)),
      },
      recommendations: generateRecommendations({
        isAtRisk,
        needsAttention,
        average,
        slope,
        engagementScore,
      }),
    };
  } catch (error) {
    console.error('[AnalyticsML] Error predicting performance:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Clustering de Alunos por Comportamento
 * Agrupa alunos em clusters baseado em desempenho e engajamento
 */
export async function clusterStudents(classId) {
  try {
    // 1. Buscar todos os alunos da turma
    const { data: members, error: membersError } = await supabase
      .from('class_members')
      .select('user_id, profiles!inner(full_name)')
      .eq('class_id', classId)
      .eq('role', 'student');

    if (membersError) throw membersError;
    if (!members || members.length === 0) {
      return {
        success: false,
        error: 'NO_STUDENTS',
        message: 'Nenhum aluno encontrado na turma',
      };
    }

    // 2. Calcular features para cada aluno
    const studentsData = await Promise.all(
      members.map(async (member) => {
        // Notas
        const { data: submissions } = await supabase
          .from('submissions')
          .select(`
            grade,
            activities!inner(
              activity_class_assignments!inner(
                class_id
              )
            )
          `)
          .eq('student_id', member.user_id)
          .eq('activities.activity_class_assignments.class_id', classId)
          .not('grade', 'is', null);

        const grades = submissions?.map((s) => parseFloat(s.grade)) || [];
        const avgGrade = grades.length > 0
          ? grades.reduce((a, b) => a + b, 0) / grades.length
          : 0;

        // Taxa de entrega
        const { data: activities } = await supabase
          .from('activities')
          .select('id')
          .eq('class_id', classId);

        const submissionRate = activities?.length > 0
          ? (submissions?.length || 0) / activities.length
          : 0;

        // Gamificação
        const { data: profile } = await supabase
          .from('gamification_profiles')
          .select('xp_total, current_streak')
          .eq('user_id', member.user_id)
          .single();

        return {
          userId: member.user_id,
          name: member.profiles?.full_name || 'Unknown',
          features: {
            avgGrade,
            submissionRate,
            xp: profile?.xp_total || 0,
            streak: profile?.current_streak || 0,
          },
        };
      })
    );

    // 3. Clustering simples (K-means manual com K=4)
    const clusters = simpleKMeans(studentsData, 4);

    // 4. Nomear clusters baseado em características
    const namedClusters = clusters.map((cluster, index) => {
      const avgFeatures = {
        avgGrade: cluster.students.reduce((sum, s) => sum + s.features.avgGrade, 0) / cluster.students.length,
        submissionRate: cluster.students.reduce((sum, s) => sum + s.features.submissionRate, 0) / cluster.students.length,
        xp: cluster.students.reduce((sum, s) => sum + s.features.xp, 0) / cluster.students.length,
      };

      let name, description, priority;

      if (avgFeatures.avgGrade >= 8 && avgFeatures.submissionRate >= 0.8) {
        name = 'Excelentes';
        description = 'Alto desempenho e engajamento';
        priority = 'low';
      } else if (avgFeatures.avgGrade >= 6 && avgFeatures.submissionRate >= 0.6) {
        name = 'Regulares';
        description = 'Desempenho adequado, pode melhorar';
        priority = 'medium';
      } else if (avgFeatures.submissionRate < 0.4) {
        name = 'Desengajados';
        description = 'Baixa participação, precisa de atenção urgente';
        priority = 'critical';
      } else {
        name = 'Em Risco';
        description = 'Desempenho abaixo da média, precisa de suporte';
        priority = 'high';
      }

      return {
        id: index,
        name,
        description,
        priority,
        count: cluster.students.length,
        avgFeatures,
        students: cluster.students,
      };
    });

    return {
      success: true,
      classId,
      totalStudents: studentsData.length,
      clusters: namedClusters,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[AnalyticsML] Error clustering students:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Análise de Sentimento (simplificada)
 * Analisa feedback de alunos para detectar problemas
 */
export async function analyzeSentiment(classId) {
  try {
    // 1. Buscar feedbacks e comentários
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select(`
        id,
        feedback,
        student_id,
        activities!inner(
          title,
          activity_class_assignments!inner(
            class_id
          )
        )
      `)
      .eq('activities.activity_class_assignments.class_id', classId)
      .not('feedback', 'is', null);

    if (error) throw error;
    if (!submissions || submissions.length === 0) {
      return {
        success: false,
        error: 'NO_FEEDBACK',
        message: 'Nenhum feedback encontrado',
      };
    }

    // 2. Análise simples baseada em palavras-chave
    const positiveWords = ['bom', 'ótimo', 'excelente', 'adorei', 'parabéns', 'obrigado', 'legal', 'gostei', 'perfeito'];
    const negativeWords = ['ruim', 'difícil', 'não entendi', 'confuso', 'complicado', 'péssimo', 'horrível', 'errado'];
    const neutralWords = ['ok', 'normal', 'médio', 'razoável'];

    const sentiments = submissions.map((sub) => {
      const text = sub.feedback.toLowerCase();
      
      const positiveCount = positiveWords.filter((word) => text.includes(word)).length;
      const negativeCount = negativeWords.filter((word) => text.includes(word)).length;
      const neutralCount = neutralWords.filter((word) => text.includes(word)).length;

      let sentiment, score;
      if (positiveCount > negativeCount) {
        sentiment = 'positive';
        score = Math.min(1, 0.5 + positiveCount * 0.2);
      } else if (negativeCount > positiveCount) {
        sentiment = 'negative';
        score = Math.max(0, 0.5 - negativeCount * 0.2);
      } else {
        sentiment = 'neutral';
        score = 0.5;
      }

      return {
        submissionId: sub.id,
        userId: sub.user_id,
        activityTitle: sub.activities.title,
        sentiment,
        score,
        text: sub.feedback,
      };
    });

    // 3. Agregar estatísticas
    const positiveCount = sentiments.filter((s) => s.sentiment === 'positive').length;
    const negativeCount = sentiments.filter((s) => s.sentiment === 'negative').length;
    const neutralCount = sentiments.filter((s) => s.sentiment === 'neutral').length;

    const avgScore = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;

    return {
      success: true,
      classId,
      totalFeedbacks: sentiments.length,
      summary: {
        positive: positiveCount,
        negative: negativeCount,
        neutral: neutralCount,
        avgScore: parseFloat(avgScore.toFixed(2)),
        overallSentiment: avgScore > 0.6 ? 'positive' : avgScore < 0.4 ? 'negative' : 'neutral',
      },
      feedbacks: sentiments,
      alerts: sentiments
        .filter((s) => s.sentiment === 'negative')
        .map((s) => ({
          userId: s.userId,
          activityTitle: s.activityTitle,
          message: 'Feedback negativo detectado - verificar',
        })),
    };
  } catch (error) {
    console.error('[AnalyticsML] Error analyzing sentiment:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Recomendação de Conteúdo
 * Sugere materiais baseado em dificuldades do aluno
 */
export async function recommendContent(studentId, classId) {
  try {
    // 1. Identificar tópicos com dificuldade
    const { data: submissions } = await supabase
      .from('submissions')
      .select(`
        grade,
        activities!inner(
          id,
          title,
          activity_class_assignments!inner(
            class_id
          )
        )
      `)
      .eq('student_id', studentId)
      .eq('activities.activity_class_assignments.class_id', classId)
      .not('grade', 'is', null);

    if (!submissions || submissions.length === 0) {
      return {
        success: false,
        error: 'NO_DATA',
        message: 'Nenhuma submissão encontrada',
      };
    }

    // 2. Identificar atividades com notas baixas
    const weakAreas = submissions
      .filter((s) => parseFloat(s.grade) < 7.0)
      .map((s) => ({
        activityId: s.activities.id,
        title: s.activities.title,
        tags: s.activities.tags || [],
        grade: parseFloat(s.grade),
      }));

    if (weakAreas.length === 0) {
      return {
        success: true,
        message: 'Nenhuma área de dificuldade identificada',
        recommendations: [],
      };
    }

    // 3. Extrair tags/tópicos comuns
    const allTags = weakAreas.flatMap((a) => a.tags);
    const tagFrequency = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});

    const topTags = Object.entries(tagFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);

    // 4. Buscar materiais relacionados aos tópicos
    const { data: materials } = await supabase
      .from('class_materials')
      .select('*')
      .eq('class_id', classId)
      .overlaps('tags', topTags);

    // 5. Buscar fontes RAG relacionadas
    const { data: ragSources } = await supabase
      .from('rag_training_sources')
      .select('*')
      .eq('class_id', classId)
      .eq('is_active', true);

    return {
      success: true,
      studentId,
      classId,
      weakAreas: weakAreas.map((a) => ({
        title: a.title,
        grade: a.grade,
        tags: a.tags,
      })),
      topicsNeedingHelp: topTags,
      recommendations: {
        materials: materials || [],
        ragSources: ragSources || [],
        suggestedActions: [
          'Revisar materiais recomendados',
          'Usar o chatbot para tirar dúvidas',
          'Refazer atividades com nota baixa',
          'Pedir ajuda ao professor',
        ],
      },
    };
  } catch (error) {
    console.error('[AnalyticsML] Error recommending content:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * K-Means simplificado (para clustering)
 */
function simpleKMeans(data, k) {
  // 1. Normalizar features
  const features = data.map((d) => d.features);
  const normalized = normalizeFeatures(features);

  // 2. Inicializar centroids aleatórios
  let centroids = [];
  for (let i = 0; i < k; i++) {
    const randomIndex = Math.floor(Math.random() * normalized.length);
    centroids.push(normalized[randomIndex]);
  }

  // 3. Iterar (máximo 10 iterações)
  for (let iter = 0; iter < 10; iter++) {
    // Atribuir pontos aos clusters
    const clusters = Array(k).fill(null).map(() => []);

    normalized.forEach((point, index) => {
      const distances = centroids.map((c) => euclideanDistance(point, c));
      const closestCluster = distances.indexOf(Math.min(...distances));
      clusters[closestCluster].push(index);
    });

    // Recalcular centroids
    centroids = clusters.map((cluster) => {
      if (cluster.length === 0) return centroids[0]; // Evitar cluster vazio
      
      const sum = { avgGrade: 0, submissionRate: 0, xp: 0, streak: 0 };
      cluster.forEach((index) => {
        Object.keys(sum).forEach((key) => {
          sum[key] += normalized[index][key];
        });
      });
      
      Object.keys(sum).forEach((key) => {
        sum[key] /= cluster.length;
      });
      
      return sum;
    });
  }

  // 4. Retornar clusters finais
  const finalClusters = Array(k).fill(null).map(() => ({ students: [] }));
  normalized.forEach((point, index) => {
    const distances = centroids.map((c) => euclideanDistance(point, c));
    const closestCluster = distances.indexOf(Math.min(...distances));
    finalClusters[closestCluster].students.push(data[index]);
  });

  return finalClusters.filter((c) => c.students.length > 0);
}

/**
 * Normaliza features para mesma escala
 */
function normalizeFeatures(features) {
  const keys = ['avgGrade', 'submissionRate', 'xp', 'streak'];
  const mins = {}, maxs = {};

  // Calcular min/max de cada feature
  keys.forEach((key) => {
    const values = features.map((f) => f[key]);
    mins[key] = Math.min(...values);
    maxs[key] = Math.max(...values);
  });

  // Normalizar (0-1)
  return features.map((f) => {
    const normalized = {};
    keys.forEach((key) => {
      const range = maxs[key] - mins[key];
      normalized[key] = range > 0 ? (f[key] - mins[key]) / range : 0;
    });
    return normalized;
  });
}

/**
 * Distância euclidiana
 */
function euclideanDistance(a, b) {
  const keys = Object.keys(a);
  return Math.sqrt(
    keys.reduce((sum, key) => sum + Math.pow(a[key] - b[key], 2), 0)
  );
}

/**
 * Gera recomendações baseado no status do aluno
 */
function generateRecommendations(status) {
  const recommendations = [];

  if (status.isAtRisk) {
    recommendations.push({
      priority: 'high',
      title: 'Aluno em risco',
      message: 'Agendar reunião individual urgente',
    });
    recommendations.push({
      priority: 'high',
      title: 'Revisar conceitos básicos',
      message: 'Oferecer material de reforço',
    });
  }

  if (status.needsAttention) {
    recommendations.push({
      priority: 'medium',
      title: 'Monitorar progresso',
      message: 'Oferecer suporte adicional se necessário',
    });
  }

  if (status.slope < -0.2) {
    recommendations.push({
      priority: 'high',
      title: 'Desempenho em queda',
      message: 'Identificar causas e intervir rapidamente',
    });
  }

  if (status.engagementScore < 30) {
    recommendations.push({
      priority: 'medium',
      title: 'Baixo engajamento',
      message: 'Incentivar participação e uso do chatbot',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'low',
      title: 'Desempenho satisfatório',
      message: 'Continue acompanhando o progresso',
    });
  }

  return recommendations;
}

export default {
  predictStudentPerformance,
  clusterStudents,
  analyzeSentiment,
  recommendContent,
};
