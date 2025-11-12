import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { X, Cookie, Settings } from 'lucide-react';
import { Switch } from '@/shared/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Cookie Banner Component
 * LGPD/GDPR compliant cookie consent banner
 * Com opções de personalização detalhadas
 */
export default function CookieBanner() {
  const [show, setShow] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,        // Sempre true (não pode desabilitar)
    analytics: false,
    marketing: false,
    personalization: false
  });

  useEffect(() => {
    // Check if user has already accepted cookies
    const accepted = localStorage.getItem('cookies-accepted');
    if (!accepted) {
      // Show banner after 1 second delay
      setTimeout(() => setShow(true), 1000);
    } else {
      // Load saved preferences
      const savedPrefs = localStorage.getItem('cookie-preferences');
      if (savedPrefs) {
        setPreferences(JSON.parse(savedPrefs));
      }
    }
  }, []);

  const acceptAll = () => {
    const allAccepted = {
      essential: true,
      analytics: true,
      marketing: true,
      personalization: true
    };
    savePreferences(allAccepted);
  };

  const acceptEssential = () => {
    const essentialOnly = {
      essential: true,
      analytics: false,
      marketing: false,
      personalization: false
    };
    savePreferences(essentialOnly);
  };

  const savePreferences = (prefs) => {
    localStorage.setItem('cookies-accepted', 'true');
    localStorage.setItem('cookies-accepted-date', new Date().toISOString());
    localStorage.setItem('cookie-preferences', JSON.stringify(prefs));
    
    // Aplicar preferências
    if (!prefs.analytics && window.va) {
      window.va('disable');
    }
    
    setShow(false);
    setShowPreferences(false);
  };

  const handleSaveCustom = () => {
    savePreferences(preferences);
  };

  return (
    <>
      <AnimatePresence>
        {show && !showPreferences && (
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
                      Usamos cookies para melhorar sua experiência. Conforme <strong>LGPD Art. 8º</strong>, 
                      você pode personalizar suas preferências. Leia nossa{' '}
                      <Link to="/privacy" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 underline font-medium">
                        Política de Privacidade
                      </Link>.
                    </p>

                    {/* Buttons */}
                    <div className="flex flex-wrap gap-3">
                      <Button 
                        onClick={acceptAll}
                        variant="gradient"
                        size="sm"
                        className="shadow-lg hover:shadow-xl"
                      >
                        Aceitar Todos
                      </Button>
                      <Button 
                        onClick={acceptEssential}
                        variant="outline"
                        size="sm"
                      >
                        Apenas Essenciais
                      </Button>
                      <Button 
                        onClick={() => setShowPreferences(true)}
                        variant="ghost"
                        size="sm"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Personalizar
                      </Button>
                    </div>
                  </div>

                  {/* Close button */}
                  <button
                    onClick={acceptEssential}
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

        {/* Modal de Preferências */}
        {show && showPreferences && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowPreferences(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-6 z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Preferências de Cookies
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Personalize como usamos seus dados (LGPD compliant)
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPreferences(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Essenciais */}
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Cookie className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Cookies Essenciais
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Necessários para o funcionamento básico da plataforma. 
                        Incluem autenticação, sessão e segurança.
                      </p>
                      <p className="text-xs text-gray-500">
                        Não podem ser desabilitados (LGPD Art. 7º, II)
                      </p>
                    </div>
                    <Switch checked={true} disabled className="ml-4" />
                  </div>
                </div>

                {/* Analytics */}
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-5 h-5 text-cyan-600" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Analytics
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Vercel Analytics para medir performance e melhorar a experiência.
                        Dados anônimos, sem identificação pessoal.
                      </p>
                      <p className="text-xs text-gray-500">
                        LGPD Art. 7º, IX - Legítimo interesse
                      </p>
                    </div>
                    <Switch 
                      checked={preferences.analytics}
                      onCheckedChange={(v) => setPreferences(p => ({ ...p, analytics: v }))}
                      className="ml-4"
                    />
                  </div>
                </div>

                {/* Marketing */}
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Cookie className="w-5 h-5 text-purple-600" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Marketing
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        E-mails promocionais, newsletters e comunicação sobre novidades
                        da plataforma TamanduAI.
                      </p>
                      <p className="text-xs text-gray-500">
                        LGPD Art. 7º, I - Consentimento
                      </p>
                    </div>
                    <Switch 
                      checked={preferences.marketing}
                      onCheckedChange={(v) => setPreferences(p => ({ ...p, marketing: v }))}
                      className="ml-4"
                    />
                  </div>
                </div>

                {/* Personalização */}
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-5 h-5 text-green-600" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Personalização
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Recomendações personalizadas baseadas no seu uso da plataforma,
                        melhorando sua experiência educacional.
                      </p>
                      <p className="text-xs text-gray-500">
                        LGPD Art. 7º, I - Consentimento
                      </p>
                    </div>
                    <Switch 
                      checked={preferences.personalization}
                      onCheckedChange={(v) => setPreferences(p => ({ ...p, personalization: v }))}
                      className="ml-4"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-6">
                <div className="flex gap-3 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPreferences(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="gradient"
                    onClick={handleSaveCustom}
                  >
                    Salvar Preferências
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Você pode alterar suas preferências a qualquer momento em Configurações
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
