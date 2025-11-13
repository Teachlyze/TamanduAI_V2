import { logger } from '@/shared/utils/logger';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MoreVertical, Edit, Copy, Eye, Download, Share2, Archive, Trash2, Users, FileText, CheckCircle } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu';
import { useToast } from '@/shared/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const ActivityListItemImproved = ({
  activity,
  selected,
  onSelect,
  onEdit,
  onDuplicate,
  onToggleFavorite,
  onArchive,
  onUnarchive,
  onDelete,
  onPreview,
  getTypeBadge
}) => {
  const { toast } = useToast();
  
  const getTypeBadgeColor = (type) => {
    const types = {
      open: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-600',
      assignment: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-600',
      closed: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
      quiz: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
      mixed: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
      project: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
    };
    return types[activity.type] || types.open;
  };

  const getStatusBadge = (status) => {
    const statuses = {
      published: { label: 'Publicada', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' },
      draft: { label: 'Rascunho', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-600' },
      archived: { label: 'Arquivada', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-600' }
    };
    const statusInfo = statuses[status] || statuses.draft;
    return <Badge className={cn("text-xs font-medium", statusInfo.color)}>{statusInfo.label}</Badge>;
  };

  return (
    <Card className={cn(
      "p-6 hover:shadow-xl transition-all duration-200 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 relative overflow-hidden",
      selected && "ring-2 ring-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20"
    )}>
      {/* Status Indicator Bar */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1 transition-colors",
        activity.status === 'published' ? 'bg-emerald-500' :
        activity.status === 'archived' ? 'bg-slate-400' :
        'bg-blue-400'
      )} />
      <div className="flex items-center gap-4">
        {/* Checkbox */}
        <Checkbox
          checked={selected}
          onCheckedChange={() => onSelect(activity.id)}
          className="flex-shrink-0"
        />

        {/* Informações Principais - Lado Esquerdo */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Linha 1: Título e Favorito */}
          <div className="flex items-start gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white line-clamp-1 flex-1">
              {activity.title}
            </h3>
            <button
              onClick={() => {
                logger.debug('[ActivityListItem] Botão Favorito clicado')
                logger.debug('[ActivityListItem] Activity ID:', activity.id)
                onToggleFavorite(activity.id);
              }}
              className="flex-shrink-0 text-slate-400 hover:text-amber-500 transition-colors"
            >
              <Star className={cn("w-4 h-4", activity.is_favorite && "fill-amber-500 text-amber-500")} />
            </button>
          </div>

          {/* Linha 2: Descrição */}
          {activity.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              {activity.description}
            </p>
          )}

          {/* Linha 3: Informações Compactas */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="font-medium">{activity.content?.questions?.length || 0} questões</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="font-medium">{activity.timesUsed || 0} turma(s)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <CheckCircle className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="font-medium">{activity.submittedCount || 0} envios</span>
            </div>
            {activity.created_at && (
              <div className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
                {format(new Date(activity.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </div>
            )}
          </div>
        </div>

        {/* Badges e Status - Meio */}
        <div className="flex flex-col items-center justify-center gap-2 px-6">
          <Badge className={cn("text-xs font-medium px-3 py-1", getTypeBadgeColor(activity.type))}>
            {getTypeBadge(activity.type)}
          </Badge>
          {getStatusBadge(activity.status)}
        </div>

        {/* Pontuação - Meio Direita */}
        <div className="flex flex-col items-center justify-center px-6 border-l border-slate-200 dark:border-slate-700">
          <div className="flex flex-col items-center">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1">Pontuação</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {activity.max_score || 100}
            </span>
          </div>
        </div>

        {/* Ações - Direita */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              logger.debug('[ActivityListItem] Botão Editar Principal clicado')
              logger.debug('[ActivityListItem] Activity:', activity)
              onEdit(activity);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 font-medium"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => {
                logger.debug('[ActivityListItem] Dropdown "Editar" clicado')
                logger.debug('[ActivityListItem] Activity:', activity)
                onEdit(activity);
              }}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                logger.debug('[ActivityListItem] Dropdown "Duplicar" clicado')
                logger.debug('[ActivityListItem] Activity:', activity)
                onDuplicate(activity);
              }}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                toast({ title: 'Em breve', description: 'Função de prévia será implementada em breve.' });
              }}>
                <Eye className="w-4 h-4 mr-2" />
                Ver Prévia
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async (e) => {
                e.stopPropagation();
                try {
                  const link = `${window.location.origin}/dashboard/activities/${activity.id}`;
                  await navigator.clipboard.writeText(link);
                  toast({ 
                    title: 'Link copiado',
                    description: 'O link da atividade foi copiado para a área de transferência.' 
                  });
                } catch (error) {
                  logger.error('Erro ao copiar:', error)
                  toast({ 
                    title: 'Erro',
                    description: 'Não foi possível copiar o link.',
                    variant: 'destructive'
                  });
                }
              }}>
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </DropdownMenuItem>
              {onPreview && (
                <DropdownMenuItem onClick={() => onPreview(activity)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Prévia
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async (e) => {
                e.stopPropagation();
                try {
                  // Exportar atividade como JSON
                  const activityData = JSON.stringify(activity, null, 2);
                  const blob = new Blob([activityData], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `atividade_${activity.title?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                  toast({ 
                    title: 'Atividade exportada',
                    description: 'Download iniciado.'
                  });
                } catch (error) {
                  logger.error('Erro ao exportar:', error)
                  toast({ 
                    title: 'Erro',
                    description: 'Não foi possível exportar a atividade.',
                    variant: 'destructive'
                  });
                }
              }}>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {activity.status === 'archived' ? (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onUnarchive(activity.id);
                }}>
                  <Archive className="w-4 h-4 mr-2" />
                  Desarquivar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onArchive(activity.id);
                }}>
                  <Archive className="w-4 h-4 mr-2" />
                  Arquivar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(activity);
                }}
                className="text-red-600 focus:text-red-600 dark:text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
};

export default ActivityListItemImproved;
