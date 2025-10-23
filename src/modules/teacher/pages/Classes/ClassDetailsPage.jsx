import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, MessageSquare, Heart, Eye, Pin, Trash2, Users, FileText, Award } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import {
  DashboardHeader,
  StatsCard,
  FilterBar,
  EmptyState,
  gradients
} from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { ClassService } from '@/shared/services/classService';
import { useAuth } from '@/shared/hooks/useAuth';

const ClassDetailsPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [filters, setFilters] = useState({ type: null });
  const [stats, setStats] = useState({
    members: 0,
    activities: 0,
    posts: 0
  });

  useEffect(() => {
    loadData();
  }, [classId]);

  useEffect(() => {
    applyFilters();
  }, [posts, filters]);

  const loadData = async () => {
    try {
      setLoading(true);

      const classInfo = await ClassService.getClassById(classId);
      setClassData(classInfo);

      // Get class stats
      const classStats = await ClassService.getClassStats(classId);

      // Mock posts (implementar quando houver tabela discussions)
      const mockPosts = [
        {
          id: '1',
          type: 'announcement',
          title: 'Bem-vindos à turma!',
          content: 'Olá pessoal! Sejam bem-vindos à nossa turma. Estou animado para começar esse semestre com vocês.',
          author: { id: user?.id, name: user?.name || 'Professor', avatar: user?.avatar_url },
          isPinned: true,
          views: 45,
          likes: 12,
          comments: 3,
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          type: 'activity',
          title: 'Nova atividade disponível',
          content: 'A atividade "Exercícios Cap. 1" já está disponível. Prazo: 30/10/2025',
          author: { id: user?.id, name: user?.name || 'Professor', avatar: user?.avatar_url },
          isPinned: false,
          views: 38,
          likes: 8,
          comments: 5,
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }
      ];

      setPosts(mockPosts);

      setStats({
        members: classStats.studentCount + classStats.teacherCount,
        activities: classStats.activitiesCount,
        posts: mockPosts.length
      });

    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (!filters.type) {
      setFilteredPosts(posts);
      return;
    }

    setFilteredPosts(posts.filter(p => p.type === filters.type));
  };

  const getTypeIcon = (type) => {
    const icons = {
      announcement: MessageSquare,
      activity: FileText,
      material: FileText,
      link: Award,
      question: MessageSquare
    };
    return icons[type] || MessageSquare;
  };

  const getTypeColor = (type) => {
    const colors = {
      announcement: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      activity: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      material: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      link: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
      question: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    };
    return colors[type] || colors.announcement;
  };

  const getTypeLabel = (type) => {
    const labels = {
      announcement: 'Anúncio',
      activity: 'Atividade',
      material: 'Material',
      link: 'Link',
      question: 'Pergunta'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/teacher/classes')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Turmas
      </Button>

      <DashboardHeader
        title={classData?.name || 'Turma'}
        subtitle={classData?.subject || 'Mural da turma'}
        role="teacher"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Membros"
          value={stats.members}
          icon={Users}
          gradient={gradients.stats.students}
          onClick={() => navigate(`/teacher/classes/${classId}/members`)}
          delay={0}
        />
        <StatsCard
          title="Atividades"
          value={stats.activities}
          icon={FileText}
          gradient={gradients.stats.activities}
          onClick={() => navigate(`/teacher/classes/${classId}/activities`)}
          delay={0.1}
        />
        <StatsCard
          title="Posts no Mural"
          value={stats.posts}
          icon={MessageSquare}
          gradient={gradients.primary}
          delay={0.2}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Button
          variant="outline"
          onClick={() => navigate(`/teacher/classes/${classId}/members`)}
          className="h-auto py-4 flex flex-col gap-2"
        >
          <Users className="w-5 h-5" />
          <span className="text-sm">Membros</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(`/teacher/classes/${classId}/activities`)}
          className="h-auto py-4 flex flex-col gap-2"
        >
          <FileText className="w-5 h-5" />
          <span className="text-sm">Atividades</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(`/teacher/classes/${classId}/grades`)}
          className="h-auto py-4 flex flex-col gap-2"
        >
          <Award className="w-5 h-5" />
          <span className="text-sm">Notas</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(`/teacher/classes/${classId}/edit`)}
          className="h-auto py-4 flex flex-col gap-2"
        >
          <FileText className="w-5 h-5" />
          <span className="text-sm">Editar</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex justify-between items-center mb-8">
        <FilterBar
          filters={[
            {
              key: 'type',
              label: 'Tipo',
              options: [
                { value: 'announcement', label: '📢 Anúncios' },
                { value: 'activity', label: '📝 Atividades' },
                { value: 'material', label: '📚 Materiais' },
                { value: 'link', label: '🔗 Links' },
                { value: 'question', label: '❓ Perguntas' }
              ]
            }
          ]}
          activeFilters={filters}
          onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
          onClearAll={() => setFilters({ type: null })}
        />

        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Criar Post
        </Button>
      </div>

      {/* Posts Feed */}
      {filteredPosts.length > 0 ? (
        <div className="space-y-6">
          {filteredPosts.map((post, index) => {
            const TypeIcon = getTypeIcon(post.type);
            
            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-6 bg-white dark:bg-slate-900 hover:shadow-lg transition-shadow">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {post.author.avatar ? (
                        <img src={post.author.avatar} alt={post.author.name} className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {post.author.name[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {post.author.name}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          {new Date(post.createdAt).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={getTypeColor(post.type)}>
                        {getTypeLabel(post.type)}
                      </Badge>
                      {post.isPinned && (
                        <Pin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    {post.title}
                  </h3>
                  <p className="text-slate-700 dark:text-slate-300 mb-4">
                    {post.content}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                      <Eye className="w-4 h-4" />
                      {post.views}
                    </button>
                    <button className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400">
                      <Heart className="w-4 h-4" />
                      {post.likes}
                    </button>
                    <button className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400">
                      <MessageSquare className="w-4 h-4" />
                      {post.comments}
                    </button>
                    <div className="flex-1" />
                    <button className="text-sm text-slate-600 dark:text-slate-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={MessageSquare}
          title={filters.type ? 'Nenhum post deste tipo' : 'Nenhum post ainda'}
          description={filters.type ? 'Ajuste os filtros.' : 'Crie o primeiro post no mural.'}
          actionLabel="Criar Post"
          actionIcon={Plus}
          action={() => {}}
        />
      )}
    </div>
  );
};

export default ClassDetailsPage;
