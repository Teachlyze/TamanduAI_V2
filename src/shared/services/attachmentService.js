import { supabase } from '@/shared/services/supabaseClient';

/**
 * Attachment Service
 * Handles all attachment-related operations for meetings
 */

export const AttachmentService = {
  /**
   * Upload a file to storage and create an attachment record
   * @param {File} file - The file to upload
   * @param {Object} metadata - Additional metadata for the file
   * @param {string} metadata.meetingId - The ID of the meeting this file belongs to
   * @param {string} metadata.uploadedBy - ID of the user uploading the file
   * @param {string} [metadata.bucket='meeting-attachments'] - The storage bucket to use
   * @returns {Promise<Object>} - The created attachment record
   */
  async uploadMeetingFile(file, { meetingId, uploaderId, bucket = 'meeting-attachments' }) {
    if (!meetingId) throw new Error('meetingId is required');
    if (!uploaderId) throw new Error('uploaderId is required');
    if (!file) throw new Error('File is required');

    // 1) Upload to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${meetingId}/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type });
    if (uploadError) throw uploadError;

    // 2) Validate via Edge Function (creates DB row and may quarantine)
    const { data, error } = await supabase.functions.invoke('validate-upload', {
      body: {
        context: 'meeting',
        contextId: meetingId,
        bucket,
        filePath,
        originalName: file.name,
        mimeType: file.type,
        uploaderId,
      },
    });
    if (error) throw error;
    return data?.attachment;
  },

  async uploadEventFile(file, { eventId, uploaderId, bucket = 'event-attachments' }) {
    if (!eventId) throw new Error('eventId is required');
    if (!uploaderId) throw new Error('uploaderId is required');
    if (!file) throw new Error('File is required');

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${eventId}/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type });
    if (uploadError) throw uploadError;

    const { data, error } = await supabase.functions.invoke('validate-upload', {
      body: { context: 'event', contextId: eventId, bucket, filePath, originalName: file.name, mimeType: file.type, uploaderId },
    });
    if (error) throw error;
    return data?.attachment;
  },

  /**
   * Get all attachments for a meeting
   * @param {string} meetingId - The ID of the meeting
   * @returns {Promise<Array>} - Array of attachment records
   */
  async getMeetingAttachments(meetingId) {
    try {
      const { data, error } = await supabase
        .from('meeting_attachments')
        .select('id, meeting_id, original_name, storage_path, status, reason, created_at, uploader:profiles!uploader_id(id, full_name)')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching attachments:', error);
      throw error;
    }
  },

  async getEventAttachments(eventId) {
    try {
      const { data, error } = await supabase
        .from('event_attachments')
        .select('id, event_id, original_name, storage_path, status, reason, created_at, uploader:profiles!uploader_id(id, full_name)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching event attachments:', error);
      throw error;
    }
  },

  /**
   * Delete an attachment
   * @param {string} attachmentId - The ID of the attachment to delete
   * @param {string} [bucket='meeting-attachments'] - The storage bucket
   * @returns {Promise<boolean>} - True if successful
   */
  async deleteAttachment(attachmentId, bucket = 'meeting-attachments') {
    try {
      // First get the attachment to get the file path
      const { data: attachment, error: fetchError } = await supabase
        .from('meeting_attachments')
        .select('*')
        .eq('id', attachmentId)
        .single();

      if (fetchError) throw fetchError;
      if (!attachment) throw new Error('Attachment not found');

      // Delete the file from storage
      const { error: deleteError } = await supabase.storage
        .from(bucket)
        .remove([attachment.storage_path]);

      if (deleteError) throw deleteError;

      // Delete the attachment record
      const { error } = await supabase
        .from('meeting_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error deleting attachment:', error);
      throw error;
    }
  },

  /**
   * Get a signed URL for a private file
   * @param {string} filePath - The path to the file in storage
   * @param {number} [expiresIn=3600] - Expiration time in seconds
   * @param {string} [bucket='meeting-attachments'] - The storage bucket
   * @returns {Promise<string>} - The signed URL
   */
  async getSignedUrl(filePath, expiresIn = 3600, bucket = 'meeting-attachments') {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  },

  /**
   * Subscribe to attachment changes for a meeting
   * @param {string} meetingId - The ID of the meeting
   * @param {Function} callback - Function to call when attachments change
   * @returns {Function} - Function to unsubscribe
   */
  subscribeToAttachments(meetingId, callback) {
    if (!meetingId) {
      console.error('meetingId is required for subscription');
      return () => {};
    }

    const subscription = supabase
      .channel(`meeting_attachments_${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_attachments',
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe();
    };
  },
};

export default AttachmentService;
