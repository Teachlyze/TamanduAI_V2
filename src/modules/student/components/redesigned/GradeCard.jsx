import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Star, MessageSquare, Calendar, Target } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const GradeCard = ({ grade, onViewDetails, index = 0 }) => {
  const percentage = (parseFloat(grade.grade) / parseFloat(grade.max_score)) * 100;
  
  const getGradeColor = (percent) => {
    if (percent >= 90) return 'text-green-600';
    if (percent >= 70) return 'text-blue-600';
    if (percent >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeBadge = (percent) => {
    if (percent >= 90) return { text: '🌟 Excelente', className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' };
    if (percent >= 70) return { text: '👍 Bom', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' };
    if (percent >= 50) return { text: '📚 Regular', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' };
    return { text: '💪 Precisa Melhorar', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' };
  };

  const gradeInfo = getGradeBadge(percentage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02, y: -2 }}
    >
      <Card className="p-4 sm:p-6 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all hover:shadow-lg">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Atividade */}
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">
              {grade.activity_title || 'Atividade'}
            </h3>

            {/* Turma */}
            {grade.class_name && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                {grade.class_name}
              </p>
            )}

            {/* Nota e Badge */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Star className={`w-5 h-5 ${getGradeColor(percentage)}`} />
                <span className={`text-xl sm:text-2xl font-bold ${getGradeColor(percentage)}`}>
                  {grade.grade}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  / {grade.max_score}
                </span>
              </div>
              <Badge className={gradeInfo.className}>
                {gradeInfo.text}
              </Badge>
            </div>

            {/* Barra de Progresso */}
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={`h-2 rounded-full ${
                  percentage >= 90 ? 'bg-green-600' :
                  percentage >= 70 ? 'bg-blue-600' :
                  percentage >= 50 ? 'bg-yellow-600' :
                  'bg-red-600'
                }`}
              />
            </div>

            {/* Meta e Data */}
            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
              {grade.submitted_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(grade.submitted_at), "dd 'de' MMMM", { locale: ptBR })}
                </span>
              )}
              {percentage && (
                <span className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  {percentage.toFixed(0)}%
                </span>
              )}
            </div>

            {/* Feedback do Professor */}
            {grade.feedback && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Feedback do Professor:
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 break-words whitespace-pre-wrap max-w-full overflow-hidden">
                      {grade.feedback}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botão Ver Detalhes */}
          {onViewDetails && (
            <Button
              onClick={onViewDetails}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto whitespace-nowrap flex-shrink-0"
            >
              Ver Detalhes
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
