import { supabase } from './supabaseClient';

/**
 * Serviço para verificação de antiplágio usando WinstonAI
 */

/**
 * Verificar plágio de uma submissão
 */
export const checkPlagiarism = async (submissionId, text) => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/check-plagiarism`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submissionId,
        text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao verificar plágio');
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao verificar plágio:', error);
    return { data: null, error };
  }
};

/**
 * Buscar relatório de plágio de uma submissão
 */
export const getPlagiarismReport = async (submissionId) => {
  try {
    const { data, error } = await supabase
      .from('plagiarism_checks')
      .select('*')
      .eq('submission_id', submissionId)
      .order('checked_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao buscar relatório:', error);
    return { data: null, error };
  }
};

/**
 * Comparar similaridade entre duas submissões
 */
export const compareSubmissions = async (text1, text2) => {
  try {
    // Algoritmo simples de similaridade
    // Em produção, usar Levenshtein ou similar
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    const similarity = (intersection.size / union.size) * 100;
    
    return {
      data: {
        similarity: Math.round(similarity),
        commonWords: intersection.size,
        totalWords: union.size,
      },
      error: null
    };
  } catch (error) {
    console.error('Erro ao comparar submissões:', error);
    return { data: null, error };
  }
};

export default {
  checkPlagiarism,
  getPlagiarismReport,
  compareSubmissions,
};
