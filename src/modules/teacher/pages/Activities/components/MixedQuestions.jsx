import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import OpenQuestions from './OpenQuestions';
import ClosedQuestions from './ClosedQuestions';

const MixedQuestions = ({ questions, setQuestions, maxScore }) => {
  const [questionTypeToAdd, setQuestionTypeToAdd] = useState('open');

  const openQuestions = questions.filter(q => q.type === 'open');
  const closedQuestions = questions.filter(q => q.type === 'closed');

  const addQuestion = (type) => {
    const newQuestion = type === 'open' ? {
      id: Date.now(),
      type: 'open',
      text: '',
      points: 1,
      maxLines: null,
      maxCharacters: null,
      rubric: [],
      expectedAnswer: ''
    } : {
      id: Date.now(),
      type: 'closed',
      text: '',
      points: 1,
      alternatives: [
        { id: Date.now() + 1, letter: 'A', text: '', isCorrect: false },
        { id: Date.now() + 2, letter: 'B', text: '', isCorrect: false },
        { id: Date.now() + 3, letter: 'C', text: '', isCorrect: false },
        { id: Date.now() + 4, letter: 'D', text: '', isCorrect: false },
        { id: Date.now() + 5, letter: 'E', text: '', isCorrect: false }
      ],
      explanation: ''
    };

    setQuestions([...questions, newQuestion]);
  };

  const totalPoints = questions.reduce((sum, q) => sum + (parseFloat(q.points) || 0), 0);
  const openPercentage = openQuestions.length > 0 ? ((openQuestions.reduce((sum, q) => sum + q.points, 0) / totalPoints) * 100).toFixed(0) : 0;
  const closedPercentage = closedQuestions.length > 0 ? ((closedQuestions.reduce((sum, q) => sum + q.points, 0) / totalPoints) * 100).toFixed(0) : 0;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Questões Mistas</h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span>{questions.length} questão(ões) total</span>
              <span>•</span>
              <span>{openQuestions.length} Abertas ({openPercentage}%)</span>
              <span>•</span>
              <span>{closedQuestions.length} Fechadas ({closedPercentage}%)</span>
              <span>•</span>
              <span>Total: {totalPoints.toFixed(1)} pontos</span>
              {maxScore && Math.abs(totalPoints - maxScore) > 0.1 && (
                <Badge variant="destructive" className="ml-2">
                  Meta: {maxScore} pontos
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => addQuestion('open')} variant="outline" className="bg-green-50">
              <Plus className="w-4 h-4 mr-2" />
              Questão Aberta
            </Button>
            <Button onClick={() => addQuestion('closed')} variant="outline" className="bg-blue-50">
              <Plus className="w-4 h-4 mr-2" />
              Questão Fechada
            </Button>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">Nenhuma questão adicionada ainda.</p>
            <p className="mb-6">Comece adicionando questões abertas ou fechadas.</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => addQuestion('open')} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Questão Aberta
              </Button>
              <Button onClick={() => addQuestion('closed')} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Questão Fechada
              </Button>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Todas ({questions.length})</TabsTrigger>
              <TabsTrigger value="open">Abertas ({openQuestions.length})</TabsTrigger>
              <TabsTrigger value="closed">Fechadas ({closedQuestions.length})</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              {/* Todas as questões em ordem */}
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <Card key={question.id} className={`p-4 border-l-4 ${question.type === 'open' ? 'border-l-green-500' : 'border-l-blue-500'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={question.type === 'open' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                        Q{index + 1} - {question.type === 'open' ? 'Aberta' : 'Fechada'}
                      </Badge>
                      <span className="text-sm text-gray-600">{question.points} pontos</span>
                    </div>
                    <p className="text-sm text-gray-700 truncate">{question.text || 'Sem enunciado'}</p>
                  </Card>
                ))}
              </div>
            </div>
          </Tabs>
        )}
      </Card>

      {/* Renderizar componentes específicos para edição detalhada */}
      {openQuestions.length > 0 && (
        <OpenQuestions
          questions={openQuestions}
          setQuestions={(newOpenQuestions) => {
            setQuestions([
              ...newOpenQuestions,
              ...closedQuestions
            ]);
          }}
          maxScore={maxScore * (openPercentage / 100)}
        />
      )}

      {closedQuestions.length > 0 && (
        <ClosedQuestions
          questions={closedQuestions}
          setQuestions={(newClosedQuestions) => {
            setQuestions([
              ...openQuestions,
              ...newClosedQuestions
            ]);
          }}
          maxScore={maxScore * (closedPercentage / 100)}
        />
      )}
    </div>
  );
};

export default MixedQuestions;
