import React, { createContext, useContext, useEffect, useMemo, useCallback, useReducer } from 'react';

/**
 * Advanced State Management System for TamanduAI
 * Provides global state management with performance optimizations
 */

// ============================================
// TYPES AND INTERFACES
// ============================================

/**
 * @typedef {Object} StateSlice
 * @property {string} name - Unique slice identifier
 * @property {*} initialState - Initial state for this slice
 * @property {Object} actions - Action creators for this slice
 * @property {Object} selectors - Selector functions for this slice
 * @property {Object} effects - Side effects for this slice
 */

/**
 * @typedef {Object} GlobalState
 * @property {Object} auth - Authentication state
 * @property {Object} ui - UI state (theme, loading, etc.)
 * @property {Object} data - Application data state
 * @property {Object} cache - Cache state
 * @property {Object} notifications - Notifications state
 */

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEYS = {
  AUTH: 'tamanduai_auth',
  UI: 'tamanduai_ui',
  CACHE: 'tamanduai_cache',
  PREFERENCES: 'tamanduai_preferences',
};

const ACTIONS = {
  // Auth actions
  AUTH_LOGIN: 'AUTH_LOGIN',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  AUTH_UPDATE_PROFILE: 'AUTH_UPDATE_PROFILE',

  // UI actions
  UI_SET_THEME: 'UI_SET_THEME',
  UI_SET_LOADING: 'UI_SET_LOADING',
  UI_SET_SIDEBAR_OPEN: 'UI_SET_SIDEBAR_OPEN',

  // Data actions
  DATA_SET_USER: 'DATA_SET_USER',
  DATA_SET_CLASSES: 'DATA_SET_CLASSES',
  DATA_UPDATE_CLASS: 'DATA_UPDATE_CLASS',

  // Cache actions
  CACHE_SET: 'CACHE_SET',
  CACHE_CLEAR: 'CACHE_CLEAR',
  CACHE_INVALIDATE: 'CACHE_INVALIDATE',

  // Notification actions
  NOTIFICATION_ADD: 'NOTIFICATION_ADD',
  NOTIFICATION_REMOVE: 'NOTIFICATION_REMOVE',
  NOTIFICATION_MARK_READ: 'NOTIFICATION_MARK_READ',
};

// ============================================
// REDUCERS
// ============================================

/**
 * Main state reducer with performance optimizations
 */
const stateReducer = (state, action) => {
  const { type, payload, slice } = action;

  // Performance optimization: only update relevant slice
  if (slice && !type.includes(slice.toUpperCase())) {
    return state;
  }

  switch (type) {
    // Auth reducer
    case ACTIONS.AUTH_LOGIN:
      return {
        ...state,
        auth: {
          ...state.auth,
          isAuthenticated: true,
          user: payload.user,
          token: payload.token,
          lastLogin: new Date().toISOString(),
        },
      };

    case ACTIONS.AUTH_LOGOUT:
      return {
        ...state,
        auth: {
          isAuthenticated: false,
          user: null,
          token: null,
          lastLogin: null,
        },
      };

    case ACTIONS.AUTH_UPDATE_PROFILE:
      return {
        ...state,
        auth: {
          ...state.auth,
          user: { ...state.auth.user, ...payload },
        },
      };

    // UI reducer
    case ACTIONS.UI_SET_THEME:
      return {
        ...state,
        ui: {
          ...state.ui,
          theme: payload.theme,
          preferences: { ...state.ui.preferences, theme: payload.theme },
        },
      };

    case ACTIONS.UI_SET_LOADING:
      return {
        ...state,
        ui: {
          ...state.ui,
          loading: {
            ...state.ui.loading,
            [payload.key]: payload.value,
          },
        },
      };

    case ACTIONS.UI_SET_SIDEBAR_OPEN:
      return {
        ...state,
        ui: {
          ...state.ui,
          sidebarOpen: payload.open,
        },
      };

    // Data reducer
    case ACTIONS.DATA_SET_USER:
      return {
        ...state,
        data: {
          ...state.data,
          user: payload.user,
        },
      };

    case ACTIONS.DATA_SET_CLASSES:
      return {
        ...state,
        data: {
          ...state.data,
          classes: payload.classes,
        },
      };

    case ACTIONS.DATA_UPDATE_CLASS:
      return {
        ...state,
        data: {
          ...state.data,
          classes: state.data.classes.map(cls =>
            cls.id === payload.id ? { ...cls, ...payload.updates } : cls
          ),
        },
      };

    // Cache reducer
    case ACTIONS.CACHE_SET:
      return {
        ...state,
        cache: {
          ...state.cache,
          [payload.key]: {
            data: payload.data,
            timestamp: Date.now(),
            ttl: payload.ttl || 300000, // 5 minutes default
          },
        },
      };

    case ACTIONS.CACHE_CLEAR:
      return {
        ...state,
        cache: {},
      };

    case ACTIONS.CACHE_INVALIDATE:
      const newCache = { ...state.cache };
      delete newCache[payload.key];
      return {
        ...state,
        cache: newCache,
      };

    // Notification reducer
    case ACTIONS.NOTIFICATION_ADD:
      return {
        ...state,
        notifications: {
          ...state.notifications,
          items: [payload.notification, ...state.notifications.items],
          unreadCount: state.notifications.unreadCount + 1,
        },
      };

    case ACTIONS.NOTIFICATION_REMOVE:
      const filteredNotifications = state.notifications.items.filter(
        n => n.id !== payload.id
      );
      return {
        ...state,
        notifications: {
          ...state.notifications,
          items: filteredNotifications,
          unreadCount: Math.max(0, state.notifications.unreadCount - 1),
        },
      };

    case ACTIONS.NOTIFICATION_MARK_READ:
      return {
        ...state,
        notifications: {
          ...state.notifications,
          items: state.notifications.items.map(n =>
            n.id === payload.id ? { ...n, read: true, readAt: new Date().toISOString() } : n
          ),
          unreadCount: Math.max(0, state.notifications.unreadCount - 1),
        },
      };

    default:
      return state;
  }
};

// ============================================
// CONTEXT PROVIDER
// ============================================

/**
 * Global State Context Provider
 */
const GlobalStateContext = createContext();

/**
 * Initial state with performance optimizations
 */
const createInitialState = () => ({
  auth: {
    isAuthenticated: false,
    user: null,
    token: null,
    lastLogin: null,
    loading: false,
  },
  ui: {
    theme: 'system',
    loading: {},
    sidebarOpen: false,
    preferences: {
      theme: 'system',
      language: 'pt-BR',
      notifications: true,
      animations: true,
    },
  },
  data: {
    user: null,
    classes: [],
    activities: [],
    submissions: [],
    loading: {},
  },
  cache: {},
  notifications: {
    items: [],
    unreadCount: 0,
    preferences: {
      push: true,
      email: true,
      inApp: true,
    },
  },
});

/**
 * Global State Provider Component
 */
export const GlobalStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(stateReducer, createInitialState());

  // Load persisted state on mount
  useEffect(() => {
    try {
      const persistedAuth = localStorage.getItem(STORAGE_KEYS.AUTH, []); // TODO: Add dependencies
      const persistedUI = localStorage.getItem(STORAGE_KEYS.UI, []); // TODO: Add dependencies

      if (persistedAuth) {
        const authData = JSON.parse(persistedAuth, []); // TODO: Add dependencies
        dispatch({ type: ACTIONS.AUTH_LOGIN, payload: authData }, []); // TODO: Add dependencies
      }

      if (persistedUI) {
        const uiData = JSON.parse(persistedUI);
        dispatch({ type: ACTIONS.UI_SET_THEME, payload: { theme: uiData.theme } });
      }
    } catch (error) {
      console.warn('Error loading persisted state:', error);
    }
  }, []);

  // Persist state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(state.auth));
      localStorage.setItem(STORAGE_KEYS.UI, JSON.stringify({
        theme: state.ui.theme,
        preferences: state.ui.preferences,
      }));
    } catch (error) {
      console.warn('Error persisting state:', error);
    }
  }, [state.auth, state.ui]);

  // Context value with memoization for performance
  const contextValue = useMemo(() => ({
    state,
    dispatch,
    // Convenience getters
    auth: state.auth,
    ui: state.ui,
    data: state.data,
    cache: state.cache,
    notifications: state.notifications,
  }), [state]);

  return (
    <GlobalStateContext.Provider value={contextValue}>
      {children}
    </GlobalStateContext.Provider>
  );
};

/**
 * Hook to use global state with performance optimizations
 */
export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
};

/**
 * Hook for dispatching actions with automatic slice targeting
 */
export const useGlobalDispatch = () => {
  const { dispatch } = useGlobalState();

  return useCallback((action) => {
    // Auto-detect slice from action type for performance
    const slice = action.type.split('_')[0].toLowerCase();
    dispatch({ ...action, slice });
  }, [dispatch]);
};

// ============================================
// ACTION CREATORS
// ============================================

/**
 * Authentication action creators
 */
export const authActions = {
  login: (user, token) => ({
    type: ACTIONS.AUTH_LOGIN,
    payload: { user, token },
  }),

  logout: () => ({
    type: ACTIONS.AUTH_LOGOUT,
  }),

  updateProfile: (updates) => ({
    type: ACTIONS.AUTH_UPDATE_PROFILE,
    payload: updates,
  }),
};

/**
 * UI action creators
 */
export const uiActions = {
  setTheme: (theme) => ({
    type: ACTIONS.UI_SET_THEME,
    payload: { theme },
  }),

  setLoading: (key, value) => ({
    type: ACTIONS.UI_SET_LOADING,
    payload: { key, value },
  }),

  setSidebarOpen: (open) => ({
    type: ACTIONS.UI_SET_SIDEBAR_OPEN,
    payload: { open },
  }),
};

/**
 * Data action creators
 */
export const dataActions = {
  setUser: (user) => ({
    type: ACTIONS.DATA_SET_USER,
    payload: { user },
  }),

  setClasses: (classes) => ({
    type: ACTIONS.DATA_SET_CLASSES,
    payload: { classes },
  }),

  updateClass: (id, updates) => ({
    type: ACTIONS.DATA_UPDATE_CLASS,
    payload: { id, updates },
  }),
};

/**
 * Cache action creators
 */
export const cacheActions = {
  set: (key, data, ttl) => ({
    type: ACTIONS.CACHE_SET,
    payload: { key, data, ttl },
  }),

  clear: () => ({
    type: ACTIONS.CACHE_CLEAR,
  }),

  invalidate: (key) => ({
    type: ACTIONS.CACHE_INVALIDATE,
    payload: { key },
  }),
};

/**
 * Notification action creators
 */
export const notificationActions = {
  add: (notification) => ({
    type: ACTIONS.NOTIFICATION_ADD,
    payload: { notification },
  }),

  remove: (id) => ({
    type: ACTIONS.NOTIFICATION_REMOVE,
    payload: { id },
  }),

  markAsRead: (id) => ({
    type: ACTIONS.NOTIFICATION_MARK_READ,
    payload: { id },
  }),
};

// ============================================
// SELECTORS
// ============================================

/**
 * Memoized selectors for better performance
 */
export const selectors = {
  // Auth selectors
  isAuthenticated: (state) => state.auth.isAuthenticated,
  currentUser: (state) => state.auth.user,
  userRole: (state) => state.auth.user?.role,
  hasPermission: (state, permission) => {
    const userRole = state.auth.user?.role;
    // Implement permission checking logic here
    return userRole === 'admin' || userRole === 'teacher';
  },

  // UI selectors
  currentTheme: (state) => state.ui.theme,
  isLoading: (state, key) => state.ui.loading[key] || false,
  sidebarOpen: (state) => state.ui.sidebarOpen,

  // Data selectors
  userClasses: (state) => state.data.classes,
  classById: (state, id) => state.data.classes.find(cls => cls.id === id),

  // Cache selectors
  getCached: (state, key) => {
    const cached = state.cache[key];
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      return null;
    }

    return cached.data;
  },

  // Notification selectors
  unreadNotifications: (state) => state.notifications.items.filter(n => !n.read),
  unreadCount: (state) => state.notifications.unreadCount,
  recentNotifications: (state, limit = 5) =>
    state.notifications.items.slice(0, limit),
};

// ============================================
// EFFECTS
// ============================================

/**
 * Side effects for state changes
 */
export const effects = {
  // Auth effects
  onLogin: (user, token) => {
    // Track login event
    if (window.analytics) {
      window.analytics.track('User Login', {
        userId: user.id,
        email: user.email,
        role: user.role,
      });
    }

    // Load user preferences
    // Implementation here
  },

  onLogout: () => {
    // Clear sensitive data
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    localStorage.removeItem(STORAGE_KEYS.UI);

    // Track logout event
    if (window.analytics) {
      window.analytics.track('User Logout');
    }
  },

  // Notification effects
  onNotificationReceived: (notification) => {
    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.svg',
      });
    }

    // Play notification sound if enabled
    if (notification.priority === 'urgent') {
      // Play urgent sound
    }
  },
};

export default GlobalStateProvider;
