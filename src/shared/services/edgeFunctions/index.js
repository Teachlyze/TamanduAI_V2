/**
 * 🌐 EDGE FUNCTIONS - CENTRAL EXPORTS
 * 
 * Exporta todos os wrappers de Edge Functions
 */

// Plagiarism
export {
  checkPlagiarismEdge,
  getCachedPlagiarismCheck,
  processPlagiarismBatch,
  savePlagiarismResult,
  getPlagiarismHistory
} from './plagiarismEdge';

// Chatbot
export {
  queryChatbot,
  trainChatbot,
  saveChatbotInteraction,
  getChatbotHistory,
  getChatbotConfig,
  updateChatbotConfig,
  saveChatbotTrainingData
} from './chatbotEdge';

// Notifications
export {
  processNotificationsBatch,
  createAndSendNotification,
  sendEmail,
  sendPlagiarismAlert,
  sendAIDetectionAlert,
  sendSubmissionNotification,
  sendGradeNotification,
  sendDeadlineNotification
} from './notificationEdge';

// Authentication
export {
  validateLogin,
  validateRegister,
  onLoginSuccess,
  onRegisterSuccess,
  processUserOnboarding,
  getAuthenticatedUser,
  acceptTerms
} from './authEdge';

// Public Ideas
export {
  listIdeas,
  createIdea,
  toggleIdeaVote,
  getUserVotedIdeas,
  getOrCreateVisitorId,
  useIdeas
} from './ideasEdge';
