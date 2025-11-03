import { logger } from '@/shared/utils/logger';
import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/shared/services/supabaseClient';
import { 
  BUCKETS, 
  removeFile, 
  moveFile, 
  uploadFileWithThumbnail,
  getMultipleThumbnails,
  isImage 
} from '@/shared/services/storageService';

/**
 * Hook para gerenciar arquivos de atividades
 * @param {string} activityId - ID da atividade
 * @param {string} userId - ID do usuário
 * @param {boolean} isDraft - Se a atividade é um rascunho
 * @returns {Object} Funções e estado para gerenciar arquivos
 */
const useActivityFiles = (activityId, userId, isDraft = false) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  // Determina o bucket com base no estado da atividade
  const getBucket = useCallback(() => {
    return isDraft ? BUCKETS.DRAFTS : BUCKETS.ACTIVITIES;
  }, [isDraft]);

  // Gera o caminho do arquivo no storage
  const getFilePath = useCallback((fileName) => {
    const timestamp = Date.now();
    const fileExt = fileName.split('.').pop();
    const uniqueId = uuidv4();
    return `${userId}/${activityId || 'temp'}/${timestamp}-${uniqueId}.${fileExt}`;
  }, [activityId, userId]);

  /**
   * Faz upload de um arquivo para a atividade (com thumbnails automáticos para imagens)
   * @param {File} file - Arquivo para upload
   * @returns {Promise<{id: string, name: string, url: string, path: string, size: number, type: string, thumbnails?: Object}>}
   */
  const uploadActivityFile = useCallback(async (file) => {
    if (!file) return null;
    
    setIsUploading(true);
    setError(null);
    
    try {
      const bucket = getBucket();
      const filePath = getFilePath(file.name);
      
      // Configura o progresso do upload
      const uploadOptions = {
        cacheControl: '3600',
        upsert: false,
        onProgress: (progress) => {
          const progressPercentage = Math.round((progress.loaded / progress.total) * 100);
          setUploadProgress(progressPercentage);
        }
      };
      
      // Faz o upload do arquivo
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, uploadOptions);
      
      if (uploadError) throw uploadError;
      
      // Obtém a URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
      
      // Prepara os metadados do arquivo
      const fileMetadata = {
        id: uuidv4(),
        name: file.name,
        url: publicUrl,
        path: data.path,
        size: file.size,
        type: file.type,
        isNew: true,
        isImage: isImage(file.type)
      };

      // Se for uma imagem, gera URLs de thumbnails em diferentes tamanhos
      if (fileMetadata.isImage) {
        fileMetadata.thumbnails = getMultipleThumbnails(bucket, data.path);
      }
      
      return fileMetadata;
    } catch (err) {
      logger.error('Erro ao fazer upload do arquivo:', err)
      setError(err.message || 'Erro ao fazer upload do arquivo');
      throw err;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [getBucket, getFilePath]);

  /**
   * Remove um arquivo da atividade
   * @param {string} filePath - Caminho do arquivo no storage
   * @returns {Promise<boolean>}
   */
  const removeActivityFile = useCallback(async (filePath) => {
    if (!filePath) return false;
    
    try {
      const bucket = getBucket();
      const { error } = await removeFile(bucket, filePath);
      
      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('Erro ao remover arquivo:', err)
      setError(err.message || 'Erro ao remover o arquivo');
      throw err;
    }
  }, [getBucket]);

  /**
   * Move os arquivos de rascunho para a pasta de atividades publicadas
   * @param {string} newActivityId - Novo ID da atividade (se for uma nova publicação)
   * @returns {Promise<Array>} Lista de arquivos movidos com as novas URLs
   */
  const publishActivityFiles = useCallback(async (newActivityId = null) => {
    try {
      if (!isDraft) {
        throw new Error('Apenas rascunhos podem ser publicados');
      }
      
      const sourceBucket = BUCKETS.DRAFTS;
      const targetBucket = BUCKETS.ACTIVITIES;
      const sourcePrefix = `${userId}/${activityId || 'temp'}`;
      const targetPrefix = `${userId}/${newActivityId || activityId}`;
      
      // Lista todos os arquivos no diretório de rascunho
      const { data: files, error: listError } = await supabase.storage
        .from(sourceBucket)
        .list(sourcePrefix);
      
      if (listError) throw listError;
      
      const movedFiles = [];
      
      // Move cada arquivo para o novo local
      for (const file of files) {
        const sourcePath = `${sourcePrefix}/${file.name}`;
        const targetPath = `${targetPrefix}/${file.name}`;
        
        // Move o arquivo
        const { error: moveError } = await moveFile(
          sourceBucket,
          sourcePath,
          targetBucket,
          targetPath
        );
        
        if (moveError) {
          logger.warn(`Falha ao mover o arquivo ${file.name}:`, moveError)
          continue;
        }
        
        // Obtém a nova URL pública
        const { data: { publicUrl } } = supabase.storage
          .from(targetBucket)
          .getPublicUrl(targetPath);
        
        movedFiles.push({
          originalPath: sourcePath,
          newPath: targetPath,
          url: publicUrl,
          name: file.name,
          type: file.metadata?.mimetype || 'application/octet-stream',
          size: file.metadata?.size || 0
        });
      }
      
      return movedFiles;
    } catch (err) {
      logger.error('Erro ao publicar arquivos da atividade:', err)
      setError(err.message || 'Erro ao publicar os arquivos da atividade');
      throw err;
    }
  }, [activityId, isDraft, userId]);

  /**
   * Faz upload de uma submissão de aluno (com thumbnails automáticos para imagens)
   * @param {File} file - Arquivo da submissão
   * @param {string} submissionId - ID da submissão
   * @returns {Promise<{id: string, name: string, url: string, path: string, size: number, type: string, thumbnails?: Object}>}
   */
  const uploadSubmission = useCallback(async (file, submissionId) => {
    if (!file || !submissionId) {
      throw new Error('Arquivo e ID de submissão são obrigatórios');
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      const bucket = BUCKETS.SUBMISSIONS;
      const filePath = `${userId}/${activityId}/${submissionId}/${file.name}`;
      
      // Configura o progresso do upload
      const uploadOptions = {
        cacheControl: '3600',
        upsert: false,
        onProgress: (progress) => {
          const progressPercentage = Math.round((progress.loaded / progress.total) * 100);
          setUploadProgress(progressPercentage);
        }
      };
      
      // Faz o upload do arquivo
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, uploadOptions);
      
      if (uploadError) throw uploadError;
      
      // Obtém a URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
      
      // Prepara os metadados do arquivo
      const fileMetadata = {
        id: uuidv4(),
        name: file.name,
        url: publicUrl,
        path: data.path,
        size: file.size,
        type: file.type,
        isNew: true,
        isImage: isImage(file.type)
      };

      // Se for uma imagem, gera URLs de thumbnails em diferentes tamanhos
      if (fileMetadata.isImage) {
        fileMetadata.thumbnails = getMultipleThumbnails(bucket, data.path);
      }
      
      return fileMetadata;
    } catch (err) {
      logger.error('Erro ao fazer upload da submissão:', err)
      setError(err.message || 'Erro ao fazer upload da submissão');
      throw err;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [activityId, userId]);

  return {
    isUploading,
    uploadProgress,
    error,
    uploadActivityFile,
    removeActivityFile,
    publishActivityFiles,
    uploadSubmission,
    resetError: () => setError(null)
  };
};

export default useActivityFiles;
