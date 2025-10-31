// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({
        error: "OPENAI_API_KEY not set"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") || ""
        }
      }
    });
    if (req.method !== "POST") {
      return new Response(JSON.stringify({
        error: "Method not allowed"
      }), {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const body = await req.json();
    const topic = (body?.topic || "Conceitos básicos").toString();
    const grade = (body?.grade || "fundamental").toString();
    const numQuestions = Math.min(parseInt(body?.numQuestions || 5), 10);
    const difficulty = (body?.difficulty || "médio").toString();
    const save = Boolean(body?.save);
    const title = (body?.title || `Quiz de ${topic}`).toString();
    const isPublic = Boolean(body?.isPublic);
    const prompt = `Gere um quiz no formato JSON com ${numQuestions} questões sobre "${topic}" para o nível ${grade} (dificuldade ${difficulty}). Cada questão deve ter: id, enunciado, alternativas (A,B,C,D), correta (letra), explicacao. Responda APENAS com JSON.`;
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Você é um gerador de quizzes educacionais."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1200
      })
    });
    if (!resp.ok) {
      const err = await resp.text();
      return new Response(JSON.stringify({
        error: "openai_error",
        detail: err
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    let quiz;
    try {
      quiz = JSON.parse(content);
    } catch  {
      quiz = {
        questions: []
      };
    }
    // Persistir no banco de questões quando solicitado e quando houver usuário autenticado
    let savedQuizId = null;
    if (save) {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (!userId) throw new Error('Unauthorized: missing user');
        // Inserir quiz
        const { data: quizRow, error: quizErr } = await supabase.from('quizzes').insert({
          title,
          topic,
          grade,
          difficulty,
          is_public: isPublic,
          created_by: userId
        }).select('id').single();
        if (quizErr) throw quizErr;
        savedQuizId = quizRow.id;
        // Inserir questões
        const questions = Array.isArray(quiz?.questions) ? quiz.questions : [];
        if (questions.length > 0) {
          const rows = questions.map((q, idx)=>({
              quiz_id: savedQuizId,
              question: q,
              position: idx + 1
            }));
          const { error: qErr } = await supabase.from('quiz_questions').insert(rows);
          if (qErr) throw qErr;
        }
      } catch (persistErr) {
        // Retorna 200 com warning para não quebrar fluxo de geração
        return new Response(JSON.stringify({
          topic,
          grade,
          difficulty,
          quiz,
          saved: false,
          error: String(persistErr)
        }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          },
          status: 200
        });
      }
    }
    return new Response(JSON.stringify({
      topic,
      grade,
      difficulty,
      quiz,
      saved: !!savedQuizId,
      quizId: savedQuizId
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: "internal_error",
      detail: String(e)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
