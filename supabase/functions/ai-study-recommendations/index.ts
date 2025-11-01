// @deno-types="https://deno.land/std@0.177.0/http/server.ts"
/// <reference types="https://deno.land/std@0.177.0/http/server.ts" />

/**
 * 🤖 AI Study Recommendations Edge Function
 * Gera recomendações personalizadas de estudo usando OpenAI
 * 
 * @endpoint POST /api/ai-study-recommendations
 * @auth Bearer token required
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PerformanceData {
  avgGrade: number;
  totalActivities: number;
  recentGrades: Array<{
    grade: number;
    maxScore: number;
    subject?: string;
    activityTitle?: string;
    questions?: Array<{
      question: string;
      studentAnswer: string;
      correctAnswer?: string;
      isCorrect: boolean;
    }>;
  }>;
  classComparison: Array<{
    subject: string;
    studentAvg: number;
    classAvg: number;
  }>;
}

interface Recommendation {
  title: string;
  description: string;
  reason: string;
  priority?: 'high' | 'medium' | 'low';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verificar autenticação básica
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
          message: 'Token de autenticação ausente'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Auth header presente');

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // 2. Extrair dados do request
    const body = await req.json();
    console.log('Body recebido:', JSON.stringify(body).substring(0, 100));
    
    const { studentId, performanceData } = body as {
      studentId: string;
      performanceData: PerformanceData;
    };

    if (!studentId || !performanceData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Bad Request',
          message: 'studentId e performanceData são obrigatórios'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('StudentId:', studentId);

    // 2.5. Verificar limite diário (3 recomendações/dia)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count, error: countError } = await supabaseClient
      .from('ai_recommendations_usage')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .gte('generated_at', today.toISOString());

    if (countError) {
      console.warn('Erro ao verificar limite:', countError);
    } else if (count !== null && count >= 3) {
      console.log('Limite diário atingido:', count);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Daily limit reached',
          message: 'Você já gerou 3 recomendações hoje. Limite diário atingido. Tente novamente amanhã!',
          usageToday: count,
          limitReset: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
        }),
        {
          status: 429, // Too Many Requests
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Uso hoje:', count, '/ 3');

    // Normalizar dados (garantir que números são números E preservar questões)
    const normalizedData: PerformanceData = {
      avgGrade: Number(performanceData.avgGrade) || 0,
      totalActivities: Number(performanceData.totalActivities) || 0,
      recentGrades: (performanceData.recentGrades || []).map(g => ({
        grade: Number(g.grade) || 0,
        maxScore: Number(g.maxScore) || 100,
        subject: g.subject,
        activityTitle: g.activityTitle,
        questions: g.questions // ⚠️ PRESERVAR QUESTÕES!
      })),
      classComparison: (performanceData.classComparison || []).map(c => ({
        subject: c.subject,
        studentAvg: Number(c.studentAvg) || 0,
        classAvg: Number(c.classAvg) || 0
      }))
    };

    console.log('Dados normalizados:', { avgGrade: normalizedData.avgGrade, totalActivities: normalizedData.totalActivities });
    console.log('Total de recentGrades:', normalizedData.recentGrades.length);
    console.log('Questões por grade:', normalizedData.recentGrades.map(g => ({
      title: g.activityTitle || g.subject,
      questionsCount: g.questions?.length || 0
    })));

    // 3. Verificar OpenAI API key
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('VITE_OPENAI_API_KEY');
    console.log('OpenAI key presente:', !!OPENAI_API_KEY);
    
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Configuration error',
          message: 'OpenAI API key não configurada. Configure OPENAI_API_KEY nas secrets.'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Construir prompt para OpenAI
    // Calcular notas como percentuais e incluir detalhes das questões se disponíveis
    const recentGradesText = normalizedData.recentGrades.map((g, idx) => {
      const percentage = g.maxScore > 0 ? (g.grade / g.maxScore * 100).toFixed(1) : 0;
      let text = `  ${idx + 1}. ${g.activityTitle || g.subject || 'Atividade'}: ${g.grade}/${g.maxScore} = ${percentage}%`;
      
      // Se tem questões detalhadas, incluir análise
      if (g.questions && g.questions.length > 0) {
        const errors = g.questions.filter(q => !q.isCorrect);
        if (errors.length > 0) {
          text += `\n     ❌ Erros (${errors.length}/${g.questions.length} questões):`;
          errors.slice(0, 3).forEach((q, i) => { // Limitar a 3 erros por atividade
            text += `\n        • "${q.question.substring(0, 100)}..."`;
            text += `\n          Resposta do aluno: "${q.studentAnswer.substring(0, 80)}..."`;
            if (q.correctAnswer) {
              text += `\n          Resposta correta: "${q.correctAnswer.substring(0, 80)}..."`;
            }
          });
        }
      }
      
      return text;
    }).join('\n\n');

    const avgPercentage = normalizedData.avgGrade.toFixed(1);

    const classComparisonText = normalizedData.classComparison.map(c => {
      const studentPct = c.studentAvg.toFixed(1);
      const classPct = c.classAvg.toFixed(1);
      const diff = (c.studentAvg - c.classAvg).toFixed(1);
      const status = c.studentAvg >= c.classAvg ? '✓ acima' : '✗ abaixo';
      return `  - ${c.subject}: Aluno ${studentPct}% vs Turma ${classPct}% (${diff > 0 ? '+' : ''}${diff}%) ${status}`;
    }).join('\n');

    const prompt = `Você é um assistente educacional especializado. Analise o desempenho do aluno e forneça 3-5 recomendações ESPECÍFICAS e PRÁTICAS.

📊 DESEMPENHO DO ALUNO:
- Média geral: ${avgPercentage}% (escala 0-100%)
- Total de atividades concluídas: ${normalizedData.totalActivities}

📝 NOTAS RECENTES (com escala real):
${recentGradesText || '  Nenhuma nota recente'}

📈 COMPARAÇÃO COM A TURMA:
${classComparisonText || '  Sem dados de comparação'}

⚠️ IMPORTANTE:
- As notas estão em PERCENTUAL (0-100%)
- Se a nota é 10/100 = 10%, isso é RUIM, não bom!
- Se a nota é 90/100 = 90%, isso é EXCELENTE
- Compare SEMPRE com a turma para identificar pontos fracos

🎯 SUAS RECOMENDAÇÕES DEVEM:
1. Identificar matérias onde o aluno está ABAIXO da média da turma
2. Ser ESPECÍFICAS (não genéricas como "estude mais")
3. Incluir TÉCNICAS práticas de estudo
4. Considerar o PERCENTUAL real de acerto
5. Priorizar matérias com pior desempenho
6. Se houver detalhes de questões erradas, mencionar os CONCEITOS específicos que o aluno precisa revisar
7. Dar exemplos concretos de como melhorar baseado nos erros

Retorne APENAS um JSON válido no formato:
{
  "recommendations": [
    {
      "title": "Título específico (ex: Reforço urgente em Matemática)",
      "description": "Ação concreta e prática (2-3 frases)",
      "reason": "Motivo baseado nos DADOS REAIS (inclua percentuais)",
      "priority": "high|medium|low"
    }
  ]
}`;

    console.log('Prompt construído, tamanho:', prompt.length);

    // 5. Chamar OpenAI API
    console.log('Chamando OpenAI...');
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente educacional. Responda APENAS com JSON válido.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    console.log('OpenAI status:', openaiResponse.status);

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI Error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OpenAI API error',
          message: 'Erro ao processar com IA: ' + error.substring(0, 100)
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const aiResult = await openaiResponse.json();
    console.log('OpenAI respondeu');
    
    const content = aiResult.choices[0].message.content;
    const parsed = JSON.parse(content);
    const recommendations = parsed.recommendations || [];

    // 6. Formatar recomendações
    const formattedRecommendations: Recommendation[] = recommendations.map((r: any) => ({
      title: r.title || 'Recomendação',
      description: r.description || '',
      reason: r.reason || '',
      priority: r.priority || 'medium'
    }));

    console.log('Recomendações formatadas:', formattedRecommendations.length);

    // 7. Salvar uso para tracking (ignora erros)
    try {
      await supabaseClient
        .from('ai_recommendations_usage')
        .insert({
          student_id: studentId,
          generated_at: new Date().toISOString(),
          recommendations: formattedRecommendations,
          performance_snapshot: normalizedData,
          tokens_used: aiResult.usage?.total_tokens || 0
        });
      console.log('Uso salvo com sucesso');
    } catch (saveError) {
      console.warn('Erro ao salvar uso (não crítico):', saveError);
    }

    // 8. Retornar resposta
    return new Response(
      JSON.stringify({
        success: true,
        recommendations: formattedRecommendations,
        generatedAt: new Date().toISOString(),
        usageToday: (count || 0) + 1,
        dailyLimit: 3
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('ERRO COMPLETO:', error);
    console.error('Stack:', error.stack);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        details: error.stack?.substring(0, 200)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
