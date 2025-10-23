// Secure Student Performance Service
// This replaces any insecure direct access to vw_student_performance

import { supabase } from '@/shared/services/supabaseClient';
import { Logger } from '@/shared/services/logger';

// Secure function to get student performance data
export const getStudentPerformanceSecure = async (studentId = null) => {
  try {
    Logger.info('Getting student performance data', { studentId });

    // Use the secure RPC function instead of direct view access
    const { data, error } = await supabase
      .rpc('get_student_performance_secure', {
        student_id: studentId || (await supabase.auth.getUser()).data.user?.id
      });

    if (error) {
      Logger.error('Error fetching student performance data', {
        error: error.message,
        studentId
      });
      throw error;
    }

    Logger.info('Student performance data retrieved successfully', {
      count: data?.length || 0
    });

    return data || [];
  } catch (error) {
    Logger.error('Failed to get student performance data', {
      error: error.message,
      studentId
    });
    throw error;
  }
};

// Secure function to get current user's performance data
export const getMyPerformanceData = async () => {
  try {
    Logger.info('Getting current user performance data');

    // Use the secure function for user-specific data
    const { data, error } = await supabase
      .rpc('get_my_performance_data');

    if (error) {
      Logger.error('Error fetching user performance data', {
        error: error.message
      });
      throw error;
    }

    Logger.info('User performance data retrieved successfully', {
      count: data?.length || 0
    });

    return data || [];
  } catch (error) {
    Logger.error('Failed to get user performance data', {
      error: error.message
    });
    throw error;
  }
};

// Function to check if user has permission to view performance data
export const checkPerformanceAccessPermission = async (targetStudentId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      Logger.warn('Unauthenticated user attempted to access performance data');
      return { allowed: false, reason: 'User not authenticated' };
    }

    // Get user's profile to check role
    const { data: profile, error } = await supabase
      .from('public.profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) {
      Logger.error('Error checking user permissions', {
        error: error.message,
        userId: user.id
      });
      return { allowed: false, reason: 'Error checking permissions' };
    }

    const isAdmin = profile?.role === 'admin';
    const isTeacher = profile?.role === 'teacher';
    const isOwner = user.id === targetStudentId;

    const allowed = isAdmin || isTeacher || isOwner;

    Logger.info('Performance access permission checked', {
      userId: user.id,
      targetStudentId,
      userRole: profile?.role,
      isAdmin,
      isTeacher,
      isOwner,
      allowed
    });

    return {
      allowed,
      reason: allowed ? 'Permission granted' : 'Insufficient permissions',
      userRole: profile?.role
    };
  } catch (error) {
    Logger.error('Error checking performance access permission', {
      error: error.message,
      targetStudentId
    });
    return { allowed: false, reason: 'Error checking permissions' };
  }
};

// Admin function to get all performance data (with logging)
export const getAllPerformanceData = async () => {
  try {
    Logger.info('Admin attempting to get all performance data');

    // First verify admin permissions
    const permissionCheck = await checkPerformanceAccessPermission();
    if (!permissionCheck.allowed) {
      Logger.warn('Non-admin user attempted to access all performance data', {
        reason: permissionCheck.reason
      });
      throw new Error('Admin access required');
    }

    // Use secure view with admin policy
    const { data, error } = await supabase
      .from('public.vw_student_performance_secure')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      Logger.error('Error fetching all performance data', {
        error: error.message
      });
      throw error;
    }

    Logger.info('All performance data retrieved by admin', {
      count: data?.length || 0
    });

    return data || [];
  } catch (error) {
    Logger.error('Failed to get all performance data', {
      error: error.message
    });
    throw error;
  }
};

// Security audit function
export const auditSecurityEvent = async (event, details = {}) => {
  Logger.critical('Security event detected', {
    event,
    ...details,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  });
};

// Export security utilities
export const SecurityUtils = {
  checkPerformanceAccessPermission,
  auditSecurityEvent,
  getStudentPerformanceSecure,
  getMyPerformanceData,
  getAllPerformanceData
};

export default SecurityUtils;
