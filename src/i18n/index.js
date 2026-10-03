// src/i18n/index.js
// Date: 2026-10-03
// Multi-language support with auto-translate capability

import i18next from 'i18next';

const resources = {
  en: {
    translation: {
      app: { name: 'Nexus AI Pro', tagline: 'Military-Grade AI Platform' },
      nav: { dashboard: 'Dashboard', analytics: 'Analytics', security: 'Security', projects: 'Projects', settings: 'Settings' },
      auth: {
        login: 'Sign In', register: 'Create Account', logout: 'Sign Out',
        password: 'Password', email: 'Email', username: 'Username',
        forgotPassword: 'Forgot Password?', mfa: 'Two-Factor Authentication',
        biometric: 'Use Biometrics', fingerprint: 'Fingerprint', faceId: 'Face ID',
        retinal: 'Retinal Scan', touchId: 'Touch ID'
      },
      errors: {
        required: 'This field is required',
        invalidEmail: 'Invalid email address',
        passwordWeak: 'Password must be at least 13 characters with uppercase, lowercase, number, and special character',
        networkError: 'Network error, please try again'
      },
      common: { save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', create: 'Create', search: 'Search', loading: 'Loading...' }
    }
  },
  es: {
    translation: {
      app: { name: 'Nexus AI Pro', tagline: 'Plataforma de IA de Nivel Militar' },
      nav: { dashboard: 'Panel', analytics: 'Análisis', security: 'Seguridad', projects: 'Proyectos', settings: 'Configuración' },
      auth: {
        login: 'Iniciar Sesión', register: 'Crear Cuenta', logout: 'Cerrar Sesión',
        password: 'Contraseña', email: 'Correo', username: 'Nombre de usuario',
        forgotPassword: '¿Olvidaste tu contraseña?', mfa: 'Autenticación de Dos Factores',
        biometric: 'Usar Biometría', fingerprint: 'Huella Digital', faceId: 'Face ID',
        retinal: 'Escaneo Retinal', touchId: 'Touch ID'
      },
      errors: {
        required: 'Este campo es obligatorio',
        invalidEmail: 'Correo electrónico inválido',
        passwordWeak: 'La contraseña debe tener al menos 13 caracteres con mayúsculas, minúsculas, número y carácter especial',
        networkError: 'Error de red, inténtalo de nuevo'
      },
      common: { save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar', create: 'Crear', search: 'Buscar', loading: 'Cargando...' }
    }
  },
  fr: {
    translation: {
      app: { name: 'Nexus AI Pro', tagline: 'Plateforme IA de Grade Militaire' },
      nav: { dashboard: 'Tableau de bord', analytics: 'Analytique', security: 'Sécurité', projects: 'Projets', settings: 'Paramètres' },
      auth: {
        login: 'Se connecter', register: 'Créer un compte', logout: 'Se déconnecter',
        password: 'Mot de passe', email: 'E-mail', username: "Nom d'utilisateur",
        forgotPassword: 'Mot de passe oublié?', mfa: 'Authentification à deux facteurs',
        biometric: 'Utiliser la biométrie', fingerprint: 'Empreinte', faceId: 'Face ID',
        retinal: 'Scan rétinien', touchId: 'Touch ID'
      },
      errors: {
        required: 'Ce champ est obligatoire',
        invalidEmail: 'Adresse e-mail invalide',
        passwordWeak: 'Le mot de passe doit comporter au moins 13 caractères avec majuscules, minuscules, chiffre et caractère spécial',
        networkError: 'Erreur réseau, veuillez réessayer'
      },
      common: { save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer', edit: 'Modifier', create: 'Créer', search: 'Rechercher', loading: 'Chargement...' }
    }
  },
  de: {
    translation: {
      app: { name: 'Nexus AI Pro', tagline: 'KI-Plattform in Militärqualität' },
      nav: { dashboard: 'Dashboard', analytics: 'Analytik', security: 'Sicherheit', projects: 'Projekte', settings: 'Einstellungen' },
      auth: {
        login: 'Anmelden', register: 'Konto erstellen', logout: 'Abmelden',
        password: 'Passwort', email: 'E-Mail', username: 'Benutzername',
        forgotPassword: 'Passwort vergessen?', mfa: 'Zwei-Faktor-Authentifizierung',
        biometric: 'Biometrie verwenden', fingerprint: 'Fingerabdruck', faceId: 'Face ID',
        retinal: 'Netzhautscan', touchId: 'Touch ID'
      },
      errors: {
        required: 'Dieses Feld ist erforderlich',
        invalidEmail: 'Ungültige E-Mail-Adresse',
        passwordWeak: 'Passwort muss mindestens 13 Zeichen mit Groß-, Kleinbuchstaben, Zahl und Sonderzeichen haben',
        networkError: 'Netzwerkfehler, bitte erneut versuchen'
      },
      common: { save: 'Speichern', cancel: 'Abbrechen', delete: 'Löschen', edit: 'Bearbeiten', create: 'Erstellen', search: 'Suchen', loading: 'Laden...' }
    }
  },
  ja: {
    translation: {
      app: { name: 'Nexus AI Pro', tagline: '軍用グレードAIプラットフォーム' },
      nav: { dashboard: 'ダッシュボード', analytics: '分析', security: 'セキュリティ', projects: 'プロジェクト', settings: '設定' },
      auth: {
        login: 'ログイン', register: 'アカウント作成', logout: 'ログアウト',
        password: 'パスワード', email: 'メール', username: 'ユーザー名',
        forgotPassword: 'パスワードをお忘れですか？', mfa: '二要素認証',
        biometric: '生体認証を使用', fingerprint: '指紋', faceId: 'Face ID',
        retinal: '網膜スキャン', touchId: 'Touch ID'
      },
      errors: {
        required: 'このフィールドは必須です',
        invalidEmail: '無効なメールアドレス',
        passwordWeak: 'パスワードは13文字以上で、大文字・小文字・数字・特殊文字を含む必要があります',
        networkError: 'ネットワークエラー、再試行してください'
      },
      common: { save: '保存', cancel: 'キャンセル', delete: '削除', edit: '編集', create: '作成', search: '検索', loading: '読み込み中...' }
    }
  },
  zh: {
    translation: {
      app: { name: 'Nexus AI Pro', tagline: '军事级AI平台' },
      nav: { dashboard: '仪表板', analytics: '分析', security: '安全', projects: '项目', settings: '设置' },
      auth: {
        login: '登录', register: '注册账户', logout: '退出',
        password: '密码', email: '邮箱', username: '用户名',
        forgotPassword: '忘记密码？', mfa: '双因素认证',
        biometric: '使用生物特征', fingerprint: '指纹', faceId: 'Face ID',
        retinal: '视网膜扫描', touchId: 'Touch ID'
      },
      errors: {
        required: '此字段为必填项',
        invalidEmail: '无效的电子邮件地址',
        passwordWeak: '密码至少需要13个字符，包含大写、小写、数字和特殊字符',
        networkError: '网络错误，请重试'
      },
      common: { save: '保存', cancel: '取消', delete: '删除', edit: '编辑', create: '创建', search: '搜索', loading: '加载中...' }
    }
  },
  ar: {
    translation: {
      app: { name: 'Nexus AI Pro', tagline: 'منصة ذكاء اصطناعي بمستوى عسكري' },
      nav: { dashboard: 'لوحة التحكم', analytics: 'التحليلات', security: 'الأمان', projects: 'المشاريع', settings: 'الإعدادات' },
      auth: {
        login: 'تسجيل الدخول', register: 'إنشاء حساب', logout: 'تسجيل الخروج',
        password: 'كلمة المرور', email: 'البريد الإلكتروني', username: 'اسم المستخدم',
        forgotPassword: 'نسيت كلمة المرور؟', mfa: 'المصادقة الثنائية',
        biometric: 'استخدام القياسات البيومترية', fingerprint: 'بصمة الإصبع', faceId: 'معرف الوجه',
        retinal: 'مسح الشبكية', touchId: 'Touch ID'
      },
      errors: {
        required: 'هذا الحقل مطلوب',
        invalidEmail: 'عنوان بريد إلكتروني غير صالح',
        passwordWeak: 'يجب أن تتكون كلمة المرور من 13 حرفاً على الأقل مع أحرف كبيرة وصغيرة وأرقام وأحرف خاصة',
        networkError: 'خطأ في الشبكة، يرجى المحاولة مرة أخرى'
      },
      common: { save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل', create: 'إنشاء', search: 'بحث', loading: 'تحميل...' }
    }
  }
};

const SUPPORTED_LANGUAGES = Object.keys(resources);
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

await i18next.init({
  lng: 'en',
  fallbackLng: 'en',
  resources,
  interpolation: { escapeValue: false }
});

export function detectLanguage(acceptLanguageHeader) {
  if (!acceptLanguageHeader) return 'en';
  const langs = acceptLanguageHeader.split(',').map(l => l.split(';')[0].trim().toLowerCase().substring(0, 2));
  return langs.find(l => SUPPORTED_LANGUAGES.includes(l)) || 'en';
}

export function isRTL(lang) {
  return RTL_LANGUAGES.includes(lang);
}

export function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES.map(code => ({
    code,
    name: new Intl.DisplayNames([code], { type: 'language' }).of(code),
    rtl: RTL_LANGUAGES.includes(code)
  }));
}

export { SUPPORTED_LANGUAGES, RTL_LANGUAGES };
export default i18next;
