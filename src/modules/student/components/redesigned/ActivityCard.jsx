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
      <Card className="p-5 sm:p-6 border border-slate-200/60 dark:border-slate-700/60 transition-all duration-200 hover:shadow-xl hover:border-blue-500/50 dark:hover:border-blue-400/50 bg-white dark:bg-slate-900 cursor-pointer group overflow-hidden relative">
        {/* Status Indicator Bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 transition-colors ${
          isCompleted ? 'bg-emerald-500' :
          isLate ? 'bg-red-500' :
          isUrgent ? 'bg-amber-500' :
          'bg-blue-500'
        }`} />
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className={`p-2 rounded-lg ${
                isCompleted ? 'bg-emerald-50 dark:bg-emerald-950/30' :
                isLate ? 'bg-red-50 dark:bg-red-950/30' :
                isUrgent ? 'bg-amber-50 dark:bg-amber-950/30' :
                'bg-blue-50 dark:bg-blue-950/30'
              }`}>
                <FileText className={`w-5 h-5 ${
                  isCompleted ? 'text-emerald-600 dark:text-emerald-400' :
                  isLate ? 'text-red-600 dark:text-red-400' :
                  isUrgent ? 'text-amber-600 dark:text-amber-400' :
                  'text-blue-600 dark:text-blue-400'
                }`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight mb-1">
                  {activity.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {activity.class_name || activity.class?.name || 'Turma'}
                </p>
              </div>
            </div>
            
            
            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 dark:text-slate-400 mb-1">Prazo</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {format(dueDate, "dd/MM/yy", { locale: ptBR })}
                </span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 dark:text-slate-400 mb-1">Horário</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {format(dueDate, "HH:mm", { locale: ptBR })}
                </span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 dark:text-slate-400 mb-1">Pontos</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {activity.max_score}
                </span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status</span>
                {(submission?.grade !== null && submission?.grade !== undefined) ? (
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {submission.grade}/{activity.max_score}
                  </span>
                ) : hasSubmission ? (
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Entregue
                  </span>
                ) : isPending ? (
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Pendente
                  </span>
                ) : (
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    Atrasado
                  </span>
                )}
              </div>
            </div>
            
            {/* Status Message */}
            {isPending && hoursLeft >= 0 && (
              <div className={`p-2 rounded-lg text-sm font-medium ${
                isUrgent 
                  ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300' 
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {hoursLeft > 24 
                  ? `Faltam ${Math.floor(hoursLeft / 24)} dias para o prazo`
                  : hoursLeft > 1
                  ? `Faltam ${hoursLeft} horas para o prazo`
                  : minutesLeft > 0
                  ? `Últimos ${minutesLeft} minutos!`
                  : 'Prazo expirando!'}
              </div>
            )}
            
            {isLate && (
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/20 text-sm font-medium text-red-700 dark:text-red-300">
                Atrasado há {formatDistanceToNow(dueDate, { locale: ptBR })}
              </div>
            )}
            
          </div>
          
          {/* Botão de Ação */}
          <Button
            onClick={isCompleted ? onView : onStart}
            className={`w-full sm:w-auto whitespace-nowrap transition-all font-medium ${
              isCompleted 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            size="lg"
          >
            {isCompleted ? 'Ver Resultado' : 'Iniciar Atividade'}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};
