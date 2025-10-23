// Arquivo temporário para resolver erro de build
// TODO: Implementar MeetingService ou usar meetingsService existente

export const MeetingService = {
  getMeetingById: async (id) => {
    console.warn('MeetingService.getMeetingById not implemented');
    return null;
  },
  getMeetingParticipants: async (meetingId) => {
    console.warn('MeetingService.getMeetingParticipants not implemented');
    return [];
  },
  deleteMeeting: async (id) => {
    console.warn('MeetingService.deleteMeeting not implemented');
  },
  updateMeeting: async (id, data) => {
    console.warn('MeetingService.updateMeeting not implemented');
    return data;
  },
  updateParticipantStatus: async (meetingId, participantId, status) => {
    console.warn('MeetingService.updateParticipantStatus not implemented');
  },
  subscribeToMeetingUpdates: (id, callback) => {
    console.warn('MeetingService.subscribeToMeetingUpdates not implemented');
    return { unsubscribe: () => {} };
  }
};
