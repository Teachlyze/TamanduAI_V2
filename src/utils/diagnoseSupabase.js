import { supabase } from '@/shared/services/supabaseClient';

/**
 * Diagnóstico do Supabase para verificar se a configuração está correta
 */
export async function diagnoseSupabase() {
  console.log('🔍 Iniciando diagnóstico do Supabase...');
  
  const results = {
    auth: { status: 'unknown', message: '' },
    profiles: { status: 'unknown', message: '' },
    rls: { status: 'unknown', message: '' }
  };
  
  try {
    // 1. Verificar autenticação
    console.log('1️⃣ Verificando autenticação...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      results.auth.status = 'error';
      results.auth.message = `Erro ao buscar sessão: ${sessionError.message}`;
      console.error('❌', results.auth.message);
    } else if (!session) {
      results.auth.status = 'warning';
      results.auth.message = 'Nenhuma sessão ativa';
      console.warn('⚠️', results.auth.message);
    } else {
      results.auth.status = 'success';
      results.auth.message = `Sessão ativa: ${session.user.email}`;
      console.log('✅', results.auth.message);
      
      // 2. Verificar tabela profiles
      console.log('2️⃣ Verificando tabela profiles...');
      const startTime = Date.now();
      
      try {
        const profilePromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de 5 segundos')), 5000)
        );
        
        const { data: profile, error: profileError } = await Promise.race([
          profilePromise,
          timeoutPromise
        ]);
        
        const elapsed = Date.now() - startTime;
        console.log(`⏱️ Query executada em ${elapsed}ms`);
        
        if (profileError) {
          results.profiles.status = 'error';
          results.profiles.message = `Erro ao buscar profile: ${profileError.message} (código: ${profileError.code})`;
          console.error('❌', results.profiles.message);
          
          // Verificar se é problema de RLS
          if (profileError.code === 'PGRST116' || profileError.message.includes('Row Level Security')) {
            results.rls.status = 'error';
            results.rls.message = 'Row Level Security (RLS) bloqueando acesso à tabela profiles';
            console.error('🚨', results.rls.message);
          }
        } else if (!profile) {
          results.profiles.status = 'warning';
          results.profiles.message = 'Profile não encontrado na tabela';
          console.warn('⚠️', results.profiles.message);
        } else {
          results.profiles.status = 'success';
          results.profiles.message = `Profile encontrado: ${profile.role}`;
          console.log('✅', results.profiles.message);
          
          results.rls.status = 'success';
          results.rls.message = 'RLS configurado corretamente';
          console.log('✅', results.rls.message);
        }
      } catch (err) {
        results.profiles.status = 'error';
        results.profiles.message = `Timeout ou erro: ${err.message}`;
        console.error('❌', results.profiles.message);
      }
    }
  } catch (err) {
    console.error('❌ Erro geral no diagnóstico:', err);
  }
  
  console.log('📊 Resultado do diagnóstico:', results);
  return results;
}

// Executar diagnóstico automaticamente se estiver em modo dev
if (import.meta.env.DEV) {
  // Aguardar um pouco para não interferir com o bootstrap
  setTimeout(() => {
    diagnoseSupabase();
  }, 1000);
}
