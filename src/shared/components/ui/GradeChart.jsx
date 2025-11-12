/**
 * GradeChart - Gráfico comparativo de notas
 * Design limpo e profissional com gráfico de colunas vertical
 */

import React, { memo } from 'react';
import { TrendingUp, User, Users, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const GradeChart = memo(({ studentGrade, classAverage, maxGrade = 100, className }) => {
  const studentPercentage = (studentGrade / maxGrade) * 100;
  const averagePercentage = (classAverage / maxGrade) * 100;
  const performance = studentGrade - classAverage;
  const isAboveAverage = performance > 0;
  
  // Cores simples e profissionais
  const getBarColor = (percentage) => {
    if (percentage >= 90) return 'bg-emerald-500';
    if (percentage >= 70) return 'bg-blue-500';
    if (percentage >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const studentBarColor = getBarColor(studentPercentage);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Cards de Notas - Layout Simples */}
      <div className="grid grid-cols-2 gap-4">
        {/* Sua nota */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Sua Nota
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-900 dark:text-white">
              {studentGrade.toFixed(1)}
            </span>
            <span className="text-lg text-slate-500 dark:text-slate-400">
              / {maxGrade}
            </span>
          </div>
        </div>

        {/* Média da turma */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Média da Turma
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-900 dark:text-white">
              {classAverage.toFixed(1)}
            </span>
            <span className="text-lg text-slate-500 dark:text-slate-400">
              / {maxGrade}
            </span>
          </div>
        </div>
      </div>

      {/* Gráfico de Colunas Vertical */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
            Comparação de Notas
          </h4>
        </div>

        <div className="flex items-end justify-center gap-12 h-64 pb-16">
          {/* Coluna: Sua Nota */}
          <div className="flex flex-col items-center w-28">
            <div className="relative w-full h-48 mb-3">
              <div 
                className={cn(
                  'absolute bottom-0 w-full rounded-t-lg transition-all duration-1000 flex items-end justify-center pb-2',
                  studentBarColor
                )}
                style={{ height: `${Math.max(studentPercentage, 5)}%` }}
              >
                <span className="text-white font-bold text-base drop-shadow-lg">
                  {studentGrade.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Você</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {studentPercentage.toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Coluna: Média da Turma */}
          <div className="flex flex-col items-center w-28">
            <div className="relative w-full h-48 mb-3">
              <div 
                className="absolute bottom-0 w-full bg-slate-400 dark:bg-slate-600 rounded-t-lg transition-all duration-1000 flex items-end justify-center pb-2"
                style={{ height: `${Math.max(averagePercentage, 5)}%` }}
              >
                <span className="text-white font-bold text-base drop-shadow-lg">
                  {classAverage.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Turma</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {averagePercentage.toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Análise de Performance */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-start gap-4">
          <div className={cn(
            'p-2.5 rounded-lg',
            isAboveAverage 
              ? 'bg-emerald-100 dark:bg-emerald-900/30' 
              : performance === 0
              ? 'bg-blue-100 dark:bg-blue-900/30'
              : 'bg-amber-100 dark:bg-amber-900/30'
          )}>
            <TrendingUp className={cn(
              'w-6 h-6',
              isAboveAverage 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : performance === 0
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-amber-600 dark:text-amber-400',
              !isAboveAverage && performance !== 0 && 'rotate-180'
            )} />
          </div>
          
          <div className="flex-1">
            <p className={cn(
              'text-base font-semibold mb-1',
              isAboveAverage 
                ? 'text-emerald-700 dark:text-emerald-400' 
                : performance === 0
                ? 'text-blue-700 dark:text-blue-400'
                : 'text-amber-700 dark:text-amber-400'
            )}>
              {isAboveAverage ? (
                <>Você está {Math.abs(performance).toFixed(1)} pontos acima da média</>
              ) : performance === 0 ? (
                <>Você está na média da turma</>
              ) : (
                <>Você está {Math.abs(performance).toFixed(1)} pontos abaixo da média</>
              )}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isAboveAverage 
                ? 'Parabéns! Continue assim!' 
                : performance === 0
                ? 'Continue estudando para superar a média!'
                : 'Continue se esforçando!'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

GradeChart.displayName = 'GradeChart';

export default GradeChart;
