/**
 * Storage Manager - Gerenciamento Inteligente de LocalStorage
 * 
 * Sistema que separa claramente dados de usuário de preferências globais,
 * garantindo limpeza correta no logout e persistência adequada de configurações.
 */

// ============================================================================
// NAMESPACES - Organização de chaves no localStorage
// ============================================================================

const STORAGE_KEYS = {
  // 🌍 PREFERÊNCIAS GLOBAIS (persistem após logout)
  LANGUAGE: 'app_language',
  FONT_SIZE: 'app_font_size',
  ACCESSIBILITY_SETTINGS: 'app_accessibility',
  COOKIES_ACCEPTED: 'app_cookies_accepted',
  ONBOARDING_COMPLETED: 'app_onboarding_completed',
  
  // 👤 DADOS DO USUÁRIO (removidos no logout)
  USER_DATA: 'user_data',
  USER_TOKEN: 'user_token',
  USER_PROFILE: 'user_profile',
  USER_PREFERENCES: 'user_preferences',
  USER_CACHE: 'user_cache',
  ACTIVITY_DRAFTS: 'user_activity_drafts',
  SIDEBAR_COLLAPSED: 'user_sidebar_collapsed',
  THEME: 'user_theme',                    // Movido para usuário
  HIGH_CONTRAST: 'user_high_contrast',    // Movido para usuário
  
  // 📝 CACHE TEMPORÁRIO (pode ser limpo)
  TEMP_DATA: 'temp_data',
  SESSION_DATA: 'session_data'
};

// Prefixos para identificação rápida
const USER_PREFIX = 'user_';
const APP_PREFIX = 'app_';
const TEMP_PREFIX = 'temp_';

class StorageManager {
  constructor() {
    this.storage = typeof window !== 'undefined' ? window.localStorage : null;
  }

  // ========================================================================
  // MÉTODOS GENÉRICOS
  // ========================================================================

  /**
   * Salva um valor no localStorage
   */
  set(key, value) {
    if (!this.storage) return false;
    
    try {
      const serialized = JSON.stringify(value);
      this.storage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  }

  /**
   * Recupera um valor do localStorage
   */
  get(key, defaultValue = null) {
    if (!this.storage) return defaultValue;
    
    try {
      const item = this.storage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  }

  /**
   * Remove um item específico
   */
  remove(key) {
    if (!this.storage) return false;
    
    try {
      this.storage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  }

  /**
   * Verifica se uma chave existe
   */
  has(key) {
    if (!this.storage) return false;
    return this.storage.getItem(key) !== null;
  }

  // ========================================================================
  // PREFERÊNCIAS GLOBAIS (persistem após logout)
  // ========================================================================

  /**
   * Salva idioma preferido
   */
  setLanguage(language) {
    return this.set(STORAGE_KEYS.LANGUAGE, language);
  }

  /**
   * Recupera idioma preferido
   */
  getLanguage() {
    return this.get(STORAGE_KEYS.LANGUAGE, 'pt-BR');
  }

  /**
   * Salva configurações de acessibilidade
   */
  setAccessibilitySettings(settings) {
    return this.set(STORAGE_KEYS.ACCESSIBILITY_SETTINGS, settings);
  }

  /**
   * Recupera configurações de acessibilidade
   */
  getAccessibilitySettings() {
    return this.get(STORAGE_KEYS.ACCESSIBILITY_SETTINGS, {
      fontSize: 'medium',
      highContrast: false,
      reduceMotion: false,
      screenReader: false
    });
  }

  // ========================================================================
  // DADOS DO USUÁRIO (removidos no logout)
  // ========================================================================

  /**
   * Salva dados completos do usuário
   */
  setUserData(userData) {
    return this.set(STORAGE_KEYS.USER_DATA, userData);
  }

  /**
   * Recupera dados do usuário
   */
  getUserData() {
    return this.get(STORAGE_KEYS.USER_DATA, null);
  }

  /**
   * Salva token de autenticação
   */
  setUserToken(token) {
    return this.set(STORAGE_KEYS.USER_TOKEN, token);
  }

  /**
   * Recupera token de autenticação
   */
  getUserToken() {
    return this.get(STORAGE_KEYS.USER_TOKEN, null);
  }

  /**
   * Salva perfil do usuário
   */
  setUserProfile(profile) {
    return this.set(STORAGE_KEYS.USER_PROFILE, profile);
  }

  /**
   * Recupera perfil do usuário
   */
  getUserProfile() {
    return this.get(STORAGE_KEYS.USER_PROFILE, null);
  }

  /**
   * Salva rascunhos de atividades do usuário
   */
  setActivityDrafts(drafts) {
    return this.set(STORAGE_KEYS.ACTIVITY_DRAFTS, drafts);
  }

  /**
   * Recupera rascunhos de atividades
   */
  getActivityDrafts() {
    return this.get(STORAGE_KEYS.ACTIVITY_DRAFTS, []);
  }

  /**
   * Salva estado do sidebar (colapsado/expandido)
   */
  setSidebarCollapsed(collapsed) {
    return this.set(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed);
  }

  /**
   * Recupera estado do sidebar
   */
  getSidebarCollapsed() {
    return this.get(STORAGE_KEYS.SIDEBAR_COLLAPSED, false);
  }

  /**
   * Salva o tema do usuário (dark/light) - POR USUÁRIO
   */
  setTheme(theme) {
    return this.set(STORAGE_KEYS.THEME, theme);
  }

  /**
   * Recupera o tema do usuário - POR USUÁRIO
   */
  getTheme() {
    return this.get(STORAGE_KEYS.THEME, 'light');
  }

  /**
   * Salva preferência de alto contraste do usuário - POR USUÁRIO
   */
  setHighContrast(enabled) {
    return this.set(STORAGE_KEYS.HIGH_CONTRAST, enabled);
  }

  /**
   * Recupera preferência de alto contraste do usuário - POR USUÁRIO
   */
  getHighContrast() {
    return this.get(STORAGE_KEYS.HIGH_CONTRAST, false);
  }

  // ========================================================================
  // LIMPEZA E LOGOUT
  // ========================================================================

  /**
   * Remove APENAS dados do usuário, mantendo preferências globais
   * 
   * ✅ Remove: user_*, session_*, temp_*
   * ✅ Mantém: app_* (theme, language, accessibility, etc.)
   */
  clearUserData() {
    if (!this.storage) return false;

    try {
      const keysToRemove = [];
      
      // Iterar sobre todas as chaves do localStorage
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        
        // Identificar chaves que devem ser removidas
        if (
          key.startsWith(USER_PREFIX) ||
          key.startsWith(TEMP_PREFIX) ||
          key.startsWith('session_') ||
          key === 'sb-wapbwaimkurbuihatmix-auth-token' || // Supabase token
          key === 'supabase.auth.token' || // Supabase token alternativo
          key === STORAGE_KEYS.THEME || // Tema do usuário
          key === STORAGE_KEYS.HIGH_CONTRAST // Preferência de alto contraste
        ) {
          keysToRemove.push(key);
        }
      }

      // Remover todas as chaves identificadas
      keysToRemove.forEach(key => this.storage.removeItem(key));
      
      console.log(`[StorageManager] Cleared ${keysToRemove.length} user data keys`);
      console.log('[StorageManager] Preserved app preferences (theme, language, etc.)');
      
      return true;
    } catch (error) {
      console.error('[StorageManager] Error clearing user data:', error);
      return false;
    }
  }

  /**
   * Remove TUDO do localStorage (incluindo preferências)
   * ⚠️ Usar apenas em casos extremos
   */
  clearAll() {
    if (!this.storage) return false;
    
    try {
      this.storage.clear();
      console.log('[StorageManager] Cleared ALL localStorage');
      return true;
    } catch (error) {
      console.error('[StorageManager] Error clearing all storage:', error);
      return false;
    }
  }

  /**
   * Remove apenas cache temporário
   */
  clearCache() {
    if (!this.storage) return false;

    try {
      const keysToRemove = [];
      
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key.startsWith(TEMP_PREFIX) || key.includes('cache')) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => this.storage.removeItem(key));
      console.log(`[StorageManager] Cleared ${keysToRemove.length} cache keys`);
      
      return true;
    } catch (error) {
      console.error('[StorageManager] Error clearing cache:', error);
      return false;
    }
  }

  // ========================================================================
  // UTILITÁRIOS
  // ========================================================================

  /**
   * Retorna estatísticas de uso do localStorage
   */
  getStats() {
    if (!this.storage) return null;

    try {
      let userKeys = 0;
      let appKeys = 0;
      let tempKeys = 0;
      let otherKeys = 0;
      let totalSize = 0;

      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        const value = this.storage.getItem(key);
        
        totalSize += key.length + (value?.length || 0);

        if (key.startsWith(USER_PREFIX)) userKeys++;
        else if (key.startsWith(APP_PREFIX)) appKeys++;
        else if (key.startsWith(TEMP_PREFIX)) tempKeys++;
        else otherKeys++;
      }

      return {
        totalKeys: this.storage.length,
        userKeys,
        appKeys,
        tempKeys,
        otherKeys,
        totalSize,
        totalSizeKB: (totalSize / 1024).toFixed(2)
      };
    } catch (error) {
      console.error('[StorageManager] Error getting stats:', error);
      return null;
    }
  }

  /**
   * Lista todas as chaves por categoria
   */
  listKeys() {
    if (!this.storage) return null;

    const keys = {
      user: [],
      app: [],
      temp: [],
      other: []
    };

    try {
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        
        if (key.startsWith(USER_PREFIX)) keys.user.push(key);
        else if (key.startsWith(APP_PREFIX)) keys.app.push(key);
        else if (key.startsWith(TEMP_PREFIX)) keys.temp.push(key);
        else keys.other.push(key);
      }

      return keys;
    } catch (error) {
      console.error('[StorageManager] Error listing keys:', error);
      return null;
    }
  }

  /**
   * Verifica se o localStorage está disponível e funcional
   */
  isAvailable() {
    if (!this.storage) return false;

    try {
      const testKey = '__storage_test__';
      this.storage.setItem(testKey, 'test');
      this.storage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Exportar instância única (Singleton)
export const storageManager = new StorageManager();

// Exportar classe para testes
export { StorageManager, STORAGE_KEYS };

// Exportar como default
export default storageManager;
