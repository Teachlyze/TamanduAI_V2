import React from 'react';
import { Star, MoreVertical, Edit, Copy, Eye, Users, TrendingUp } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu';
import { useToast } from '@/shared/components/ui/use-toast';
import { cn } from '@/lib/utils';

const ActivityGridCard = ({ activity, onEdit, onToggleFavorite, onDuplicate, getTypeBadge, navigate }) => {
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
    <Card className="group h-full hover:shadow-xl transition-all duration-200 overflow-hidden">
      {/* Header */}
      <div className="relative p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
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
                <DropdownMenuItem onClick={() => onEdit(activity)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate && onDuplicate(activity)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  toast({ title: 'Em breve', description: 'Prévia em desenvolvimento.' });
                }}>
                  <Eye className="w-4 h-4 mr-2" />
                  Prévia
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 mb-2 min-h-[56px]">
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
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate(`/teacher/activities/${activity.id}`)}
          >
            Postar
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ActivityGridCard;
