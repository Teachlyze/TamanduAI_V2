import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Image as ImageIcon } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Badge } from '@/shared/components/ui/badge';

const OpenQuestions = ({ questions, setQuestions, maxScore }) => {
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Date.now(),
        type: 'open',
        text: '',
        points: 1,
        maxLines: null,
        maxCharacters: null,
        image: null,
        attachments: [],
        rubric: [],
        expectedAnswer: ''
      }
    ]);
  };

  const updateQuestion = (id, field, value) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const deleteQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const addRubricCriterion = (questionId) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          rubric: [...(q.rubric || []), {
            id: Date.now(),
            name: '',
            description: '',
            maxPoints: 0
          }]
        };
      }
      return q;
    }));
  };

  const updateRubricCriterion = (questionId, criterionId, field, value) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          rubric: q.rubric.map(r => r.id === criterionId ? { ...r, [field]: value } : r)
        };
      }
      return q;
    }));
  };

  const deleteRubricCriterion = (questionId, criterionId) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          rubric: q.rubric.filter(r => r.id !== criterionId)
        };
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
            <h2 className="text-2xl font-bold">Questões Abertas (Dissertativas)</h2>
            <p className="text-sm text-gray-600 mt-1">
              {questions.length} questão(ões) • Total: {totalPoints.toFixed(1)} pontos
              {maxScore && Math.abs(totalPoints - maxScore) > 0.1 && (
                <Badge variant="destructive" className="ml-2">
                  Meta: {maxScore} pontos
                </Badge>
              )}
            </p>
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
            {questions.map((question, index) => (
              <Card key={question.id} className="p-6 border-l-4 border-l-green-500">
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                    <Badge className="bg-green-100 text-green-700">Q{index + 1}</Badge>
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

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Pontuação *</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={question.points}
                          onChange={(e) => updateQuestion(question.id, 'points', parseFloat(e.target.value))}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Máx. Linhas</Label>
                        <Input
                          type="number"
                          placeholder="Ilimitado"
                          value={question.maxLines || ''}
                          onChange={(e) => updateQuestion(question.id, 'maxLines', e.target.value ? parseInt(e.target.value) : null)}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Máx. Caracteres</Label>
                        <Input
                          type="number"
                          placeholder="Ilimitado"
                          value={question.maxCharacters || ''}
                          onChange={(e) => updateQuestion(question.id, 'maxCharacters', e.target.value ? parseInt(e.target.value) : null)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Rubrica */}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <Label>Rubrica de Avaliação (Opcional)</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addRubricCriterion(question.id)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Adicionar Critério
                        </Button>
                      </div>

                      {question.rubric && question.rubric.length > 0 && (
                        <div className="space-y-3">
                          {question.rubric.map((criterion) => (
                            <div key={criterion.id} className="flex gap-3 p-3 bg-gray-50 rounded">
                              <div className="flex-1 space-y-2">
                                <Input
                                  placeholder="Nome do critério"
                                  value={criterion.name}
                                  onChange={(e) => updateRubricCriterion(question.id, criterion.id, 'name', e.target.value)}
                                />
                                <Input
                                  placeholder="Descrição"
                                  value={criterion.description}
                                  onChange={(e) => updateRubricCriterion(question.id, criterion.id, 'description', e.target.value)}
                                />
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="Pontos máximos"
                                  value={criterion.maxPoints}
                                  onChange={(e) => updateRubricCriterion(question.id, criterion.id, 'maxPoints', parseFloat(e.target.value))}
                                />
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteRubricCriterion(question.id, criterion.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Resposta Esperada */}
                    <div>
                      <Label>Resposta Esperada (Gabarito - Opcional)</Label>
                      <Textarea
                        placeholder="Digite uma resposta de referência para consulta durante correção..."
                        value={question.expectedAnswer}
                        onChange={(e) => updateQuestion(question.id, 'expectedAnswer', e.target.value)}
                        className="mt-1 min-h-[80px]"
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
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default OpenQuestions;
