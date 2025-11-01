import React from 'react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';

const SubmissionView = ({ submission }) => {
  const content = submission.content;

  if (submission.activity?.type === 'assignment') {
    // Atividade Aberta
    return (
      <div className="prose max-w-none">
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg whitespace-pre-wrap">
          {typeof content === 'string' ? content : content?.text || 'Sem resposta'}
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
          const answer = answers.find(a => a.question_id === question.id);
          const isCorrect = answer?.is_correct;

          return (
            <Card key={idx} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold">Questão {idx + 1}</h4>
                <Badge className={isCorrect ? 'bg-green-500' : 'bg-red-500'}>
                  {isCorrect ? 'Correta' : 'Incorreta'}
                </Badge>
              </div>
              
              <p className="text-sm mb-3">{question.text}</p>
              
              <div className="space-y-1">
                {question.alternatives?.map((alt, altIdx) => (
                  <div
                    key={altIdx}
                    className={`p-2 rounded text-sm ${
                      alt.is_correct ? 'bg-green-100 border border-green-500' :
                      answer?.selected_alternative === alt.id ? 'bg-red-100 border border-red-500' :
                      'bg-gray-50'
                    }`}
                  >
                    {alt.letter}. {alt.text}
                  </div>
                ))}
              </div>
              
              {question.explanation && (
                <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
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
