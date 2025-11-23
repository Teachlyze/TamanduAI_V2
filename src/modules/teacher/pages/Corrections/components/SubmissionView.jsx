import React from 'react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import TextWithLineBreaks from '@/shared/components/ui/TextWithLineBreaks';

const SubmissionView = ({ submission }) => {
  const content = submission.content;
  const questions = submission.activity?.content?.questions || [];
  const answers = submission.answers || [];

  const buildAnswersMap = () => {
    const map = {};

    // Tentar extrair respostas estruturadas do content (selectedAnswers/answers)
    if (content) {
      let parsed = content;

      if (typeof content === 'string') {
        try {
          parsed = JSON.parse(content);
        } catch (e) {
          parsed = null;
        }
      }

      if (parsed && typeof parsed === 'object') {
        // Para quizzes novos: selectedAnswers/answers
        // Para quizzes antigos: próprio objeto já é o mapa { questionId: value }
        const fromContent =
          parsed.selectedAnswers ||
          parsed.answers ||
          (Array.isArray(questions) && questions.length > 0 ? parsed : null);

        if (fromContent && typeof fromContent === 'object') {
          Object.entries(fromContent).forEach(([key, value]) => {
            map[key] = value;
          });
        }
      }
    }

    // Fallback legado: tabela answers
    if (answers && Array.isArray(answers) && answers.length > 0) {
      answers.forEach((answer) => {
        if (!answer) return;
        const questionId = answer.question_id;
        const answerJson = answer.answer_json;
        let value = null;

        if (answerJson && typeof answerJson === 'object') {
          value = answerJson.answer ?? answerJson.selected ?? null;
        } else if (typeof answerJson === 'string') {
          value = answerJson;
        }

        if (questionId != null && value != null && map[questionId] === undefined) {
          map[questionId] = value;
        }
      });
    }

    return map;
  };

  const structuredAnswers = buildAnswersMap();

  const getStudentAnswerLabel = (question, value) => {
    if (value === undefined || value === null || value === '') return null;

    if (question.alternatives && question.alternatives.length > 0) {
      const normalized = String(value);

      const byId = question.alternatives.find((alt) => String(alt.id) === normalized);
      if (byId) return byId.text || normalized;

      const byLetter = question.alternatives.find((alt) => String(alt.letter) === normalized);
      if (byLetter) return byLetter.text || normalized;

      const byText = question.alternatives.find((alt) => alt.text === value);
      if (byText) return byText.text;
    }

    return typeof value === 'string' ? value : JSON.stringify(value);
  };

  const getCorrectAnswerLabel = (question) => {
    if (question.alternatives && question.alternatives.length > 0) {
      const correctAlts = question.alternatives.filter((alt) => alt.isCorrect);
      if (correctAlts.length > 0) {
        return correctAlts.map((alt) => alt.text).join(', ');
      }
    }

    return question.correctAnswer || question.correct_answer || question.answer || null;
  };

  const isStudentAnswerCorrect = (question, value) => {
    if (value === undefined || value === null || value === '') return null;

    if (question.alternatives && question.alternatives.length > 0) {
      const correctAlts = question.alternatives.filter((alt) => alt.isCorrect);
      if (correctAlts.length === 0) return null;

      const normalized = String(value);
      const matches = (alt) =>
        String(alt.id) === normalized ||
        String(alt.letter) === normalized ||
        alt.text === value;

      return correctAlts.some(matches);
    }

    return null;
  };

  // Se tem questões estruturadas, mostrar como quiz independente do tipo
  if (questions.length > 0 && Object.keys(structuredAnswers).length > 0) {
    return (
      <div className="space-y-4">
        {questions.map((question, idx) => {
          const questionKey = question.id ?? idx;
          const rawStudentValue =
            structuredAnswers[questionKey] ??
            structuredAnswers[String(questionKey)] ??
            structuredAnswers[`question_${idx}`];

          const studentAnswer = getStudentAnswerLabel(question, rawStudentValue);
          const correctAnswer = getCorrectAnswerLabel(question);
          const correctness = isStudentAnswerCorrect(question, rawStudentValue);

          const hasCorrectInfo = !!correctAnswer;
          const hasStudentAnswer = !!studentAnswer;

          const isCorrect = correctness === true;
          const isIncorrect = correctness === false;

          const borderColor = hasCorrectInfo
            ? isCorrect
              ? '#22c55e'
              : isIncorrect
                ? '#ef4444'
                : '#0f172a'
            : '#0f172a';

          const badgeVariant = hasCorrectInfo
            ? isCorrect
              ? 'success'
              : isIncorrect
                ? 'destructive'
                : 'outline'
            : 'outline';

          const badgeLabel = hasCorrectInfo
            ? isCorrect
              ? '✓ Correta'
              : isIncorrect
                ? '✗ Incorreta'
                : hasStudentAnswer
                  ? 'Respondida'
                  : 'Sem resposta'
            : hasStudentAnswer
              ? 'Respondida'
              : 'Sem resposta';

          return (
            <Card key={idx} className="p-4 border-l-4" style={{ borderLeftColor: borderColor }}>
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-lg">Questão {idx + 1}</h4>
                <Badge variant={badgeVariant}>
                  {badgeLabel}
                </Badge>
              </div>
              
              {/* Enunciado da Questão */}
              <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-900 border-l-4 border-indigo-500 rounded">
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2">📝 ENUNCIADO:</p>
                <TextWithLineBreaks 
                  text={question.text || question.question || question.prompt}
                  className="font-medium leading-relaxed"
                />
                {question.maxScore && (
                  <p className="text-xs text-gray-500 mt-2">Valor: {question.maxScore} pontos</p>
                )}
              </div>
              
              {/* Resposta do Aluno */}
              <div className="space-y-3 mb-3">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500 rounded">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">👤 RESPOSTA DO ALUNO:</p>
                  <TextWithLineBreaks 
                    text={studentAnswer || 'Não respondeu'}
                    className="font-medium"
                  />
                </div>
                
                {correctAnswer && (
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 border-l-4 border-green-500 rounded">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">✓ RESPOSTA CORRETA:</p>
                    <TextWithLineBreaks 
                      text={correctAnswer}
                      className="font-medium"
                    />
                  </div>
                )}
              </div>
              
              {question.options && question.options.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-600 mb-2">Opções:</p>
                  {question.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      className={`p-2 rounded text-sm ${
                        opt === correctAnswer ? 'bg-green-100 dark:bg-green-950/30 border border-green-500' :
                        opt === studentAnswer ? 'bg-red-100 dark:bg-red-950/30 border border-red-500' :
                        'bg-gray-50 dark:bg-gray-800'
                      }`}
                    >
                      <TextWithLineBreaks text={opt} />
                    </div>
                  ))}
                </div>
              )}
              
              {question.explanation && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded text-sm">
                  <div className="space-y-1">
                    <strong>Explicação:</strong>
                    <TextWithLineBreaks 
                      text={question.explanation}
                      className="block mt-1"
                    />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    );
  }

  // Renderizar conteúdo em formato legível
  const renderContent = () => {
    if (!content) return 'Sem conteúdo';
    
    const textStyle = {
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      overflowWrap: 'break-word',
      wordWrap: 'break-word',
      maxWidth: '100%',
      overflow: 'hidden',
      display: 'block',
      lineHeight: '1.5'
    };
    
    // Se for string, mostrar com quebra de linha
    if (typeof content === 'string') {
      return <div style={textStyle}>{content}</div>;
    }
    
    // Se for objeto, tentar extrair o texto
    if (content.text) return <div style={textStyle}>{content.text}</div>;
    if (content.answer) return <div style={textStyle}>{content.answer}</div>;
    
    // Se for um objeto com timestamp keys (respostas de quiz antigo)
    const keys = Object.keys(content);
    if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
      // É um formato {timestamp: resposta}
      return (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">Respostas do aluno:</p>
          {keys.map(key => (
            <div key={key} className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded border">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Resposta:</p>
              <div style={textStyle}>
                {content[key]}
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    // Fallback: mostrar JSON formatado
    return (
      <div className="text-xs overflow-auto bg-gray-100 dark:bg-gray-800 p-3 rounded">
        <TextWithLineBreaks text={JSON.stringify(content, null, 2)} />
      </div>
    );
  };

  const activityType = submission.activity?.type;

  if (activityType === 'assignment' || activityType === 'essay' || activityType === 'project') {
    // Atividade Aberta
    const activityDescription = submission.activity?.description || submission.activity?.content?.description || '';
    
    return (
      <div className="space-y-4">
        {/* Enunciado da Atividade */}
        {activityDescription && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-l-4 border-indigo-500 rounded">
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2">📝 ENUNCIADO DA ATIVIDADE:</p>
            <TextWithLineBreaks 
              text={activityDescription}
              className="font-medium leading-relaxed"
            />
          </div>
        )}
        
        {/* Resposta do Aluno */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500 rounded">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-3">👤 RESPOSTA DO ALUNO:</p>
          <div style={{
            width: '100%',
            maxWidth: '100%',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'break-word',
            wordWrap: 'break-word',
            overflow: 'hidden'
          }}>
            {renderContent()}
          </div>
        </div>
        
        {/* Anexos */}
        {content?.attachments && content.attachments.length > 0 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">📎 ANEXOS:</p>
            <ul className="space-y-2">
              {content.attachments.map((file, idx) => (
                <li key={idx}>
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                    {file.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="text-gray-600">
      Tipo de atividade não suportado para visualização
    </div>
  );
};

export default SubmissionView;
