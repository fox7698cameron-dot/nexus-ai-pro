// src/i18n/index.js | Nexus AI Pro | © 2025-2026 Cameron Fox | 2026-06-10

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import zh from './locales/zh.json';

// Extended locales — loaded lazily; fall back to English if not yet available
let pt = {}; let ja = {}; let ko = {}; let ar = {}; let hi = {};
let ru = {}; let it = {}; let nl = {}; let tr = {}; let pl = {}; let sv = {};

const loadLocales = async () => {
  const load = async (code) => {
    try { return (await import(`./locales/${code}.json`)).default; } catch { return {}; }
  };
  [pt, ja, ko, ar, hi, ru, it, nl, tr, pl, sv] = await Promise.all(
    ['pt','ja','ko','ar','hi','ru','it','nl','tr','pl','sv'].map(load)
  );
  for (const [code, res] of Object.entries({ pt, ja, ko, ar, hi, ru, it, nl, tr, pl, sv })) {
    if (Object.keys(res).length) i18n.addResourceBundle(code, 'translation', res, true, true);
  }
};
loadLocales();

// Languages that use right-to-left text direction
export const RTL_LANGUAGES = new Set(['ar']);

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English',            nativeName: 'English',      flag: '🇺🇸', rtl: false },
  { code: 'es', name: 'Spanish',            nativeName: 'Español',      flag: '🇪🇸', rtl: false },
  { code: 'fr', name: 'French',             nativeName: 'Français',     flag: '🇫🇷', rtl: false },
  { code: 'de', name: 'German',             nativeName: 'Deutsch',      flag: '🇩🇪', rtl: false },
  { code: 'pt', name: 'Portuguese',         nativeName: 'Português',    flag: '🇧🇷', rtl: false },
  { code: 'zh', name: 'Chinese Simplified', nativeName: '简体中文',       flag: '🇨🇳', rtl: false },
  { code: 'ja', name: 'Japanese',           nativeName: '日本語',         flag: '🇯🇵', rtl: false },
  { code: 'ko', name: 'Korean',             nativeName: '한국어',          flag: '🇰🇷', rtl: false },
  { code: 'ar', name: 'Arabic',             nativeName: 'العربية',       flag: '🇸🇦', rtl: true  },
  { code: 'hi', name: 'Hindi',              nativeName: 'हिन्दी',          flag: '🇮🇳', rtl: false },
  { code: 'ru', name: 'Russian',            nativeName: 'Русский',       flag: '🇷🇺', rtl: false },
  { code: 'it', name: 'Italian',            nativeName: 'Italiano',     flag: '🇮🇹', rtl: false },
  { code: 'nl', name: 'Dutch',              nativeName: 'Nederlands',   flag: '🇳🇱', rtl: false },
  { code: 'tr', name: 'Turkish',            nativeName: 'Türkçe',       flag: '🇹🇷', rtl: false },
  { code: 'pl', name: 'Polish',             nativeName: 'Polski',       flag: '🇵🇱', rtl: false },
  { code: 'sv', name: 'Swedish',            nativeName: 'Svenska',      flag: '🇸🇪', rtl: false }
];

export function isRTL(langCode) {
  return RTL_LANGUAGES.has(langCode);
}

export function applyDocumentDirection(langCode) {
  const dir = isRTL(langCode) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', langCode);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      pt: { translation: pt },
      zh: { translation: zh },
      ja: { translation: ja },
      ko: { translation: ko },
      ar: { translation: ar },
      hi: { translation: hi },
      ru: { translation: ru },
      it: { translation: it },
      nl: { translation: nl },
      tr: { translation: tr },
      pl: { translation: pl },
      sv: { translation: sv }
      // Extended locales populated at runtime via loadLocales()
    },

    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),

    detection: {
      // Order of sources to detect language from
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'nexus_language',
      cacheUserLanguage: true
    },

    interpolation: {
      // React already escapes values — no need to escape here
      escapeValue: false
    },

    react: {
      useSuspense: false
    }
  });

// Apply direction for the initially detected language on first load
applyDocumentDirection(i18n.language || 'en');

// Keep document direction in sync whenever the language changes
i18n.on('languageChanged', applyDocumentDirection);

export default i18n;
