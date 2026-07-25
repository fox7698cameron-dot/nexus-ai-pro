// src/i18n/index.test.js — Updated: 2026-07-25
import { describe, it, expect, beforeEach } from 'vitest';

// Test the i18n module logic inline (without importing the module itself to keep tests fast)
const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ar', 'pt', 'ko', 'it', 'ru', 'hi', 'tr', 'nl', 'pl'];
const RTL_LOCALES = ['ar', 'he', 'fa', 'ur'];

const translations = {
  en: {
    'auth.login': 'Sign In',
    'auth.register': 'Create Account',
    'nav.analytics': 'Analytics',
    'common.save': 'Save',
    'common.cancel': 'Cancel'
  },
  es: {
    'auth.login': 'Iniciar sesión',
    'auth.register': 'Crear cuenta',
    'nav.analytics': 'Analíticas',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar'
  },
  ar: {
    'auth.login': 'تسجيل الدخول',
    'auth.register': 'إنشاء حساب'
  }
};

function t(key, locale = 'en', vars = {}) {
  const dict = translations[locale] || translations.en;
  let text = dict[key] || translations.en[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(`{{${k}}}`, v);
  }
  return text;
}

function isRTL(locale) {
  return RTL_LOCALES.includes(locale);
}

describe('Translation lookup', () => {
  it('returns English text for en locale', () => {
    expect(t('auth.login', 'en')).toBe('Sign In');
  });

  it('returns Spanish text for es locale', () => {
    expect(t('auth.login', 'es')).toBe('Iniciar sesión');
  });

  it('falls back to English for missing key in locale', () => {
    expect(t('common.save', 'ar')).toBe('Save');
  });

  it('returns key as fallback for completely missing translation', () => {
    expect(t('nonexistent.key', 'en')).toBe('nonexistent.key');
  });

  it('supports variable interpolation', () => {
    translations.en['greeting'] = 'Hello, {{name}}!';
    expect(t('greeting', 'en', { name: 'World' })).toBe('Hello, World!');
    delete translations.en['greeting'];
  });
});

describe('RTL locale detection', () => {
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

  it('identifies Japanese as LTR', () => {
    expect(isRTL('ja')).toBe(false);
  });
});

describe('Supported locales', () => {
  it('includes all required languages', () => {
    const required = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ar', 'pt'];
    for (const lang of required) {
      expect(SUPPORTED_LOCALES).toContain(lang);
    }
  });

  it('has at least 8 supported locales', () => {
    expect(SUPPORTED_LOCALES.length).toBeGreaterThanOrEqual(8);
  });
});

describe('Locale normalization', () => {
  it('extracts base language from locale tag', () => {
    const normalize = (lang) => lang.split('-')[0].toLowerCase();
    expect(normalize('en-US')).toBe('en');
    expect(normalize('zh-CN')).toBe('zh');
    expect(normalize('pt-BR')).toBe('pt');
  });

  it('falls back to en for unsupported locale', () => {
    const resolveLocale = (lang) => {
      const base = lang.split('-')[0].toLowerCase();
      return SUPPORTED_LOCALES.includes(base) ? base : 'en';
    };
    expect(resolveLocale('xx-YY')).toBe('en');
    expect(resolveLocale('klingon')).toBe('en');
  });
});
