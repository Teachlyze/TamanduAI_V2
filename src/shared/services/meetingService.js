import { logger } from '@/shared/utils/logger';
// Arquivo temporário para resolver erro de build
// TODO: Implementar MeetingService ou usar meetingsService existente

export const MeetingService = {
  getMeetingById: async (id) => {
    logger.warn('MeetingService.getMeetingById not implemented')
    return null;
  },
  getMeetingParticipants: async (meetingId) => {
    logger.warn('MeetingService.getMeetingParticipants not implemented')
    return [];
  },
  deleteMeeting: async (id) => {
    logger.warn('MeetingService.deleteMeeting not implemented')
  },
  updateMeeting: async (id, data) => {
    logger.warn('MeetingService.updateMeeting not implemented')
    return data;
  },
  updateParticipantStatus: async (meetingId, participantId, status) => {
    logger.warn('MeetingService.updateParticipantStatus not implemented')
  },
  subscribeToMeetingUpdates: (id, callback) => {
    logger.warn('MeetingService.subscribeToMeetingUpdates not implemented')
    return { unsubscribe: () => {} };
  }
};
