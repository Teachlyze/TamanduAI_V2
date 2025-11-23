/**
 * 💡 IDEAS EDGE FUNCTIONS
 * 
 * Wrappers para Edge Functions de ideias públicas (sem login)
 */

import { supabase } from '../supabaseClient';
import { logger } from '@/shared/utils/logger';

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Gera ou recupera visitor_id do localStorage
 */
export function getOrCreateVisitorId() {
  const STORAGE_KEY = 'tamanduai_visitor_id';
  
  let visitorId = localStorage.getItem(STORAGE_KEY);
  
  if (!visitorId) {
    // Gerar UUID v4 simples
    visitorId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, visitorId);
  }
  
  return visitorId;
}

/**
 * Listar ideias com cache
 * @param {Object} options - Opções de filtro e ordenação
 * @param {string} options.status - 'todos' | 'em-analise' | 'em-desenvolvimento' | 'lancado'
 * @param {string} options.sort - 'votos' | 'recentes'
 * @param {number} options.page - Página (default: 1)
 * @param {number} options.limit - Itens por página (default: 6)
 * @returns {Promise<Object>} { ideas: Array, pagination: Object }
 */
export async function listIdeas({ status = 'todos', sort = 'votos', page = 1, limit = 6 } = {}) {
  try {
    const params = new URLSearchParams({ 
      status, 
      sort,
      page: page.toString(),
      limit: limit.toString()
    });
    
    const response = await fetch(`${EDGE_FUNCTION_URL}/ideas-public?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao buscar ideias');
    }
    
    const data = await response.json();
    return data; // { ideas: [], pagination: { page, limit, total, totalPages, hasNext, hasPrev } }
    
  } catch (error) {
    logger.error('Error listing ideas:', error);
    throw error;
  }
}

/**
 * Criar nova ideia
 * @param {Object} idea - Dados da ideia
 * @param {string} idea.title - Título (obrigatório, 3-200 chars)
 * @param {string} idea.problem - Descrição do problema (max 1000 chars)
 * @param {string} idea.solution - Descrição da solução (max 1000 chars)
 * @param {string} idea.segment - 'fundamental-1' | 'fundamental-2' | 'medio' | 'tecnico' | 'superior'
 * @param {string} idea.identification - Identificação do autor (max 100 chars)
 * @returns {Promise<Object>} Ideia criada
 */
export async function createIdea(idea) {
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}/ideas-public`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify(idea),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao criar ideia');
    }
    
    const data = await response.json();
    return data.idea;
    
  } catch (error) {
    logger.error('Error creating idea:', error);
    throw error;
  }
}

/**
 * Votar ou desvotar em uma ideia
 * @param {string} ideaId - ID da ideia
 * @returns {Promise<Object>} Resultado do voto { action: 'vote' | 'unvote', votes_count, has_voted }
 */
export async function toggleIdeaVote(ideaId) {
  try {
    const visitorId = getOrCreateVisitorId();
    
    const response = await fetch(`${EDGE_FUNCTION_URL}/ideas-public/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        idea_id: ideaId,
        visitor_id: visitorId,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao processar voto');
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    logger.error('Error toggling vote:', error);
    throw error;
  }
}

/**
 * Buscar IDs das ideias que o usuário votou
 * @returns {Promise<Array<string>>} Array de IDs das ideias votadas
 */
export async function getUserVotedIdeas() {
  try {
    const visitorId = getOrCreateVisitorId();
    const params = new URLSearchParams({ visitor_id: visitorId });
    
    const response = await fetch(`${EDGE_FUNCTION_URL}/ideas-public/votes?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao buscar votos');
    }
    
    const data = await response.json();
    return data.voted_ids || [];
    
  } catch (error) {
    logger.error('Error getting user votes:', error);
    // Em caso de erro, retornar array vazio para não quebrar a UI
    return [];
  }
}

/**
 * Hook React para gerenciar ideias
 * @returns {Object} { ideas, loading, error, refetch, createIdea, vote }
 */
export function useIdeas({ status = 'todos', sort = 'votos' } = {}) {
  const [ideas, setIdeas] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [votedIds, setVotedIds] = React.useState(new Set());
  
  const fetchIdeas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [ideasData, votedIdsData] = await Promise.all([
        listIdeas({ status, sort }),
        getUserVotedIdeas(),
      ]);
      
      setIdeas(ideasData);
      setVotedIds(new Set(votedIdsData));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateIdea = async (ideaData) => {
    try {
      const newIdea = await createIdea(ideaData);
      setIdeas(prev => [newIdea, ...prev]);
      return newIdea;
    } catch (err) {
      throw err;
    }
  };
  
  const handleVote = async (ideaId) => {
    try {
      const result = await toggleIdeaVote(ideaId);
      
      // Atualizar localmente
      setIdeas(prev => prev.map(idea => 
        idea.id === ideaId 
          ? { ...idea, votes_count: result.votes_count }
          : idea
      ));
      
      // Atualizar set de votos
      setVotedIds(prev => {
        const newSet = new Set(prev);
        if (result.has_voted) {
          newSet.add(ideaId);
        } else {
          newSet.delete(ideaId);
        }
        return newSet;
      });
      
      return result;
    } catch (err) {
      throw err;
    }
  };
  
  React.useEffect(() => {
    fetchIdeas();
  }, [status, sort]);
  
  return {
    ideas,
    loading,
    error,
    votedIds,
    refetch: fetchIdeas,
    createIdea: handleCreateIdea,
    vote: handleVote,
  };
}
