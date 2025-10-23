import NotificationOrchestrator from '@/services/notificationOrchestrator';

const ChatbotNotificationService = {
  async trainingComplete({ userId, filesCount }) {
    return NotificationOrchestrator.send('chatbotTrainingComplete', {
      userId,
      variables: { filesCount }
    });
  },

  async trainingError({ userId, fileName }) {
    return NotificationOrchestrator.send('chatbotTrainingError', {
      userId,
      variables: { fileName }
    });
  },

  async materialProcessed({ userId, fileName }) {
    return NotificationOrchestrator.send('newMaterialProcessed', {
      userId,
      variables: { fileName }
    });
  },

  async outOfScope({ userId, topic }) {
    return NotificationOrchestrator.send('outOfScopeInteraction', {
      userId,
      variables: { topic }
    });
  }
};

export default ChatbotNotificationService;
