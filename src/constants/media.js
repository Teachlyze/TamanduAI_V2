/**
 * Tipos de mídia e configurações relacionadas
 * Valores configuráveis através de variáveis de ambiente
 */

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
];

// Configuração através de variáveis de ambiente
export const MAX_FILE_SIZE = parseInt(import.meta.env.VITE_MAX_FILE_SIZE_MB || '10') * 1024 * 1024; // MB para bytes

export const FILE_ICONS = {
  // Documentos
  'application/pdf': { icon: 'FileText', color: 'text-red-500' },
  'application/msword': { icon: 'FileText', color: 'text-blue-500' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: 'FileText', color: 'text-blue-500' },
  'application/vnd.ms-excel': { icon: 'FileSpreadsheet', color: 'text-green-600' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: 'FileSpreadsheet', color: 'text-green-600' },
  'application/vnd.ms-powerpoint': { icon: 'FileSlides', color: 'text-orange-500' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: 'FileSlides', color: 'text-orange-500' },
  'text/plain': { icon: 'FileText', color: 'text-gray-700 dark:text-gray-400' },

  // Imagens
  'image/': { icon: 'FileImage', color: 'text-purple-500' },

  // Compactados
  'application/zip': { icon: 'FileArchive', color: 'text-yellow-500' },
  'application/x-zip-compressed': { icon: 'FileArchive', color: 'text-yellow-500' },

  // Mídia
  'video/': { icon: 'FileVideo', color: 'text-pink-500' },
  'audio/': { icon: 'FileAudio', color: 'text-indigo-500' },

  // Padrão
  'default': { icon: 'File', color: 'text-gray-400' },
};

export const MEDIA_BUCKETS = {
  MEETING_ATTACHMENTS: import.meta.env.VITE_MEETING_ATTACHMENTS_BUCKET || 'meeting-attachments',
  PROFILE_PHOTOS: import.meta.env.VITE_PROFILE_PHOTOS_BUCKET || 'profile-photos',
  CLASS_MATERIALS: import.meta.env.VITE_CLASS_MATERIALS_BUCKET || 'class-materials',
};

// Tipos de arquivo aceitos baseados em configuração
const getAllowedExtensions = () => {
  const allowedTypes = import.meta.env.VITE_ALLOWED_FILE_TYPES || 'pdf,jpeg,png,gif,doc,docx,xls,xlsx,ppt,pptx,txt,zip';
  return allowedTypes.split(',').map(type => type.trim());
};

// Exportar função auxiliar se necessário em outros lugares
export { getAllowedExtensions };

export const ACCEPTED_FILE_TYPES = {
  IMAGES: 'image/jpeg,image/png,image/gif',
  DOCUMENTS: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain',
  ARCHIVES: 'application/zip,application/x-zip-compressed',
  ALL: 'image/jpeg,image/png,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,application/zip,application/x-zip-compressed',
};

export default {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  FILE_ICONS,
  MEDIA_BUCKETS,
  ACCEPTED_FILE_TYPES,
};
