import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { X, Cookie } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Cookie Banner Component
 * LGPD/GDPR compliant cookie consent banner
 */
export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const accepted = localStorage.getItem('cookies-accepted');
    if (!accepted) {
      // Show banner after 1 second delay
      setTimeout(() => setShow(true), 1000);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookies-accepted', 'true');
    localStorage.setItem('cookies-accepted-date', new Date().toISOString());
    setShow(false);
  };

  const declineCookies = () => {
    localStorage.setItem('cookies-accepted', 'essential-only');
    localStorage.setItem('cookies-accepted-date', new Date().toISOString());
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
        >
          <div className="max-w-7xl mx-auto">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Cookie className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    🍪 Cookies e Privacidade
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Usamos cookies para melhorar sua experiência, personalizar conteúdo e analisar nosso tráfego. 
                    Ao continuar navegando, você concorda com nossa{' '}
                    <Link to="/privacy" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium">
                      Política de Privacidade
                    </Link>
                    {' '}e{' '}
                    <Link to="/terms" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium">
                      Termos de Uso
                    </Link>
                    .
                  </p>

                  {/* Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <Button 
                      onClick={acceptCookies}
                      variant="gradient"
                      size="sm"
                      className="shadow-lg hover:shadow-xl"
                    >
                      Aceitar Todos
                    </Button>
                    <Button 
                      onClick={declineCookies}
                      variant="outline"
                      size="sm"
                    >
                      Apenas Essenciais
                    </Button>
                    <Link to="/privacy">
                      <Button 
                        variant="ghost"
                        size="sm"
                      >
                        Saber Mais
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={declineCookies}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
