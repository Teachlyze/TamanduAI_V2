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
      open: 'bg-green-500 text-white',
      assignment: 'bg-green-500 text-white',
      closed: 'bg-blue-500 text-white',
      quiz: 'bg-blue-500 text-white',
      mixed: 'bg-purple-500 text-white',
      project: 'bg-purple-500 text-white'
    };
    return types[activity.type] || types.open;
  };

  const getStatusBadge = (status) => {
    const statuses = {
      published: { label: 'Publicada', color: 'bg-emerald-500 text-white' },
      draft: { label: 'Rascunho', color: 'bg-gray-400 text-white' },
      archived: { label: 'Arquivada', color: 'bg-slate-400 text-white' }
    };
    const statusInfo = statuses[status] || statuses.draft;
    return <Badge className={cn("text-xs font-medium", statusInfo.color)}>{statusInfo.label}</Badge>;
  };

  return (
    <Card className={cn(
      "p-5 hover:shadow-lg transition-all duration-200 bg-white dark:bg-slate-800 border-l-4",
      selected ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30 border-l-blue-500" : "border-l-transparent hover:border-l-blue-400"
    )}>
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
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 line-clamp-1 flex-1">
              {activity.title}
            </h3>
            <button
              onClick={() => {
                logger.debug('[ActivityListItem] ⭐ Botão Favorito clicado')
                logger.debug('[ActivityListItem] Activity ID:', activity.id)
                onToggleFavorite(activity.id);
              }}
              className="flex-shrink-0 text-gray-400 hover:text-yellow-500 transition-colors"
            >
              <Star className={cn("w-4 h-4", activity.is_favorite && "fill-yellow-500 text-yellow-500")} />
            </button>
          </div>

          {/* Linha 2: Descrição */}
          {activity.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {activity.description}
            </p>
          )}

          {/* Linha 3: Informações Compactas com ícones maiores */}
          <div className="flex items-center gap-5 text-sm">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-medium">{activity.content?.questions?.length || 0} questões</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30">
                <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="font-medium">{activity.timesUsed || 0} turma(s)</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <div className="p-1.5 rounded-md bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="font-medium">{activity.submittedCount || 0} envios</span>
            </div>
            {activity.created_at && (
              <div className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                {format(new Date(activity.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </div>
            )}
          </div>
        </div>

        {/* Badges e Status - Meio */}
        <div className="flex flex-col items-center justify-center gap-2 px-4 border-l border-r border-gray-200 dark:border-gray-700">
          <Badge className={cn("text-xs font-bold px-4 py-1.5 shadow-sm", getTypeBadgeColor(activity.type))}>
            {getTypeBadge(activity.type)}
          </Badge>
          {getStatusBadge(activity.status)}
        </div>

        {/* Pontuação - Meio Direita */}
        <div className="flex flex-col items-center justify-center px-6">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border border-amber-200 dark:border-amber-700">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {activity.max_score || 100}
            </span>
          </div>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">pontos</span>
        </div>

        {/* Ações - Direita */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              logger.debug('[ActivityListItem] ✏️ Botão Editar Principal clicado')
              logger.debug('[ActivityListItem] Activity:', activity)
              onEdit(activity);
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 shadow-md hover:shadow-lg"
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
                logger.debug('[ActivityListItem] ✏️ Dropdown "Editar" clicado')
                logger.debug('[ActivityListItem] Activity:', activity)
                onEdit(activity);
              }}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                logger.debug('[ActivityListItem] 📋 Dropdown "Duplicar" clicado')
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
                    title: ' Link copiado!',
                    description: 'O link da atividade foi copiado para a área de transferência.' 
                  });
                } catch (error) {
                  logger.error('Erro ao copiar:', error)
                  toast({ 
                    title: ' Erro',
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
                    title: '✅ Atividade exportada!',
                    description: 'Download iniciado.'
                  });
                } catch (error) {
                  logger.error('Erro ao exportar:', error)
                  toast({ 
                    title: '❌ Erro',
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
