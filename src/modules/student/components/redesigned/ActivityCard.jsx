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
      whileHover={{ scale: 1.02, y: -2 }}
    >
      <Card className={`p-6 border-2 transition-all hover:shadow-lg ${
        isLate ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20' :
        isUrgent ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20' :
        isCompleted ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' :
        'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header com Status Icon */}
            <div className="flex items-center gap-2 mb-2">
              {isLate && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
              {isUrgent && !isLate && <Clock className="w-5 h-5 text-orange-600 flex-shrink-0 animate-pulse" />}
              {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />}
              <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
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
              <Badge variant={
                activity.type === 'objective' ? 'default' :
                activity.type === 'open' ? 'secondary' :
                'outline'
              }>
                {activity.type === 'objective' ? '📝 Objetiva' :
                 activity.type === 'open' ? '✍️ Aberta' :
                 activity.type === 'mixed' ? '🎯 Mista' :
                 '📄 Atividade'}
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
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  ⭐ {submission.grade}/{activity.max_score}
                </Badge>
              )}
              
              {/* Indicador de Entregue (sem nota ainda) */}
              {hasSubmission && !submission?.grade && (
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  ✅ Entregue
                </Badge>
              )}
            </div>
            
            {/* Tempo Restante (para pendentes) */}
            {isPending && hoursLeft >= 0 && (
              <div className={`text-sm font-medium mt-2 ${
                isUrgent ? 'text-orange-600' : 'text-blue-600'
              }`}>
                {hoursLeft > 24 
                  ? `⏰ Faltam ${Math.floor(hoursLeft / 24)} dias`
                  : hoursLeft > 1
                  ? `⏰ Faltam ${hoursLeft} horas`
                  : minutesLeft > 0
                  ? `⏰ Faltam ${minutesLeft} minutos`
                  : '⏰ Prazo expirando!'}
              </div>
            )}
            
            {/* Mensagem de Atrasado */}
            {isLate && (
              <div className="text-sm font-medium text-red-600 mt-2">
                ⚠️ Atrasado há {formatDistanceToNow(dueDate, { locale: ptBR })}
              </div>
            )}
            
            {/* Feedback (se concluída) */}
            {isCompleted && (submission?.feedback || activity.feedback) && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm text-slate-700 dark:text-slate-300 border border-blue-200 dark:border-blue-800">
                💬 {submission?.feedback || activity.feedback}
              </div>
            )}
          </div>
          
          {/* Botão de Ação */}
          <Button
            onClick={isCompleted ? onView : onStart}
            className={`whitespace-nowrap ${
              isCompleted 
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700' 
                : isLate
                ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
            } text-white shadow-md`}
            size="lg"
          >
            {isCompleted ? 'Ver' : isLate ? 'Fazer' : 'Começar'}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};
