import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, FileText, Video, Image as ImageIcon, Link as LinkIcon,
  MoreVertical, Eye, Edit, Trash2, Pin, Download,
  Calendar, User, MessageSquare
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { toast } from '@/shared/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CreatePostModal from '../components/CreatePostModal';
import ConfirmDialog from '@/shared/components/ui/ConfirmDialog';

/**
 * TAB 2: MURAL DE CONTEÚDO
 * 
 * Feed de posts pedagógicos com:
 * - Vídeos, PDFs, links, imagens
 * - Sistema de visualizações
 * - Comentários (futuro)
 * - Fixar posts importantes
 */

const ContentFeedTab = ({ classId }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, title: '' });

  useEffect(() => {
    loadPosts();
  }, [classId]);

  /**
   * Carrega posts do mural (usando class_materials)
   */
  const loadPosts = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('class_materials')
        .select(`
          *,
          creator:profiles!created_by(id, full_name, avatar_url)
        `)
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPosts(data || []);

    } catch (error) {
      console.error('Erro ao carregar posts:', error);
      toast({
        title: 'Erro ao carregar posts',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = () => {
    setShowCreateModal(false);
    loadPosts();
  };

  /**
   * Deleta post
   */
  const handleViewDetails = (post) => {
    if (post.file_url) {
      window.open(post.file_url, '_blank');
    } else {
      toast({
        title: 'Conteúdo não disponível',
        description: 'Este post não possui arquivo ou link associado'
      });
    }
  };

  const handleEditPost = (post) => {
    toast({
      title: 'Em desenvolvimento',
      description: 'Função de edição será implementada em breve'
    });
  };

  const handlePinPost = (post) => {
    toast({
      title: 'Em desenvolvimento',
      description: 'Função de fixar será implementada em breve'
    });
  };

  const handleDownloadFile = (post) => {
    if (post.file_url) {
      window.open(post.file_url, '_blank');
    } else {
      toast({
        title: 'Arquivo não disponível',
        variant: 'destructive'
      });
    }
  };

  const handleDeletePost = (postId, title) => {
    setDeleteConfirm({ isOpen: true, id: postId, title });
  };

  const confirmDelete = async () => {
    const { id, title } = deleteConfirm;
    
    try {
      const { error } = await supabase
        .from('class_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: '✅ Post deletado',
        description: `"${title}" foi removido com sucesso.`
      });

      loadPosts();
    } catch (error) {
      console.error('Erro ao deletar post:', error);
      toast({
        title: '❌ Erro ao deletar post',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  /**
   * Retorna ícone baseado no tipo de arquivo
   */
  const getFileIcon = (fileType) => {
    if (!fileType) return FileText;
    
    if (fileType.includes('video')) return Video;
    if (fileType.includes('image')) return ImageIcon;
    if (fileType.includes('pdf')) return FileText;
    return LinkIcon;
  };

  /**
   * Retorna cor do badge baseado no tipo
   */
  const getTypeBadgeColor = (fileType) => {
    if (!fileType) return 'bg-slate-100 text-slate-700';
    
    if (fileType.includes('video')) return 'bg-purple-100 text-purple-700';
    if (fileType.includes('image')) return 'bg-pink-100 text-pink-700';
    if (fileType.includes('pdf')) return 'bg-red-100 text-red-700';
    return 'bg-blue-100 text-blue-700';
  };

  /**
   * Filtra posts por tipo
   */
  const getFilteredPosts = () => {
    if (filterType === 'all') return posts;
    
    return posts.filter(post => {
      if (!post.file_type) return false;
      
      switch (filterType) {
        case 'video':
          return post.file_type.includes('video');
        case 'image':
          return post.file_type.includes('image');
        case 'pdf':
          return post.file_type.includes('pdf');
        case 'link':
          return post.file_type === 'link';
        default:
          return true;
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const filteredPosts = getFilteredPosts();

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Mural de Conteúdo</h2>
          <p className="text-slate-600 dark:text-slate-400">
            {filteredPosts.length} de {posts.length} posts
          </p>
        </div>
        
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="video">📹 Vídeos</SelectItem>
              <SelectItem value="pdf">📄 PDFs</SelectItem>
              <SelectItem value="image">🖼️ Imagens</SelectItem>
              <SelectItem value="link">🔗 Links</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Postagem
          </Button>
        </div>
      </div>

      {/* Lista de Posts */}
      {filteredPosts.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
          <h3 className="text-lg font-semibold mb-2">
            {posts.length === 0 ? 'Nenhum conteúdo postado ainda' : 'Nenhum resultado encontrado'}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {posts.length === 0 
              ? 'Compartilhe materiais, vídeos e links com seus alunos'
              : 'Ajuste o filtro para ver mais resultados.'}
          </p>
          {posts.length === 0 && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Postagem
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post, index) => {
            const Icon = getFileIcon(post.file_type);
            
            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-6 hover:shadow-lg transition-all">
                  {/* Header do Post */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Avatar do criador */}
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={post.creator?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                          {post.creator?.full_name?.[0] || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">
                            {post.creator?.full_name || 'Professor'}
                          </span>
                          <span className="text-sm text-slate-500">•</span>
                          <span className="text-sm text-slate-500">
                            {formatDistanceToNow(new Date(post.created_at), { locale: ptBR, addSuffix: true })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge className={getTypeBadgeColor(post.file_type)}>
                            <Icon className="w-3 h-3 mr-1" />
                            {post.file_type?.split('/')[0] || 'Arquivo'}
                          </Badge>
                          {post.category && (
                            <Badge variant="outline" className="text-xs">
                              {post.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Dropdown de ações */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(post)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadFile(post)}>
                          <Download className="w-4 h-4 mr-2" />
                          Baixar Arquivo
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditPost(post)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar Post
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePinPost(post)}>
                          <Pin className="w-4 h-4 mr-2" />
                          Fixar no Topo
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 dark:text-red-400"
                          onClick={() => handleDeletePost(post.id, post.title)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Deletar Post
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Conteúdo do Post */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 line-clamp-3">
                      {post.description || 'Sem descrição'}
                    </p>
                  </div>

                  {/* Preview do arquivo */}
                  {post.file_type?.includes('image') && post.file_url && (
                    <div className="mb-4 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img 
                        src={post.file_url} 
                        alt={post.title}
                        className="w-full max-h-96 object-contain cursor-pointer"
                        onClick={() => window.open(post.file_url, '_blank')}
                      />
                    </div>
                  )}

                  {/* Preview de vídeo */}
                  {post.file_type?.includes('video') && post.file_url && (
                    <div className="mb-4 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                      {post.file_url.includes('youtube') || post.file_url.includes('youtu.be') ? (
                        <div className="aspect-video">
                          <iframe
                            src={post.file_url.replace('watch?v=', 'embed/')}
                            className="w-full h-full"
                            allowFullScreen
                            title={post.title}
                          />
                        </div>
                      ) : (
                        <video controls className="w-full max-h-96">
                          <source src={post.file_url} />
                        </video>
                      )}
                    </div>
                  )}

                  {/* Preview de link */}
                  {post.file_type === 'link' && post.file_url && (
                    <a 
                      href={post.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mb-4 block p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/40 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-blue-600" />
                        <span className="text-blue-600 hover:underline truncate">
                          {post.file_url}
                        </span>
                      </div>
                    </a>
                  )}

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Footer com ações */}
                  <div className="flex items-center justify-between pt-4 border-t dark:border-slate-700">
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {post.views || 0} visualizações
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        0 comentários
                      </span>
                    </div>
                    
                    {post.file_url && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(post.file_url, '_blank')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Baixar
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        classId={classId}
        onSuccess={handlePostCreated}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, title: '' })}
        onConfirm={confirmDelete}
        title="Deletar Post"
        message={`Tem certeza que deseja deletar "${deleteConfirm.title}"? Esta ação não pode ser desfeita.`}
        confirmText="Deletar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};

export default ContentFeedTab;
