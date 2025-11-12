import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Clock, AlertCircle, CheckCircle2, FileText, Target } from 'lucide-react';
import { format, formatDistanceToNow, differenceInHours, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const ActivityCard = ({ activity, onStart, onView, index = 0 }) => {
  // Usar os campos computados no loadClassData ou calcular localmente
  const isPending = activity.isPending ?? (activity.status === 'pending' || activity.status === 'not_submitted');
  const isLate = activity.isLate ?? (activity.status === 'late' || activity.status === 'overdue');
  const isCompleted = activity.isCompleted ?? (activity.status === 'completed' || activity.status === 'submitted' || activity.status === 'graded');
  const hasSubmission = activity.hasSubmission ?? false;
  const submission = activity.submission || null;
  
  // Calcular tempo restante
  const dueDate = new Date(activity.due_date);
  const now = new Date();
  const hoursLeft = differenceInHours(dueDate, now);
  const minutesLeft = differenceInMinutes(dueDate, now);
  const isUrgent = hoursLeft <= 24 && hoursLeft >= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ 
        scale: 1.02, 
        y: -4,
        transition: { 
          type: "spring", 
          stiffness: 400, 
          damping: 25 
        }
      }}
    >
      <Card className="p-6 border border-slate-200 dark:border-slate-700 transition-all duration-300 hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-slate-900 cursor-pointer group">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header com Status Icon */}
            <div className="flex items-center gap-2 mb-2">
              {isLate && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
              {isUrgent && !isLate && <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />}
              {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {activity.title}
              </h3>
            </div>
            
            {/* Turma */}
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              {activity.class_name || activity.class?.name || 'Turma'}
            </p>
            
            {/* Info Row */}
            <div className="flex items-center gap-3 flex-wrap mb-2">
              {/* Tipo */}
              <Badge variant="outline" className="text-xs">
                {activity.type === 'objective' ? 'Objetiva' :
                 activity.type === 'open' ? 'Aberta' :
                 activity.type === 'mixed' ? 'Mista' :
                 'Atividade'}
              </Badge>
              
              {/* Prazo */}
              <span className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                <Clock className="w-4 h-4" />
                {format(dueDate, "dd/MM 'às' HH:mm", { locale: ptBR })}
              </span>
              
              {/* Pontos */}
              <span className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                <Target className="w-4 h-4" />
                {activity.max_score} pts
              </span>
              
              {/* Nota (se já corrigida) */}
              {(submission?.grade !== null && submission?.grade !== undefined) && (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs">
                  {submission.grade}/{activity.max_score}
                </Badge>
              )}
              
              {/* Indicador de Entregue (sem nota ainda) */}
              {hasSubmission && !submission?.grade && (
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs">
                  Entregue
                </Badge>
              )}
            </div>
            
            {/* Tempo Restante (para pendentes) */}
            {isPending && hoursLeft >= 0 && (
              <div className={`text-sm font-medium mt-2 flex items-center gap-1 ${
                isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                {hoursLeft > 24 
                  ? `Faltam ${Math.floor(hoursLeft / 24)} dias`
                  : hoursLeft > 1
                  ? `Faltam ${hoursLeft} horas`
                  : minutesLeft > 0
                  ? `Faltam ${minutesLeft} minutos`
                  : 'Prazo expirando!'}
              </div>
            )}
            
            {/* Mensagem de Atrasado */}
            {isLate && (
              <div className="text-sm font-medium text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Atrasado há {formatDistanceToNow(dueDate, { locale: ptBR })}
              </div>
            )}
            
            {/* Feedback (se concluída) */}
            {isCompleted && (submission?.feedback || activity.feedback) && (
              <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Feedback</p>
                {submission?.feedback || activity.feedback}
              </div>
            )}
          </div>
          
          {/* Botão de Ação */}
          <Button
            onClick={isCompleted ? onView : onStart}
            className="whitespace-nowrap transition-all group-hover:scale-105"
            variant={isCompleted ? "outline" : "default"}
            size="default"
          >
            {isCompleted ? 'Ver' : 'Fazer'}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};
