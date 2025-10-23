import React, { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/shared/utils/cn';
import { Button } from './button';
import { Progress } from './progress';
import { X, Upload, File, Check, AlertCircle } from 'lucide-react';
import { useToast } from './use-toast';

/**
 * Componente de upload de arquivo com arrastar e soltar
 * @param {Object} props - Propriedades do componente
 * @param {string} [props.bucket='uploads'] - Nome do bucket no Supabase Storage
 * @param {string} [props.pathPrefix=''] - Prefixo para o caminho do arquivo
 * @param {number} [props.maxSize=5] - Tamanho máximo do arquivo em MB
 * @param {string[]} [props.allowedTypes=[]] - Tipos de arquivo permitidos (ex: ['image/jpeg', 'application/pdf'])
 * @param {number} [props.maxFiles=1] - Número máximo de arquivos permitidos
 * @param {function} [props.onUploadSuccess] - Callback chamado quando o upload for concluído com sucesso
 * @param {function} [props.onUploadError] - Callback chamado quando ocorrer um erro no upload
 * @param {string} [props.label='Arraste e solte arquivos aqui, ou clique para selecionar'] - Texto de ajuda
 * @param {string} [props.className] - Classes CSS adicionais
 * @returns {JSX.Element} - Componente de upload
 */
const FileUpload = ({
  bucket = 'uploads',
  pathPrefix = '',
  maxSize = 5,
  allowedTypes = [],
  maxFiles = 1,
  onUploadSuccess,
  onUploadError,
  label = 'Arraste e solte arquivos aqui, ou clique para selecionar',
  className,
  ...props
}) => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  // Configuração do dropzone
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError(null);
    
    // Trata arquivos rejeitados
    if (rejectedFiles.length > 0) {
      const rejectionReasons = rejectedFiles.map(({ file, errors }) => ({
        name: file.name,
        reasons: errors.map(err => {
          if (err.code === 'file-too-large') {
            return `Arquivo muito grande (máx. ${maxSize}MB)`;
          }
          if (err.code === 'file-invalid-type') {
            return 'Tipo de arquivo não suportado';
          }
          return err.message;
        }).join(', ')
      }));

      setError(
        `Não foi possível adicionar ${rejectionReasons.length} arquivo(s):\n` +
        rejectionReasons.map(f => `• ${f.name}: ${f.reasons}`).join('\n')
      );
      
      if (onUploadError) {
        onUploadError(new Error('Alguns arquivos não atenderam aos requisitos'));
      }
    }

    // Adiciona apenas os arquivos aceitos
    if (acceptedFiles.length > 0) {
      const newFiles = acceptedFiles.map(file => ({
        file,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending',
        progress: 0
      }));

      setFiles(prevFiles => {
        const updatedFiles = [...prevFiles, ...newFiles].slice(0, maxFiles);
        return updatedFiles;
      });
    }
  }, [maxFiles, maxSize, onUploadError]);

  // Configuração do dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: maxSize * 1024 * 1024, // Converte MB para bytes
    accept: allowedTypes.length > 0 ? Object.fromEntries(
      allowedTypes.map(type => [type, []])
    ) : undefined,
    maxFiles,
    disabled: isUploading || (files.length >= maxFiles && maxFiles > 0),
  });

  // Função para remover um arquivo
  const removeFile = (fileId) => {
    setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId));
  };

  // Função para fazer upload dos arquivos
  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const uploadPromises = files.map(async (fileData) => {
        try {
          const formData = new FormData();
          formData.append('file', fileData.file);
          
          // Simula o upload (substitua por sua lógica de upload real)
          // Exemplo com fetch:
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            // Adicione headers de autenticação se necessário
          });
          
          if (!response.ok) {
            throw new Error('Falha no upload do arquivo');
          }
          
          const result = await response.json();
          
          // Atualiza o status do arquivo
          return {
            ...fileData,
            status: 'completed',
            progress: 100,
            url: result.url,
            path: result.path
          };
        } catch (err) {
          console.error(`Erro ao fazer upload de ${fileData.name}:`, err);
          return {
            ...fileData,
            status: 'error',
            error: err.message
          };
        }
      });

      const results = await Promise.all(uploadPromises);
      setFiles(results);
      
      // Chama o callback de sucesso
      if (onUploadSuccess) {
        const successfulUploads = results.filter(f => f.status === 'completed');
        onUploadSuccess(successfulUploads);
      }
      
      // Mostra notificação de sucesso
      toast({
        title: 'Upload concluído',
        description: `${results.filter(f => f.status === 'completed').length} arquivo(s) enviado(s) com sucesso.`,
      });
      
    } catch (err) {
      console.error('Erro durante o upload:', err);
      setError(err.message);
      
      if (onUploadError) {
        onUploadError(err);
      }
      
      toast({
        variant: 'destructive',
        title: 'Erro no upload',
        description: err.message || 'Ocorreu um erro ao fazer o upload dos arquivos.',
      });
      
    } finally {
      setIsUploading(false);
    }
  };

  // Função para formatar o tamanho do arquivo
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Função para obter o ícone com base no tipo de arquivo
  const getFileIcon = (fileType) => {
    if (!fileType) return <File className="h-4 w-4" />;
    
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    
    if (fileType.includes('pdf')) {
      return <FileText className="h-4 w-4" />;
    }
    
    if (fileType.includes('word') || fileType.includes('document')) {
      return <FileWord className="h-4 w-4" />;
    }
    
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return <FileSpreadsheet className="h-4 w-4" />;
    }
    
    if (fileType.includes('zip') || fileType.includes('compressed')) {
      return <FileArchive className="h-4 w-4" />;
    }
    
    return <File className="h-4 w-4" />;
  };

  return (
    <div className={cn('space-y-4', className)} {...props}>
      {/* Área de dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50',
          isUploading && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} ref={fileInputRef} />
        <div className="flex flex-col items-center justify-center space-y-2">
          <Upload className={cn('h-8 w-8', isDragActive ? 'text-primary' : 'text-muted-foreground')} />
          <p className="text-sm text-muted-foreground">
            {isDragActive ? 'Solte os arquivos aqui...' : label}
          </p>
          <p className="text-xs text-muted-foreground">
            {allowedTypes.length > 0 
              ? `Formatos suportados: ${allowedTypes.join(', ')}`
              : 'Qualquer tipo de arquivo'}
            {maxSize > 0 && ` • Máx. ${maxSize}MB por arquivo`}
            {maxFiles > 0 && ` • Máx. ${maxFiles} arquivo(s)`}
          </p>
        </div>
      </div>

      {/* Lista de arquivos */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Arquivos selecionados ({files.length})</h4>
          <div className="space-y-2">
            {files.map((file) => (
              <div 
                key={file.id} 
                className="flex items-center justify-between p-3 border rounded-md bg-card"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      {file.status === 'completed' && (
                        <span className="inline-flex items-center text-green-600">
                          <Check className="h-3 w-3 mr-1" /> Concluído
                        </span>
                      )}
                      {file.status === 'error' && (
                        <span className="inline-flex items-center text-destructive">
                          <AlertCircle className="h-3 w-3 mr-1" /> Erro
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remover arquivo</span>
                </Button>
              </div>
            ))}
          </div>

          {/* Barra de progresso */}
          {isUploading && (
            <div className="pt-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right mt-1">
                Enviando arquivos... {Math.round(progress)}%
              </p>
            </div>
          )}

          {/* Mensagem de erro */}
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              {error}
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFiles([])}
              disabled={isUploading || files.length === 0}
            >
              Limpar
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || files.length === 0}
            >
              {isUploading ? 'Enviando...' : 'Enviar arquivos'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export { FileUpload };

export default FileUpload;
