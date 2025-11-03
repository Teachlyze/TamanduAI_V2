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
      open: 'bg-green-100 text-green-700',
      assignment: 'bg-green-100 text-green-700',
      closed: 'bg-blue-100 text-blue-700',
      quiz: 'bg-blue-100 text-blue-700',
      mixed: 'bg-purple-100 text-purple-700',
      project: 'bg-purple-100 text-purple-700'
    };
    return types[activity.type] || types.open;
  };

  return (
    <Card className="group h-full hover:shadow-xl transition-all duration-300 overflow-hidden border-t-4 border-t-blue-500">
      {/* Header */}
      <div className="relative p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
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
              className="text-gray-400 hover:text-yellow-500 transition-colors"
            >
              <Star className={cn("w-5 h-5", activity.is_favorite && "fill-yellow-500 text-yellow-500")} />
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
                  toast({ title: 'Em breve', description: 'Prévia em desenvolvimento.' });
                }}>
                  <Eye className="w-4 h-4 mr-2" />
                  Prévia
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  const shareUrl = `${window.location.origin}/dashboard/activities/${activity.id}`;
                  navigator.clipboard.writeText(shareUrl);
                  toast({ 
                    title: 'Link copiado!', 
                    description: 'O link da atividade foi copiado para a área de transferência.' 
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
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 line-clamp-2 mb-3 min-h-[56px]">
          {activity.title}
        </h3>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4 min-h-[60px]">
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
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 text-sm text-gray-600">
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
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all"
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
