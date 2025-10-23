import React, { useMemo, useState } from 'react';
import { X, FileText, Image as ImageIcon, FileVideo, FileAudio, FileArchive, File as FileIcon, Download } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { ScrollArea } from '@/shared/components/ui/scroll-area';

const FilePreview = ({ file, onClose, onDownload }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  const fileType = useMemo(() => {
    if (!file) return 'unknown';
    
    const type = file.type || '';
    
    if (type.startsWith('image/')) return 'image';
    if (type === 'application/pdf') return 'pdf';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    if (type.includes('zip') || type.includes('compressed')) return 'archive';
    if (type.includes('text') || type.includes('document')) return 'text';
    
    return 'unknown';
  }, [file]);
  
  const getFileIcon = (size = 24) => {
    switch (fileType) {
      case 'image':
        return <ImageIcon size={size} className="text-blue-500" />;
      case 'pdf':
        return <FileText size={size} className="text-red-500" />;
      case 'video':
        return <FileVideo size={size} className="text-purple-500" />;
      case 'audio':
        return <FileAudio size={size} className="text-green-500" />;
      case 'archive':
        return <FileArchive size={size} className="text-yellow-500" />;
      case 'text':
        return <FileText size={size} className="text-blue-400" />;
      default:
        return <FileIcon size={size} className="text-gray-400" />;
    }
  };
  
  const renderPreview = () => {
    if (!file) return null;
    
    const url = file.url || URL.createObjectURL(file);
    
    switch (fileType) {
      case 'image':
        return (
          <div className="flex justify-center p-4">
            <img 
              src={url} 
              alt={file.name} 
              className="max-h-[70vh] max-w-full object-contain rounded-md shadow-lg"
            />
          </div>
        );
        
      case 'pdf':
        return (
          <div className="h-[70vh] w-full">
            <iframe 
              src={url} 
              title={file.name}
              className="w-full h-full border rounded-md"
            />
          </div>
        );
        
      case 'video':
        return (
          <div className="flex justify-center p-4">
            <video 
              controls 
              className="max-h-[70vh] max-w-full rounded-md shadow-lg"
            >
              <source src={url} type={file.type} />
              Seu navegador não suporta a reprodução de vídeos.
            </video>
          </div>
        );
        
      case 'audio':
        return (
          <div className="p-8 flex flex-col items-center">
            <div className="mb-4 text-6xl">
              {getFileIcon(64)}
            </div>
            <p className="mb-4 text-center text-sm text-muted-foreground">{file.name}</p>
            <audio controls className="w-full max-w-md">
              <source src={url} type={file.type} />
              Seu navegador não suporta a reprodução de áudio.
            </audio>
          </div>
        );
        
      default:
        return (
          <div className="p-8 flex flex-col items-center">
            <div className="mb-4 text-6xl">
              {getFileIcon(64)}
            </div>
            <p className="text-center text-muted-foreground">
              Visualização não disponível para este tipo de arquivo.
            </p>
          </div>
        );
    }
  };
  
  if (!file) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setIsOpen(false);
        setTimeout(() => onClose?.(), 200);
      }
    }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="truncate max-w-[80%]">{file.name}</span>
            <div className="flex-1" />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onDownload?.(file)}
              title="Baixar arquivo"
            >
              <Download className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh] pr-4">
          {renderPreview()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreview;
