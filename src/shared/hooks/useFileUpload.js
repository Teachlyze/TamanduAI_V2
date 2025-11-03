import { logger } from '@/shared/utils/logger';
import { useState, useCallback } from 'react';
import { uploadFile, getPublicUrl } from '@/shared/services/apiSupabase';
import { useToast } from '@/shared/components/ui/use-toast';

/**
 * Hook personalizado para gerenciar o upload de arquivos
 * @param {Object} options - Opções de configuração
 * @param {string} options.bucket - Nome do bucket no Supabase Storage
 * @param {string} [options.pathPrefix=''] - Prefixo para o caminho do arquivo
 * @param {number} [options.maxSize=5] - Tamanho máximo do arquivo em MB
 * @param {string[]} [options.allowedTypes=[]] - Tipos de arquivo permitidos (ex: ['image/jpeg', 'application/pdf'])
 * @returns {Object} - Métodos e estado do upload
 */
export const useFileUpload = (options = {}) => {
  const { 
    bucket = 'uploads', 
    pathPrefix = '', 
    maxSize = 5, // 5MB
    allowedTypes = [] 
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const { toast } = useToast();

  /**
   * Valida o arquivo antes do upload
   * @param {File} file - Arquivo a ser validado
   * @returns {{isValid: boolean, error: string|null}} - Resultado da validação
   */
  const validateFile = useCallback((file) => {
    // Verifica o tamanho do arquivo
    if (file.size > maxSize * 1024 * 1024) {
      return {
        isValid: false,
        error: `O arquivo é muito grande. Tamanho máximo permitido: ${maxSize}MB`
      };
    }

    // Verifica o tipo do arquivo
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `Tipo de arquivo não suportado. Tipos permitidos: ${allowedTypes.join(', ')}`
      };
    }

    return { isValid: true, error: null };
  }, [maxSize, allowedTypes]);

  /**
   * Realiza o upload de um arquivo
   * @param {File} file - Arquivo a ser enviado
   * @param {Object} [metadata] - Metadados adicionais para o arquivo
   * @returns {Promise<{url: string, path: string, metadata: Object}>} - URL pública e metadados do arquivo
   */
  const upload = useCallback(async (file, metadata = {}) => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Valida o arquivo
      const { isValid, error: validationError } = validateFile(file);
      if (!isValid) {
        throw new Error(validationError);
      }

      // Gera um nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = pathPrefix ? `${pathPrefix}/${fileName}` : fileName;

      // Configura o progresso do upload
      const onProgress = (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setProgress(percentCompleted);
      };

      // Realiza o upload
      const uploadOptions = {
        cacheControl: '3600',
        upsert: false,
        ...metadata,
      };

      const { error: uploadError } = await uploadFile(
        bucket,
        filePath,
        file,
        onProgress,
        uploadOptions
      );

      if (uploadError) throw uploadError;

      // Obtém a URL pública do arquivo
      const publicUrl = getPublicUrl(bucket, filePath);
      
      // Adiciona o arquivo à lista de uploads
      const fileData = {
        name: file.name,
        type: file.type,
        size: file.size,
        url: publicUrl,
        path: filePath,
        uploadedAt: new Date().toISOString(),
        ...metadata
      };

      setUploadedFiles(prev => [...prev, fileData]);
      setProgress(100);
      
      return fileData;
    } catch (err) {
      logger.error('Erro ao fazer upload do arquivo:', err)
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Erro no upload',
        description: err.message || 'Ocorreu um erro ao fazer o upload do arquivo.',
      });
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, [bucket, pathPrefix, validateFile, toast]);

  /**
   * Remove um arquivo da lista de uploads
   * @param {string} filePath - Caminho do arquivo a ser removido
   */
  const removeFile = useCallback((filePath) => {
    setUploadedFiles(prev => prev.filter(file => file.path !== filePath));
  }, []);

  /**
   * Limpa todos os arquivos enviados
   */
  const clearFiles = useCallback(() => {
    setUploadedFiles([]);
    setProgress(0);
    setError(null);
  }, []);

  return {
    upload,
    removeFile,
    clearFiles,
    isUploading,
    progress,
    error,
    uploadedFiles,
  };
};

export default useFileUpload;
