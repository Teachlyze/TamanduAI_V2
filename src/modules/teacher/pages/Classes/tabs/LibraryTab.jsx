import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, Plus, Folder, FileText, Video, Image as ImageIcon,
  Download, Eye, Edit, Trash2, MoreVertical, Search, Calendar
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
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
import AddMaterialModal from '../components/AddMaterialModal';
import ConfirmDialog from '@/shared/components/ui/ConfirmDialog';

const LibraryTab = ({ classId }) => {
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pdfs: 0,
    videos: 0,
    images: 0,
    others: 0
  });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, title: '' });

  useEffect(() => {
    loadMaterials();
  }, [classId]);

  const loadMaterials = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('class_materials')
        .select(`
          *,
          uploader:profiles!class_materials_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq('class_id', classId)
        .neq('category', 'announcement') // Excluir comunicados
        .order('created_at', { ascending: false });

      if (error) throw error;

      const items = data || [];
      setStats({
        total: items.length,
        pdfs: items.filter(m => m.file_type?.includes('pdf')).length,
        videos: items.filter(m => m.file_type?.includes('video')).length,
        images: items.filter(m => m.file_type?.includes('image')).length,
        others: items.filter(m => !m.file_type?.includes('pdf') && !m.file_type?.includes('video') && !m.file_type?.includes('image')).length
      });

      setMaterials(items);

    } catch (error) {
      console.error('Erro ao carregar materiais:', error);
      toast({
        title: 'Erro ao carregar materiais',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewMaterial = (material) => {
    if (material.file_url) {
      window.open(material.file_url, '_blank');
    } else {
      toast({
        title: 'Arquivo não disponível',
        description: 'Este material não possui arquivo associado',
        variant: 'destructive'
      });
    }
  };

  const handleEditMaterial = (material) => {
    toast({
      title: 'Em desenvolvimento',
      description: 'Função de edição será implementada em breve'
    });
  };

  const handleDeleteMaterial = (id, title) => {
    setDeleteConfirm({ isOpen: true, id, title });
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
        title: '✅ Material deletado',
        description: `"${title}" foi removido com sucesso.`
      });

      loadMaterials();
    } catch (error) {
      console.error('Erro ao deletar material:', error);
      toast({
        title: '❌ Erro ao deletar material',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return FileText;
    if (fileType.includes('video')) return Video;
    if (fileType.includes('image')) return ImageIcon;
    if (fileType.includes('pdf')) return FileText;
    return FileText;
  };

  const getFileColor = (fileType) => {
    if (!fileType) return 'bg-slate-100 text-slate-700';
    if (fileType.includes('video')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    if (fileType.includes('image')) return 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300';
    if (fileType.includes('pdf')) return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`;
  };

  const filteredMaterials = materials.filter(m => {
    // Busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!m.title?.toLowerCase().includes(query) && !m.description?.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Filtro por categoria
    if (filterCategory !== 'all' && m.category !== filterCategory) {
      return false;
    }

    // Filtro por tipo
    if (filterType !== 'all') {
      if (filterType === 'pdf' && !m.file_type?.includes('pdf')) return false;
      if (filterType === 'video' && !m.file_type?.includes('video')) return false;
      if (filterType === 'image' && !m.file_type?.includes('image')) return false;
    }

    return true;
  });

  // Agrupar por categoria
  const categorizedMaterials = filteredMaterials.reduce((acc, material) => {
    const category = material.category || 'Sem Categoria';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(material);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========== CARDS DE ESTATÍSTICAS ========== */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4 border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
              <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.pdfs}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">PDFs</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
              <Video className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.videos}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Vídeos</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-pink-200 dark:border-pink-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900">
              <ImageIcon className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.images}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Imagens</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              <Folder className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.others}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Outros</div>
            </div>
          </div>
        </Card>
      </div>

      {/* ========== HEADER COM AÇÕES ========== */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Biblioteca de Materiais</h2>
          <p className="text-slate-600 dark:text-slate-400">
            {filteredMaterials.length} de {stats.total} materiais
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            toast({
              title: 'Em desenvolvimento',
              description: 'Função de módulos será implementada em breve'
            });
          }}>
            <Folder className="w-4 h-4 mr-2" />
            Novo Módulo
          </Button>
          <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white" onClick={() => setShowMaterialModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Material
          </Button>
        </div>
      </div>

      {/* ========== FILTROS E BUSCA ========== */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar material..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="pdf">📄 PDFs</SelectItem>
              <SelectItem value="video">📹 Vídeos</SelectItem>
              <SelectItem value="image">🖼️ Imagens</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Categorias</SelectItem>
              <SelectItem value="aulas">Aulas</SelectItem>
              <SelectItem value="exercicios">Exercícios</SelectItem>
              <SelectItem value="referencias">Referências</SelectItem>
              <SelectItem value="complementar">Material Complementar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* ========== LISTA DE MATERIAIS POR CATEGORIA ========== */}
      {filteredMaterials.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {materials.length === 0 ? 'Biblioteca Vazia' : 'Nenhum resultado encontrado'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {materials.length === 0
                ? 'Comece organizando seus materiais em módulos e tópicos'
                : 'Ajuste os filtros para ver mais resultados.'}
            </p>
            {materials.length === 0 && (
              <Button>
                <Folder className="w-4 h-4 mr-2" />
                Criar Primeiro Módulo
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(categorizedMaterials).map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <Folder className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">{category}</h3>
                <Badge variant="secondary">{items.length}</Badge>
              </div>

              <div className="space-y-3 ml-6">
                {items.map((material, index) => {
                  const Icon = getFileIcon(material.file_type);
                  const colorClass = getFileColor(material.file_type);

                  return (
                    <motion.div
                      key={material.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="p-4 hover:shadow-md transition-shadow">
                        {/* Preview de Mídia */}
                        {material.file_url && material.file_type?.includes('image') && (
                          <div className="mb-4 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                            <img 
                              src={material.file_url} 
                              alt={material.title}
                              className="w-full max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(material.file_url, '_blank')}
                            />
                          </div>
                        )}
                        
                        {material.file_url && material.file_type?.includes('video') && !material.file_url.includes('youtube') && (
                          <div className="mb-4 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                            <video controls className="w-full max-h-64">
                              <source src={material.file_url} />
                              Seu navegador não suporta vídeos.
                            </video>
                          </div>
                        )}

                        {material.file_url && material.file_url.includes('youtube') && (
                          <div className="mb-4 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-video">
                            <iframe
                              src={material.file_url.replace('watch?v=', 'embed/')}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${colorClass}`}>
                            <Icon className="w-6 h-6" />
                          </div>

                          <div className="flex-1">
                            <h4 className="font-semibold mb-1">{material.title}</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">
                              {material.description || 'Sem descrição'}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                              <span>{formatFileSize(material.file_size)}</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDistanceToNow(new Date(material.created_at), { locale: ptBR, addSuffix: true })}
                              </span>
                              {material.tags && material.tags.length > 0 && (
                                <div className="flex gap-1">
                                  {material.tags.slice(0, 2).map((tag, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {material.file_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(material.file_url, '_blank')}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Baixar
                              </Button>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewMaterial(material)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Visualizar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditMaterial(material)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDeleteMaterial(material.id, material.title)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Deletar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Adicionar Material */}
      <AddMaterialModal
        isOpen={showMaterialModal}
        onClose={() => setShowMaterialModal(false)}
        classId={classId}
        onSuccess={loadMaterials}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, title: '' })}
        onConfirm={confirmDelete}
        title="Deletar Material"
        message={`Tem certeza que deseja deletar "${deleteConfirm.title}"? Esta ação não pode ser desfeita.`}
        confirmText="Deletar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};

export default LibraryTab;
