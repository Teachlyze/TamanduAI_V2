import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// ✅ Usar PUBLISHABLE_DEFAULT_KEY (nova atualização Supabase) ou ANON_KEY como fallback
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL ou Key não configurados. Verifique suas variáveis de ambiente.');
  console.error('URL:', supabaseUrl);
  console.error('Publishable Key:', import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ? '✅ Configurada' : '❌ Faltando');
  console.error('Anon Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ Faltando');
  throw new Error('Supabase credentials missing');
}

console.log('✅ Supabase client initialized with URL:', supabaseUrl.substring(0, 30) + '...');

// ✅ Criar cliente Supabase com configurações otimizadas
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Desabilitado para reduzir latência
    storage: window.localStorage,
    storageKey: 'tamanduai-auth-token',
    // flowType: 'pkce' removido - PKCE adiciona latência desnecessária
    // Para apps web tradicionais, implicit flow é mais rápido
  },
  global: {
    headers: {
      'X-Client-Info': 'tamanduai-web@1.0.0'
    }
  },
  db: {
    schema: 'public'
  },
  // Configurações de rede otimizadas
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
