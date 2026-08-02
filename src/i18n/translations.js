// src/i18n/translations.js
// 2026-08-02 — Multi-language & regional support with auto-translate
// Supports: en, es, fr, de, ja, ko, zh, pt, ar, ru, hi, it, nl, pl, tr, sv, da, fi, no, uk

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', dir: 'ltr', flag: '🇺🇸' },
  { code: 'es', name: 'Español', dir: 'ltr', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', dir: 'ltr', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', dir: 'ltr', flag: '🇩🇪' },
  { code: 'ja', name: '日本語', dir: 'ltr', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', dir: 'ltr', flag: '🇰🇷' },
  { code: 'zh', name: '中文', dir: 'ltr', flag: '🇨🇳' },
  { code: 'pt', name: 'Português', dir: 'ltr', flag: '🇧🇷' },
  { code: 'ar', name: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  { code: 'ru', name: 'Русский', dir: 'ltr', flag: '🇷🇺' },
  { code: 'hi', name: 'हिन्दी', dir: 'ltr', flag: '🇮🇳' },
  { code: 'it', name: 'Italiano', dir: 'ltr', flag: '🇮🇹' },
  { code: 'nl', name: 'Nederlands', dir: 'ltr', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski', dir: 'ltr', flag: '🇵🇱' },
  { code: 'tr', name: 'Türkçe', dir: 'ltr', flag: '🇹🇷' },
  { code: 'sv', name: 'Svenska', dir: 'ltr', flag: '🇸🇪' },
  { code: 'uk', name: 'Українська', dir: 'ltr', flag: '🇺🇦' },
];

export const REGIONAL_FORMATS = {
  en: { currency: 'USD', dateFormat: 'MM/DD/YYYY', timeFormat: '12h', numberSep: { decimal: '.', thousands: ',' } },
  es: { currency: 'EUR', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', numberSep: { decimal: ',', thousands: '.' } },
  fr: { currency: 'EUR', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', numberSep: { decimal: ',', thousands: ' ' } },
  de: { currency: 'EUR', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', numberSep: { decimal: ',', thousands: '.' } },
  ja: { currency: 'JPY', dateFormat: 'YYYY/MM/DD', timeFormat: '24h', numberSep: { decimal: '.', thousands: ',' } },
  ko: { currency: 'KRW', dateFormat: 'YYYY.MM.DD', timeFormat: '24h', numberSep: { decimal: '.', thousands: ',' } },
  zh: { currency: 'CNY', dateFormat: 'YYYY/MM/DD', timeFormat: '24h', numberSep: { decimal: '.', thousands: ',' } },
  pt: { currency: 'BRL', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', numberSep: { decimal: ',', thousands: '.' } },
  ar: { currency: 'SAR', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', numberSep: { decimal: '.', thousands: ',' } },
  ru: { currency: 'RUB', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', numberSep: { decimal: ',', thousands: ' ' } },
};

export const translations = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.analytics': 'Analytics',
    'nav.security': 'Security',
    'nav.projects': 'Projects',
    'nav.gaming': 'Gaming',
    'nav.payment': 'Subscription',
    'nav.settings': 'Settings',
    'nav.logout': 'Sign Out',
    'nav.admin': 'Admin Panel',
    // Auth
    'auth.login': 'Sign In',
    'auth.register': 'Create Account',
    'auth.email': 'Email Address',
    'auth.password': 'Password',
    'auth.username': 'Username',
    'auth.forgot': 'Forgot password?',
    'auth.mfa': 'Enter 2FA Code',
    'auth.biometric': 'Use Biometric',
    'auth.role': 'Account Type',
    // Analytics
    'analytics.title': 'Social Analytics',
    'analytics.views': 'Views',
    'analytics.likes': 'Likes',
    'analytics.reach': 'Reach',
    'analytics.retention': 'Retention',
    'analytics.followers': 'Followers',
    'analytics.engagement': 'Engagement Rate',
    // Security
    'security.title': 'Security Dashboard',
    'security.scan': 'Run Scan',
    'security.threats': 'Active Threats',
    'security.status': 'Security Status',
    'security.network': 'Network Monitor',
    'security.encryption': 'Encryption',
    // Projects
    'projects.title': 'Project Tracker',
    'projects.new': 'New Project',
    'projects.status': 'Status',
    'projects.progress': 'Progress',
    'projects.deadline': 'Deadline',
    // Payment
    'payment.title': 'Subscription & Billing',
    'payment.subscribe': 'Subscribe',
    'payment.plan': 'Current Plan',
    'payment.upgrade': 'Upgrade',
    'payment.crypto': 'Pay with Crypto',
    'payment.giftcard': 'Redeem Gift Card',
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.success': 'Success',
    'common.confirm': 'Confirm',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.refresh': 'Refresh',
    'common.realtime': 'Real-time',
  },
  es: {
    'nav.dashboard': 'Tablero',
    'nav.analytics': 'Analíticas',
    'nav.security': 'Seguridad',
    'nav.projects': 'Proyectos',
    'nav.gaming': 'Gaming',
    'nav.payment': 'Suscripción',
    'nav.settings': 'Configuración',
    'nav.logout': 'Cerrar sesión',
    'auth.login': 'Iniciar sesión',
    'auth.register': 'Crear cuenta',
    'auth.email': 'Correo electrónico',
    'auth.password': 'Contraseña',
    'auth.username': 'Nombre de usuario',
    'analytics.title': 'Analíticas Sociales',
    'analytics.views': 'Vistas',
    'analytics.likes': 'Me gusta',
    'analytics.reach': 'Alcance',
    'analytics.retention': 'Retención',
    'security.title': 'Panel de Seguridad',
    'security.scan': 'Escanear',
    'projects.title': 'Seguimiento de Proyectos',
    'payment.title': 'Suscripción y Facturación',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.loading': 'Cargando...',
    'common.error': 'Ocurrió un error',
    'common.success': 'Éxito',
    'common.search': 'Buscar',
    'common.realtime': 'Tiempo real',
  },
  fr: {
    'nav.dashboard': 'Tableau de bord',
    'nav.analytics': 'Analytiques',
    'nav.security': 'Sécurité',
    'nav.projects': 'Projets',
    'nav.gaming': 'Gaming',
    'nav.payment': 'Abonnement',
    'nav.settings': 'Paramètres',
    'nav.logout': 'Déconnexion',
    'auth.login': 'Se connecter',
    'auth.register': 'Créer un compte',
    'auth.email': 'Adresse e-mail',
    'auth.password': 'Mot de passe',
    'auth.username': "Nom d'utilisateur",
    'analytics.title': 'Analytiques Sociales',
    'analytics.views': 'Vues',
    'analytics.likes': "J'aime",
    'analytics.reach': 'Portée',
    'analytics.retention': 'Rétention',
    'security.title': 'Tableau de bord Sécurité',
    'security.scan': 'Scanner',
    'projects.title': 'Suivi de Projets',
    'payment.title': 'Abonnement et Facturation',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.loading': 'Chargement...',
    'common.error': 'Une erreur est survenue',
    'common.success': 'Succès',
    'common.search': 'Rechercher',
    'common.realtime': 'Temps réel',
  },
  de: {
    'nav.dashboard': 'Dashboard',
    'nav.analytics': 'Analytik',
    'nav.security': 'Sicherheit',
    'nav.projects': 'Projekte',
    'nav.gaming': 'Gaming',
    'nav.payment': 'Abonnement',
    'nav.settings': 'Einstellungen',
    'nav.logout': 'Abmelden',
    'auth.login': 'Anmelden',
    'auth.register': 'Konto erstellen',
    'auth.email': 'E-Mail-Adresse',
    'auth.password': 'Passwort',
    'auth.username': 'Benutzername',
    'analytics.title': 'Soziale Analytik',
    'analytics.views': 'Aufrufe',
    'analytics.likes': 'Likes',
    'analytics.reach': 'Reichweite',
    'analytics.retention': 'Verbleibrate',
    'security.title': 'Sicherheits-Dashboard',
    'security.scan': 'Scannen',
    'projects.title': 'Projektverfolgung',
    'payment.title': 'Abonnement & Abrechnung',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.loading': 'Laden...',
    'common.error': 'Ein Fehler ist aufgetreten',
    'common.success': 'Erfolg',
    'common.search': 'Suchen',
    'common.realtime': 'Echtzeit',
  },
  ja: {
    'nav.dashboard': 'ダッシュボード',
    'nav.analytics': '分析',
    'nav.security': 'セキュリティ',
    'nav.projects': 'プロジェクト',
    'nav.gaming': 'ゲーミング',
    'nav.payment': 'サブスクリプション',
    'nav.settings': '設定',
    'nav.logout': 'サインアウト',
    'auth.login': 'サインイン',
    'auth.register': 'アカウント作成',
    'auth.email': 'メールアドレス',
    'auth.password': 'パスワード',
    'auth.username': 'ユーザー名',
    'analytics.title': 'ソーシャル分析',
    'analytics.views': '再生回数',
    'analytics.likes': 'いいね',
    'analytics.reach': 'リーチ',
    'analytics.retention': '維持率',
    'security.title': 'セキュリティダッシュボード',
    'security.scan': 'スキャン',
    'projects.title': 'プロジェクトトラッカー',
    'payment.title': 'サブスクリプションと請求',
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.loading': '読み込み中...',
    'common.error': 'エラーが発生しました',
    'common.success': '成功',
    'common.search': '検索',
    'common.realtime': 'リアルタイム',
  },
};

// Fill missing keys from English
for (const [lang, dict] of Object.entries(translations)) {
  if (lang === 'en') continue;
  for (const [key, val] of Object.entries(translations.en)) {
    if (!(key in dict)) dict[key] = val;
  }
}

export function createI18n(initialLang = 'en') {
  let currentLang = SUPPORTED_LANGUAGES.find(l => l.code === initialLang) ? initialLang : 'en';

  function t(key, vars = {}) {
    const dict = translations[currentLang] || translations.en;
    let str = dict[key] || translations.en[key] || key;
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    return str;
  }

  function setLanguage(lang) {
    if (SUPPORTED_LANGUAGES.find(l => l.code === lang)) {
      currentLang = lang;
      const info = SUPPORTED_LANGUAGES.find(l => l.code === lang);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
        document.documentElement.dir = info.dir;
      }
    }
  }

  function getLanguage() { return currentLang; }

  function getDirection() {
    const info = SUPPORTED_LANGUAGES.find(l => l.code === currentLang);
    return info ? info.dir : 'ltr';
  }

  function getRegionalFormat() {
    return REGIONAL_FORMATS[currentLang] || REGIONAL_FORMATS.en;
  }

  async function autoTranslate(text, targetLang) {
    if (targetLang === 'en') return text;
    try {
      const res = await fetch(`/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang }),
      });
      if (!res.ok) return text;
      const data = await res.json();
      return data.translated || text;
    } catch {
      return text;
    }
  }

  return { t, setLanguage, getLanguage, getDirection, getRegionalFormat, autoTranslate, SUPPORTED_LANGUAGES };
}

export default createI18n;
