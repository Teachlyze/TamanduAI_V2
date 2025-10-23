// Notification module enums and delivery rules per spec

export const NotificationType = {
  AUTHENTICATION: 'authentication',
  ACTIVITY: 'activity',
  CORRECTION: 'correction',
  PLAGIARISM: 'plagiarism',
  SYSTEM: 'system',
  CHATBOT: 'chatbot',
  ANALYTICS: 'analytics',
  GAMIFICATION: 'gamification',
  FEEDBACK: 'feedback',
  MEETING: 'meeting',
  LIVE_CLASS: 'live_class'
};

export const NotificationPriority = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

export const DeliveryChannel = {
  EMAIL: 'email',
  PUSH: 'push',
  BOTH: 'both'
};

// Regras de entrega baseadas em prioridade
export const deliveryRules = {
  critical: {
    channels: ['email', 'push'],
    retries: 3,
    delay: 0
  },
  high: {
    channels: ['email', 'push'],
    retries: 2,
    delay: 0
  },
  medium: {
    channels: ['push'],
    retries: 1,
    delay: 300 // 5 minutos
  },
  low: {
    channels: ['push'],
    retries: 0,
    delay: 1800 // 30 minutos
  }
};

// Small utility to normalize values
export function resolveChannels(priority, explicitChannel) {
  if (explicitChannel === DeliveryChannel.BOTH) return ['email', 'push'];
  if (explicitChannel === DeliveryChannel.EMAIL) return ['email'];
  if (explicitChannel === DeliveryChannel.PUSH) return ['push'];
  const rule = deliveryRules[String(priority || '').toLowerCase()] || deliveryRules.medium;
  return rule.channels;
}
