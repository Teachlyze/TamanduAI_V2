import { useState, useEffect } from 'react';

/**
 * Hook para gerenciar layout responsivo
 * Movido para arquivo separado para evitar problemas de fast refresh
 */
export const useResponsiveLayout = () => {
  const [layout, setLayout] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    sidebarCollapsed: false,
  });

  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;

      setLayout({
        isMobile: width < 768, // md breakpoint
        isTablet: width >= 768 && width < 1024, // md to lg
        isDesktop: width >= 1024, // lg breakpoint
        sidebarCollapsed: width < 1024,
      }, []); // TODO: Add dependencies
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);

    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  return layout;
};

export default useResponsiveLayout;
