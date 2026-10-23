// src/i18n/translations.js
// 2026-10-23 - Multi-language support with auto-detection (9 languages)

/** @type {Record<string, { name: string, flag: string, rtl: boolean }>} */
export const LANGUAGES = {
  en: { name: 'English',    flag: '🇺🇸', rtl: false },
  es: { name: 'Español',    flag: '🇪🇸', rtl: false },
  fr: { name: 'Français',   flag: '🇫🇷', rtl: false },
  pt: { name: 'Português',  flag: '🇧🇷', rtl: false },
  ja: { name: '日本語',      flag: '🇯🇵', rtl: false },
  ko: { name: '한국어',      flag: '🇰🇷', rtl: false },
  zh: { name: '中文',        flag: '🇨🇳', rtl: false },
  ar: { name: 'العربية',    flag: '🇸🇦', rtl: true  },
  de: { name: 'Deutsch',    flag: '🇩🇪', rtl: false },
};

const strings = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  'auth.signIn':            { en: 'Sign In',          es: 'Iniciar sesión',   fr: 'Se connecter',    pt: 'Entrar',         ja: 'サインイン',     ko: '로그인',     zh: '登录',     ar: 'تسجيل الدخول',   de: 'Anmelden'          },
  'auth.register':          { en: 'Register',          es: 'Registrarse',      fr: "S'inscrire",      pt: 'Registrar',      ja: '登録',           ko: '회원가입',   zh: '注册',     ar: 'التسجيل',         de: 'Registrieren'      },
  'auth.mfaSetup':          { en: 'MFA Setup',         es: 'Configurar MFA',   fr: 'Config. MFA',     pt: 'Config. MFA',    ja: 'MFA設定',        ko: 'MFA 설정',   zh: 'MFA设置',  ar: 'إعداد MFA',       de: 'MFA Einrichten'    },
  'auth.username':          { en: 'Username',          es: 'Usuario',          fr: "Nom d'utilisateur", pt: 'Usuário',      ja: 'ユーザー名',     ko: '사용자명',   zh: '用户名',   ar: 'اسم المستخدم',    de: 'Benutzername'      },
  'auth.email':             { en: 'Email',             es: 'Correo',           fr: 'E-mail',          pt: 'E-mail',         ja: 'メール',         ko: '이메일',     zh: '邮箱',     ar: 'البريد الإلكتروني', de: 'E-Mail'           },
  'auth.password':          { en: 'Password',          es: 'Contraseña',       fr: 'Mot de passe',    pt: 'Senha',          ja: 'パスワード',     ko: '비밀번호',   zh: '密码',     ar: 'كلمة المرور',     de: 'Passwort'          },
  'auth.confirmPassword':   { en: 'Confirm Password',  es: 'Confirmar',        fr: 'Confirmer',       pt: 'Confirmar',      ja: '確認',           ko: '확인',       zh: '确认密码', ar: 'تأكيد',           de: 'Bestätigen'        },
  'auth.showPassword':      { en: 'Show password',     es: 'Mostrar',          fr: 'Afficher',        pt: 'Mostrar',        ja: '表示',           ko: '표시',       zh: '显示',     ar: 'إظهار',           de: 'Anzeigen'          },
  'auth.forgotPassword':    { en: 'Forgot password?',  es: '¿Olvidaste?',      fr: 'Oublié?',         pt: 'Esqueceu?',      ja: '忘れた?',        ko: '잊으셨나요?', zh: '忘记密码?', ar: 'نسيت؟',           de: 'Vergessen?'        },
  'auth.biometric':         { en: 'Use Biometrics',    es: 'Biométrico',       fr: 'Biométrie',       pt: 'Biometria',      ja: '生体認証',       ko: '생체인증',   zh: '生物识别', ar: 'القياسات الحيوية', de: 'Biometrie'         },
  'auth.totpCode':          { en: '2FA Code',          es: 'Código 2FA',       fr: 'Code 2FA',        pt: 'Código 2FA',     ja: '2FAコード',      ko: '2FA코드',    zh: '2FA代码',  ar: 'رمز 2FA',         de: '2FA Code'          },
  'auth.scanQr':            { en: 'Scan QR Code',      es: 'Escanear QR',      fr: 'Scanner QR',      pt: 'Escanear QR',    ja: 'QRスキャン',     ko: 'QR 스캔',    zh: '扫码',     ar: 'مسح QR',          de: 'QR scannen'        },
  'auth.manualEntry':       { en: 'Manual entry code', es: 'Código manual',    fr: 'Code manuel',     pt: 'Código manual',  ja: '手動コード',     ko: '수동 코드',  zh: '手动代码', ar: 'رمز يدوي',        de: 'Manueller Code'    },
  'auth.enrollDevice':      { en: 'Enroll Device',     es: 'Registrar dispositivo', fr: 'Enregistrer', pt: 'Registrar',    ja: 'デバイス登録',   ko: '기기 등록',  zh: '注册设备', ar: 'تسجيل جهاز',      de: 'Gerät registrieren'},
  'auth.language':          { en: 'Language',          es: 'Idioma',           fr: 'Langue',          pt: 'Idioma',         ja: '言語',           ko: '언어',       zh: '语言',     ar: 'اللغة',           de: 'Sprache'           },
  'auth.passwordStrength':  { en: 'Password strength', es: 'Fortaleza',        fr: 'Force',           pt: 'Força',          ja: '強度',           ko: '강도',       zh: '强度',     ar: 'قوة كلمة المرور', de: 'Passwortstärke'    },
  'auth.role.user':         { en: 'User',              es: 'Usuario',          fr: 'Utilisateur',     pt: 'Usuário',        ja: 'ユーザー',       ko: '사용자',     zh: '用户',     ar: 'مستخدم',          de: 'Benutzer'          },
  'auth.role.admin':        { en: 'Admin',             es: 'Admin',            fr: 'Admin',           pt: 'Admin',          ja: '管理者',         ko: '관리자',     zh: '管理员',   ar: 'مسؤول',           de: 'Administrator'     },

  // ── Common ────────────────────────────────────────────────────────────────
  'common.save':            { en: 'Save',              es: 'Guardar',          fr: 'Enregistrer',     pt: 'Salvar',         ja: '保存',           ko: '저장',       zh: '保存',     ar: 'حفظ',             de: 'Speichern'         },
  'common.cancel':          { en: 'Cancel',            es: 'Cancelar',         fr: 'Annuler',         pt: 'Cancelar',       ja: 'キャンセル',     ko: '취소',       zh: '取消',     ar: 'إلغاء',           de: 'Abbrechen'         },
  'common.delete':          { en: 'Delete',            es: 'Eliminar',         fr: 'Supprimer',       pt: 'Excluir',        ja: '削除',           ko: '삭제',       zh: '删除',     ar: 'حذف',             de: 'Löschen'           },
  'common.loading':         { en: 'Loading…',          es: 'Cargando…',        fr: 'Chargement…',     pt: 'Carregando…',    ja: '読込中…',        ko: '로딩 중…',   zh: '加载中…',  ar: 'جارٍ التحميل…',   de: 'Laden…'            },
  'common.error':           { en: 'Error',             es: 'Error',            fr: 'Erreur',          pt: 'Erro',           ja: 'エラー',         ko: '오류',       zh: '错误',     ar: 'خطأ',             de: 'Fehler'            },
  'common.success':         { en: 'Success',           es: 'Éxito',            fr: 'Succès',          pt: 'Sucesso',        ja: '成功',           ko: '성공',       zh: '成功',     ar: 'نجاح',            de: 'Erfolg'            },
  'common.settings':        { en: 'Settings',          es: 'Configuración',    fr: 'Paramètres',      pt: 'Configurações',  ja: '設定',           ko: '설정',       zh: '设置',     ar: 'الإعدادات',       de: 'Einstellungen'     },
  'common.logout':          { en: 'Log Out',           es: 'Cerrar sesión',    fr: 'Déconnexion',     pt: 'Sair',           ja: 'ログアウト',     ko: '로그아웃',   zh: '退出',     ar: 'تسجيل الخروج',    de: 'Abmelden'          },
  'common.search':          { en: 'Search',            es: 'Buscar',           fr: 'Rechercher',      pt: 'Pesquisar',      ja: '検索',           ko: '검색',       zh: '搜索',     ar: 'بحث',             de: 'Suchen'            },

  // ── Navigation ────────────────────────────────────────────────────────────
  'nav.chat':               { en: 'Chat',              es: 'Chat',             fr: 'Discussion',      pt: 'Chat',           ja: 'チャット',       ko: '채팅',       zh: '聊天',     ar: 'محادثة',          de: 'Chat'              },
  'nav.analytics':          { en: 'Analytics',         es: 'Analíticas',       fr: 'Analytique',      pt: 'Análises',       ja: '分析',           ko: '분석',       zh: '分析',     ar: 'التحليلات',       de: 'Analytik'          },
  'nav.security':           { en: 'Security',          es: 'Seguridad',        fr: 'Sécurité',        pt: 'Segurança',      ja: 'セキュリティ',   ko: '보안',       zh: '安全',     ar: 'الأمان',          de: 'Sicherheit'        },
  'nav.projects':           { en: 'Projects',          es: 'Proyectos',        fr: 'Projets',         pt: 'Projetos',       ja: 'プロジェクト',   ko: '프로젝트',   zh: '项目',     ar: 'المشاريع',        de: 'Projekte'          },

  // ── Analytics Dashboard ───────────────────────────────────────────────────
  'analytics.totalViews':   { en: 'Total Views',       es: 'Vistas',           fr: 'Vues',            pt: 'Visualizações',  ja: '総視聴数',       ko: '총 조회',    zh: '总浏览量', ar: 'إجمالي المشاهدات', de: 'Gesamtansichten'  },
  'analytics.totalReach':   { en: 'Total Reach',       es: 'Alcance',          fr: 'Portée',          pt: 'Alcance',        ja: 'リーチ',         ko: '도달',       zh: '覆盖人数', ar: 'إجمالي الوصول',   de: 'Gesamtreichweite'  },
  'analytics.avgRetention': { en: 'Avg Retention',     es: 'Retención',        fr: 'Rétention',       pt: 'Retenção',       ja: '平均保持率',     ko: '평균 유지율', zh: '平均留存',ar: 'متوسط الاحتفاظ',  de: 'Durchschnittl. Bindung'},
  'analytics.topPlatform':  { en: 'Top Platform',      es: 'Mejor plataforma', fr: 'Top plateforme',  pt: 'Principal',      ja: 'トップ',         ko: '최상위',     zh: '顶级平台', ar: 'أفضل منصة',       de: 'Top-Plattform'     },
  'analytics.followers':    { en: 'Followers',         es: 'Seguidores',       fr: 'Abonnés',         pt: 'Seguidores',     ja: 'フォロワー',     ko: '팔로워',     zh: '粉丝',     ar: 'المتابعون',       de: 'Follower'          },
  'analytics.likes':        { en: 'Likes',             es: 'Me gusta',         fr: "J'aime",          pt: 'Curtidas',       ja: 'いいね',         ko: '좋아요',     zh: '点赞',     ar: 'الإعجابات',       de: 'Likes'             },

  // ── Security Dashboard ────────────────────────────────────────────────────
  'security.score':         { en: 'Security Score',    es: 'Puntuación',       fr: 'Score sécu.',     pt: 'Pontuação',      ja: 'セキュリティスコア', ko: '보안 점수', zh: '安全分数', ar: 'نقاط الأمان',   de: 'Sicherheitswert'   },
  'security.scan':          { en: 'Run Scan',          es: 'Escanear',         fr: 'Analyser',        pt: 'Verificar',      ja: 'スキャン',       ko: '검사 실행',  zh: '运行扫描', ar: 'تشغيل الفحص',     de: 'Scan starten'      },
  'security.scanning':      { en: 'Scanning…',         es: 'Escaneando…',      fr: 'Analyse…',        pt: 'Verificando…',   ja: 'スキャン中…',    ko: '검사 중…',   zh: '扫描中…',  ar: 'جارٍ الفحص…',     de: 'Scannt…'           },
  'security.threats':       { en: 'Active Threats',    es: 'Amenazas',         fr: 'Menaces',         pt: 'Ameaças',        ja: '脅威',           ko: '위협',       zh: '活跃威胁', ar: 'التهديدات',       de: 'Bedrohungen'       },
  'security.encryption':    { en: 'Encryption',        es: 'Cifrado',          fr: 'Chiffrement',     pt: 'Criptografia',   ja: '暗号化',         ko: '암호화',     zh: '加密',     ar: 'التشفير',         de: 'Verschlüsselung'   },

  // ── Projects ──────────────────────────────────────────────────────────────
  'projects.create':        { en: 'Create Project',    es: 'Crear proyecto',   fr: 'Créer projet',    pt: 'Criar projeto',  ja: 'プロジェクト作成', ko: '프로젝트 생성', zh: '创建项目', ar: 'إنشاء مشروع',  de: 'Projekt erstellen' },
  'projects.status.planning':{ en: 'Planning',         es: 'Planificación',    fr: 'Planification',   pt: 'Planejamento',   ja: '計画中',         ko: '기획',       zh: '规划',     ar: 'تخطيط',           de: 'Planung'           },
  'projects.status.dev':    { en: 'In Development',    es: 'Desarrollo',       fr: 'En dev.',         pt: 'Desenvolvimento', ja: '開発中',         ko: '개발 중',    zh: '开发中',   ar: 'في التطوير',      de: 'In Entwicklung'    },
  'projects.status.testing':{ en: 'Testing',           es: 'Pruebas',          fr: 'Tests',           pt: 'Testes',         ja: 'テスト中',       ko: '테스트',     zh: '测试',     ar: 'اختبار',          de: 'Tests'             },
  'projects.status.shipped':{ en: 'Shipped',           es: 'Lanzado',          fr: 'Publié',          pt: 'Lançado',        ja: 'リリース済',     ko: '출시',       zh: '已发布',   ar: 'تم الشحن',        de: 'Veröffentlicht'    },
  'projects.achievements':  { en: 'Achievements',      es: 'Logros',           fr: 'Succès',          pt: 'Conquistas',     ja: '実績',           ko: '업적',       zh: '成就',     ar: 'الإنجازات',       de: 'Errungenschaften'  },
};

/**
 * Translate a key to the given language, falling back to English
 * @param {string} key
 * @param {string} [lang]
 */
export function t(key, lang = 'en') {
  const entry = strings[key];
  if (!entry) return key;
  return entry[lang] || entry['en'] || key;
}

/**
 * Detect best matching language from navigator or Accept-Language header
 * @param {string} [headerOrNav] - Accept-Language value or navigator.language
 */
export function detectLang(headerOrNav) {
  const src = headerOrNav || (typeof navigator !== 'undefined' ? navigator.language : 'en');
  const code = src.split(/[-_,;]/)[0].toLowerCase();
  return LANGUAGES[code] ? code : 'en';
}
