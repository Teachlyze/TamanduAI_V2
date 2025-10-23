import React from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, BookOpen, ChevronRight } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { components, animations, valueOrEmpty } from '../tokens';

/**
 * ClassCard - Card de turma reutilizável
 */
const ClassCard = ({ 
  id,
  name,
  subject,
  teacher,
  studentCount = 0,
  status = 'active',
  color = 'from-blue-500 to-indigo-500',
  delay = 0,
  onClick,
  actionLabel = 'Ver Turma',
  onAction
}) => {
  const statusColors = {
    active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    inactive: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    archived: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card 
        className={`overflow-hidden ${components.card.interactive} bg-white dark:bg-slate-900`}
        onClick={onClick}
      >
        {/* Header com Gradiente */}
        <div className={`h-24 bg-gradient-to-r ${color} relative overflow-hidden`}>
          <div className="absolute inset-0 bg-grid-white/[0.05]" />
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Título e Status */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                {valueOrEmpty(name)}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {valueOrEmpty(subject, 'Sem disciplina')}
              </p>
            </div>
            <Badge className={statusColors[status]}>
              {status === 'active' ? 'Ativa' : status === 'inactive' ? 'Inativa' : 'Arquivada'}
            </Badge>
          </div>

          {/* Info */}
          <div className="space-y-2 mb-6 text-sm text-slate-600 dark:text-slate-400">
            {teacher && (
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>{teacher}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{studentCount} aluno{studentCount !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onAction?.();
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white inline-flex items-center justify-center gap-2"
          >
            {actionLabel}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

export default ClassCard;
