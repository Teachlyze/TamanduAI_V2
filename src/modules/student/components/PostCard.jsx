import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Send, Trash2 } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/components/ui/use-toast';

const PostCard = ({ post, onUpdate }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  // Carregar likes e comentários no mount
  useEffect(() => {
    loadLikesAndCommentsCount();
  }, [post.id]);

  useEffect(() => {
    if (showComments) {
      loadCommentsAndLikes();
    }
  }, [showComments]);

  const loadLikesAndCommentsCount = async () => {
    try {
      // Buscar likes
      const { data: likes } = await supabase
        .from('post_likes')
        .select('user_id')
        .eq('post_id', post.id);

      setLikesCount(likes?.length || 0);
      setLiked(likes?.some(l => l.user_id === user.id) || false);

      // Buscar contagem de comentários (apenas count, não os dados)
      const { count } = await supabase
        .from('post_comments')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', post.id);

      setCommentsCount(count || 0);
    } catch (error) {
      logger.error('Erro ao carregar contagens:', error);
    }
  };

  const loadCommentsAndLikes = async () => {
    try {
      setLoadingComments(true);

      // Buscar likes
      const { data: likes } = await supabase
        .from('post_likes')
        .select('user_id')
        .eq('post_id', post.id);

      setLikesCount(likes?.length || 0);
      setLiked(likes?.some(l => l.user_id === user.id) || false);

      // Buscar comentários
      const { data: commentsData } = await supabase
        .from('post_comments')
        .select('id, content, created_at, author_id')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (commentsData) {
        // Buscar autores dos comentários
        const authorIds = [...new Set(commentsData.map(c => c.author_id))];
        const { data: users } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', authorIds);

        const usersMap = {};
        users?.forEach(u => { usersMap[u.id] = u; });

        const commentsWithAuthors = commentsData.map(c => ({
          ...c,
          author: usersMap[c.author_id]
        }));

        setComments(commentsWithAuthors);
      }
    } catch (error) {
      logger.error('Erro ao carregar interações:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleLike = async () => {
    try {
      if (liked) {
        // Remover like
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);

        if (error) throw error;

        setLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        // Adicionar like - usar upsert para evitar erro 409
        const { error } = await supabase
          .from('post_likes')
          .upsert({
            post_id: post.id,
            user_id: user.id
          }, {
            onConflict: 'post_id,user_id',
            ignoreDuplicates: false
          });

        // Se erro 409 (já existe), ignorar
        if (error && error.code !== '23505') {
          throw error;
        }

        setLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error) {
      // Erro 409 é esperado quando já curtiu
      if (error.code === '23505' || error.message?.includes('duplicate')) {
        logger.debug('Like já existe (esperado)');
        return;
      }
      
      logger.error('Erro ao curtir:', error);
      toast({
        title: '❌ Erro',
        description: 'Não foi possível curtir o post',
        variant: 'destructive'
      });
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.id,
          author_id: user.id,
          content: newComment.trim()
        })
        .select()
        .single();

      if (error) throw error;

      // Adicionar comentário à lista
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', user.id)
        .single();

      setComments(prev => [...prev, {
        ...data,
        author: userData
      }]);
      setCommentsCount(prev => prev + 1);

      setNewComment('');

      toast({
        title: '✅ Comentário enviado!',
        description: 'Seu comentário foi publicado'
      });
    } catch (error) {
      logger.error('Erro ao comentar:', error);
      toast({
        title: '❌ Erro',
        description: 'Não foi possível enviar o comentário',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId)
        .eq('author_id', user.id);

      setComments(prev => prev.filter(c => c.id !== commentId));
      setCommentsCount(prev => Math.max(0, prev - 1));

      toast({
        title: '✅ Comentário removido',
        description: 'Seu comentário foi deletado'
      });
    } catch (error) {
      logger.error('Erro ao deletar comentário:', error);
      toast({
        title: '❌ Erro',
        description: 'Não foi possível deletar o comentário',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="p-6">
      {/* Header do Post */}
      <div className="flex items-start gap-4 mb-4">
        <Avatar className="w-12 h-12">
          <AvatarImage src={post.creator?.avatar_url || post.author?.avatar_url} />
          <AvatarFallback>
            {(post.creator?.full_name || post.author?.full_name || 'P')[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {post.creator?.full_name || post.author?.full_name || 'Professor'}
            </h3>
            <Badge variant="secondary">Professor</Badge>
            <span className="text-sm text-slate-500">
              {formatDistanceToNow(new Date(post.created_at), {
                locale: ptBR,
                addSuffix: true
              })}
            </span>
          </div>
          {post.title && (
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
              {post.title}
            </h4>
          )}
          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {post.content || post.description}
          </p>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className={liked ? 'text-red-600' : ''}
        >
          <Heart className={`w-5 h-5 mr-2 ${liked ? 'fill-current' : ''}`} />
          {likesCount > 0 && <span className="ml-1">{likesCount}</span>}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          {commentsCount > 0 && <span className="ml-1">{commentsCount}</span>}
        </Button>
      </div>

      {/* Comentários */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
          {/* Lista de Comentários */}
          {loadingComments ? (
            <p className="text-sm text-slate-500 text-center">Carregando...</p>
          ) : comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map(comment => (
                <div key={comment.id} className="flex items-start gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={comment.author?.avatar_url} />
                    <AvatarFallback>{comment.author?.full_name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">
                          {comment.author?.full_name || 'Usuário'}
                        </span>
                        {comment.author_id === user.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {comment.content}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500 mt-1 block">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        locale: ptBR,
                        addSuffix: true
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center">Nenhum comentário ainda</p>
          )}

          {/* Novo Comentário */}
          <div className="flex gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback>{user.user_metadata?.full_name?.[0] || 'V'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escreva um comentário..."
                className="min-h-[60px]"
              />
              <Button
                onClick={handleComment}
                disabled={loading || !newComment.trim()}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PostCard;
