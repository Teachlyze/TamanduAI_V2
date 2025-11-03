import { logger } from '@/shared/utils/logger';
import { supabase } from '@/shared/services/supabaseClient';

/**
 * Chatbot Version Service
 * Manages versioning and rollback for chatbot configurations
 */

export const ChatbotVersionService = {
  /**
   * Create a new version snapshot of chatbot configuration
   * @param {string} classId - Class ID
   * @param {Object} config - Current configuration
   * @param {string} changeDescription - Description of changes
   * @returns {Promise<Object>} - Created version
   */
  async createVersion(classId, config, changeDescription = 'Configuração atualizada') {
    try {
      // Get current configuration
      const { data: currentConfig, error: fetchError } = await supabase
        .from('chatbot_configurations')
        .select('*')
        .eq('class_id', classId)
        .single();

      if (fetchError) throw fetchError;

      // Create version snapshot
      const version = {
        class_id: classId,
        config_snapshot: currentConfig,
        version_number: await this.getNextVersionNumber(classId),
        change_description: changeDescription,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('chatbot_config_versions')
        .insert(version)
        .select()
        .single();

      if (error) throw error;

      logger.debug('Version created:', data)
      return data;
    } catch (error) {
      logger.error('Error creating version:', error)
      throw error;
    }
  },

  /**
   * Get next version number for a class
   * @param {string} classId - Class ID
   * @returns {Promise<number>} - Next version number
   */
  async getNextVersionNumber(classId) {
    const { data, error } = await supabase
      .from('chatbot_config_versions')
      .select('version_number')
      .eq('class_id', classId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

    return (data?.version_number || 0) + 1;
  },

  /**
   * Get all versions for a class
   * @param {string} classId - Class ID
   * @returns {Promise<Array>} - Array of versions
   */
  async getVersions(classId) {
    const { data, error } = await supabase
      .from('chatbot_config_versions')
      .select(`
        *,
        created_by_user:profiles!chatbot_config_versions_created_by_fkey(id, full_name)
      `)
      .eq('class_id', classId)
      .order('version_number', { ascending: false });

    if (error) throw error;

    return data || [];
  },

  /**
   * Get a specific version
   * @param {string} versionId - Version ID
   * @returns {Promise<Object>} - Version data
   */
  async getVersion(versionId) {
    const { data, error } = await supabase
      .from('chatbot_config_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) throw error;

    return data;
  },

  /**
   * Rollback to a specific version
   * @param {string} classId - Class ID
   * @param {string} versionId - Version ID to rollback to
   * @returns {Promise<Object>} - Restored configuration
   */
  async rollbackToVersion(classId, versionId) {
    try {
      // Get the version to restore
      const version = await this.getVersion(versionId);

      if (version.class_id !== classId) {
        throw new Error('Version does not belong to this class');
      }

      // Create a backup of current config before rollback
      await this.createVersion(
        classId,
        version.config_snapshot,
        `Rollback para versão ${version.version_number}`
      );

      // Restore the configuration
      const { data, error } = await supabase
        .from('chatbot_configurations')
        .update({
          ...version.config_snapshot,
          updated_at: new Date().toISOString()
        })
        .eq('class_id', classId)
        .select()
        .single();

      if (error) throw error;

      logger.debug('Rollback successful:', data)
      return data;
    } catch (error) {
      logger.error('Error rolling back:', error)
      throw error;
    }
  },

  /**
   * Delete a version (soft delete)
   * @param {string} versionId - Version ID
   * @returns {Promise<boolean>} - Success
   */
  async deleteVersion(versionId) {
    const { error } = await supabase
      .from('chatbot_config_versions')
      .delete()
      .eq('id', versionId);

    if (error) throw error;

    return true;
  },

  /**
   * Compare two versions
   * @param {string} versionId1 - First version ID
   * @param {string} versionId2 - Second version ID
   * @returns {Promise<Object>} - Comparison result
   */
  async compareVersions(versionId1, versionId2) {
    const [version1, version2] = await Promise.all([
      this.getVersion(versionId1),
      this.getVersion(versionId2)
    ]);

    const diff = {
      version1: version1.version_number,
      version2: version2.version_number,
      changes: {}
    };

    // Compare configurations
    const keys = new Set([
      ...Object.keys(version1.config_snapshot),
      ...Object.keys(version2.config_snapshot)
    ]);

    keys.forEach(key => {
      const val1 = JSON.stringify(version1.config_snapshot[key]);
      const val2 = JSON.stringify(version2.config_snapshot[key]);

      if (val1 !== val2) {
        diff.changes[key] = {
          before: version1.config_snapshot[key],
          after: version2.config_snapshot[key]
        };
      }
    });

    return diff;
  },

  /**
   * Get version history with changes
   * @param {string} classId - Class ID
   * @param {number} limit - Number of versions to return
   * @returns {Promise<Array>} - Version history
   */
  async getVersionHistory(classId, limit = 10) {
    const versions = await this.getVersions(classId);
    
    const history = versions.slice(0, limit).map((version, index) => ({
      ...version,
      isLatest: index === 0,
      canRollback: index > 0
    }));

    return history;
  },

  /**
   * Auto-save version on configuration update
   * @param {string} classId - Class ID
   * @param {Object} newConfig - New configuration
   * @param {string} changeDescription - Description of changes
   * @returns {Promise<Object>} - Updated configuration with version
   */
  async updateWithVersioning(classId, newConfig, changeDescription) {
    try {
      // Create version before updating
      await this.createVersion(classId, newConfig, changeDescription);

      // Update configuration
      const { data, error } = await supabase
        .from('chatbot_configurations')
        .update({
          ...newConfig,
          updated_at: new Date().toISOString()
        })
        .eq('class_id', classId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      logger.error('Error updating with versioning:', error)
      throw error;
    }
  }
};

export default ChatbotVersionService;
