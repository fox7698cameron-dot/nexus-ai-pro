// nexus-ai-pro/src/i18n/index.js | 2026-04-17
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// i18next setup with browser language detection and HTTP backend

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

export const SUPPORTED_LOCALES = [
  { code: 'en',    label: 'English',    dir: 'ltr', region: 'US' },
  { code: 'es',    label: 'Español',    dir: 'ltr', region: 'ES' },
  { code: 'fr',    label: 'Français',   dir: 'ltr', region: 'FR' },
  { code: 'de',    label: 'Deutsch',    dir: 'ltr', region: 'DE' },
  { code: 'pt',    label: 'Português',  dir: 'ltr', region: 'BR' },
  { code: 'zh',    label: '中文',        dir: 'ltr', region: 'CN' },
  { code: 'ja',    label: '日本語',      dir: 'ltr', region: 'JP' },
  { code: 'ko',    label: '한국어',      dir: 'ltr', region: 'KR' },
  { code: 'ar',    label: 'العربية',     dir: 'rtl', region: 'SA' },
  { code: 'hi',    label: 'हिन्दी',     dir: 'ltr', region: 'IN' },
  { code: 'ru',    label: 'Русский',    dir: 'ltr', region: 'RU' },
  { code: 'tr',    label: 'Türkçe',     dir: 'ltr', region: 'TR' },
  { code: 'pl',    label: 'Polski',     dir: 'ltr', region: 'PL' },
  { code: 'it',    label: 'Italiano',   dir: 'ltr', region: 'IT' },
  { code: 'nl',    label: 'Nederlands', dir: 'ltr', region: 'NL' },
];

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LOCALES.map(l => l.code),
    ns: ['common', 'auth', 'dashboard', 'analytics', 'security', 'projects', 'checkout'],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,  // React handles XSS escaping
    },
    react: {
      useSuspense: true,
    },
  });

export default i18n;

// Apply RTL direction to document when locale changes
i18n.on('languageChanged', (lng) => {
  const locale = SUPPORTED_LOCALES.find(l => l.code === lng);
  if (locale) {
    document.documentElement.dir = locale.dir;
    document.documentElement.lang = lng;
  }
});
