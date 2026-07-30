// src/i18n/config.js
// Created: 2026-07-30
// Multi-language and regional support with auto-translate capability

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Supported locales
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸', rtl: false },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', rtl: false },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷', rtl: false },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', rtl: false },
  pt: { name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', rtl: false },
  ja: { name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', rtl: false },
  ko: { name: 'Korean', nativeName: '한국어', flag: '🇰🇷', rtl: false },
  zh: { name: 'Chinese (Simplified)', nativeName: '中文', flag: '🇨🇳', rtl: false },
  ar: { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', rtl: false },
  ru: { name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', rtl: false },
  it: { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', rtl: false },
  nl: { name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', rtl: false },
  pl: { name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', rtl: false },
  tr: { name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', rtl: false },
  sv: { name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', rtl: false },
  uk: { name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', rtl: false },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', rtl: false },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', rtl: false },
  th: { name: 'Thai', nativeName: 'ภาษาไทย', flag: '🇹🇭', rtl: false }
};

// Translations (English as base, others as stubs to extend)
const resources = {
  en: {
    translation: {
      app: {
        name: 'Nexus AI Pro',
        tagline: 'Military-Grade AI Platform'
      },
      nav: {
        dashboard: 'Dashboard',
        analytics: 'Analytics',
        security: 'Security',
        projects: 'Projects',
        settings: 'Settings',
        profile: 'Profile',
        billing: 'Billing',
        logout: 'Sign Out'
      },
      auth: {
        login: 'Sign In',
        register: 'Create Account',
        email: 'Email Address',
        password: 'Password',
        username: 'Username',
        forgotPassword: 'Forgot password?',
        rememberMe: 'Remember me',
        mfaCode: '2FA Code',
        biometric: 'Use Biometrics',
        fingerprint: 'Use Fingerprint',
        faceId: 'Use Face ID',
        passwordStrength: {
          weak: 'Weak',
          medium: 'Medium',
          strong: 'Strong'
        },
        errors: {
          invalidEmail: 'Invalid email address',
          weakPassword: 'Password too weak',
          userExists: 'Account already exists',
          invalidCredentials: 'Invalid email or password',
          mfaRequired: 'Please enter your 2FA code',
          accountLocked: 'Account temporarily locked'
        },
        success: {
          registered: 'Account created successfully!',
          loggedIn: 'Welcome back!',
          passwordChanged: 'Password updated successfully'
        }
      },
      analytics: {
        title: 'Analytics Dashboard',
        overview: 'Overview',
        realtime: 'Real-Time',
        views: 'Views',
        likes: 'Likes',
        comments: 'Comments',
        shares: 'Shares',
        reach: 'Reach',
        followers: 'Followers',
        retention: 'Retention',
        engagement: 'Engagement Rate',
        trending: 'Trending',
        timeRanges: {
          '7d': 'Last 7 Days',
          '30d': 'Last 30 Days',
          '90d': 'Last 90 Days'
        }
      },
      security: {
        title: 'Security Dashboard',
        score: 'Security Score',
        scanning: 'Scanning...',
        scan: 'Run Scan',
        status: {
          secure: 'Secure',
          warning: 'Warning',
          critical: 'Critical'
        },
        threats: 'Threats',
        vulnerabilities: 'Vulnerabilities',
        encryption: 'Encryption',
        network: 'Network Monitor',
        mfa: 'Two-Factor Authentication',
        biometric: 'Biometric Auth'
      },
      projects: {
        title: 'Project Tracker',
        new: 'New Project',
        types: {
          coding: 'Coding',
          game: 'Game Development',
          ar: 'Augmented Reality',
          vr: 'Virtual Reality',
          xr: 'Mixed Reality (XR)',
          '3d': '3D Design',
          mobile: 'Mobile App',
          web: 'Web App',
          desktop: 'Desktop App'
        },
        fields: {
          name: 'Project Name',
          type: 'Project Type',
          status: 'Status',
          progress: 'Progress',
          engine: 'Game Engine',
          platform: 'Platform'
        },
        status: {
          active: 'Active',
          completed: 'Completed',
          paused: 'Paused',
          archived: 'Archived'
        }
      },
      common: {
        loading: 'Loading...',
        error: 'An error occurred',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        view: 'View',
        search: 'Search',
        filter: 'Filter',
        export: 'Export',
        refresh: 'Refresh',
        close: 'Close',
        confirm: 'Confirm',
        back: 'Back',
        next: 'Next',
        submit: 'Submit'
      }
    }
  },
  es: {
    translation: {
      app: { name: 'Nexus AI Pro', tagline: 'Plataforma IA de Grado Militar' },
      nav: {
        dashboard: 'Panel', analytics: 'Analíticas', security: 'Seguridad',
        projects: 'Proyectos', settings: 'Configuración', profile: 'Perfil',
        billing: 'Facturación', logout: 'Cerrar Sesión'
      },
      auth: {
        login: 'Iniciar Sesión', register: 'Crear Cuenta', email: 'Correo Electrónico',
        password: 'Contraseña', username: 'Nombre de Usuario'
      },
      common: {
        loading: 'Cargando...', error: 'Ocurrió un error', save: 'Guardar',
        cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar'
      }
    }
  },
  fr: {
    translation: {
      app: { name: 'Nexus AI Pro', tagline: 'Plateforme IA Grade Militaire' },
      nav: {
        dashboard: 'Tableau de Bord', analytics: 'Analytiques', security: 'Sécurité',
        projects: 'Projets', settings: 'Paramètres', profile: 'Profil',
        billing: 'Facturation', logout: 'Se Déconnecter'
      },
      auth: {
        login: 'Se Connecter', register: 'Créer un Compte', email: 'Adresse Email',
        password: 'Mot de Passe', username: "Nom d'Utilisateur"
      },
      common: {
        loading: 'Chargement...', error: 'Une erreur est survenue', save: 'Enregistrer',
        cancel: 'Annuler', delete: 'Supprimer', edit: 'Modifier'
      }
    }
  },
  de: {
    translation: {
      app: { name: 'Nexus AI Pro', tagline: 'KI-Plattform in Militärqualität' },
      nav: {
        dashboard: 'Dashboard', analytics: 'Analytik', security: 'Sicherheit',
        projects: 'Projekte', settings: 'Einstellungen', profile: 'Profil',
        billing: 'Abrechnung', logout: 'Abmelden'
      },
      auth: {
        login: 'Anmelden', register: 'Konto erstellen', email: 'E-Mail-Adresse',
        password: 'Passwort', username: 'Benutzername'
      },
      common: {
        loading: 'Lädt...', error: 'Ein Fehler ist aufgetreten', save: 'Speichern',
        cancel: 'Abbrechen', delete: 'Löschen', edit: 'Bearbeiten'
      }
    }
  },
  ja: {
    translation: {
      app: { name: 'Nexus AI Pro', tagline: '軍事グレードAIプラットフォーム' },
      nav: {
        dashboard: 'ダッシュボード', analytics: 'アナリティクス', security: 'セキュリティ',
        projects: 'プロジェクト', settings: '設定', profile: 'プロフィール',
        billing: '請求', logout: 'ログアウト'
      },
      auth: {
        login: 'ログイン', register: 'アカウント作成', email: 'メールアドレス',
        password: 'パスワード', username: 'ユーザー名'
      },
      common: {
        loading: '読み込み中...', error: 'エラーが発生しました', save: '保存',
        cancel: 'キャンセル', delete: '削除', edit: '編集'
      }
    }
  },
  zh: {
    translation: {
      app: { name: 'Nexus AI Pro', tagline: '军事级人工智能平台' },
      nav: {
        dashboard: '仪表板', analytics: '分析', security: '安全',
        projects: '项目', settings: '设置', profile: '个人资料',
        billing: '账单', logout: '退出登录'
      },
      auth: {
        login: '登录', register: '创建账户', email: '电子邮件',
        password: '密码', username: '用户名'
      },
      common: {
        loading: '加载中...', error: '发生错误', save: '保存',
        cancel: '取消', delete: '删除', edit: '编辑'
      }
    }
  },
  ar: {
    translation: {
      app: { name: 'Nexus AI Pro', tagline: 'منصة الذكاء الاصطناعي العسكرية' },
      nav: {
        dashboard: 'لوحة التحكم', analytics: 'التحليلات', security: 'الأمان',
        projects: 'المشاريع', settings: 'الإعدادات', profile: 'الملف الشخصي',
        billing: 'الفواتير', logout: 'تسجيل الخروج'
      },
      auth: {
        login: 'تسجيل الدخول', register: 'إنشاء حساب', email: 'البريد الإلكتروني',
        password: 'كلمة المرور', username: 'اسم المستخدم'
      },
      common: {
        loading: '...جاري التحميل', error: 'حدث خطأ', save: 'حفظ',
        cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل'
      }
    }
  },
  ko: {
    translation: {
      app: { name: 'Nexus AI Pro', tagline: '군사급 AI 플랫폼' },
      nav: {
        dashboard: '대시보드', analytics: '분석', security: '보안',
        projects: '프로젝트', settings: '설정', profile: '프로필',
        billing: '결제', logout: '로그아웃'
      },
      auth: {
        login: '로그인', register: '계정 만들기', email: '이메일',
        password: '비밀번호', username: '사용자 이름'
      },
      common: {
        loading: '로딩 중...', error: '오류가 발생했습니다', save: '저장',
        cancel: '취소', delete: '삭제', edit: '편집'
      }
    }
  }
};

let initialized = false;

export function initI18n(defaultLanguage = 'en') {
  if (initialized) return i18n;
  initialized = true;

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: defaultLanguage,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      returnNull: false,
      returnEmptyString: false,
      defaultNS: 'translation',
      ns: ['translation'],
      debug: false,
      supportedLngs: Object.keys(SUPPORTED_LANGUAGES)
    });

  return i18n;
}

// Auto-translate function (requires AI backend or external translation API)
export async function autoTranslate(text, targetLanguage, sourceLanguage = 'auto') {
  const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!googleKey) {
    return { translated: text, source: sourceLanguage, target: targetLanguage, provider: 'none' };
  }

  try {
    const url = new URL('https://translation.googleapis.com/language/translate/v2');
    url.searchParams.set('key', googleKey);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        target: targetLanguage,
        ...(sourceLanguage !== 'auto' ? { source: sourceLanguage } : {})
      })
    });
    const data = await response.json();
    const translated = data?.data?.translations?.[0]?.translatedText || text;
    return { translated, source: data?.data?.translations?.[0]?.detectedSourceLanguage || sourceLanguage, target: targetLanguage, provider: 'google' };
  } catch (err) {
    console.error('[i18n] Auto-translate failed:', err.message);
    return { translated: text, source: sourceLanguage, target: targetLanguage, provider: 'error' };
  }
}

export default i18n;
