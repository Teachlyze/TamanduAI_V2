/**
 * Utilitário para navegação baseada em roles
 */

/**
 * Retorna a rota home baseada no role do usuário
 * @param {string} role - Role do usuário (student, teacher, school)
 * @returns {string} - Rota home correspondente
 */
export const getHomeRoute = (role) => {
  switch (role) {
    case 'student':
      return '/students';
    case 'teacher':
      return '/dashboard';
    case 'school':
      return '/school';
    default:
      return '/';
  }
};

/**
 * Navega para a home do usuário baseado no role
 * @param {Function} navigate - Função de navegação do React Router
 * @param {string} role - Role do usuário
 */
export const navigateToHome = (navigate, role) => {
  const homeRoute = getHomeRoute(role);
  navigate(homeRoute);
};

/**
 * Retorna rotas específicas baseadas no role
 * @param {string} role - Role do usuário
 * @returns {Object} - Objeto com rotas específicas do role
 */
export const getRoleRoutes = (role) => {
  const baseRoutes = {
    home: getHomeRoute(role),
    profile: '/profile',
    settings: '/settings',
    notifications: '/notifications'
  };

  switch (role) {
    case 'student':
      return {
        ...baseRoutes,
        activities: '/students/activities',
        gamification: '/students/gamification',
        performance: '/students/performance',
        calendar: '/students/calendar',
        ranking: '/students/ranking'
      };
    case 'teacher':
      return {
        ...baseRoutes,
        classes: '/dashboard/classes',
        activities: '/dashboard/activities',
        students: '/dashboard/students',
        reports: '/dashboard/reports',
        calendar: '/dashboard/calendar',
        chatbot: '/dashboard/chatbot'
      };
    case 'school':
      return {
        ...baseRoutes,
        teachers: '/school/teachers',
        classes: '/school/classes',
        students: '/school/students',
        reports: '/school/reports',
        ranking: '/school/ranking',
        communications: '/school/comms'
      };
    default:
      return baseRoutes;
  }
};
