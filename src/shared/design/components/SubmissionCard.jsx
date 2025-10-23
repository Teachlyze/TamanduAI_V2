import React from 'react';
import { motion } from 'framer-motion';
import { User, Calendar, Clock, FileText, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { components, valueOrEmpty } from '../tokens';

/**
 * SubmissionCard - Card de submissão de aluno
 * 
 * @param {Object} submission - Dados da submissão
 * @param {function} onView - Callback para visualizar
 * @param {function} onGrade - Callback para corrigir
 * @param {number} delay - Delay da animação
 * @param {boolean} expanded - Se está expandido
 */
const SubmissionCard = ({
  submission,
  onView,
  onGrade,
  delay = 0,
  expanded = false
}) => {
  const {
    id,
    student,
    activity,
    submittedAt,
    status = 'pending',
    grade,
    feedback,
    isLate = false
  } = submission;

  const statusConfig = {
    pending: {
      icon: Clock,
      label: 'Pendente',
      color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
      iconColor: 'text-amber-600 dark:text-amber-400'
    },
    graded: {
      icon: CheckCircle2,
      label: 'Corrigida',
      color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      iconColor: 'text-green-600 dark:text-green-400'
    },
    late: {
      icon: AlertCircle,
      label: 'Atrasada',
      color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      iconColor: 'text-red-600 dark:text-red-400'
    }
  };

  const currentStatus = isLate ? 'late' : status;
  const config = statusConfig[currentStatus] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className={`p-6 ${components.card.hover} bg-white dark:bg-slate-900`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          {/* Student Info */}
          <div className="flex items-center gap-3">
            {student?.avatar ? (
              <img
                src={student.avatar}
                alt={student.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                {student?.name?.[0] || 'A'}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {valueOrEmpty(student?.name)}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {valueOrEmpty(activity?.title)}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <Badge className={config.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Submitted At */}
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Calendar className="w-4 h-4" />
            <span>
              {submittedAt 
                ? new Date(submittedAt).toLocaleDateString('pt-BR')
                : 'Não enviada'
              }
            </span>
          </div>

          {/* Grade */}
          {status === 'graded' && grade !== null && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                Nota: {grade.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Expanded Content */}
        {expanded && feedback && (
          <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Feedback:
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {feedback}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onView && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(submission)}
              className="flex-1"
            >
              <FileText className="w-4 h-4 mr-2" />
              Ver Submissão
            </Button>
          )}
          
          {status === 'pending' && onGrade && (
            <Button
              size="sm"
              onClick={() => onGrade(submission)}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Corrigir
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

export default SubmissionCard;
