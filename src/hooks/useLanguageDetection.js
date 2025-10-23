import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
// changeLanguage is not used directly in this file, using i18n.changeLanguage instead
import { Logger } from '../services/logger';

// Supported languages with their metadata
const SUPPORTED_LANGUAGES = [
  { code: 'pt', name: 'Português (BR)', flag: '🇧🇷', nativeName: 'Português' },
  { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
  { code: 'es', name: 'Español', flag: '🇪🇸', nativeName: 'Español' },
];
const DEFAULT_LANGUAGE = 'pt';

// Language detection priorities
const getLanguageFromBrowser = () => {
  // Get browser language
  const browserLang = navigator.language || navigator.userLanguage;

  // Extract language code (e.g., 'pt-BR' -> 'pt', 'en-US' -> 'en')
  const langCode = browserLang.split('-')[0];

  // Check if the language is supported
  if (SUPPORTED_LANGUAGES.some(lang => lang.code === langCode)) {
    return langCode;
  }

  // Fallback to default language
  return DEFAULT_LANGUAGE;
};

// Detect user's preferred language
const getPreferredLanguage = () => {
  try {
    // Check localStorage first (user preference)
    const savedLang = localStorage.getItem('tamanduai-language');
    if (savedLang && SUPPORTED_LANGUAGES.some(lang => lang.code === savedLang)) {
      Logger.info('[Language] Using saved language:', savedLang);
      return savedLang;
    }

    // Check browser language
    const browserLang = getLanguageFromBrowser();
    Logger.info('[Language] Using browser language:', browserLang);
    return browserLang;
  } catch (error) {
    Logger.error('[Language] Error detecting preferred language:', error);
    return DEFAULT_LANGUAGE;
  }
};

export const useLanguageDetection = () => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    // Initialize with the language from localStorage or i18n
    const savedLang = localStorage.getItem('tamanduai-language');
    return savedLang || i18n.language || DEFAULT_LANGUAGE;
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const initializationRef = useRef(false);

  // Function to change the language
  const changeAppLanguage = useCallback(async (languageCode) => {
    try {
      if (!SUPPORTED_LANGUAGES.some(lang => lang.code === languageCode)) {
        throw new Error(`Language ${languageCode} is not supported`);
      }
      
      await i18n.changeLanguage(languageCode);
      localStorage.setItem('tamanduai-language', languageCode);
      setCurrentLanguage(languageCode);
      document.documentElement.lang = languageCode;
      
      Logger.info('Language changed to:', languageCode);
      return languageCode;
    } catch (error) {
      Logger.error('Error changing language:', error);
      throw error;
    }
  }, [i18n]);

  // Initialize language on mount
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    const initializeLanguage = async () => {
      try {
        const preferredLang = getPreferredLanguage();
        
        // Only change language if it's different from current
        if (currentLanguage !== preferredLang) {
          await changeAppLanguage(preferredLang);
        }
      } catch (error) {
        Logger.error('Error initializing language:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeLanguage();
  }, [currentLanguage, changeAppLanguage]);

  // Listen for language changes from i18n
  useEffect(() => {
    const handleLanguageChanged = (lng) => {
      setCurrentLanguage(lng);
    };

    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);

  const getCurrentLanguage = () => {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === currentLanguage) || SUPPORTED_LANGUAGES[0];
  };

  const getLanguageByCode = (code) => {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === code) || SUPPORTED_LANGUAGES[0];
  };

  return {
    currentLanguage: getCurrentLanguage(),
    currentLanguageCode: currentLanguage || DEFAULT_LANGUAGE,
    setLanguage: changeAppLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
    isInitialized,
    getLanguageByCode,
  };
};
