/**
 * src/i18n/index.js
 * Multi-language & regional support with auto-translate capability.
 * Created: 2026-10-14
 */

const TRANSLATIONS = {
  en: {
    nav: { dashboard: 'Dashboard', security: 'Security', analytics: 'Analytics', projects: 'Projects', payments: 'Payments', settings: 'Settings', logout: 'Logout' },
    auth: { login: 'Sign In', register: 'Create Account', email: 'Email', password: 'Password', confirmPassword: 'Confirm Password', username: 'Username', role: 'Account Type', mfa: 'Two-Factor Code', biometric: 'Use Biometric', forgotPassword: 'Forgot Password?', orContinue: 'or continue with', passwordStrength: 'Password Strength', tooWeak: 'Too Weak (min 13 chars, special chars required)', weak: 'Weak', fair: 'Fair', strong: 'Strong', veryStrong: 'Very Strong' },
    security: { score: 'Security Score', scan: 'Run Scan', scanning: 'Scanning...', threats: 'Active Threats', patches: 'Patches Applied', network: 'Network Status', device: 'Device Health', vulnerabilities: 'Vulnerabilities', noThreats: 'No Active Threats', secure: 'Secure', warning: 'Warning', critical: 'Critical', lastScan: 'Last Scan' },
    analytics: { title: 'Analytics Dashboard', realTime: 'Real-Time', views: 'Views', likes: 'Likes', reach: 'Reach', retention: 'Retention', followers: 'Followers', engagement: 'Engagement', impressions: 'Impressions', shares: 'Shares', comments: 'Comments', growth: 'Growth', last7days: 'Last 7 Days', last30days: 'Last 30 Days', allTime: 'All Time', connecting: 'Connecting...' },
    projects: { title: 'Project Tracker', newProject: 'New Project', status: 'Status', progress: 'Progress', deadline: 'Deadline', team: 'Team', engine: 'Engine', platform: 'Platform', achievements: 'Achievements', gameProgress: 'Game Progress', arVr: 'AR/VR/3D' },
    payments: { title: 'Subscription & Payments', subscribe: 'Subscribe', current: 'Current Plan', upgrade: 'Upgrade', downgrade: 'Downgrade', billing: 'Billing', paymentMethod: 'Payment Method', crypto: 'Crypto', giftCard: 'Gift Card', processing: 'Processing...', success: 'Payment Successful', failed: 'Payment Failed' },
    common: { save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', confirm: 'Confirm', loading: 'Loading...', error: 'Error', success: 'Success', required: 'Required', optional: 'Optional', back: 'Back', next: 'Next', close: 'Close', search: 'Search', filter: 'Filter', export: 'Export', refresh: 'Refresh', realTime: 'Real-Time', connected: 'Connected', disconnected: 'Disconnected' }
  },
  es: {
    nav: { dashboard: 'Panel', security: 'Seguridad', analytics: 'Análisis', projects: 'Proyectos', payments: 'Pagos', settings: 'Ajustes', logout: 'Cerrar Sesión' },
    auth: { login: 'Iniciar Sesión', register: 'Crear Cuenta', email: 'Correo', password: 'Contraseña', confirmPassword: 'Confirmar Contraseña', username: 'Usuario', role: 'Tipo de Cuenta', mfa: 'Código 2FA', biometric: 'Usar Biométrico', forgotPassword: '¿Olvidaste tu contraseña?', orContinue: 'o continúa con' },
    security: { score: 'Puntuación de Seguridad', scan: 'Escanear', scanning: 'Escaneando...', threats: 'Amenazas Activas', patches: 'Parches Aplicados', network: 'Estado de Red', device: 'Salud del Dispositivo', vulnerabilities: 'Vulnerabilidades', noThreats: 'Sin Amenazas', secure: 'Seguro', warning: 'Advertencia', critical: 'Crítico', lastScan: 'Último Escaneo' },
    analytics: { title: 'Panel de Análisis', realTime: 'Tiempo Real', views: 'Vistas', likes: 'Me Gusta', reach: 'Alcance', retention: 'Retención', followers: 'Seguidores', engagement: 'Interacción', impressions: 'Impresiones', shares: 'Compartidos', comments: 'Comentarios', growth: 'Crecimiento' },
    projects: { title: 'Seguimiento de Proyectos', newProject: 'Nuevo Proyecto', status: 'Estado', progress: 'Progreso', deadline: 'Fecha Límite', team: 'Equipo', engine: 'Motor', platform: 'Plataforma', achievements: 'Logros', gameProgress: 'Progreso del Juego', arVr: 'AR/VR/3D' },
    payments: { title: 'Suscripción y Pagos', subscribe: 'Suscribirse', current: 'Plan Actual', upgrade: 'Mejorar', downgrade: 'Reducir', billing: 'Facturación', paymentMethod: 'Método de Pago', crypto: 'Cripto', giftCard: 'Tarjeta de Regalo', processing: 'Procesando...', success: 'Pago Exitoso', failed: 'Pago Fallido' },
    common: { save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar', confirm: 'Confirmar', loading: 'Cargando...', error: 'Error', success: 'Éxito', required: 'Requerido', optional: 'Opcional', back: 'Atrás', next: 'Siguiente', close: 'Cerrar', search: 'Buscar', filter: 'Filtrar', export: 'Exportar', refresh: 'Actualizar', realTime: 'Tiempo Real', connected: 'Conectado', disconnected: 'Desconectado' }
  },
  fr: {
    nav: { dashboard: 'Tableau de bord', security: 'Sécurité', analytics: 'Analytique', projects: 'Projets', payments: 'Paiements', settings: 'Paramètres', logout: 'Déconnexion' },
    auth: { login: 'Connexion', register: 'Créer un compte', email: 'Email', password: 'Mot de passe', confirmPassword: 'Confirmer le mot de passe', username: 'Nom d\'utilisateur', role: 'Type de compte', mfa: 'Code 2FA', biometric: 'Biométrique', forgotPassword: 'Mot de passe oublié ?' },
    security: { score: 'Score de sécurité', scan: 'Scanner', scanning: 'Scan en cours...', threats: 'Menaces actives', patches: 'Correctifs appliqués', network: 'Réseau', device: 'Appareil', vulnerabilities: 'Vulnérabilités', noThreats: 'Aucune menace', secure: 'Sécurisé', warning: 'Avertissement', critical: 'Critique', lastScan: 'Dernier scan' },
    analytics: { title: 'Tableau analytique', realTime: 'Temps réel', views: 'Vues', likes: 'J\'aime', reach: 'Portée', retention: 'Rétention', followers: 'Abonnés', engagement: 'Engagement' },
    projects: { title: 'Suivi des projets', newProject: 'Nouveau projet', status: 'Statut', progress: 'Progrès', deadline: 'Échéance', team: 'Équipe', engine: 'Moteur', platform: 'Plateforme' },
    payments: { title: 'Abonnement et paiements', subscribe: 'S\'abonner', current: 'Plan actuel', upgrade: 'Mettre à niveau', billing: 'Facturation', paymentMethod: 'Moyen de paiement', crypto: 'Crypto', giftCard: 'Carte cadeau' },
    common: { save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer', edit: 'Modifier', confirm: 'Confirmer', loading: 'Chargement...', error: 'Erreur', success: 'Succès', required: 'Requis', optional: 'Optionnel', back: 'Retour', next: 'Suivant', close: 'Fermer', search: 'Rechercher', filter: 'Filtrer', export: 'Exporter', refresh: 'Actualiser', realTime: 'Temps réel', connected: 'Connecté', disconnected: 'Déconnecté' }
  },
  de: {
    nav: { dashboard: 'Dashboard', security: 'Sicherheit', analytics: 'Analytik', projects: 'Projekte', payments: 'Zahlungen', settings: 'Einstellungen', logout: 'Abmelden' },
    auth: { login: 'Anmelden', register: 'Konto erstellen', email: 'E-Mail', password: 'Passwort', confirmPassword: 'Passwort bestätigen', username: 'Benutzername', role: 'Kontotyp', mfa: '2FA-Code', biometric: 'Biometrie', forgotPassword: 'Passwort vergessen?' },
    security: { score: 'Sicherheitswert', scan: 'Scan', scanning: 'Scanne...', threats: 'Aktive Bedrohungen', patches: 'Patches angewendet', network: 'Netzwerk', device: 'Gerät', vulnerabilities: 'Schwachstellen', noThreats: 'Keine Bedrohungen', secure: 'Sicher', warning: 'Warnung', critical: 'Kritisch', lastScan: 'Letzter Scan' },
    analytics: { title: 'Analyse-Dashboard', realTime: 'Echtzeit', views: 'Aufrufe', likes: 'Likes', reach: 'Reichweite', retention: 'Retention', followers: 'Follower', engagement: 'Engagement' },
    common: { save: 'Speichern', cancel: 'Abbrechen', delete: 'Löschen', edit: 'Bearbeiten', confirm: 'Bestätigen', loading: 'Laden...', error: 'Fehler', success: 'Erfolg', back: 'Zurück', next: 'Weiter', close: 'Schließen', search: 'Suchen', filter: 'Filtern', export: 'Exportieren', refresh: 'Aktualisieren', realTime: 'Echtzeit', connected: 'Verbunden', disconnected: 'Getrennt' }
  },
  ja: {
    nav: { dashboard: 'ダッシュボード', security: 'セキュリティ', analytics: '分析', projects: 'プロジェクト', payments: '支払い', settings: '設定', logout: 'ログアウト' },
    auth: { login: 'ログイン', register: 'アカウント作成', email: 'メール', password: 'パスワード', confirmPassword: 'パスワード確認', username: 'ユーザー名', role: 'アカウントタイプ', mfa: '2FAコード', biometric: '生体認証', forgotPassword: 'パスワードを忘れた？' },
    security: { score: 'セキュリティスコア', scan: 'スキャン', scanning: 'スキャン中...', threats: 'アクティブな脅威', patches: 'パッチ適用済み', network: 'ネットワーク', device: 'デバイス', vulnerabilities: '脆弱性', noThreats: '脅威なし', secure: 'セキュア', warning: '警告', critical: '重大', lastScan: '最終スキャン' },
    analytics: { title: '分析ダッシュボード', realTime: 'リアルタイム', views: '再生回数', likes: 'いいね', reach: 'リーチ', retention: '視聴維持率', followers: 'フォロワー', engagement: 'エンゲージメント' },
    common: { save: '保存', cancel: 'キャンセル', delete: '削除', edit: '編集', confirm: '確認', loading: '読み込み中...', error: 'エラー', success: '成功', back: '戻る', next: '次へ', close: '閉じる', search: '検索', refresh: '更新', realTime: 'リアルタイム', connected: '接続済み', disconnected: '切断' }
  },
  zh: {
    nav: { dashboard: '仪表板', security: '安全', analytics: '分析', projects: '项目', payments: '支付', settings: '设置', logout: '退出' },
    auth: { login: '登录', register: '创建账户', email: '邮箱', password: '密码', confirmPassword: '确认密码', username: '用户名', role: '账户类型', mfa: '双因素验证码', biometric: '生物识别', forgotPassword: '忘记密码？' },
    security: { score: '安全评分', scan: '扫描', scanning: '扫描中...', threats: '活跃威胁', patches: '已应用补丁', network: '网络状态', device: '设备健康', vulnerabilities: '漏洞', noThreats: '无威胁', secure: '安全', warning: '警告', critical: '严重', lastScan: '上次扫描' },
    analytics: { title: '分析仪表板', realTime: '实时', views: '浏览量', likes: '点赞', reach: '覆盖', retention: '留存', followers: '粉丝', engagement: '互动' },
    common: { save: '保存', cancel: '取消', delete: '删除', edit: '编辑', confirm: '确认', loading: '加载中...', error: '错误', success: '成功', back: '返回', next: '下一步', close: '关闭', search: '搜索', refresh: '刷新', realTime: '实时', connected: '已连接', disconnected: '断开' }
  },
  pt: {
    nav: { dashboard: 'Painel', security: 'Segurança', analytics: 'Análises', projects: 'Projetos', payments: 'Pagamentos', settings: 'Configurações', logout: 'Sair' },
    auth: { login: 'Entrar', register: 'Criar Conta', email: 'Email', password: 'Senha', confirmPassword: 'Confirmar Senha', username: 'Usuário', role: 'Tipo de Conta', mfa: 'Código 2FA', biometric: 'Biométrico', forgotPassword: 'Esqueceu a senha?' },
    security: { score: 'Pontuação de Segurança', scan: 'Escanear', scanning: 'Escaneando...', threats: 'Ameaças Ativas', patches: 'Patches Aplicados', network: 'Rede', device: 'Dispositivo', vulnerabilities: 'Vulnerabilidades', noThreats: 'Sem Ameaças', secure: 'Seguro', warning: 'Aviso', critical: 'Crítico', lastScan: 'Último Scan' },
    analytics: { title: 'Painel de Análises', realTime: 'Tempo Real', views: 'Visualizações', likes: 'Curtidas', reach: 'Alcance', retention: 'Retenção', followers: 'Seguidores', engagement: 'Engajamento' },
    common: { save: 'Salvar', cancel: 'Cancelar', delete: 'Excluir', edit: 'Editar', confirm: 'Confirmar', loading: 'Carregando...', error: 'Erro', success: 'Sucesso', back: 'Voltar', next: 'Próximo', close: 'Fechar', search: 'Buscar', refresh: 'Atualizar', realTime: 'Tempo Real', connected: 'Conectado', disconnected: 'Desconectado' }
  },
  ko: {
    nav: { dashboard: '대시보드', security: '보안', analytics: '분석', projects: '프로젝트', payments: '결제', settings: '설정', logout: '로그아웃' },
    auth: { login: '로그인', register: '계정 만들기', email: '이메일', password: '비밀번호', confirmPassword: '비밀번호 확인', username: '사용자명', role: '계정 유형', mfa: '2FA 코드', biometric: '생체 인식', forgotPassword: '비밀번호 찾기' },
    security: { score: '보안 점수', scan: '스캔', scanning: '스캔 중...', threats: '활성 위협', patches: '패치 적용됨', network: '네트워크', device: '기기', vulnerabilities: '취약점', noThreats: '위협 없음', secure: '안전', warning: '경고', critical: '위험', lastScan: '마지막 스캔' },
    analytics: { title: '분석 대시보드', realTime: '실시간', views: '조회수', likes: '좋아요', reach: '도달', retention: '유지율', followers: '팔로워', engagement: '참여' },
    common: { save: '저장', cancel: '취소', delete: '삭제', edit: '편집', confirm: '확인', loading: '로딩 중...', error: '오류', success: '성공', back: '뒤로', next: '다음', close: '닫기', search: '검색', refresh: '새로고침', realTime: '실시간', connected: '연결됨', disconnected: '연결 끊김' }
  }
};

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸', region: 'US' },
  { code: 'es', name: 'Español', flag: '🇪🇸', region: 'ES' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', region: 'FR' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', region: 'DE' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', region: 'JP' },
  { code: 'zh', name: '中文', flag: '🇨🇳', region: 'CN' },
  { code: 'pt', name: 'Português', flag: '🇧🇷', region: 'BR' },
  { code: 'ko', name: '한국어', flag: '🇰🇷', region: 'KR' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', region: 'SA', rtl: true },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', region: 'IN' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', region: 'IT' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', region: 'RU' }
];

const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur']);

let currentLanguage = 'en';

const getBrowserLanguage = () => {
  const lang = navigator.language || navigator.userLanguage || 'en';
  const code = lang.split('-')[0].toLowerCase();
  return TRANSLATIONS[code] ? code : 'en';
};

const setLanguage = (langCode) => {
  if (!TRANSLATIONS[langCode]) return;
  currentLanguage = langCode;
  localStorage.setItem('nexus:language', langCode);
  document.documentElement.lang = langCode;
  document.documentElement.dir = RTL_LANGUAGES.has(langCode) ? 'rtl' : 'ltr';
};

const getLanguage = () => {
  try {
    const stored = localStorage.getItem('nexus:language');
    if (stored && TRANSLATIONS[stored]) return stored;
  } catch (_) {}
  return getBrowserLanguage();
};

const t = (section, key) => {
  const lang = currentLanguage;
  return (TRANSLATIONS[lang]?.[section]?.[key]) || (TRANSLATIONS.en?.[section]?.[key]) || key;
};

const tPath = (path) => {
  const parts = path.split('.');
  if (parts.length < 2) return path;
  return t(parts[0], parts.slice(1).join('.'));
};

/** Shallow auto-translate via browser-proxied API (no hardcoded keys). */
const autoTranslate = async (text, targetLang, sourceLang = 'en') => {
  if (targetLang === sourceLang) return text;
  try {
    const res = await fetch(`/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang, sourceLang })
    });
    if (!res.ok) return text;
    const data = await res.json();
    return data.translatedText || text;
  } catch (_) {
    return text;
  }
};

currentLanguage = getLanguage();

export { TRANSLATIONS, SUPPORTED_LANGUAGES, RTL_LANGUAGES, t, tPath, setLanguage, getLanguage, autoTranslate };
export default { t, tPath, setLanguage, getLanguage, autoTranslate, SUPPORTED_LANGUAGES };
