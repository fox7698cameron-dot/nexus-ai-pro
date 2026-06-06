// src/i18n/config.js
// 2026-06-06 | Multi-language & auto-translate support

const LOCALES = {
  en: {
    name: 'English', dir: 'ltr', flag: '🇺🇸',
    t: {
      app_name: 'Nexus AI Pro',
      sign_in: 'Sign In', sign_out: 'Sign Out', register: 'Create Account',
      email: 'Email', password: 'Password', username: 'Username',
      dashboard: 'Dashboard', analytics: 'Analytics', security: 'Security',
      projects: 'Projects', settings: 'Settings', admin: 'Admin',
      chat: 'Chat', search: 'Search', save: 'Save', cancel: 'Cancel',
      delete: 'Delete', confirm: 'Confirm', loading: 'Loading…',
      error: 'Error', success: 'Success', warning: 'Warning',
      upgrade: 'Upgrade Plan', subscribe: 'Subscribe',
      total_views: 'Total Views', followers: 'Followers', reach: 'Reach',
      retention: 'Retention', likes: 'Likes', shares: 'Shares',
      new_project: 'New Project', active: 'Active', completed: 'Completed',
      mfa_setup: 'Set Up 2FA', mfa_code: 'Authentication Code',
      biometric: 'Biometric Login', fingerprint: 'Fingerprint',
      face_id: 'Face ID', retinal_scan: 'Retinal Scan',
      password_strength: 'Password Strength', weak: 'Weak', strong: 'Strong',
      connect: 'Connect', disconnect: 'Disconnect', refresh: 'Refresh',
      real_time: 'Real-Time', last_updated: 'Last Updated'
    }
  },
  es: {
    name: 'Español', dir: 'ltr', flag: '🇪🇸',
    t: {
      app_name: 'Nexus AI Pro',
      sign_in: 'Iniciar Sesión', sign_out: 'Cerrar Sesión', register: 'Crear Cuenta',
      email: 'Correo', password: 'Contraseña', username: 'Usuario',
      dashboard: 'Panel', analytics: 'Analíticas', security: 'Seguridad',
      projects: 'Proyectos', settings: 'Ajustes', admin: 'Admin',
      chat: 'Chat', search: 'Buscar', save: 'Guardar', cancel: 'Cancelar',
      delete: 'Eliminar', confirm: 'Confirmar', loading: 'Cargando…',
      error: 'Error', success: 'Éxito', warning: 'Advertencia',
      upgrade: 'Mejorar Plan', subscribe: 'Suscribirse',
      total_views: 'Vistas Totales', followers: 'Seguidores', reach: 'Alcance',
      retention: 'Retención', likes: 'Me Gusta', shares: 'Compartidos',
      new_project: 'Nuevo Proyecto', active: 'Activo', completed: 'Completado',
      mfa_setup: 'Configurar 2FA', mfa_code: 'Código de Autenticación',
      biometric: 'Inicio Biométrico', fingerprint: 'Huella Dactilar',
      face_id: 'Face ID', retinal_scan: 'Escaneo Retinal',
      password_strength: 'Fuerza de Contraseña', weak: 'Débil', strong: 'Fuerte',
      connect: 'Conectar', disconnect: 'Desconectar', refresh: 'Actualizar',
      real_time: 'Tiempo Real', last_updated: 'Última Actualización'
    }
  },
  fr: {
    name: 'Français', dir: 'ltr', flag: '🇫🇷',
    t: {
      app_name: 'Nexus AI Pro',
      sign_in: 'Se Connecter', sign_out: 'Se Déconnecter', register: 'Créer un Compte',
      email: 'Email', password: 'Mot de Passe', username: "Nom d'Utilisateur",
      dashboard: 'Tableau de Bord', analytics: 'Analytique', security: 'Sécurité',
      projects: 'Projets', settings: 'Paramètres', admin: 'Admin',
      chat: 'Chat', search: 'Rechercher', save: 'Sauvegarder', cancel: 'Annuler',
      delete: 'Supprimer', confirm: 'Confirmer', loading: 'Chargement…',
      error: 'Erreur', success: 'Succès', warning: 'Avertissement',
      upgrade: 'Améliorer', subscribe: "S'abonner",
      total_views: 'Vues Totales', followers: 'Abonnés', reach: 'Portée',
      retention: 'Rétention', likes: "J'aime", shares: 'Partages',
      new_project: 'Nouveau Projet', active: 'Actif', completed: 'Terminé',
      mfa_setup: 'Config 2FA', mfa_code: "Code d'Authentification",
      biometric: 'Login Biométrique', fingerprint: 'Empreinte Digitale',
      face_id: 'Face ID', retinal_scan: 'Scan Rétinien',
      password_strength: 'Force du Mot de Passe', weak: 'Faible', strong: 'Fort',
      connect: 'Connecter', disconnect: 'Déconnecter', refresh: 'Actualiser',
      real_time: 'Temps Réel', last_updated: 'Dernière Mise à Jour'
    }
  },
  de: {
    name: 'Deutsch', dir: 'ltr', flag: '🇩🇪',
    t: {
      app_name: 'Nexus AI Pro',
      sign_in: 'Anmelden', sign_out: 'Abmelden', register: 'Konto Erstellen',
      email: 'E-Mail', password: 'Passwort', username: 'Benutzername',
      dashboard: 'Dashboard', analytics: 'Analytik', security: 'Sicherheit',
      projects: 'Projekte', settings: 'Einstellungen', admin: 'Admin',
      chat: 'Chat', search: 'Suchen', save: 'Speichern', cancel: 'Abbrechen',
      delete: 'Löschen', confirm: 'Bestätigen', loading: 'Laden…',
      error: 'Fehler', success: 'Erfolg', warning: 'Warnung',
      upgrade: 'Upgraden', subscribe: 'Abonnieren',
      total_views: 'Gesamte Ansichten', followers: 'Follower', reach: 'Reichweite',
      retention: 'Bindungsrate', likes: 'Gefällt mir', shares: 'Geteilt',
      new_project: 'Neues Projekt', active: 'Aktiv', completed: 'Abgeschlossen',
      mfa_setup: '2FA Einrichten', mfa_code: 'Authentifizierungscode',
      biometric: 'Biometrische Anmeldung', fingerprint: 'Fingerabdruck',
      face_id: 'Face ID', retinal_scan: 'Retina-Scan',
      password_strength: 'Passwortstärke', weak: 'Schwach', strong: 'Stark',
      connect: 'Verbinden', disconnect: 'Trennen', refresh: 'Aktualisieren',
      real_time: 'Echtzeit', last_updated: 'Zuletzt Aktualisiert'
    }
  },
  ja: {
    name: '日本語', dir: 'ltr', flag: '🇯🇵',
    t: {
      app_name: 'Nexus AI Pro',
      sign_in: 'ログイン', sign_out: 'ログアウト', register: 'アカウント作成',
      email: 'メール', password: 'パスワード', username: 'ユーザー名',
      dashboard: 'ダッシュボード', analytics: 'アナリティクス', security: 'セキュリティ',
      projects: 'プロジェクト', settings: '設定', admin: '管理者',
      chat: 'チャット', search: '検索', save: '保存', cancel: 'キャンセル',
      delete: '削除', confirm: '確認', loading: '読み込み中…',
      error: 'エラー', success: '成功', warning: '警告',
      upgrade: 'プラン更新', subscribe: '購読',
      total_views: '総視聴回数', followers: 'フォロワー', reach: 'リーチ',
      retention: '視聴継続率', likes: 'いいね', shares: 'シェア',
      new_project: '新しいプロジェクト', active: 'アクティブ', completed: '完了',
      mfa_setup: '2FA設定', mfa_code: '認証コード',
      biometric: '生体認証', fingerprint: '指紋', face_id: 'Face ID', retinal_scan: '網膜スキャン',
      password_strength: 'パスワード強度', weak: '弱い', strong: '強い',
      connect: '接続', disconnect: '切断', refresh: '更新',
      real_time: 'リアルタイム', last_updated: '最終更新'
    }
  },
  ar: {
    name: 'العربية', dir: 'rtl', flag: '🇸🇦',
    t: {
      app_name: 'Nexus AI Pro',
      sign_in: 'تسجيل الدخول', sign_out: 'تسجيل الخروج', register: 'إنشاء حساب',
      email: 'البريد الإلكتروني', password: 'كلمة المرور', username: 'اسم المستخدم',
      dashboard: 'لوحة التحكم', analytics: 'التحليلات', security: 'الأمان',
      projects: 'المشاريع', settings: 'الإعدادات', admin: 'المشرف',
      chat: 'الدردشة', search: 'بحث', save: 'حفظ', cancel: 'إلغاء',
      delete: 'حذف', confirm: 'تأكيد', loading: 'جار التحميل…',
      error: 'خطأ', success: 'نجاح', warning: 'تحذير',
      upgrade: 'ترقية الخطة', subscribe: 'اشتراك',
      total_views: 'إجمالي المشاهدات', followers: 'المتابعون', reach: 'الوصول',
      retention: 'الاحتفاظ', likes: 'إعجابات', shares: 'مشاركات',
      new_project: 'مشروع جديد', active: 'نشط', completed: 'مكتمل',
      mfa_setup: 'إعداد 2FA', mfa_code: 'رمز المصادقة',
      biometric: 'تسجيل دخول بيومتري', fingerprint: 'بصمة الإصبع',
      face_id: 'معرف الوجه', retinal_scan: 'مسح الشبكية',
      password_strength: 'قوة كلمة المرور', weak: 'ضعيف', strong: 'قوي',
      connect: 'اتصال', disconnect: 'قطع الاتصال', refresh: 'تحديث',
      real_time: 'الوقت الفعلي', last_updated: 'آخر تحديث'
    }
  },
  zh: {
    name: '中文', dir: 'ltr', flag: '🇨🇳',
    t: {
      app_name: 'Nexus AI Pro',
      sign_in: '登录', sign_out: '退出', register: '创建账户',
      email: '邮箱', password: '密码', username: '用户名',
      dashboard: '仪表板', analytics: '分析', security: '安全',
      projects: '项目', settings: '设置', admin: '管理员',
      chat: '聊天', search: '搜索', save: '保存', cancel: '取消',
      delete: '删除', confirm: '确认', loading: '加载中…',
      error: '错误', success: '成功', warning: '警告',
      upgrade: '升级计划', subscribe: '订阅',
      total_views: '总观看量', followers: '粉丝', reach: '覆盖人数',
      retention: '留存率', likes: '点赞', shares: '分享',
      new_project: '新项目', active: '活跃', completed: '完成',
      mfa_setup: '设置2FA', mfa_code: '验证码',
      biometric: '生物识别登录', fingerprint: '指纹', face_id: 'Face ID', retinal_scan: '视网膜扫描',
      password_strength: '密码强度', weak: '弱', strong: '强',
      connect: '连接', disconnect: '断开', refresh: '刷新',
      real_time: '实时', last_updated: '最后更新'
    }
  },
  pt: {
    name: 'Português', dir: 'ltr', flag: '🇧🇷',
    t: {
      app_name: 'Nexus AI Pro',
      sign_in: 'Entrar', sign_out: 'Sair', register: 'Criar Conta',
      email: 'E-mail', password: 'Senha', username: 'Nome de Usuário',
      dashboard: 'Painel', analytics: 'Análise', security: 'Segurança',
      projects: 'Projetos', settings: 'Configurações', admin: 'Admin',
      chat: 'Chat', search: 'Buscar', save: 'Salvar', cancel: 'Cancelar',
      delete: 'Excluir', confirm: 'Confirmar', loading: 'Carregando…',
      error: 'Erro', success: 'Sucesso', warning: 'Aviso',
      upgrade: 'Atualizar Plano', subscribe: 'Assinar',
      total_views: 'Total de Visualizações', followers: 'Seguidores', reach: 'Alcance',
      retention: 'Retenção', likes: 'Curtidas', shares: 'Compartilhamentos',
      new_project: 'Novo Projeto', active: 'Ativo', completed: 'Concluído',
      mfa_setup: 'Config. 2FA', mfa_code: 'Código de Autenticação',
      biometric: 'Login Biométrico', fingerprint: 'Impressão Digital',
      face_id: 'Face ID', retinal_scan: 'Scan Retinal',
      password_strength: 'Força da Senha', weak: 'Fraca', strong: 'Forte',
      connect: 'Conectar', disconnect: 'Desconectar', refresh: 'Atualizar',
      real_time: 'Tempo Real', last_updated: 'Última Atualização'
    }
  }
};

// Auto-detect locale from browser settings
function detectLocale() {
  const saved = localStorage.getItem('nexus:locale');
  if (saved && LOCALES[saved]) return saved;

  const lang = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return LOCALES[lang] ? lang : 'en';
}

let currentLocale = detectLocale();

export function setLocale(locale) {
  if (!LOCALES[locale]) return;
  currentLocale = locale;
  localStorage.setItem('nexus:locale', locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = LOCALES[locale].dir;
  window.dispatchEvent(new CustomEvent('nexus:locale:changed', { detail: { locale } }));
}

export function getLocale() {
  return currentLocale;
}

export function getAvailableLocales() {
  return Object.entries(LOCALES).map(([id, { name, flag }]) => ({ id, name, flag }));
}

export function t(key, fallback) {
  return LOCALES[currentLocale]?.t?.[key] || LOCALES.en?.t?.[key] || fallback || key;
}

export function getDirection() {
  return LOCALES[currentLocale]?.dir || 'ltr';
}

// Auto-translate via Google Translate API (requires GOOGLE_TRANSLATE_API_KEY env var)
export async function autoTranslate(text, targetLocale = currentLocale, sourceLocale = 'en') {
  if (targetLocale === sourceLocale) return text;
  if (!text || typeof text !== 'string') return text;

  // Check cache first
  const cacheKey = `nexus:translate:${sourceLocale}:${targetLocale}:${btoa(encodeURIComponent(text)).slice(0, 32)}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch('/api/i18n/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLocale, sourceLocale })
    });
    if (!res.ok) return text;
    const data = await res.json();
    const translated = data.translatedText || text;
    sessionStorage.setItem(cacheKey, translated);
    return translated;
  } catch {
    return text;
  }
}

// Initialize
setLocale(currentLocale);

export { LOCALES };
export default { t, setLocale, getLocale, getAvailableLocales, autoTranslate, getDirection };
