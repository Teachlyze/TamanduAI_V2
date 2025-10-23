import NotificationOrchestrator from '@/shared/services/notificationOrchestrator';

const AnalyticsNotificationService = {
  async monthlyReportGenerated({ userId, monthYear }) {
    return NotificationOrchestrator.send('monthlyReportGenerated', {
      userId,
      variables: { monthYear }
    });
  },

  async performanceGoalAchieved({ userId }) {
    return NotificationOrchestrator.send('performanceGoalAchieved', {
      userId,
      variables: {}
    });
  },

  async lowPerformanceDetected({ userId, subject }) {
    return NotificationOrchestrator.send('lowPerformanceDetected', {
      userId,
      variables: { subject }
    });
  },

  async classReportAvailable({ userId, className }) {
    return NotificationOrchestrator.send('classReportAvailable', {
      userId,
      variables: { className }
    });
  }
};

export default AnalyticsNotificationService;
