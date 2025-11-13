import { logger } from '@/shared/utils/logger';

/**
 * Serviço de Correção Automática para Atividades Objetivas
 * Calcula a nota baseado nas alternativas corretas definidas pelo professor
 */

/**
 * Calcula a nota automática para atividades fechadas (objetivas)
 * @param {Array} questions - Array de questões da atividade
 * @param {Object} studentAnswers - Respostas do aluno { questionId: answerId }
 * @param {number} maxScore - Pontuação máxima da atividade
 * @returns {Object} { grade, correctCount, totalQuestions, details }
 */
export const calculateAutoGrade = (questions, studentAnswers, maxScore = 10) => {
  try {
    if (!questions || questions.length === 0) {
      logger.warn('[AutoGrading] Nenhuma questão fornecida');
      return null;
    }

    let correctCount = 0;
    const totalQuestions = questions.length;
    const details = [];

    questions.forEach((question, index) => {
      const questionId = question.id || index;
      const studentAnswer = studentAnswers[questionId];
      
      // Encontrar alternativa correta
      const correctAlternative = question.alternatives?.find(alt => alt.isCorrect);
      
      if (!correctAlternative) {
        logger.warn(`[AutoGrading] Questão ${questionId} não tem alternativa correta definida`);
        return;
      }

      // Verificar se a resposta do aluno está correta (converter para string para comparar)
      const isCorrect = String(studentAnswer) === String(correctAlternative.id) || 
                       String(studentAnswer) === String(correctAlternative.letter);

      if (isCorrect) {
        correctCount++;
      }

      details.push({
        questionId,
        questionText: question.text,
        studentAnswer,
        correctAnswer: correctAlternative.id,
        isCorrect,
        points: question.points || (maxScore / totalQuestions)
      });
    });

    // Calcula a nota proporcional
    const grade = (correctCount / totalQuestions) * maxScore;
    const percentage = (correctCount / totalQuestions) * 100;

    const result = {
      grade: Math.round(grade * 100) / 100, // Arredonda para 2 casas decimais
      correctCount,
      totalQuestions,
      percentage: Math.round(percentage * 100) / 100,
      details
    };

    logger.debug('[AutoGrading] Correção automática concluída:', result);
    return result;

  } catch (error) {
    logger.error('[AutoGrading] Erro ao calcular nota automática:', error);
    return null;
  }
};

/**
 * Gera feedback automático baseado no resultado
 * @param {Object} gradingResult - Resultado do calculateAutoGrade
 * @returns {string} Feedback formatado
 */
export const generateAutoFeedback = (gradingResult) => {
  if (!gradingResult) return '';

  const { correctCount, totalQuestions, percentage, grade } = gradingResult;

  let feedback = `**Correção Automática**\n\n`;
  feedback += `Resultado: ${correctCount}/${totalQuestions} questões corretas (${percentage}%)\n`;
  feedback += `Nota: ${grade}\n\n`;

  if (percentage >= 90) {
    feedback += `**Excelente!** Você dominou o conteúdo.`;
  } else if (percentage >= 70) {
    feedback += `**Muito Bom!** Continue com esse desempenho.`;
  } else if (percentage >= 50) {
    feedback += `**Regular.** Revise os tópicos onde teve dificuldade.`;
  } else {
    feedback += `**Precisa Melhorar.** Recomenda-se revisar o conteúdo e tentar novamente.`;
  }

  return feedback;
};

/**
 * Verifica se uma atividade pode ser corrigida automaticamente
 * @param {Object} activity - Dados da atividade
 * @returns {boolean}
 */
export const canAutoGrade = (activity) => {
  if (!activity) return false;

  // Tipos que suportam correção automática
  const autoGradeTypes = ['closed', 'quiz', 'multiple_choice', 'objective'];
  
  if (!autoGradeTypes.includes(activity.type)) {
    return false;
  }

  // Verificar se tem questões com alternativas corretas
  const questions = activity.content?.questions || [];
  
  if (questions.length === 0) {
    return false;
  }

  // Todas as questões devem ter pelo menos uma alternativa correta
  const allHaveCorrect = questions.every(q => 
    q.alternatives?.some(alt => alt.isCorrect)
  );

  return allHaveCorrect;
};

/**
 * Verifica se deve mostrar nota imediatamente
 * @param {Object} activity - Dados da atividade
 * @returns {boolean}
 */
export const shouldShowScoreImmediately = (activity) => {
  return activity?.content?.advanced_settings?.showScoreImmediately === true;
};

export default {
  calculateAutoGrade,
  generateAutoFeedback,
  canAutoGrade,
  shouldShowScoreImmediately
};
