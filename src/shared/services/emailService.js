import { logger } from '@/shared/utils/logger';
import { supabase } from '@/shared/services/supabaseClient';

/**
 * Email Service using Supabase Edge Function (Resend)
 * Expects the edge function `send-email` deployed and configured with RESEND_API_KEY and FROM_EMAIL.
 */
const EmailService = {
  /**
   * Send a single email
   * @param {Object} params
   * @param {string} params.to - Recipient email
   * @param {string} params.subject - Email subject
   * @param {string} [params.html] - HTML body
   * @param {string} [params.text] - Text body (fallback if HTML absent)
   * @param {string} [params.from] - Optional custom from address
   * @returns {Promise<{success: boolean, emailId?: string, error?: string}>}
   */
  async sendEmail({ to, subject, html, text, from }) {
    if (!to || !subject || (!html && !text)) {
      return { success: false, error: 'Missing required fields: to, subject, and html or text' };
    }

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html, text, from }
    });

    if (error) {
      logger.error('EmailService.sendEmail error:', error)
      return { success: false, error: error.message || 'invoke failed' };
    }

    return { success: !!data?.success, emailId: data?.emailId, error: data?.error };
  },

  /**
   * Very small, safe variable interpolation for templates using {{var}}
   * @param {string} template
   * @param {Record<string, any>} variables
   */
  render(template = '', variables = {}) {
    return String(template).replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
      const value = key.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : ''), variables);
      return value ?? '';
    });
  }
};

export default EmailService;
