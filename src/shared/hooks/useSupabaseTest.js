import { useState, useEffect } from 'react';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from "@/hooks/useAuth";

const useSupabaseTest = () => {
  const [connectionStatus, setConnectionStatus] = useState('testing');
  const [authStatus, setAuthStatus] = useState('testing');
  const [tableStatus, setTableStatus] = useState('testing');
  const { user } = useAuth();

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test 1: Basic connection
        console.log('[TEST] Testando conexão básica...');
        const { data: connectionData, error: connectionError } = await supabase
          .from('profiles')
          .select('count')
          .limit(1);

        if (connectionError) {
          console.error('[TEST] Erro de conexão:', connectionError);
          setConnectionStatus('error');
        } else {
          console.log('[TEST] Conexão OK');
          setConnectionStatus('ok');
        }

        // Test 2: Authentication
        if (user) {
          console.log('[TEST] Usuário autenticado:', user.id);
          setAuthStatus('ok');
        } else {
          console.log('[TEST] Usuário não autenticado');
          setAuthStatus('error');
        }

        // Test 3: Placeholder for future tests
        setTableStatus('ok');
      } catch (error) {
        console.error('[TEST] Erro geral:', error);
        setConnectionStatus('error');
        setAuthStatus('error');
        setTableStatus('error');
      }
    };

    testConnection();
  }, [user]);

  return { connectionStatus, authStatus, tableStatus };
};

export default useSupabaseTest;
