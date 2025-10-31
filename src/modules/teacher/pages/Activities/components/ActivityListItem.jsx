import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MoreVertical, Edit, Copy, Eye, Download, Share2, Archive, Trash2, Clock, Users, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu';
import { useToast } from '@/shared/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const ActivityListItem = ({
  activity,
  selected,
  onSelect,
  onEdit,
  onDuplicate,
  onToggleFavorite,
  onArchive,
  onDelete,
  onExpand,
  isExpanded,
  getTypeBadge
}) => {
  const { toast } = useToast();
  
  const getTypeBadgeColor = (type) => {
    const types = {
      open: 'bg-green-100 text-green-700 dark:bg-green-900/30',
      assignment: 'bg-green-100 text-green-700 dark:bg-green-900/30',
      closed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
      quiz: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
      mixed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30',
      project: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30'
    };
    return types[activity.type] || types.open;
  };

  const getStatusBadge = (status) => {
    const statuses = {
      published: { label: 'Publicada', color: 'bg-emerald-100 text-emerald-700' },
      draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
      archived: { label: 'Arquivada', color: 'bg-slate-100 text-slate-700' }
    };
    const statusInfo = statuses[status] || statuses.draft;
    return <Badge variant="outline" className={statusInfo.color}>{statusInfo.label}</Badge>;
  };

  return (
    <Card className={cn(
      "p-6 hover:shadow-lg transition-all duration-200",
      selected && "ring-2 ring-blue-500"
    )}>
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <Checkbox
          checked={selected}
          onCheckedChange={() => onSelect(activity.id)}
          className="mt-1"
        />

        {/* Conteúdo Principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            {/* Coluna 1: Informações Principais */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {activity.title}
                </h3>
                <button
                  onClick={() => onToggleFavorite(activity.id)}
                  className="text-gray-400 hover:text-yellow-500 transition-colors"
                >
                  <Star className={cn("w-5 h-5", activity.is_favorite && "fill-yellow-500 text-yellow-500")} />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                {activity.description || 'Sem descrição'}
              </p>

              <div className="flex flex-wrap gap-2">
                {activity.content?.tags?.slice(0, 3).map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
                {activity.content?.tags?.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{activity.content.tags.length - 3}
                  </Badge>
                )}
              </div>
            </div>

            {/* Coluna 2: Tipo e Configuração */}
            <div className="flex flex-col items-end gap-2 min-w-[150px]">
              <Badge className={getTypeBadgeColor(activity.type)}>
                {getTypeBadge(activity.type)}
              </Badge>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {activity.content?.questions?.length || 0} questões
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {activity.max_score} pontos
              </div>
            </div>

            {/* Coluna 3: Uso e Status */}
            <div className="flex flex-col items-end gap-2 min-w-[150px]">
              {getStatusBadge(activity.status)}
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{activity.timesUsed} turma(s)</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <TrendingUp className="w-4 h-4" />
                <span>{activity.submittedCount} envios</span>
              </div>
              {activity.created_at && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {format(new Date(activity.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </div>
              )}
            </div>

            {/* Coluna 4: Ações */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => onEdit(activity)}
              >
                Postar
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
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
                  <DropdownMenuItem onClick={onExpand}>
                    <Eye className="w-4 h-4 mr-2" />
                    {isExpanded ? 'Fechar' : 'Ver'} Prévia
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

              <Button
                variant="ghost"
                size="icon"
                onClick={onExpand}
              >
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Preview Expandido */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"
              >
                <div className="space-y-4">
                  {/* Informações Completas */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Informações Completas
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Tipo:</span>
                        <span className="ml-2 font-medium">{getTypeBadge(activity.type)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Pontuação:</span>
                        <span className="ml-2 font-medium">{activity.max_score} pontos</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Questões:</span>
                        <span className="ml-2 font-medium">{activity.content?.questions?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Peso:</span>
                        <span className="ml-2 font-medium">{activity.weight || 1.0}</span>
                      </div>
                    </div>
                    {activity.instructions && (
                      <div className="mt-3">
                        <span className="text-gray-600 text-sm">Instruções:</span>
                        <p className="text-sm text-gray-800 dark:text-gray-300 mt-1">
                          {activity.instructions}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Histórico de Uso */}
                  {activity.assignments && activity.assignments.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Histórico de Uso
                      </h4>
                      <div className="space-y-2">
                        {activity.assignments.map((assignment, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded">
                            <span className="font-medium">{assignment.class?.name}</span>
                            <span className="text-gray-600">
                              {format(new Date(assignment.assigned_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Estatísticas */}
                  {activity.submittedCount > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Estatísticas
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                          <div className="text-xs text-gray-600">Submissões</div>
                          <div className="text-xl font-bold text-blue-600">{activity.submittedCount}</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                          <div className="text-xs text-gray-600">Média</div>
                          <div className="text-xl font-bold text-green-600">{activity.avgGrade}</div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded">
                          <div className="text-xs text-gray-600">Taxa</div>
                          <div className="text-xl font-bold text-purple-600">
                            {activity.submittedCount > 0 ? '100%' : '0%'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
};

export default ActivityListItem;
