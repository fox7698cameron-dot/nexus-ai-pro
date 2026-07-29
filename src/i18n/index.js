/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * 2026-07-29 - i18n: multi-language support, auto-translate stubs
 */

export const SUPPORTED_LOCALES = Object.freeze([
  { code: 'en', name: 'English', dir: 'ltr', region: 'US' },
  { code: 'es', name: 'Español', dir: 'ltr', region: 'ES' },
  { code: 'fr', name: 'Français', dir: 'ltr', region: 'FR' },
  { code: 'de', name: 'Deutsch', dir: 'ltr', region: 'DE' },
  { code: 'pt', name: 'Português', dir: 'ltr', region: 'BR' },
  { code: 'ja', name: '日本語', dir: 'ltr', region: 'JP' },
  { code: 'ko', name: '한국어', dir: 'ltr', region: 'KR' },
  { code: 'zh', name: '中文', dir: 'ltr', region: 'CN' },
  { code: 'ar', name: 'العربية', dir: 'rtl', region: 'SA' },
  { code: 'hi', name: 'हिंदी', dir: 'ltr', region: 'IN' },
  { code: 'ru', name: 'Русский', dir: 'ltr', region: 'RU' },
  { code: 'it', name: 'Italiano', dir: 'ltr', region: 'IT' },
  { code: 'nl', name: 'Nederlands', dir: 'ltr', region: 'NL' },
  { code: 'tr', name: 'Türkçe', dir: 'ltr', region: 'TR' },
  { code: 'pl', name: 'Polski', dir: 'ltr', region: 'PL' },
  { code: 'sv', name: 'Svenska', dir: 'ltr', region: 'SE' },
  { code: 'uk', name: 'Українська', dir: 'ltr', region: 'UA' }
]);

const translations = new Map();

// Minimal English base translations
const baseEn = {
  'app.title': 'Nexus AI Pro',
  'nav.dashboard': 'Dashboard',
  'nav.analytics': 'Analytics',
  'nav.security': 'Security',
  'nav.projects': 'Projects',
  'nav.settings': 'Settings',
  'auth.login': 'Sign In',
  'auth.register': 'Create Account',
  'auth.logout': 'Sign Out',
  'auth.password': 'Password',
  'auth.email': 'Email',
  'auth.mfa': 'Two-Factor Code',
  'analytics.title': 'Social Analytics',
  'analytics.reach': 'Total Reach',
  'analytics.views': 'Views',
  'analytics.engagement': 'Engagement Rate',
  'security.title': 'Security Dashboard',
  'security.status': 'Security Status',
  'security.scan': 'Run Scan',
  'projects.title': 'Project Tracker',
  'payment.title': 'Subscription',
  'payment.upgrade': 'Upgrade Plan',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.loading': 'Loading...',
  'common.error': 'An error occurred',
  'common.success': 'Success'
};

translations.set('en', baseEn);

export function t(key, locale = 'en', fallback = key) {
  const lang = locale.split('-')[0];
  const map = translations.get(lang) || translations.get('en') || {};
  return map[key] || fallback;
}

export function loadTranslations(locale, keys) {
  const lang = locale.split('-')[0];
  const existing = translations.get(lang) || {};
  Object.assign(existing, keys);
  translations.set(lang, existing);
}

export function getLocaleInfo(code) {
  return SUPPORTED_LOCALES.find(l => l.code === code || l.code === code.split('-')[0]);
}

// Auto-translate via Google Translate API (requires GOOGLE_TRANSLATE_API_KEY)
export async function autoTranslate(text, targetLocale, sourceLocale = 'en') {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return { text, translated: false };

  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: sourceLocale, target: targetLocale, format: 'text' })
  });

  if (!resp.ok) return { text, translated: false };
  const data = await resp.json();
  const translated = data?.data?.translations?.[0]?.translatedText || text;
  return { text: translated, translated: true };
}

export function detectLocaleFromHeader(acceptLanguage) {
  if (!acceptLanguage) return 'en';
  const codes = acceptLanguage.split(',').map(l => l.trim().split(';')[0].split('-')[0].toLowerCase());
  for (const code of codes) {
    if (SUPPORTED_LOCALES.some(l => l.code === code)) return code;
  }
  return 'en';
}
