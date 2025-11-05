import React from 'react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import TextWithLineBreaks from '@/shared/components/ui/TextWithLineBreaks';

const SubmissionView = ({ submission }) => {
  const content = submission.content;
  const questions = submission.activity?.content?.questions || [];
  const answers = submission.answers || [];

  console.log('🔍 SubmissionView Debug:', {
    activityType: submission.activity?.type,
    hasQuestions: questions.length > 0,
    questionsCount: questions.length,
    answersCount: answers.length,
    content: content,
    questions: questions,
    answers: answers
  });

  // Se tem questões estruturadas, mostrar como quiz independente do tipo
  if (questions.length > 0 && answers.length > 0) {
    return (
      <div className="space-y-4">
        {questions.map((question, idx) => {
          const answer = answers.find(a => 
            a.question_id === question.id || 
            a.question_id === `question_${idx}` ||
            a.question_id === idx.toString()
          );
          
          const studentAnswer = answer?.answer_json?.answer || 
                               answer?.answer_json?.selected || 
                               (typeof answer?.answer_json === 'string' ? answer.answer_json : null);
          
          const isCorrect = (answer?.points_earned || 0) > 0;
          const correctAnswer = question.correctAnswer || question.correct_answer || question.answer;

          return (
            <Card key={idx} className="p-4 border-l-4" style={{ borderLeftColor: isCorrect ? '#22c55e' : '#ef4444' }}>
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-lg">Questão {idx + 1}</h4>
                <Badge variant={isCorrect ? "success" : "destructive"}>
                  {isCorrect ? '✓ Correta' : '✗ Incorreta'}
                  {answer?.points_earned !== undefined && ` (${answer.points_earned} pts)`}
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

  if (submission.activity?.type === 'assignment') {
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

  if (submission.activity?.type === 'quiz') {
    // Atividade Fechada (Objetiva)
    const questions = submission.activity?.content?.questions || [];
    const answers = submission.answers || [];

    return (
      <div className="space-y-4">
        {questions.map((question, idx) => {
          const answer = answers.find(a => 
            a.question_id === question.id || 
            a.question_id === `question_${idx}` ||
            a.question_id === idx.toString()
          );
          
          // Extrair resposta do aluno do answer_json
          const studentAnswer = answer?.answer_json?.answer || 
                               answer?.answer_json?.selected || 
                               (typeof answer?.answer_json === 'string' ? answer.answer_json : null);
          
          const isCorrect = (answer?.points_earned || 0) > 0;
          const correctAnswer = question.correctAnswer || question.correct_answer || question.answer;

          return (
            <Card key={idx} className="p-4 border-l-4" style={{ borderLeftColor: isCorrect ? '#22c55e' : '#ef4444' }}>
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-lg">Questão {idx + 1}</h4>
                <Badge variant={isCorrect ? "success" : "destructive"}>
                  {isCorrect ? '✓ Correta' : '✗ Incorreta'}
                  {answer?.points_earned !== undefined && ` (${answer.points_earned} pts)`}
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

  return (
    <div className="text-gray-600">
      Tipo de atividade não suportado para visualização
    </div>
  );
};

export default SubmissionView;
