import { logger } from '@/shared/utils/logger';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';

/**
 * Hook para notificações em tempo real
 * Usa Supabase Realtime para atualizações instantâneas
 */
export const useRealtimeNotifications = (userId) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carregar notificações iniciais
  const loadNotifications = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (err) {
      logger.error('Erro ao carregar notificações:', err)
      setError(err.message);
      toast.error('Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Subscrição em tempo real
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotification = payload.new;
          
          // Adicionar à lista
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Tocar som de notificação
          playNotificationSound();
          
          // Mostrar toast personalizado
          showNotificationToast(newNotification);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setNotifications(prev =>
            prev.map(n => n.id === payload.new.id ? payload.new : n)
          );
          
          if (payload.new.read && !payload.old.read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          if (!payload.old.read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.debug('✅ Inscrito em notificações real-time')
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('❌ Erro na inscrição de notificações')
          setError('Erro na conexão em tempo real');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (updateError) throw updateError;

      return true;
    } catch (err) {
      logger.error('Erro ao marcar como lida:', err)
      toast.error('Erro ao atualizar notificação');
      return false;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('read', false);

      if (updateError) throw updateError;

      setUnreadCount(0);
      toast.success('Todas as notificações foram marcadas como lidas');
      return true;
    } catch (err) {
      logger.error('Erro ao marcar todas como lidas:', err)
      toast.error('Erro ao atualizar notificações');
      return false;
    }
  }, [userId]);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (deleteError) throw deleteError;

      return true;
    } catch (err) {
      logger.error('Erro ao deletar notificação:', err)
      toast.error('Erro ao excluir notificação');
      return false;
    }
  }, []);

  const deleteAllRead = useCallback(async () => {
    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .eq('read', true);

      if (deleteError) throw deleteError;

      toast.success('Notificações lidas excluídas');
      return true;
    } catch (err) {
      logger.error('Erro ao deletar notificações:', err)
      toast.error('Erro ao excluir notificações');
      return false;
    }
  }, [userId]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    refresh: loadNotifications
  };
};

// Função auxiliar para tocar som
const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Silenciar erro se autoplay não permitido
    });
  } catch (error) {
    // Ignorar erro
  }
};

// Função auxiliar para mostrar toast personalizado
const showNotificationToast = (notification) => {
  const icons = {
    plagiarism_alert: '🚨',
    activity_submitted: '📝',
    grade_received: '📊',
    deadline_approaching: '⏰',
    class_invitation: '💌',
    new_material: '📚',
    comment_received: '💬',
    system: '🔔'
  };

  const icon = icons[notification.type] || '📬';

  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-xl pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden`}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                {notification.title}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-700 dark:text-gray-400"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    ),
    { duration: 5000, position: 'top-right' }
  );
};

export default useRealtimeNotifications;
