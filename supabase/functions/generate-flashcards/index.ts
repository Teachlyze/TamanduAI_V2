// Edge Function: Generate Flashcards with AI
// Uses OpenAI GPT-4o-mini to automatically generate flashcards from content

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateRequest {
  content: string
  deck_id?: string
  card_count?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  card_types?: string[] // ['basic', 'cloze', 'multiple_choice']
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Parse request
    const { 
      content, 
      deck_id, 
      card_count = 10,
      difficulty = 'medium',
      card_types = ['basic', 'cloze', 'multiple_choice']
    }: GenerateRequest = await req.json()

    if (!content || content.length < 50) {
      throw new Error('Content must be at least 50 characters')
    }

    // Call OpenAI API
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const systemPrompt = `Você é um assistente especializado em criar flashcards educativos para memorização eficiente.

Regras:
1. Crie flashcards claros e objetivos
2. Uma pergunta/conceito por card
3. Use linguagem simples
4. Varie os tipos de cards conforme solicitado
5. Retorne APENAS um array JSON válido

Tipos de cards:
- basic: Pergunta → Resposta
- cloze: Texto com lacuna {{c1::resposta}}
- multiple_choice: Pergunta + 4 opções (1 correta)

Formato de retorno (JSON):
[
  {
    "type": "basic",
    "front": "Pergunta clara",
    "back": "Resposta objetiva",
    "tags": ["tag1", "tag2"]
  },
  {
    "type": "cloze",
    "front": "A capital do Brasil é {{c1::Brasília}}",
    "back": "Brasília",
    "tags": ["geografia"]
  },
  {
    "type": "multiple_choice",
    "front": "Qual é a capital da França?",
    "back": "Paris",
    "options": ["Londres", "Paris", "Berlim", "Madrid"],
    "correct_index": 1,
    "tags": ["geografia"]
  }
]`

    const userPrompt = `Crie ${card_count} flashcards do seguinte conteúdo (dificuldade: ${difficulty}):

${content}

Tipos permitidos: ${card_types.join(', ')}

Retorne APENAS o array JSON, sem explicações.`

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text()
      console.error('OpenAI API error:', error)
      throw new Error(`OpenAI API error: ${openaiResponse.status}`)
    }

    const openaiData = await openaiResponse.json()
    const aiResponse = openaiData.choices[0].message.content

    // Parse AI response
    let cards
    try {
      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        cards = JSON.parse(jsonMatch[0])
      } else {
        cards = JSON.parse(aiResponse)
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse)
      throw new Error('Failed to parse AI response as JSON')
    }

    // Validate and sanitize cards
    const validatedCards = cards.map((card: any) => {
      // Validate basic structure
      if (!card.front || !card.back) {
        throw new Error('Invalid card structure: missing front or back')
      }

      // Prepare type_data based on card type
      let type_data = null
      if (card.type === 'multiple_choice') {
        type_data = {
          options: card.options || [],
          correct_index: card.correct_index || 0,
        }
      } else if (card.type === 'cloze') {
        // Extract cloze deletions
        const clozeMatches = card.front.match(/\{\{c\d+::(.*?)\}\}/g) || []
        type_data = {
          cloze_deletions: clozeMatches.map((match: string, i: number) => ({
            index: i,
            text: match.replace(/\{\{c\d+::(.*?)\}\}/, '$1'),
          })),
        }
      }

      return {
        card_type: card.type || 'basic',
        front: card.front.trim(),
        back: card.back.trim(),
        tags: Array.isArray(card.tags) ? card.tags : [],
        type_data,
      }
    })

    // If deck_id provided, save cards to database
    if (deck_id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Get user ID from auth token
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: userError } = await supabase.auth.getUser(token)
      
      if (userError || !user) {
        throw new Error('Invalid authentication token')
      }

      // Prepare cards for insertion
      const cardsToInsert = validatedCards.map((card: any) => ({
        ...card,
        deck_id,
        user_id: user.id,
      }))

      // Insert cards
      const { data: insertedCards, error: insertError } = await supabase
        .from('cards')
        .insert(cardsToInsert)
        .select()

      if (insertError) {
        console.error('Database insert error:', insertError)
        throw new Error(`Failed to save cards: ${insertError.message}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          cards: insertedCards,
          count: insertedCards.length,
          saved_to_deck: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Return cards without saving
    return new Response(
      JSON.stringify({
        success: true,
        cards: validatedCards,
        count: validatedCards.length,
        saved_to_deck: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in generate-flashcards function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
