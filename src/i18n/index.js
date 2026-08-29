/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * src/i18n/index.js
 * Multi-language & regional support with auto-translation scaffolding.
 * Date: 2026-08-29
 *
 * Supported locales: en, es, fr, de, ja, ko, zh, ar, pt, ru, hi, it, nl, sv, pl
 * RTL locales: ar
 * Usage:
 *   import { t, setLocale, getLocale, LOCALES } from './src/i18n/index.js';
 *   t('auth.login')          → 'Sign In'
 *   setLocale('es')          → switches to Spanish
 */

// ── Locale catalogue ───────────────────────────────────────────────────────
export const LOCALES = {
  en: { label: 'English',    flag: '🇺🇸', rtl: false, region: 'en-US' },
  es: { label: 'Español',    flag: '🇪🇸', rtl: false, region: 'es-ES' },
  fr: { label: 'Français',   flag: '🇫🇷', rtl: false, region: 'fr-FR' },
  de: { label: 'Deutsch',    flag: '🇩🇪', rtl: false, region: 'de-DE' },
  ja: { label: '日本語',      flag: '🇯🇵', rtl: false, region: 'ja-JP' },
  ko: { label: '한국어',      flag: '🇰🇷', rtl: false, region: 'ko-KR' },
  zh: { label: '中文',        flag: '🇨🇳', rtl: false, region: 'zh-CN' },
  ar: { label: 'العربية',    flag: '🇸🇦', rtl: true,  region: 'ar-SA' },
  pt: { label: 'Português',  flag: '🇧🇷', rtl: false, region: 'pt-BR' },
  ru: { label: 'Русский',    flag: '🇷🇺', rtl: false, region: 'ru-RU' },
  hi: { label: 'हिंदी',       flag: '🇮🇳', rtl: false, region: 'hi-IN' },
  it: { label: 'Italiano',   flag: '🇮🇹', rtl: false, region: 'it-IT' },
  nl: { label: 'Nederlands', flag: '🇳🇱', rtl: false, region: 'nl-NL' },
  sv: { label: 'Svenska',    flag: '🇸🇪', rtl: false, region: 'sv-SE' },
  pl: { label: 'Polski',     flag: '🇵🇱', rtl: false, region: 'pl-PL' },
};

// ── Translation strings ────────────────────────────────────────────────────
const strings = {
  en: {
    'auth.login':              'Sign In',
    'auth.logout':             'Sign Out',
    'auth.register':           'Create Account',
    'auth.email':              'Email Address',
    'auth.password':           'Password',
    'auth.username':           'Username',
    'auth.mfa':                'Multi-Factor Authentication',
    'auth.biometric':          'Use Biometrics',
    'auth.forgotPassword':     'Forgot Password?',
    'auth.passwordStrength':   'Password must be 13+ characters with uppercase, lowercase, numbers & symbols',
    'auth.invalidCredentials': 'Invalid credentials',
    'auth.sessionExpired':     'Session expired — please sign in again',
    'nav.dashboard':           'Dashboard',
    'nav.analytics':           'Analytics',
    'nav.security':            'Security',
    'nav.projects':            'Projects',
    'nav.gaming':              'Gaming',
    'nav.settings':            'Settings',
    'nav.billing':             'Billing',
    'analytics.title':         'Social Analytics',
    'analytics.reach':         'Reach',
    'analytics.views':         'Views',
    'analytics.retention':     'Retention',
    'analytics.likes':         'Likes',
    'analytics.engagement':    'Engagement Rate',
    'analytics.followers':     'Followers',
    'analytics.growth':        'Growth',
    'analytics.realtime':      'Live',
    'security.title':          'Security Dashboard',
    'security.scan':           'Run Scan',
    'security.threats':        'Active Threats',
    'security.score':          'Security Score',
    'security.network':        'Network Status',
    'security.encryption':     'Encryption',
    'projects.title':          'Project Tracker',
    'projects.new':            'New Project',
    'projects.status':         'Status',
    'projects.progress':       'Progress',
    'gaming.title':            'Game Dashboard',
    'gaming.achievements':     'Achievements',
    'gaming.progress':         'Progress',
    'billing.subscribe':       'Subscribe',
    'billing.manage':          'Manage Billing',
    'billing.plan':            'Current Plan',
    'common.loading':          'Loading…',
    'common.error':            'An error occurred',
    'common.save':             'Save',
    'common.cancel':           'Cancel',
    'common.delete':           'Delete',
    'common.search':           'Search',
    'common.filter':           'Filter',
    'common.export':           'Export',
    'common.refresh':          'Refresh',
    'common.realtime':         'Real-time',
  },
  es: {
    'auth.login':              'Iniciar Sesión',
    'auth.logout':             'Cerrar Sesión',
    'auth.register':           'Crear Cuenta',
    'auth.email':              'Correo Electrónico',
    'auth.password':           'Contraseña',
    'auth.username':           'Nombre de Usuario',
    'auth.mfa':                'Autenticación Multifactor',
    'auth.biometric':          'Usar Biometría',
    'auth.forgotPassword':     '¿Olvidó su Contraseña?',
    'auth.passwordStrength':   'La contraseña debe tener 13+ caracteres con mayúsculas, minúsculas, números y símbolos',
    'auth.invalidCredentials': 'Credenciales inválidas',
    'auth.sessionExpired':     'Sesión expirada — vuelva a iniciar sesión',
    'nav.dashboard':           'Panel',
    'nav.analytics':           'Analítica',
    'nav.security':            'Seguridad',
    'nav.projects':            'Proyectos',
    'nav.gaming':              'Juegos',
    'nav.settings':            'Configuración',
    'nav.billing':             'Facturación',
    'analytics.title':         'Analítica Social',
    'analytics.reach':         'Alcance',
    'analytics.views':         'Vistas',
    'analytics.retention':     'Retención',
    'analytics.likes':         'Me gusta',
    'analytics.engagement':    'Tasa de Interacción',
    'analytics.followers':     'Seguidores',
    'analytics.growth':        'Crecimiento',
    'analytics.realtime':      'En Vivo',
    'security.title':          'Panel de Seguridad',
    'security.scan':           'Ejecutar Escaneo',
    'security.threats':        'Amenazas Activas',
    'security.score':          'Puntuación de Seguridad',
    'security.network':        'Estado de Red',
    'security.encryption':     'Cifrado',
    'projects.title':          'Seguimiento de Proyectos',
    'projects.new':            'Nuevo Proyecto',
    'projects.status':         'Estado',
    'projects.progress':       'Progreso',
    'gaming.title':            'Panel de Juegos',
    'gaming.achievements':     'Logros',
    'gaming.progress':         'Progreso',
    'billing.subscribe':       'Suscribirse',
    'billing.manage':          'Gestionar Facturación',
    'billing.plan':            'Plan Actual',
    'common.loading':          'Cargando…',
    'common.error':            'Se produjo un error',
    'common.save':             'Guardar',
    'common.cancel':           'Cancelar',
    'common.delete':           'Eliminar',
    'common.search':           'Buscar',
    'common.filter':           'Filtrar',
    'common.export':           'Exportar',
    'common.refresh':          'Actualizar',
    'common.realtime':         'Tiempo Real',
  },
  fr: {
    'auth.login':              'Se Connecter',
    'auth.logout':             'Se Déconnecter',
    'auth.register':           'Créer un Compte',
    'auth.email':              'Adresse Email',
    'auth.password':           'Mot de Passe',
    'auth.username':           "Nom d'Utilisateur",
    'auth.mfa':                'Authentification Multi-Facteurs',
    'auth.biometric':          'Utiliser la Biométrie',
    'auth.forgotPassword':     'Mot de Passe Oublié ?',
    'auth.passwordStrength':   'Le mot de passe doit contenir 13+ caractères avec majuscules, minuscules, chiffres et symboles',
    'auth.invalidCredentials': 'Identifiants invalides',
    'auth.sessionExpired':     'Session expirée — veuillez vous reconnecter',
    'nav.dashboard':           'Tableau de Bord',
    'nav.analytics':           'Analytique',
    'nav.security':            'Sécurité',
    'nav.projects':            'Projets',
    'nav.gaming':              'Jeux',
    'nav.settings':            'Paramètres',
    'nav.billing':             'Facturation',
    'analytics.title':         'Analytique Sociale',
    'analytics.reach':         'Portée',
    'analytics.views':         'Vues',
    'analytics.retention':     'Rétention',
    'analytics.likes':         "J'aime",
    'analytics.engagement':    "Taux d'Engagement",
    'analytics.followers':     'Abonnés',
    'analytics.growth':        'Croissance',
    'analytics.realtime':      'En Direct',
    'security.title':          'Tableau de Bord Sécurité',
    'security.scan':           'Lancer un Scan',
    'security.threats':        'Menaces Actives',
    'security.score':          'Score de Sécurité',
    'security.network':        'État du Réseau',
    'security.encryption':     'Chiffrement',
    'projects.title':          'Suivi de Projets',
    'projects.new':            'Nouveau Projet',
    'projects.status':         'Statut',
    'projects.progress':       'Progrès',
    'gaming.title':            'Tableau de Bord Jeux',
    'gaming.achievements':     'Succès',
    'gaming.progress':         'Progrès',
    'billing.subscribe':       "S'abonner",
    'billing.manage':          'Gérer la Facturation',
    'billing.plan':            'Plan Actuel',
    'common.loading':          'Chargement…',
    'common.error':            "Une erreur s'est produite",
    'common.save':             'Enregistrer',
    'common.cancel':           'Annuler',
    'common.delete':           'Supprimer',
    'common.search':           'Rechercher',
    'common.filter':           'Filtrer',
    'common.export':           'Exporter',
    'common.refresh':          'Actualiser',
    'common.realtime':         'Temps Réel',
  },
  de: {
    'auth.login':              'Anmelden',
    'auth.logout':             'Abmelden',
    'auth.register':           'Konto Erstellen',
    'auth.email':              'E-Mail-Adresse',
    'auth.password':           'Passwort',
    'auth.username':           'Benutzername',
    'auth.mfa':                'Multi-Faktor-Authentifizierung',
    'auth.biometric':          'Biometrie Verwenden',
    'auth.forgotPassword':     'Passwort Vergessen?',
    'auth.passwordStrength':   'Das Passwort muss 13+ Zeichen mit Groß-/Kleinbuchstaben, Zahlen und Symbolen enthalten',
    'auth.invalidCredentials': 'Ungültige Anmeldedaten',
    'auth.sessionExpired':     'Sitzung abgelaufen — bitte erneut anmelden',
    'nav.dashboard':           'Dashboard',
    'nav.analytics':           'Analytik',
    'nav.security':            'Sicherheit',
    'nav.projects':            'Projekte',
    'nav.gaming':              'Gaming',
    'nav.settings':            'Einstellungen',
    'nav.billing':             'Abrechnung',
    'analytics.title':         'Soziale Analytik',
    'analytics.reach':         'Reichweite',
    'analytics.views':         'Aufrufe',
    'analytics.retention':     'Bindungsrate',
    'analytics.likes':         'Gefällt mir',
    'analytics.engagement':    'Engagement-Rate',
    'analytics.followers':     'Follower',
    'analytics.growth':        'Wachstum',
    'analytics.realtime':      'Live',
    'security.title':          'Sicherheits-Dashboard',
    'security.scan':           'Scan Ausführen',
    'security.threats':        'Aktive Bedrohungen',
    'security.score':          'Sicherheitspunktzahl',
    'security.network':        'Netzwerkstatus',
    'security.encryption':     'Verschlüsselung',
    'projects.title':          'Projektverfolgung',
    'projects.new':            'Neues Projekt',
    'projects.status':         'Status',
    'projects.progress':       'Fortschritt',
    'gaming.title':            'Gaming-Dashboard',
    'gaming.achievements':     'Erfolge',
    'gaming.progress':         'Fortschritt',
    'billing.subscribe':       'Abonnieren',
    'billing.manage':          'Abrechnung Verwalten',
    'billing.plan':            'Aktueller Plan',
    'common.loading':          'Wird geladen…',
    'common.error':            'Ein Fehler ist aufgetreten',
    'common.save':             'Speichern',
    'common.cancel':           'Abbrechen',
    'common.delete':           'Löschen',
    'common.search':           'Suchen',
    'common.filter':           'Filtern',
    'common.export':           'Exportieren',
    'common.refresh':          'Aktualisieren',
    'common.realtime':         'Echtzeit',
  },
  ja: {
    'auth.login':              'サインイン',
    'auth.logout':             'サインアウト',
    'auth.register':           'アカウント作成',
    'auth.email':              'メールアドレス',
    'auth.password':           'パスワード',
    'auth.username':           'ユーザー名',
    'auth.mfa':                '多要素認証',
    'auth.biometric':          '生体認証を使用',
    'auth.forgotPassword':     'パスワードをお忘れですか？',
    'auth.passwordStrength':   'パスワードは大文字・小文字・数字・記号を含む13文字以上が必要です',
    'auth.invalidCredentials': '認証情報が無効です',
    'auth.sessionExpired':     'セッションが切れました。再度サインインしてください',
    'nav.dashboard':           'ダッシュボード',
    'nav.analytics':           'アナリティクス',
    'nav.security':            'セキュリティ',
    'nav.projects':            'プロジェクト',
    'nav.gaming':              'ゲーミング',
    'nav.settings':            '設定',
    'nav.billing':             '請求',
    'analytics.title':         'ソーシャル分析',
    'analytics.reach':         'リーチ',
    'analytics.views':         '再生回数',
    'analytics.retention':     '視聴維持率',
    'analytics.likes':         'いいね',
    'analytics.engagement':    'エンゲージメント率',
    'analytics.followers':     'フォロワー',
    'analytics.growth':        '成長率',
    'analytics.realtime':      'ライブ',
    'security.title':          'セキュリティダッシュボード',
    'security.scan':           'スキャン実行',
    'security.threats':        'アクティブな脅威',
    'security.score':          'セキュリティスコア',
    'security.network':        'ネットワーク状態',
    'security.encryption':     '暗号化',
    'projects.title':          'プロジェクトトラッカー',
    'projects.new':            '新規プロジェクト',
    'projects.status':         'ステータス',
    'projects.progress':       '進捗',
    'gaming.title':            'ゲームダッシュボード',
    'gaming.achievements':     '実績',
    'gaming.progress':         '進捗',
    'billing.subscribe':       '購読',
    'billing.manage':          '請求管理',
    'billing.plan':            '現在のプラン',
    'common.loading':          '読み込み中…',
    'common.error':            'エラーが発生しました',
    'common.save':             '保存',
    'common.cancel':           'キャンセル',
    'common.delete':           '削除',
    'common.search':           '検索',
    'common.filter':           'フィルター',
    'common.export':           'エクスポート',
    'common.refresh':          '更新',
    'common.realtime':         'リアルタイム',
  },
  ko: {
    'auth.login':              '로그인',
    'auth.logout':             '로그아웃',
    'auth.register':           '계정 만들기',
    'nav.dashboard':           '대시보드',
    'nav.analytics':           '분석',
    'nav.security':            '보안',
    'nav.projects':            '프로젝트',
    'nav.gaming':              '게임',
    'nav.settings':            '설정',
    'nav.billing':             '결제',
    'common.loading':          '로딩 중…',
    'common.error':            '오류가 발생했습니다',
    'common.save':             '저장',
    'common.cancel':           '취소',
  },
  zh: {
    'auth.login':              '登录',
    'auth.logout':             '退出登录',
    'auth.register':           '创建账号',
    'nav.dashboard':           '仪表板',
    'nav.analytics':           '分析',
    'nav.security':            '安全',
    'nav.projects':            '项目',
    'nav.gaming':              '游戏',
    'nav.settings':            '设置',
    'nav.billing':             '账单',
    'common.loading':          '加载中…',
    'common.error':            '发生错误',
    'common.save':             '保存',
    'common.cancel':           '取消',
  },
  ar: {
    'auth.login':              'تسجيل الدخول',
    'auth.logout':             'تسجيل الخروج',
    'auth.register':           'إنشاء حساب',
    'nav.dashboard':           'لوحة التحكم',
    'nav.analytics':           'التحليلات',
    'nav.security':            'الأمان',
    'nav.projects':            'المشاريع',
    'nav.gaming':              'الألعاب',
    'nav.settings':            'الإعدادات',
    'nav.billing':             'الفواتير',
    'common.loading':          'جارٍ التحميل…',
    'common.error':            'حدث خطأ',
    'common.save':             'حفظ',
    'common.cancel':           'إلغاء',
  },
  pt: {
    'auth.login':              'Entrar',
    'auth.logout':             'Sair',
    'auth.register':           'Criar Conta',
    'nav.dashboard':           'Painel',
    'nav.analytics':           'Análises',
    'nav.security':            'Segurança',
    'nav.projects':            'Projetos',
    'nav.gaming':              'Jogos',
    'nav.settings':            'Configurações',
    'nav.billing':             'Faturamento',
    'common.loading':          'Carregando…',
    'common.error':            'Ocorreu um erro',
    'common.save':             'Salvar',
    'common.cancel':           'Cancelar',
  },
  ru: {
    'auth.login':              'Войти',
    'auth.logout':             'Выйти',
    'auth.register':           'Создать Аккаунт',
    'nav.dashboard':           'Панель',
    'nav.analytics':           'Аналитика',
    'nav.security':            'Безопасность',
    'nav.projects':            'Проекты',
    'nav.gaming':              'Игры',
    'nav.settings':            'Настройки',
    'nav.billing':             'Оплата',
    'common.loading':          'Загрузка…',
    'common.error':            'Произошла ошибка',
    'common.save':             'Сохранить',
    'common.cancel':           'Отмена',
  },
};

// ── Runtime state ───────────────────────────────────────────────────────────
let _locale = 'en';

/** Detect best locale from browser or saved preference */
export function detectLocale() {
  try {
    const saved = localStorage.getItem('nexus:locale');
    if (saved && LOCALES[saved]) return saved;
  } catch (_) { /* SSR / Node env */ }

  const nav = (typeof navigator !== 'undefined' && navigator.language) || 'en';
  const code = nav.slice(0, 2).toLowerCase();
  return LOCALES[code] ? code : 'en';
}

/** Return current locale code */
export function getLocale() { return _locale; }

/** Switch active locale. Updates document direction for RTL. */
export function setLocale(locale) {
  if (!LOCALES[locale]) return;
  _locale = locale;

  try {
    localStorage.setItem('nexus:locale', locale);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = LOCALES[locale].region;
      document.documentElement.dir  = LOCALES[locale].rtl ? 'rtl' : 'ltr';
    }
  } catch (_) { /* SSR */ }
}

/**
 * Translate a key.
 * Falls back: current locale → en → key itself.
 * Supports interpolation: t('auth.hello', { name: 'Alice' }) → 'Hello, Alice!'
 */
export function t(key, vars = {}) {
  const locale  = strings[_locale]  || {};
  const fallback = strings['en']     || {};
  let   text    = locale[key] ?? fallback[key] ?? key;

  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), v);
  }
  return text;
}

/** Format a number per locale (e.g. 1,234 vs 1.234) */
export function formatNumber(n, opts = {}) {
  const region = LOCALES[_locale]?.region ?? 'en-US';
  return new Intl.NumberFormat(region, opts).format(n);
}

/** Format a date per locale */
export function formatDate(date, opts = { dateStyle: 'medium' }) {
  const region = LOCALES[_locale]?.region ?? 'en-US';
  return new Intl.DateTimeFormat(region, opts).format(date instanceof Date ? date : new Date(date));
}

/** Format currency per locale */
export function formatCurrency(amount, currency = 'USD') {
  const region = LOCALES[_locale]?.region ?? 'en-US';
  return new Intl.NumberFormat(region, { style: 'currency', currency }).format(amount);
}

/** Auto-translate a string via server-side translation API (async) */
export async function autoTranslate(text, targetLocale = _locale) {
  if (targetLocale === 'en') return text;
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLocale }),
    });
    if (!res.ok) return text;
    const json = await res.json();
    return json.translated ?? text;
  } catch (_) {
    return text;
  }
}

// Initialise on load
if (typeof window !== 'undefined') {
  setLocale(detectLocale());
}
