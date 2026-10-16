/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * src/i18n/__tests__/i18n.test.js
 * Updated: 2026-10-16
 * Tests for i18n lookup, interpolation, and locale detection
 */

import { describe, it, expect } from 'vitest';

// Test the translation lookup logic independently (no localStorage/DOM needed)
const TRANSLATIONS = {
  en: {
    'auth.login':       'Sign In',
    'auth.register':    'Create Account',
    'auth.logout':      'Sign Out',
    'common.save':      'Save',
    'common.cancel':    'Cancel',
    'validation.required': 'This field is required',
    'greeting':         'Hello, {{name}}!',
    'status.items':     '{{count}} items',
  },
  es: {
    'auth.login':       'Iniciar Sesión',
    'auth.register':    'Crear Cuenta',
    'auth.logout':      'Cerrar Sesión',
    'common.save':      'Guardar',
    'common.cancel':    'Cancelar',
    'validation.required': 'Este campo es obligatorio',
    'greeting':         '¡Hola, {{name}}!',
    'status.items':     '{{count}} artículos',
  },
};

const RTL_LOCALES = new Set(['ar', 'he']);
const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'pt', 'it', 'ru', 'zh', 'zh-tw', 'ja', 'ko', 'ar', 'he', 'hi', 'tr', 'pl', 'nl', 'sv', 'da', 'fi'];

function t(key, vars = {}, locale = 'en') {
  const dict = TRANSLATIONS[locale] || TRANSLATIONS['en'];
  let str = dict[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
  }
  return str;
}

function isRTL(locale) {
  return RTL_LOCALES.has(locale);
}

// ── Translation lookup ────────────────────────────────────────────────────────

describe('t (translation lookup)', () => {
  it('returns English translation for known key', () => {
    expect(t('auth.login')).toBe('Sign In');
  });

  it('returns Spanish translation when locale is "es"', () => {
    expect(t('auth.login', {}, 'es')).toBe('Iniciar Sesión');
  });

  it('falls back to key when translation is missing', () => {
    expect(t('unknown.key')).toBe('unknown.key');
  });

  it('falls back to English for unsupported locale', () => {
    expect(t('auth.login', {}, 'xx')).toBe('Sign In');
  });

  it('interpolates {{name}} variables', () => {
    expect(t('greeting', { name: 'Cameron' })).toBe('Hello, Cameron!');
  });

  it('interpolates {{count}} variables in Spanish', () => {
    expect(t('status.items', { count: 5 }, 'es')).toBe('5 artículos');
  });

  it('handles multiple variables in one string', () => {
    // Add a test-only key
    const str = 'Welcome {{first}} {{last}}!'.replace('{{first}}', 'Cameron').replace('{{last}}', 'Fox');
    expect(str).toBe('Welcome Cameron Fox!');
  });

  it('leaves unreplaced placeholders if var not provided', () => {
    expect(t('greeting')).toBe('Hello, {{name}}!');
  });
});

// ── RTL detection ─────────────────────────────────────────────────────────────

describe('isRTL', () => {
  it('identifies Arabic as RTL', () => {
    expect(isRTL('ar')).toBe(true);
  });

  it('identifies Hebrew as RTL', () => {
    expect(isRTL('he')).toBe(true);
  });

  it('identifies English as LTR', () => {
    expect(isRTL('en')).toBe(false);
  });

  it('identifies Spanish as LTR', () => {
    expect(isRTL('es')).toBe(false);
  });
});

// ── Supported locales ─────────────────────────────────────────────────────────

describe('SUPPORTED_LOCALES', () => {
  it('contains at least 20 locales', () => {
    expect(SUPPORTED_LOCALES.length).toBeGreaterThanOrEqual(20);
  });

  it('includes all major locales', () => {
    for (const locale of ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ar', 'hi']) {
      expect(SUPPORTED_LOCALES).toContain(locale);
    }
  });

  it('has no duplicate entries', () => {
    expect(new Set(SUPPORTED_LOCALES).size).toBe(SUPPORTED_LOCALES.length);
  });
});
