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
    // 1. Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verificar usuário autenticado
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // 2. Extrair dados do request
    const { studentId, performanceData } = (await req.json()) as {
      studentId: string;
      performanceData: PerformanceData;
    };

    // Validar que o usuário está consultando seus próprios dados
    if (user.id !== studentId) {
      throw new Error('Forbidden: Cannot access other student data');
    }

    // 3. Verificar cache no Redis (opcional)
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // 4. Construir prompt para OpenAI
    const prompt = buildPrompt(performanceData);

    // 5. Chamar OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente educacional especializado em análise de desempenho acadêmico e recomendações de estudo personalizadas. Sempre responda em português brasileiro.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      console.error('OpenAI Error:', error);
      throw new Error('Failed to get recommendations from AI');
    }

    const aiResult = await openaiResponse.json();
    const content = aiResult.choices[0].message.content;
    const recommendations = JSON.parse(content);

    // 6. Processar e formatar recomendações
    const formattedRecommendations: Recommendation[] = formatRecommendations(
      recommendations,
      performanceData
    );

    // 7. Salvar log de recomendações (opcional)
    await supabaseClient.from('ai_recommendation_logs').insert({
      student_id: studentId,
      recommendations: formattedRecommendations,
      performance_snapshot: performanceData,
      created_at: new Date().toISOString(),
    });

    // 8. Retornar resposta
    return new Response(
      JSON.stringify({
        success: true,
        recommendations: formattedRecommendations,
        generatedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in ai-study-recommendations:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : 500,
      }
    );
  }
});

/**
 * Constrói prompt para OpenAI baseado nos dados de performance
 */
function buildPrompt(data: PerformanceData): string {
  const { avgGrade, totalActivities, recentGrades, classComparison } = data;

  // Calcular tendência
  const recentAvg =
    recentGrades.length > 0
      ? recentGrades.reduce((sum, g) => sum + g.grade, 0) / recentGrades.length
      : avgGrade;

  const trend = recentAvg > avgGrade ? 'melhorando' : recentAvg < avgGrade ? 'piorando' : 'estável';

  // Identificar disciplinas problemáticas
  const weakSubjects = classComparison
    .filter((c) => c.studentAvg < c.classAvg)
    .map((c) => c.subject);

  // Identificar disciplinas fortes
  const strongSubjects = classComparison
    .filter((c) => c.studentAvg > c.classAvg)
    .map((c) => c.subject);

  return `
Analise o desempenho acadêmico do estudante e gere 4-6 recomendações PERSONALIZADAS de estudo.

**Dados do Estudante:**
- Média Geral: ${avgGrade.toFixed(1)} de 10
- Total de Atividades: ${totalActivities}
- Tendência: ${trend}
- Média Recente: ${recentAvg.toFixed(1)}

**Disciplinas onde está ABAIXO da média da turma:**
${weakSubjects.length > 0 ? weakSubjects.join(', ') : 'Nenhuma'}

**Disciplinas onde está ACIMA da média da turma:**
${strongSubjects.length > 0 ? strongSubjects.join(', ') : 'Nenhuma'}

**Comparação Detalhada:**
${classComparison.map((c) => `- ${c.subject}: Aluno ${c.studentAvg} vs Turma ${c.classAvg}`).join('\n')}

Gere recomendações práticas e acionáveis em JSON com a seguinte estrutura:
{
  "recommendations": [
    {
      "title": "Título curto da recomendação",
      "description": "Descrição detalhada e prática (2-3 frases)",
      "reason": "Por que esta recomendação é importante",
      "priority": "high" | "medium" | "low"
    }
  ]
}

IMPORTANTE:
- Seja específico sobre disciplinas que precisa melhorar
- Sugira técnicas de estudo concretas
- Considere a tendência de performance
- Elogie pontos fortes
- Seja motivacional mas realista
- Máximo 6 recomendações
`;
}

/**
 * Formata e enriquece as recomendações da IA
 */
function formatRecommendations(
  aiRecommendations: any,
  performanceData: PerformanceData
): Recommendation[] {
  const recommendations = aiRecommendations.recommendations || [];

  // Adicionar recomendações padrão se IA retornar poucas
  if (recommendations.length < 3) {
    if (performanceData.avgGrade < 6) {
      recommendations.push({
        title: 'Agende uma sessão de reforço',
        description:
          'Considere agendar sessões de reforço com o professor ou um monitor para revisar conceitos fundamentais.',
        reason: 'Sua média está abaixo de 6.0',
        priority: 'high',
      });
    }

    recommendations.push({
      title: 'Crie um cronograma de estudos',
      description:
        'Organize seu tempo de estudo dedicando períodos específicos para cada disciplina, priorizando as mais desafiadoras.',
      reason: 'Organização é fundamental para melhorar o desempenho',
      priority: 'medium',
    });
  }

  // Ordenar por prioridade
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return recommendations.sort(
    (a: Recommendation, b: Recommendation) =>
      priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium']
  );
}
