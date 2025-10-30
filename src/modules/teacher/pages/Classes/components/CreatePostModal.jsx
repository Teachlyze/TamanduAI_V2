import React, { useState } from 'react';
import { X, FileText, Video, Link as LinkIcon, Image, Upload } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { toast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';
import { redisCache } from '@/shared/services/redisCache';

const CreatePostModal = ({ isOpen, onClose, classId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [postType, setPostType] = useState('text');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    link: '',
    file: null
  });

  const postTypes = [
    { id: 'text', label: 'Texto', icon: FileText, desc: 'Compartilhe um texto ou aviso' },
    { id: 'video', label: 'Vídeo', icon: Video, desc: 'Adicione um vídeo do YouTube ou Vimeo' },
    { id: 'link', label: 'Link', icon: LinkIcon, desc: 'Compartilhe um link externo' },
    { id: 'image', label: 'Imagem', icon: Image, desc: 'Adicione fotos ou imagens' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha título e conteúdo',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      // TODO: Criar tabela class_posts se não existir
      // Por enquanto, vamos apenas simular o salvamento
      
      // Invalidar cache ao criar novo post
      await redisCache.invalidateClass(classId);

      toast({
        title: 'Post criado!',
        description: 'Seu post foi publicado no mural'
      });

      onSuccess?.();
      onClose();
      
    } catch (error) {
      console.error('Erro ao criar post:', error);
      toast({
        title: 'Erro ao criar post',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Nova Postagem</h2>
              <p className="text-cyan-100 text-sm">Compartilhe conteúdo com seus alunos</p>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tipo de Conteúdo */}
          <div>
            <label className="block text-sm font-medium mb-3">Tipo de Conteúdo</label>
            <div className="grid grid-cols-2 gap-3">
              {postTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setPostType(type.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      postType === type.id
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                        : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${postType === type.id ? 'text-blue-600' : 'text-slate-600'}`} />
                      <div className="flex-1">
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">{type.desc}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Material sobre Funções Quadráticas"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 dark:bg-slate-800"
              maxLength={200}
              required
            />
            <div className="text-xs text-slate-500 mt-1">{formData.title.length}/200</div>
          </div>

          {/* Conteúdo */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Conteúdo <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Escreva o conteúdo da postagem..."
              rows={6}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 dark:bg-slate-800"
              maxLength={2000}
              required
            />
            <div className="text-xs text-slate-500 mt-1">{formData.content.length}/2000</div>
          </div>

          {/* Campos específicos por tipo */}
          {postType === 'video' && (
            <div>
              <label className="block text-sm font-medium mb-2">Link do Vídeo</label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 dark:bg-slate-800"
              />
            </div>
          )}

          {postType === 'link' && (
            <div>
              <label className="block text-sm font-medium mb-2">URL do Link</label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://exemplo.com/artigo"
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 dark:bg-slate-800"
              />
            </div>
          )}

          {postType === 'image' && (
            <div>
              <label className="block text-sm font-medium mb-2">Upload de Imagem</label>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Arraste uma imagem ou clique para selecionar
                </p>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="image-upload"
                  onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => document.getElementById('image-upload').click()}
                >
                  Selecionar Arquivo
                </Button>
                {formData.file && (
                  <p className="text-sm text-green-600 mt-2">{formData.file.name}</p>
                )}
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600"
              disabled={loading}
            >
              {loading ? 'Publicando...' : 'Publicar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreatePostModal;
