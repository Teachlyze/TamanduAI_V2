import { logger } from '@/shared/utils/logger';
import { supabase } from '@/shared/services/supabaseClient';

/**
 * Email Template Service
 * Manages email sending with templates via Edge Function
 */
class EmailTemplateService {
  /**
   * Send email using template
   * @param {string} templateId - Template identifier
   * @param {Object} options
   * @param {string|string[]} options.to - Recipient email(s)
   * @param {Object} options.variables - Template variables
   * @param {string} options.language - Language (pt/en/es)
   * @param {string} options.from - Custom from address
   * @param {string} options.replyTo - Reply-to address
   * @param {Array} options.attachments - File attachments
   * @param {boolean} options.tracking - Enable tracking
   * @returns {Promise<{success: boolean, emailId?: string, error?: string}>}
   */
  static async send(templateId, options = {}) {
    const {
      to,
      variables = {},
      language = 'pt',
      from,
      replyTo,
      attachments,
      tracking = false
    } = options;

    if (!to) {
      return { success: false, error: 'Recipient email is required' };
    }

    if (!templateId) {
      return { success: false, error: 'Template ID is required' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-email-v2', {
        body: {
          templateId,
          to,
          variables,
          language,
          from,
          replyTo,
          attachments,
          tracking
        }
      });

      if (error) {
        logger.error('EmailTemplateService.send error:', error)
        return { success: false, error: error.message || 'Failed to send email' };
      }

      return {
        success: data?.success || false,
        emailId: data?.emailId,
        template: data?.template,
        error: data?.error
      };
    } catch (err) {
      logger.error('EmailTemplateService.send exception:', err)
      return { success: false, error: err.message || 'Unexpected error' };
    }
  }

  /**
   * Send welcome email
   */
  static async sendWelcome({ to, userName, confirmationUrl, language = 'pt' }) {
    return this.send('welcome', {
      to,
      variables: { userName, confirmationUrl },
      language
    });
  }

  /**
   * Send login new device notification
   */
  static async sendLoginNewDevice({ to, device, time, location, language = 'pt' }) {
    return this.send('login-new-device', {
      to,
      variables: { device, time, location },
      language
    });
  }

  /**
   * Send password recovery email
   */
  static async sendPasswordRecovery({ to, userName, resetUrl, language = 'pt' }) {
    return this.send('password-recovery', {
      to,
      variables: { userName, resetUrl },
      language
    });
  }

  /**
   * Send password changed notification
   */
  static async sendPasswordChanged({ to, time, language = 'pt' }) {
    return this.send('password-changed', {
      to,
      variables: { time },
      language
    });
  }

  /**
   * Send account confirmed email
   */
  static async sendAccountConfirmed({ to, userName, dashboardUrl, language = 'pt' }) {
    return this.send('account-confirmed', {
      to,
      variables: { userName, dashboardUrl },
      language
    });
  }

  /**
   * Send class invitation
   */
  static async sendClassInvite({ to, className, teacherName, acceptUrl, language = 'pt' }) {
    return this.send('class-invite', {
      to,
      variables: { className, teacherName, acceptUrl },
      language
    });
  }

  /**
   * Send class invite accepted notification
   */
  static async sendClassInviteAccepted({ to, studentName, className, time, language = 'pt' }) {
    return this.send('class-invite-accepted', {
      to,
      variables: { studentName, className, time },
      language
    });
  }

  /**
   * Send student added notification
   */
  static async sendStudentAdded({ to, studentName, className, teacherName, classUrl, language = 'pt' }) {
    return this.send('student-added', {
      to,
      variables: { studentName, className, teacherName, classUrl },
      language
    });
  }

  /**
   * Send student removed notification
   */
  static async sendStudentRemoved({ to, className, time, language = 'pt' }) {
    return this.send('student-removed', {
      to,
      variables: { className, time },
      language
    });
  }

  /**
   * Send class created notification
   */
  static async sendClassCreated({ to, className, classCode, classUrl, language = 'pt' }) {
    return this.send('class-created', {
      to,
      variables: { className, classCode, classUrl },
      language
    });
  }

  /**
   * Send new activity notification
   */
  static async sendNewActivity({ to, studentName, className, activityName, deadline, points, activityUrl, language = 'pt' }) {
    return this.send('new-activity', {
      to,
      variables: { studentName, className, activityName, deadline, points, activityUrl },
      language
    });
  }

  /**
   * Send deadline warning
   */
  static async sendDeadlineWarning({ to, activityName, deadline, timeLeft, activityUrl, language = 'pt' }) {
    return this.send('deadline-warning', {
      to,
      variables: { activityName, deadline, timeLeft, activityUrl },
      language
    });
  }

  /**
   * Send activity corrected notification
   */
  static async sendActivityCorrected({ to, activityName, grade, maxGrade, viewUrl, language = 'pt' }) {
    return this.send('activity-corrected', {
      to,
      variables: { activityName, grade, maxGrade, viewUrl },
      language
    });
  }

  /**
   * Send plagiarism alert
   */
  static async sendPlagiarismAlert({ to, studentName, activityName, percentage, severity, reviewUrl, language = 'pt' }) {
    return this.send('plagiarism-alert', {
      to,
      variables: { studentName, activityName, percentage, severity, reviewUrl },
      language
    });
  }

  /**
   * Send monthly report
   */
  static async sendMonthlyReport({ to, userName, monthYear, activitiesCount, averageGrade, completionRate, reportUrl, language = 'pt' }) {
    return this.send('monthly-report', {
      to,
      variables: { userName, monthYear, activitiesCount, averageGrade, completionRate, reportUrl },
      language
    });
  }

  /**
   * Preview template (for testing)
   * Returns rendered HTML without sending
   */
  static async preview(templateId, variables = {}, language = 'pt') {
    // This would call a preview endpoint or render locally
    // For now, just return the template info
    return {
      templateId,
      variables,
      language,
      note: 'Preview functionality - implement preview endpoint if needed'
    };
  }

  /**
   * Get available templates
   */
  static getAvailableTemplates() {
    return [
      // Authentication
      { id: 'welcome', category: 'auth', name: 'Welcome Email' },
      { id: 'login-new-device', category: 'auth', name: 'New Device Login' },
      { id: 'password-recovery', category: 'auth', name: 'Password Recovery' },
      { id: 'password-changed', category: 'auth', name: 'Password Changed' },
      { id: 'account-confirmed', category: 'auth', name: 'Account Confirmed' },
      
      // Classes
      { id: 'class-invite', category: 'classes', name: 'Class Invitation' },
      { id: 'class-invite-accepted', category: 'classes', name: 'Invite Accepted' },
      { id: 'student-added', category: 'classes', name: 'Student Added' },
      { id: 'student-removed', category: 'classes', name: 'Student Removed' },
      { id: 'class-created', category: 'classes', name: 'Class Created' },
      
      // Activities
      { id: 'new-activity', category: 'activities', name: 'New Activity' },
      { id: 'deadline-warning', category: 'activities', name: 'Deadline Warning' },
      { id: 'activity-corrected', category: 'activities', name: 'Activity Corrected' },
      
      // System
      { id: 'plagiarism-alert', category: 'system', name: 'Plagiarism Alert' },
      { id: 'monthly-report', category: 'system', name: 'Monthly Report' }
    ];
  }

  /**
   * Get email logs (requires admin permissions)
   */
  static async getLogs(filters = {}) {
    const { limit = 50, offset = 0, templateId, status } = filters;

    let query = supabase
      .from('email_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (templateId) {
      query = query.eq('template_id', templateId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch email logs:', error)
      return { success: false, error: error.message };
    }

    return { success: true, data };
  }

  /**
   * Get email statistics
   */
  static async getStatistics(period = '30days') {
    try {
      const { data, error } = await supabase.rpc('get_email_statistics', {
        period_days: period === '7days' ? 7 : period === '30days' ? 30 : 90
      });

      if (error) throw error;

      return { success: true, data };
    } catch (err) {
      logger.error('Failed to fetch email statistics:', err)
      return { success: false, error: err.message };
    }
  }
}

export default EmailTemplateService;
