// Minimal fallback for teacher subscription checks used by CreateClassForm
// NOTE: Replace with real limits once billing/subscription is connected.

import { supabase } from '@/shared/services/supabaseClient';

const DEFAULT_LIMITS = {
  maxClasses: 5,
};

async function getTeacherClassCount(teacherId) {
  try {
    const { count, error } = await supabase
      .from('classes')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', teacherId);
    if (error) throw error;
    return count || 0;
  } catch (_) {
    return 0;
  }
}

async function checkCanCreateClass(teacherId) {
  try {
    const current = await getTeacherClassCount(teacherId);
    return current < DEFAULT_LIMITS.maxClasses;
  } catch (_) {
    return true; // fail-open to not block teacher
  }
}

async function getUsageStats(teacherId) {
  const used = await getTeacherClassCount(teacherId);
  return {
    plan: 'free',
    limits: DEFAULT_LIMITS,
    usage: {
      classes: used,
    },
    available: {
      classes: Math.max(0, DEFAULT_LIMITS.maxClasses - used),
    },
  };
}

export default {
  checkCanCreateClass,
  getUsageStats,
};
