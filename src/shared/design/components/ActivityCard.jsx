import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Users, ChevronRight, AlertCircle } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { components, valueOrEmpty } from '../tokens';

/**
 * ActivityCard - Card de atividade reutilizável
 */
const ActivityCard = ({ 
  id,
  title,
  className,
  dueDate,
  status = 'active',
  submissionCount = 0,
  totalStudents = 0,
  priority = 'normal',
  delay = 0,
  onClick,
  actionLabel = 'Ver Atividade',
  onAction
}) => {
  const statusColors = {
    active: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    closed: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
  };

  const priorityColors = {
    low: 'text-slate-500',
    normal: 'text-blue-500',
    high: 'text-amber-500',
    urgent: 'text-red-500'
  };

  const isOverdue = dueDate && new Date(dueDate) < new Date();
  const daysUntilDue = dueDate ? Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card 
        className={`p-6 ${components.card.interactive} bg-white dark:bg-slate-900 border-l-4 border-l-blue-500`}
        onClick={onClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              {valueOrEmpty(title)}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {valueOrEmpty(className, 'Sem turma')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isOverdue && (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <Badge className={statusColors[status]}>
              {status === 'active' ? 'Ativa' : status === 'completed' ? 'Concluída' : status === 'pending' ? 'Pendente' : 'Fechada'}
            </Badge>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Due Date */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className={`w-4 h-4 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`} />
            <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-600 dark:text-slate-400'}>
              {dueDate ? (
                <>
                  {new Date(dueDate).toLocaleDateString('pt-BR')}
                  {daysUntilDue !== null && (
                    <span className="ml-1">
                      ({daysUntilDue <= 0 ? 'Vencida' : `${daysUntilDue}d`})
                    </span>
                  )}
                </>
              ) : (
                'Sem prazo'
              )}
            </span>
          </div>

          {/* Submissions */}
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Users className="w-4 h-4" />
            <span>{submissionCount}/{totalStudents} entregues</span>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className={`w-4 h-4 ${priorityColors[priority]}`} />
            <span className={`capitalize ${priorityColors[priority]}`}>
              {priority === 'low' ? 'Baixa' : priority === 'normal' ? 'Normal' : priority === 'high' ? 'Alta' : 'Urgente'}
            </span>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span>{totalStudents > 0 ? Math.round((submissionCount / totalStudents) * 100) : 0}% de progresso</span>
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onAction?.();
          }}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white inline-flex items-center justify-center gap-2"
        >
          {actionLabel}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </Card>
    </motion.div>
  );
};

export default ActivityCard;
