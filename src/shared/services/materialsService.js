import { supabase } from '@/shared/services/supabaseClient';

/**
 * Materials Service
 * Gerencia upload, organização e acesso a materiais da turma
 */

/**
 * Get all materials for a class
 * @param {string} classId - Class ID
 * @param {Object} filters - Optional filters (category, tags, search)
 * @returns {Promise<Array>} Materials
 */
export const getMaterials = async (classId, filters = {}) => {
  try {
    let query = supabase
      .from('class_materials')
      .select(`
        *,
        uploader:uploaded_by(id, full_name, avatar_url)
      `)
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    // Filter by category
    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    // Search by title/description
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting materials:', error);
    throw error;
  }
};

/**
 * Get a single material by ID
 * @param {string} materialId - Material ID
 * @returns {Promise<Object>} Material
 */
export const getMaterial = async (materialId) => {
  try {
    const { data, error } = await supabase
      .from('class_materials')
      .select(`
        *,
        uploader:uploaded_by(id, full_name, avatar_url),
        class:class_id(id, name)
      `)
      .eq('id', materialId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting material:', error);
    throw error;
  }
};

/**
 * Upload a new material
 * @param {string} classId - Class ID
 * @param {File} file - File object
 * @param {Object} metadata - Material metadata
 * @returns {Promise<Object>} Created material
 */
export const uploadMaterial = async (classId, file, metadata) => {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    // 1. Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${classId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('class-materials')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // 2. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('class-materials')
      .getPublicUrl(fileName);

    // 3. Create material record
    const { data, error } = await supabase
      .from('class_materials')
      .insert({
        class_id: classId,
        title: metadata.title || file.name,
        description: metadata.description || null,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
        category: metadata.category || 'outros',
        tags: metadata.tags || [],
        uploaded_by: userId,
        created_by: userId,
        is_public: metadata.is_public || false,
      })
      .select(`
        *,
        uploader:uploaded_by(id, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error uploading material:', error);
    throw error;
  }
};

/**
 * Update material metadata
 * @param {string} materialId - Material ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated material
 */
export const updateMaterial = async (materialId, updates) => {
  try {
    const { data, error } = await supabase
      .from('class_materials')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', materialId)
      .select(`
        *,
        uploader:uploaded_by(id, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating material:', error);
    throw error;
  }
};

/**
 * Delete a material
 * @param {string} materialId - Material ID
 * @returns {Promise<void>}
 */
export const deleteMaterial = async (materialId) => {
  try {
    // 1. Get material to extract file path
    const material = await getMaterial(materialId);
    if (!material) throw new Error('Material not found');

    // 2. Delete file from storage
    const filePath = material.file_url.split('/class-materials/')[1];
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('class-materials')
        .remove([filePath]);

      if (storageError) console.warn('Error deleting file from storage:', storageError);
    }

    // 3. Delete database record
    const { error } = await supabase
      .from('class_materials')
      .delete()
      .eq('id', materialId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting material:', error);
    throw error;
  }
};

/**
 * Get material statistics for a class
 * @param {string} classId - Class ID
 * @returns {Promise<Object>} Statistics
 */
export const getMaterialStats = async (classId) => {
  try {
    const { data, error } = await supabase
      .from('class_materials')
      .select('id, file_size, category, file_type')
      .eq('class_id', classId);

    if (error) throw error;

    const stats = {
      total_materials: data.length,
      total_size: data.reduce((sum, m) => sum + (m.file_size || 0), 0),
      by_category: {},
      by_type: {},
    };

    data.forEach(material => {
      // Count by category
      const cat = material.category || 'outros';
      stats.by_category[cat] = (stats.by_category[cat] || 0) + 1;

      // Count by type
      const type = material.file_type?.split('/')[0] || 'other';
      stats.by_type[type] = (stats.by_type[type] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Error getting material stats:', error);
    throw error;
  }
};

/**
 * Get categories for a class
 * @param {string} classId - Class ID
 * @returns {Promise<Array>} Unique categories
 */
export const getCategories = async (classId) => {
  try {
    const { data, error } = await supabase
      .from('class_materials')
      .select('category')
      .eq('class_id', classId);

    if (error) throw error;

    const uniqueCategories = [...new Set(data.map(m => m.category).filter(Boolean))];
    return uniqueCategories;
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
};

/**
 * Get all tags for a class
 * @param {string} classId - Class ID
 * @returns {Promise<Array>} Unique tags
 */
export const getTags = async (classId) => {
  try {
    const { data, error } = await supabase
      .from('class_materials')
      .select('tags')
      .eq('class_id', classId);

    if (error) throw error;

    const tagSet = new Set();
    data.forEach(material => {
      if (material.tags && Array.isArray(material.tags)) {
        material.tags.forEach(tag => tagSet.add(tag));
      }
    });

    return [...tagSet];
  } catch (error) {
    console.error('Error getting tags:', error);
    throw error;
  }
};

/**
 * Duplicate material to another class
 * @param {string} materialId - Material ID to duplicate
 * @param {string} targetClassId - Target class ID
 * @returns {Promise<Object>} Duplicated material
 */
export const duplicateMaterial = async (materialId, targetClassId) => {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    const original = await getMaterial(materialId);
    if (!original) throw new Error('Material not found');

    const { data, error } = await supabase
      .from('class_materials')
      .insert({
        class_id: targetClassId,
        title: `${original.title} (cópia)`,
        description: original.description,
        file_url: original.file_url, // Same file
        file_type: original.file_type,
        file_size: original.file_size,
        category: original.category,
        tags: original.tags,
        uploaded_by: userId,
        created_by: userId,
        is_public: original.is_public,
      })
      .select(`
        *,
        uploader:uploaded_by(id, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error duplicating material:', error);
    throw error;
  }
};

/**
 * Download material file
 * @param {string} fileUrl - Material file URL
 * @param {string} fileName - Desired file name
 */
export const downloadMaterial = (fileUrl, fileName) => {
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = fileName;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

/**
 * Get file icon by type
 * @param {string} fileType - MIME type
 * @returns {string} Icon name
 */
export const getFileIcon = (fileType) => {
  if (!fileType) return 'file';
  
  if (fileType.startsWith('image/')) return 'image';
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.startsWith('audio/')) return 'music';
  if (fileType === 'application/pdf') return 'file-text';
  if (fileType.includes('word') || fileType.includes('document')) return 'file-text';
  if (fileType.includes('sheet') || fileType.includes('excel')) return 'table';
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'presentation';
  if (fileType.includes('zip') || fileType.includes('rar')) return 'archive';
  
  return 'file';
};

export default {
  getMaterials,
  getMaterial,
  uploadMaterial,
  updateMaterial,
  deleteMaterial,
  getMaterialStats,
  getCategories,
  getTags,
  duplicateMaterial,
  downloadMaterial,
  formatFileSize,
  getFileIcon,
};
