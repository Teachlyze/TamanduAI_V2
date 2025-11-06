import { logger } from '@/shared/utils/logger';
import { supabase } from '@/shared/services/supabaseClient';

/**
 * Diagnóstico do Supabase para verificar se a configuração está correta
 */
export async function diagnoseSupabase() {
  logger.debug('🔍 Iniciando diagnóstico do Supabase...')
  
  const results = {
    auth: { status: 'unknown', message: '' },
    profiles: { status: 'unknown', message: '' },
    rls: { status: 'unknown', message: '' }
  };
  
  try {
    // 1. Verificar autenticação
    logger.debug('1️⃣ Verificando autenticação...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      results.auth.status = 'error';
      results.auth.message = `Erro ao buscar sessão: ${sessionError.message}`;
      logger.error('❌', results.auth.message)
    } else if (!session) {
      results.auth.status = 'warning';
      results.auth.message = 'Nenhuma sessão ativa';
      logger.warn('⚠️', results.auth.message)
    } else {
      results.auth.status = 'success';
      results.auth.message = `Sessão ativa: ${session.user.email}`;
      logger.debug('✅', results.auth.message)
      
      // 2. Verificar tabela profiles
      logger.debug('2️⃣ Verificando tabela profiles...')
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
        logger.debug(`⏱️ Query executada em ${elapsed}ms`)
        
        if (profileError) {
          results.profiles.status = 'error';
          results.profiles.message = `Erro ao buscar profile: ${profileError.message} (código: ${profileError.code})`;
          logger.error('❌', results.profiles.message)
          
          // Verificar se é problema de RLS
          if (profileError.code === 'PGRST116' || profileError.message.includes('Row Level Security')) {
            results.rls.status = 'error';
            results.rls.message = 'Row Level Security (RLS) bloqueando acesso à tabela profiles';
            logger.error('🚨', results.rls.message)
          }
        } else if (!profile) {
          results.profiles.status = 'warning';
          results.profiles.message = 'Profile não encontrado na tabela';
          logger.warn('⚠️', results.profiles.message)
        } else {
          results.profiles.status = 'success';
          results.profiles.message = `Profile encontrado: ${profile.role}`;
          logger.debug('✅', results.profiles.message)
          
          results.rls.status = 'success';
          results.rls.message = 'RLS configurado corretamente';
          logger.debug('✅', results.rls.message)
        }
      } catch (err) {
        results.profiles.status = 'error';
        results.profiles.message = `Timeout ou erro: ${err.message}`;
        logger.error('❌', results.profiles.message)
      }
    }
  } catch (err) {
    logger.error('❌ Erro geral no diagnóstico:', err)
  }
  
  logger.debug('📊 Resultado do diagnóstico:', results)
  return results;
}

// DIAGNÓSTICO DESABILITADO - Vazava dados sensíveis no console
// Para habilitar manualmente, chame diagnoseSupabase() no console do navegador
// if (import.meta.env.DEV) {
//   setTimeout(() => {
//     diagnoseSupabase();
//   }, 1000);
// }
