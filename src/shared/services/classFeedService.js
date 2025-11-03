import { logger } from '@/shared/utils/logger';
import { supabase } from '@/shared/services/supabaseClient';

/**
 * Class Feed Service
 * Gerencia posts, comentários e interações no mural da turma
 */

export const ClassFeedService = {
  /**
   * Buscar posts de uma turma
   * @param {string} classId - ID da turma
   * @param {Object} options - Opções de filtro
   * @returns {Promise<Array>} Posts com dados do autor
   */
  async getPosts(classId, options = {}) {
    const {
      type = null,
      limit = 50,
      offset = 0,
      pinnedFirst = true,
    } = options;

    let query = supabase
      .from('class_posts')
      .select(`
        *,
        author:profiles!class_posts_author_id_fkey(id, full_name, avatar_url),
        user_liked:post_likes!left(user_id),
        user_viewed:post_views!left(user_id)
      `)
      .eq('class_id', classId)
      .not('published_at', 'is', null)
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('type', type);
    }

    // Ordenação: fixados primeiro, depois por data
    if (pinnedFirst) {
      query = query.order('is_pinned', { ascending: false });
    }
    query = query.order('published_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      logger.error('Erro ao buscar posts:', error)
      throw error;
    }

    // Adicionar flag se usuário curtiu
    const userId = (await supabase.auth.getUser()).data.user?.id;
    return (data || []).map(post => ({
      ...post,
      isLikedByUser: post.user_liked?.some(like => like.user_id === userId) || false,
      isViewedByUser: post.user_viewed?.some(view => view.user_id === userId) || false,
    }));
  },

  /**
   * Buscar post único
   * @param {string} postId - ID do post
   * @returns {Promise<Object>} Post completo
   */
  async getPost(postId) {
    const { data, error } = await supabase
      .from('class_posts')
      .select(`
        *,
        author:profiles!class_posts_author_id_fkey(id, full_name, avatar_url),
        comments:post_comments(
          *,
          author:profiles!post_comments_author_id_fkey(id, full_name, avatar_url)
        )
      `)
      .eq('id', postId)
      .single();

    if (error) {
      logger.error('Erro ao buscar post:', error)
      throw error;
    }

    return data;
  },

  /**
   * Criar novo post
   * @param {string} classId - ID da turma
   * @param {Object} postData - Dados do post
   * @returns {Promise<Object>} Post criado
   */
  async createPost(classId, postData) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Usuário não autenticado');

    const {
      type,
      title,
      content,
      attachments = [],
      isPinned = false,
      commentsEnabled = true,
      scheduledFor = null,
    } = postData;

    const post = {
      class_id: classId,
      author_id: user.id,
      type,
      title,
      content,
      attachments,
      is_pinned: isPinned,
      comments_enabled: commentsEnabled,
      scheduled_for: scheduledFor,
      published_at: scheduledFor ? null : new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('class_posts')
      .insert([post])
      .select(`
        *,
        author:profiles!class_posts_author_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      logger.error('Erro ao criar post:', error)
      throw error;
    }

    return data;
  },

  /**
   * Atualizar post
   * @param {string} postId - ID do post
   * @param {Object} updates - Dados a atualizar
   * @returns {Promise<Object>} Post atualizado
   */
  async updatePost(postId, updates) {
    const { data, error } = await supabase
      .from('class_posts')
      .update(updates)
      .eq('id', postId)
      .select(`
        *,
        author:profiles!class_posts_author_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      logger.error('Erro ao atualizar post:', error)
      throw error;
    }

    return data;
  },

  /**
   * Deletar post
   * @param {string} postId - ID do post
   * @returns {Promise<boolean>} Sucesso
   */
  async deletePost(postId) {
    const { error } = await supabase
      .from('class_posts')
      .delete()
      .eq('id', postId);

    if (error) {
      logger.error('Erro ao deletar post:', error)
      throw error;
    }

    return true;
  },

  /**
   * Fixar/desafixar post
   * @param {string} postId - ID do post
   * @param {boolean} pinned - Fixar ou desafixar
   * @returns {Promise<Object>} Post atualizado
   */
  async togglePin(postId, pinned) {
    return this.updatePost(postId, { is_pinned: pinned });
  },

  /**
   * Habilitar/desabilitar comentários
   * @param {string} postId - ID do post
   * @param {boolean} enabled - Habilitar ou desabilitar
   * @returns {Promise<Object>} Post atualizado
   */
  async toggleComments(postId, enabled) {
    return this.updatePost(postId, { comments_enabled: enabled });
  },

  /**
   * Registrar visualização de post
   * @param {string} postId - ID do post
   * @returns {Promise<void>}
   */
  async markAsViewed(postId) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    // Inserir visualização (ignora se já existe)
    const { error } = await supabase
      .from('post_views')
      .insert([{ post_id: postId, user_id: user.id }])
      .select();

    if (error && error.code !== '23505') { // 23505 = unique violation
      logger.error('Erro ao registrar visualização:', error)
    }

    // Atualizar contador (será feito via trigger, mas podemos forçar)
    await supabase.rpc('increment_post_views', { post_id: postId }).catch(() => {});
  },

  /**
   * Buscar quem visualizou o post
   * @param {string} postId - ID do post
   * @returns {Promise<Array>} Lista de usuários que visualizaram
   */
  async getViewers(postId) {
    const { data, error } = await supabase
      .from('post_views')
      .select(`
        viewed_at,
        user:profiles!post_views_user_id_fkey(id, full_name, avatar_url)
      `)
      .eq('post_id', postId)
      .order('viewed_at', { ascending: false });

    if (error) {
      logger.error('Erro ao buscar visualizadores:', error)
      throw error;
    }

    return data || [];
  },

  /**
   * Curtir/descurtir post
   * @param {string} postId - ID do post
   * @returns {Promise<boolean>} True se curtiu, false se descurtiu
   */
  async toggleLike(postId) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Usuário não autenticado');

    // Verificar se já curtiu
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingLike) {
      // Descurtir
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);
      return false;
    } else {
      // Curtir
      await supabase
        .from('post_likes')
        .insert([{ post_id: postId, user_id: user.id }]);
      return true;
    }
  },

  // =====================================================
  // COMENTÁRIOS
  // =====================================================

  /**
   * Buscar comentários de um post
   * @param {string} postId - ID do post
   * @returns {Promise<Array>} Comentários com respostas
   */
  async getComments(postId) {
    const { data, error } = await supabase
      .from('post_comments')
      .select(`
        *,
        author:profiles!post_comments_author_id_fkey(id, full_name, avatar_url),
        replies:post_comments!parent_comment_id(
          *,
          author:profiles!post_comments_author_id_fkey(id, full_name, avatar_url)
        )
      `)
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Erro ao buscar comentários:', error)
      throw error;
    }

    return data || [];
  },

  /**
   * Adicionar comentário
   * @param {string} postId - ID do post
   * @param {string} content - Conteúdo do comentário
   * @param {string|null} parentCommentId - ID do comentário pai (para respostas)
   * @returns {Promise<Object>} Comentário criado
   */
  async addComment(postId, content, parentCommentId = null) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Usuário não autenticado');

    const comment = {
      post_id: postId,
      author_id: user.id,
      content,
      parent_comment_id: parentCommentId,
    };

    const { data, error } = await supabase
      .from('post_comments')
      .insert([comment])
      .select(`
        *,
        author:profiles!post_comments_author_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      logger.error('Erro ao adicionar comentário:', error)
      throw error;
    }

    return data;
  },

  /**
   * Editar comentário
   * @param {string} commentId - ID do comentário
   * @param {string} content - Novo conteúdo
   * @returns {Promise<Object>} Comentário atualizado
   */
  async updateComment(commentId, content) {
    const { data, error } = await supabase
      .from('post_comments')
      .update({ content })
      .eq('id', commentId)
      .select(`
        *,
        author:profiles!post_comments_author_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      logger.error('Erro ao editar comentário:', error)
      throw error;
    }

    return data;
  },

  /**
   * Deletar comentário
   * @param {string} commentId - ID do comentário
   * @returns {Promise<boolean>} Sucesso
   */
  async deleteComment(commentId) {
    const { error } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      logger.error('Erro ao deletar comentário:', error)
      throw error;
    }

    return true;
  },

  /**
   * Curtir/descurtir comentário
   * @param {string} commentId - ID do comentário
   * @returns {Promise<boolean>} True se curtiu, false se descurtiu
   */
  async toggleCommentLike(commentId) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Usuário não autenticado');

    // Verificar se já curtiu
    const { data: existingLike } = await supabase
      .from('comment_likes')
      .select('*')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingLike) {
      // Descurtir
      await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);
      return false;
    } else {
      // Curtir
      await supabase
        .from('comment_likes')
        .insert([{ comment_id: commentId, user_id: user.id }]);
      return true;
    }
  },

  /**
   * Buscar posts agendados (apenas para professores)
   * @param {string} classId - ID da turma
   * @returns {Promise<Array>} Posts agendados
   */
  async getScheduledPosts(classId) {
    const { data, error } = await supabase
      .from('class_posts')
      .select(`
        *,
        author:profiles!class_posts_author_id_fkey(id, full_name, avatar_url)
      `)
      .eq('class_id', classId)
      .is('published_at', null)
      .not('scheduled_for', 'is', null)
      .order('scheduled_for', { ascending: true });

    if (error) {
      logger.error('Erro ao buscar posts agendados:', error)
      throw error;
    }

    return data || [];
  },

  /**
   * Publicar post agendado manualmente
   * @param {string} postId - ID do post
   * @returns {Promise<Object>} Post publicado
   */
  async publishScheduledPost(postId) {
    return this.updatePost(postId, {
      published_at: new Date().toISOString(),
    });
  },
};

export default ClassFeedService;
