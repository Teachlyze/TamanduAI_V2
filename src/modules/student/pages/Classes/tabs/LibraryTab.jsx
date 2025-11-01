import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Download, FileText, Image, Video, File, Search, Filter, Eye, X, Play } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const getFileIcon = (fileType) => {
  if (!fileType) return File;
  if (fileType.includes('pdf')) return FileText;
  if (fileType.includes('image')) return Image;
  if (fileType.includes('video')) return Video;
  return File;
};

const getFileColor = (fileType) => {
  if (!fileType) return 'from-slate-500 to-slate-600';
  if (fileType.includes('pdf')) return 'from-red-500 to-red-600';
  if (fileType.includes('image')) return 'from-purple-500 to-pink-500';
  if (fileType.includes('video')) return 'from-blue-500 to-cyan-500';
  if (fileType.includes('document') || fileType.includes('word')) return 'from-blue-600 to-indigo-600';
  if (fileType.includes('sheet') || fileType.includes('excel')) return 'from-green-500 to-green-600';
  return 'from-slate-500 to-slate-600';
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const LibraryTab = ({ materials, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewingMedia, setViewingMedia] = useState(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  const isImage = (fileType) => fileType?.includes('image');
  const isVideo = (fileType) => fileType?.includes('video');
  const canPreview = (material) => isImage(material.file_type) || isVideo(material.file_type);

  const handleViewMedia = (material) => {
    setViewingMedia(material);
    setIsMediaModalOpen(true);
  };

  const closeMediaModal = () => {
    setIsMediaModalOpen(false);
    setViewingMedia(null);
  };

  const filteredMaterials = materials?.filter(material => {
    const matchesSearch = !searchTerm || 
      material.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
      material.file_type?.includes(filterType);

    return matchesSearch && matchesFilter;
  }) || [];

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="flex gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-700" />
              <div className="flex-1 space-y-3">
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra de Busca e Filtros */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar materiais..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              Todos
            </Button>
            <Button
              variant={filterType === 'pdf' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('pdf')}
            >
              PDFs
            </Button>
            <Button
              variant={filterType === 'video' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('video')}
            >
              Vídeos
            </Button>
            <Button
              variant={filterType === 'image' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('image')}
            >
              Imagens
            </Button>
          </div>
        </div>
      </Card>

      {/* Lista de Materiais */}
      {filteredMaterials.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
          <h3 className="text-xl font-semibold mb-2">
            {searchTerm || filterType !== 'all' ? 'Nenhum resultado encontrado' : 'Nenhum material disponível'}
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            {searchTerm || filterType !== 'all' ? 'Tente ajustar os filtros' : 'Materiais de estudo aparecerão aqui'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMaterials.map((material, index) => {
            const FileIcon = getFileIcon(material.file_type);
            const gradient = getFileColor(material.file_type);

            return (
              <motion.div
                key={material.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-6 hover:shadow-xl transition-all group">
                  <div className="flex gap-4">
                    {/* Ícone do arquivo */}
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform`}>
                      <FileIcon className="w-8 h-8 text-white" />
                    </div>

                    {/* Informações */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-1 truncate">
                        {material.title}
                      </h3>
                      
                      {material.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                          {material.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
                        {material.created_at && (
                          <span>
                            {format(new Date(material.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        )}
                        {material.file_size && (
                          <span>• {formatFileSize(material.file_size)}</span>
                        )}
                        {material.creator && (
                          <span>• {material.creator.full_name}</span>
                        )}
                      </div>

                      {/* Botões de Ação */}
                      {material.file_url ? (
                        <div className="flex gap-2">
                          {canPreview(material) && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleViewMedia(material)}
                              className="flex-1"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar
                            </Button>
                          )}
                          <a
                            href={material.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className={canPreview(material) ? 'flex-1' : 'w-full'}
                          >
                            <Button size="sm" className="w-full">
                              <Download className="w-4 h-4 mr-2" />
                              {canPreview(material) ? 'Baixar' : 'Baixar Material'}
                            </Button>
                          </a>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="w-full" disabled>
                          Indisponível
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {material.tags && material.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      {material.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Contador */}
      {filteredMaterials.length > 0 && (
        <div className="text-center text-sm text-slate-500 dark:text-slate-400">
          Exibindo {filteredMaterials.length} de {materials?.length || 0} {filteredMaterials.length === 1 ? 'material' : 'materiais'}
        </div>
      )}

      {/* Modal de Visualização de Mídia */}
      <Dialog open={isMediaModalOpen} onOpenChange={setIsMediaModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">
                {viewingMedia?.title}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeMediaModal}
                className="rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            {viewingMedia?.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                {viewingMedia.description}
              </p>
            )}
          </DialogHeader>
          
          <div className="mt-4">
            {viewingMedia && isImage(viewingMedia.file_type) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800"
              >
                <img
                  src={viewingMedia.file_url}
                  alt={viewingMedia.title}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              </motion.div>
            )}

            {viewingMedia && isVideo(viewingMedia.file_type) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-lg overflow-hidden bg-black"
              >
                <video
                  controls
                  className="w-full h-auto max-h-[70vh]"
                  controlsList="nodownload"
                >
                  <source src={viewingMedia.file_url} type={viewingMedia.file_type} />
                  Seu navegador não suporta a tag de vídeo.
                </video>
              </motion.div>
            )}

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-500">
                {viewingMedia?.file_size && (
                  <span>{formatFileSize(viewingMedia.file_size)}</span>
                )}
                {viewingMedia?.created_at && (
                  <span className="ml-3">
                    Adicionado em {format(new Date(viewingMedia.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                  </span>
                )}
              </div>
              <a
                href={viewingMedia?.file_url}
                target="_blank"
                rel="noopener noreferrer"
                download
              >
                <Button size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Baixar
                </Button>
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LibraryTab;
