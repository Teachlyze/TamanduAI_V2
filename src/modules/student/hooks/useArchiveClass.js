import { logger } from '@/shared/utils/logger';
/**
 * useArchiveClass - Hook para gerenciar arquivamento de turmas
 */

import { useState } from 'react';
import { supabase } from '@/shared/services/supabaseClient';
import { useToast } from '@/shared/components/ui/use-toast';

export const useArchiveClass = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  /**
   * Arquiva uma turma para o aluno atual
   */
  const archiveClass = async (classId, userId) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('class_members')
        .update({ is_archived: true })
        .eq('class_id', classId)
        .eq('user_id', userId)
        .eq('role', 'student');

      if (error) throw error;

      toast({
        title: '✓ Turma arquivada',
        description: 'A turma foi movida para "Turmas Arquivadas"'
      });

      return { success: true };
    } catch (error) {
      logger.error('Erro ao arquivar turma:', error)
      toast({
        title: '❌ Erro ao arquivar',
        description: error.message,
        variant: 'destructive'
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Desarquiva uma turma para o aluno atual
   */
  const unarchiveClass = async (classId, userId) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('class_members')
        .update({ is_archived: false })
        .eq('class_id', classId)
        .eq('user_id', userId)
        .eq('role', 'student');

      if (error) throw error;

      toast({
        title: '✓ Turma restaurada',
        description: 'A turma voltou para "Turmas Ativas"'
      });

      return { success: true };
    } catch (error) {
      logger.error('Erro ao desarquivar turma:', error)
      toast({
        title: '❌ Erro ao restaurar',
        description: error.message,
        variant: 'destructive'
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Busca turmas do aluno (ativas ou arquivadas)
   */
  const fetchClasses = async (userId, archived = false) => {
    try {
      const { data, error } = await supabase
        .from('class_members')
        .select(`
          id,
          is_archived,
          joined_at,
          class:classes(
            id,
            name,
            subject,
            description,
            color,
            banner_color,
            invite_code,
            created_at
          )
        `)
        .eq('user_id', userId)
        .eq('role', 'student')
        .eq('is_archived', archived)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      return { data: data || [], error: null };
    } catch (error) {
      logger.error('Erro ao buscar turmas:', error)
      return { data: [], error };
    }
  };

  return {
    loading,
    archiveClass,
    unarchiveClass,
    fetchClasses
  };
};

export default useArchiveClass;
