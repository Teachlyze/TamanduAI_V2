import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, FileText, Calendar, Clock, Shield, MoreVertical } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const SubmissionRow = ({ submission, onCorrect, isSelected, onSelect }) => {
  const getStatusBadge = (status) => {
    const statuses = {
      submitted: { label: 'Aguardando', color: 'bg-yellow-500 text-white' },
      graded: { label: 'Corrigida', color: 'bg-green-500 text-white' },
      needs_revision: { label: 'Revisão', color: 'bg-orange-500 text-white' }
    };
    return statuses[status] || statuses.submitted;
  };

  const getTypeBadge = (type) => {
    const types = {
      assignment: { label: 'Aberta', color: 'bg-green-100 text-green-700' },
      quiz: { label: 'Fechada', color: 'bg-blue-100 text-blue-700' },
      project: { label: 'Mista', color: 'bg-purple-100 text-purple-700' }
    };
    return types[type] || types.assignment;
  };

  const isLate = submission.submitted_at && submission.activity?.due_date &&
    new Date(submission.submitted_at) > new Date(submission.activity.due_date);

  const statusBadge = getStatusBadge(submission.status);
  const typeBadge = getTypeBadge(submission.activity?.type);

  return (
    <Card className={cn(
      "p-4 hover:shadow-md transition-all duration-200",
      submission.status === 'needs_review' && "border-l-4 border-l-red-500",
      isSelected && "ring-2 ring-blue-500 bg-blue-50"
    )}>
      <div className="flex items-center gap-4">
        {/* Checkbox de Seleção */}
        {onSelect && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
          />
        )}

        {/* Avatar do Aluno */}
        <div className="flex-shrink-0">
          {submission.student?.avatar_url ? (
            <img
              src={submission.student.avatar_url}
              alt={submission.student.full_name}
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
              {submission.student?.full_name?.[0] || 'A'}
            </div>
          )}
        </div>

        {/* Informações Principais */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Linha 1: Aluno e Atividade */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                {submission.student?.full_name || 'Aluno Desconhecido'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {submission.activity?.title || 'Atividade'}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge className={cn("text-xs", typeBadge.color)}>
                {typeBadge.label}
              </Badge>
              <Badge className={cn("text-xs", statusBadge.color)}>
                {statusBadge.label}
              </Badge>
            </div>
          </div>

          {/* Linha 2: Metadata */}
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {submission.submitted_at
                  ? format(new Date(submission.submitted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : 'Não submetida'}
              </span>
            </div>

            {isLate && (
              <Badge variant="destructive" className="text-xs">
                Atrasada
              </Badge>
            )}

            {submission.activity?.plagiarism_enabled && submission.plagiarism_score !== null && (
              <div className="flex items-center gap-1">
                <Shield className={cn(
                  "w-4 h-4",
                  submission.plagiarism_score >= 90 ? "text-green-600" :
                  submission.plagiarism_score >= 70 ? "text-yellow-600" :
                  "text-red-600"
                )} />
                <span>{submission.plagiarism_score}% original</span>
              </div>
            )}

            {submission.grade !== null && (
              <div className="font-semibold">
                Nota: {submission.grade}/{submission.activity?.max_score || 10}
              </div>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onCorrect}
            className={cn(
              submission.status === 'graded'
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-green-600 hover:bg-green-700"
            )}
          >
            {submission.status === 'graded' ? 'Revisar' : 'Corrigir'}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <FileText className="w-4 h-4 mr-2" />
                Ver Atividade
              </DropdownMenuItem>
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                Ver Perfil do Aluno
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
};

export default SubmissionRow;
