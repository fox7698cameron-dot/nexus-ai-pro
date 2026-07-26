// src/i18n/translations.js — 2026-07-26
// Core translation strings for Nexus AI Pro
// Add new keys to 'en' first; other languages fill in automatically via fallback

export const translations = {
  en: {
    app: { name: 'Nexus AI Pro', tagline: 'Military-grade AI platform' },
    nav: { dashboard: 'Dashboard', analytics: 'Analytics', security: 'Security', gamedev: 'Game Dev', settings: 'Settings', admin: 'Admin', logout: 'Logout' },
    auth: {
      signIn: 'Sign In', signUp: 'Sign Up', logout: 'Logout',
      email: 'Email address', password: 'Password', username: 'Username',
      confirmPassword: 'Confirm password',
      forgotPassword: 'Forgot password?',
      twoFactorCode: '2FA Code',
      biometricPrompt: 'Authenticate with biometrics',
      passwordHint: 'At least 13 characters with upper, lower, digit and special character',
      usernameHint: 'Letters, numbers, emoji, _ or - (2–64 chars)',
      loginSuccess: 'Welcome back!', registerSuccess: 'Account created',
      invalidCredentials: 'Invalid email or password',
      mfaRequired: '2FA verification required',
      errors: { required: 'This field is required', invalidEmail: 'Invalid email', passwordTooShort: 'Password too short (13+ chars required)', passwordWeak: 'Password too weak' },
    },
    analytics: {
      title: 'Analytics Dashboard', socialMedia: 'Social Media', projects: 'Projects',
      followers: 'Followers', views: 'Views', likes: 'Likes', shares: 'Shares',
      comments: 'Comments', reach: 'Reach', retention: 'Retention', engagement: 'Engagement',
      impressions: 'Impressions', realtime: 'Real-time', summary: 'Summary',
      connectPlatform: 'Connect Platform', noData: 'No data available',
    },
    security: {
      title: 'Security Dashboard', status: 'Status', threats: 'Threats',
      scan: 'Run Scan', scanning: 'Scanning…', patchAll: 'Patch All',
      lastScan: 'Last scan', encryption: 'Encryption', keyRotation: 'Key rotation',
      auditLog: 'Audit Log', networkMonitor: 'Network Monitor', deviceHealth: 'Device Health',
      safe: 'Safe', warning: 'Warning', critical: 'Critical', resolved: 'Resolved',
    },
    gamedev: {
      title: 'Game Dev Dashboard', projects: 'Projects', achievements: 'Achievements',
      connectors: 'Connectors', newProject: 'New Project', engine: 'Engine',
      progress: 'Progress', buildStatus: 'Build Status', bugCount: 'Open Bugs',
      version: 'Version', tasks: 'Tasks', unlock: 'Unlock Achievement',
    },
    payments: {
      title: 'Subscription', plans: 'Plans', currentPlan: 'Current Plan',
      upgrade: 'Upgrade', downgrade: 'Downgrade', checkout: 'Checkout',
      payWith: 'Pay with', card: 'Card', crypto: 'Crypto', giftCard: 'Gift Card',
      enterCode: 'Enter gift card code', redeem: 'Redeem', success: 'Payment successful',
      cancel: 'Payment cancelled',
    },
    common: {
      loading: 'Loading…', error: 'An error occurred', retry: 'Retry', save: 'Save',
      cancel: 'Cancel', delete: 'Delete', edit: 'Edit', add: 'Add', close: 'Close',
      confirm: 'Confirm', back: 'Back', next: 'Next', submit: 'Submit', search: 'Search',
      noResults: 'No results found', createdAt: 'Created', updatedAt: 'Updated',
    },
  },

  es: {
    app: { name: 'Nexus AI Pro', tagline: 'Plataforma de IA de grado militar' },
    nav: { dashboard: 'Panel', analytics: 'Analíticas', security: 'Seguridad', gamedev: 'Dev de juegos', settings: 'Configuración', admin: 'Admin', logout: 'Cerrar sesión' },
    auth: { signIn: 'Iniciar sesión', signUp: 'Registrarse', email: 'Correo electrónico', password: 'Contraseña', username: 'Nombre de usuario' },
    common: { loading: 'Cargando…', error: 'Ocurrió un error', save: 'Guardar', cancel: 'Cancelar' },
  },

  fr: {
    app: { name: 'Nexus AI Pro', tagline: 'Plateforme IA de niveau militaire' },
    nav: { dashboard: 'Tableau de bord', analytics: 'Analytiques', security: 'Sécurité', gamedev: 'Dév. de jeux', settings: 'Paramètres', admin: 'Admin', logout: 'Déconnexion' },
    auth: { signIn: 'Se connecter', signUp: "S'inscrire", email: 'Adresse e-mail', password: 'Mot de passe', username: "Nom d'utilisateur" },
    common: { loading: 'Chargement…', error: 'Une erreur est survenue', save: 'Sauvegarder', cancel: 'Annuler' },
  },

  de: {
    app: { name: 'Nexus AI Pro', tagline: 'KI-Plattform in Militärqualität' },
    nav: { dashboard: 'Dashboard', analytics: 'Analytik', security: 'Sicherheit', gamedev: 'Spieleentw.', settings: 'Einstellungen', admin: 'Admin', logout: 'Abmelden' },
    auth: { signIn: 'Anmelden', signUp: 'Registrieren', email: 'E-Mail-Adresse', password: 'Passwort', username: 'Benutzername' },
    common: { loading: 'Wird geladen…', error: 'Ein Fehler ist aufgetreten', save: 'Speichern', cancel: 'Abbrechen' },
  },

  ja: {
    app: { name: 'Nexus AI Pro', tagline: '軍事グレードのAIプラットフォーム' },
    nav: { dashboard: 'ダッシュボード', analytics: 'アナリティクス', security: 'セキュリティ', gamedev: 'ゲーム開発', settings: '設定', admin: '管理者', logout: 'ログアウト' },
    auth: { signIn: 'サインイン', signUp: 'アカウント作成', email: 'メールアドレス', password: 'パスワード', username: 'ユーザー名' },
    common: { loading: '読み込み中…', error: 'エラーが発生しました', save: '保存', cancel: 'キャンセル' },
  },

  zh: {
    app: { name: 'Nexus AI Pro', tagline: '军事级AI平台' },
    nav: { dashboard: '仪表板', analytics: '分析', security: '安全', gamedev: '游戏开发', settings: '设置', admin: '管理员', logout: '登出' },
    auth: { signIn: '登录', signUp: '注册', email: '电子邮件', password: '密码', username: '用户名' },
    common: { loading: '加载中…', error: '发生错误', save: '保存', cancel: '取消' },
  },

  pt: {
    app: { name: 'Nexus AI Pro', tagline: 'Plataforma de IA de nível militar' },
    nav: { dashboard: 'Painel', analytics: 'Análises', security: 'Segurança', gamedev: 'Dev de jogos', settings: 'Configurações', admin: 'Admin', logout: 'Sair' },
    auth: { signIn: 'Entrar', signUp: 'Registrar', email: 'E-mail', password: 'Senha', username: 'Nome de usuário' },
    common: { loading: 'Carregando…', error: 'Ocorreu um erro', save: 'Salvar', cancel: 'Cancelar' },
  },

  ar: {
    app: { name: 'Nexus AI Pro', tagline: 'منصة ذكاء اصطناعي بدرجة عسكرية' },
    nav: { dashboard: 'لوحة التحكم', analytics: 'التحليلات', security: 'الأمان', gamedev: 'تطوير الألعاب', settings: 'الإعدادات', admin: 'المسؤول', logout: 'تسجيل الخروج' },
    auth: { signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب', email: 'البريد الإلكتروني', password: 'كلمة المرور', username: 'اسم المستخدم' },
    common: { loading: 'جارٍ التحميل…', error: 'حدث خطأ', save: 'حفظ', cancel: 'إلغاء' },
  },

  ko: {
    app: { name: 'Nexus AI Pro', tagline: '군사급 AI 플랫폼' },
    nav: { dashboard: '대시보드', analytics: '분석', security: '보안', gamedev: '게임 개발', settings: '설정', admin: '관리자', logout: '로그아웃' },
    auth: { signIn: '로그인', signUp: '회원가입', email: '이메일', password: '비밀번호', username: '사용자명' },
    common: { loading: '로딩 중…', error: '오류가 발생했습니다', save: '저장', cancel: '취소' },
  },
};

// Supported locales metadata
export const LOCALES = [
  { code: 'en', name: 'English',    flag: '🇺🇸', dir: 'ltr' },
  { code: 'es', name: 'Español',    flag: '🇪🇸', dir: 'ltr' },
  { code: 'fr', name: 'Français',   flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', name: 'Deutsch',    flag: '🇩🇪', dir: 'ltr' },
  { code: 'ja', name: '日本語',      flag: '🇯🇵', dir: 'ltr' },
  { code: 'zh', name: '中文',        flag: '🇨🇳', dir: 'ltr' },
  { code: 'pt', name: 'Português',  flag: '🇧🇷', dir: 'ltr' },
  { code: 'ar', name: 'العربية',     flag: '🇸🇦', dir: 'rtl' },
  { code: 'ko', name: '한국어',      flag: '🇰🇷', dir: 'ltr' },
];

export const DEFAULT_LOCALE = 'en';
