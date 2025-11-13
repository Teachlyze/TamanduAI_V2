import React from 'react';
import { Star, MoreVertical, Edit, Copy, Eye, Users, TrendingUp, Share2, Archive } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu';
import { useToast } from '@/shared/components/ui/use-toast';
import { cn } from '@/lib/utils';

const ActivityGridCard = ({ activity, onEdit, onToggleFavorite, onDuplicate, onArchive, onUnarchive, getTypeBadge, navigate }) => {
  const { toast } = useToast();
  const getTypeBadgeColor = (type) => {
    const types = {
      open: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-600',
      assignment: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-600',
      closed: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
      quiz: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
      mixed: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
      project: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
    };
    return types[activity.type] || types.open;
  };

  const getStatusColor = () => {
    if (activity.status === 'published') return 'bg-emerald-500';
    if (activity.status === 'archived') return 'bg-slate-400';
    return 'bg-blue-400';
  };

  return (
    <Card className="group h-full hover:shadow-xl transition-all duration-200 overflow-hidden relative bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60">
      {/* Status Bar */}
      <div className={cn("absolute top-0 left-0 right-0 h-1", getStatusColor())} />
      
      {/* Header */}
      <div className="relative p-5">
        <div className="flex items-start justify-between">
          <Badge className={getTypeBadgeColor(activity.type)}>
            {getTypeBadge(activity.type)}
          </Badge>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(activity.id);
              }}
              className="text-slate-400 hover:text-amber-500 transition-colors"
            >
              <Star className={cn("w-5 h-5", activity.is_favorite && "fill-amber-500 text-amber-500")} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(activity); }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate && onDuplicate(activity); }}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  toast({ title: 'Em breve', description: 'Prévia em desenvolvimento' });
                }}>
                  <Eye className="w-4 h-4 mr-2" />
                  Prévia
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  const shareUrl = `${window.location.origin}/dashboard/activities/${activity.id}`;
                  navigator.clipboard.writeText(shareUrl);
                  toast({ 
                    title: 'Link copiado', 
                    description: 'O link da atividade foi copiado para a área de transferência' 
                  });
                }}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartilhar
                </DropdownMenuItem>
                {activity.status === 'archived' ? (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onUnarchive && onUnarchive(activity.id);
                  }}>
                    <Archive className="w-4 h-4 mr-2" />
                    Desarquivar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onArchive && onArchive(activity.id);
                  }}>
                    <Archive className="w-4 h-4 mr-2" />
                    Arquivar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white line-clamp-2 mb-3 min-h-[56px]">
          {activity.title}
        </h3>
        
        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-4 min-h-[60px]">
          {activity.description || 'Sem descrição'}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {activity.content?.tags?.slice(0, 2).map((tag, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              #{tag}
            </Badge>
          ))}
          {activity.content?.tags?.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{activity.content.tags.length - 2}
            </Badge>
          )}
        </div>

        {/* Footer com informações */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1" title="Questões">
              <Eye className="w-4 h-4" />
              <span>{activity.content?.questions?.length || 0}</span>
            </div>
            <div className="flex items-center gap-1" title="Pontos">
              <TrendingUp className="w-4 h-4" />
              <span>{activity.max_score}</span>
            </div>
            <div className="flex items-center gap-1" title="Usos">
              <Users className="w-4 h-4" />
              <span>{activity.timesUsed}x</span>
            </div>
          </div>
          
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => navigate(`/dashboard/activities/${activity.id}/edit`)}
          >
            <Edit className="w-4 h-4 mr-1" />
            Editar
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ActivityGridCard;
