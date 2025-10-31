import React, { useState } from 'react';
import { X, Upload, FileText, Video, Image, Link as LinkIcon, Folder } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { toast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';

const AddMaterialModal = ({ isOpen, onClose, classId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'aulas',
    file: null,
    fileUrl: ''
  });

  const categories = [
    { value: 'aulas', label: '📚 Aulas e Slides' },
    { value: 'exercicios', label: '📝 Exercícios' },
    { value: 'referencias', label: '📖 Referências' },
    { value: 'complementar', label: '➕ Material Complementar' }
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, file, title: formData.title || file.name });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Digite um título para o material',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.file && !formData.fileUrl.trim()) {
      toast({
        title: 'Arquivo ou link obrigatório',
        description: 'Faça upload de um arquivo ou cole um link',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let fileUrl = formData.fileUrl;
      let fileType = 'link';
      let fileSize = null;

      // Se tem arquivo, fazer upload
      if (formData.file) {
        const fileName = `${Date.now()}_${formData.file.name}`;
        const filePath = `${classId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('class-materials')
          .upload(filePath, formData.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('class-materials')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        fileType = formData.file.type;
        fileSize = formData.file.size;
      }

      // Salvar em class_materials
      const { error } = await supabase
        .from('class_materials')
        .insert({
          class_id: classId,
          title: formData.title,
          description: formData.description || null,
          file_url: fileUrl,
          file_type: fileType,
          file_size: fileSize,
          category: formData.category,
          created_by: user.id,
          is_public: false
        });

      if (error) throw error;

      toast({
        title: 'Material adicionado!',
        description: 'O material está disponível na biblioteca'
      });

      setFormData({ title: '', description: '', category: 'aulas', file: null, fileUrl: '' });
      onSuccess?.();
      onClose();
      
    } catch (error) {
      console.error('Erro ao adicionar material:', error);
      toast({
        title: 'Erro ao adicionar material',
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
              <h2 className="text-2xl font-bold text-white">Adicionar Material</h2>
              <p className="text-cyan-100 text-sm">Compartilhe arquivos e recursos com seus alunos</p>
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
          {/* Título */}
          <div>
            <label className="block text-sm font-medium mb-2">Título do Material</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Slides da Aula 1 - Introdução"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 dark:bg-slate-800"
              required
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium mb-2">Categoria</label>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat.value })}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    formData.category === cat.value
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="font-medium text-sm">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Upload ou Link */}
          <div className="space-y-4">
            <label className="block text-sm font-medium">Arquivo ou Link</label>
            
            {/* Upload */}
            <div>
              <label className="block">
                <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  formData.file 
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                    : 'border-slate-300 dark:border-slate-700 hover:border-blue-600'
                }`}>
                  {formData.file ? (
                    <>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      <div className="text-sm font-medium mb-1 text-green-700 dark:text-green-300">
                        ✓ {formData.file.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setFormData({ ...formData, file: null, title: '' });
                        }}
                        className="mt-2 text-xs text-red-600 hover:underline"
                      >
                        Remover arquivo
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                      <div className="text-sm font-medium mb-1">
                        Clique para fazer upload
                      </div>
                      <div className="text-xs text-slate-500">
                        PDF, DOC, PPT, Imagens, Vídeos (máx 50MB)
                      </div>
                    </>
                  )}
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.mp4,.avi"
                  />
                </div>
              </label>
            </div>

            <div className="text-center text-sm text-slate-500">OU</div>

            {/* Link */}
            <div>
              <input
                type="url"
                value={formData.fileUrl}
                onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                placeholder="Cole um link (Google Drive, YouTube, etc)"
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium mb-2">Descrição (opcional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Adicione informações sobre o material..."
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 dark:bg-slate-800"
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
            >
              {loading ? 'Adicionando...' : 'Adicionar Material'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddMaterialModal;
