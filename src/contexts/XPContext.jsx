import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Zap, Star } from 'lucide-react';

const XPContext = createContext();

export const XPProvider = ({ children }) => {
  const { user } = useAuth();
  const [xpData, setXpData] = useState({
    totalXP: 0,
    level: 1,
    currentLevelXP: 0,
    nextLevelXP: 100,
    loading: true
  });

  // Calcular level baseado em XP total
  const calculateLevel = (totalXP) => {
    const level = Math.floor(totalXP / 100) + 1;
    const currentLevelXP = totalXP % 100;
    const nextLevelXP = 100;
    return { level, currentLevelXP, nextLevelXP };
  };

  // Carregar XP do usuário
  const loadXP = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Buscar XP total do usuário
      const { data: logs, error } = await supabase
        .from('xp_log')
        .select('xp')
        .eq('user_id', user.id);

      if (error) throw error;

      const totalXP = (logs || []).reduce((sum, log) => sum + (log.xp || 0), 0);
      const levelData = calculateLevel(totalXP);

      setXpData({
        totalXP,
        ...levelData,
        loading: false
      });

      // Atualizar gamification_profiles se existir (safe: ignora erros se tabela não existir)
      try {
        const { data: profile, error: profileError } = await supabase
          .from('gamification_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .maybeSingle();

        // Ignore 400, 404, 42501 errors (table doesn't exist, RLS denies, or query invalid)
        if (!profileError && profile?.id) {
          try {
            await supabase
              .from('gamification_profiles')
              .update({ 
                xp_total: totalXP, 
                level: levelData.level,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id);
          } catch (updateError) {
            console.debug('gamification_profiles update failed:', updateError?.message);
          }
        }
      } catch (gamificationError) {
        // Silently ignore gamification_profiles errors (400, 404, RLS, etc.)
        console.debug('gamification_profiles query failed:', gamificationError?.message);
      }
    } catch (error) {
      console.error('Erro ao carregar XP:', error);
      setXpData(prev => ({ ...prev, loading: false }));
    }
  }, [user?.id]);

  useEffect(() => {
    loadXP();
  }, [loadXP]);

  // Função para adicionar XP
  const addXP = async (amount, source, metadata = {}) => {
    if (!user?.id || !amount) return;

    try {
      // Inserir no xp_log
      const { error: logError } = await supabase
        .from('xp_log')
        .insert({
          user_id: user.id,
          xp: amount,
          source,
          metadata,
          created_at: new Date().toISOString()
        });

      if (logError) throw logError;

      // Criar notificação
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: '🎉 XP Ganho!',
          message: `Você ganhou ${amount} XP em ${source}!`,
          type: 'xp_gained',
          is_read: false,
          metadata: { xp: amount, source, ...metadata },
          created_at: new Date().toISOString()
        });

      if (notifError) console.error('Erro ao criar notificação:', notifError);

      // Atualizar estado local
      const newTotalXP = xpData.totalXP + amount;
      const oldLevel = xpData.level;
      const levelData = calculateLevel(newTotalXP);

      setXpData({
        totalXP: newTotalXP,
        ...levelData,
        loading: false
      });

      // Toast animado
      const CustomToast = () => (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-4 rounded-xl shadow-2xl"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 0.5 }}
          >
            <Zap className="w-6 h-6" />
          </motion.div>
          <div>
            <div className="font-bold text-lg">+{amount} XP</div>
            <div className="text-sm opacity-90">{source}</div>
          </div>
        </motion.div>
      );

      toast.custom(<CustomToast />, {
        duration: 3000,
        position: 'top-right'
      });

      // Se subiu de nível, mostrar toast especial
      if (levelData.level > oldLevel) {
        setTimeout(() => {
          const LevelUpToast = () => (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className="flex items-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-6 rounded-2xl shadow-2xl border-4 border-white/30"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Star className="w-8 h-8 fill-yellow-300" />
              </motion.div>
              <div>
                <div className="font-bold text-2xl">Level UP! 🎊</div>
                <div className="text-sm">Você alcançou o nível {levelData.level}!</div>
              </div>
            </motion.div>
          );

          toast.custom(<LevelUpToast />, {
            duration: 5000,
            position: 'top-center'
          });
        }, 1000);
      }

    } catch (error) {
      console.error('Erro ao adicionar XP:', error);
      toast.error('Erro ao registrar XP');
    }
  };

  // Subscrição em tempo real para mudanças em xp_log
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('xp_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'xp_log',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Recarregar XP quando houver nova inserção
          loadXP();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, loadXP]);

  return (
    <XPContext.Provider value={{ ...xpData, addXP, refreshXP: loadXP }}>
      {children}
    </XPContext.Provider>
  );
};

export const useXP = () => {
  const context = useContext(XPContext);
  if (!context) {
    throw new Error('useXP must be used within XPProvider');
  }
  return context;
};
