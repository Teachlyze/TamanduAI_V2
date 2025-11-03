/**
 * MaterialCard - Card para exibição de materiais/arquivos
 * Grid moderno com ícones por tipo
 */

import React, { memo } from 'react';
import { FileText, Download, File, Image, Video, Music, Archive, Code, Sheet } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/lib/utils';

// Ícones por tipo de arquivo
const fileIcons = {
  // Documentos
  'pdf': { icon: FileText, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/20', emoji: '📄' },
  'doc': { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20', emoji: '📝' },
  'docx': { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20', emoji: '📝' },
  'txt': { icon: FileText, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-950/20', emoji: '📄' },
  'odt': { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20', emoji: '📝' },
  
  // Apresentações
  'ppt': { icon: Sheet, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20', emoji: '📊' },
  'pptx': { icon: Sheet, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20', emoji: '📊' },
  
  // Planilhas
  'xls': { icon: Sheet, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/20', emoji: '📊' },
  'xlsx': { icon: Sheet, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/20', emoji: '📊' },
  'csv': { icon: Sheet, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/20', emoji: '📊' },
  
  // Imagens
  'jpg': { icon: Image, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/20', emoji: '🖼️' },
  'jpeg': { icon: Image, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/20', emoji: '🖼️' },
  'png': { icon: Image, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/20', emoji: '🖼️' },
  'gif': { icon: Image, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/20', emoji: '🖼️' },
  'svg': { icon: Image, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/20', emoji: '🖼️' },
  
  // Vídeos
  'mp4': { icon: Video, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-950/20', emoji: '🎥' },
  'mov': { icon: Video, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-950/20', emoji: '🎥' },
  'avi': { icon: Video, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-950/20', emoji: '🎥' },
  
  // Áudio
  'mp3': { icon: Music, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-950/20', emoji: '🎵' },
  'wav': { icon: Music, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-950/20', emoji: '🎵' },
  
  // Comprimidos
  'zip': { icon: Archive, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/20', emoji: '📦' },
  'rar': { icon: Archive, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/20', emoji: '📦' },
  '7z': { icon: Archive, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/20', emoji: '📦' },
  
  // Código
  'js': { icon: Code, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20', emoji: '💻' },
  'jsx': { icon: Code, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20', emoji: '💻' },
  'py': { icon: Code, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20', emoji: '🐍' },
  'html': { icon: Code, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20', emoji: '🌐' },
  'css': { icon: Code, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20', emoji: '🎨' },
  
  // Padrão
  'default': { icon: File, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-950/20', emoji: '📁' }
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const MaterialCard = memo(({ file, onDownload, className }) => {
  const { name, file_name, title, size, file_size, url, file_url, file_type } = file;
  
  const fileName = name || file_name || title || 'Arquivo';
  const fileSize = size || file_size || 0;
  const fileUrl = url || file_url;
  
  // Extrair extensão
  const extension = (fileName.split('.').pop() || '').toLowerCase();
  const fileConfig = fileIcons[extension] || fileIcons.default;
  const IconComponent = fileConfig.icon;

  const handleDownload = (e) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload(file);
    } else if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <Card
      className={cn(
        'group relative p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-2',
        'bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800',
        'border-slate-200 dark:border-slate-700',
        className
      )}
      onClick={handleDownload}
    >
      {/* Decoração de fundo */}
      <div className={cn(
        'absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-50 transition-opacity',
        fileConfig.bg
      )} />

      <div className="relative space-y-3">
        {/* Ícone do arquivo */}
        <div className={cn(
          'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110',
          fileConfig.bg
        )}>
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl">{fileConfig.emoji}</span>
            <IconComponent className={cn('w-6 h-6', fileConfig.color)} />
          </div>
        </div>

        {/* Nome do arquivo */}
        <div className="text-center">
          <p className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2 min-h-[2.5rem]">
            {fileName}
          </p>
        </div>

        {/* Informações */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
          {/* Tamanho */}
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {formatFileSize(fileSize)}
          </span>

          {/* Extensão */}
          <span className={cn(
            'text-xs font-bold uppercase px-2 py-0.5 rounded',
            fileConfig.bg,
            fileConfig.color
          )}>
            {extension}
          </span>
        </div>

        {/* Botão de download */}
        <Button
          size="sm"
          variant="outline"
          className={cn(
            'w-full group-hover:shadow-md transition-all',
            fileConfig.color,
            'border-current hover:bg-current hover:text-white'
          )}
          onClick={handleDownload}
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </div>
    </Card>
  );
});

MaterialCard.displayName = 'MaterialCard';

export default MaterialCard;
