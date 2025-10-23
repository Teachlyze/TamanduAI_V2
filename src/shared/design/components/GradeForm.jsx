import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card } from '@/shared/components/ui/card';
import { colors, typography } from '../tokens';

/**
 * GradeForm - Formulário para dar nota e feedback
 * 
 * @param {number} maxGrade - Nota máxima
 * @param {number} initialGrade - Nota inicial
 * @param {string} initialFeedback - Feedback inicial
 * @param {function} onSave - Callback para salvar
 * @param {function} onCancel - Callback para cancelar
 * @param {boolean} loading - Estado de loading
 */
const GradeForm = ({
  maxGrade = 10,
  initialGrade = null,
  initialFeedback = '',
  onSave,
  onCancel,
  loading = false
}) => {
  const [grade, setGrade] = useState(initialGrade?.toString() || '');
  const [feedback, setFeedback] = useState(initialFeedback);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!grade || grade.trim() === '') {
      newErrors.grade = 'Nota é obrigatória';
    } else {
      const gradeNum = parseFloat(grade);
      if (isNaN(gradeNum)) {
        newErrors.grade = 'Nota deve ser um número';
      } else if (gradeNum < 0) {
        newErrors.grade = 'Nota não pode ser negativa';
      } else if (gradeNum > maxGrade) {
        newErrors.grade = `Nota não pode ser maior que ${maxGrade}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    const gradeNum = parseFloat(grade);
    onSave({ grade: gradeNum, feedback });
  };

  const handleGradeChange = (e) => {
    const value = e.target.value;
    
    // Permitir apenas números e ponto decimal
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setGrade(value);
      
      // Limpar erro ao digitar
      if (errors.grade) {
        setErrors({ ...errors, grade: null });
      }
    }
  };

  return (
    <Card className="p-6 bg-white dark:bg-slate-900">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Grade Input */}
        <div>
          <Label htmlFor="grade" className="text-sm font-semibold mb-2 block">
            Nota (0 - {maxGrade})
          </Label>
          <div className="relative">
            <Input
              id="grade"
              type="text"
              value={grade}
              onChange={handleGradeChange}
              placeholder={`Ex: ${(maxGrade / 2).toFixed(1)}`}
              className={`text-lg font-semibold ${
                errors.grade ? 'border-red-500 focus:ring-red-500' : ''
              }`}
              disabled={loading}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              / {maxGrade}
            </span>
          </div>
          {errors.grade && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.grade}
            </p>
          )}

          {/* Grade Visual Indicator */}
          {grade && !isNaN(parseFloat(grade)) && (
            <div className="mt-2">
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    parseFloat(grade) >= maxGrade * 0.7
                      ? 'bg-green-500'
                      : parseFloat(grade) >= maxGrade * 0.5
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((parseFloat(grade) / maxGrade) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Feedback Textarea */}
        <div>
          <Label htmlFor="feedback" className="text-sm font-semibold mb-2 block">
            Feedback (opcional)
          </Label>
          <textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Escreva um feedback para o aluno..."
            rows={6}
            disabled={loading}
            className={`
              w-full px-3 py-2 rounded-lg border ${colors.border.default}
              bg-white dark:bg-slate-900 ${colors.text.primary}
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              resize-none transition-all
            `}
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            {feedback.length} caracteres
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Nota
              </>
            )}
          </Button>

          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
};

export default GradeForm;
