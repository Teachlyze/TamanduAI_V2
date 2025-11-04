import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Image, Video, File, Download, Eye, X } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
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

export const MaterialCardPreview = ({ material, index = 0 }) => {
  const isImage = (fileType) => fileType?.includes('image');
  const isVideo = (fileType) => fileType?.includes('video');
  const canPreview = () => isImage(material.file_type) || isVideo(material.file_type);

  const FileIcon = getFileIcon(material.file_type);
  const gradient = getFileColor(material.file_type);

  return (
    <>
      <motion.div
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
              </div>

              {/* Preview inline para imagens e vídeos */}
              {canPreview() && material.file_url && (
                <div className="mt-3">
                  {isImage(material.file_type) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800"
                    >
                      <img
                        src={material.file_url}
                        alt={material.title}
                        className="w-full h-auto max-h-[360px] object-contain"
                        loading="lazy"
                      />
                    </motion.div>
                  )}

                  {isVideo(material.file_type) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative rounded-lg overflow-hidden bg-black"
                    >
                      <video
                        controls
                        className="w-full h-auto max-h-[360px]"
                        controlsList="nodownload"
                      >
                        <source src={material.file_url} type={material.file_type} />
                        Seu navegador não suporta o elemento de vídeo.
                      </video>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Botão de download (sempre disponível quando há URL) */}
              {material.file_url ? (
                <div className="mt-3">
                  <a
                    href={material.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                  >
                    <Button size="sm" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
                      <Download className="w-4 h-4 mr-2" />
                      Baixar
                    </Button>
                  </a>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="mt-3" disabled>
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

    </>
  );
};
