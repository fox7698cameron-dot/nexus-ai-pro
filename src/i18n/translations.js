/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Multi-language translations & regional support
 * Supports auto-translate via browser's Intl API + optional DeepL/Google Translate
 * Date: 2026-08-09
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', dir: 'ltr', locale: 'en-US', flag: '🇺🇸' },
  { code: 'es', name: 'Español', dir: 'ltr', locale: 'es-ES', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', dir: 'ltr', locale: 'fr-FR', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', dir: 'ltr', locale: 'de-DE', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', dir: 'ltr', locale: 'pt-BR', flag: '🇧🇷' },
  { code: 'ja', name: '日本語', dir: 'ltr', locale: 'ja-JP', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', dir: 'ltr', locale: 'ko-KR', flag: '🇰🇷' },
  { code: 'zh', name: '中文', dir: 'ltr', locale: 'zh-CN', flag: '🇨🇳' },
  { code: 'ar', name: 'العربية', dir: 'rtl', locale: 'ar-SA', flag: '🇸🇦' },
  { code: 'hi', name: 'हिंदी', dir: 'ltr', locale: 'hi-IN', flag: '🇮🇳' },
  { code: 'ru', name: 'Русский', dir: 'ltr', locale: 'ru-RU', flag: '🇷🇺' },
  { code: 'it', name: 'Italiano', dir: 'ltr', locale: 'it-IT', flag: '🇮🇹' },
  { code: 'nl', name: 'Nederlands', dir: 'ltr', locale: 'nl-NL', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski', dir: 'ltr', locale: 'pl-PL', flag: '🇵🇱' },
  { code: 'tr', name: 'Türkçe', dir: 'ltr', locale: 'tr-TR', flag: '🇹🇷' },
  { code: 'sv', name: 'Svenska', dir: 'ltr', locale: 'sv-SE', flag: '🇸🇪' },
];

/** Translations keyed by language code then translation key */
export const TRANSLATIONS = {
  en: {
    // Auth
    'auth.login': 'Sign In',
    'auth.register': 'Create Account',
    'auth.logout': 'Sign Out',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.username': 'Username',
    'auth.displayName': 'Display Name',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.mfa.title': 'Two-Factor Authentication',
    'auth.mfa.enter': 'Enter 6-digit code',
    'auth.mfa.setup': 'Set Up 2FA',
    'auth.mfa.backup': 'Use Backup Code',
    'auth.biometric.fingerprint': 'Use Fingerprint',
    'auth.biometric.faceId': 'Use Face ID',
    'auth.biometric.touchId': 'Use Touch ID',
    'auth.biometric.retinal': 'Use Retinal Scan',
    'auth.passwordStrength.weak': 'Weak',
    'auth.passwordStrength.fair': 'Fair',
    'auth.passwordStrength.good': 'Good',
    'auth.passwordStrength.strong': 'Strong',
    'auth.passwordStrength.veryStrong': 'Very Strong',
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.admin': 'Admin Dashboard',
    'dashboard.dev': 'Developer Dashboard',
    'dashboard.moderator': 'Moderator Dashboard',
    'dashboard.user': 'User Dashboard',
    // Analytics
    'analytics.title': 'Analytics',
    'analytics.overview': 'Overview',
    'analytics.followers': 'Followers',
    'analytics.views': 'Views',
    'analytics.likes': 'Likes',
    'analytics.reach': 'Reach',
    'analytics.retention': 'Retention',
    'analytics.engagement': 'Engagement Rate',
    'analytics.impressions': 'Impressions',
    'analytics.shares': 'Shares',
    // Security
    'security.title': 'Security',
    'security.score': 'Security Score',
    'security.scan': 'Run Scan',
    'security.scanning': 'Scanning…',
    'security.vulnerabilities': 'Vulnerabilities',
    'security.networkIssues': 'Network Issues',
    'security.deviceHealth': 'Device Health',
    'security.patch': 'Patch',
    // Projects
    'projects.title': 'Projects',
    'projects.new': 'New Project',
    'projects.type.coding': 'Coding',
    'projects.type.game': 'Game Dev',
    'projects.type.ar': 'Augmented Reality',
    'projects.type.vr': 'Virtual Reality',
    'projects.type.3d': '3D Project',
    // Payments
    'payment.title': 'Subscription',
    'payment.upgrade': 'Upgrade Plan',
    'payment.monthly': '/month',
    'payment.giftCard': 'Redeem Gift Card',
    'payment.crypto': 'Pay with Crypto',
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.loading': 'Loading…',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.search': 'Search',
    'common.settings': 'Settings',
    'common.profile': 'Profile',
    'common.notifications': 'Notifications',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.submit': 'Submit',
    'common.required': 'Required',
  },
  es: {
    'auth.login': 'Iniciar Sesión',
    'auth.register': 'Crear Cuenta',
    'auth.logout': 'Cerrar Sesión',
    'auth.email': 'Correo Electrónico',
    'auth.password': 'Contraseña',
    'auth.username': 'Nombre de Usuario',
    'analytics.title': 'Analíticas',
    'security.title': 'Seguridad',
    'dashboard.title': 'Panel',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.loading': 'Cargando…',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.search': 'Buscar',
    'common.settings': 'Configuración',
  },
  fr: {
    'auth.login': 'Se Connecter',
    'auth.register': 'Créer un Compte',
    'auth.logout': 'Déconnexion',
    'auth.email': 'Adresse E-mail',
    'auth.password': 'Mot de Passe',
    'auth.username': "Nom d'Utilisateur",
    'analytics.title': 'Analytique',
    'security.title': 'Sécurité',
    'dashboard.title': 'Tableau de Bord',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.loading': 'Chargement…',
    'common.error': 'Erreur',
    'common.settings': 'Paramètres',
  },
  de: {
    'auth.login': 'Anmelden',
    'auth.register': 'Konto Erstellen',
    'auth.logout': 'Abmelden',
    'auth.email': 'E-Mail',
    'auth.password': 'Passwort',
    'analytics.title': 'Analytik',
    'security.title': 'Sicherheit',
    'dashboard.title': 'Dashboard',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.settings': 'Einstellungen',
  },
  ja: {
    'auth.login': 'ログイン',
    'auth.register': 'アカウント作成',
    'auth.logout': 'ログアウト',
    'auth.email': 'メールアドレス',
    'auth.password': 'パスワード',
    'analytics.title': 'アナリティクス',
    'security.title': 'セキュリティ',
    'dashboard.title': 'ダッシュボード',
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.settings': '設定',
  },
  zh: {
    'auth.login': '登录',
    'auth.register': '注册账户',
    'auth.logout': '退出登录',
    'analytics.title': '分析',
    'security.title': '安全',
    'dashboard.title': '仪表板',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.settings': '设置',
  },
  ar: {
    'auth.login': 'تسجيل الدخول',
    'auth.register': 'إنشاء حساب',
    'auth.logout': 'تسجيل الخروج',
    'analytics.title': 'التحليلات',
    'security.title': 'الأمان',
    'dashboard.title': 'لوحة التحكم',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.settings': 'الإعدادات',
  },
};

/**
 * Look up a translation key with fallback to English then the key itself
 * Supports {{variable}} interpolation
 */
export function t(key, lang = 'en', vars = {}) {
  const langMap = TRANSLATIONS[lang] ?? {};
  const enMap = TRANSLATIONS.en ?? {};
  let text = langMap[key] ?? enMap[key] ?? key;

  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
  }

  return text;
}

/**
 * Detect browser language preference
 */
export function detectBrowserLanguage() {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const langStr = nav?.language || nav?.languages?.[0] || 'en';
  const code = langStr.split('-')[0].toLowerCase();
  return SUPPORTED_LANGUAGES.find(l => l.code === code)?.code ?? 'en';
}

/**
 * Format a number with locale-aware formatting
 */
export function formatNumber(num, locale = 'en-US', opts = {}) {
  return new Intl.NumberFormat(locale, opts).format(num);
}

/**
 * Format a date with locale-aware formatting
 */
export function formatDate(date, locale = 'en-US', opts = {}) {
  return new Intl.DateTimeFormat(locale, opts).format(new Date(date));
}

/**
 * Format currency
 */
export function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount / 100);
}

/**
 * Get text direction for a language code
 */
export function getTextDirection(langCode) {
  return SUPPORTED_LANGUAGES.find(l => l.code === langCode)?.dir ?? 'ltr';
}
