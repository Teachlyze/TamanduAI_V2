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
      <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer group">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          {/* Student Info */}
          <div className="flex items-center gap-3 transition-transform duration-300 group-hover:translate-x-1">
            {student?.avatar ? (
              <img
                src={student.avatar}
                alt={student.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                {student?.name?.[0] || 'A'}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white transition-colors duration-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {valueOrEmpty(student?.name)}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 transition-colors duration-300 group-hover:text-slate-700 dark:group-hover:text-slate-300">
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
              className="flex-1 transition-all duration-300 hover:scale-105 hover:shadow-md"
            >
              <FileText className="w-4 h-4 mr-2" />
              Ver Submissão
            </Button>
          )}
          
          {status === 'pending' && onGrade && (
            <Button
              size="sm"
              onClick={() => onGrade(submission)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Corrigir
            </Button>
          )}
          
          {status === 'graded' && onView && (
            <Button
              size="sm"
              onClick={() => onView(submission)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Ver Correção
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

export default SubmissionCard;
