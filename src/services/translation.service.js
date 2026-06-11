// src/services/translation.service.js
// i18n — multi-language support with auto-translate fallback
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import i18next from 'i18next';
import { SUPPORTED_LANGUAGES } from '../config/constants.js';

const defaultNS = 'common';

// Base translations (English) — other locales extend this
const resources = {
  en: {
    common: {
      welcome: 'Welcome to Nexus AI Pro',
      dashboard: 'Dashboard',
      analytics: 'Analytics',
      security: 'Security',
      projects: 'Projects',
      settings: 'Settings',
      logout: 'Sign Out',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      loading: 'Loading…',
      error: 'Something went wrong',
      success: 'Success',
      confirm: 'Are you sure?',
      noData: 'No data available',
    },
    auth: {
      signIn: 'Sign In',
      signUp: 'Sign Up',
      email: 'Email address',
      password: 'Password',
      forgotPassword: 'Forgot password?',
      mfaTitle: 'Two-Factor Authentication',
      mfaDescription: 'Enter the code from your authenticator app',
      biometricPrompt: 'Use biometric authentication',
      passwordTooWeak: 'Password must be at least 13 characters with uppercase, lowercase, numbers, and special characters',
    },
    errors: {
      required: 'This field is required',
      invalidEmail: 'Invalid email address',
      passwordMismatch: 'Passwords do not match',
      unauthorized: 'You are not authorized',
      forbidden: 'Access denied',
      notFound: 'Not found',
      serverError: 'Server error — please try again',
    },
  },
  es: {
    common: {
      welcome: 'Bienvenido a Nexus AI Pro',
      dashboard: 'Panel de control',
      analytics: 'Analíticas',
      security: 'Seguridad',
      projects: 'Proyectos',
      settings: 'Configuración',
      logout: 'Cerrar sesión',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      loading: 'Cargando…',
      error: 'Algo salió mal',
      success: 'Éxito',
    },
  },
  fr: {
    common: {
      welcome: 'Bienvenue sur Nexus AI Pro',
      dashboard: 'Tableau de bord',
      analytics: 'Analytiques',
      security: 'Sécurité',
      projects: 'Projets',
      settings: 'Paramètres',
      logout: 'Déconnexion',
    },
  },
  de: {
    common: {
      welcome: 'Willkommen bei Nexus AI Pro',
      dashboard: 'Übersicht',
      analytics: 'Analytik',
      security: 'Sicherheit',
      projects: 'Projekte',
      settings: 'Einstellungen',
      logout: 'Abmelden',
    },
  },
  ja: {
    common: {
      welcome: 'Nexus AI Proへようこそ',
      dashboard: 'ダッシュボード',
      analytics: 'アナリティクス',
      security: 'セキュリティ',
      projects: 'プロジェクト',
      settings: '設定',
      logout: 'サインアウト',
    },
  },
  zh: {
    common: {
      welcome: '欢迎使用 Nexus AI Pro',
      dashboard: '仪表板',
      analytics: '分析',
      security: '安全',
      projects: '项目',
      settings: '设置',
      logout: '退出登录',
    },
  },
  ko: {
    common: {
      welcome: 'Nexus AI Pro에 오신 것을 환영합니다',
      dashboard: '대시보드',
      analytics: '분석',
      security: '보안',
      projects: '프로젝트',
      settings: '설정',
      logout: '로그아웃',
    },
  },
  pt: {
    common: {
      welcome: 'Bem-vindo ao Nexus AI Pro',
      dashboard: 'Painel',
      analytics: 'Análises',
      security: 'Segurança',
      projects: 'Projetos',
      settings: 'Configurações',
      logout: 'Sair',
    },
  },
  ar: {
    common: {
      welcome: 'مرحباً بك في Nexus AI Pro',
      dashboard: 'لوحة التحكم',
      analytics: 'التحليلات',
      security: 'الأمان',
      projects: 'المشاريع',
      settings: 'الإعدادات',
      logout: 'تسجيل الخروج',
    },
  },
  hi: {
    common: {
      welcome: 'Nexus AI Pro में आपका स्वागत है',
      dashboard: 'डैशबोर्ड',
      analytics: 'विश्लेषण',
      security: 'सुरक्षा',
      projects: 'परियोजनाएं',
      settings: 'सेटिंग्स',
      logout: 'साइन आउट',
    },
  },
};

let _initialized = false;

export async function initI18n() {
  if (_initialized) return i18next;
  await i18next.init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    defaultNS,
    interpolation: { escapeValue: false },
    supportedLngs: SUPPORTED_LANGUAGES.map(l => l.code),
  });
  _initialized = true;
  return i18next;
}

export function t(key, options = {}, lng = 'en') {
  return i18next.t(key, { lng, ...options });
}

export function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES;
}

export function detectLocale(acceptLanguageHeader) {
  if (!acceptLanguageHeader) return 'en';
  const codes = SUPPORTED_LANGUAGES.map(l => l.code);
  const preferred = acceptLanguageHeader
    .split(',')
    .map(l => l.split(';')[0].trim().toLowerCase().slice(0, 2));
  return preferred.find(l => codes.includes(l)) ?? 'en';
}

// Auto-translate via Google Translate API (when configured)
export async function autoTranslate(text, targetLang, sourceLang = 'en') {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    // Fallback: return original text if no translation API configured
    return text;
  }
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, target: targetLang, source: sourceLang, format: 'text' }),
  });
  if (!res.ok) return text;
  const data = await res.json();
  return data.data?.translations?.[0]?.translatedText ?? text;
}
