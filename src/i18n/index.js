/*
 * Copyright © 2025-2026 Cameron Fox
 * Licensed under the Apache License, Version 2.0
 * File: src/i18n/index.js
 * Last updated: 2026-05-09
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ko', 'pt', 'ar', 'hi', 'ru', 'it'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
    },
    supportedLngs: SUPPORTED_LANGUAGES,
    fallbackLng: 'en',
    defaultNS: 'translation',

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'nexus_language',
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: true,
    },
  });

export { SUPPORTED_LANGUAGES };
export default i18n;
