import React from 'react';
import { Card } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Switch } from '@/shared/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Slider } from '@/shared/components/ui/slider';

const AdvancedSettings = ({ settings, setSettings, activityType }) => {
  const updateSetting = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <Card className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Configurações Avançadas</h2>

      {/* Envio Atrasado */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <h3 className="font-semibold">Envio Atrasado</h3>
        <div className="flex items-center justify-between">
          <div>
            <Label>Permitir Envio Atrasado</Label>
            <p className="text-xs text-gray-500">Alunos poderão submeter após o prazo</p>
          </div>
          <Switch
            checked={settings.allowLateSubmission}
            onCheckedChange={(checked) => updateSetting('allowLateSubmission', checked)}
          />
        </div>

        {settings.allowLateSubmission && (
          <div className="grid grid-cols-3 gap-4 pl-4 border-l-2 border-gray-300">
            <div>
              <Label>Tipo de Penalidade</Label>
              <Select value={settings.latePenaltyType} onValueChange={(v) => updateSetting('latePenaltyType', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentual</SelectItem>
                  <SelectItem value="points">Pontos Fixos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor da Penalidade</Label>
              <Input
                type="number"
                value={settings.latePenaltyValue}
                onChange={(e) => updateSetting('latePenaltyValue', parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Máximo de Dias Atrasados</Label>
              <Input
                type="number"
                value={settings.maxLateDays}
                onChange={(e) => updateSetting('maxLateDays', parseInt(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Múltiplas Tentativas (apenas para fechadas) */}
      {(activityType === 'closed' || activityType === 'quiz' || activityType === 'mixed') && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h3 className="font-semibold">Múltiplas Tentativas</h3>
          <div className="flex items-center justify-between">
            <div>
              <Label>Permitir Múltiplas Tentativas</Label>
              <p className="text-xs text-gray-500">Alunos podem refazer a atividade</p>
            </div>
            <Switch
              checked={settings.allowMultipleAttempts}
              onCheckedChange={(checked) => updateSetting('allowMultipleAttempts', checked)}
            />
          </div>

          {settings.allowMultipleAttempts && (
            <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-gray-300">
              <div>
                <Label>Máximo de Tentativas</Label>
                <Input
                  type="number"
                  min="1"
                  value={settings.maxAttempts}
                  onChange={(e) => updateSetting('maxAttempts', parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Considerar</Label>
                <Select value={settings.attemptScoring} onValueChange={(v) => updateSetting('attemptScoring', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="best">Melhor Nota</SelectItem>
                    <SelectItem value="last">Última Nota</SelectItem>
                    <SelectItem value="average">Média</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tempo Limite */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <h3 className="font-semibold">Tempo Limite</h3>
        <div>
          <Label>Tempo Máximo (minutos)</Label>
          <Input
            type="number"
            placeholder="Ilimitado"
            value={settings.timeLimit || ''}
            onChange={(e) => updateSetting('timeLimit', e.target.value ? parseInt(e.target.value) : null)}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">Deixe vazio para sem limite</p>
        </div>
      </div>

      {/* Visualização de Notas e Gabarito */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <h3 className="font-semibold">Feedback e Gabarito</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Mostrar nota imediatamente</Label>
            <Switch
              checked={settings.showScoreImmediately}
              onCheckedChange={(checked) => updateSetting('showScoreImmediately', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Mostrar gabarito após submissão</Label>
            <Switch
              checked={settings.showAnswerKey}
              onCheckedChange={(checked) => updateSetting('showAnswerKey', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Liberar gabarito após prazo</Label>
            <Switch
              checked={settings.releaseAnswerAfterDeadline}
              onCheckedChange={(checked) => updateSetting('releaseAnswerAfterDeadline', checked)}
            />
          </div>
        </div>
      </div>

      {/* Antiplágio (apenas para abertas) */}
      {(activityType === 'open' || activityType === 'assignment' || activityType === 'mixed') && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h3 className="font-semibold">Antiplágio</h3>
          <div className="flex items-center justify-between">
            <div>
              <Label>Ativar Detecção de Antiplágio</Label>
              <p className="text-xs text-gray-500">Verificar originalidade das respostas</p>
            </div>
            <Switch
              checked={settings.plagiarismEnabled}
              onCheckedChange={(checked) => updateSetting('plagiarismEnabled', checked)}
            />
          </div>

          {settings.plagiarismEnabled && (
            <div className="space-y-4 pl-4 border-l-2 border-gray-300">
              <div>
                <Label>Sensibilidade</Label>
                <Select value={settings.plagiarismSensitivity} onValueChange={(v) => updateSetting('plagiarismSensitivity', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Originalidade Mínima: {settings.plagiarismMinOriginality}%</Label>
                <Slider
                  value={[settings.plagiarismMinOriginality]}
                  onValueChange={(value) => updateSetting('plagiarismMinOriginality', value[0])}
                  min={0}
                  max={100}
                  step={5}
                  className="mt-2"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Randomização */}
      {(activityType === 'closed' || activityType === 'quiz' || activityType === 'mixed') && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h3 className="font-semibold">Randomização</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Embaralhar Questões</Label>
                <p className="text-xs text-gray-500">Cada aluno vê ordem diferente</p>
              </div>
              <Switch
                checked={settings.shuffleQuestions}
                onCheckedChange={(checked) => updateSetting('shuffleQuestions', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Embaralhar Alternativas</Label>
                <p className="text-xs text-gray-500">Ordem aleatória das opções</p>
              </div>
              <Switch
                checked={settings.shuffleAlternatives}
                onCheckedChange={(checked) => updateSetting('shuffleAlternatives', checked)}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AdvancedSettings;
