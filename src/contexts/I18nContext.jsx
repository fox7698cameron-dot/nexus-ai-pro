// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

export const I18nContext = createContext(null);

const LOCALE_KEY = 'nexus:locale';
const RTL_LANGS = new Set(['ar']);

export const supportedLanguages = [
  { code: 'en', name: 'English', region: 'US', currency: 'USD', timezone: 'America/New_York', dateFormat: 'MM/DD/YYYY' },
  { code: 'es', name: 'Español', region: 'ES', currency: 'EUR', timezone: 'Europe/Madrid', dateFormat: 'DD/MM/YYYY' },
  { code: 'fr', name: 'Français', region: 'FR', currency: 'EUR', timezone: 'Europe/Paris', dateFormat: 'DD/MM/YYYY' },
  { code: 'de', name: 'Deutsch', region: 'DE', currency: 'EUR', timezone: 'Europe/Berlin', dateFormat: 'DD.MM.YYYY' },
  { code: 'pt', name: 'Português', region: 'BR', currency: 'BRL', timezone: 'America/Sao_Paulo', dateFormat: 'DD/MM/YYYY' },
  { code: 'it', name: 'Italiano', region: 'IT', currency: 'EUR', timezone: 'Europe/Rome', dateFormat: 'DD/MM/YYYY' },
  { code: 'ja', name: '日本語', region: 'JP', currency: 'JPY', timezone: 'Asia/Tokyo', dateFormat: 'YYYY/MM/DD' },
  { code: 'ko', name: '한국어', region: 'KR', currency: 'KRW', timezone: 'Asia/Seoul', dateFormat: 'YYYY.MM.DD' },
  { code: 'zh', name: '中文', region: 'CN', currency: 'CNY', timezone: 'Asia/Shanghai', dateFormat: 'YYYY/MM/DD' },
  { code: 'ar', name: 'العربية', region: 'SA', currency: 'SAR', timezone: 'Asia/Riyadh', dateFormat: 'DD/MM/YYYY' },
  { code: 'ru', name: 'Русский', region: 'RU', currency: 'RUB', timezone: 'Europe/Moscow', dateFormat: 'DD.MM.YYYY' },
  { code: 'hi', name: 'हिन्दी', region: 'IN', currency: 'INR', timezone: 'Asia/Kolkata', dateFormat: 'DD/MM/YYYY' },
  { code: 'nl', name: 'Nederlands', region: 'NL', currency: 'EUR', timezone: 'Europe/Amsterdam', dateFormat: 'DD-MM-YYYY' },
  { code: 'pl', name: 'Polski', region: 'PL', currency: 'PLN', timezone: 'Europe/Warsaw', dateFormat: 'DD.MM.YYYY' },
  { code: 'sv', name: 'Svenska', region: 'SE', currency: 'SEK', timezone: 'Europe/Stockholm', dateFormat: 'YYYY-MM-DD' },
  { code: 'tr', name: 'Türkçe', region: 'TR', currency: 'TRY', timezone: 'Europe/Istanbul', dateFormat: 'DD.MM.YYYY' },
  { code: 'vi', name: 'Tiếng Việt', region: 'VN', currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', dateFormat: 'DD/MM/YYYY' },
  { code: 'th', name: 'ภาษาไทย', region: 'TH', currency: 'THB', timezone: 'Asia/Bangkok', dateFormat: 'DD/MM/YYYY' },
  { code: 'id', name: 'Bahasa Indonesia', region: 'ID', currency: 'IDR', timezone: 'Asia/Jakarta', dateFormat: 'DD/MM/YYYY' },
  { code: 'ms', name: 'Bahasa Melayu', region: 'MY', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur', dateFormat: 'DD/MM/YYYY' },
];

const resources = {
  en: { translation: {
    nav_dashboard: 'Dashboard', nav_admin: 'Admin', nav_dev: 'Developer', nav_mod: 'Moderator',
    nav_analytics: 'Analytics', nav_security: 'Security', nav_projects: 'Projects',
    nav_games: 'Games', nav_settings: 'Settings', nav_home: 'Home',
    auth_login: 'Login', auth_logout: 'Logout', auth_register: 'Register',
    auth_email: 'Email', auth_password: 'Password', auth_username: 'Username',
    auth_confirm_password: 'Confirm Password', auth_forgot_password: 'Forgot Password?',
    action_save: 'Save', action_cancel: 'Cancel', action_delete: 'Delete',
    action_edit: 'Edit', action_submit: 'Submit', action_close: 'Close',
    action_upgrade: 'Upgrade', action_connect: 'Connect', action_disconnect: 'Disconnect',
    action_copy: 'Copy', action_download: 'Download', action_upload: 'Upload',
    error_generic: 'Something went wrong. Please try again.',
    error_unauthorized: 'You are not authorized to access this page.',
    error_not_found: 'Page not found.',
    error_network: 'Network error. Check your connection.',
    error_session_expired: 'Your session has expired. Please log in again.',
  }},
  es: { translation: {
    nav_dashboard: 'Panel', nav_admin: 'Admin', nav_dev: 'Desarrollador', nav_mod: 'Moderador',
    nav_analytics: 'Analíticas', nav_security: 'Seguridad', nav_projects: 'Proyectos',
    nav_games: 'Juegos', nav_settings: 'Configuración', nav_home: 'Inicio',
    auth_login: 'Iniciar sesión', auth_logout: 'Cerrar sesión', auth_register: 'Registrarse',
    auth_email: 'Correo', auth_password: 'Contraseña', auth_username: 'Usuario',
    auth_confirm_password: 'Confirmar contraseña', auth_forgot_password: '¿Olvidaste tu contraseña?',
    action_save: 'Guardar', action_cancel: 'Cancelar', action_delete: 'Eliminar',
    action_edit: 'Editar', action_submit: 'Enviar', action_close: 'Cerrar',
    action_upgrade: 'Mejorar', action_connect: 'Conectar', action_disconnect: 'Desconectar',
    action_copy: 'Copiar', action_download: 'Descargar', action_upload: 'Subir',
    error_generic: 'Algo salió mal. Inténtalo de nuevo.',
    error_unauthorized: 'No estás autorizado para acceder a esta página.',
    error_not_found: 'Página no encontrada.',
    error_network: 'Error de red. Verifica tu conexión.',
    error_session_expired: 'Tu sesión ha expirado. Por favor inicia sesión de nuevo.',
  }},
  fr: { translation: {
    nav_dashboard: 'Tableau de bord', nav_admin: 'Admin', nav_dev: 'Développeur', nav_mod: 'Modérateur',
    nav_analytics: 'Analytique', nav_security: 'Sécurité', nav_projects: 'Projets',
    nav_games: 'Jeux', nav_settings: 'Paramètres', nav_home: 'Accueil',
    auth_login: 'Connexion', auth_logout: 'Déconnexion', auth_register: "S'inscrire",
    auth_email: 'Email', auth_password: 'Mot de passe', auth_username: "Nom d'utilisateur",
    auth_confirm_password: 'Confirmer le mot de passe', auth_forgot_password: 'Mot de passe oublié ?',
    action_save: 'Enregistrer', action_cancel: 'Annuler', action_delete: 'Supprimer',
    action_edit: 'Modifier', action_submit: 'Soumettre', action_close: 'Fermer',
    action_upgrade: 'Mettre à niveau', action_connect: 'Connecter', action_disconnect: 'Déconnecter',
    action_copy: 'Copier', action_download: 'Télécharger', action_upload: 'Téléverser',
    error_generic: "Quelque chose s'est mal passé. Veuillez réessayer.",
    error_unauthorized: "Vous n'êtes pas autorisé à accéder à cette page.",
    error_not_found: 'Page non trouvée.',
    error_network: 'Erreur réseau. Vérifiez votre connexion.',
    error_session_expired: 'Votre session a expiré. Veuillez vous reconnecter.',
  }},
  de: { translation: {
    nav_dashboard: 'Dashboard', nav_admin: 'Admin', nav_dev: 'Entwickler', nav_mod: 'Moderator',
    nav_analytics: 'Analytik', nav_security: 'Sicherheit', nav_projects: 'Projekte',
    nav_games: 'Spiele', nav_settings: 'Einstellungen', nav_home: 'Startseite',
    auth_login: 'Anmelden', auth_logout: 'Abmelden', auth_register: 'Registrieren',
    auth_email: 'E-Mail', auth_password: 'Passwort', auth_username: 'Benutzername',
    auth_confirm_password: 'Passwort bestätigen', auth_forgot_password: 'Passwort vergessen?',
    action_save: 'Speichern', action_cancel: 'Abbrechen', action_delete: 'Löschen',
    action_edit: 'Bearbeiten', action_submit: 'Senden', action_close: 'Schließen',
    action_upgrade: 'Upgraden', action_connect: 'Verbinden', action_disconnect: 'Trennen',
    action_copy: 'Kopieren', action_download: 'Herunterladen', action_upload: 'Hochladen',
    error_generic: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',
    error_unauthorized: 'Du bist nicht berechtigt, auf diese Seite zuzugreifen.',
    error_not_found: 'Seite nicht gefunden.',
    error_network: 'Netzwerkfehler. Überprüfe deine Verbindung.',
    error_session_expired: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.',
  }},
  pt: { translation: {
    nav_dashboard: 'Painel', nav_admin: 'Admin', nav_dev: 'Desenvolvedor', nav_mod: 'Moderador',
    nav_analytics: 'Análises', nav_security: 'Segurança', nav_projects: 'Projetos',
    nav_games: 'Jogos', nav_settings: 'Configurações', nav_home: 'Início',
    auth_login: 'Entrar', auth_logout: 'Sair', auth_register: 'Registrar',
    auth_email: 'Email', auth_password: 'Senha', auth_username: 'Usuário',
    auth_confirm_password: 'Confirmar senha', auth_forgot_password: 'Esqueceu a senha?',
    action_save: 'Salvar', action_cancel: 'Cancelar', action_delete: 'Excluir',
    action_edit: 'Editar', action_submit: 'Enviar', action_close: 'Fechar',
    action_upgrade: 'Atualizar', action_connect: 'Conectar', action_disconnect: 'Desconectar',
    action_copy: 'Copiar', action_download: 'Baixar', action_upload: 'Enviar',
    error_generic: 'Algo deu errado. Por favor, tente novamente.',
    error_unauthorized: 'Você não está autorizado a acessar esta página.',
    error_not_found: 'Página não encontrada.',
    error_network: 'Erro de rede. Verifique sua conexão.',
    error_session_expired: 'Sua sessão expirou. Por favor, faça login novamente.',
  }},
  it: { translation: {
    nav_dashboard: 'Pannello', nav_admin: 'Admin', nav_dev: 'Sviluppatore', nav_mod: 'Moderatore',
    nav_analytics: 'Analisi', nav_security: 'Sicurezza', nav_projects: 'Progetti',
    nav_games: 'Giochi', nav_settings: 'Impostazioni', nav_home: 'Home',
    auth_login: 'Accedi', auth_logout: 'Esci', auth_register: 'Registrati',
    auth_email: 'Email', auth_password: 'Password', auth_username: 'Nome utente',
    auth_confirm_password: 'Conferma password', auth_forgot_password: 'Password dimenticata?',
    action_save: 'Salva', action_cancel: 'Annulla', action_delete: 'Elimina',
    action_edit: 'Modifica', action_submit: 'Invia', action_close: 'Chiudi',
    action_upgrade: 'Aggiorna', action_connect: 'Connetti', action_disconnect: 'Disconnetti',
    action_copy: 'Copia', action_download: 'Scarica', action_upload: 'Carica',
    error_generic: 'Qualcosa è andato storto. Per favore riprova.',
    error_unauthorized: 'Non sei autorizzato ad accedere a questa pagina.',
    error_not_found: 'Pagina non trovata.',
    error_network: 'Errore di rete. Controlla la tua connessione.',
    error_session_expired: 'La tua sessione è scaduta. Per favore accedi di nuovo.',
  }},
  ja: { translation: {
    nav_dashboard: 'ダッシュボード', nav_admin: '管理者', nav_dev: '開発者', nav_mod: 'モデレーター',
    nav_analytics: '分析', nav_security: 'セキュリティ', nav_projects: 'プロジェクト',
    nav_games: 'ゲーム', nav_settings: '設定', nav_home: 'ホーム',
    auth_login: 'ログイン', auth_logout: 'ログアウト', auth_register: '登録',
    auth_email: 'メール', auth_password: 'パスワード', auth_username: 'ユーザー名',
    auth_confirm_password: 'パスワードを確認', auth_forgot_password: 'パスワードを忘れましたか？',
    action_save: '保存', action_cancel: 'キャンセル', action_delete: '削除',
    action_edit: '編集', action_submit: '送信', action_close: '閉じる',
    action_upgrade: 'アップグレード', action_connect: '接続', action_disconnect: '切断',
    action_copy: 'コピー', action_download: 'ダウンロード', action_upload: 'アップロード',
    error_generic: '問題が発生しました。もう一度お試しください。',
    error_unauthorized: 'このページへのアクセス権限がありません。',
    error_not_found: 'ページが見つかりません。',
    error_network: 'ネットワークエラーです。接続を確認してください。',
    error_session_expired: 'セッションが期限切れです。再度ログインしてください。',
  }},
  ko: { translation: {
    nav_dashboard: '대시보드', nav_admin: '관리자', nav_dev: '개발자', nav_mod: '중재자',
    nav_analytics: '분석', nav_security: '보안', nav_projects: '프로젝트',
    nav_games: '게임', nav_settings: '설정', nav_home: '홈',
    auth_login: '로그인', auth_logout: '로그아웃', auth_register: '회원가입',
    auth_email: '이메일', auth_password: '비밀번호', auth_username: '사용자명',
    auth_confirm_password: '비밀번호 확인', auth_forgot_password: '비밀번호를 잊으셨나요?',
    action_save: '저장', action_cancel: '취소', action_delete: '삭제',
    action_edit: '편집', action_submit: '제출', action_close: '닫기',
    action_upgrade: '업그레이드', action_connect: '연결', action_disconnect: '연결 해제',
    action_copy: '복사', action_download: '다운로드', action_upload: '업로드',
    error_generic: '문제가 발생했습니다. 다시 시도해 주세요.',
    error_unauthorized: '이 페이지에 접근할 권한이 없습니다.',
    error_not_found: '페이지를 찾을 수 없습니다.',
    error_network: '네트워크 오류. 연결을 확인하세요.',
    error_session_expired: '세션이 만료되었습니다. 다시 로그인해 주세요.',
  }},
  zh: { translation: {
    nav_dashboard: '仪表板', nav_admin: '管理员', nav_dev: '开发者', nav_mod: '版主',
    nav_analytics: '分析', nav_security: '安全', nav_projects: '项目',
    nav_games: '游戏', nav_settings: '设置', nav_home: '首页',
    auth_login: '登录', auth_logout: '退出', auth_register: '注册',
    auth_email: '邮箱', auth_password: '密码', auth_username: '用户名',
    auth_confirm_password: '确认密码', auth_forgot_password: '忘记密码？',
    action_save: '保存', action_cancel: '取消', action_delete: '删除',
    action_edit: '编辑', action_submit: '提交', action_close: '关闭',
    action_upgrade: '升级', action_connect: '连接', action_disconnect: '断开',
    action_copy: '复制', action_download: '下载', action_upload: '上传',
    error_generic: '出现问题，请重试。',
    error_unauthorized: '您无权访问此页面。',
    error_not_found: '页面未找到。',
    error_network: '网络错误，请检查您的连接。',
    error_session_expired: '您的会话已过期，请重新登录。',
  }},
  ar: { translation: {
    nav_dashboard: 'لوحة التحكم', nav_admin: 'المدير', nav_dev: 'المطور', nav_mod: 'المشرف',
    nav_analytics: 'التحليلات', nav_security: 'الأمان', nav_projects: 'المشاريع',
    nav_games: 'الألعاب', nav_settings: 'الإعدادات', nav_home: 'الرئيسية',
    auth_login: 'تسجيل الدخول', auth_logout: 'تسجيل الخروج', auth_register: 'التسجيل',
    auth_email: 'البريد الإلكتروني', auth_password: 'كلمة المرور', auth_username: 'اسم المستخدم',
    auth_confirm_password: 'تأكيد كلمة المرور', auth_forgot_password: 'نسيت كلمة المرور؟',
    action_save: 'حفظ', action_cancel: 'إلغاء', action_delete: 'حذف',
    action_edit: 'تعديل', action_submit: 'إرسال', action_close: 'إغلاق',
    action_upgrade: 'ترقية', action_connect: 'اتصال', action_disconnect: 'قطع الاتصال',
    action_copy: 'نسخ', action_download: 'تنزيل', action_upload: 'رفع',
    error_generic: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
    error_unauthorized: 'غير مصرح لك بالوصول إلى هذه الصفحة.',
    error_not_found: 'الصفحة غير موجودة.',
    error_network: 'خطأ في الشبكة. تحقق من اتصالك.',
    error_session_expired: 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.',
  }},
  ru: { translation: {
    nav_dashboard: 'Панель', nav_admin: 'Администратор', nav_dev: 'Разработчик', nav_mod: 'Модератор',
    nav_analytics: 'Аналитика', nav_security: 'Безопасность', nav_projects: 'Проекты',
    nav_games: 'Игры', nav_settings: 'Настройки', nav_home: 'Главная',
    auth_login: 'Войти', auth_logout: 'Выйти', auth_register: 'Регистрация',
    auth_email: 'Email', auth_password: 'Пароль', auth_username: 'Имя пользователя',
    auth_confirm_password: 'Подтвердите пароль', auth_forgot_password: 'Забыли пароль?',
    action_save: 'Сохранить', action_cancel: 'Отмена', action_delete: 'Удалить',
    action_edit: 'Изменить', action_submit: 'Отправить', action_close: 'Закрыть',
    action_upgrade: 'Обновить', action_connect: 'Подключить', action_disconnect: 'Отключить',
    action_copy: 'Копировать', action_download: 'Скачать', action_upload: 'Загрузить',
    error_generic: 'Что-то пошло не так. Пожалуйста, попробуйте снова.',
    error_unauthorized: 'У вас нет доступа к этой странице.',
    error_not_found: 'Страница не найдена.',
    error_network: 'Ошибка сети. Проверьте соединение.',
    error_session_expired: 'Ваша сессия истекла. Пожалуйста, войдите снова.',
  }},
  hi: { translation: {
    nav_dashboard: 'डैशबोर्ड', nav_admin: 'व्यवस्थापक', nav_dev: 'डेवलपर', nav_mod: 'मॉडरेटर',
    nav_analytics: 'विश्लेषण', nav_security: 'सुरक्षा', nav_projects: 'परियोजनाएं',
    nav_games: 'खेल', nav_settings: 'सेटिंग्स', nav_home: 'होम',
    auth_login: 'लॉगिन', auth_logout: 'लॉगआउट', auth_register: 'रजिस्टर',
    auth_email: 'ईमेल', auth_password: 'पासवर्ड', auth_username: 'उपयोगकर्ता नाम',
    auth_confirm_password: 'पासवर्ड की पुष्टि करें', auth_forgot_password: 'पासवर्ड भूल गए?',
    action_save: 'सहेजें', action_cancel: 'रद्द करें', action_delete: 'हटाएं',
    action_edit: 'संपादित करें', action_submit: 'जमा करें', action_close: 'बंद करें',
    action_upgrade: 'अपग्रेड', action_connect: 'कनेक्ट', action_disconnect: 'डिस्कनेक्ट',
    action_copy: 'कॉपी', action_download: 'डाउनलोड', action_upload: 'अपलोड',
    error_generic: 'कुछ गलत हुआ। कृपया पुनः प्रयास करें।',
    error_unauthorized: 'आपको इस पृष्ठ तक पहुंचने की अनुमति नहीं है।',
    error_not_found: 'पृष्ठ नहीं मिला।',
    error_network: 'नेटवर्क त्रुटि। अपना कनेक्शन जांचें।',
    error_session_expired: 'आपका सत्र समाप्त हो गया। कृपया फिर से लॉगिन करें।',
  }},
  nl: { translation: {
    nav_dashboard: 'Dashboard', nav_admin: 'Admin', nav_dev: 'Ontwikkelaar', nav_mod: 'Moderator',
    nav_analytics: 'Analyses', nav_security: 'Beveiliging', nav_projects: "Projecten",
    nav_games: 'Spellen', nav_settings: 'Instellingen', nav_home: 'Home',
    auth_login: 'Inloggen', auth_logout: 'Uitloggen', auth_register: 'Registreren',
    auth_email: 'E-mail', auth_password: 'Wachtwoord', auth_username: 'Gebruikersnaam',
    auth_confirm_password: 'Bevestig wachtwoord', auth_forgot_password: 'Wachtwoord vergeten?',
    action_save: 'Opslaan', action_cancel: 'Annuleren', action_delete: 'Verwijderen',
    action_edit: 'Bewerken', action_submit: 'Verzenden', action_close: 'Sluiten',
    action_upgrade: 'Upgraden', action_connect: 'Verbinden', action_disconnect: 'Verbreken',
    action_copy: 'Kopiëren', action_download: 'Downloaden', action_upload: 'Uploaden',
    error_generic: 'Er is iets misgegaan. Probeer het opnieuw.',
    error_unauthorized: 'Je hebt geen toegang tot deze pagina.',
    error_not_found: 'Pagina niet gevonden.',
    error_network: 'Netwerkfout. Controleer je verbinding.',
    error_session_expired: 'Je sessie is verlopen. Log opnieuw in.',
  }},
  pl: { translation: {
    nav_dashboard: 'Panel', nav_admin: 'Admin', nav_dev: 'Deweloper', nav_mod: 'Moderator',
    nav_analytics: 'Analityka', nav_security: 'Bezpieczeństwo', nav_projects: 'Projekty',
    nav_games: 'Gry', nav_settings: 'Ustawienia', nav_home: 'Strona główna',
    auth_login: 'Zaloguj', auth_logout: 'Wyloguj', auth_register: 'Zarejestruj',
    auth_email: 'Email', auth_password: 'Hasło', auth_username: 'Nazwa użytkownika',
    auth_confirm_password: 'Potwierdź hasło', auth_forgot_password: 'Zapomniałeś hasła?',
    action_save: 'Zapisz', action_cancel: 'Anuluj', action_delete: 'Usuń',
    action_edit: 'Edytuj', action_submit: 'Wyślij', action_close: 'Zamknij',
    action_upgrade: 'Ulepsz', action_connect: 'Połącz', action_disconnect: 'Rozłącz',
    action_copy: 'Kopiuj', action_download: 'Pobierz', action_upload: 'Prześlij',
    error_generic: 'Coś poszło nie tak. Spróbuj ponownie.',
    error_unauthorized: 'Nie masz uprawnień do tej strony.',
    error_not_found: 'Strona nie znaleziona.',
    error_network: 'Błąd sieci. Sprawdź połączenie.',
    error_session_expired: 'Twoja sesja wygasła. Zaloguj się ponownie.',
  }},
  sv: { translation: {
    nav_dashboard: 'Instrumentpanel', nav_admin: 'Admin', nav_dev: 'Utvecklare', nav_mod: 'Moderator',
    nav_analytics: 'Analys', nav_security: 'Säkerhet', nav_projects: 'Projekt',
    nav_games: 'Spel', nav_settings: 'Inställningar', nav_home: 'Hem',
    auth_login: 'Logga in', auth_logout: 'Logga ut', auth_register: 'Registrera',
    auth_email: 'E-post', auth_password: 'Lösenord', auth_username: 'Användarnamn',
    auth_confirm_password: 'Bekräfta lösenord', auth_forgot_password: 'Glömt lösenord?',
    action_save: 'Spara', action_cancel: 'Avbryt', action_delete: 'Ta bort',
    action_edit: 'Redigera', action_submit: 'Skicka', action_close: 'Stäng',
    action_upgrade: 'Uppgradera', action_connect: 'Anslut', action_disconnect: 'Koppla från',
    action_copy: 'Kopiera', action_download: 'Ladda ner', action_upload: 'Ladda upp',
    error_generic: 'Något gick fel. Försök igen.',
    error_unauthorized: 'Du har inte åtkomst till den här sidan.',
    error_not_found: 'Sidan hittades inte.',
    error_network: 'Nätverksfel. Kontrollera din anslutning.',
    error_session_expired: 'Din session har löpt ut. Logga in igen.',
  }},
  tr: { translation: {
    nav_dashboard: 'Pano', nav_admin: 'Yönetici', nav_dev: 'Geliştirici', nav_mod: 'Moderatör',
    nav_analytics: 'Analitik', nav_security: 'Güvenlik', nav_projects: 'Projeler',
    nav_games: 'Oyunlar', nav_settings: 'Ayarlar', nav_home: 'Ana Sayfa',
    auth_login: 'Giriş yap', auth_logout: 'Çıkış yap', auth_register: 'Kayıt ol',
    auth_email: 'E-posta', auth_password: 'Şifre', auth_username: 'Kullanıcı adı',
    auth_confirm_password: 'Şifreyi onayla', auth_forgot_password: 'Şifremi unuttum?',
    action_save: 'Kaydet', action_cancel: 'İptal', action_delete: 'Sil',
    action_edit: 'Düzenle', action_submit: 'Gönder', action_close: 'Kapat',
    action_upgrade: 'Yükselt', action_connect: 'Bağlan', action_disconnect: 'Bağlantıyı kes',
    action_copy: 'Kopyala', action_download: 'İndir', action_upload: 'Yükle',
    error_generic: 'Bir şeyler ters gitti. Lütfen tekrar dene.',
    error_unauthorized: 'Bu sayfaya erişim izniniz yok.',
    error_not_found: 'Sayfa bulunamadı.',
    error_network: 'Ağ hatası. Bağlantınızı kontrol edin.',
    error_session_expired: 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.',
  }},
  vi: { translation: {
    nav_dashboard: 'Bảng điều khiển', nav_admin: 'Quản trị', nav_dev: 'Nhà phát triển', nav_mod: 'Người kiểm duyệt',
    nav_analytics: 'Phân tích', nav_security: 'Bảo mật', nav_projects: 'Dự án',
    nav_games: 'Trò chơi', nav_settings: 'Cài đặt', nav_home: 'Trang chủ',
    auth_login: 'Đăng nhập', auth_logout: 'Đăng xuất', auth_register: 'Đăng ký',
    auth_email: 'Email', auth_password: 'Mật khẩu', auth_username: 'Tên người dùng',
    auth_confirm_password: 'Xác nhận mật khẩu', auth_forgot_password: 'Quên mật khẩu?',
    action_save: 'Lưu', action_cancel: 'Hủy', action_delete: 'Xóa',
    action_edit: 'Chỉnh sửa', action_submit: 'Gửi', action_close: 'Đóng',
    action_upgrade: 'Nâng cấp', action_connect: 'Kết nối', action_disconnect: 'Ngắt kết nối',
    action_copy: 'Sao chép', action_download: 'Tải xuống', action_upload: 'Tải lên',
    error_generic: 'Đã xảy ra lỗi. Vui lòng thử lại.',
    error_unauthorized: 'Bạn không có quyền truy cập trang này.',
    error_not_found: 'Không tìm thấy trang.',
    error_network: 'Lỗi mạng. Kiểm tra kết nối của bạn.',
    error_session_expired: 'Phiên của bạn đã hết hạn. Vui lòng đăng nhập lại.',
  }},
  th: { translation: {
    nav_dashboard: 'แดชบอร์ด', nav_admin: 'ผู้ดูแล', nav_dev: 'นักพัฒนา', nav_mod: 'ผู้กลั่นกรอง',
    nav_analytics: 'การวิเคราะห์', nav_security: 'ความปลอดภัย', nav_projects: 'โครงการ',
    nav_games: 'เกม', nav_settings: 'การตั้งค่า', nav_home: 'หน้าหลัก',
    auth_login: 'เข้าสู่ระบบ', auth_logout: 'ออกจากระบบ', auth_register: 'ลงทะเบียน',
    auth_email: 'อีเมล', auth_password: 'รหัสผ่าน', auth_username: 'ชื่อผู้ใช้',
    auth_confirm_password: 'ยืนยันรหัสผ่าน', auth_forgot_password: 'ลืมรหัสผ่าน?',
    action_save: 'บันทึก', action_cancel: 'ยกเลิก', action_delete: 'ลบ',
    action_edit: 'แก้ไข', action_submit: 'ส่ง', action_close: 'ปิด',
    action_upgrade: 'อัปเกรด', action_connect: 'เชื่อมต่อ', action_disconnect: 'ยกเลิกการเชื่อมต่อ',
    action_copy: 'คัดลอก', action_download: 'ดาวน์โหลด', action_upload: 'อัปโหลด',
    error_generic: 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง',
    error_unauthorized: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้',
    error_not_found: 'ไม่พบหน้า',
    error_network: 'ข้อผิดพลาดเครือข่าย ตรวจสอบการเชื่อมต่อของคุณ',
    error_session_expired: 'เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง',
  }},
  id: { translation: {
    nav_dashboard: 'Dasbor', nav_admin: 'Admin', nav_dev: 'Pengembang', nav_mod: 'Moderator',
    nav_analytics: 'Analitik', nav_security: 'Keamanan', nav_projects: 'Proyek',
    nav_games: 'Permainan', nav_settings: 'Pengaturan', nav_home: 'Beranda',
    auth_login: 'Masuk', auth_logout: 'Keluar', auth_register: 'Daftar',
    auth_email: 'Email', auth_password: 'Kata sandi', auth_username: 'Nama pengguna',
    auth_confirm_password: 'Konfirmasi kata sandi', auth_forgot_password: 'Lupa kata sandi?',
    action_save: 'Simpan', action_cancel: 'Batal', action_delete: 'Hapus',
    action_edit: 'Edit', action_submit: 'Kirim', action_close: 'Tutup',
    action_upgrade: 'Tingkatkan', action_connect: 'Hubungkan', action_disconnect: 'Putuskan',
    action_copy: 'Salin', action_download: 'Unduh', action_upload: 'Unggah',
    error_generic: 'Terjadi kesalahan. Silakan coba lagi.',
    error_unauthorized: 'Anda tidak berwenang mengakses halaman ini.',
    error_not_found: 'Halaman tidak ditemukan.',
    error_network: 'Kesalahan jaringan. Periksa koneksi Anda.',
    error_session_expired: 'Sesi Anda telah berakhir. Silakan masuk lagi.',
  }},
  ms: { translation: {
    nav_dashboard: 'Papan pemuka', nav_admin: 'Admin', nav_dev: 'Pembangun', nav_mod: 'Moderator',
    nav_analytics: 'Analitik', nav_security: 'Keselamatan', nav_projects: 'Projek',
    nav_games: 'Permainan', nav_settings: 'Tetapan', nav_home: 'Laman utama',
    auth_login: 'Log masuk', auth_logout: 'Log keluar', auth_register: 'Daftar',
    auth_email: 'E-mel', auth_password: 'Kata laluan', auth_username: 'Nama pengguna',
    auth_confirm_password: 'Sahkan kata laluan', auth_forgot_password: 'Lupa kata laluan?',
    action_save: 'Simpan', action_cancel: 'Batal', action_delete: 'Padam',
    action_edit: 'Edit', action_submit: 'Hantar', action_close: 'Tutup',
    action_upgrade: 'Naik taraf', action_connect: 'Sambung', action_disconnect: 'Putus sambungan',
    action_copy: 'Salin', action_download: 'Muat turun', action_upload: 'Muat naik',
    error_generic: 'Sesuatu telah berlaku. Sila cuba lagi.',
    error_unauthorized: 'Anda tidak dibenarkan mengakses halaman ini.',
    error_not_found: 'Halaman tidak dijumpai.',
    error_network: 'Ralat rangkaian. Semak sambungan anda.',
    error_session_expired: 'Sesi anda telah tamat. Sila log masuk semula.',
  }},
};

const detectedLang = () => {
  const stored = (() => { try { return JSON.parse(localStorage.getItem(LOCALE_KEY)); } catch { return null; } })();
  if (stored?.language) return stored.language;
  const nav = navigator.language?.split('-')[0] ?? 'en';
  return resources[nav] ? nav : 'en';
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: detectedLang(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

function loadLocale() {
  try { return JSON.parse(localStorage.getItem(LOCALE_KEY)) ?? null; } catch { return null; }
}

function saveLocale(data) {
  localStorage.setItem(LOCALE_KEY, JSON.stringify(data));
}

export function I18nProvider({ children }) {
  const { t, i18n: i18nInstance } = useTranslation();
  const [locale, setLocale] = useState(() => {
    const stored = loadLocale();
    const lang = stored?.language ?? detectedLang();
    const meta = supportedLanguages.find((l) => l.code === lang) ?? supportedLanguages[0];
    return { language: lang, region: meta.region, currency: meta.currency, timezone: meta.timezone, dateFormat: meta.dateFormat, ...stored };
  });

  useEffect(() => {
    document.documentElement.dir = RTL_LANGS.has(locale.language) ? 'rtl' : 'ltr';
    document.documentElement.lang = locale.language;
  }, [locale.language]);

  const setLanguage = (lang) => {
    const meta = supportedLanguages.find((l) => l.code === lang) ?? supportedLanguages[0];
    const next = { language: lang, region: meta.region, currency: meta.currency, timezone: meta.timezone, dateFormat: meta.dateFormat };
    i18nInstance.changeLanguage(lang);
    setLocale(next);
    saveLocale(next);
  };

  const autoTranslate = async (text, targetLang) => {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang }),
    });
    const data = await res.json().catch(() => ({ translated: text, fallback: true }));
    return data.translated ?? text;
  };

  return (
    <I18nContext.Provider value={{ t, language: locale.language, setLanguage, autoTranslate, supportedLanguages, locale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
