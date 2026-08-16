/**
 * nexus-ai-pro/src/i18n/translations.js
 * Multi-language & regional support with auto-translate capability
 * Date: 2026-08-16
 */

// Supported locales with RTL flag and regional settings
export const LOCALES = {
  'en-US': { name: 'English (US)', dir: 'ltr', region: 'US', flag: '🇺🇸' },
  'en-GB': { name: 'English (UK)', dir: 'ltr', region: 'GB', flag: '🇬🇧' },
  'es-ES': { name: 'Español', dir: 'ltr', region: 'ES', flag: '🇪🇸' },
  'es-MX': { name: 'Español (México)', dir: 'ltr', region: 'MX', flag: '🇲🇽' },
  'fr-FR': { name: 'Français', dir: 'ltr', region: 'FR', flag: '🇫🇷' },
  'de-DE': { name: 'Deutsch', dir: 'ltr', region: 'DE', flag: '🇩🇪' },
  'it-IT': { name: 'Italiano', dir: 'ltr', region: 'IT', flag: '🇮🇹' },
  'pt-BR': { name: 'Português (Brasil)', dir: 'ltr', region: 'BR', flag: '🇧🇷' },
  'pt-PT': { name: 'Português', dir: 'ltr', region: 'PT', flag: '🇵🇹' },
  'ru-RU': { name: 'Русский', dir: 'ltr', region: 'RU', flag: '🇷🇺' },
  'zh-CN': { name: '中文 (简体)', dir: 'ltr', region: 'CN', flag: '🇨🇳' },
  'zh-TW': { name: '中文 (繁體)', dir: 'ltr', region: 'TW', flag: '🇹🇼' },
  'ja-JP': { name: '日本語', dir: 'ltr', region: 'JP', flag: '🇯🇵' },
  'ko-KR': { name: '한국어', dir: 'ltr', region: 'KR', flag: '🇰🇷' },
  'ar-SA': { name: 'العربية', dir: 'rtl', region: 'SA', flag: '🇸🇦' },
  'he-IL': { name: 'עברית', dir: 'rtl', region: 'IL', flag: '🇮🇱' },
  'hi-IN': { name: 'हिन्दी', dir: 'ltr', region: 'IN', flag: '🇮🇳' },
  'tr-TR': { name: 'Türkçe', dir: 'ltr', region: 'TR', flag: '🇹🇷' },
  'pl-PL': { name: 'Polski', dir: 'ltr', region: 'PL', flag: '🇵🇱' },
  'nl-NL': { name: 'Nederlands', dir: 'ltr', region: 'NL', flag: '🇳🇱' },
  'sv-SE': { name: 'Svenska', dir: 'ltr', region: 'SE', flag: '🇸🇪' },
  'no-NO': { name: 'Norsk', dir: 'ltr', region: 'NO', flag: '🇳🇴' },
  'da-DK': { name: 'Dansk', dir: 'ltr', region: 'DK', flag: '🇩🇰' },
  'fi-FI': { name: 'Suomi', dir: 'ltr', region: 'FI', flag: '🇫🇮' },
  'id-ID': { name: 'Bahasa Indonesia', dir: 'ltr', region: 'ID', flag: '🇮🇩' },
  'ms-MY': { name: 'Bahasa Melayu', dir: 'ltr', region: 'MY', flag: '🇲🇾' },
  'th-TH': { name: 'ภาษาไทย', dir: 'ltr', region: 'TH', flag: '🇹🇭' },
  'vi-VN': { name: 'Tiếng Việt', dir: 'ltr', region: 'VN', flag: '🇻🇳' },
  'uk-UA': { name: 'Українська', dir: 'ltr', region: 'UA', flag: '🇺🇦' },
  'cs-CZ': { name: 'Čeština', dir: 'ltr', region: 'CZ', flag: '🇨🇿' },
  'ro-RO': { name: 'Română', dir: 'ltr', region: 'RO', flag: '🇷🇴' },
  'hu-HU': { name: 'Magyar', dir: 'ltr', region: 'HU', flag: '🇭🇺' },
};

// Core UI translations
export const translations = {
  'en-US': {
    // Navigation
    nav: {
      analytics: 'Analytics', security: 'Security', projects: 'Projects',
      admin: 'Admin', chat: 'Chat', settings: 'Settings', logout: 'Sign Out',
      dashboard: 'Dashboard', profile: 'Profile',
    },
    // Auth
    auth: {
      signIn: 'Sign In', signUp: 'Sign Up', email: 'Email',
      password: 'Password', username: 'Username', forgotPassword: 'Forgot Password?',
      createAccount: 'Create Account', or: 'or', biometricLogin: 'Use Biometrics',
      twoFactor: 'Two-Factor Authentication', enterCode: 'Enter verification code',
      passwordMin: 'Password must be at least 13 characters',
      passwordWeak: 'Password too weak', passwordStrong: 'Password strong',
      verificationSent: 'Verification code sent',
      enableMfa: 'Enable Multi-Factor Auth', scanQr: 'Scan QR Code',
      mfaRequired: 'MFA Required', backupCodes: 'Backup Codes',
    },
    // Analytics
    analytics: {
      views: 'Views', likes: 'Likes', reach: 'Reach', retention: 'Retention',
      followers: 'Followers', engagement: 'Engagement Rate',
      impressions: 'Impressions', shares: 'Shares', comments: 'Comments',
      realtime: 'Real-Time', last24h: 'Last 24 Hours', last7d: 'Last 7 Days',
      last30d: 'Last 30 Days', allTime: 'All Time', export: 'Export Data',
      platforms: 'Platforms', noData: 'No data available',
    },
    // Security
    security: {
      scan: 'Run Scan', scanning: 'Scanning...', secure: 'Secure',
      vulnerable: 'Vulnerable', threats: 'Threats', patches: 'Patches',
      networkMonitor: 'Network Monitor', deviceHealth: 'Device Health',
      lastScan: 'Last Scan', score: 'Security Score', firewall: 'Firewall',
      encryption: 'Encryption', audit: 'Audit Log',
    },
    // Projects
    projects: {
      new: 'New Project', open: 'Open', archive: 'Archive', delete: 'Delete',
      status: 'Status', progress: 'Progress', deadline: 'Deadline',
      team: 'Team', tasks: 'Tasks', buildStatus: 'Build Status',
      coverage: 'Test Coverage', lastCommit: 'Last Commit',
    },
    // Checkout
    checkout: {
      subscribe: 'Subscribe', pay: 'Pay Now', total: 'Total',
      monthly: 'Monthly', annual: 'Annual', trial: 'Free Trial',
      cardNumber: 'Card Number', expiry: 'Expiry', cvv: 'CVV',
      crypto: 'Pay with Crypto', giftCard: 'Gift Card', apply: 'Apply',
      secure: 'Secure Checkout', processing: 'Processing...',
    },
    // Common
    common: {
      save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
      add: 'Add', remove: 'Remove', search: 'Search', filter: 'Filter',
      sort: 'Sort', export: 'Export', import: 'Import', refresh: 'Refresh',
      loading: 'Loading...', error: 'Error', success: 'Success',
      warning: 'Warning', confirm: 'Confirm', close: 'Close',
      back: 'Back', next: 'Next', submit: 'Submit', reset: 'Reset',
      enabled: 'Enabled', disabled: 'Disabled', on: 'On', off: 'Off',
    },
  },
  'es-ES': {
    nav: {
      analytics: 'Analíticas', security: 'Seguridad', projects: 'Proyectos',
      admin: 'Administración', chat: 'Chat', settings: 'Configuración',
      logout: 'Cerrar Sesión', dashboard: 'Panel', profile: 'Perfil',
    },
    auth: {
      signIn: 'Iniciar Sesión', signUp: 'Registrarse', email: 'Correo',
      password: 'Contraseña', username: 'Usuario', forgotPassword: '¿Olvidaste tu contraseña?',
      createAccount: 'Crear Cuenta', or: 'o', biometricLogin: 'Usar Biometría',
      twoFactor: 'Autenticación de Dos Factores', enterCode: 'Ingresa el código de verificación',
      passwordMin: 'La contraseña debe tener al menos 13 caracteres',
    },
    analytics: {
      views: 'Vistas', likes: 'Me Gustas', reach: 'Alcance', retention: 'Retención',
      followers: 'Seguidores', engagement: 'Tasa de Engagement',
      realtime: 'En Tiempo Real', last24h: 'Últimas 24 Horas',
    },
    security: {
      scan: 'Escanear', scanning: 'Escaneando...', secure: 'Seguro',
      threats: 'Amenazas', networkMonitor: 'Monitor de Red',
    },
    common: {
      save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar',
      loading: 'Cargando...', error: 'Error', success: 'Éxito', close: 'Cerrar',
      search: 'Buscar', filter: 'Filtrar',
    },
  },
  'fr-FR': {
    nav: {
      analytics: 'Analytique', security: 'Sécurité', projects: 'Projets',
      admin: 'Administration', chat: 'Chat', settings: 'Paramètres',
      logout: 'Déconnexion', dashboard: 'Tableau de bord', profile: 'Profil',
    },
    auth: {
      signIn: 'Se Connecter', signUp: 'S\'inscrire', email: 'Email',
      password: 'Mot de passe', username: 'Nom d\'utilisateur',
      forgotPassword: 'Mot de passe oublié?', createAccount: 'Créer un compte',
      passwordMin: 'Le mot de passe doit comporter au moins 13 caractères',
    },
    common: {
      save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer', edit: 'Modifier',
      loading: 'Chargement...', error: 'Erreur', success: 'Succès', close: 'Fermer',
    },
  },
  'de-DE': {
    nav: {
      analytics: 'Analytik', security: 'Sicherheit', projects: 'Projekte',
      admin: 'Administration', chat: 'Chat', settings: 'Einstellungen',
      logout: 'Abmelden', dashboard: 'Dashboard', profile: 'Profil',
    },
    auth: {
      signIn: 'Anmelden', signUp: 'Registrieren', email: 'E-Mail',
      password: 'Passwort', username: 'Benutzername',
      passwordMin: 'Passwort muss mindestens 13 Zeichen haben',
    },
    common: {
      save: 'Speichern', cancel: 'Abbrechen', delete: 'Löschen', edit: 'Bearbeiten',
      loading: 'Laden...', error: 'Fehler', success: 'Erfolg', close: 'Schließen',
    },
  },
  'ja-JP': {
    nav: {
      analytics: 'アナリティクス', security: 'セキュリティ', projects: 'プロジェクト',
      admin: '管理', chat: 'チャット', settings: '設定',
      logout: 'ログアウト', dashboard: 'ダッシュボード', profile: 'プロフィール',
    },
    auth: {
      signIn: 'ログイン', signUp: '登録', email: 'メール',
      password: 'パスワード', username: 'ユーザー名',
      passwordMin: 'パスワードは13文字以上必要です',
    },
    common: {
      save: '保存', cancel: 'キャンセル', delete: '削除', edit: '編集',
      loading: '読み込み中...', error: 'エラー', success: '成功', close: '閉じる',
    },
  },
  'zh-CN': {
    nav: {
      analytics: '分析', security: '安全', projects: '项目',
      admin: '管理员', chat: '聊天', settings: '设置',
      logout: '退出', dashboard: '仪表板', profile: '个人资料',
    },
    auth: {
      signIn: '登录', signUp: '注册', email: '邮箱',
      password: '密码', username: '用户名',
      passwordMin: '密码至少需要13个字符',
    },
    common: {
      save: '保存', cancel: '取消', delete: '删除', edit: '编辑',
      loading: '加载中...', error: '错误', success: '成功', close: '关闭',
    },
  },
  'ar-SA': {
    nav: {
      analytics: 'التحليلات', security: 'الأمان', projects: 'المشاريع',
      admin: 'الإدارة', chat: 'الدردشة', settings: 'الإعدادات',
      logout: 'تسجيل الخروج', dashboard: 'لوحة التحكم', profile: 'الملف الشخصي',
    },
    auth: {
      signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب', email: 'البريد الإلكتروني',
      password: 'كلمة المرور', username: 'اسم المستخدم',
      passwordMin: 'يجب أن تتكون كلمة المرور من 13 حرفاً على الأقل',
    },
    common: {
      save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل',
      loading: 'جار التحميل...', error: 'خطأ', success: 'نجاح', close: 'إغلاق',
    },
  },
  'pt-BR': {
    nav: {
      analytics: 'Análises', security: 'Segurança', projects: 'Projetos',
      admin: 'Administração', chat: 'Chat', settings: 'Configurações',
      logout: 'Sair', dashboard: 'Painel', profile: 'Perfil',
    },
    auth: {
      signIn: 'Entrar', signUp: 'Cadastrar', email: 'Email',
      password: 'Senha', username: 'Nome de usuário',
      passwordMin: 'A senha deve ter pelo menos 13 caracteres',
    },
    common: {
      save: 'Salvar', cancel: 'Cancelar', delete: 'Excluir', edit: 'Editar',
      loading: 'Carregando...', error: 'Erro', success: 'Sucesso', close: 'Fechar',
    },
  },
  'ko-KR': {
    nav: {
      analytics: '분석', security: '보안', projects: '프로젝트',
      admin: '관리자', chat: '채팅', settings: '설정',
      logout: '로그아웃', dashboard: '대시보드', profile: '프로필',
    },
    auth: {
      signIn: '로그인', signUp: '회원가입', email: '이메일',
      password: '비밀번호', username: '사용자 이름',
      passwordMin: '비밀번호는 최소 13자 이상이어야 합니다',
    },
    common: {
      save: '저장', cancel: '취소', delete: '삭제', edit: '편집',
      loading: '로딩 중...', error: '오류', success: '성공', close: '닫기',
    },
  },
};

// Deep-merge helper for fallback to en-US
function deepGet(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

/**
 * i18n service class for runtime use
 */
export class I18nService {
  constructor(locale = 'en-US') {
    this.locale = locale;
    this.fallback = 'en-US';
    this.cache = new Map();
    this.autoTranslateCache = new Map();
  }

  setLocale(locale) {
    if (LOCALES[locale]) {
      this.locale = locale;
      this.cache.clear();
    }
  }

  /** Resolve locale from browser navigator */
  detectBrowserLocale() {
    const lang = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
    if (LOCALES[lang]) return lang;
    const base = lang.split('-')[0];
    const match = Object.keys(LOCALES).find(l => l.startsWith(base));
    return match || 'en-US';
  }

  /**
   * Translate a key like 'auth.signIn'
   */
  t(key, vars = {}) {
    const cacheKey = `${this.locale}:${key}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    const localeData = translations[this.locale] || {};
    const fallbackData = translations[this.fallback] || {};

    let value = deepGet(localeData, key) || deepGet(fallbackData, key) || key;

    // Variable interpolation: {{name}} patterns
    if (vars && typeof value === 'string') {
      value = value.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] !== undefined ? vars[k] : `{{${k}}}`);
    }

    this.cache.set(cacheKey, value);
    return value;
  }

  /** Get text direction for current locale */
  getDir() {
    return LOCALES[this.locale]?.dir || 'ltr';
  }

  /** Format number per locale */
  formatNumber(num) {
    try {
      return new Intl.NumberFormat(this.locale).format(num);
    } catch {
      return String(num);
    }
  }

  /** Format currency per locale */
  formatCurrency(amount, currency = 'USD') {
    try {
      return new Intl.NumberFormat(this.locale, { style: 'currency', currency }).format(amount);
    } catch {
      return `${currency} ${amount}`;
    }
  }

  /** Format date per locale */
  formatDate(date, options = {}) {
    try {
      return new Intl.DateTimeFormat(this.locale, options).format(new Date(date));
    } catch {
      return String(date);
    }
  }

  /** Format relative time */
  formatRelativeTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    try {
      const rtf = new Intl.RelativeTimeFormat(this.locale, { numeric: 'auto' });
      if (days > 0) return rtf.format(-days, 'day');
      if (hours > 0) return rtf.format(-hours, 'hour');
      if (minutes > 0) return rtf.format(-minutes, 'minute');
      return rtf.format(-seconds, 'second');
    } catch {
      return `${days}d ago`;
    }
  }

  /**
   * Auto-translate via server endpoint (for strings not in translation table)
   * Falls back to original string if API unavailable
   */
  async autoTranslate(text, targetLocale = this.locale) {
    if (targetLocale === 'en-US') return text;
    const cacheKey = `${targetLocale}:${text}`;
    if (this.autoTranslateCache.has(cacheKey)) {
      return this.autoTranslateCache.get(cacheKey);
    }
    try {
      const resp = await fetch('/api/i18n/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLocale }),
      });
      if (!resp.ok) return text;
      const { translated } = await resp.json();
      this.autoTranslateCache.set(cacheKey, translated);
      return translated;
    } catch {
      return text;
    }
  }

  /** Get list of all supported locales */
  getSupportedLocales() {
    return Object.entries(LOCALES).map(([code, info]) => ({ code, ...info }));
  }
}

// Singleton default instance
export const i18n = new I18nService();
export default i18n;
