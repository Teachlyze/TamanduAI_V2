import React, { useEffect, useState } from 'react';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Slider } from '@/shared/components/ui/slider';

const RubricScoring = ({ rubric, scores, onChange, onTotalChange }) => {
  const [localScores, setLocalScores] = useState({});

  useEffect(() => {
    // Inicializar scores locais
    const initial = {};
    rubric?.criteria?.forEach(criterion => {
      const existing = scores.find(s => s.rubricId === criterion.id);
      initial[criterion.id] = existing?.score || 0;
    });
    setLocalScores(initial);
  }, [rubric, scores]);

  useEffect(() => {
    // Calcular total e notificar pai
    const total = Object.values(localScores).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    onTotalChange(total);
  }, [localScores, onTotalChange]);

  const handleScoreChange = (criterionId, value) => {
    setLocalScores(prev => ({
      ...prev,
      [criterionId]: value
    }));

    // Atualizar scores no pai
    const newScores = rubric.criteria.map(criterion => ({
      rubricId: criterion.id,
      score: criterion.id === criterionId ? parseFloat(value) || 0 : localScores[criterion.id] || 0
    }));
    onChange(newScores);
  };

  if (!rubric || !rubric.criteria) {
    return (
      <div className="text-gray-600 text-sm">
        Esta atividade não possui rubrica configurada.
      </div>
    );
  }

  const total = Object.values(localScores).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

  return (
    <div className="space-y-4">
      {rubric.criteria.map((criterion) => (
        <Card key={criterion.id} className="p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold">{criterion.name}</h4>
                {criterion.description && (
                  <p className="text-sm text-gray-600 mt-1">{criterion.description}</p>
                )}
              </div>
              <div className="text-right ml-4">
                <div className="text-sm text-gray-500">Máximo</div>
                <div className="font-semibold">{criterion.maxScore}</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Slider
                value={[localScores[criterion.id] || 0]}
                onValueChange={([value]) => handleScoreChange(criterion.id, value)}
                max={criterion.maxScore}
                step={0.1}
                className="flex-1"
              />
              <Input
                type="number"
                min="0"
                max={criterion.maxScore}
                step="0.1"
                value={localScores[criterion.id] || 0}
                onChange={(e) => handleScoreChange(criterion.id, e.target.value)}
                className="w-20 text-center"
              />
            </div>

            {criterion.levels && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {criterion.levels.map((level, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleScoreChange(criterion.id, (level.percentage / 100) * criterion.maxScore)}
                  >
                    <div className="font-semibold">{level.level}</div>
                    <div className="text-gray-600">{level.percentage}% - {level.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      ))}

      <Card className="p-4 bg-blue-50 dark:bg-blue-950/30">
        <div className="flex justify-between items-center">
          <div className="font-semibold text-lg">Nota Total</div>
          <div className="text-2xl font-bold text-blue-600">
            {total.toFixed(1)} / {rubric.criteria.reduce((sum, c) => sum + c.maxScore, 0)}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RubricScoring;
