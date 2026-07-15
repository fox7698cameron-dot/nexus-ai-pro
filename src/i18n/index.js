/**
 * src/i18n/index.js
 * Nexus AI Pro — Internationalization & Auto-Translation Layer
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * Supports: en, es, fr, de, ja, zh, ko, pt, ar, hi, ru, it, nl, sv, pl
 * Server-side auto-translation via configured AI model or LibreTranslate.
 * Client-side falls back to English for missing keys.
 */

export const SUPPORTED_LOCALES = {
  en: { name: 'English',    flag: '🇺🇸', dir: 'ltr', dateFormat: 'MM/DD/YYYY' },
  es: { name: 'Español',    flag: '🇪🇸', dir: 'ltr', dateFormat: 'DD/MM/YYYY' },
  fr: { name: 'Français',   flag: '🇫🇷', dir: 'ltr', dateFormat: 'DD/MM/YYYY' },
  de: { name: 'Deutsch',    flag: '🇩🇪', dir: 'ltr', dateFormat: 'DD.MM.YYYY' },
  ja: { name: '日本語',      flag: '🇯🇵', dir: 'ltr', dateFormat: 'YYYY/MM/DD' },
  zh: { name: '中文',        flag: '🇨🇳', dir: 'ltr', dateFormat: 'YYYY-MM-DD' },
  ko: { name: '한국어',      flag: '🇰🇷', dir: 'ltr', dateFormat: 'YYYY.MM.DD' },
  pt: { name: 'Português',  flag: '🇧🇷', dir: 'ltr', dateFormat: 'DD/MM/YYYY' },
  ar: { name: 'العربية',    flag: '🇸🇦', dir: 'rtl', dateFormat: 'DD/MM/YYYY' },
  hi: { name: 'हिन्दी',     flag: '🇮🇳', dir: 'ltr', dateFormat: 'DD/MM/YYYY' },
  ru: { name: 'Русский',    flag: '🇷🇺', dir: 'ltr', dateFormat: 'DD.MM.YYYY' },
  it: { name: 'Italiano',   flag: '🇮🇹', dir: 'ltr', dateFormat: 'DD/MM/YYYY' },
  nl: { name: 'Nederlands', flag: '🇳🇱', dir: 'ltr', dateFormat: 'DD-MM-YYYY' },
  sv: { name: 'Svenska',    flag: '🇸🇪', dir: 'ltr', dateFormat: 'YYYY-MM-DD' },
  pl: { name: 'Polski',     flag: '🇵🇱', dir: 'ltr', dateFormat: 'DD.MM.YYYY' },
};

const en = {
  // Auth
  'auth.login': 'Sign In',
  'auth.register': 'Create Account',
  'auth.logout': 'Sign Out',
  'auth.email': 'Email Address',
  'auth.password': 'Password',
  'auth.username': 'Username',
  'auth.displayName': 'Display Name',
  'auth.forgotPassword': 'Forgot Password?',
  'auth.resetPassword': 'Reset Password',
  'auth.confirmPassword': 'Confirm Password',
  'auth.2fa': 'Two-Factor Authentication',
  'auth.2faCode': 'Enter 6-digit code',
  'auth.biometric': 'Use Biometrics',
  'auth.fingerprint': 'Fingerprint',
  'auth.faceId': 'Face ID',
  'auth.touchId': 'Touch ID',
  'auth.retinalScan': 'Retinal Scan',
  'auth.passwordStrength': 'Password Strength',
  'auth.passwordWeak': 'Weak — must be 13+ characters',
  'auth.passwordFair': 'Fair',
  'auth.passwordStrong': 'Strong',
  'auth.passwordVeryStrong': 'Very Strong',
  'auth.passwordRequirements': 'Minimum 13 characters, uppercase, lowercase, number, special character',
  'auth.mfa.setup': 'Set Up Multi-Factor Authentication',
  'auth.mfa.scan': 'Scan QR code with your authenticator app',
  'auth.mfa.backup': 'Save these backup codes in a safe place',
  'auth.role.user': 'User',
  'auth.role.moderator': 'Moderator',
  'auth.role.developer': 'Developer',
  'auth.role.admin': 'Administrator',

  // Navigation
  'nav.home': 'Home',
  'nav.dashboard': 'Dashboard',
  'nav.analytics': 'Analytics',
  'nav.security': 'Security',
  'nav.projects': 'Projects',
  'nav.games': 'Game Dev',
  'nav.payments': 'Billing',
  'nav.connectors': 'Connectors',
  'nav.settings': 'Settings',
  'nav.admin': 'Admin Panel',
  'nav.profile': 'Profile',
  'nav.notifications': 'Notifications',

  // Dashboard
  'dashboard.welcome': 'Welcome back',
  'dashboard.overview': 'Overview',
  'dashboard.realtime': 'Real-Time Metrics',
  'dashboard.totalReach': 'Total Reach',
  'dashboard.engagement': 'Engagement Rate',
  'dashboard.impressions': 'Impressions',
  'dashboard.followers': 'Followers',
  'dashboard.likes': 'Likes',
  'dashboard.comments': 'Comments',
  'dashboard.shares': 'Shares',
  'dashboard.views': 'Views',
  'dashboard.watchTime': 'Watch Time',
  'dashboard.retention': 'Retention Rate',
  'dashboard.growth': 'Growth',
  'dashboard.trending': 'Trending',

  // Platforms
  'platform.tiktok': 'TikTok',
  'platform.instagram': 'Instagram',
  'platform.facebook': 'Facebook',
  'platform.twitch': 'Twitch',
  'platform.discord': 'Discord',
  'platform.lemon8': 'Lemon8',
  'platform.reddit': 'Reddit',
  'platform.redgifs': 'RedGIFs',
  'platform.youtube': 'YouTube',
  'platform.twitter': 'X / Twitter',

  // Security
  'security.title': 'Security Center',
  'security.score': 'Security Score',
  'security.scan': 'Run Scan',
  'security.scanning': 'Scanning...',
  'security.threats': 'Threats Detected',
  'security.blocked': 'Threats Blocked',
  'security.encryption': 'Encryption',
  'security.network': 'Network Status',
  'security.device': 'Device Health',
  'security.firewall': 'Firewall',
  'security.vpn': 'VPN Status',
  'security.certificates': 'SSL Certificates',
  'security.vulnerabilities': 'Vulnerabilities',
  'security.patch': 'Apply Patch',
  'security.patched': 'Patched',
  'security.critical': 'Critical',
  'security.high': 'High',
  'security.medium': 'Medium',
  'security.low': 'Low',
  'security.realtime': 'Real-Time Monitoring',
  'security.auditLog': 'Audit Log',

  // Projects
  'project.new': 'New Project',
  'project.status': 'Status',
  'project.progress': 'Progress',
  'project.deadline': 'Deadline',
  'project.team': 'Team',
  'project.commits': 'Commits',
  'project.builds': 'Builds',
  'project.tests': 'Tests',
  'project.coverage': 'Coverage',
  'project.type.coding': 'Software',
  'project.type.gamedev': 'Game Dev',
  'project.type.ar': 'Augmented Reality',
  'project.type.vr': 'Virtual Reality',
  'project.type.3d': '3D / Modeling',

  // Payments
  'payment.title': 'Billing & Payments',
  'payment.subscribe': 'Subscribe',
  'payment.plan': 'Current Plan',
  'payment.upgrade': 'Upgrade',
  'payment.method': 'Payment Method',
  'payment.card': 'Credit / Debit Card',
  'payment.crypto': 'Cryptocurrency',
  'payment.giftCard': 'Gift Card',
  'payment.redeem': 'Redeem Code',
  'payment.history': 'Payment History',
  'payment.invoice': 'Invoice',
  'payment.next': 'Next Billing Date',
  'payment.cancel': 'Cancel Subscription',
  'payment.success': 'Payment Successful',
  'payment.failed': 'Payment Failed',

  // Connectors
  'connector.title': 'Integrations & Connectors',
  'connector.connect': 'Connect',
  'connector.disconnect': 'Disconnect',
  'connector.connected': 'Connected',
  'connector.status': 'Status',
  'connector.configure': 'Configure',
  'connector.test': 'Test Connection',

  // Game Dev
  'gamedev.title': 'Game Development Hub',
  'gamedev.engine': 'Game Engine',
  'gamedev.platform': 'Target Platform',
  'gamedev.achievements': 'Achievements',
  'gamedev.leaderboard': 'Leaderboard',
  'gamedev.players': 'Active Players',
  'gamedev.sessions': 'Game Sessions',
  'gamedev.revenue': 'Revenue',
  'gamedev.rating': 'Rating',
  'gamedev.downloads': 'Downloads',
  'gamedev.publisherConnect': 'Publisher Connect',

  // General
  'general.save': 'Save',
  'general.cancel': 'Cancel',
  'general.delete': 'Delete',
  'general.edit': 'Edit',
  'general.create': 'Create',
  'general.loading': 'Loading...',
  'general.error': 'An error occurred',
  'general.success': 'Success',
  'general.confirm': 'Confirm',
  'general.back': 'Back',
  'general.next': 'Next',
  'general.search': 'Search',
  'general.filter': 'Filter',
  'general.export': 'Export',
  'general.import': 'Import',
  'general.refresh': 'Refresh',
  'general.copy': 'Copy',
  'general.share': 'Share',
  'general.download': 'Download',
  'general.upload': 'Upload',
  'general.yes': 'Yes',
  'general.no': 'No',
  'general.enabled': 'Enabled',
  'general.disabled': 'Disabled',
  'general.active': 'Active',
  'general.inactive': 'Inactive',
  'general.online': 'Online',
  'general.offline': 'Offline',
};

// Partial translations — untranslated keys fall back to English
const translations = {
  en,
  es: {
    'auth.login': 'Iniciar Sesión',
    'auth.register': 'Crear Cuenta',
    'auth.logout': 'Cerrar Sesión',
    'auth.email': 'Correo Electrónico',
    'auth.password': 'Contraseña',
    'auth.username': 'Nombre de Usuario',
    'nav.dashboard': 'Panel de Control',
    'nav.analytics': 'Análisis',
    'nav.security': 'Seguridad',
    'nav.settings': 'Configuración',
    'general.save': 'Guardar',
    'general.cancel': 'Cancelar',
    'general.loading': 'Cargando...',
    'general.error': 'Ha ocurrido un error',
    'general.success': 'Éxito',
    'dashboard.welcome': 'Bienvenido de nuevo',
    'security.title': 'Centro de Seguridad',
    'payment.title': 'Facturación y Pagos',
  },
  fr: {
    'auth.login': 'Se Connecter',
    'auth.register': 'Créer un Compte',
    'auth.logout': 'Se Déconnecter',
    'auth.email': 'Adresse E-mail',
    'auth.password': 'Mot de Passe',
    'auth.username': "Nom d'Utilisateur",
    'nav.dashboard': 'Tableau de Bord',
    'nav.analytics': 'Analytique',
    'nav.security': 'Sécurité',
    'nav.settings': 'Paramètres',
    'general.save': 'Enregistrer',
    'general.cancel': 'Annuler',
    'general.loading': 'Chargement...',
    'general.error': 'Une erreur s\'est produite',
    'dashboard.welcome': 'Bon retour',
    'security.title': 'Centre de Sécurité',
  },
  de: {
    'auth.login': 'Anmelden',
    'auth.register': 'Konto Erstellen',
    'auth.logout': 'Abmelden',
    'auth.email': 'E-Mail-Adresse',
    'auth.password': 'Passwort',
    'auth.username': 'Benutzername',
    'nav.dashboard': 'Dashboard',
    'nav.analytics': 'Analyse',
    'nav.security': 'Sicherheit',
    'nav.settings': 'Einstellungen',
    'general.save': 'Speichern',
    'general.cancel': 'Abbrechen',
    'general.loading': 'Laden...',
    'dashboard.welcome': 'Willkommen zurück',
  },
  ja: {
    'auth.login': 'ログイン',
    'auth.register': 'アカウント作成',
    'auth.logout': 'ログアウト',
    'auth.email': 'メールアドレス',
    'auth.password': 'パスワード',
    'auth.username': 'ユーザー名',
    'nav.dashboard': 'ダッシュボード',
    'nav.analytics': 'アナリティクス',
    'nav.security': 'セキュリティ',
    'nav.settings': '設定',
    'general.save': '保存',
    'general.cancel': 'キャンセル',
    'general.loading': '読み込み中...',
    'dashboard.welcome': 'おかえりなさい',
  },
  zh: {
    'auth.login': '登录',
    'auth.register': '创建账户',
    'auth.logout': '退出',
    'auth.email': '电子邮件',
    'auth.password': '密码',
    'auth.username': '用户名',
    'nav.dashboard': '仪表板',
    'nav.analytics': '分析',
    'nav.security': '安全',
    'nav.settings': '设置',
    'general.save': '保存',
    'general.cancel': '取消',
    'general.loading': '加载中...',
    'dashboard.welcome': '欢迎回来',
  },
  ko: {
    'auth.login': '로그인',
    'auth.register': '계정 만들기',
    'auth.logout': '로그아웃',
    'auth.email': '이메일 주소',
    'auth.password': '비밀번호',
    'auth.username': '사용자 이름',
    'nav.dashboard': '대시보드',
    'nav.analytics': '분석',
    'nav.security': '보안',
    'nav.settings': '설정',
    'general.save': '저장',
    'general.cancel': '취소',
    'general.loading': '로딩 중...',
    'dashboard.welcome': '다시 오신 것을 환영합니다',
  },
  pt: {
    'auth.login': 'Entrar',
    'auth.register': 'Criar Conta',
    'auth.logout': 'Sair',
    'auth.email': 'Endereço de E-mail',
    'auth.password': 'Senha',
    'auth.username': 'Nome de Usuário',
    'nav.dashboard': 'Painel',
    'nav.analytics': 'Análise',
    'nav.security': 'Segurança',
    'nav.settings': 'Configurações',
    'general.save': 'Salvar',
    'general.cancel': 'Cancelar',
    'general.loading': 'Carregando...',
    'dashboard.welcome': 'Bem-vindo de volta',
  },
  ar: {
    'auth.login': 'تسجيل الدخول',
    'auth.register': 'إنشاء حساب',
    'auth.logout': 'تسجيل الخروج',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.username': 'اسم المستخدم',
    'nav.dashboard': 'لوحة التحكم',
    'nav.analytics': 'التحليلات',
    'nav.security': 'الأمان',
    'nav.settings': 'الإعدادات',
    'general.save': 'حفظ',
    'general.cancel': 'إلغاء',
    'general.loading': 'جار التحميل...',
    'dashboard.welcome': 'مرحباً بعودتك',
  },
};

// ─── i18n engine ──────────────────────────────────────────────────────────────

let _locale = 'en';
const _autoTranslateCache = new Map();

export function setLocale(locale) {
  if (SUPPORTED_LOCALES[locale]) {
    _locale = locale;
    document.documentElement.lang = locale;
    document.documentElement.dir = SUPPORTED_LOCALES[locale].dir;
  }
}

export function getLocale() {
  return _locale;
}

export function detectLocale() {
  const browser = (navigator.language || navigator.userLanguage || 'en').split('-')[0];
  return SUPPORTED_LOCALES[browser] ? browser : 'en';
}

export function t(key, vars = {}) {
  const locale = _locale;
  const dict = translations[locale] || {};
  const fallback = translations.en || {};
  let str = dict[key] ?? fallback[key] ?? key;

  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }

  return str;
}

/** Auto-translate via server when key is missing from all static dictionaries. */
export async function autoTranslate(text, targetLocale = _locale) {
  if (!text || targetLocale === 'en') return text;

  const cacheKey = `${targetLocale}:${text}`;
  if (_autoTranslateCache.has(cacheKey)) {
    return _autoTranslateCache.get(cacheKey);
  }

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, target: targetLocale }),
    });
    if (!res.ok) return text;
    const { translated } = await res.json();
    _autoTranslateCache.set(cacheKey, translated);
    return translated;
  } catch {
    return text;
  }
}

export function formatDate(ts, locale = _locale) {
  const config = SUPPORTED_LOCALES[locale] || SUPPORTED_LOCALES.en;
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  const Y = d.getFullYear();
  const M = pad(d.getMonth() + 1);
  const D = pad(d.getDate());

  return config.dateFormat
    .replace('YYYY', Y)
    .replace('MM', M)
    .replace('DD', D);
}

export function formatNumber(n, locale = _locale) {
  try {
    return new Intl.NumberFormat(locale).format(n);
  } catch {
    return String(n);
  }
}

export function formatCurrency(amount, currency = 'USD', locale = _locale) {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}
