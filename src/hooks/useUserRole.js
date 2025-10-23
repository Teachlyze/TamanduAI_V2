import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from "@/hooks/useAuth";

// Operational default: 'teacher' to prevent hiding features while RLS/tables are pending.
// If the DB explicitly returns 'student', we honor it.
export default function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState('teacher');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        // First try to get role from user metadata (faster)
        if (user.user_metadata?.role) {
          if (active) {
            setRole(user.user_metadata.role === 'student' ? 'student' : 'teacher');
            setLoading(false);
          }
          return;
        }
        
        // Fallback: get from profiles table
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        if (!active) return;
        if (!error && data?.role) {
          setRole(data.role === 'student' ? 'student' : 'teacher');
        } else {
          setRole('teacher');
        }
      } catch {
        if (active) setRole('teacher');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user?.id, user?.user_metadata?.role]);

  return { role, isTeacher: role === 'teacher', loading };
}
