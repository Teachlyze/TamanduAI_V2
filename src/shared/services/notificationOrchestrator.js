import NotificationService from './notificationService';
import EmailService from './emailService';
import EmailTemplateService from './emailTemplateService';
import { notificationTemplates } from '@/shared/constants/notificationTemplates';
import { resolveChannels } from '@/shared/constants/notificationRules';

/**
 * Orchestrates notification delivery across push (in-app) and email, using delivery rules.
 */
const NotificationOrchestrator = {
  /**
   * Send a notification using a template key
   * @param {string} templateId - key in notificationTemplates
   * @param {Object} options
   * @param {string} [options.userId] - target user id for in-app notification
   * @param {string} [options.email] - email recipient (required when channel includes email)
   * @param {Record<string, any>} [options.variables] - template variables
   * @param {'critical'|'high'|'medium'|'low'} [options.priorityOverride]
   * @param {'email'|'push'|'both'} [options.channelOverride]
   * @param {Object} [options.metadata] - extra metadata for in-app record
   */
  async send(templateId, {
    userId,
    email,
    variables = {},
    priorityOverride,
    channelOverride,
    metadata
  } = {}) {
    const tpl = notificationTemplates[templateId];
    if (!tpl) throw new Error(`Unknown notification template: ${templateId}`);

    const channels = resolveChannels(priorityOverride || tpl.priority, channelOverride || tpl.channel);

    // Render helper
    const render = (s) => EmailService.render(s, variables);

    const deliveries = [];

    // Push (in-app) delivery
    if (channels.includes('push')) {
      const pushTitle = render(tpl.title || '');
      const pushMessage = render(tpl.message || '');
      deliveries.push(
        NotificationService.sendNotification({
          title: pushTitle,
          message: pushMessage,
          type: tpl.type,
          category: tpl.type, // simple mapping; adjust if you maintain categories separately
          priority: (priorityOverride || tpl.priority || 'medium').toLowerCase(),
          metadata
        }, userId)
      );
    }

    // Email delivery - Use new template system if template ID matches
    if (channels.includes('email')) {
      if (!email) throw new Error('Email recipient is required for email delivery');
      
      // Map template IDs to new system
      const templateMapping = {
        'accountCreated': 'welcome',
        'classInviteSent': 'class-invite',
        'classInviteAccepted': 'class-invite-accepted',
        'newActivity': 'new-activity',
        'deadlineWarning24h': 'deadline-warning',
        'activityCorrected': 'activity-corrected',
        'plagiarismDetected': 'plagiarism-alert',
        'monthlyReportGenerated': 'monthly-report',
        'passwordRecoveryRequested': 'password-recovery',
        'passwordChanged': 'password-changed',
        'accountConfirmed': 'account-confirmed',
        'loginNewDevice': 'login-new-device',
        'studentAddedToClass': 'student-added',
        'studentRemovedFromClass': 'student-removed',
        'classCreated': 'class-created'
      };

      const newTemplateId = templateMapping[templateId];
      
      if (newTemplateId) {
        // Use new template system
        deliveries.push(
          EmailTemplateService.send(newTemplateId, {
            to: email,
            variables,
            language: variables.language || 'pt'
          })
        );
      } else {
        // Fallback to old system
        const subject = render(tpl.emailSubject || tpl.title || 'Notificação');
        const html = tpl.emailHtml ? render(tpl.emailHtml) : undefined;
        const text = !html ? render(tpl.message || '') : undefined;
        deliveries.push(
          EmailService.sendEmail({ to: email, subject, html, text })
        );
      }
    }

    const results = await Promise.allSettled(deliveries);
    return results;
  },

  // Convenience methods for common events
  async notifyNewActivity({ userId, email, variables, metadata }) {
    return this.send('newActivity', { userId, email, variables, metadata });
  },

  async notifyDeadline24h({ userId, email, variables, metadata }) {
    return this.send('deadlineWarning24h', { userId, email, variables, metadata });
  },

  async notifyActivityCorrected({ userId, email, variables, metadata }) {
    return this.send('activityCorrected', { userId, email, variables, metadata });
  },

  async notifyPlagiarismDetected({ userId, email, variables, metadata }) {
    return this.send('plagiarismDetected', { userId, email, variables, metadata });
  }
};

// Named export para compatibilidade
export { NotificationOrchestrator };

// Default export
export default NotificationOrchestrator;
