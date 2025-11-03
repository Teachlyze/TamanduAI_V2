import { logger } from '@/shared/utils/logger';
import { supabase } from '@/lib/supabaseClient';

/**
 * Terms Acceptance Audit Service
 * Handles logging and tracking of terms and privacy policy acceptance
 */
export const TermsAuditService = {
  /**
   * Log terms and privacy policy acceptance
   * @param {string} userId - The user ID
   * @param {string} termsVersion - The terms version accepted
   * @param {string} privacyVersion - The privacy version accepted
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - The audit log entry
   */
  async logAcceptance(userId, termsVersion, privacyVersion, options = {}) {
    try {
      const { data, error } = await supabase
        .from('terms_acceptance')
        .insert([
          {
            user_id: userId,
            terms_version: termsVersion,
            privacy_version: privacyVersion,
            ip_address: options.ipAddress || this.getClientIP(),
            user_agent: options.userAgent || navigator.userAgent,
            acceptance_method: options.method || 'web',
            metadata: options.metadata || {},
          }
        ])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      logger.error('Error logging terms acceptance:', error)
      throw error;
    }
  },

  /**
   * Get terms acceptance history for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} - Array of acceptance records
   */
  async getAcceptanceHistory(userId) {
    try {
      const { data, error } = await supabase
        .from('terms_acceptance')
        .select('*')
        .eq('user_id', userId)
        .order('accepted_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Error getting acceptance history:', error)
      return [];
    }
  },

  /**
   * Check if user has accepted specific terms and privacy versions
   * @param {string} userId - The user ID
   * @param {string} termsVersion - The required terms version
   * @param {string} privacyVersion - The required privacy version
   * @returns {Promise<boolean>} - Whether the user has accepted the required versions
   */
  async hasAcceptedVersions(userId, termsVersion, privacyVersion) {
    try {
      const { data, error } = await supabase
        .from('terms_acceptance')
        .select('id')
        .eq('user_id', userId)
        .eq('terms_version', termsVersion)
        .eq('privacy_version', privacyVersion)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      logger.error('Error checking acceptance versions:', error)
      return false;
    }
  },

  /**
   * Get the latest terms acceptance for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Object|null>} - The latest acceptance record or null
   */
  async getLatestAcceptance(userId) {
    try {
      const { data, error } = await supabase
        .from('terms_acceptance')
        .select('*')
        .eq('user_id', userId)
        .order('accepted_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || null;
    } catch (error) {
      logger.error('Error getting latest acceptance:', error)
      return null;
    }
  },

  /**
   * Get acceptance statistics for admin dashboard
   * @param {Object} options - Filter options
   * @returns {Promise<Object>} - Statistics object
   */
  async getAcceptanceStats(options = {}) {
    try {
      let query = supabase
        .from('terms_acceptance')
        .select('terms_version, privacy_version, accepted_at, acceptance_method');

      if (options.dateFrom) {
        query = query.gte('accepted_at', options.dateFrom);
      }

      if (options.dateTo) {
        query = query.lte('accepted_at', options.dateTo);
      }

      if (options.method) {
        query = query.eq('acceptance_method', options.method);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        byTermsVersion: {},
        byPrivacyVersion: {},
        byMethod: {},
        recentAcceptances: data?.slice(0, 10) || [],
      };

      // Aggregate by versions and methods
      data?.forEach(record => {
        // Count by terms version
        stats.byTermsVersion[record.terms_version] =
          (stats.byTermsVersion[record.terms_version] || 0) + 1;

        // Count by privacy version
        stats.byPrivacyVersion[record.privacy_version] =
          (stats.byPrivacyVersion[record.privacy_version] || 0) + 1;

        // Count by method
        stats.byMethod[record.acceptance_method] =
          (stats.byMethod[record.acceptance_method] || 0) + 1;
      });

      return stats;
    } catch (error) {
      logger.error('Error getting acceptance stats:', error)
      return {
        total: 0,
        byTermsVersion: {},
        byPrivacyVersion: {},
        byMethod: {},
        recentAcceptances: [],
      };
    }
  },

  /**
   * Get unique IP addresses that have accepted terms (for compliance)
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} - Array of unique IP addresses with acceptance counts
   */
  async getUniqueIPAddresses(options = {}) {
    try {
      let query = supabase
        .from('terms_acceptance')
        .select('ip_address, accepted_at');

      if (options.dateFrom) {
        query = query.gte('accepted_at', options.dateFrom);
      }

      if (options.dateTo) {
        query = query.lte('accepted_at', options.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by IP and count acceptances
      const ipCounts = {};
      data?.forEach(record => {
        const ip = record.ip_address;
        if (ip) {
          ipCounts[ip] = (ipCounts[ip] || 0) + 1;
        }
      });

      return Object.entries(ipCounts).map(([ip, count]) => ({
        ip_address: ip,
        acceptance_count: count,
        latest_acceptance: data?.find(r => r.ip_address === ip)?.accepted_at,
      }));
    } catch (error) {
      logger.error('Error getting unique IP addresses:', error)
      return [];
    }
  },

  /**
   * Get client IP address (client-side helper)
   * @returns {string} - The client IP address or 'unknown'
   */
  getClientIP() {
    // Note: In browser environment, we can't get the real IP address
    // This is a placeholder that should be replaced with server-side IP detection
    return 'client-side-detection-needed';
  },

  /**
   * Validate terms acceptance for user access
   * @param {string} userId - The user ID
   * @param {string} requiredTermsVersion - The required terms version
   * @param {string} requiredPrivacyVersion - The required privacy version
   * @returns {Promise<Object>} - Validation result
   */
  async validateAcceptance(userId, requiredTermsVersion, requiredPrivacyVersion) {
    try {
      const hasAccepted = await this.hasAcceptedVersions(
        userId,
        requiredTermsVersion,
        requiredPrivacyVersion
      );

      if (!hasAccepted) {
        const latestAcceptance = await this.getLatestAcceptance(userId);

        return {
          valid: false,
          requiresAcceptance: true,
          currentTermsVersion: latestAcceptance?.terms_version || null,
          currentPrivacyVersion: latestAcceptance?.privacy_version || null,
          requiredTermsVersion,
          requiredPrivacyVersion,
        };
      }

      return {
        valid: true,
        requiresAcceptance: false,
        currentTermsVersion: requiredTermsVersion,
        currentPrivacyVersion: requiredPrivacyVersion,
      };
    } catch (error) {
      logger.error('Error validating acceptance:', error)
      return {
        valid: false,
        requiresAcceptance: true,
        error: error.message,
      };
    }
  }
};

export default TermsAuditService;
