import { supabase } from '@/lib/supabaseClient';
import monitoringService from '@/services/monitoring';

/**
 * Advanced Security Service
 * Comprehensive security features including rate limiting, attack protection, and security monitoring
 */
export class AdvancedSecurityService {
  constructor() {
    this.rateLimiters = new Map();
    this.suspiciousActivity = new Map();
    this.blockedIPs = new Set();
    this.failedAttempts = new Map();
    this.securityEvents = [];

    this.rateLimits = {
      login: { max: 5, window: 300000 }, // 5 attempts per 5 minutes
      registration: { max: 3, window: 3600000 }, // 3 attempts per hour
      passwordReset: { max: 3, window: 3600000 }, // 3 attempts per hour
      api: { max: 100, window: 60000 }, // 100 requests per minute
      fileUpload: { max: 10, window: 60000 }, // 10 uploads per minute
    };

    this.suspiciousPatterns = {
      multipleFailedLogins: { threshold: 5, window: 300000 },
      rapidRequests: { threshold: 50, window: 60000 },
      unusualUserAgents: ['bot', 'crawler', 'spider', 'scraper'],
      suspiciousIPs: [], // Would be populated from threat intelligence
    };

    this.startSecurityMonitoring();
    this.startCleanupRoutine();
  }

  /**
   * Rate limiting check
   */
  checkRateLimit(key, type = 'api') {
    const limit = this.rateLimits[type];
    if (!limit) return { allowed: true };

    const now = Date.now();
    const windowStart = now - limit.window;

    // Get or create rate limiter for this key
    if (!this.rateLimiters.has(key)) {
      this.rateLimiters.set(key, []);
    }

    const attempts = this.rateLimiters.get(key);

    // Remove old attempts outside the window
    const validAttempts = attempts.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (validAttempts.length >= limit.max) {
      monitoringService.recordSecurityEvent('rate_limit_exceeded', key, {
        type,
        attempts: validAttempts.length,
        limit: limit.max,
        window: limit.window,
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime: validAttempts[0] + limit.window,
        reason: 'Rate limit exceeded',
      };
    }

    // Record this attempt
    validAttempts.push(now);
    this.rateLimiters.set(key, validAttempts);

    return {
      allowed: true,
      remaining: limit.max - validAttempts.length,
      resetTime: now + limit.window,
    };
  }

  /**
   * Validate and sanitize input
   */
  sanitizeInput(input, options = {}) {
    const {
      maxLength = 10000,
      allowedTags = [],
      stripHtml = false,
      allowNumbers = true,
      allowLetters = true,
      allowSpaces = true,
      allowSpecialChars = false,
    } = options;

    if (typeof input !== 'string') {
      return '';
    }

    let sanitized = input;

    // Basic length check
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    // Strip HTML if requested
    if (stripHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>'"&]/g, '');

    // Apply character restrictions
    if (!allowLetters) {
      sanitized = sanitized.replace(/[a-zA-Z]/g, '');
    }

    if (!allowNumbers) {
      sanitized = sanitized.replace(/[0-9]/g, '');
    }

    if (!allowSpaces) {
      sanitized = sanitized.replace(/\s/g, '');
    }

    if (!allowSpecialChars) {
      sanitized = sanitized.replace(/[^a-zA-Z0-9\s]/g, '');
    }

    return sanitized.trim();
  }

  /**
   * Validate email format with enhanced security
   */
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return { valid: false, reason: 'Invalid email format' };
    }

    // Basic format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, reason: 'Invalid email format' };
    }

    // Length validation
    if (email.length > 254) {
      return { valid: false, reason: 'Email too long' };
    }

    // Check for suspicious patterns
    if (this.isSuspiciousEmail(email)) {
      return { valid: false, reason: 'Suspicious email pattern' };
    }

    return { valid: true };
  }

  /**
   * Check if email has suspicious patterns
   */
  isSuspiciousEmail(email) {
    const suspiciousPatterns = [
      /\+\d{10,}/, // Too many plus digits
      /test\d{5,}/, // Test emails with many digits
      /spam|junk|temp/, // Common disposable email keywords
    ];

    return suspiciousPatterns.some(pattern => pattern.test(email.toLowerCase()));
  }

  /**
   * Validate password strength with security best practices
   */
  validatePassword(password) {
    const result = {
      valid: true,
      score: 0,
      feedback: [],
      checks: {},
    };

    // Length check
    if (password.length < 8) {
      result.valid = false;
      result.feedback.push('Password must be at least 8 characters long');
      result.checks.length = false;
    } else {
      result.score += 1;
      result.checks.length = true;
    }

    // Character variety checks
    if (!/[a-z]/.test(password)) {
      result.valid = false;
      result.feedback.push('Password must contain lowercase letters');
      result.checks.lowercase = false;
    } else {
      result.score += 1;
      result.checks.lowercase = true;
    }

    if (!/[A-Z]/.test(password)) {
      result.valid = false;
      result.feedback.push('Password must contain uppercase letters');
      result.checks.uppercase = false;
    } else {
      result.score += 1;
      result.checks.uppercase = true;
    }

    if (!/[0-9]/.test(password)) {
      result.valid = false;
      result.feedback.push('Password must contain numbers');
      result.checks.numbers = false;
    } else {
      result.score += 1;
      result.checks.numbers = true;
    }

    if (!/[^a-zA-Z0-9]/.test(password)) {
      result.feedback.push('Password should contain special characters for better security');
      result.checks.special = false;
    } else {
      result.score += 1;
      result.checks.special = true;
    }

    // Common password check
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.includes(password.toLowerCase())) {
      result.valid = false;
      result.feedback.push('Password is too common and easily guessable');
      result.checks.common = false;
    } else {
      result.score += 1;
      result.checks.common = true;
    }

    // Sequential characters check
    if (/(.)\1{2,}/.test(password)) {
      result.feedback.push('Avoid repeated characters');
      result.checks.repeated = false;
    } else {
      result.score += 1;
      result.checks.repeated = true;
    }

    return result;
  }

  /**
   * Detect suspicious activity patterns
   */
  detectSuspiciousActivity(request) {
    const {
      ip,
      userAgent,
      endpoint,
      method,
      timestamp = Date.now(),
    } = request;

    let suspiciousScore = 0;
    const issues = [];

    // Check user agent for bots/scrapers
    if (this.isSuspiciousUserAgent(userAgent)) {
      suspiciousScore += 3;
      issues.push('Suspicious user agent');
    }

    // Check for rapid requests from same IP
    const recentRequests = this.getRecentRequests(ip, 60000); // Last minute
    if (recentRequests > 50) {
      suspiciousScore += 2;
      issues.push('Rapid requests from IP');
    }

    // Check for unusual endpoints
    if (this.isUnusualEndpoint(endpoint)) {
      suspiciousScore += 1;
      issues.push('Unusual endpoint access');
    }

    // Check for blocked IP
    if (this.blockedIPs.has(ip)) {
      suspiciousScore += 5;
      issues.push('Blocked IP address');
    }

    // Record suspicious activity
    if (suspiciousScore > 0) {
      this.recordSuspiciousActivity(ip, {
        score: suspiciousScore,
        issues,
        userAgent,
        endpoint,
        method,
        timestamp,
      });

      monitoringService.recordSecurityEvent('suspicious_activity_detected', ip, {
        score: suspiciousScore,
        issues,
        endpoint,
      });
    }

    return {
      suspicious: suspiciousScore > 2,
      score: suspiciousScore,
      issues,
      action: suspiciousScore > 5 ? 'block' : suspiciousScore > 3 ? 'challenge' : 'monitor',
    };
  }

  /**
   * Check if user agent is suspicious
   */
  isSuspiciousUserAgent(userAgent) {
    const ua = userAgent.toLowerCase();
    return this.suspiciousPatterns.unusualUserAgents.some(pattern =>
      ua.includes(pattern)
    );
  }

  /**
   * Check if endpoint access is unusual
   */
  isUnusualEndpoint(endpoint) {
    const sensitiveEndpoints = [
      '/admin',
      '/api/admin',
      '/api/internal',
      '/api/debug',
    ];

    return sensitiveEndpoints.some(sensitive =>
      endpoint.startsWith(sensitive)
    );
  }

  /**
   * Record failed login attempt
   */
  recordFailedLogin(userId, ip, metadata = {}) {
    const key = `failed_login:${userId || ip}`;
    const now = Date.now();

    if (!this.failedAttempts.has(key)) {
      this.failedAttempts.set(key, []);
    }

    const attempts = this.failedAttempts.get(key);
    attempts.push({
      timestamp: now,
      ip,
      metadata,
    });

    // Keep only recent attempts (last hour)
    const validAttempts = attempts.filter(a => now - a.timestamp < 3600000);

    // Check for account lockout
    if (validAttempts.length >= 5) {
      this.lockAccount(key, {
        reason: 'Multiple failed login attempts',
        attempts: validAttempts.length,
        lockoutDuration: 300000, // 5 minutes
      });

      monitoringService.recordSecurityEvent('account_locked', userId || ip, {
        reason: 'multiple_failed_logins',
        attempts: validAttempts.length,
      });
    }

    this.failedAttempts.set(key, validAttempts);
  }

  /**
   * Lock user account
   */
  lockAccount(key, options = {}) {
    const lockoutKey = `lockout:${key}`;
    const lockoutData = {
      lockedAt: Date.now(),
      reason: options.reason,
      attempts: options.attempts,
      duration: options.lockoutDuration || 300000,
    };

    // Store lockout in cache (would be in database in production)
    localStorage.setItem(lockoutKey, JSON.stringify(lockoutData));

    monitoringService.recordSecurityEvent('account_lockout', key, lockoutData);
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(key) {
    const lockoutKey = `lockout:${key}`;
    const lockoutData = localStorage.getItem(lockoutKey);

    if (!lockoutData) return false;

    try {
      const lockout = JSON.parse(lockoutData);

      if (Date.now() - lockout.lockedAt > lockout.duration) {
        // Lockout expired, remove it
        localStorage.removeItem(lockoutKey);
        return false;
      }

      return {
        locked: true,
        reason: lockout.reason,
        remainingTime: lockout.lockedAt + lockout.duration - Date.now(),
      };
    } catch (error) {
      localStorage.removeItem(lockoutKey);
      return false;
    }
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Hash password with salt (client-side compatible version)
   */
  async hashPassword(password, salt = null) {
    const saltValue = salt || this.generateSecureToken(16);

    // Use Web Crypto API for secure hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(password + saltValue);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return {
      hash: hashArray.map(b => b.toString(16).padStart(2, '0')).join(''),
      salt: saltValue,
    };
  }

  /**
   * Encrypt sensitive data (placeholder for actual encryption)
   */
  encryptData(data, key) {
    // In production, use proper encryption libraries
    // For now, return base64 encoded with simple obfuscation
    try {
      const jsonString = JSON.stringify(data);
      const encoded = btoa(jsonString);
      return encoded.split('').reverse().join(''); // Simple obfuscation
    } catch (error) {
      monitoringService.recordError(error, { context: 'data_encryption' });
      return null;
    }
  }

  /**
   * Decrypt sensitive data
   */
  decryptData(encryptedData, key) {
    try {
      const reversed = encryptedData.split('').reverse().join('');
      const decoded = atob(reversed);
      return JSON.parse(decoded);
    } catch (error) {
      monitoringService.recordError(error, { context: 'data_decryption' });
      return null;
    }
  }

  /**
   * Validate file upload for security
   */
  validateFileUpload(file, allowedTypes = [], maxSize = 5242880) { // 5MB default
    const result = {
      valid: true,
      issues: [],
    };

    // Check file size
    if (file.size > maxSize) {
      result.valid = false;
      result.issues.push(`File size exceeds limit (${Math.round(maxSize / 1024 / 1024)}MB)`);
    }

    // Check file type
    if (allowedTypes.length > 0) {
      const fileType = file.type.toLowerCase();
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      const isAllowed = allowedTypes.some(type =>
        fileType.includes(type) || fileExtension === type
      );

      if (!isAllowed) {
        result.valid = false;
        result.issues.push(`File type not allowed. Allowed: ${allowedTypes.join(', ')}`);
      }
    }

    // Check for suspicious file names
    if (this.isSuspiciousFileName(file.name)) {
      result.valid = false;
      result.issues.push('Suspicious file name detected');
    }

    return result;
  }

  /**
   * Check if file name is suspicious
   */
  isSuspiciousFileName(filename) {
    const suspiciousPatterns = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.scr$/i,
      /\.pif$/i,
      /\.jar$/i,
      /\.com$/i,
      /script/i,
      /virus/i,
      /malware/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Record suspicious activity
   */
  recordSuspiciousActivity(ip, details) {
    const key = `suspicious:${ip}`;
    const now = Date.now();

    if (!this.suspiciousActivity.has(key)) {
      this.suspiciousActivity.set(key, []);
    }

    const activities = this.suspiciousActivity.get(key);
    activities.push({
      ...details,
      timestamp: now,
    });

    // Keep only recent activities (last 24 hours)
    const recentActivities = activities.filter(a => now - a.timestamp < 86400000);

    if (recentActivities.length > 10) {
      // Too many suspicious activities, block IP
      this.blockIP(ip, {
        reason: 'Multiple suspicious activities',
        count: recentActivities.length,
      });
    }

    this.suspiciousActivity.set(key, recentActivities);
  }

  /**
   * Block IP address
   */
  blockIP(ip, options = {}) {
    this.blockedIPs.add(ip);

    monitoringService.recordSecurityEvent('ip_blocked', ip, {
      reason: options.reason,
      manual: options.manual || false,
    });

    // In production, this would update firewall rules or CDN configuration
    console.log(`IP ${ip} blocked:`, options.reason);
  }

  /**
   * Unblock IP address
   */
  unblockIP(ip) {
    this.blockedIPs.delete(ip);
    monitoringService.recordSecurityEvent('ip_unblocked', ip);
  }

  /**
   * Get recent requests for rate limiting
   */
  getRecentRequests(ip, window = 60000) {
    // In production, this would query a distributed store
    // For now, return a mock value
    return Math.floor(Math.random() * 20);
  }

  /**
   * Start security monitoring routines
   */
  startSecurityMonitoring() {
    // Monitor for security events every minute
    setInterval(() => {
      this.analyzeSecurityTrends();
    }, 60000);

    // Clean up old security data every hour
    setInterval(() => {
      this.cleanupSecurityData();
    }, 3600000);
  }

  /**
   * Analyze security trends and patterns
   */
  analyzeSecurityTrends() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    // Analyze failed login patterns
    for (const [key, attempts] of this.failedAttempts.entries()) {
      const recentAttempts = attempts.filter(a => a.timestamp > oneHourAgo);

      if (recentAttempts.length > 3) {
        monitoringService.recordSecurityEvent('suspicious_login_pattern', key, {
          attempts: recentAttempts.length,
          timeWindow: '1_hour',
        });
      }
    }

    // Analyze suspicious activity patterns
    for (const [ip, activities] of this.suspiciousActivity.entries()) {
      const recentActivities = activities.filter(a => a.timestamp > oneHourAgo);

      if (recentActivities.length > 5) {
        monitoringService.recordSecurityEvent('high_suspicious_activity', ip, {
          activities: recentActivities.length,
          types: [...new Set(recentActivities.map(a => a.type))],
        });
      }
    }
  }

  /**
   * Clean up old security data
   */
  cleanupSecurityData() {
    const now = Date.now();
    const oneDayAgo = now - 86400000;

    // Clean old failed attempts
    for (const [key, attempts] of this.failedAttempts.entries()) {
      const validAttempts = attempts.filter(a => a.timestamp > oneDayAgo);
      if (validAttempts.length === 0) {
        this.failedAttempts.delete(key);
      } else {
        this.failedAttempts.set(key, validAttempts);
      }
    }

    // Clean old suspicious activities
    for (const [ip, activities] of this.suspiciousActivity.entries()) {
      const validActivities = activities.filter(a => a.timestamp > oneDayAgo);
      if (validActivities.length === 0) {
        this.suspiciousActivity.delete(ip);
      } else {
        this.suspiciousActivity.set(ip, validActivities);
      }
    }
  }

  /**
   * Start cleanup routine
   */
  startCleanupRoutine() {
    setInterval(() => {
      this.cleanupSecurityData();
    }, 3600000); // Every hour
  }

  /**
   * Get security statistics
   */
  getSecurityStats(timeRange = 3600000) {
    const cutoff = Date.now() - timeRange;

    const stats = {
      blockedIPs: this.blockedIPs.size,
      failedLogins: Array.from(this.failedAttempts.values())
        .flat()
        .filter(a => a.timestamp > cutoff).length,
      suspiciousActivities: Array.from(this.suspiciousActivity.values())
        .flat()
        .filter(a => a.timestamp > cutoff).length,
      rateLimitHits: this.securityEvents.filter(
        e => e.timestamp > cutoff && e.type === 'rate_limit_exceeded'
      ).length,
    };

    return stats;
  }

  /**
   * Export security logs for analysis
   */
  exportSecurityLogs(format = 'json') {
    const logs = {
      securityEvents: this.securityEvents,
      blockedIPs: Array.from(this.blockedIPs),
      failedAttempts: Array.from(this.failedAttempts.entries()),
      suspiciousActivity: Array.from(this.suspiciousActivity.entries()),
      exportedAt: new Date().toISOString(),
    };

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    // Could add CSV export format
    return logs;
  }
}

// Singleton instance
const advancedSecurityService = new AdvancedSecurityService();

export default advancedSecurityService;
