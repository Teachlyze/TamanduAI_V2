import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MoreVertical, Edit, Copy, Eye, Download, Share2, Archive, Trash2, Users, FileText } from 'lucide-react';
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
  onDelete,
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
      "p-4 hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-800",
      selected && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30"
    )}>
      <div className="flex items-center gap-4">
        {/* Checkbox */}
        <Checkbox
          checked={selected}
          onCheckedChange={() => onSelect(activity.id)}
          className="flex-shrink-0"
        />

        {/* Informações Principais - Lado Esquerdo */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Linha 1: Título e Favorito */}
          <div className="flex items-start gap-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 flex-1">
              {activity.title}
            </h3>
            <button
              onClick={() => onToggleFavorite(activity.id)}
              className="flex-shrink-0 text-gray-400 hover:text-yellow-500 transition-colors"
            >
              <Star className={cn("w-4 h-4", activity.is_favorite && "fill-yellow-500 text-yellow-500")} />
            </button>
          </div>

          {/* Linha 2: Descrição */}
          {activity.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
              {activity.description}
            </p>
          )}

          {/* Linha 3: Informações Compactas */}
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>{activity.content?.questions?.length || 0} questões</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{activity.timesUsed || 0} turma(s)</span>
            </div>
            <div className="text-xs">
              {activity.submittedCount || 0} envios
            </div>
            {activity.created_at && (
              <div className="text-xs">
                {format(new Date(activity.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </div>
            )}
          </div>
        </div>

        {/* Badges e Status - Meio */}
        <div className="flex flex-col items-center gap-2 px-4">
          <Badge className={cn("text-xs font-semibold px-3 py-1", getTypeBadgeColor(activity.type))}>
            {getTypeBadge(activity.type)}
          </Badge>
          {getStatusBadge(activity.status)}
        </div>

        {/* Pontuação - Meio Direita */}
        <div className="flex flex-col items-center px-4">
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {activity.max_score || 100}
          </span>
          <span className="text-xs text-gray-500">pontos</span>
        </div>

        {/* Ações - Direita */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => onEdit(activity)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            Postar
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit(activity)}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(activity)}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                toast({ title: 'Em breve', description: 'Função de prévia será implementada em breve.' });
              }}>
                <Eye className="w-4 h-4 mr-2" />
                Ver Prévia
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                toast({ title: 'Em breve', description: 'Função de exportação será implementada em breve.' });
              }}>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                toast({ title: 'Em breve', description: 'Função de compartilhamento será implementada em breve.' });
              }}>
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onArchive(activity.id)}>
                <Archive className="w-4 h-4 mr-2" />
                Arquivar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-red-600 focus:text-red-600"
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
