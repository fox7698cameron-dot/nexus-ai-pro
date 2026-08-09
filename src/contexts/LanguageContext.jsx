/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Language & Region Context
 * Multi-language support with auto-detect and optional auto-translate
 * Date: 2026-08-09
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { t, detectBrowserLanguage, getTextDirection, SUPPORTED_LANGUAGES, formatNumber, formatDate, formatCurrency } from '../i18n/translations.js';

const LANG_KEY = 'nexus:language';
const LOCALE_KEY = 'nexus:locale';

const LanguageContext = createContext(null);

export function LanguageProvider({ children, defaultLanguage }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem(LANG_KEY) || defaultLanguage || detectBrowserLanguage();
  });

  const [locale, setLocaleState] = useState(() => {
    return localStorage.getItem(LOCALE_KEY)
      || SUPPORTED_LANGUAGES.find(l => l.code === language)?.locale
      || 'en-US';
  });

  const direction = getTextDirection(language);

  // Apply direction to document
  useEffect(() => {
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('lang', language);
  }, [language, direction]);

  const setLanguage = useCallback((code) => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    if (!lang) return;
    localStorage.setItem(LANG_KEY, code);
    localStorage.setItem(LOCALE_KEY, lang.locale);
    setLanguageState(code);
    setLocaleState(lang.locale);
  }, []);

  /** Translate a key with optional variable interpolation */
  const translate = useCallback((key, vars) => t(key, language, vars), [language]);

  /** Format a number using current locale */
  const num = useCallback((n, opts) => formatNumber(n, locale, opts), [locale]);

  /** Format a date using current locale */
  const date = useCallback((d, opts) => formatDate(d, locale, opts), [locale]);

  /** Format currency using current locale */
  const currency = useCallback((amount, cur) => formatCurrency(amount, cur, locale), [locale]);

  /**
   * Auto-translate arbitrary text via API (uses Google Translate or DeepL from env)
   * Falls back gracefully if translation service is not configured
   */
  const autoTranslate = useCallback(async (text, targetLang = language) => {
    if (targetLang === 'en') return text;

    // Use the server-side translate endpoint — API key stays in env, never in client
    try {
      const resp = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang }),
      });
      if (!resp.ok) return text;
      const { translated } = await resp.json();
      return translated || text;
    } catch {
      return text; // Graceful fallback
    }
  }, [language]);

  const value = {
    language,
    locale,
    direction,
    setLanguage,
    t: translate,
    num,
    date,
    currency,
    autoTranslate,
    supportedLanguages: SUPPORTED_LANGUAGES,
    currentLangMeta: SUPPORTED_LANGUAGES.find(l => l.code === language),
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
