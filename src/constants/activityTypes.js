/**
 * Constantes de tipos de atividades
 * Mantém consistência entre frontend e banco de dados
 */

// Tipos usados no seletor visual (frontend)
export const FRONTEND_ACTIVITY_TYPES = {
  OPEN: 'open',       // Atividades abertas (dissertativas)
  CLOSED: 'closed',   // Atividades fechadas (objetivas)
  MIXED: 'mixed'      // Atividades mistas (híbridas)
};

// Tipos aceitos pelo banco de dados (constraint)
export const DATABASE_ACTIVITY_TYPES = {
  ASSIGNMENT: 'assignment',  // Trabalhos/Tarefas
  QUIZ: 'quiz',              // Quiz/Teste
  ESSAY: 'essay',            // Redação
  PROJECT: 'project'         // Projeto
};

/**
 * Mapeamento de tipos do frontend para o banco
 * CRÍTICO: Este mapeamento garante que o constraint do banco seja respeitado
 */
export const ACTIVITY_TYPE_MAPPING = {
  [FRONTEND_ACTIVITY_TYPES.OPEN]: DATABASE_ACTIVITY_TYPES.ASSIGNMENT,     // open → assignment
  [FRONTEND_ACTIVITY_TYPES.CLOSED]: DATABASE_ACTIVITY_TYPES.QUIZ,         // closed → quiz
  [FRONTEND_ACTIVITY_TYPES.MIXED]: DATABASE_ACTIVITY_TYPES.ASSIGNMENT     // mixed → assignment
};

/**
 * Mapeamento reverso: banco → frontend
 * Usado ao carregar atividades existentes para edição
 */
export const REVERSE_ACTIVITY_TYPE_MAPPING = {
  [DATABASE_ACTIVITY_TYPES.ASSIGNMENT]: FRONTEND_ACTIVITY_TYPES.OPEN,     // assignment → open
  [DATABASE_ACTIVITY_TYPES.QUIZ]: FRONTEND_ACTIVITY_TYPES.CLOSED,         // quiz → closed
  [DATABASE_ACTIVITY_TYPES.ESSAY]: FRONTEND_ACTIVITY_TYPES.OPEN,          // essay → open (fallback)
  [DATABASE_ACTIVITY_TYPES.PROJECT]: FRONTEND_ACTIVITY_TYPES.MIXED        // project → mixed
};

/**
 * Converte tipo do frontend para tipo do banco
 * @param {string} frontendType - Tipo usado no seletor ('open', 'closed', 'mixed')
 * @returns {string} Tipo para salvar no banco ('assignment', 'quiz')
 */
export function mapFrontendTypeToDatabase(frontendType) {
  const mappedType = ACTIVITY_TYPE_MAPPING[frontendType];
  
  if (!mappedType) {
    console.warn(`[Activity Type Mapping] Tipo desconhecido: ${frontendType}, usando 'assignment' como fallback`);
    return DATABASE_ACTIVITY_TYPES.ASSIGNMENT;
  }
  
  return mappedType;
}

/**
 * Converte tipo do banco para tipo do frontend
 * Usado ao carregar atividade existente para edição
 * @param {string} databaseType - Tipo do banco ('assignment', 'quiz', 'essay', 'project')
 * @returns {string} Tipo para usar no seletor ('open', 'closed', 'mixed')
 */
export function mapDatabaseTypeToFrontend(databaseType) {
  const mappedType = REVERSE_ACTIVITY_TYPE_MAPPING[databaseType];
  
  if (!mappedType) {
    console.warn(`[Activity Type Mapping] Tipo do banco desconhecido: ${databaseType}, usando 'open' como fallback`);
    return FRONTEND_ACTIVITY_TYPES.OPEN;
  }
  
  return mappedType;
}

/**
 * Valida se um tipo é válido para o banco
 * @param {string} type - Tipo a validar
 * @returns {boolean} True se válido
 */
export function isValidDatabaseType(type) {
  return Object.values(DATABASE_ACTIVITY_TYPES).includes(type);
}

/**
 * Valida se um tipo é válido para o frontend
 * @param {string} type - Tipo a validar
 * @returns {boolean} True se válido
 */
export function isValidFrontendType(type) {
  return Object.values(FRONTEND_ACTIVITY_TYPES).includes(type);
}

/**
 * Nomes amigáveis para exibição
 */
export const ACTIVITY_TYPE_LABELS = {
  [DATABASE_ACTIVITY_TYPES.ASSIGNMENT]: 'Trabalho/Tarefa',
  [DATABASE_ACTIVITY_TYPES.QUIZ]: 'Quiz/Teste',
  [DATABASE_ACTIVITY_TYPES.ESSAY]: 'Redação',
  [DATABASE_ACTIVITY_TYPES.PROJECT]: 'Projeto'
};
