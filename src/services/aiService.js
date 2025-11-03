import { logger } from '@/shared/utils/logger';
// AI service using ChatGPT/OpenAI integration
import { supabase } from '@/lib/supabaseClient';

/**
 * Ask the class-contextual AI assistant a question using ChatGPT.
 */
export async function askClassAI({ classId, question }) {
  try {
    // Use ChatGPT Edge Function
    const { data, error } = await supabase.functions.invoke('chatgpt-assistant', {
      body: { classId, question },
    });
    
    if (error) {
      logger.error('AI Service Error:', error)
      return { 
        answer: 'Desculpe, o assistente IA está temporariamente indisponível. Tente novamente em alguns minutos.',
        error: true 
      };
    }
    
    return data;
  } catch (error) {
    logger.error('AI Service Error:', error)
    return { 
      answer: 'Desculpe, o assistente IA está temporariamente indisponível. Tente novamente em alguns minutos.',
      error: true 
    };
  }
}
