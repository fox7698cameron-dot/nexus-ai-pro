// ================================================
// NEXUS AI PRO — Internationalization Module
// Supports: 20+ languages with auto-translate
// Fallback: English (en)
// Created: 2026-06-04
// ================================================

export const SUPPORTED_LANGUAGES = Object.freeze({
  en:    { name: 'English',            nativeName: 'English',        rtl: false, region: 'US' },
  es:    { name: 'Spanish',            nativeName: 'Español',        rtl: false, region: 'ES' },
  fr:    { name: 'French',             nativeName: 'Français',       rtl: false, region: 'FR' },
  de:    { name: 'German',             nativeName: 'Deutsch',        rtl: false, region: 'DE' },
  it:    { name: 'Italian',            nativeName: 'Italiano',       rtl: false, region: 'IT' },
  pt:    { name: 'Portuguese',         nativeName: 'Português',      rtl: false, region: 'BR' },
  ja:    { name: 'Japanese',           nativeName: '日本語',          rtl: false, region: 'JP' },
  ko:    { name: 'Korean',             nativeName: '한국어',          rtl: false, region: 'KR' },
  zh:    { name: 'Chinese (Simplified)', nativeName: '中文',          rtl: false, region: 'CN' },
  ar:    { name: 'Arabic',             nativeName: 'العربية',        rtl: true,  region: 'SA' },
  ru:    { name: 'Russian',            nativeName: 'Русский',        rtl: false, region: 'RU' },
  hi:    { name: 'Hindi',              nativeName: 'हिन्दी',         rtl: false, region: 'IN' },
  nl:    { name: 'Dutch',              nativeName: 'Nederlands',     rtl: false, region: 'NL' },
  sv:    { name: 'Swedish',            nativeName: 'Svenska',        rtl: false, region: 'SE' },
  pl:    { name: 'Polish',             nativeName: 'Polski',         rtl: false, region: 'PL' },
  tr:    { name: 'Turkish',            nativeName: 'Türkçe',         rtl: false, region: 'TR' },
  vi:    { name: 'Vietnamese',         nativeName: 'Tiếng Việt',     rtl: false, region: 'VN' },
  th:    { name: 'Thai',               nativeName: 'ภาษาไทย',        rtl: false, region: 'TH' },
  id:    { name: 'Indonesian',         nativeName: 'Bahasa Indonesia', rtl: false, region: 'ID' },
  he:    { name: 'Hebrew',             nativeName: 'עברית',          rtl: true,  region: 'IL' },
  uk:    { name: 'Ukrainian',          nativeName: 'Українська',     rtl: false, region: 'UA' },
  cs:    { name: 'Czech',              nativeName: 'Čeština',        rtl: false, region: 'CZ' }
});

// Core UI translations
const translations = {
  en: {
    common: {
      save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
      loading: 'Loading…', error: 'Error', success: 'Success',
      confirm: 'Confirm', back: 'Back', next: 'Next', close: 'Close',
      search: 'Search', filter: 'Filter', export: 'Export', import: 'Import',
      settings: 'Settings', logout: 'Logout', profile: 'Profile', help: 'Help'
    },
    auth: {
      login: 'Sign In', register: 'Create Account', logout: 'Sign Out',
      email: 'Email address', password: 'Password', username: 'Username',
      forgotPassword: 'Forgot password?', rememberMe: 'Remember me',
      twoFactor: 'Two-factor code', biometric: 'Use biometrics',
      passwordStrength: 'Password strength', passwordRequirements: 'Min 13 chars, uppercase, lowercase, number, special char',
      mfaSetup: 'Set up two-factor authentication', scanQR: 'Scan QR code with your authenticator app',
      adminDash: 'Admin Dashboard', devDash: 'Developer Dashboard',
      modDash: 'Moderator Dashboard', userDash: 'Dashboard'
    },
    nav: {
      dashboard: 'Dashboard', analytics: 'Analytics', security: 'Security',
      projects: 'Projects', gamedev: 'Game Dev', payments: 'Billing',
      integrations: 'Integrations', admin: 'Admin', users: 'Users'
    },
    analytics: {
      title: 'Social Analytics', overview: 'Overview', metrics: 'Metrics',
      reach: 'Reach', engagement: 'Engagement', followers: 'Followers',
      views: 'Views', likes: 'Likes', shares: 'Shares', comments: 'Comments',
      retention: 'Retention', watchTime: 'Watch Time', impressions: 'Impressions',
      growth: 'Growth', realTime: 'Real-time', platform: 'Platform',
      connectPlatform: 'Connect Platform', disconnectPlatform: 'Disconnect'
    },
    security: {
      title: 'Security Dashboard', score: 'Security Score', scan: 'Run Scan',
      patch: 'Apply Patches', threats: 'Threats', vulnerabilities: 'Vulnerabilities',
      networkStatus: 'Network Status', encryptionStatus: 'Encryption Status',
      lastScan: 'Last Scan', auditLog: 'Audit Log', keyRotation: 'Key Rotation',
      realTimeScan: 'Real-time Scanning', deviceHealth: 'Device Health'
    },
    projects: {
      title: 'Projects', newProject: 'New Project', projectType: 'Project Type',
      status: 'Status', priority: 'Priority', progress: 'Progress',
      tasks: 'Tasks', commits: 'Commits', milestones: 'Milestones',
      linesOfCode: 'Lines of Code', collaborators: 'Collaborators',
      dueDate: 'Due Date', startDate: 'Start Date'
    },
    gamedev: {
      title: 'Game Development', achievements: 'Achievements', progress: 'Game Progress',
      connectors: 'Platform Connectors', arvr: 'AR/VR Projects',
      leaderboard: 'Leaderboard', xp: 'XP', level: 'Level',
      playtime: 'Playtime', completion: 'Completion', rarity: 'Rarity'
    },
    payments: {
      title: 'Billing', plans: 'Plans', subscribe: 'Subscribe',
      currentPlan: 'Current Plan', upgrade: 'Upgrade', cancel: 'Cancel Plan',
      creditCard: 'Credit / Debit Card', crypto: 'Cryptocurrency',
      giftCard: 'Gift Card', redeemCode: 'Redeem Code',
      transactionHistory: 'Transaction History', invoices: 'Invoices'
    }
  },
  es: {
    common: { save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar', loading: 'Cargando…', error: 'Error', success: 'Éxito', confirm: 'Confirmar', back: 'Atrás', next: 'Siguiente', close: 'Cerrar', search: 'Buscar', filter: 'Filtrar', export: 'Exportar', import: 'Importar', settings: 'Configuración', logout: 'Cerrar sesión', profile: 'Perfil', help: 'Ayuda' },
    auth: { login: 'Iniciar sesión', register: 'Crear cuenta', logout: 'Cerrar sesión', email: 'Correo electrónico', password: 'Contraseña', username: 'Nombre de usuario' },
    nav: { dashboard: 'Panel', analytics: 'Analíticas', security: 'Seguridad', projects: 'Proyectos', gamedev: 'Dev de juegos', payments: 'Facturación', integrations: 'Integraciones', admin: 'Admin', users: 'Usuarios' },
    analytics: { title: 'Analíticas Sociales', overview: 'Resumen', metrics: 'Métricas', reach: 'Alcance', engagement: 'Participación', followers: 'Seguidores', views: 'Vistas', likes: 'Me gusta', shares: 'Compartidos', comments: 'Comentarios' },
    security: { title: 'Panel de Seguridad', score: 'Puntuación de seguridad', scan: 'Ejecutar escaneo', patch: 'Aplicar parches', threats: 'Amenazas' },
    projects: { title: 'Proyectos', newProject: 'Nuevo proyecto', status: 'Estado', priority: 'Prioridad', progress: 'Progreso', tasks: 'Tareas' },
    gamedev: { title: 'Desarrollo de juegos', achievements: 'Logros', progress: 'Progreso del juego', leaderboard: 'Tabla de clasificación' },
    payments: { title: 'Facturación', plans: 'Planes', subscribe: 'Suscribirse', currentPlan: 'Plan actual', upgrade: 'Mejorar' }
  },
  fr: {
    common: { save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer', edit: 'Modifier', loading: 'Chargement…', error: 'Erreur', success: 'Succès', confirm: 'Confirmer', back: 'Retour', next: 'Suivant', close: 'Fermer', search: 'Rechercher', settings: 'Paramètres', logout: 'Déconnexion', profile: 'Profil', help: 'Aide' },
    auth: { login: 'Se connecter', register: 'Créer un compte', logout: 'Se déconnecter', email: 'Adresse e-mail', password: 'Mot de passe', username: "Nom d'utilisateur" },
    nav: { dashboard: 'Tableau de bord', analytics: 'Analytiques', security: 'Sécurité', projects: 'Projets', gamedev: 'Dev jeux', payments: 'Facturation', integrations: 'Intégrations', admin: 'Admin', users: 'Utilisateurs' },
    analytics: { title: 'Analytiques Sociales', overview: 'Aperçu', reach: 'Portée', engagement: 'Engagement', followers: 'Abonnés', views: 'Vues', likes: "J'aime", shares: 'Partages', comments: 'Commentaires' },
    security: { title: 'Tableau de bord Sécurité', scan: 'Analyser', patch: 'Appliquer les correctifs', threats: 'Menaces' },
    projects: { title: 'Projets', newProject: 'Nouveau projet', status: 'Statut', priority: 'Priorité', progress: 'Progression' },
    gamedev: { title: 'Développement de jeux', achievements: 'Succès', leaderboard: 'Classement' },
    payments: { title: 'Facturation', plans: 'Forfaits', subscribe: "S'abonner", currentPlan: 'Forfait actuel' }
  },
  de: {
    common: { save: 'Speichern', cancel: 'Abbrechen', delete: 'Löschen', edit: 'Bearbeiten', loading: 'Laden…', error: 'Fehler', success: 'Erfolg', settings: 'Einstellungen', logout: 'Abmelden', profile: 'Profil', help: 'Hilfe' },
    auth: { login: 'Anmelden', register: 'Registrieren', email: 'E-Mail-Adresse', password: 'Passwort', username: 'Benutzername' },
    nav: { dashboard: 'Übersicht', analytics: 'Analytik', security: 'Sicherheit', projects: 'Projekte', gamedev: 'Spieleentwicklung', payments: 'Abrechnung', integrations: 'Integrationen' },
    analytics: { title: 'Soziale Analytik', overview: 'Überblick', reach: 'Reichweite', engagement: 'Interaktion', followers: 'Abonnenten', views: 'Aufrufe', likes: 'Gefällt mir', shares: 'Teilen', comments: 'Kommentare' },
    security: { title: 'Sicherheits-Dashboard', scan: 'Scannen', threats: 'Bedrohungen' },
    projects: { title: 'Projekte', newProject: 'Neues Projekt' },
    gamedev: { title: 'Spieleentwicklung', achievements: 'Erfolge' },
    payments: { title: 'Abrechnung', subscribe: 'Abonnieren' }
  },
  ja: {
    common: { save: '保存', cancel: 'キャンセル', delete: '削除', edit: '編集', loading: '読み込み中…', error: 'エラー', success: '成功', settings: '設定', logout: 'ログアウト', profile: 'プロフィール' },
    auth: { login: 'サインイン', register: 'アカウント作成', email: 'メールアドレス', password: 'パスワード', username: 'ユーザー名' },
    nav: { dashboard: 'ダッシュボード', analytics: 'アナリティクス', security: 'セキュリティ', projects: 'プロジェクト', gamedev: 'ゲーム開発', payments: '支払い' },
    analytics: { title: 'ソーシャル分析', reach: 'リーチ', engagement: 'エンゲージメント', followers: 'フォロワー', views: '視聴回数', likes: 'いいね' },
    security: { title: 'セキュリティダッシュボード', scan: 'スキャン', threats: '脅威' },
    projects: { title: 'プロジェクト', newProject: '新しいプロジェクト' },
    gamedev: { title: 'ゲーム開発', achievements: '実績' },
    payments: { title: '請求', subscribe: '購読' }
  },
  zh: {
    common: { save: '保存', cancel: '取消', delete: '删除', edit: '编辑', loading: '加载中…', error: '错误', success: '成功', settings: '设置', logout: '退出登录', profile: '个人资料' },
    auth: { login: '登录', register: '创建账户', email: '电子邮件地址', password: '密码', username: '用户名' },
    nav: { dashboard: '仪表板', analytics: '分析', security: '安全', projects: '项目', gamedev: '游戏开发', payments: '账单' },
    analytics: { title: '社交分析', reach: '覆盖面', engagement: '参与度', followers: '关注者', views: '观看次数', likes: '点赞' },
    security: { title: '安全仪表板', scan: '扫描', threats: '威胁' },
    projects: { title: '项目', newProject: '新项目' },
    gamedev: { title: '游戏开发', achievements: '成就' },
    payments: { title: '账单', subscribe: '订阅' }
  },
  ar: {
    common: { save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل', loading: 'جاري التحميل…', error: 'خطأ', success: 'نجاح', settings: 'الإعدادات', logout: 'تسجيل الخروج', profile: 'الملف الشخصي' },
    auth: { login: 'تسجيل الدخول', register: 'إنشاء حساب', email: 'عنوان البريد الإلكتروني', password: 'كلمة المرور', username: 'اسم المستخدم' },
    nav: { dashboard: 'لوحة التحكم', analytics: 'التحليلات', security: 'الأمان', projects: 'المشاريع', gamedev: 'تطوير الألعاب', payments: 'الفواتير' },
    analytics: { title: 'تحليلات التواصل الاجتماعي', reach: 'الوصول', engagement: 'التفاعل', followers: 'المتابعون', views: 'المشاهدات', likes: 'الإعجابات' },
    security: { title: 'لوحة الأمان', scan: 'فحص', threats: 'التهديدات' },
    projects: { title: 'المشاريع', newProject: 'مشروع جديد' },
    gamedev: { title: 'تطوير الألعاب', achievements: 'الإنجازات' },
    payments: { title: 'الفواتير', subscribe: 'اشتراك' }
  }
};

// Deep merge with fallback
function deepGet(obj, path, fallback = '') {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return fallback;
    cur = cur[p];
  }
  return cur !== undefined ? cur : fallback;
}

export function createI18n(initialLang = 'en') {
  let current = SUPPORTED_LANGUAGES[initialLang] ? initialLang : 'en';
  const cache = new Map();

  function t(key, params = {}) {
    const langData = translations[current] || {};
    const enData = translations.en || {};
    let value = deepGet(langData, key) || deepGet(enData, key, key);

    for (const [k, v] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    }
    return value;
  }

  function setLanguage(lang) {
    if (SUPPORTED_LANGUAGES[lang]) {
      current = lang;
      cache.clear();
      document.documentElement.lang = lang;
      document.documentElement.dir = SUPPORTED_LANGUAGES[lang].rtl ? 'rtl' : 'ltr';
    }
  }

  function getLanguage() { return current; }
  function getLanguageInfo() { return SUPPORTED_LANGUAGES[current]; }
  function isRTL() { return SUPPORTED_LANGUAGES[current]?.rtl || false; }

  async function autoTranslate(text, targetLang) {
    if (targetLang === 'en') return text;
    const apiKey = typeof process !== 'undefined' ? process.env?.GOOGLE_TRANSLATE_API_KEY : null;
    if (!apiKey) return text;

    try {
      const res = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: text, target: targetLang, format: 'text' })
        }
      );
      const data = await res.json();
      return data?.data?.translations?.[0]?.translatedText || text;
    } catch {
      return text;
    }
  }

  function detectBrowserLanguage() {
    const lang = navigator?.language?.split('-')[0] || 'en';
    return SUPPORTED_LANGUAGES[lang] ? lang : 'en';
  }

  function formatNumber(num, opts = {}) {
    return new Intl.NumberFormat(`${current}-${SUPPORTED_LANGUAGES[current]?.region || 'US'}`, opts).format(num);
  }

  function formatDate(date, opts = {}) {
    return new Intl.DateTimeFormat(`${current}-${SUPPORTED_LANGUAGES[current]?.region || 'US'}`, opts).format(new Date(date));
  }

  function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat(`${current}-${SUPPORTED_LANGUAGES[current]?.region || 'US'}`, { style: 'currency', currency }).format(amount / 100);
  }

  return { t, setLanguage, getLanguage, getLanguageInfo, isRTL, autoTranslate, detectBrowserLanguage, formatNumber, formatDate, formatCurrency };
}

export const defaultI18n = createI18n('en');
export const { t, setLanguage, getLanguage, formatNumber, formatDate, formatCurrency } = defaultI18n;
