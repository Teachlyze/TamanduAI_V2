import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Clock, Pin, Heart, ThumbsUp, Sparkles, Send, ChevronDown, ChevronUp, Eye, Image as ImageIcon, Video, FileText } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useToast } from '@/shared/components/ui/use-toast';

const FeedTab = ({ posts, loading }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState({});
  const [views, setViews] = useState({});
  const [newComment, setNewComment] = useState({});
  const [showComments, setShowComments] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [showMedia, setShowMedia] = useState({});

  // Carregar likes, comentários e views
  useEffect(() => {
    if (posts?.length > 0) {
      loadLikesCommentsAndViews();
    }
  }, [posts, user]);

  const loadLikesCommentsAndViews = async () => {
    if (!posts || !user) return;

    const postIds = posts.map(p => p.id);

    // Carregar likes
    const { data: likesData } = await supabase
      .from('post_likes')
      .select('post_id, user_id')
      .in('post_id', postIds);

    // Organizar likes por post
    const likesMap = {};
    likesData?.forEach(l => {
      if (!likesMap[l.post_id]) {
        likesMap[l.post_id] = [];
      }
      likesMap[l.post_id].push(l.user_id);
    });
    setLikes(likesMap);

    // Carregar comentários
    const { data: commentsData } = await supabase
      .from('post_comments')
      .select(`
        id,
        post_id,
        content,
        created_at,
        author_id,
        profiles!post_comments_author_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .in('post_id', postIds)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });

    // Organizar comentários por post
    const commentsMap = {};
    commentsData?.forEach(c => {
      if (!commentsMap[c.post_id]) {
        commentsMap[c.post_id] = [];
      }
      commentsMap[c.post_id].push(c);
    });
    setComments(commentsMap);

    // Carregar visualizações
    const { data: viewsData } = await supabase
      .from('post_views')
      .select('post_id, user_id')
      .in('post_id', postIds);

    // Organizar views por post
    const viewsMap = {};
    viewsData?.forEach(v => {
      if (!viewsMap[v.post_id]) {
        viewsMap[v.post_id] = [];
      }
      viewsMap[v.post_id].push(v.user_id);
    });
    setViews(viewsMap);

    // Registrar visualização dos posts se ainda não foi registrada
    for (const postId of postIds) {
      const hasViewed = viewsData?.some(v => v.post_id === postId && v.user_id === user.id);
      if (!hasViewed) {
        await supabase
          .from('post_views')
          .insert({ post_id: postId, user_id: user.id })
          .select()
          .maybeSingle();
      }
    }
  };

  const handleLike = async (postId) => {
    if (!user) return;

    const postLikes = likes[postId] || [];
    const hasLiked = postLikes.includes(user.id);

    if (hasLiked) {
      // Remover like
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (!error) {
        setLikes(prev => ({
          ...prev,
          [postId]: (prev[postId] || []).filter(id => id !== user.id)
        }));
      }
    } else {
      // Adicionar like
      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: user.id });

      if (!error) {
        setLikes(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), user.id]
        }));
        toast({ title: '👍 Curtida adicionada!', duration: 2000 });
      }
    }
  };

  const handleAddComment = async (postId) => {
    if (!user || !newComment[postId]?.trim()) return;

    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        content: newComment[postId].trim()
      })
      .select(`
        id,
        post_id,
        content,
        created_at,
        author_id,
        profiles!post_comments_author_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (!error && data) {
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), data]
      }));
      setNewComment(prev => ({ ...prev, [postId]: '' }));
      toast({ title: '💬 Comentário adicionado!', duration: 2000 });
    } else {
      console.error('Erro ao adicionar comentário:', error);
      toast({ title: 'Erro ao adicionar comentário', description: error?.message || 'Tente novamente', variant: 'destructive' });
    }
  };

  const toggleComments = (postId) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const getMediaType = (fileUrl) => {
    if (!fileUrl) return null;
    const ext = fileUrl.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'ogg'].includes(ext)) return 'video';
    return 'file';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <Card className="p-12 text-center">
        <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
        <h3 className="text-xl font-semibold mb-2">Nenhuma publicação ainda</h3>
        <p className="text-slate-600 dark:text-slate-400">
          As publicações do professor aparecerão aqui
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post, index) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="p-6 hover:shadow-lg transition-shadow relative overflow-hidden">
            {/* Gradient decorativo */}
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-cyan-500" />
            
            <div className="flex gap-4">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                {post.creator?.full_name?.[0]?.toUpperCase() || 'P'}
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {post.creator?.full_name || 'Professor'}
                  </span>
                  {post.is_pinned && (
                    <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                      <Pin className="w-3 h-3 mr-1" />
                      Fixado
                    </Badge>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(post.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>

                {/* Título */}
                <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">
                  {post.title}
                </h3>

                {/* Descrição */}
                <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap mb-3">
                  {post.description}
                </div>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Mídia (Imagem/Vídeo/Arquivo) */}
                {post.file_url && (() => {
                  const mediaType = getMediaType(post.file_url);
                  if (mediaType === 'image') {
                    return (
                      <div className="mt-3 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <img 
                          src={post.file_url} 
                          alt={post.title}
                          className="w-full h-auto max-h-[500px] object-contain bg-slate-50 dark:bg-slate-900"
                          loading="lazy"
                        />
                      </div>
                    );
                  } else if (mediaType === 'video') {
                    return (
                      <div className="mt-3 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <video 
                          controls 
                          className="w-full h-auto max-h-[500px] bg-slate-900"
                          preload="metadata"
                        >
                          <source src={post.file_url} />
                          Seu navegador não suporta o elemento de vídeo.
                        </video>
                      </div>
                    );
                  } else {
                    return (
                      <a
                        href={post.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                      >
                        <FileText className="w-4 h-4" />
                        Ver anexo
                      </a>
                    );
                  }
                })()}

                {/* Likes, Views e Comentários */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  {/* Botões de Ação */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.id)}
                      className={`gap-1.5 ${
                        likes[post.id]?.includes(user?.id)
                          ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/30'
                          : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-xs font-medium">
                        {likes[post.id]?.length || 0}
                      </span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-slate-600"
                      disabled
                    >
                      <Eye className="w-4 h-4" />
                      <span className="text-xs font-medium">
                        {views[post.id]?.length || 0} visualizações
                      </span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleComments(post.id)}
                      className="gap-1.5 ml-auto text-slate-600 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-xs font-medium">
                        {comments[post.id]?.length || 0} comentários
                      </span>
                      {showComments[post.id] ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </Button>
                  </div>

                  {/* Seção de Comentários */}
                  <AnimatePresence>
                    {showComments[post.id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-4 space-y-3"
                      >
                        {/* Lista de Comentários */}
                        {comments[post.id]?.map(comment => (
                          <div key={comment.id} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {comment.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {comment.profiles?.full_name || 'Usuário'}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {format(new Date(comment.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                                </span>
                              </div>
                              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        ))}

                        {/* Adicionar Novo Comentário */}
                        <div className="flex gap-3 items-start">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {user?.user_metadata?.full_name?.[0]?.toUpperCase() || 'V'}
                          </div>
                          <div className="flex-1">
                            <Textarea
                              placeholder="Escreva um comentário..."
                              value={newComment[post.id] || ''}
                              onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                              className="min-h-[60px] resize-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.ctrlKey) {
                                  handleAddComment(post.id);
                                }
                              }}
                            />
                            <div className="flex justify-end mt-2">
                              <Button
                                size="sm"
                                onClick={() => handleAddComment(post.id)}
                                disabled={!newComment[post.id]?.trim()}
                                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                              >
                                <Send className="w-3 h-3 mr-1" />
                                Enviar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default FeedTab;
