/**
 * 🎨 DESIGN TOKENS - TamanduAI
 * Sistema centralizado de design que serve toda a aplicação
 */

// ============================================
// GRADIENTES
// ============================================
export const gradients = {
  // Gradientes por Role
  teacher: 'from-blue-600 via-purple-600 to-pink-600',
  school: 'from-slate-700 via-slate-800 to-slate-900',
  student: 'from-blue-600 via-purple-600 to-pink-600',
  
  // Gradientes de Features
  primary: 'from-blue-600 to-purple-600',
  secondary: 'from-purple-600 to-pink-600',
  success: 'from-emerald-600 to-teal-600',
  warning: 'from-amber-600 to-orange-600',
  danger: 'from-red-600 to-rose-600',
  info: 'from-cyan-600 to-blue-600',
  
  // Gradientes de Stats Cards
  stats: {
    classes: 'from-blue-500 to-indigo-500',
    students: 'from-purple-500 to-pink-500',
    activities: 'from-emerald-500 to-teal-500',
    pending: 'from-amber-500 to-orange-500',
    completed: 'from-green-500 to-emerald-500',
    grade: 'from-yellow-500 to-amber-500'
  }
};

// ============================================
// CORES
// ============================================
export const colors = {
  // Background
  bg: {
    light: 'bg-white',
    dark: 'bg-slate-900',
    muted: 'bg-slate-50 dark:bg-slate-950'
  },
  
  // Text
  text: {
    primary: 'text-slate-900 dark:text-white',
    secondary: 'text-slate-600 dark:text-slate-400',
    muted: 'text-slate-500 dark:text-slate-500',
    disabled: 'text-slate-400 dark:text-slate-600'
  },
  
  // Border
  border: {
    default: 'border-slate-200 dark:border-slate-700',
    muted: 'border-slate-100 dark:border-slate-800',
    hover: 'hover:border-slate-300 dark:hover:border-slate-600'
  }
};

// ============================================
// PADRÕES
// ============================================
export const patterns = {
  // Grid Pattern (para backgrounds)
  grid: 'bg-grid-slate-900/[0.04] dark:bg-grid-slate-400/[0.05] bg-[size:20px_20px]',
  
  // Dot Pattern
  dots: 'bg-grid-white/[0.05] bg-[size:20px_20px]'
};

// ============================================
// SOMBRAS
// ============================================
export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  inner: 'shadow-inner',
  none: 'shadow-none'
};

// ============================================
// ANIMAÇÕES
// ============================================
export const animations = {
  // Delays para Framer Motion
  stagger: {
    container: {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: 0.05
        }
      }
    },
    item: {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0 }
    }
  },
  
  // Delays específicos
  delay: (index) => index * 0.1,
  fastDelay: (index) => index * 0.05,
  slowDelay: (index) => index * 0.2
};

// ============================================
// COMPONENTES COMUNS
// ============================================
export const components = {
  // Card Styles
  card: {
    base: 'bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700',
    hover: 'hover:shadow-lg transition-all',
    interactive: 'cursor-pointer hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all'
  },
  
  // Button Styles
  button: {
    base: 'whitespace-nowrap inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all',
    gradient: 'bg-gradient-to-r text-white hover:opacity-90',
    outline: 'border-2 hover:bg-slate-50 dark:hover:bg-slate-800'
  },
  
  // Input Styles
  input: {
    base: 'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all',
    error: 'border-red-500 focus:ring-red-500'
  },
  
  // Badge Styles
  badge: {
    base: 'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
    variants: {
      default: 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white',
      primary: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
      danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    }
  }
};

// ============================================
// LAYOUT
// ============================================
export const layout = {
  // Container
  container: 'container mx-auto px-4 sm:px-6 lg:px-8',
  
  // Grid
  grid: {
    cols1: 'grid grid-cols-1 gap-6',
    cols2: 'grid grid-cols-1 md:grid-cols-2 gap-6',
    cols3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
    cols4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'
  },
  
  // Spacing
  spacing: {
    section: 'py-20 px-4 sm:px-6 lg:px-8',
    page: 'min-h-screen p-6',
    card: 'p-6'
  }
};

// ============================================
// TIPOGRAFIA
// ============================================
export const typography = {
  // Headings
  h1: 'text-4xl font-bold',
  h2: 'text-3xl font-bold',
  h3: 'text-2xl font-bold',
  h4: 'text-xl font-bold',
  h5: 'text-lg font-semibold',
  h6: 'text-base font-semibold',
  
  // Body
  body: 'text-base',
  bodyLarge: 'text-lg',
  bodySmall: 'text-sm',
  caption: 'text-xs',
  
  // Special
  gradient: 'bg-gradient-to-r bg-clip-text text-transparent'
};

// ============================================
// RESPONSIVE
// ============================================
export const responsive = {
  // Show/Hide
  mobile: 'block md:hidden',
  desktop: 'hidden md:block',
  
  // Flex Direction
  stack: 'flex flex-col md:flex-row gap-4',
  stackReverse: 'flex flex-col-reverse md:flex-row gap-4'
};

// ============================================
// EMPTY STATES
// ============================================
export const emptyStates = {
  value: '-',
  text: 'Nenhum dado disponível',
  icon: '📭'
};

// ============================================
// HELPERS
// ============================================

/**
 * Combina classes CSS
 */
export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Retorna valor ou empty state
 */
export const valueOrEmpty = (value, emptyValue = '-') => {
  if (value === null || value === undefined || value === '') {
    return emptyValue;
  }
  return value;
};

/**
 * Formata número ou retorna empty
 */
export const formatNumber = (num, emptyValue = '-') => {
  if (num === null || num === undefined || isNaN(num)) {
    return emptyValue;
  }
  return num.toLocaleString('pt-BR');
};

/**
 * Retorna gradiente baseado no role
 */
export const getRoleGradient = (role) => {
  return gradients[role] || gradients.primary;
};

/**
 * Retorna badge variant baseado em status
 */
export const getStatusBadge = (status) => {
  const statusMap = {
    active: 'success',
    pending: 'warning',
    inactive: 'default',
    error: 'danger',
    completed: 'success'
  };
  
  return components.badge.variants[statusMap[status]] || components.badge.variants.default;
};
