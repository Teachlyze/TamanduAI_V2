import NotificationOrchestrator from '@/services/notificationOrchestrator';

const AuthNotificationService = {
  async onAccountCreated({ email, userName, confirmationUrl }) {
    return NotificationOrchestrator.send('accountCreated', {
      email,
      variables: { userName, confirmationUrl },
      channelOverride: 'email'
    });
  },

  async onAccountConfirmed({ userId, email, userName }) {
    return NotificationOrchestrator.send('accountConfirmed', {
      userId,
      email,
      variables: { userName }
    });
  },

  async onNewDeviceLogin({ email, device, time }) {
    return NotificationOrchestrator.send('loginNewDevice', {
      email,
      variables: { device, time },
      channelOverride: 'email'
    });
  },

  async onBlockedAttempts({ email }) {
    return NotificationOrchestrator.send('passwordRecoveryRequested', {
      email,
      variables: { userName: '' },
      channelOverride: 'email'
    });
  },

  async onPasswordRecoveryRequested({ email, userName }) {
    return NotificationOrchestrator.send('passwordRecoveryRequested', {
      email,
      variables: { userName },
      channelOverride: 'email'
    });
  },

  async onPasswordChanged({ userId, email, time }) {
    return NotificationOrchestrator.send('passwordChanged', {
      userId,
      email,
      variables: { time }
    });
  },

  async onProfileCompleted({ userId }) {
    return NotificationOrchestrator.send('profileCompleted', {
      userId,
      variables: {}
    });
  }
};

export default AuthNotificationService;
