/**
 * GradeChart - Gráfico comparativo de notas
 * Usado para mostrar nota do aluno vs média da turma
 */

import React, { memo } from 'react';
import { TrendingUp, Award, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const GradeChart = memo(({ studentGrade, classAverage, maxGrade = 100, className }) => {
  const studentPercentage = (studentGrade / maxGrade) * 100;
  const averagePercentage = (classAverage / maxGrade) * 100;
  
  // Determinar cor baseado na nota
  const getGradeColor = (percentage) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-blue-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const studentColor = getGradeColor(studentPercentage);
  const averageColor = 'bg-slate-400';

  // Performance relativa
  const performance = studentGrade - classAverage;
  const isAboveAverage = performance > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Estatísticas */}
      <div className="grid grid-cols-2 gap-4">
        {/* Sua nota */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Sua Nota</span>
          </div>
          <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
            {studentGrade.toFixed(1)}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            de {maxGrade} pontos
          </p>
        </div>

        {/* Média da turma */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Média da Turma</span>
          </div>
          <p className="text-3xl font-bold text-slate-700 dark:text-slate-400">
            {classAverage.toFixed(1)}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            de {maxGrade} pontos
          </p>
        </div>
      </div>

      {/* Gráfico de barras */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Comparativo Visual
        </h4>
        
        {/* Sua nota */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Você</span>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {studentPercentage.toFixed(0)}%
            </span>
          </div>
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-1000 ease-out',
                studentColor,
                'flex items-center justify-end pr-3'
              )}
              style={{ width: `${studentPercentage}%` }}
            >
              <span className="text-xs font-bold text-white drop-shadow-lg">
                {studentGrade}
              </span>
            </div>
          </div>
        </div>

        {/* Média da turma */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Turma</span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {averagePercentage.toFixed(0)}%
            </span>
          </div>
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-1000 ease-out',
                averageColor,
                'flex items-center justify-end pr-3'
              )}
              style={{ width: `${averagePercentage}%` }}
            >
              <span className="text-xs font-bold text-white drop-shadow-lg">
                {classAverage.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance */}
      <div className={cn(
        'p-4 rounded-xl border-2',
        isAboveAverage 
          ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
          : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            isAboveAverage ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
          )}>
            <TrendingUp className={cn(
              'w-5 h-5',
              isAboveAverage ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400',
              !isAboveAverage && 'rotate-180'
            )} />
          </div>
          <div>
            <p className={cn(
              'text-sm font-semibold',
              isAboveAverage ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'
            )}>
              {isAboveAverage ? (
                <>Você está {Math.abs(performance).toFixed(1)} pontos acima da média! 🎉</>
              ) : performance === 0 ? (
                <>Você está na média da turma</>
              ) : (
                <>Você está {Math.abs(performance).toFixed(1)} pontos abaixo da média</>
              )}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {isAboveAverage 
                ? 'Parabéns! Continue assim!' 
                : 'Continue se esforçando, você consegue!'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Estrelas de desempenho */}
      <div className="flex items-center justify-center gap-1 pt-2">
        {[...Array(5)].map((_, i) => {
          const starThreshold = (i + 1) * 20;
          const isFilled = studentPercentage >= starThreshold;
          return (
            <span
              key={i}
              className={cn(
                'text-2xl transition-all duration-300',
                isFilled ? 'opacity-100 scale-110' : 'opacity-30 scale-100'
              )}
            >
              ⭐
            </span>
          );
        })}
      </div>
    </div>
  );
});

GradeChart.displayName = 'GradeChart';

export default GradeChart;
