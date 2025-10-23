// Service for managing RAG training sources
import { supabase } from '@/shared/services/supabaseClient';
import { Logger } from '@/shared/services/logger';

export const RAGTrainingService = {
  /**
   * Get all training sources for a class
   */
  async getTrainingSources(classId) {
    try {
      const { data, error } = await supabase
        .from('rag_training_sources')
        .select(`
          id,
          class_id,
          material_id,
          activity_id,
          file_name,
          file_type,
          is_active,
          embedding_status,
          created_at,
          class_materials (
            id,
            title,
            description,
            material_type
          ),
          activities (
            id,
            title,
            description,
            activity_type,
            status
          )
        `)
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Format data
      return data.map(source => ({
        id: source.id,
        sourceType: source.material_id ? 'material' : 'activity',
        sourceId: source.material_id || source.activity_id,
        name: source.file_name,
        type: source.file_type,
        isActive: source.is_active,
        embeddingStatus: source.embedding_status,
        createdAt: source.created_at,
        details: source.material_id ? source.class_materials : source.activities
      }));
    } catch (error) {
      Logger.error('Error fetching training sources', error);
      throw error;
    }
  },

  /**
   * Get available materials for training (not yet added)
   */
  async getAvailableMaterials(classId) {
    try {
      // Get all materials for this class
      const { data: classMaterials, error: materialsError } = await supabase
        .from('material_class_assignments')
        .select(`
          material_id,
          class_materials (
            id,
            title,
            description,
            file_url,
            material_type,
            file_size
          )
        `)
        .eq('class_id', classId);

      if (materialsError) throw materialsError;

      // Get already added materials
      const { data: existingSources, error: sourcesError } = await supabase
        .from('rag_training_sources')
        .select('material_id')
        .eq('class_id', classId)
        .not('material_id', 'is', null);

      if (sourcesError) throw sourcesError;

      const addedMaterialIds = new Set(existingSources.map(s => s.material_id));

      // Filter out already added materials
      return classMaterials
        .filter(m => !addedMaterialIds.has(m.material_id) && m.class_materials)
        .map(m => ({
          id: m.class_materials.id,
          title: m.class_materials.title,
          description: m.class_materials.description,
          fileUrl: m.class_materials.file_url,
          type: m.class_materials.material_type,
          size: m.class_materials.file_size,
          sourceType: 'material'
        }));
    } catch (error) {
      Logger.error('Error fetching available materials', error);
      throw error;
    }
  },

  /**
   * Get available activities for training (including drafts, not yet added)
   */
  async getAvailableActivities(classId) {
    try {
      // Get all activities for this class (including drafts)
      const { data: classActivities, error: activitiesError } = await supabase
        .from('activity_class_assignments')
        .select(`
          activity_id,
          activities (
            id,
            title,
            description,
            instructions,
            activity_type,
            status,
            schema
          )
        `)
        .eq('class_id', classId);

      if (activitiesError) throw activitiesError;

      // Get already added activities
      const { data: existingSources, error: sourcesError } = await supabase
        .from('rag_training_sources')
        .select('activity_id')
        .eq('class_id', classId)
        .not('activity_id', 'is', null);

      if (sourcesError) throw sourcesError;

      const addedActivityIds = new Set(existingSources.map(s => s.activity_id));

      // Filter out already added activities
      return classActivities
        .filter(a => !addedActivityIds.has(a.activity_id) && a.activities)
        .map(a => ({
          id: a.activities.id,
          title: a.activities.title,
          description: a.activities.description,
          instructions: a.activities.instructions,
          activityType: a.activities.activity_type,
          status: a.activities.status,
          schema: a.activities.schema,
          sourceType: 'activity',
          isDraft: a.activities.status === 'draft'
        }));
    } catch (error) {
      Logger.error('Error fetching available activities', error);
      throw error;
    }
  },

  /**
   * Add a material as training source
   */
  async addMaterialSource(classId, materialId, userId) {
    try {
      // Get material details
      const { data: material, error: materialError } = await supabase
        .from('class_materials')
        .select('title, file_url, material_type')
        .eq('id', materialId)
        .single();

      if (materialError) throw materialError;

      const { data, error } = await supabase
        .from('rag_training_sources')
        .insert({
          class_id: classId,
          material_id: materialId,
          activity_id: null,
          file_url: material.file_url,
          file_name: material.title,
          file_type: material.material_type,
          is_active: true,
          embedding_status: 'pending',
          added_by: userId
        })
        .select()
        .single();

      if (error) throw error;

      Logger.info('Material added as training source', { classId, materialId });
      return data;
    } catch (error) {
      Logger.error('Error adding material source', error);
      throw error;
    }
  },

  /**
   * Add an activity as training source
   */
  async addActivitySource(classId, activityId, userId) {
    try {
      // Get activity details
      const { data: activity, error: activityError } = await supabase
        .from('activities')
        .select('title, instructions, description, schema, activity_type')
        .eq('id', activityId)
        .single();

      if (activityError) throw activityError;

      // Extract content for training
      const contentExtracted = JSON.stringify({
        instructions: activity.instructions,
        description: activity.description,
        schema: activity.schema
      });

      const { data, error } = await supabase
        .from('rag_training_sources')
        .insert({
          class_id: classId,
          material_id: null,
          activity_id: activityId,
          file_url: null,
          file_name: activity.title,
          file_type: 'activity',
          content_extracted: contentExtracted,
          is_active: true,
          embedding_status: 'pending',
          added_by: userId
        })
        .select()
        .single();

      if (error) throw error;

      Logger.info('Activity added as training source', { classId, activityId });
      return data;
    } catch (error) {
      Logger.error('Error adding activity source', error);
      throw error;
    }
  },

  /**
   * Remove a training source
   */
  async removeSource(sourceId) {
    try {
      const { error } = await supabase
        .from('rag_training_sources')
        .delete()
        .eq('id', sourceId);

      if (error) throw error;

      Logger.info('Training source removed', { sourceId });
    } catch (error) {
      Logger.error('Error removing training source', error);
      throw error;
    }
  },

  /**
   * Toggle source active status
   */
  async toggleSourceActive(sourceId, isActive) {
    try {
      const { error } = await supabase
        .from('rag_training_sources')
        .update({ is_active: isActive })
        .eq('id', sourceId);

      if (error) throw error;

      Logger.info('Training source status toggled', { sourceId, isActive });
    } catch (error) {
      Logger.error('Error toggling source status', error);
      throw error;
    }
  },

  /**
   * Get chatbot analytics for a class
   */
  async getAnalytics(classId, startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('chatbot_analytics')
        .select('*')
        .eq('class_id', classId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      Logger.error('Error fetching chatbot analytics', error);
      throw error;
    }
  }
};
