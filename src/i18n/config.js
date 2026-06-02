// src/i18n/config.js
// Date: 2026-06-02
// i18next configuration with browser language detection and auto-fallback

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';

const SUPPORTED_LANGUAGES = ['en', 'es'];
const FALLBACK_LANGUAGE = 'en';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, es: { translation: es } },
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    ns: ['translation'],
    defaultNS: 'translation',
  });

export { i18n, SUPPORTED_LANGUAGES };
export default i18n;
