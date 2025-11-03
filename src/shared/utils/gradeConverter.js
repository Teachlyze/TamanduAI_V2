import { logger } from '@/shared/utils/logger';
/**
 * Utilitário para conversão de notas entre diferentes escalas
 * O banco SEMPRE armazena em escala 0-10 (constraint CHECK)
 * Mas a UI mostra na escala configurada da turma
 */

/**
 * Escalas suportadas (definidas em classes.grading_system)
 */
export const GRADING_SYSTEMS = {
  '0-10': { min: 0, max: 10, type: 'numeric', decimals: 2 },
  '0-100': { min: 0, max: 100, type: 'numeric', decimals: 0 },
  'A-F': { 
    type: 'letter', 
    scale: [
      { letter: 'A', min: 9.0, max: 10 },
      { letter: 'B', min: 7.0, max: 8.9 },
      { letter: 'C', min: 5.0, max: 6.9 },
      { letter: 'D', min: 3.0, max: 4.9 },
      { letter: 'F', min: 0, max: 2.9 }
    ]
  },
  'pass-fail': {
    type: 'binary',
    scale: [
      { label: 'Aprovado', min: 6.0, max: 10 },
      { label: 'Reprovado', min: 0, max: 5.9 }
    ]
  },
  'excellent-poor': {
    type: 'concept',
    scale: [
      { label: 'Excelente', min: 9.0, max: 10 },
      { label: 'Ótimo', min: 7.5, max: 8.9 },
      { label: 'Bom', min: 6.0, max: 7.4 },
      { label: 'Regular', min: 4.0, max: 5.9 },
      { label: 'Insuficiente', min: 0, max: 3.9 }
    ]
  }
};

/**
 * Converte nota da escala da UI para escala do banco (0-10)
 * @param {string|number} displayGrade - Nota na escala da UI (ex: "85", "B", "Aprovado")
 * @param {string} gradingSystem - Sistema de notas da turma
 * @returns {number} Nota normalizada 0-10
 */
export function convertToDatabase(displayGrade, gradingSystem = '0-10') {
  const system = GRADING_SYSTEMS[gradingSystem];
  
  if (!system) {
    logger.warn(`Sistema de notas desconhecido: ${gradingSystem}, usando 0-10`)
    return parseFloat(displayGrade);
  }

  // Se já é numérico 0-10
  if (gradingSystem === '0-10') {
    return parseFloat(displayGrade);
  }

  // Se é numérico mas outra escala (ex: 0-100)
  if (system.type === 'numeric') {
    const numGrade = parseFloat(displayGrade);
    // Normalizar para 0-10
    return (numGrade / system.max) * 10;
  }

  // Se é letra (A-F)
  if (system.type === 'letter') {
    const gradeEntry = system.scale.find(s => s.letter === displayGrade.toUpperCase());
    if (gradeEntry) {
      // Retornar o ponto médio da faixa
      return (gradeEntry.min + gradeEntry.max) / 2;
    }
  }

  // Se é binário (pass-fail) ou conceito
  if (system.type === 'binary' || system.type === 'concept') {
    const gradeEntry = system.scale.find(s => s.label === displayGrade);
    if (gradeEntry) {
      // Retornar o ponto médio da faixa
      return (gradeEntry.min + gradeEntry.max) / 2;
    }
  }

  // Fallback: tentar parsear como número
  const parsed = parseFloat(displayGrade);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Converte nota do banco (0-10) para escala da UI
 * @param {number} dbGrade - Nota no banco (0-10)
 * @param {string} gradingSystem - Sistema de notas da turma
 * @returns {string|number} Nota na escala da UI
 */
export function convertFromDatabase(dbGrade, gradingSystem = '0-10') {
  const system = GRADING_SYSTEMS[gradingSystem];
  const grade = parseFloat(dbGrade);
  
  if (isNaN(grade)) return '';
  if (!system) return grade;

  // Se já é 0-10
  if (gradingSystem === '0-10') {
    return grade.toFixed(system.decimals);
  }

  // Se é numérico mas outra escala (ex: 0-100)
  if (system.type === 'numeric') {
    const converted = (grade / 10) * system.max;
    return Math.round(converted);
  }

  // Se é letra (A-F)
  if (system.type === 'letter') {
    const gradeEntry = system.scale.find(s => grade >= s.min && grade <= s.max);
    return gradeEntry ? gradeEntry.letter : 'F';
  }

  // Se é binário (pass-fail) ou conceito
  if (system.type === 'binary' || system.type === 'concept') {
    const gradeEntry = system.scale.find(s => grade >= s.min && grade <= s.max);
    return gradeEntry ? gradeEntry.label : system.scale[system.scale.length - 1].label;
  }

  return grade;
}

/**
 * Retorna o valor máximo da escala para exibição
 * @param {string} gradingSystem 
 * @returns {number|string}
 */
export function getMaxGradeDisplay(gradingSystem = '0-10') {
  const system = GRADING_SYSTEMS[gradingSystem];
  if (!system) return 10;
  
  if (system.type === 'numeric') {
    return system.max;
  }
  
  if (system.type === 'letter') {
    return 'A';
  }
  
  if (system.type === 'binary' || system.type === 'concept') {
    return system.scale[0].label; // Primeiro é o melhor
  }
  
  return 10;
}

/**
 * Retorna opções para input de nota baseado no sistema
 * @param {string} gradingSystem 
 * @returns {Array|null} Array de opções ou null para input livre
 */
export function getGradeOptions(gradingSystem = '0-10') {
  const system = GRADING_SYSTEMS[gradingSystem];
  if (!system) return null;
  
  if (system.type === 'numeric') {
    return null; // Input livre
  }
  
  if (system.type === 'letter') {
    return system.scale.map(s => s.letter);
  }
  
  if (system.type === 'binary' || system.type === 'concept') {
    return system.scale.map(s => s.label);
  }
  
  return null;
}

/**
 * Valida se a nota está dentro da escala
 * @param {string|number} displayGrade 
 * @param {string} gradingSystem 
 * @returns {boolean}
 */
export function isValidGrade(displayGrade, gradingSystem = '0-10') {
  const system = GRADING_SYSTEMS[gradingSystem];
  if (!system) return true;
  
  if (system.type === 'numeric') {
    const num = parseFloat(displayGrade);
    return !isNaN(num) && num >= system.min && num <= system.max;
  }
  
  if (system.type === 'letter') {
    return system.scale.some(s => s.letter === displayGrade.toUpperCase());
  }
  
  if (system.type === 'binary' || system.type === 'concept') {
    return system.scale.some(s => s.label === displayGrade);
  }
  
  return false;
}

/**
 * Formata nota para exibição
 * @param {number} dbGrade - Nota do banco (0-10)
 * @param {string} gradingSystem 
 * @returns {string}
 */
export function formatGradeDisplay(dbGrade, gradingSystem = '0-10') {
  const converted = convertFromDatabase(dbGrade, gradingSystem);
  const system = GRADING_SYSTEMS[gradingSystem];
  
  if (!system) return converted.toString();
  
  if (system.type === 'numeric') {
    return `${converted}/${system.max}`;
  }
  
  return converted.toString();
}

export default {
  GRADING_SYSTEMS,
  convertToDatabase,
  convertFromDatabase,
  getMaxGradeDisplay,
  getGradeOptions,
  isValidGrade,
  formatGradeDisplay
};
