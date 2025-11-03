import { logger } from '@/shared/utils/logger';
import { supabase } from '@/shared/services/supabaseClient';

// Caminhos base para os buckets
export const BUCKETS = {
  DRAFTS: 'drafts', // Rascunhos de atividades
  ACTIVITIES: 'activities', // Atividades publicadas
  SUBMISSIONS: 'submissions', // Submissões dos alunos
};

/**
 * Faz upload de um arquivo para o bucket especificado
 * @param {File} file - Arquivo para upload
 * @param {string} bucket - Nome do bucket
 * @param {string} path - Caminho dentro do bucket (opcional)
 * @returns {Promise<{data: {path: string, publicUrl: string}, error: Error}>}
 */
export const uploadFile = async (file, bucket, path = '') => {
  try {
    // Gera um nome de arquivo único
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
    const filePath = path ? `${path}/${fileName}` : fileName;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Obtém a URL pública do arquivo
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return { 
      data: { 
        path: data.path, 
        publicUrl,
        fileName: file.name,
        fileType: file.type,
        size: file.size
      }, 
      error: null 
    };
  } catch (error) {
    logger.error('Error uploading file:', error)
    return { data: null, error };
  }
};

/**
 * Remove um arquivo do storage
 * @param {string} bucket - Nome do bucket
 * @param {string} path - Caminho do arquivo no bucket
 * @returns {Promise<{data: any, error: Error}>}
 */
export const removeFile = async (bucket, path) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Error removing file:', error)
    return { data: null, error };
  }
};

/**
 * Lista os arquivos de um bucket
 * @param {string} bucket - Nome do bucket
 * @param {string} path - Caminho para listar (opcional)
 * @returns {Promise<{data: Array, error: Error}>}
 */
export const listFiles = async (bucket, path = '') => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path);

    if (error) throw error;
    
    // Filtra pastas e arquivos ocultos
    const files = data.filter(file => file.name !== '.emptyFolderPlaceholder');
    
    // Para cada arquivo, obtém a URL pública
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(path ? `${path}/${file.name}` : file.name);
          
        return {
          ...file,
          publicUrl,
          fullPath: path ? `${path}/${file.name}` : file.name
        };
      })
    );

    return { data: filesWithUrls, error: null };
  } catch (error) {
    logger.error('Error listing files:', error)
    return { data: [], error };
  }
};

/**
 * Obtém a URL de download assinada de um arquivo
 * @param {string} bucket - Nome do bucket
 * @param {string} path - Caminho do arquivo
 * @returns {string} URL assinada para download
 */
export const getSignedUrl = (bucket, path) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
};

/**
 * Move um arquivo entre pastas ou buckets
 * @param {string} sourceBucket - Bucket de origem
 * @param {string} sourcePath - Caminho de origem
 * @param {string} destBucket - Bucket de destino
 * @param {string} destPath - Caminho de destino
 * @returns {Promise<{data: any, error: Error}>}
 */
export const moveFile = async (sourceBucket, sourcePath, destBucket, destPath) => {
  try {
    // Primeiro faz o download do arquivo
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(sourceBucket)
      .download(sourcePath);

    if (downloadError) throw downloadError;

    // Faz o upload para o novo local
    const { data: uploadData, error: uploadError } = await uploadFile(
      new File([fileData], destPath.split('/').pop(), { type: fileData.type }),
      destBucket,
      destPath.split('/').slice(0, -1).join('/')
    );

    if (uploadError) throw uploadError;

    // Remove o arquivo original
    await removeFile(sourceBucket, sourcePath);

    return { data: uploadData, error: null };
  } catch (error) {
    logger.error('Error moving file:', error)
    return { data: null, error };
  }
};

/**
 * Verifica se o arquivo existe no storage
 * @param {string} bucket - Nome do bucket
 * @param {string} path - Caminho do arquivo
 * @returns {Promise<boolean>}
 */
export const fileExists = async (bucket, path) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(path.split('/').slice(0, -1).join('/'));
    
  if (error) return false;
  return data.some(file => file.name === path.split('/').pop());
};

/**
 * Verifica se o arquivo é uma imagem
 * @param {string} fileType - Tipo MIME do arquivo
 * @returns {boolean}
 */
export const isImage = (fileType) => {
  return fileType && fileType.startsWith('image/');
};

/**
 * Obtém a URL de thumbnail de uma imagem
 * @param {string} bucket - Nome do bucket
 * @param {string} path - Caminho do arquivo
 * @param {Object} options - Opções de transformação
 * @param {number} options.width - Largura do thumbnail
 * @param {number} options.height - Altura do thumbnail
 * @param {number} options.quality - Qualidade da imagem (1-100)
 * @param {string} options.resize - Modo de redimensionamento ('cover', 'contain', 'fill')
 * @returns {string} URL do thumbnail
 */
export const getThumbnailUrl = (bucket, path, options = {}) => {
  const {
    width = 300,
    height = 300,
    quality = 80,
    resize = 'cover',
  } = options;

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path, {
      transform: {
        width,
        height,
        resize,
        quality,
      },
    });

  return data.publicUrl;
};

/**
 * Gera múltiplos tamanhos de thumbnail para uma imagem
 * @param {string} bucket - Nome do bucket
 * @param {string} path - Caminho do arquivo
 * @returns {Object} URLs dos thumbnails em diferentes tamanhos
 */
export const getMultipleThumbnails = (bucket, path) => {
  return {
    small: getThumbnailUrl(bucket, path, { width: 150, height: 150 }),
    medium: getThumbnailUrl(bucket, path, { width: 300, height: 300 }),
    large: getThumbnailUrl(bucket, path, { width: 600, height: 600 }),
    original: getSignedUrl(bucket, path),
  };
};

/**
 * Faz upload de arquivo com geração automática de thumbnail se for imagem
 * @param {File} file - Arquivo para upload
 * @param {string} bucket - Nome do bucket
 * @param {string} path - Caminho dentro do bucket (opcional)
 * @param {Object} options - Opções de thumbnail
 * @returns {Promise<{data: Object, error: Error}>}
 */
export const uploadFileWithThumbnail = async (file, bucket, path = '', options = {}) => {
  try {
    // Faz o upload do arquivo original
    const uploadResult = await uploadFile(file, bucket, path);
    
    if (uploadResult.error) {
      throw uploadResult.error;
    }

    const result = { ...uploadResult.data };

    // Se for uma imagem, gera URLs de thumbnail
    if (isImage(file.type)) {
      result.thumbnails = getMultipleThumbnails(bucket, uploadResult.data.path);
      result.isImage = true;
    } else {
      result.isImage = false;
    }

    return { data: result, error: null };
  } catch (error) {
    logger.error('Error uploading file with thumbnail:', error)
    return { data: null, error };
  }
};

/**
 * Obtém informações detalhadas de um arquivo, incluindo thumbnails se for imagem
 * @param {string} bucket - Nome do bucket
 * @param {string} path - Caminho do arquivo
 * @param {string} fileType - Tipo MIME do arquivo
 * @returns {Object} Informações do arquivo com URLs de thumbnail
 */
export const getFileInfo = (bucket, path, fileType) => {
  const publicUrl = getSignedUrl(bucket, path);
  
  const fileInfo = {
    path,
    publicUrl,
    isImage: isImage(fileType),
  };

  if (fileInfo.isImage) {
    fileInfo.thumbnails = getMultipleThumbnails(bucket, path);
  }

  return fileInfo;
};
