import React from 'react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';

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
            <Card key={idx} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold">Questão {idx + 1}</h4>
                <Badge variant={isCorrect ? "success" : "destructive"}>
                  {isCorrect ? '✓ Correta' : '✗ Incorreta'}
                  {answer?.points_earned !== undefined && ` (${answer.points_earned} pts)`}
                </Badge>
              </div>
              
              <p className="text-sm mb-3 font-medium">{question.text || question.question || question.prompt}</p>
              
              <div className="space-y-2 mb-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Resposta do aluno:</p>
                  <p className="text-sm font-medium">{studentAnswer || 'Não respondeu'}</p>
                </div>
                
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Resposta correta:</p>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">{correctAnswer || 'Não especificada'}</p>
                </div>
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
                      {opt}
                    </div>
                  ))}
                </div>
              )}
              
              {question.explanation && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded text-sm">
                  <strong>Explicação:</strong> {question.explanation}
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
    
    // Se for string, mostrar direto
    if (typeof content === 'string') return content;
    
    // Se for objeto, tentar extrair o texto
    if (content.text) return content.text;
    if (content.answer) return content.answer;
    
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
              <p className="font-mono text-sm font-medium">{content[key]}</p>
            </div>
          ))}
        </div>
      );
    }
    
    // Fallback: mostrar JSON formatado
    return (
      <pre className="text-xs overflow-auto bg-gray-100 dark:bg-gray-800 p-3 rounded">
        {JSON.stringify(content, null, 2)}
      </pre>
    );
  };

  if (submission.activity?.type === 'assignment') {
    // Atividade Aberta
    return (
      <div className="prose max-w-none">
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg whitespace-pre-wrap">
          {renderContent()}
        </div>
        
        {content?.attachments && content.attachments.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Anexos:</h4>
            <ul className="space-y-2">
              {content.attachments.map((file, idx) => (
                <li key={idx}>
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
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
            <Card key={idx} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold">Questão {idx + 1}</h4>
                <Badge variant={isCorrect ? "success" : "destructive"}>
                  {isCorrect ? '✓ Correta' : '✗ Incorreta'}
                  {answer?.points_earned !== undefined && ` (${answer.points_earned} pts)`}
                </Badge>
              </div>
              
              <p className="text-sm mb-3 font-medium">{question.text || question.question || question.prompt}</p>
              
              <div className="space-y-2 mb-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Resposta do aluno:</p>
                  <p className="text-sm font-medium">{studentAnswer || 'Não respondeu'}</p>
                </div>
                
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Resposta correta:</p>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">{correctAnswer || 'Não especificada'}</p>
                </div>
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
                      {opt}
                    </div>
                  ))}
                </div>
              )}
              
              {question.explanation && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded text-sm">
                  <strong>Explicação:</strong> {question.explanation}
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
