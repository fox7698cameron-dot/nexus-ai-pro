/**
 * Nexus AI Pro — i18n / Multi-language Service
 * Language detection, bundled translations, auto-translate fallback via env-configured API,
 * RTL support, regional number/date formatting.
 * date: 2026-06-08
 */

// ── Supported locales ─────────────────────────────────────────────────────────

export const SUPPORTED_LOCALES = Object.freeze([
  { code: 'en', name: 'English', dir: 'ltr', region: 'US' },
  { code: 'es', name: 'Español', dir: 'ltr', region: 'ES' },
  { code: 'fr', name: 'Français', dir: 'ltr', region: 'FR' },
  { code: 'de', name: 'Deutsch', dir: 'ltr', region: 'DE' },
  { code: 'pt', name: 'Português', dir: 'ltr', region: 'BR' },
  { code: 'zh', name: '中文', dir: 'ltr', region: 'CN' },
  { code: 'ja', name: '日本語', dir: 'ltr', region: 'JP' },
  { code: 'ko', name: '한국어', dir: 'ltr', region: 'KR' },
  { code: 'ar', name: 'العربية', dir: 'rtl', region: 'SA' },
  { code: 'hi', name: 'हिन्दी', dir: 'ltr', region: 'IN' },
  { code: 'ru', name: 'Русский', dir: 'ltr', region: 'RU' },
  { code: 'tr', name: 'Türkçe', dir: 'ltr', region: 'TR' },
  { code: 'it', name: 'Italiano', dir: 'ltr', region: 'IT' },
  { code: 'nl', name: 'Nederlands', dir: 'ltr', region: 'NL' },
  { code: 'pl', name: 'Polski', dir: 'ltr', region: 'PL' },
  { code: 'sv', name: 'Svenska', dir: 'ltr', region: 'SE' },
  { code: 'uk', name: 'Українська', dir: 'ltr', region: 'UA' },
  { code: 'vi', name: 'Tiếng Việt', dir: 'ltr', region: 'VN' },
  { code: 'th', name: 'ภาษาไทย', dir: 'ltr', region: 'TH' },
  { code: 'id', name: 'Bahasa Indonesia', dir: 'ltr', region: 'ID' },
]);

export const RTL_LOCALES = new Set(SUPPORTED_LOCALES.filter(l => l.dir === 'rtl').map(l => l.code));

// ── Bundled English base strings ──────────────────────────────────────────────

const translations = {
  en: {
    common: {
      save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', create: 'Create',
      confirm: 'Confirm', back: 'Back', next: 'Next', loading: 'Loading...', error: 'Error',
      success: 'Success', warning: 'Warning', search: 'Search', filter: 'Filter', export: 'Export',
    },
    auth: {
      signIn: 'Sign In', signUp: 'Sign Up', signOut: 'Sign Out', email: 'Email',
      password: 'Password', username: 'Username', forgotPassword: 'Forgot password?',
      enableTwoFactor: 'Enable Two-Factor Authentication', biometricPrompt: 'Authenticate with biometrics',
      passwordRequirements: 'Password must be ≥ 13 characters with uppercase, lowercase, number, and special character',
    },
    dashboard: {
      overview: 'Overview', analytics: 'Analytics', security: 'Security',
      projects: 'Projects', settings: 'Settings', admin: 'Admin', developers: 'Developers',
    },
    analytics: {
      totalFollowers: 'Total Followers', totalViews: 'Total Views', engagement: 'Engagement Rate',
      reach: 'Reach', retention: 'Retention', growth: 'Growth', topPosts: 'Top Posts',
    },
    security: {
      status: 'Security Status', scan: 'Run Scan', threat: 'Threat', vulnerability: 'Vulnerability',
      patch: 'Apply Patch', auditLog: 'Audit Log', networkScan: 'Network Scan', deviceHealth: 'Device Health',
    },
    payments: {
      subscribe: 'Subscribe', checkout: 'Checkout', plan: 'Plan', billing: 'Billing',
      giftCard: 'Gift Card', redeemCode: 'Redeem Code', cryptoPayment: 'Crypto Payment',
    },
    projects: {
      newProject: 'New Project', milestone: 'Milestone', achievement: 'Achievement',
      progress: 'Progress', platform: 'Platform', teamMembers: 'Team Members',
    },
  },
  es: {
    common: {
      save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar', create: 'Crear',
      confirm: 'Confirmar', back: 'Atrás', next: 'Siguiente', loading: 'Cargando...', error: 'Error',
      success: 'Éxito', warning: 'Advertencia', search: 'Buscar', filter: 'Filtrar', export: 'Exportar',
    },
    auth: {
      signIn: 'Iniciar sesión', signUp: 'Registrarse', signOut: 'Cerrar sesión',
      email: 'Correo electrónico', password: 'Contraseña', username: 'Nombre de usuario',
      forgotPassword: '¿Olvidaste tu contraseña?', enableTwoFactor: 'Activar autenticación de dos factores',
      biometricPrompt: 'Autenticar con biometría',
      passwordRequirements: 'La contraseña debe tener ≥ 13 caracteres con mayúsculas, minúsculas, número y carácter especial',
    },
    dashboard: {
      overview: 'Resumen', analytics: 'Análisis', security: 'Seguridad',
      projects: 'Proyectos', settings: 'Configuración', admin: 'Administrador', developers: 'Desarrolladores',
    },
  },
  fr: {
    common: {
      save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer', edit: 'Modifier', create: 'Créer',
      confirm: 'Confirmer', back: 'Retour', next: 'Suivant', loading: 'Chargement...', error: 'Erreur',
      success: 'Succès', warning: 'Avertissement', search: 'Rechercher', filter: 'Filtrer', export: 'Exporter',
    },
    auth: {
      signIn: 'Se connecter', signUp: "S'inscrire", signOut: 'Se déconnecter',
      email: 'E-mail', password: 'Mot de passe', username: "Nom d'utilisateur",
      forgotPassword: 'Mot de passe oublié?', enableTwoFactor: "Activer l'authentification à deux facteurs",
      biometricPrompt: "S'authentifier avec la biométrie",
      passwordRequirements: 'Le mot de passe doit comporter ≥ 13 caractères avec majuscules, minuscules, chiffre et caractère spécial',
    },
    dashboard: {
      overview: 'Vue d\'ensemble', analytics: 'Analytique', security: 'Sécurité',
      projects: 'Projets', settings: 'Paramètres', admin: 'Administrateur', developers: 'Développeurs',
    },
  },
  de: {
    common: {
      save: 'Speichern', cancel: 'Abbrechen', delete: 'Löschen', edit: 'Bearbeiten', create: 'Erstellen',
      confirm: 'Bestätigen', back: 'Zurück', next: 'Weiter', loading: 'Laden...', error: 'Fehler',
      success: 'Erfolg', warning: 'Warnung', search: 'Suchen', filter: 'Filtern', export: 'Exportieren',
    },
    auth: {
      signIn: 'Anmelden', signUp: 'Registrieren', signOut: 'Abmelden',
      email: 'E-Mail', password: 'Passwort', username: 'Benutzername',
      forgotPassword: 'Passwort vergessen?',
    },
    dashboard: { overview: 'Übersicht', analytics: 'Analytik', security: 'Sicherheit', projects: 'Projekte' },
  },
  ar: {
    common: {
      save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل', create: 'إنشاء',
      confirm: 'تأكيد', back: 'رجوع', next: 'التالي', loading: 'جارٍ التحميل...', error: 'خطأ',
      success: 'نجاح', warning: 'تحذير', search: 'بحث', filter: 'تصفية', export: 'تصدير',
    },
    auth: {
      signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب', signOut: 'تسجيل الخروج',
      email: 'البريد الإلكتروني', password: 'كلمة المرور', username: 'اسم المستخدم',
    },
    dashboard: { overview: 'نظرة عامة', analytics: 'التحليلات', security: 'الأمان', projects: 'المشاريع' },
  },
  zh: {
    common: {
      save: '保存', cancel: '取消', delete: '删除', edit: '编辑', create: '创建',
      confirm: '确认', back: '返回', next: '下一步', loading: '加载中...', error: '错误',
      success: '成功', warning: '警告', search: '搜索', filter: '筛选', export: '导出',
    },
    auth: { signIn: '登录', signUp: '注册', signOut: '退出', email: '邮箱', password: '密码', username: '用户名' },
    dashboard: { overview: '概览', analytics: '分析', security: '安全', projects: '项目' },
  },
};

// ── i18n service ──────────────────────────────────────────────────────────────

export class I18nService {
  constructor() {
    this.translations = translations;
    this.defaultLocale = 'en';
    this._autoTranslateCache = new Map();
  }

  // Detect locale from Accept-Language header
  detectLocale(acceptLanguage, fallback = this.defaultLocale) {
    if (!acceptLanguage) return fallback;
    const langs = acceptLanguage.split(',').map(l => l.split(';')[0].trim().slice(0, 2).toLowerCase());
    for (const lang of langs) {
      if (this.translations[lang]) return lang;
      if (SUPPORTED_LOCALES.some(s => s.code === lang)) return lang;
    }
    return fallback;
  }

  // Get a translation key using dot notation e.g. 'auth.signIn'
  t(locale, key, substitutions = {}) {
    const parts = key.split('.');
    let obj = this.translations[locale] || this.translations[this.defaultLocale] || {};
    for (const part of parts) { obj = obj?.[part]; if (obj === undefined) break; }
    // Fallback to English
    if (obj === undefined) {
      obj = this.translations[this.defaultLocale];
      for (const part of parts) { obj = obj?.[part]; if (obj === undefined) break; }
    }
    if (typeof obj !== 'string') return key;
    return Object.entries(substitutions).reduce(
      (str, [k, v]) => str.replaceAll(`{{${k}}}`, String(v)), obj
    );
  }

  // Get full namespace for a locale
  getNamespace(locale, ns) {
    return this.translations[locale]?.[ns] || this.translations[this.defaultLocale]?.[ns] || {};
  }

  // Auto-translate via DeepL-compatible API (env: TRANSLATE_API_URL + TRANSLATE_API_KEY)
  async autoTranslate(text, targetLocale, sourceLocale = 'en') {
    if (targetLocale === sourceLocale) return text;
    const cacheKey = `${sourceLocale}→${targetLocale}:${text.slice(0, 50)}`;
    if (this._autoTranslateCache.has(cacheKey)) return this._autoTranslateCache.get(cacheKey);

    const apiUrl = process.env.TRANSLATE_API_URL;
    const apiKey = process.env.TRANSLATE_API_KEY;
    if (!apiUrl || !apiKey) return text; // Graceful degradation

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: [text], target_lang: targetLocale.toUpperCase(), source_lang: sourceLocale.toUpperCase() }),
        signal: controller.signal,
      });
      if (!res.ok) return text;
      const data = await res.json();
      const translated = data?.translations?.[0]?.text || text;
      this._autoTranslateCache.set(cacheKey, translated);
      return translated;
    } catch { return text; }
    finally { clearTimeout(timeout); }
  }

  // Express middleware
  middleware() {
    return (req, res, next) => {
      const locale = this.detectLocale(req.headers['accept-language'] || req.query.lang);
      const localeInfo = SUPPORTED_LOCALES.find(l => l.code === locale) || SUPPORTED_LOCALES[0];
      req.locale = locale;
      req.dir = localeInfo.dir;
      req.t = (key, subs) => this.t(locale, key, subs);
      res.setHeader('Content-Language', locale);
      next();
    };
  }

  // Return locale metadata for client
  getLocaleInfo(code) {
    return SUPPORTED_LOCALES.find(l => l.code === code) || null;
  }

  isRTL(locale) { return RTL_LOCALES.has(locale); }

  // Format numbers/dates per locale
  formatNumber(n, locale) {
    try { return new Intl.NumberFormat(locale).format(n); } catch { return String(n); }
  }
  formatDate(d, locale, opts = {}) {
    try { return new Intl.DateTimeFormat(locale, opts).format(d instanceof Date ? d : new Date(d)); }
    catch { return String(d); }
  }
  formatCurrency(amount, locale, currency = 'USD') {
    try { return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount); }
    catch { return `${currency} ${amount}`; }
  }
}

export const i18n = new I18nService();
export default i18n;
