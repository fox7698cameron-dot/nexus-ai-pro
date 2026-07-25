// src/i18n/index.js — Updated: 2026-07-25
// Minimal runtime i18n with auto-translate fallback via backend proxy

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ar', 'pt', 'ko', 'it', 'ru', 'hi', 'tr', 'nl', 'pl'];
const RTL_LOCALES = ['ar', 'he', 'fa', 'ur'];

const translations = {
  en: {
    'auth.login': 'Sign In',
    'auth.register': 'Create Account',
    'auth.logout': 'Sign Out',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.username': 'Username',
    'auth.forgotPassword': 'Forgot password?',
    'auth.rememberMe': 'Remember me',
    'auth.mfaCode': 'Verification code',
    'auth.biometric': 'Use biometric authentication',
    'auth.passwordStrength': 'Password strength',
    'auth.passwordMin': 'Minimum 13 characters',
    'dashboard.admin': 'Admin Dashboard',
    'dashboard.developer': 'Developer Dashboard',
    'dashboard.moderator': 'Moderator Dashboard',
    'dashboard.user': 'My Dashboard',
    'nav.analytics': 'Analytics',
    'nav.security': 'Security',
    'nav.projects': 'Projects',
    'nav.settings': 'Settings',
    'nav.billing': 'Billing',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.success': 'Success',
    'common.export': 'Export',
    'common.connect': 'Connect',
    'common.disconnect': 'Disconnect',
    'payment.subscribe': 'Subscribe',
    'payment.monthly': 'Monthly',
    'payment.yearly': 'Yearly',
    'payment.giftCard': 'Gift Card',
    'payment.crypto': 'Cryptocurrency',
    'payment.cancel': 'Cancel Subscription',
    'projects.newProject': 'New Project',
    'projects.noProjects': 'No projects yet. Create your first project.',
    'security.scan': 'Run Security Scan',
    'security.scanning': 'Scanning...',
    'security.threats': 'Threats Blocked',
    'security.score': 'Security Score'
  },
  es: {
    'auth.login': 'Iniciar sesión',
    'auth.register': 'Crear cuenta',
    'auth.logout': 'Cerrar sesión',
    'auth.email': 'Correo electrónico',
    'auth.password': 'Contraseña',
    'auth.username': 'Nombre de usuario',
    'auth.forgotPassword': '¿Olvidó su contraseña?',
    'auth.rememberMe': 'Recordarme',
    'auth.mfaCode': 'Código de verificación',
    'auth.biometric': 'Usar autenticación biométrica',
    'auth.passwordStrength': 'Seguridad de contraseña',
    'auth.passwordMin': 'Mínimo 13 caracteres',
    'dashboard.admin': 'Panel de administración',
    'dashboard.developer': 'Panel de desarrollador',
    'dashboard.moderator': 'Panel de moderador',
    'dashboard.user': 'Mi panel',
    'nav.analytics': 'Analíticas',
    'nav.security': 'Seguridad',
    'nav.projects': 'Proyectos',
    'nav.settings': 'Configuración',
    'nav.billing': 'Facturación',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.search': 'Buscar',
    'common.loading': 'Cargando...',
    'common.error': 'Ocurrió un error',
    'common.success': 'Éxito',
    'common.export': 'Exportar',
    'common.connect': 'Conectar',
    'common.disconnect': 'Desconectar',
    'payment.subscribe': 'Suscribirse',
    'payment.monthly': 'Mensual',
    'payment.yearly': 'Anual',
    'payment.giftCard': 'Tarjeta de regalo',
    'payment.crypto': 'Criptomoneda',
    'payment.cancel': 'Cancelar suscripción',
    'projects.newProject': 'Nuevo proyecto',
    'projects.noProjects': 'Aún no hay proyectos. Crea tu primer proyecto.',
    'security.scan': 'Ejecutar análisis de seguridad',
    'security.scanning': 'Analizando...',
    'security.threats': 'Amenazas bloqueadas',
    'security.score': 'Puntuación de seguridad'
  },
  fr: {
    'auth.login': 'Se connecter',
    'auth.register': 'Créer un compte',
    'auth.logout': 'Se déconnecter',
    'auth.email': 'E-mail',
    'auth.password': 'Mot de passe',
    'auth.username': "Nom d'utilisateur",
    'auth.forgotPassword': 'Mot de passe oublié ?',
    'auth.rememberMe': 'Se souvenir de moi',
    'auth.mfaCode': 'Code de vérification',
    'auth.biometric': "Utiliser l'authentification biométrique",
    'auth.passwordStrength': 'Force du mot de passe',
    'auth.passwordMin': '13 caractères minimum',
    'dashboard.admin': 'Tableau de bord administrateur',
    'dashboard.developer': 'Tableau de bord développeur',
    'dashboard.moderator': 'Tableau de bord modérateur',
    'dashboard.user': 'Mon tableau de bord',
    'nav.analytics': 'Analytique',
    'nav.security': 'Sécurité',
    'nav.projects': 'Projets',
    'nav.settings': 'Paramètres',
    'nav.billing': 'Facturation',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.search': 'Rechercher',
    'common.loading': 'Chargement...',
    'common.error': 'Une erreur est survenue',
    'common.success': 'Succès',
    'common.export': 'Exporter',
    'common.connect': 'Connecter',
    'common.disconnect': 'Déconnecter',
    'payment.subscribe': "S'abonner",
    'payment.monthly': 'Mensuel',
    'payment.yearly': 'Annuel',
    'payment.giftCard': 'Carte cadeau',
    'payment.crypto': 'Cryptomonnaie',
    'payment.cancel': "Annuler l'abonnement",
    'projects.newProject': 'Nouveau projet',
    'projects.noProjects': 'Aucun projet pour l\'instant. Créez votre premier projet.',
    'security.scan': 'Lancer une analyse de sécurité',
    'security.scanning': 'Analyse en cours...',
    'security.threats': 'Menaces bloquées',
    'security.score': 'Score de sécurité'
  },
  de: {
    'auth.login': 'Anmelden',
    'auth.register': 'Konto erstellen',
    'auth.logout': 'Abmelden',
    'auth.email': 'E-Mail',
    'auth.password': 'Passwort',
    'auth.username': 'Benutzername',
    'auth.forgotPassword': 'Passwort vergessen?',
    'auth.rememberMe': 'Angemeldet bleiben',
    'auth.mfaCode': 'Bestätigungscode',
    'auth.biometric': 'Biometrische Authentifizierung verwenden',
    'auth.passwordStrength': 'Passwortstärke',
    'auth.passwordMin': 'Mindestens 13 Zeichen',
    'dashboard.admin': 'Admin-Dashboard',
    'dashboard.developer': 'Entwickler-Dashboard',
    'dashboard.moderator': 'Moderatoren-Dashboard',
    'dashboard.user': 'Mein Dashboard',
    'nav.analytics': 'Analytik',
    'nav.security': 'Sicherheit',
    'nav.projects': 'Projekte',
    'nav.settings': 'Einstellungen',
    'nav.billing': 'Abrechnung',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.search': 'Suchen',
    'common.loading': 'Laden...',
    'common.error': 'Ein Fehler ist aufgetreten',
    'common.success': 'Erfolg',
    'common.export': 'Exportieren',
    'common.connect': 'Verbinden',
    'common.disconnect': 'Trennen',
    'payment.subscribe': 'Abonnieren',
    'payment.monthly': 'Monatlich',
    'payment.yearly': 'Jährlich',
    'payment.giftCard': 'Geschenkkarte',
    'payment.crypto': 'Kryptowährung',
    'payment.cancel': 'Abonnement kündigen',
    'projects.newProject': 'Neues Projekt',
    'projects.noProjects': 'Noch keine Projekte. Erstellen Sie Ihr erstes Projekt.',
    'security.scan': 'Sicherheitsscan durchführen',
    'security.scanning': 'Wird gescannt...',
    'security.threats': 'Blockierte Bedrohungen',
    'security.score': 'Sicherheitsbewertung'
  },
  ja: {
    'auth.login': 'ログイン',
    'auth.register': 'アカウント作成',
    'auth.logout': 'ログアウト',
    'auth.email': 'メールアドレス',
    'auth.password': 'パスワード',
    'auth.username': 'ユーザー名',
    'auth.forgotPassword': 'パスワードをお忘れですか？',
    'auth.rememberMe': 'ログイン状態を保持',
    'auth.mfaCode': '確認コード',
    'auth.biometric': '生体認証を使用',
    'auth.passwordStrength': 'パスワード強度',
    'auth.passwordMin': '最低13文字',
    'dashboard.admin': '管理者ダッシュボード',
    'dashboard.developer': '開発者ダッシュボード',
    'dashboard.moderator': 'モデレーターダッシュボード',
    'dashboard.user': 'マイダッシュボード',
    'nav.analytics': 'アナリティクス',
    'nav.security': 'セキュリティ',
    'nav.projects': 'プロジェクト',
    'nav.settings': '設定',
    'nav.billing': '請求',
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.delete': '削除',
    'common.edit': '編集',
    'common.search': '検索',
    'common.loading': '読み込み中...',
    'common.error': 'エラーが発生しました',
    'common.success': '成功',
    'common.export': 'エクスポート',
    'common.connect': '接続',
    'common.disconnect': '切断',
    'payment.subscribe': '購読',
    'payment.monthly': '月額',
    'payment.yearly': '年額',
    'payment.giftCard': 'ギフトカード',
    'payment.crypto': '暗号通貨',
    'payment.cancel': '購読をキャンセル',
    'projects.newProject': '新しいプロジェクト',
    'projects.noProjects': 'プロジェクトがありません。最初のプロジェクトを作成してください。',
    'security.scan': 'セキュリティスキャンを実行',
    'security.scanning': 'スキャン中...',
    'security.threats': 'ブロックされた脅威',
    'security.score': 'セキュリティスコア'
  },
  zh: {
    'auth.login': '登录',
    'auth.register': '创建账户',
    'auth.logout': '退出登录',
    'auth.email': '电子邮件',
    'auth.password': '密码',
    'auth.username': '用户名',
    'auth.forgotPassword': '忘记密码？',
    'auth.rememberMe': '记住我',
    'auth.mfaCode': '验证码',
    'auth.biometric': '使用生物特征认证',
    'auth.passwordStrength': '密码强度',
    'auth.passwordMin': '最少13个字符',
    'dashboard.admin': '管理员面板',
    'dashboard.developer': '开发者面板',
    'dashboard.moderator': '版主面板',
    'dashboard.user': '我的面板',
    'nav.analytics': '分析',
    'nav.security': '安全',
    'nav.projects': '项目',
    'nav.settings': '设置',
    'nav.billing': '账单',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.search': '搜索',
    'common.loading': '加载中...',
    'common.error': '发生错误',
    'common.success': '成功',
    'common.export': '导出',
    'common.connect': '连接',
    'common.disconnect': '断开',
    'payment.subscribe': '订阅',
    'payment.monthly': '按月',
    'payment.yearly': '按年',
    'payment.giftCard': '礼品卡',
    'payment.crypto': '加密货币',
    'payment.cancel': '取消订阅',
    'projects.newProject': '新建项目',
    'projects.noProjects': '暂无项目。创建您的第一个项目。',
    'security.scan': '运行安全扫描',
    'security.scanning': '扫描中...',
    'security.threats': '已阻止的威胁',
    'security.score': '安全评分'
  },
  ar: {
    'auth.login': 'تسجيل الدخول',
    'auth.register': 'إنشاء حساب',
    'auth.logout': 'تسجيل الخروج',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.username': 'اسم المستخدم',
    'auth.forgotPassword': 'هل نسيت كلمة المرور؟',
    'auth.rememberMe': 'تذكرني',
    'auth.mfaCode': 'رمز التحقق',
    'auth.biometric': 'استخدام المصادقة البيومترية',
    'auth.passwordStrength': 'قوة كلمة المرور',
    'auth.passwordMin': 'الحد الأدنى 13 حرفاً',
    'dashboard.admin': 'لوحة المشرف',
    'dashboard.developer': 'لوحة المطور',
    'dashboard.moderator': 'لوحة المشرف المحتوى',
    'dashboard.user': 'لوحتي',
    'nav.analytics': 'التحليلات',
    'nav.security': 'الأمان',
    'nav.projects': 'المشاريع',
    'nav.settings': 'الإعدادات',
    'nav.billing': 'الفواتير',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.search': 'بحث',
    'common.loading': 'جارٍ التحميل...',
    'common.error': 'حدث خطأ',
    'common.success': 'نجاح',
    'common.export': 'تصدير',
    'common.connect': 'اتصال',
    'common.disconnect': 'قطع الاتصال',
    'payment.subscribe': 'اشتراك',
    'payment.monthly': 'شهري',
    'payment.yearly': 'سنوي',
    'payment.giftCard': 'بطاقة هدية',
    'payment.crypto': 'عملة مشفرة',
    'payment.cancel': 'إلغاء الاشتراك',
    'projects.newProject': 'مشروع جديد',
    'projects.noProjects': 'لا توجد مشاريع حتى الآن. أنشئ مشروعك الأول.',
    'security.scan': 'إجراء فحص أماني',
    'security.scanning': 'جارٍ الفحص...',
    'security.threats': 'التهديدات المحجوبة',
    'security.score': 'درجة الأمان'
  },
  pt: {
    'auth.login': 'Entrar',
    'auth.register': 'Criar conta',
    'auth.logout': 'Sair',
    'auth.email': 'E-mail',
    'auth.password': 'Senha',
    'auth.username': 'Nome de usuário',
    'auth.forgotPassword': 'Esqueceu a senha?',
    'auth.rememberMe': 'Lembrar-me',
    'auth.mfaCode': 'Código de verificação',
    'auth.biometric': 'Usar autenticação biométrica',
    'auth.passwordStrength': 'Força da senha',
    'auth.passwordMin': 'Mínimo de 13 caracteres',
    'dashboard.admin': 'Painel administrativo',
    'dashboard.developer': 'Painel do desenvolvedor',
    'dashboard.moderator': 'Painel do moderador',
    'dashboard.user': 'Meu painel',
    'nav.analytics': 'Análises',
    'nav.security': 'Segurança',
    'nav.projects': 'Projetos',
    'nav.settings': 'Configurações',
    'nav.billing': 'Cobrança',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Excluir',
    'common.edit': 'Editar',
    'common.search': 'Pesquisar',
    'common.loading': 'Carregando...',
    'common.error': 'Ocorreu um erro',
    'common.success': 'Sucesso',
    'common.export': 'Exportar',
    'common.connect': 'Conectar',
    'common.disconnect': 'Desconectar',
    'payment.subscribe': 'Assinar',
    'payment.monthly': 'Mensal',
    'payment.yearly': 'Anual',
    'payment.giftCard': 'Cartão-presente',
    'payment.crypto': 'Criptomoeda',
    'payment.cancel': 'Cancelar assinatura',
    'projects.newProject': 'Novo projeto',
    'projects.noProjects': 'Nenhum projeto ainda. Crie seu primeiro projeto.',
    'security.scan': 'Executar verificação de segurança',
    'security.scanning': 'Verificando...',
    'security.threats': 'Ameaças bloqueadas',
    'security.score': 'Pontuação de segurança'
  }
};

let activeLocale = 'en';
const translationCache = new Map();

// Auto-detect locale from browser or environment
export function detectLocale() {
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language || navigator.languages?.[0] || 'en';
    const base = lang.split('-')[0].toLowerCase();
    return SUPPORTED_LOCALES.includes(base) ? base : 'en';
  }
  return process.env.LOCALE || 'en';
}

export function setLocale(locale) {
  activeLocale = SUPPORTED_LOCALES.includes(locale) ? locale : 'en';
  if (typeof document !== 'undefined') {
    document.documentElement.lang = activeLocale;
    document.documentElement.dir = RTL_LOCALES.includes(activeLocale) ? 'rtl' : 'ltr';
  }
}

export function t(key, vars = {}) {
  const dict = translations[activeLocale] || translations.en;
  let text = dict[key] || translations.en[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(`{{${k}}}`, v);
  }
  return text;
}

export function isRTL(locale = activeLocale) {
  return RTL_LOCALES.includes(locale);
}

export function getLocale() {
  return activeLocale;
}

export { SUPPORTED_LOCALES, RTL_LOCALES };

// Async auto-translate via backend for keys not in the static map
export async function autoTranslate(text, targetLocale = activeLocale) {
  if (targetLocale === 'en') return text;
  const cacheKey = `${targetLocale}:${text}`;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLocale })
    });
    if (!res.ok) return text;
    const { translated } = await res.json();
    translationCache.set(cacheKey, translated);
    return translated;
  } catch {
    return text;
  }
}

// React hook for use in components
export function useTranslation() {
  return { t, locale: activeLocale, setLocale, isRTL: isRTL(), autoTranslate };
}

export default { t, setLocale, getLocale, detectLocale, isRTL, autoTranslate, SUPPORTED_LOCALES };
