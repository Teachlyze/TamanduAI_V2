import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Premium Breadcrumb Component
 * Navegação hierárquica elegante
 */
export const Breadcrumb = ({ items = [], className = '' }) => {
  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center"
      >
        <Link
          to="/dashboard"
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="w-4 h-4" />
        </Link>
      </motion.div>

      {items.map((item, index) => (
        <React.Fragment key={item.path || index}>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            {index === items.length - 1 ? (
              <span className="text-foreground font-medium">{item.label}</span>
            ) : (
              <Link
                to={item.path}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            )}
          </motion.div>
        </React.Fragment>
      ))}
    </nav>
  );
};

/**
 * Hook para gerar breadcrumbs automaticamente baseado na rota
 */
export const useBreadcrumbs = (customItems = []) => {
  const location = window.location;
  const pathname = location.pathname;
  
  if (customItems.length > 0) {
    return customItems;
  }

  // Gerar breadcrumbs automaticamente da rota
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbs = [];

  let currentPath = '';
  pathSegments.forEach((segment, index) => {
    if (segment === 'dashboard') return; // Pular dashboard pois já temos o Home
    
    currentPath += `/${segment}`;
    
    // Traduzir segmentos comuns
    const labels = {
      classes: 'Turmas',
      activities: 'Atividades',
      students: 'Alunos',
      reports: 'Relatórios',
      chatbot: 'Chatbot',
      profile: 'Perfil',
      settings: 'Configurações',
      calendar: 'Agenda',
      drafts: 'Rascunhos',
      meetings: 'Reuniões'
    };

    breadcrumbs.push({
      label: labels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
      path: `/dashboard${currentPath}`
    });
  });

  return breadcrumbs;
};

export default Breadcrumb;
