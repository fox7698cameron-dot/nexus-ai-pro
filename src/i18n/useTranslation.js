// src/i18n/useTranslation.js — 2026-07-26
// Lightweight i18n hook with nested key resolution and fallback to English
import { useState, useCallback, createContext, useContext } from 'react';
import { translations, DEFAULT_LOCALE, LOCALES } from './translations.js';

// Deep-get a dotted key from an object, e.g. 'auth.signIn'
function deepGet(obj, key) {
  return key.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
}

export const I18nContext = createContext(null);

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider');
  return ctx;
}

export function createI18n(initialLocale = DEFAULT_LOCALE) {
  const [locale, setLocaleState] = useState(
    () => localStorage.getItem('nexus:locale') || initialLocale
  );

  const t = useCallback((key, params = {}) => {
    const lang = translations[locale] || translations[DEFAULT_LOCALE];
    const fallback = translations[DEFAULT_LOCALE];
    let str = deepGet(lang, key) || deepGet(fallback, key) || key;
    // Simple interpolation: {{name}} → params.name
    return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (params[k] !== undefined ? params[k] : `{{${k}}}`));
  }, [locale]);

  const setLocale = useCallback((code) => {
    if (!translations[code]) return;
    localStorage.setItem('nexus:locale', code);
    const localeInfo = LOCALES.find(l => l.code === code);
    if (localeInfo) {
      document.documentElement.lang = code;
      document.documentElement.dir  = localeInfo.dir;
    }
    setLocaleState(code);
  }, []);

  const dir = LOCALES.find(l => l.code === locale)?.dir || 'ltr';

  return { t, locale, setLocale, dir, locales: LOCALES };
}
