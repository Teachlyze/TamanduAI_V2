import { logger } from '@/shared/utils/logger';
import React, { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Input } from '@/shared/components/ui/input';
import { useToast } from '@/shared/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const ImportActivityModal = ({ open, onClose }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const supportedFormats = [
    { ext: '.txt', label: 'Texto (TXT)', mime: 'text/plain' },
    { ext: '.pdf', label: 'PDF', mime: 'application/pdf' },
    { ext: '.docx', label: 'Word (DOCX)', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { ext: '.odt', label: 'OpenDocument (ODT)', mime: 'application/vnd.oasis.opendocument.text' }
  ];

  const handleFileSelect = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validar tipo de arquivo
    const extension = '.' + selectedFile.name.split('.').pop().toLowerCase();
    const isSupported = supportedFormats.some(format => format.ext === extension);
    
    if (!isSupported) {
      toast({
        title: 'Formato não suportado',
        description: `Por favor, selecione um arquivo ${supportedFormats.map(f => f.ext.toUpperCase()).join(', ')}`,
        variant: 'destructive'
      });
      return;
    }

    setFile(selectedFile);
    await extractTextFromFile(selectedFile);
  };

  const extractTextFromFile = async (file) => {
    try {
      setProcessing(true);
      
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      
      // Extrair texto baseado no tipo de arquivo
      let text = '';
      
      if (fileExtension === '.txt') {
        // TXT: Leitura direta
        text = await file.text();
      } 
      else if (fileExtension === '.pdf') {
        // PDF: Mostrar mensagem que precisa de biblioteca
        text = `[Conteúdo extraído do PDF: ${file.name}]\n\n` +
               `NOTA: Para extração completa de PDF, instale a biblioteca 'pdf-parse'.\n\n` +
               `Por enquanto, cole o conteúdo manualmente abaixo.`;
      }
      else if (fileExtension === '.docx') {
        // DOCX: Mostrar mensagem que precisa de biblioteca
        text = `[Conteúdo extraído do DOCX: ${file.name}]\n\n` +
               `NOTA: Para extração completa de DOCX, instale a biblioteca 'mammoth'.\n\n` +
               `Por enquanto, cole o conteúdo manualmente abaixo.`;
      }
      else if (fileExtension === '.odt') {
        // ODT: Mostrar mensagem
        text = `[Conteúdo extraído do ODT: ${file.name}]\n\n` +
               `NOTA: Para extração completa de ODT, instale biblioteca apropriada.\n\n` +
               `Por enquanto, cole o conteúdo manualmente abaixo.`;
      }
      
      setExtractedText(text);
      
      // Tentar extrair título do nome do arquivo
      const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extensão
      setTitle(fileName);
      
      toast({
        title: 'Arquivo carregado',
        description: fileExtension === '.txt' 
          ? 'Texto extraído com sucesso!' 
          : 'Revise e edite o conteúdo abaixo.'
      });
      
    } catch (error) {
      logger.error('Erro ao processar arquivo:', error)
      toast({
        title: 'Erro ao processar arquivo',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleImport = () => {
    if (!title.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Insira um título para a atividade',
        variant: 'destructive'
      });
      return;
    }

    if (!extractedText.trim()) {
      toast({
        title: 'Conteúdo vazio',
        description: 'O arquivo não possui conteúdo ou não foi processado',
        variant: 'destructive'
      });
      return;
    }

    // Navegar para criação de atividade com dados pré-preenchidos
    const activityData = {
      title: title.trim(),
      description: description.trim() || extractedText.substring(0, 200) + '...',
      content: extractedText,
      imported: true,
      importedFrom: file?.name
    };

    // Armazenar temporariamente no sessionStorage
    sessionStorage.setItem('importedActivity', JSON.stringify(activityData));
    
    toast({
      title: 'Importação concluída',
      description: 'Redirecionando para editor de atividades...'
    });

    // Fechar modal e navegar
    onClose();
    navigate('/dashboard/activities/create');
  };

  const handleReset = () => {
    setFile(null);
    setExtractedText('');
    setTitle('');
    setDescription('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importar Atividade de Arquivo
          </DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo (TXT, PDF, DOCX, ODT) e extraia o conteúdo para criar uma atividade
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Upload Area */}
          {!file ? (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8">
              <div className="text-center">
                <Upload className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <p className="text-lg font-medium mb-2">Selecione um arquivo</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Formatos suportados: {supportedFormats.map(f => f.ext.toUpperCase()).join(', ')}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={supportedFormats.map(f => f.ext).join(',')}
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button asChild variant="outline" size="lg">
                    <span className="cursor-pointer">
                      <FileText className="w-4 h-4 mr-2" />
                      Escolher Arquivo
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          ) : (
            <>
              {/* File Info */}
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <div className="flex items-center gap-3">
                  {processing ? (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={processing}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Título da Atividade *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Digite o título..."
                  disabled={processing}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (Opcional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descrição da atividade..."
                  rows={2}
                  disabled={processing}
                />
              </div>

              {/* Extracted Text */}
              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo Extraído</Label>
                <Textarea
                  id="content"
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  placeholder="O conteúdo extraído aparecerá aqui..."
                  rows={12}
                  disabled={processing}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-slate-500">
                  Você pode editar o conteúdo extraído antes de importar
                </p>
              </div>

              {/* Warning for PDF/DOCX */}
              {file && (file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.name.endsWith('.odt')) && (
                <div className="flex items-start gap-2 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                      Extração Manual Necessária
                    </p>
                    <p className="text-amber-700 dark:text-amber-300">
                      Para arquivos {file.name.split('.').pop().toUpperCase()}, copie e cole o conteúdo manualmente no campo acima.
                      Para extração automática, as bibliotecas 'pdf-parse' (PDF) ou 'mammoth' (DOCX) precisam ser instaladas.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={processing}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || !title.trim() || !extractedText.trim() || processing}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Importar e Criar Atividade
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportActivityModal;
