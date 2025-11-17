/**
 * ActivityCard - Card moderno para exibição de atividades
 * Usado na página de turma do aluno
 */

import React, { memo } from 'react';
import { Calendar, Clock, Award, ChevronRight } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import StatusBadge from './StatusBadge';
import { cn } from '@/lib/utils';
import { format, isPast, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ActivityCard = memo(({ activity, onClick, className }) => {
  const { id, title, description, due_date, status, grade, max_score } = activity;

  // Determinar status visual
  const getActivityStatus = () => {
    if (status === 'graded') return 'graded';
    if (status === 'submitted') return 'submitted';
    if (due_date && isPast(new Date(due_date))) return 'late';
    return 'pending';
  };

  const activityStatus = getActivityStatus();
  const dueDate = due_date ? new Date(due_date) : null;
  const isUrgent = dueDate && differenceInHours(dueDate, new Date()) < 24 && activityStatus === 'pending';

  // Configuração de cores por status
  const statusColors = {
    pending: 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800',
    submitted: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800',
    graded: 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800',
    late: 'from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-red-200 dark:border-red-800'
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        'group relative p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border-2',
        'bg-gradient-to-br',
        statusColors[activityStatus],
        isUrgent && 'ring-2 ring-red-500 ring-offset-2',
        className
      )}
    >
      {/* Badge de status no canto */}
      <div className="absolute -top-2 -right-2 z-10">
        <StatusBadge
          status={activityStatus}
          size="sm"
          score={status === 'graded' ? grade : undefined}
          maxScore={max_score || 10}
        />
      </div>

      {/* Urgente badge */}
      {isUrgent && (
        <div className="absolute -top-2 -left-2 z-10">
          <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse flex items-center gap-1">
            <Clock className="w-3 h-3" />
            URGENTE
          </div>
        </div>
      )}

      {/* Decoração de fundo */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/50 to-transparent dark:from-white/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Conteúdo */}
      <div className="relative space-y-3">
        {/* Título */}
        <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-2 pr-16">
          {title}
        </h3>

        {/* Descrição */}
        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
            {description}
          </p>
        )}

        {/* Informações */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          {/* Data de entrega */}
          {dueDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className={cn(
                "font-medium",
                activityStatus === 'late' && "text-red-600 dark:text-red-400",
                isUrgent && "text-red-600 dark:text-red-400 font-bold"
              )}>
                {activityStatus === 'late' ? 'Atrasada desde' : 'Prazo:'} {format(dueDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          )}

          {/* Nota (se corrigida) */}
          {status === 'graded' && grade !== null && (
            <div className="flex items-center gap-2 text-sm">
              <Award className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="font-bold text-green-700 dark:text-green-400">
                Nota: {grade}/{max_score || 10}
              </span>
            </div>
          )}
        </div>

        {/* Botão "Ver detalhes" */}
        <div className="flex items-center justify-between pt-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {activityStatus === 'pending' && 'Clique para responder'}
            {activityStatus === 'submitted' && 'Aguardando correção'}
            {activityStatus === 'graded' && 'Ver feedback'}
            {activityStatus === 'late' && 'Responder (atrasada)'}
          </span>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </Card>
  );
});

ActivityCard.displayName = 'ActivityCard';

export default ActivityCard;
