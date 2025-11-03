/**
 * StatusBadge - Badge colorido para status de atividades
 * Usado nas páginas do aluno
 */

import React from 'react';
import { Clock, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig = {
  pending: {
    label: 'Pendente',
    icon: Clock,
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-300 dark:border-amber-700',
    emoji: '🟡'
  },
  submitted: {
    label: 'Enviada',
    icon: Send,
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-300 dark:border-blue-700',
    emoji: '🔵'
  },
  graded: {
    label: 'Corrigida',
    icon: CheckCircle,
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-green-300 dark:border-green-700',
    emoji: '🟢'
  },
  late: {
    label: 'Atrasada',
    icon: AlertCircle,
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-300 dark:border-red-700',
    emoji: '🔴'
  }
};

const sizeConfig = {
  sm: {
    container: 'px-2 py-0.5 text-xs gap-1',
    icon: 'w-3 h-3'
  },
  md: {
    container: 'px-3 py-1 text-sm gap-1.5',
    icon: 'w-4 h-4'
  },
  lg: {
    container: 'px-4 py-2 text-base gap-2',
    icon: 'w-5 h-5'
  }
};

export const StatusBadge = ({ status = 'pending', size = 'md', score, className, showEmoji = true }) => {
  const config = statusConfig[status] || statusConfig.pending;
  const sizeClasses = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-semibold border-2 transition-all',
        config.bg,
        config.text,
        config.border,
        sizeClasses.container,
        className
      )}
    >
      {showEmoji && <span>{config.emoji}</span>}
      <Icon className={sizeClasses.icon} />
      <span>{config.label}</span>
      {status === 'graded' && score !== undefined && (
        <span className="ml-1 font-bold">• {score}/100</span>
      )}
    </div>
  );
};

export default StatusBadge;
