import { logger } from '@/shared/utils/logger';
import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { Badge } from '@/shared/components/ui/badge';

const ClosedQuestions = ({ questions, setQuestions, maxScore }) => {
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
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
        explanation: '',
        hint: ''
      }
    ]);
  };

  const updateQuestion = (id, field, value) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const deleteQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const addAlternative = (questionId) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const nextLetter = String.fromCharCode(65 + q.alternatives.length);
        return {
          ...q,
          alternatives: [
            ...q.alternatives,
            { id: Date.now(), letter: nextLetter, text: '', isCorrect: false }
          ]
        };
      }
      return q;
    }));
  };

  const updateAlternative = (questionId, altId, field, value) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        // Se estiver marcando como correta, desmarcar as outras
        if (field === 'isCorrect' && value === true) {
          return {
            ...q,
            alternatives: q.alternatives.map(alt => ({
              ...alt,
              isCorrect: alt.id === altId
            }))
          };
        }
        // Para outros campos, apenas atualizar o campo específico
        return {
          ...q,
          alternatives: q.alternatives.map(alt =>
            alt.id === altId ? { ...alt, [field]: value } : alt
          )
        };
      }
      return q;
    }));
  };

  const deleteAlternative = (questionId, altId) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.alternatives.length > 2) {
        const newAlternatives = q.alternatives.filter(a => a.id !== altId);
        // Reordenar letras
        return {
          ...q,
          alternatives: newAlternatives.map((alt, idx) => ({
            ...alt,
            letter: String.fromCharCode(65 + idx)
          }))
        };
      }
      return q;
    }));
  };

  const setCorrectAlternative = (questionId, altId) => {
    logger.debug('[ClosedQuestions] ✅ Marcando alternativa como correta:', { questionId, altId })
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const updatedQuestion = {
          ...q,
          alternatives: q.alternatives.map(alt => ({
            ...alt,
            isCorrect: alt.id === altId
          }))
        };
        logger.debug('[ClosedQuestions] Questão atualizada:', updatedQuestion)
        return updatedQuestion;
      }
      return q;
    }));
  };

  const totalPoints = questions.reduce((sum, q) => sum + (parseFloat(q.points) || 0), 0);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Questões Fechadas (Objetivas)</h2>
            <div className="text-sm text-gray-600 mt-1">
              <span>{questions.length} questão(ões) • Total: {totalPoints.toFixed(1)} pontos</span>
              {maxScore && Math.abs(totalPoints - maxScore) > 0.1 && (
                <Badge variant="destructive" className="ml-2">
                  Meta: {maxScore} pontos
                </Badge>
              )}
            </div>
          </div>
          <Button onClick={addQuestion}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Questão
          </Button>
        </div>

        {questions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">Nenhuma questão adicionada ainda.</p>
            <Button onClick={addQuestion} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Questão
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {questions.map((question, index) => {
              const hasCorrectAnswer = question.alternatives?.some(alt => alt.isCorrect);
              
              return (
                <Card key={question.id} className="p-6 border-l-4 border-l-blue-500">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                      <Badge className="bg-blue-100 text-blue-700">Q{index + 1}</Badge>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div>
                        <Label>Enunciado da Questão *</Label>
                        <Textarea
                          placeholder="Digite o enunciado da questão..."
                          value={question.text}
                          onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                          className="mt-1 min-h-[100px]"
                        />
                      </div>

                      <div>
                        <Label>Pontuação *</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={question.points}
                          onChange={(e) => updateQuestion(question.id, 'points', parseFloat(e.target.value))}
                          className="mt-1 w-32"
                        />
                      </div>

                      {/* Alternativas */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <Label>
                            Alternativas *
                            {!hasCorrectAnswer && (
                              <Badge variant="destructive" className="ml-2">
                                Marque a correta
                              </Badge>
                            )}
                          </Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addAlternative(question.id)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Adicionar Alternativa
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {question.alternatives?.map((alt) => (
                            <div key={alt.id} className="flex gap-3 items-center p-3 bg-gray-50 rounded">
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct-${question.id}`}
                                  checked={alt.isCorrect}
                                  onChange={() => setCorrectAlternative(question.id, alt.id)}
                                  className="w-5 h-5 cursor-pointer"
                                  title="Marcar como correta"
                                />
                                <Badge variant="outline" className="w-8 justify-center">
                                  {alt.letter}
                                </Badge>
                              </div>

                              <Input
                                placeholder="Texto da alternativa"
                                value={alt.text}
                                onChange={(e) => updateAlternative(question.id, alt.id, 'text', e.target.value)}
                                className="flex-1"
                              />

                              {question.alternatives.length > 2 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteAlternative(question.id, alt.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Explicação */}
                      <div>
                        <Label>Explicação da Resposta Correta (Opcional)</Label>
                        <Textarea
                          placeholder="Explique por que a alternativa está correta..."
                          value={question.explanation}
                          onChange={(e) => updateQuestion(question.id, 'explanation', e.target.value)}
                          className="mt-1 min-h-[80px]"
                        />
                      </div>

                      {/* Dica */}
                      <div>
                        <Label>Dica para Alunos (Opcional)</Label>
                        <Input
                          placeholder="Uma dica que pode ajudar..."
                          value={question.hint}
                          onChange={(e) => updateQuestion(question.id, 'hint', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteQuestion(question.id)}
                    >
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ClosedQuestions;
