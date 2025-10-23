// src/hooks/useKeyboardNavigation.js
import { useEffect, useCallback } from 'react';

const useKeyboardNavigation = () => {
  const handleKeyDown = useCallback((event) => {
    // Alt + numbers for quick navigation
    if (event.altKey && !event.ctrlKey && !event.shiftKey) {
      const key = event.key;

      switch (key) {
        case '1':
          // Go to dashboard/home
          event.preventDefault();
          window.location.href = '/dashboard';
          break;
        case '2':
          // Go to profile
          event.preventDefault();
          window.location.href = '/profile';
          break;
        case '3':
          // Go to settings
          event.preventDefault();
          window.location.href = '/settings';
          break;
        case '4':
          // Go to help/documentation
          event.preventDefault();
          window.location.href = '/docs';
          break;
        case 'h':
        case 'H':
          // Show keyboard shortcuts help
          event.preventDefault();
          showKeyboardShortcuts();
          break;
        case 'm':
        case 'M':
          // Toggle main menu/sidebar
          event.preventDefault();
          toggleMainMenu();
          break;
        case 's':
        case 'S':
          // Focus search
          event.preventDefault();
          focusSearch();
          break;
        case 'Escape':
          // Close modals/dropdowns
          event.preventDefault();
          closeModals();
          break;
        default:
          break;
      }
    }

    // Ctrl + K for search (global shortcut)
    if (event.ctrlKey && event.key === 'k') {
      event.preventDefault();
      focusSearch();
    }

    // Arrow keys for navigation in lists/menus (guard against undefined key)
    if (typeof event.key === 'string' && event.key.startsWith('Arrow')) {
      handleArrowNavigation(event);
    }

    // Enter and Space for buttons
    if ((event.key === 'Enter' || event.key === ' ') && event.target.tagName === 'BUTTON') {
      event.preventDefault();
      event.target.click();
    }
  }, []);

  const showKeyboardShortcuts = () => {
    // Create and show keyboard shortcuts modal
    const existingModal = document.getElementById('keyboard-shortcuts-modal');
    if (existingModal) {
      existingModal.remove();
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'keyboard-shortcuts-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">Atalhos de Teclado</h2>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Alt + 1</span>
            <span class="text-gray-900 dark:text-white">Ir para Dashboard</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Alt + 2</span>
            <span class="text-gray-900 dark:text-white">Ir para Perfil</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Alt + 3</span>
            <span class="text-gray-900 dark:text-white">Ir para Configurações</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Alt + 4</span>
            <span class="text-gray-900 dark:text-white">Ir para Ajuda</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Alt + H</span>
            <span class="text-gray-900 dark:text-white">Mostrar Atalhos</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Alt + M</span>
            <span class="text-gray-900 dark:text-white">Alternar Menu</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Alt + S</span>
            <span class="text-gray-900 dark:text-white">Focar Busca</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Ctrl + K</span>
            <span class="text-gray-900 dark:text-white">Busca Global</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Esc</span>
            <span class="text-gray-900 dark:text-white">Fechar Modais</span>
          </div>
        </div>
        <div class="mt-6 text-center">
          <button
            onclick="this.closest('#keyboard-shortcuts-modal').remove()"
            class="bg-blue-600 hover:bg-blue-700 text-slate-900 dark:text-white px-4 py-2 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Focus the close button for accessibility
    const closeButton = modal.querySelector('button');
    closeButton.focus();

    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  };

  const toggleMainMenu = () => {
    // Find and toggle sidebar/menu
    const sidebar = document.querySelector('[data-sidebar-toggle]');
    const menuButton = document.querySelector('[data-menu-button]');

    if (sidebar) {
      sidebar.classList.toggle('hidden');
    } else if (menuButton) {
      menuButton.click();
    }
  };

  const focusSearch = () => {
    // Find and focus search input
    const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="busca"], input[placeholder*="search"]');
    const searchInput = searchInputs[0] || document.querySelector('input[type="text"]');

    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  };

  const closeModals = () => {
    // Close any open modals or dropdowns
    const modals = document.querySelectorAll('[role="dialog"], .modal, [data-modal]');
    modals.forEach(modal => {
      const closeButton = modal.querySelector('[data-modal-close], [aria-label*="fechar"], button[title*="fechar"]');
      if (closeButton) {
        closeButton.click();
      } else {
        modal.style.display = 'none';
      }
    });

    // Close dropdowns
    const dropdowns = document.querySelectorAll('[data-dropdown].open, .dropdown.open');
    dropdowns.forEach(dropdown => {
      dropdown.classList.remove('open');
    });
  };

  const handleArrowNavigation = (event) => {
    const { key, target } = event;
    const parent = target.closest('[role="listbox"], [role="menu"], .list-navigation');

    if (!parent) return;

    const items = Array.from(parent.querySelectorAll('[role="option"], [role="menuitem"], li, .nav-item'));
    const currentIndex = items.indexOf(target);

    if (currentIndex === -1) return;

    let nextIndex;

    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        nextIndex = (currentIndex + 1) % items.length;
        break;
      case 'ArrowUp':
        event.preventDefault();
        nextIndex = (currentIndex - 1 + items.length) % items.length;
        break;
      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        nextIndex = items.length - 1;
        break;
      default:
        return;
    }

    items[nextIndex]?.focus();
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    showKeyboardShortcuts,
    focusSearch,
    closeModals
  };
};

export default useKeyboardNavigation;
