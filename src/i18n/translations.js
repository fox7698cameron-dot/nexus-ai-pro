// Created: 2026-09-30
// Multi-language support and auto-translate module for Nexus AI Pro

export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', dir: 'ltr', flag: '🇺🇸' },
  es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr', flag: '🇪🇸' },
  fr: { name: 'French', nativeName: 'Français', dir: 'ltr', flag: '🇫🇷' },
  de: { name: 'German', nativeName: 'Deutsch', dir: 'ltr', flag: '🇩🇪' },
  ja: { name: 'Japanese', nativeName: '日本語', dir: 'ltr', flag: '🇯🇵' },
  zh: { name: 'Chinese (Simplified)', nativeName: '简体中文', dir: 'ltr', flag: '🇨🇳' },
  ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  pt: { name: 'Portuguese', nativeName: 'Português', dir: 'ltr', flag: '🇧🇷' },
  ko: { name: 'Korean', nativeName: '한국어', dir: 'ltr', flag: '🇰🇷' },
  ru: { name: 'Russian', nativeName: 'Русский', dir: 'ltr', flag: '🇷🇺' },
  it: { name: 'Italian', nativeName: 'Italiano', dir: 'ltr', flag: '🇮🇹' },
  nl: { name: 'Dutch', nativeName: 'Nederlands', dir: 'ltr', flag: '🇳🇱' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', flag: '🇮🇳' },
  tr: { name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr', flag: '🇹🇷' },
  pl: { name: 'Polish', nativeName: 'Polski', dir: 'ltr', flag: '🇵🇱' },
};

export const translations = {
  en: {
    app: {
      name: 'Nexus AI Pro',
      tagline: 'Military-Grade AI Platform',
    },
    nav: {
      chat: 'Chat',
      analytics: 'Analytics',
      security: 'Security',
      settings: 'Settings',
      dashboard: 'Dashboard',
      projects: 'Projects',
      payments: 'Payments',
      profile: 'Profile',
    },
    auth: {
      signIn: 'Sign In',
      signUp: 'Sign Up',
      signOut: 'Sign Out',
      email: 'Email Address',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      username: 'Username',
      forgotPassword: 'Forgot Password?',
      resetPassword: 'Reset Password',
      biometricLogin: 'Login with Biometrics',
      twoFactorAuth: '2-Factor Authentication',
      enterCode: 'Enter verification code',
      rememberMe: 'Remember me',
      welcomeBack: 'Welcome back',
      createAccount: 'Create Account',
      alreadyHaveAccount: 'Already have an account?',
      dontHaveAccount: "Don't have an account?",
      passwordStrength: 'Password Strength',
      passwordRequirements: 'Minimum 13 characters with uppercase, lowercase, numbers and special characters',
      roles: {
        user: 'User',
        developer: 'Developer',
        moderator: 'Moderator',
        admin: 'Administrator',
      },
    },
    analytics: {
      title: 'Analytics Dashboard',
      totalViews: 'Total Views',
      totalLikes: 'Total Likes',
      reach: 'Total Reach',
      engagement: 'Engagement Rate',
      followers: 'Followers',
      retention: 'Retention Rate',
      platforms: 'Platforms',
      timeRange: 'Time Range',
      exportData: 'Export Data',
    },
    security: {
      title: 'Security Dashboard',
      scan: 'Run Scan',
      threats: 'Threats Detected',
      vulnerabilities: 'Vulnerabilities',
      networkStatus: 'Network Status',
      deviceStatus: 'Device Status',
      lastScan: 'Last Scan',
      clean: 'Clean',
      warning: 'Warning',
      critical: 'Critical',
      encrypted: 'Encrypted',
      secure: 'Secure',
    },
    payments: {
      title: 'Subscription & Billing',
      currentPlan: 'Current Plan',
      upgrade: 'Upgrade',
      cancel: 'Cancel',
      billingHistory: 'Billing History',
      paymentMethod: 'Payment Method',
      addCard: 'Add Card',
      crypto: 'Cryptocurrency',
      giftCard: 'Gift Card',
      redeemCode: 'Redeem Code',
    },
    common: {
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Success',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      submit: 'Submit',
      confirm: 'Confirm',
      search: 'Search',
      filter: 'Filter',
      export: 'Export',
      import: 'Import',
      refresh: 'Refresh',
      settings: 'Settings',
      help: 'Help',
      logout: 'Logout',
    },
  },
  es: {
    app: { name: 'Nexus AI Pro', tagline: 'Plataforma IA de Grado Militar' },
    nav: { chat: 'Chat', analytics: 'Análisis', security: 'Seguridad', settings: 'Configuración', dashboard: 'Panel', projects: 'Proyectos', payments: 'Pagos', profile: 'Perfil' },
    auth: { signIn: 'Iniciar Sesión', signUp: 'Registrarse', signOut: 'Cerrar Sesión', email: 'Correo Electrónico', password: 'Contraseña', username: 'Usuario', biometricLogin: 'Iniciar con Biometría', twoFactorAuth: 'Autenticación de 2 Factores', passwordStrength: 'Fortaleza de Contraseña', passwordRequirements: 'Mínimo 13 caracteres con mayúsculas, minúsculas, números y caracteres especiales' },
    analytics: { title: 'Panel de Análisis', totalViews: 'Vistas Totales', totalLikes: 'Me Gusta Totales', reach: 'Alcance Total', engagement: 'Tasa de Participación', followers: 'Seguidores', retention: 'Tasa de Retención' },
    security: { title: 'Panel de Seguridad', scan: 'Ejecutar Escaneo', threats: 'Amenazas Detectadas', secure: 'Seguro' },
    payments: { title: 'Suscripción y Facturación', currentPlan: 'Plan Actual', upgrade: 'Actualizar', cancel: 'Cancelar', giftCard: 'Tarjeta Regalo' },
    common: { loading: 'Cargando...', error: 'Ocurrió un error', success: 'Éxito', cancel: 'Cancelar', save: 'Guardar', delete: 'Eliminar', edit: 'Editar', close: 'Cerrar', back: 'Atrás', next: 'Siguiente', submit: 'Enviar', confirm: 'Confirmar', search: 'Buscar', refresh: 'Actualizar', settings: 'Configuración', logout: 'Cerrar Sesión' },
  },
  fr: {
    app: { name: 'Nexus AI Pro', tagline: 'Plateforme IA de Grade Militaire' },
    nav: { chat: 'Chat', analytics: 'Analyses', security: 'Sécurité', settings: 'Paramètres', dashboard: 'Tableau de bord', projects: 'Projets', payments: 'Paiements', profile: 'Profil' },
    auth: { signIn: 'Se Connecter', signUp: "S'inscrire", signOut: 'Se Déconnecter', email: 'Adresse Email', password: 'Mot de Passe', username: "Nom d'utilisateur", biometricLogin: 'Connexion Biométrique', twoFactorAuth: 'Authentification à 2 Facteurs', passwordStrength: 'Force du Mot de Passe', passwordRequirements: 'Minimum 13 caractères avec majuscules, minuscules, chiffres et caractères spéciaux' },
    analytics: { title: "Tableau de Bord Analytique", totalViews: 'Vues Totales', totalLikes: 'Likes Totaux', reach: 'Portée Totale', engagement: "Taux d'Engagement", followers: 'Abonnés', retention: 'Taux de Rétention' },
    security: { title: 'Tableau de Bord Sécurité', scan: 'Lancer Analyse', threats: 'Menaces Détectées', secure: 'Sécurisé' },
    payments: { title: 'Abonnement et Facturation', currentPlan: 'Plan Actuel', upgrade: 'Mettre à Niveau', cancel: 'Annuler', giftCard: 'Carte Cadeau' },
    common: { loading: 'Chargement...', error: 'Une erreur est survenue', success: 'Succès', cancel: 'Annuler', save: 'Enregistrer', delete: 'Supprimer', edit: 'Modifier', close: 'Fermer', back: 'Retour', next: 'Suivant', submit: 'Envoyer', confirm: 'Confirmer', search: 'Rechercher', refresh: 'Actualiser', settings: 'Paramètres', logout: 'Déconnexion' },
  },
  de: {
    app: { name: 'Nexus AI Pro', tagline: 'KI-Plattform in Militärqualität' },
    nav: { chat: 'Chat', analytics: 'Analysen', security: 'Sicherheit', settings: 'Einstellungen', dashboard: 'Dashboard', projects: 'Projekte', payments: 'Zahlungen', profile: 'Profil' },
    auth: { signIn: 'Anmelden', signUp: 'Registrieren', signOut: 'Abmelden', email: 'E-Mail-Adresse', password: 'Passwort', username: 'Benutzername', biometricLogin: 'Biometrische Anmeldung', twoFactorAuth: '2-Faktor-Authentifizierung', passwordStrength: 'Passwortstärke', passwordRequirements: 'Mindestens 13 Zeichen mit Groß-, Kleinbuchstaben, Zahlen und Sonderzeichen' },
    analytics: { title: 'Analyse-Dashboard', totalViews: 'Gesamte Aufrufe', totalLikes: 'Gesamte Likes', reach: 'Gesamte Reichweite', engagement: 'Engagement-Rate', followers: 'Follower', retention: 'Bindungsrate' },
    security: { title: 'Sicherheits-Dashboard', scan: 'Scan Starten', threats: 'Erkannte Bedrohungen', secure: 'Sicher' },
    payments: { title: 'Abonnement & Abrechnung', currentPlan: 'Aktueller Plan', upgrade: 'Upgraden', cancel: 'Abbrechen', giftCard: 'Geschenkkarte' },
    common: { loading: 'Laden...', error: 'Ein Fehler ist aufgetreten', success: 'Erfolg', cancel: 'Abbrechen', save: 'Speichern', delete: 'Löschen', edit: 'Bearbeiten', close: 'Schließen', back: 'Zurück', next: 'Weiter', submit: 'Einreichen', confirm: 'Bestätigen', search: 'Suchen', refresh: 'Aktualisieren', settings: 'Einstellungen', logout: 'Abmelden' },
  },
  ja: {
    app: { name: 'Nexus AI Pro', tagline: '軍事グレードAIプラットフォーム' },
    nav: { chat: 'チャット', analytics: '分析', security: 'セキュリティ', settings: '設定', dashboard: 'ダッシュボード', projects: 'プロジェクト', payments: '支払い', profile: 'プロフィール' },
    auth: { signIn: 'サインイン', signUp: '登録', signOut: 'サインアウト', email: 'メールアドレス', password: 'パスワード', username: 'ユーザー名', biometricLogin: '生体認証でログイン', twoFactorAuth: '二要素認証', passwordStrength: 'パスワード強度', passwordRequirements: '大文字、小文字、数字、特殊文字を含む13文字以上' },
    analytics: { title: '分析ダッシュボード', totalViews: '総視聴回数', totalLikes: '総いいね数', reach: '総リーチ', engagement: 'エンゲージメント率', followers: 'フォロワー', retention: '継続率' },
    security: { title: 'セキュリティダッシュボード', scan: 'スキャン実行', threats: '検出された脅威', secure: '安全' },
    payments: { title: 'サブスクリプション & 請求', currentPlan: '現在のプラン', upgrade: 'アップグレード', cancel: 'キャンセル', giftCard: 'ギフトカード' },
    common: { loading: '読み込み中...', error: 'エラーが発生しました', success: '成功', cancel: 'キャンセル', save: '保存', delete: '削除', edit: '編集', close: '閉じる', back: '戻る', next: '次へ', submit: '送信', confirm: '確認', search: '検索', refresh: '更新', settings: '設定', logout: 'ログアウト' },
  },
  zh: {
    app: { name: 'Nexus AI Pro', tagline: '军事级AI平台' },
    nav: { chat: '聊天', analytics: '分析', security: '安全', settings: '设置', dashboard: '仪表板', projects: '项目', payments: '支付', profile: '个人资料' },
    auth: { signIn: '登录', signUp: '注册', signOut: '退出登录', email: '电子邮件', password: '密码', username: '用户名', biometricLogin: '生物识别登录', twoFactorAuth: '双因素认证', passwordStrength: '密码强度', passwordRequirements: '至少13个字符，包含大写、小写、数字和特殊字符' },
    analytics: { title: '分析仪表板', totalViews: '总观看量', totalLikes: '总点赞数', reach: '总触达', engagement: '互动率', followers: '关注者', retention: '留存率' },
    security: { title: '安全仪表板', scan: '运行扫描', threats: '检测到的威胁', secure: '安全' },
    payments: { title: '订阅和账单', currentPlan: '当前方案', upgrade: '升级', cancel: '取消', giftCard: '礼品卡' },
    common: { loading: '加载中...', error: '发生错误', success: '成功', cancel: '取消', save: '保存', delete: '删除', edit: '编辑', close: '关闭', back: '返回', next: '下一步', submit: '提交', confirm: '确认', search: '搜索', refresh: '刷新', settings: '设置', logout: '退出' },
  },
  ar: {
    app: { name: 'Nexus AI Pro', tagline: 'منصة ذكاء اصطناعي بمستوى عسكري' },
    nav: { chat: 'محادثة', analytics: 'تحليلات', security: 'الأمان', settings: 'إعدادات', dashboard: 'لوحة التحكم', projects: 'مشاريع', payments: 'المدفوعات', profile: 'الملف الشخصي' },
    auth: { signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب', signOut: 'تسجيل الخروج', email: 'البريد الإلكتروني', password: 'كلمة المرور', username: 'اسم المستخدم', biometricLogin: 'تسجيل الدخول بالبيومتري', twoFactorAuth: 'المصادقة الثنائية', passwordStrength: 'قوة كلمة المرور', passwordRequirements: '13 حرفًا على الأقل مع أحرف كبيرة وصغيرة وأرقام وأحرف خاصة' },
    analytics: { title: 'لوحة التحليلات', totalViews: 'إجمالي المشاهدات', totalLikes: 'إجمالي الإعجابات', reach: 'إجمالي الوصول', engagement: 'معدل التفاعل', followers: 'المتابعون', retention: 'معدل الاستبقاء' },
    security: { title: 'لوحة الأمان', scan: 'تشغيل الفحص', threats: 'التهديدات المكتشفة', secure: 'آمن' },
    payments: { title: 'الاشتراك والفواتير', currentPlan: 'الخطة الحالية', upgrade: 'ترقية', cancel: 'إلغاء', giftCard: 'بطاقة هدية' },
    common: { loading: 'جاري التحميل...', error: 'حدث خطأ', success: 'نجاح', cancel: 'إلغاء', save: 'حفظ', delete: 'حذف', edit: 'تعديل', close: 'إغلاق', back: 'رجوع', next: 'التالي', submit: 'إرسال', confirm: 'تأكيد', search: 'بحث', refresh: 'تحديث', settings: 'إعدادات', logout: 'تسجيل الخروج' },
  },
  pt: {
    app: { name: 'Nexus AI Pro', tagline: 'Plataforma IA de Nível Militar' },
    nav: { chat: 'Chat', analytics: 'Análises', security: 'Segurança', settings: 'Configurações', dashboard: 'Painel', projects: 'Projetos', payments: 'Pagamentos', profile: 'Perfil' },
    auth: { signIn: 'Entrar', signUp: 'Cadastrar', signOut: 'Sair', email: 'Endereço de Email', password: 'Senha', username: 'Nome de Usuário', biometricLogin: 'Login Biométrico', twoFactorAuth: 'Autenticação de 2 Fatores', passwordStrength: 'Força da Senha', passwordRequirements: 'Mínimo 13 caracteres com maiúsculas, minúsculas, números e caracteres especiais' },
    analytics: { title: 'Painel de Análises', totalViews: 'Total de Visualizações', totalLikes: 'Total de Curtidas', reach: 'Alcance Total', engagement: 'Taxa de Engajamento', followers: 'Seguidores', retention: 'Taxa de Retenção' },
    security: { title: 'Painel de Segurança', scan: 'Executar Varredura', threats: 'Ameaças Detectadas', secure: 'Seguro' },
    payments: { title: 'Assinatura e Cobrança', currentPlan: 'Plano Atual', upgrade: 'Fazer Upgrade', cancel: 'Cancelar', giftCard: 'Cartão Presente' },
    common: { loading: 'Carregando...', error: 'Ocorreu um erro', success: 'Sucesso', cancel: 'Cancelar', save: 'Salvar', delete: 'Excluir', edit: 'Editar', close: 'Fechar', back: 'Voltar', next: 'Próximo', submit: 'Enviar', confirm: 'Confirmar', search: 'Pesquisar', refresh: 'Atualizar', settings: 'Configurações', logout: 'Sair' },
  },
};

export function getTranslation(lang, key) {
  const keys = key.split('.');
  let current = translations[lang] || translations.en;
  for (const k of keys) {
    if (current == null) return key;
    current = current[k];
  }
  return current ?? (translations.en ? getTranslation('en', key) : key);
}

export function detectLanguage() {
  if (typeof navigator === 'undefined') return 'en';
  const browserLang = navigator.language?.split('-')[0] || 'en';
  return SUPPORTED_LANGUAGES[browserLang] ? browserLang : 'en';
}

export function getRegionalConfig(lang) {
  const configs = {
    en: { dateFormat: 'MM/DD/YYYY', timeFormat: '12h', currency: 'USD', currencySymbol: '$', numberFormat: 'en-US' },
    es: { dateFormat: 'DD/MM/YYYY', timeFormat: '24h', currency: 'EUR', currencySymbol: '€', numberFormat: 'es-ES' },
    fr: { dateFormat: 'DD/MM/YYYY', timeFormat: '24h', currency: 'EUR', currencySymbol: '€', numberFormat: 'fr-FR' },
    de: { dateFormat: 'DD.MM.YYYY', timeFormat: '24h', currency: 'EUR', currencySymbol: '€', numberFormat: 'de-DE' },
    ja: { dateFormat: 'YYYY/MM/DD', timeFormat: '24h', currency: 'JPY', currencySymbol: '¥', numberFormat: 'ja-JP' },
    zh: { dateFormat: 'YYYY-MM-DD', timeFormat: '24h', currency: 'CNY', currencySymbol: '¥', numberFormat: 'zh-CN' },
    ar: { dateFormat: 'DD/MM/YYYY', timeFormat: '12h', currency: 'SAR', currencySymbol: '﷼', numberFormat: 'ar-SA' },
    pt: { dateFormat: 'DD/MM/YYYY', timeFormat: '24h', currency: 'BRL', currencySymbol: 'R$', numberFormat: 'pt-BR' },
    ko: { dateFormat: 'YYYY.MM.DD', timeFormat: '24h', currency: 'KRW', currencySymbol: '₩', numberFormat: 'ko-KR' },
    ru: { dateFormat: 'DD.MM.YYYY', timeFormat: '24h', currency: 'RUB', currencySymbol: '₽', numberFormat: 'ru-RU' },
  };
  return configs[lang] || configs.en;
}

export function formatNumber(value, lang) {
  const config = getRegionalConfig(lang);
  return new Intl.NumberFormat(config.numberFormat).format(value);
}

export function formatCurrency(value, lang) {
  const config = getRegionalConfig(lang);
  return new Intl.NumberFormat(config.numberFormat, {
    style: 'currency',
    currency: config.currency,
  }).format(value);
}

export function formatDate(date, lang) {
  const config = getRegionalConfig(lang);
  return new Intl.DateTimeFormat(config.numberFormat, {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(date));
}
