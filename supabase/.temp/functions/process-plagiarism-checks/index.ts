// Edge Function: Process Plagiarism Check Queue
// Monitora submissions_pending_plagiarism e processa com Winston AI

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PendingSubmission {
  submission_id: string
  activity_id: string
  student_id: string
  submitted_at: string
  plagiarism_check_status: string
  activity_title: string
  plagiarism_enabled: boolean
  class_id: string
  class_name: string
  data: any
}

interface WinstonAIResponse {
  score: number
  plagiarism_score?: number
  unique_content?: number
  rephrased_content?: number
  exact_matches?: number
  sources?: any[]
  details?: any
}

// Extrair texto da submissão
function extractTextFromSubmission(data: any): string {
  if (!data) return ''

  let text = ''

  // Se for JSON com respostas
  if (typeof data === 'object') {
    if (data.answers) {
      // Atividade objetiva/subjetiva
      for (const answer of Object.values(data.answers)) {
        if (typeof answer === 'string') {
          text += answer + ' '
        } else if (typeof answer === 'object' && answer !== null) {
          text += JSON.stringify(answer) + ' '
        }
      }
    } else if (data.content) {
      // Atividade dissertativa
      text += data.content
    } else {
      // Tentar extrair qualquer texto
      text = JSON.stringify(data)
    }
  } else if (typeof data === 'string') {
    text = data
  }

  return text.trim()
}

// Chamar Winston AI API
async function checkPlagiarismWithWinston(
  text: string,
  winstonKey: string
): Promise<WinstonAIResponse> {
  try {
    const response = await fetch('https://api.gowinston.ai/v1/plagiarism', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${winstonKey}`,
      },
      body: JSON.stringify({
        text: text,
        language: 'pt',
        sentences: true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Winston AI error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error calling Winston AI:', error)
    throw error
  }
}

// Calcular severidade baseado no score
function calculateSeverity(score: number): string {
  if (score >= 75) return 'critical'
  if (score >= 50) return 'high'
  if (score >= 35) return 'medium'
  if (score >= 20) return 'low'
  return 'none'
}

// Notificar professor
async function notifyTeacher(
  supabase: any,
  submission: PendingSubmission,
  severity: string,
  score: number
) {
  if (severity === 'none' || severity === 'low') {
    // Não notificar para severidade baixa
    return
  }

  // Buscar professor da turma
  const { data: classData } = await supabase
    .from('classes')
    .select('created_by')
    .eq('id', submission.class_id)
    .single()

  if (!classData) return

  // Criar notificação
  await supabase
    .from('notifications')
    .insert({
      user_id: classData.created_by,
      type: 'plagiarism_detected',
      title: `Plágio detectado - ${severity.toUpperCase()}`,
      message: `Plágio de ${Math.round(score)}% detectado na atividade "${submission.activity_title}"`,
      data: {
        submission_id: submission.submission_id,
        activity_id: submission.activity_id,
        class_id: submission.class_id,
        severity: severity,
        score: score,
      },
      priority: severity === 'critical' || severity === 'high' ? 'high' : 'medium',
    })
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const winstonKey = Deno.env.get('VITE_WINSTON_API_KEY')
    if (!winstonKey) {
      throw new Error('Winston AI API key not configured')
    }

    // Buscar submissions pendentes via VIEW
    const { data: pendingSubmissions, error: fetchError } = await supabaseClient
      .from('submissions_pending_plagiarism')
      .select('*')
      .limit(10) // Processar 10 por vez

    if (fetchError) {
      console.error('Error fetching pending submissions:', fetchError)
      throw fetchError
    }

    if (!pendingSubmissions || pendingSubmissions.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No pending submissions to process',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = []

    for (const submission of pendingSubmissions as PendingSubmission[]) {
      try {
        console.log(`Processing submission ${submission.submission_id}...`)

        // Atualizar status para 'in_progress'
        await supabaseClient
          .from('submissions')
          .update({ plagiarism_check_status: 'in_progress' })
          .eq('id', submission.submission_id)

        // Buscar dados completos da submissão
        const { data: fullSubmission, error: subError } = await supabaseClient
          .from('submissions')
          .select('data, attachments')
          .eq('id', submission.submission_id)
          .single()

        if (subError) throw subError

        // Extrair texto
        const text = extractTextFromSubmission(fullSubmission.data)

        if (!text || text.length < 50) {
          console.log(`Skipping submission ${submission.submission_id} - insufficient text`)
          
          await supabaseClient
            .from('submissions')
            .update({ 
              plagiarism_check_status: 'not_required',
              plagiarism_checked_at: new Date().toISOString()
            })
            .eq('id', submission.submission_id)

          results.push({
            submission_id: submission.submission_id,
            status: 'skipped',
            reason: 'insufficient_text',
          })
          continue
        }

        // Chamar Winston AI
        console.log(`Checking plagiarism for submission ${submission.submission_id}...`)
        const winstonResult = await checkPlagiarismWithWinston(text, winstonKey)

        // Calcular severidade
        const plagScore = winstonResult.plagiarism_score || winstonResult.score || 0
        const severity = calculateSeverity(plagScore)

        // Salvar resultado em plagiarism_checks_v2
        const { error: insertError } = await supabaseClient
          .from('plagiarism_checks_v2')
          .insert({
            submission_id: submission.submission_id,
            activity_id: submission.activity_id,
            class_id: submission.class_id,
            plag_percent: plagScore,
            unique_percent: winstonResult.unique_content || (100 - plagScore),
            rephrased_percent: winstonResult.rephrased_content || 0,
            exact_matched_percent: winstonResult.exact_matches || 0,
            severity: severity,
            sources_detected: winstonResult.sources || [],
            winston_api_response: winstonResult,
            status: 'completed',
            created_at: new Date().toISOString(),
          })

        if (insertError) throw insertError

        // Atualizar submission
        await supabaseClient
          .from('submissions')
          .update({
            plagiarism_check_status: 'completed',
            plagiarism_checked_at: new Date().toISOString(),
          })
          .eq('id', submission.submission_id)

        // Notificar professor se necessário
        await notifyTeacher(supabaseClient, submission, severity, plagScore)

        results.push({
          submission_id: submission.submission_id,
          status: 'completed',
          plagiarism_score: plagScore,
          severity: severity,
        })

        console.log(`✓ Successfully processed submission ${submission.submission_id} - Score: ${plagScore}%`)
      } catch (error) {
        console.error(`Error processing submission ${submission.submission_id}:`, error)

        // Atualizar status para 'failed'
        await supabaseClient
          .from('submissions')
          .update({
            plagiarism_check_status: 'failed',
            plagiarism_checked_at: new Date().toISOString(),
          })
          .eq('id', submission.submission_id)

        // Salvar erro em plagiarism_checks_v2
        await supabaseClient
          .from('plagiarism_checks_v2')
          .insert({
            submission_id: submission.submission_id,
            activity_id: submission.activity_id,
            class_id: submission.class_id,
            error: error.message,
            status: 'failed',
            created_at: new Date().toISOString(),
          })

        results.push({
          submission_id: submission.submission_id,
          status: 'failed',
          error: error.message,
        })
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Plagiarism check processing completed',
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Fatal error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
