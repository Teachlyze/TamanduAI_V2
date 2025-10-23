import { useEffect, useCallback } from 'react';

/**
 * Keyboard Shortcuts Hook
 * Centralized keyboard shortcuts management
 */
export const useKeyboardShortcuts = (shortcuts = []) => {
  const handleKeyDown = useCallback((event) => {
    shortcuts.forEach(({ key, ctrlKey, metaKey, shiftKey, altKey, action, preventDefault = true }) => {
      const isCtrlKey = ctrlKey ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
      const isMetaKey = metaKey ? event.metaKey : !event.metaKey;
      const isShiftKey = shiftKey ? event.shiftKey : !event.shiftKey;
      const isAltKey = altKey ? event.altKey : !event.altKey;

      if (
        event.key.toLowerCase() === key.toLowerCase() &&
        isCtrlKey &&
        isMetaKey &&
        isShiftKey &&
        isAltKey
      ) {
        if (preventDefault) {
          event.preventDefault();
        }
        action(event);
      }
    });
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

/**
 * Global Keyboard Shortcuts
 */
export const GLOBAL_SHORTCUTS = {
  // Navigation
  DASHBOARD: { key: 'd', ctrlKey: true, description: 'Ir para Dashboard' },
  CLASSES: { key: 'c', ctrlKey: true, description: 'Ver Turmas' },
  ACTIVITIES: { key: 'a', ctrlKey: true, description: 'Ver Atividades' },
  CALENDAR: { key: 'l', ctrlKey: true, description: 'Ver Calendário' },
  
  // Actions
  NEW: { key: 'n', ctrlKey: true, description: 'Criar Novo' },
  SAVE: { key: 's', ctrlKey: true, description: 'Salvar' },
  SEARCH: { key: 'f', ctrlKey: true, description: 'Buscar' },
  
  // Command Palette
  COMMAND_PALETTE: { key: 'k', ctrlKey: true, description: 'Abrir Paleta de Comandos' },
  
  // Utilities
  HELP: { key: '?', shiftKey: true, description: 'Ajuda' },
  SETTINGS: { key: ',', ctrlKey: true, description: 'Configurações' },
};

export default useKeyboardShortcuts;
