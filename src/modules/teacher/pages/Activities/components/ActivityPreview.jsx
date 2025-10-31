import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';
import { Clock, TrendingUp, BookOpen } from 'lucide-react';

const ActivityPreview = ({ activity, onClose }) => {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prévia da Atividade</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Cabeçalho */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Badge>{activity.type}</Badge>
              <Badge variant="outline">{activity.difficulty}</Badge>
              {activity.estimatedTime && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  {activity.estimatedTime} min
                </div>
              )}
            </div>
            <h1 className="text-3xl font-bold mb-2">{activity.title || 'Sem título'}</h1>
            <p className="text-gray-600">{activity.description || 'Sem descrição'}</p>
          </div>

          {/* Informações */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-600">Disciplina</span>
              </div>
              <p className="font-semibold">{activity.subject || 'Não definida'}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-600">Pontuação</span>
              </div>
              <p className="font-semibold">{activity.maxScore} pontos</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-600">Questões</span>
              </div>
              <p className="font-semibold">{activity.questions?.length || 0} questões</p>
            </Card>
          </div>

          {/* Tags */}
          {activity.tags && activity.tags.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Tópicos</h3>
              <div className="flex flex-wrap gap-2">
                {activity.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary">#{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Questões */}
          <div>
            <h3 className="font-semibold mb-4">Questões</h3>
            {activity.questions && activity.questions.length > 0 ? (
              <div className="space-y-6">
                {activity.questions.map((question, idx) => (
                  <Card key={idx} className="p-6">
                    <div className="flex items-start gap-3 mb-3">
                      <Badge>{idx + 1}</Badge>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">
                            {question.type === 'open' ? 'Dissertativa' : 'Múltipla Escolha'}
                          </Badge>
                          <span className="text-sm font-semibold text-gray-600">
                            {question.points} ponto(s)
                          </span>
                        </div>
                        <p className="text-gray-900 whitespace-pre-wrap">{question.text}</p>
                      </div>
                    </div>

                    {/* Alternativas (se fechada) */}
                    {question.type === 'closed' && question.alternatives && (
                      <div className="space-y-2 mt-4 pl-8">
                        {question.alternatives.map((alt) => (
                          <div key={alt.id} className="flex items-start gap-2 p-2 rounded hover:bg-gray-50">
                            <span className="font-semibold text-gray-600">{alt.letter})</span>
                            <span className={alt.isCorrect ? 'font-semibold text-green-600' : ''}>
                              {alt.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Limites (se aberta) */}
                    {question.type === 'open' && (question.maxLines || question.maxCharacters) && (
                      <div className="mt-3 text-sm text-gray-600 pl-8">
                        {question.maxLines && <p>Máximo de {question.maxLines} linhas</p>}
                        {question.maxCharacters && <p>Máximo de {question.maxCharacters} caracteres</p>}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-gray-500">Nenhuma questão adicionada</p>
            )}
          </div>

          {/* Configurações avançadas */}
          {activity.advancedSettings && (
            <div>
              <h3 className="font-semibold mb-3">Configurações</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {activity.advancedSettings.allowLateSubmission && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Permite envio atrasado</span>
                  </div>
                )}
                {activity.advancedSettings.allowMultipleAttempts && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Múltiplas tentativas: {activity.advancedSettings.maxAttempts}</span>
                  </div>
                )}
                {activity.advancedSettings.timeLimit && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>Tempo limite: {activity.advancedSettings.timeLimit} min</span>
                  </div>
                )}
                {activity.advancedSettings.plagiarismEnabled && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Antiplágio ativado</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityPreview;
