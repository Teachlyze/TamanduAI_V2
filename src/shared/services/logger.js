// Logging Service for TamanduAI
// Centralized logging system that saves to Supabase and handles console output

import { supabase } from '@/shared/services/supabaseClient';

// Flag to disable DB logging when table is missing to avoid spam
let dbLoggingDisabled = false;

export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4,
};

// Get log level from environment or default to INFO in production
const getLogLevel = () => {
  const envLevel = import.meta.env.VITE_LOG_LEVEL || 'INFO';
  return LOG_LEVELS[envLevel.toUpperCase()] ?? LOG_LEVELS.INFO;
};

// Check if current log level should be processed
const shouldLog = (level) => {
  return level >= getLogLevel();
};

// Get user context for logs
const getUserContext = () => {
  try {
    // This will be populated when auth context is available
    return {
      userId: null,
      userEmail: null,
      sessionId: sessionStorage.getItem('session_id') || generateSessionId(),
    };
  } catch (error) {
    return {
      userId: null,
      userEmail: null,
      sessionId: 'unknown',
    };
  }
};

// Generate unique session ID
const generateSessionId = () => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem('session_id', sessionId);
  return sessionId;
};

// Format log message
const formatLogMessage = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const userContext = getUserContext();

  return {
    timestamp,
    level: LOG_LEVELS[level],
    levelName: level,
    message,
    data: data ? JSON.stringify(data) : null,
    userId: userContext.userId,
    userEmail: userContext.userEmail,
    sessionId: userContext.sessionId,
    userAgent: navigator.userAgent,
    url: window.location.href,
    environment: import.meta.env.MODE,
  };
};

// Save log to Supabase
const saveLogToDatabase = async (logEntry) => {
  try {
    if (dbLoggingDisabled) return;
    // Only save ERROR and CRITICAL logs to database in production
    // In development, save only ERROR and CRITICAL logs for performance
    const shouldSaveToDB = import.meta.env.PROD
      ? (logEntry.level >= LOG_LEVELS.ERROR)
      : (logEntry.level >= LOG_LEVELS.ERROR); // Changed from true to ERROR+ only

    if (!shouldSaveToDB) return;

    // Re-enable database logging for production deployment
    const { error } = await supabase
      .from('application_logs')
      .insert([{
        timestamp: logEntry.timestamp,
        level: logEntry.level,
        level_name: logEntry.levelName,
        message: logEntry.message,
        data: logEntry.data,
        user_id: logEntry.userId,
        user_email: logEntry.userEmail,
        session_id: logEntry.sessionId,
        user_agent: logEntry.userAgent,
        url: logEntry.url,
        environment: logEntry.environment,
      }]);

    if (error) {
      const msg = (error?.message || '').toLowerCase();
      const code = error?.code || '';
      // If table is missing, disable further DB logging for this session
      if (code === 'PGRST205' || msg.includes("could not find the table 'public.application_logs'")) {
        dbLoggingDisabled = true;
        console.warn('[Logger] application_logs table not found. Disabling DB logging for this session.');
        return;
      }
      console.error('[Logger] Failed to save log to database:', error);
    }
  } catch (error) {
    console.error('[Logger] Error saving log:', error);
  }
};

// Console output with styling
const consoleOutput = (level, message, data = null) => {
  const styles = {
    DEBUG: 'color: #6b7280; font-weight: normal;',
    INFO: 'color: #3b82f6; font-weight: normal;',
    WARN: 'color: #f59e0b; font-weight: bold;',
    ERROR: 'color: #ef4444; font-weight: bold;',
    CRITICAL: 'color: #dc2626; font-weight: bold; background: #fee2e2; padding: 2px 4px; border-radius: 2px;',
  };

  const timestamp = new Date().toLocaleTimeString();

  // Only show ERROR and CRITICAL in console for better performance
  if (level === 'ERROR' || level === 'CRITICAL') {
    if (data) {
      console.log(`%c[${timestamp}] ${level}: ${message}`, styles[level], data);
    } else {
      console.log(`%c[${timestamp}] ${level}: ${message}`, styles[level]);
    }
  }
};

// Main logger function
const logger = async (level, message, data = null) => {
  if (!shouldLog(LOG_LEVELS[level])) return;

  const logEntry = formatLogMessage(level, message, data);

  // Console output (only in development or for ERROR+ logs)
  const shouldShowInConsole = import.meta.env.DEV
    ? level >= LOG_LEVELS.ERROR  // Only show ERROR and CRITICAL in dev console
    : true;  // Show all logs in production

  if (shouldShowInConsole) {
    consoleOutput(level, message, data);
  }

  // Save to database
  await saveLogToDatabase(logEntry);

  // For critical errors, also send to error tracking service if available
  if (level === 'CRITICAL' && window.Sentry) {
    window.Sentry.captureException(new Error(message), {
      extra: { data, logEntry }
    });
  }
};

// Logger API
export const Logger = {
  debug: (message, data) => logger('DEBUG', message, data),
  info: (message, data) => logger('INFO', message, data),
  warn: (message, data) => logger('WARN', message, data),
  error: (message, data) => logger('ERROR', message, data),
  critical: (message, data) => logger('CRITICAL', message, data),

  // Utility methods
  setUserContext: (userId, userEmail) => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('user_id', userId);
        sessionStorage.setItem('user_email', userEmail);
      }
    } catch (error) {
      console.error('[Logger] Error setting user context:', error);
    }
  },

  clearUserContext: () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('user_id');
        sessionStorage.removeItem('user_email');
      }
    } catch (error) {
      console.error('[Logger] Error clearing user context:', error);
    }
  },
};

export default Logger;
