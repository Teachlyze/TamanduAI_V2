import { logger } from '@/shared/utils/logger';
// src/components/ui/LanguageSelector.jsx
import React, { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check } from 'lucide-react';
import Button from './button';

/**
 * Seletor de idioma aprimorado com interface visual
 */
const LanguageSelector = ({
  variant = 'dropdown',
  showFlags = true,
  showNativeNames = false,
  className = '',
  size = 'md',
}) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Idiomas suportados
  const languages = [
    {
      code: 'pt',
      name: 'Português',
      nativeName: 'Português',
      flag: '🇧🇷',
      region: 'Brasil',
    },
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇺🇸',
      region: 'United States',
    },
    {
      code: 'es',
      name: 'Español',
      nativeName: 'Español',
      flag: '🇪🇸',
      region: 'España',
    },
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = async (languageCode) => {
    try {
      await i18n.changeLanguage(languageCode);
      setIsOpen(false);

      // Anunciar mudança para screen readers
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(
          `Idioma alterado para ${languages.find(l => l.code === languageCode)?.name}`
        );
        utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      logger.error('Erro ao alterar idioma:', error)
    }
  };

  if (variant === 'dropdown') {
    return (
      <div className={`dropdown dropdown-end ${className}`}>
        <Button
          variant="ghost"
          size={size}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
          aria-label={`Idioma atual: ${currentLanguage.name}`}
        >
          {showFlags && <span className="text-lg">{currentLanguage.flag}</span>}
          <span className="hidden sm:inline">{currentLanguage.name}</span>
          <Globe className="h-4 w-4" />
        </Button>

        <AnimatePresence>
          {isOpen && (
            <motion.ul
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              tabIndex={0}
              className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-48 mt-2"
            >
              {languages.map((language) => (
                <li key={language.code}>
                  <button
                    onClick={() => handleLanguageChange(language.code)}
                    className={`flex items-center gap-3 w-full text-left p-2 rounded-lg transition-colors ${
                      i18n.language === language.code
                        ? 'bg-primary text-primary-content'
                        : 'hover:bg-base-200'
                    }`}
                  >
                    {showFlags && <span className="text-lg">{language.flag}</span>}
                    <div className="flex-1">
                      <div className="font-medium">
                        {showNativeNames ? language.nativeName : language.name}
                      </div>
                      <div className="text-xs opacity-70">{language.region}</div>
                    </div>
                    {i18n.language === language.code && (
                      <Check className="h-4 w-4 text-primary-content" />
                    )}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (variant === 'buttons') {
    return (
      <div className={`flex gap-1 ${className}`}>
        {languages.map((language) => (
          <Button
            key={language.code}
            variant={i18n.language === language.code ? 'primary' : 'outline'}
            size={size}
            onClick={() => handleLanguageChange(language.code)}
            className="flex items-center gap-2 min-w-0"
          >
            {showFlags && <span className="text-sm">{language.flag}</span>}
            <span className="hidden sm:inline">{language.name}</span>
          </Button>
        ))}
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={`flex gap-1 ${className}`}>
        {languages.map((language) => (
          <button
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
              i18n.language === language.code
                ? 'bg-primary text-primary-content'
                : 'hover:bg-base-200 text-base-content'
            }`}
            title={language.name}
          >
            {language.flag}
          </button>
        ))}
      </div>
    );
  }

  return null;
};

/**
 * Indicador do idioma atual
 */
export const LanguageIndicator = ({ showDetails = false, className = '' }) => {
  const { i18n } = useTranslation();

  const languages = {
    pt: { name: 'Português', flag: '🇧🇷' },
    en: { name: 'English', flag: '🇺🇸' },
    es: { name: 'Español', flag: '🇪🇸' },
  };

  const currentLang = languages[i18n.language] || languages.pt;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-lg">{currentLang.flag}</span>
      {showDetails && (
        <div className="text-left">
          <div className="text-sm font-medium">{currentLang.name}</div>
          <div className="text-xs text-base-content/60">{i18n.language.toUpperCase()}</div>
        </div>
      )}
    </div>
  );
};

/**
 * Hook para gerenciar idioma e persistência
 */
export const useLanguage = () => {
  const { i18n } = useTranslation();

  const changeLanguage = async (languageCode) => {
    try {
      await i18n.changeLanguage(languageCode);
      return true;
    } catch (error) {
      logger.error('Erro ao alterar idioma:', error)
      return false;
    }
  };

  const getCurrentLanguage = () => {
    return i18n.language;
  };

  const getAvailableLanguages = () => {
    return [
      { code: 'pt', name: 'Português', flag: '🇧🇷' },
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Español', flag: '🇪🇸' },
    ];
  };

  return {
    currentLanguage: getCurrentLanguage(),
    availableLanguages: getAvailableLanguages(),
    changeLanguage,
    isRTL: false, // Para idiomas RTL no futuro
  };
};

/**
 * Componente de informações de localização
 */
export const LocaleInfo = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const { currentLanguage } = useLanguage();

  return (
    <div className={`text-center ${className}`}>
      <div className="text-sm text-base-content/70">
        Idioma atual: {i18n.language.toUpperCase()}
      </div>
      <div className="text-xs text-base-content/50 mt-1">
        {new Date().toLocaleDateString(currentLanguage)} • {new Date().toLocaleTimeString(currentLanguage)}
      </div>
    </div>
  );
};

/**
 * Provider de contexto de idioma para componentes filhos
 */
export const LanguageProvider = ({ children }) => {
  const languageContext = useLanguage();

  return (
    <LanguageContext.Provider value={languageContext}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * Hook para usar contexto de idioma
 */
export const useLanguageContext = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguageContext must be used within LanguageProvider');
  }
  return context;
};

export default LanguageSelector;
