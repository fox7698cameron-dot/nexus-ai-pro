// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Licensed under the Apache License, Version 2.0
// File created: 2026-08-06

import React, { createContext, useContext, useState } from 'react';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English',    nativeName: 'English',    direction: 'ltr' },
  { code: 'es', name: 'Spanish',    nativeName: 'Español',    direction: 'ltr' },
  { code: 'fr', name: 'French',     nativeName: 'Français',   direction: 'ltr' },
  { code: 'de', name: 'German',     nativeName: 'Deutsch',    direction: 'ltr' },
  { code: 'it', name: 'Italian',    nativeName: 'Italiano',   direction: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português',  direction: 'ltr' },
  { code: 'ja', name: 'Japanese',   nativeName: '日本語',      direction: 'ltr' },
  { code: 'ko', name: 'Korean',     nativeName: '한국어',       direction: 'ltr' },
  { code: 'zh', name: 'Chinese',    nativeName: '中文',        direction: 'ltr' },
  { code: 'ar', name: 'Arabic',     nativeName: 'العربية',    direction: 'rtl' },
  { code: 'hi', name: 'Hindi',      nativeName: 'हिन्दी',      direction: 'ltr' },
  { code: 'ru', name: 'Russian',    nativeName: 'Русский',    direction: 'ltr' },
  { code: 'tr', name: 'Turkish',    nativeName: 'Türkçe',     direction: 'ltr' },
  { code: 'nl', name: 'Dutch',      nativeName: 'Nederlands', direction: 'ltr' },
  { code: 'pl', name: 'Polish',     nativeName: 'Polski',     direction: 'ltr' },
  { code: 'sv', name: 'Swedish',    nativeName: 'Svenska',    direction: 'ltr' },
  { code: 'da', name: 'Danish',     nativeName: 'Dansk',      direction: 'ltr' },
  { code: 'fi', name: 'Finnish',    nativeName: 'Suomi',      direction: 'ltr' },
  { code: 'no', name: 'Norwegian',  nativeName: 'Norsk',      direction: 'ltr' },
  { code: 'th', name: 'Thai',       nativeName: 'ภาษาไทย',    direction: 'ltr' },
];

export const translations = {
  en: {
    nav: { dashboard: 'Dashboard', analytics: 'Analytics', security: 'Security', gamedev: 'Game Dev', settings: 'Settings', profile: 'Profile', logout: 'Logout' },
    auth: { login: 'Sign In', register: 'Sign Up', email: 'Email', password: 'Password', username: 'Username', submit: 'Submit', loading: 'Loading…' },
    errors: { required: 'This field is required', invalid: 'Invalid value', tooShort: 'Too short' },
    subscription: { upgrade: 'Upgrade Plan', currentPlan: 'Current Plan', billing: 'Billing' },
    common: { save: 'Save', cancel: 'Cancel', delete: 'Delete', confirm: 'Confirm', back: 'Back', next: 'Next', search: 'Search', loading: 'Loading…', success: 'Success', error: 'Error' },
  },
  es: {
    nav: { dashboard: 'Panel', analytics: 'Analíticas', security: 'Seguridad', gamedev: 'Dev Juegos', settings: 'Ajustes', profile: 'Perfil', logout: 'Cerrar sesión' },
    auth: { login: 'Iniciar sesión', register: 'Registrarse', email: 'Correo', password: 'Contraseña', username: 'Usuario', submit: 'Enviar', loading: 'Cargando…' },
    errors: { required: 'Este campo es obligatorio', invalid: 'Valor inválido', tooShort: 'Demasiado corto' },
    subscription: { upgrade: 'Mejorar plan', currentPlan: 'Plan actual', billing: 'Facturación' },
    common: { save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', confirm: 'Confirmar', back: 'Atrás', next: 'Siguiente', search: 'Buscar', loading: 'Cargando…', success: 'Éxito', error: 'Error' },
  },
  fr: {
    nav: { dashboard: 'Tableau de bord', analytics: 'Analytiques', security: 'Sécurité', gamedev: 'Dév. Jeux', settings: 'Paramètres', profile: 'Profil', logout: 'Déconnexion' },
    auth: { login: 'Connexion', register: "S'inscrire", email: 'E-mail', password: 'Mot de passe', username: 'Identifiant', submit: 'Soumettre', loading: 'Chargement…' },
    errors: { required: 'Ce champ est requis', invalid: 'Valeur invalide', tooShort: 'Trop court' },
    subscription: { upgrade: 'Améliorer le plan', currentPlan: 'Plan actuel', billing: 'Facturation' },
    common: { save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer', confirm: 'Confirmer', back: 'Retour', next: 'Suivant', search: 'Rechercher', loading: 'Chargement…', success: 'Succès', error: 'Erreur' },
  },
  de: {
    nav: { dashboard: 'Dashboard', analytics: 'Analytik', security: 'Sicherheit', gamedev: 'Spielentwicklung', settings: 'Einstellungen', profile: 'Profil', logout: 'Abmelden' },
    auth: { login: 'Anmelden', register: 'Registrieren', email: 'E-Mail', password: 'Passwort', username: 'Benutzername', submit: 'Absenden', loading: 'Laden…' },
    errors: { required: 'Dieses Feld ist erforderlich', invalid: 'Ungültiger Wert', tooShort: 'Zu kurz' },
    subscription: { upgrade: 'Plan upgraden', currentPlan: 'Aktueller Plan', billing: 'Abrechnung' },
    common: { save: 'Speichern', cancel: 'Abbrechen', delete: 'Löschen', confirm: 'Bestätigen', back: 'Zurück', next: 'Weiter', search: 'Suchen', loading: 'Laden…', success: 'Erfolg', error: 'Fehler' },
  },
  it: {
    nav: { dashboard: 'Cruscotto', analytics: 'Analisi', security: 'Sicurezza', gamedev: 'Dev Giochi', settings: 'Impostazioni', profile: 'Profilo', logout: 'Esci' },
    auth: { login: 'Accedi', register: 'Registrati', email: 'Email', password: 'Password', username: 'Nome utente', submit: 'Invia', loading: 'Caricamento…' },
    errors: { required: 'Campo obbligatorio', invalid: 'Valore non valido', tooShort: 'Troppo corto' },
    subscription: { upgrade: 'Aggiorna piano', currentPlan: 'Piano attuale', billing: 'Fatturazione' },
    common: { save: 'Salva', cancel: 'Annulla', delete: 'Elimina', confirm: 'Conferma', back: 'Indietro', next: 'Avanti', search: 'Cerca', loading: 'Caricamento…', success: 'Successo', error: 'Errore' },
  },
  pt: {
    nav: { dashboard: 'Painel', analytics: 'Análises', security: 'Segurança', gamedev: 'Dev Jogos', settings: 'Configurações', profile: 'Perfil', logout: 'Sair' },
    auth: { login: 'Entrar', register: 'Cadastrar', email: 'E-mail', password: 'Senha', username: 'Usuário', submit: 'Enviar', loading: 'Carregando…' },
    errors: { required: 'Campo obrigatório', invalid: 'Valor inválido', tooShort: 'Muito curto' },
    subscription: { upgrade: 'Atualizar plano', currentPlan: 'Plano atual', billing: 'Faturamento' },
    common: { save: 'Salvar', cancel: 'Cancelar', delete: 'Excluir', confirm: 'Confirmar', back: 'Voltar', next: 'Próximo', search: 'Pesquisar', loading: 'Carregando…', success: 'Sucesso', error: 'Erro' },
  },
  ja: {
    nav: { dashboard: 'ダッシュボード', analytics: '分析', security: 'セキュリティ', gamedev: 'ゲーム開発', settings: '設定', profile: 'プロフィール', logout: 'ログアウト' },
    auth: { login: 'ログイン', register: '登録', email: 'メール', password: 'パスワード', username: 'ユーザー名', submit: '送信', loading: '読み込み中…' },
    errors: { required: '必須項目です', invalid: '無効な値', tooShort: '短すぎます' },
    subscription: { upgrade: 'プランをアップグレード', currentPlan: '現在のプラン', billing: '請求' },
    common: { save: '保存', cancel: 'キャンセル', delete: '削除', confirm: '確認', back: '戻る', next: '次へ', search: '検索', loading: '読み込み中…', success: '成功', error: 'エラー' },
  },
  ko: {
    nav: { dashboard: '대시보드', analytics: '분석', security: '보안', gamedev: '게임 개발', settings: '설정', profile: '프로필', logout: '로그아웃' },
    auth: { login: '로그인', register: '가입', email: '이메일', password: '비밀번호', username: '사용자명', submit: '제출', loading: '로딩 중…' },
    errors: { required: '필수 항목입니다', invalid: '잘못된 값', tooShort: '너무 짧습니다' },
    subscription: { upgrade: '플랜 업그레이드', currentPlan: '현재 플랜', billing: '청구' },
    common: { save: '저장', cancel: '취소', delete: '삭제', confirm: '확인', back: '뒤로', next: '다음', search: '검색', loading: '로딩 중…', success: '성공', error: '오류' },
  },
  zh: {
    nav: { dashboard: '仪表板', analytics: '分析', security: '安全', gamedev: '游戏开发', settings: '设置', profile: '个人资料', logout: '退出' },
    auth: { login: '登录', register: '注册', email: '邮箱', password: '密码', username: '用户名', submit: '提交', loading: '加载中…' },
    errors: { required: '此字段为必填项', invalid: '无效值', tooShort: '太短' },
    subscription: { upgrade: '升级方案', currentPlan: '当前方案', billing: '账单' },
    common: { save: '保存', cancel: '取消', delete: '删除', confirm: '确认', back: '返回', next: '下一步', search: '搜索', loading: '加载中…', success: '成功', error: '错误' },
  },
  ar: {
    nav: { dashboard: 'لوحة التحكم', analytics: 'التحليلات', security: 'الأمان', gamedev: 'تطوير الألعاب', settings: 'الإعدادات', profile: 'الملف الشخصي', logout: 'تسجيل الخروج' },
    auth: { login: 'تسجيل الدخول', register: 'التسجيل', email: 'البريد الإلكتروني', password: 'كلمة المرور', username: 'اسم المستخدم', submit: 'إرسال', loading: 'جارٍ التحميل…' },
    errors: { required: 'هذا الحقل مطلوب', invalid: 'قيمة غير صالحة', tooShort: 'قصير جداً' },
    subscription: { upgrade: 'ترقية الخطة', currentPlan: 'الخطة الحالية', billing: 'الفوترة' },
    common: { save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', confirm: 'تأكيد', back: 'رجوع', next: 'التالي', search: 'بحث', loading: 'جارٍ التحميل…', success: 'نجاح', error: 'خطأ' },
  },
  hi: {
    nav: { dashboard: 'डैशबोर्ड', analytics: 'विश्लेषण', security: 'सुरक्षा', gamedev: 'गेम डेव', settings: 'सेटिंग्स', profile: 'प्रोफ़ाइल', logout: 'लॉगआउट' },
    auth: { login: 'साइन इन', register: 'रजिस्टर', email: 'ईमेल', password: 'पासवर्ड', username: 'उपयोगकर्ता नाम', submit: 'सबमिट', loading: 'लोड हो रहा है…' },
    errors: { required: 'यह फ़ील्ड आवश्यक है', invalid: 'अमान्य मान', tooShort: 'बहुत छोटा' },
    subscription: { upgrade: 'प्लान अपग्रेड करें', currentPlan: 'वर्तमान प्लान', billing: 'बिलिंग' },
    common: { save: 'सहेजें', cancel: 'रद्द करें', delete: 'हटाएं', confirm: 'पुष्टि करें', back: 'वापस', next: 'अगला', search: 'खोजें', loading: 'लोड हो रहा है…', success: 'सफलता', error: 'त्रुटि' },
  },
  ru: {
    nav: { dashboard: 'Панель', analytics: 'Аналитика', security: 'Безопасность', gamedev: 'Разработка игр', settings: 'Настройки', profile: 'Профиль', logout: 'Выйти' },
    auth: { login: 'Войти', register: 'Зарегистрироваться', email: 'Email', password: 'Пароль', username: 'Имя пользователя', submit: 'Отправить', loading: 'Загрузка…' },
    errors: { required: 'Поле обязательно', invalid: 'Неверное значение', tooShort: 'Слишком коротко' },
    subscription: { upgrade: 'Улучшить тариф', currentPlan: 'Текущий тариф', billing: 'Оплата' },
    common: { save: 'Сохранить', cancel: 'Отмена', delete: 'Удалить', confirm: 'Подтвердить', back: 'Назад', next: 'Далее', search: 'Поиск', loading: 'Загрузка…', success: 'Успешно', error: 'Ошибка' },
  },
  tr: {
    nav: { dashboard: 'Gösterge Paneli', analytics: 'Analitik', security: 'Güvenlik', gamedev: 'Oyun Geliştirme', settings: 'Ayarlar', profile: 'Profil', logout: 'Çıkış' },
    auth: { login: 'Giriş', register: 'Kayıt Ol', email: 'E-posta', password: 'Şifre', username: 'Kullanıcı adı', submit: 'Gönder', loading: 'Yükleniyor…' },
    errors: { required: 'Bu alan zorunludur', invalid: 'Geçersiz değer', tooShort: 'Çok kısa' },
    subscription: { upgrade: 'Planı Yükselt', currentPlan: 'Mevcut Plan', billing: 'Faturalama' },
    common: { save: 'Kaydet', cancel: 'İptal', delete: 'Sil', confirm: 'Onayla', back: 'Geri', next: 'İleri', search: 'Ara', loading: 'Yükleniyor…', success: 'Başarılı', error: 'Hata' },
  },
  nl: {
    nav: { dashboard: 'Dashboard', analytics: 'Analyse', security: 'Beveiliging', gamedev: 'Spelontwikkeling', settings: 'Instellingen', profile: 'Profiel', logout: 'Uitloggen' },
    auth: { login: 'Inloggen', register: 'Registreren', email: 'E-mail', password: 'Wachtwoord', username: 'Gebruikersnaam', submit: 'Verzenden', loading: 'Laden…' },
    errors: { required: 'Dit veld is verplicht', invalid: 'Ongeldige waarde', tooShort: 'Te kort' },
    subscription: { upgrade: 'Plan upgraden', currentPlan: 'Huidig plan', billing: 'Facturering' },
    common: { save: 'Opslaan', cancel: 'Annuleren', delete: 'Verwijderen', confirm: 'Bevestigen', back: 'Terug', next: 'Volgende', search: 'Zoeken', loading: 'Laden…', success: 'Succes', error: 'Fout' },
  },
  pl: { nav: { dashboard: 'Panel', analytics: 'Analityka', security: 'Bezpieczeństwo', gamedev: 'Tworzenie gier', settings: 'Ustawienia', profile: 'Profil', logout: 'Wyloguj' }, auth: { login: 'Zaloguj', register: 'Zarejestruj', email: 'Email', password: 'Hasło', username: 'Nazwa użytkownika', submit: 'Wyślij', loading: 'Ładowanie…' }, errors: { required: 'To pole jest wymagane', invalid: 'Nieprawidłowa wartość', tooShort: 'Za krótkie' }, subscription: { upgrade: 'Ulepsz plan', currentPlan: 'Obecny plan', billing: 'Rozliczenia' }, common: { save: 'Zapisz', cancel: 'Anuluj', delete: 'Usuń', confirm: 'Potwierdź', back: 'Wstecz', next: 'Dalej', search: 'Szukaj', loading: 'Ładowanie…', success: 'Sukces', error: 'Błąd' } },
  sv: { nav: { dashboard: 'Instrumentpanel', analytics: 'Analys', security: 'Säkerhet', gamedev: 'Spelutveckling', settings: 'Inställningar', profile: 'Profil', logout: 'Logga ut' }, auth: { login: 'Logga in', register: 'Registrera', email: 'E-post', password: 'Lösenord', username: 'Användarnamn', submit: 'Skicka', loading: 'Laddar…' }, errors: { required: 'Detta fält krävs', invalid: 'Ogiltigt värde', tooShort: 'För kort' }, subscription: { upgrade: 'Uppgradera plan', currentPlan: 'Nuvarande plan', billing: 'Fakturering' }, common: { save: 'Spara', cancel: 'Avbryt', delete: 'Radera', confirm: 'Bekräfta', back: 'Tillbaka', next: 'Nästa', search: 'Sök', loading: 'Laddar…', success: 'Lyckat', error: 'Fel' } },
  da: { nav: { dashboard: 'Dashboard', analytics: 'Analyse', security: 'Sikkerhed', gamedev: 'Spiludvikling', settings: 'Indstillinger', profile: 'Profil', logout: 'Log ud' }, auth: { login: 'Log ind', register: 'Opret konto', email: 'E-mail', password: 'Adgangskode', username: 'Brugernavn', submit: 'Send', loading: 'Indlæser…' }, errors: { required: 'Dette felt er påkrævet', invalid: 'Ugyldig værdi', tooShort: 'For kort' }, subscription: { upgrade: 'Opgrader plan', currentPlan: 'Nuværende plan', billing: 'Fakturering' }, common: { save: 'Gem', cancel: 'Annuller', delete: 'Slet', confirm: 'Bekræft', back: 'Tilbage', next: 'Næste', search: 'Søg', loading: 'Indlæser…', success: 'Succes', error: 'Fejl' } },
  fi: { nav: { dashboard: 'Kojelauta', analytics: 'Analytiikka', security: 'Turvallisuus', gamedev: 'Pelinkehitys', settings: 'Asetukset', profile: 'Profiili', logout: 'Kirjaudu ulos' }, auth: { login: 'Kirjaudu sisään', register: 'Rekisteröidy', email: 'Sähköposti', password: 'Salasana', username: 'Käyttäjänimi', submit: 'Lähetä', loading: 'Ladataan…' }, errors: { required: 'Tämä kenttä on pakollinen', invalid: 'Virheellinen arvo', tooShort: 'Liian lyhyt' }, subscription: { upgrade: 'Päivitä suunnitelma', currentPlan: 'Nykyinen suunnitelma', billing: 'Laskutus' }, common: { save: 'Tallenna', cancel: 'Peruuta', delete: 'Poista', confirm: 'Vahvista', back: 'Takaisin', next: 'Seuraava', search: 'Hae', loading: 'Ladataan…', success: 'Onnistui', error: 'Virhe' } },
  no: { nav: { dashboard: 'Dashboard', analytics: 'Analyse', security: 'Sikkerhet', gamedev: 'Spillutvikling', settings: 'Innstillinger', profile: 'Profil', logout: 'Logg ut' }, auth: { login: 'Logg inn', register: 'Registrer', email: 'E-post', password: 'Passord', username: 'Brukernavn', submit: 'Send', loading: 'Laster…' }, errors: { required: 'Dette feltet er påkrevd', invalid: 'Ugyldig verdi', tooShort: 'For kort' }, subscription: { upgrade: 'Oppgrader plan', currentPlan: 'Gjeldende plan', billing: 'Fakturering' }, common: { save: 'Lagre', cancel: 'Avbryt', delete: 'Slett', confirm: 'Bekreft', back: 'Tilbake', next: 'Neste', search: 'Søk', loading: 'Laster…', success: 'Vellykket', error: 'Feil' } },
  th: { nav: { dashboard: 'แดชบอร์ด', analytics: 'การวิเคราะห์', security: 'ความปลอดภัย', gamedev: 'พัฒนาเกม', settings: 'การตั้งค่า', profile: 'โปรไฟล์', logout: 'ออกจากระบบ' }, auth: { login: 'เข้าสู่ระบบ', register: 'ลงทะเบียน', email: 'อีเมล', password: 'รหัสผ่าน', username: 'ชื่อผู้ใช้', submit: 'ส่ง', loading: 'กำลังโหลด…' }, errors: { required: 'จำเป็นต้องกรอกข้อมูล', invalid: 'ค่าไม่ถูกต้อง', tooShort: 'สั้นเกินไป' }, subscription: { upgrade: 'อัปเกรดแผน', currentPlan: 'แผนปัจจุบัน', billing: 'การเรียกเก็บเงิน' }, common: { save: 'บันทึก', cancel: 'ยกเลิก', delete: 'ลบ', confirm: 'ยืนยัน', back: 'กลับ', next: 'ถัดไป', search: 'ค้นหา', loading: 'กำลังโหลด…', success: 'สำเร็จ', error: 'ข้อผิดพลาด' } },
};

/** Resolve a dot-separated key like "nav.dashboard" in a translations object */
export function t(key, lang = 'en') {
  const parts = key.split('.');
  let node = translations[lang] || translations.en;
  for (const part of parts) {
    if (node && typeof node === 'object' && part in node) node = node[part];
    else {
      // fallback to English
      let fallback = translations.en;
      for (const p of parts) { if (fallback && typeof fallback === 'object') fallback = fallback[p]; else return key; }
      return typeof fallback === 'string' ? fallback : key;
    }
  }
  return typeof node === 'string' ? node : key;
}

export function detectLanguage() {
  if (typeof navigator === 'undefined') return 'en';
  const lang = (navigator.language || navigator.userLanguage || 'en').split('-')[0].toLowerCase();
  return SUPPORTED_LANGUAGES.some(l => l.code === lang) ? lang : 'en';
}

export function getDirection(lang) {
  const found = SUPPORTED_LANGUAGES.find(l => l.code === lang);
  return found ? found.direction : 'ltr';
}

export function formatDate(date, lang = 'en') {
  try {
    return new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date));
  } catch { return String(date); }
}

export function formatNumber(n, lang = 'en') {
  try { return new Intl.NumberFormat(lang).format(n); } catch { return String(n); }
}

export function formatCurrency(amount, currency = 'USD', lang = 'en') {
  try { return new Intl.NumberFormat(lang, { style: 'currency', currency }).format(amount); } catch { return `${currency} ${amount}`; }
}

export async function autoTranslate(text, targetLang) {
  if (!text || targetLang === 'en') return text;
  try {
    const res = await fetch('/api/translate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang }),
    });
    if (!res.ok) return text;
    const data = await res.json();
    return data.translated || text;
  } catch { return text; }
}

// ── React Context ──────────────────────────────────────────────
const I18nContext = createContext(null);

export function createI18nContext() {
  function Provider({ children, initialLang }) {
    const [lang, setLang] = useState(initialLang || detectLanguage());
    const direction = getDirection(lang);
    const translate = (key) => t(key, lang);
    const value = { lang, setLang, t: translate, formatDate: (d) => formatDate(d, lang), formatNumber: (n) => formatNumber(n, lang), formatCurrency: (a, c) => formatCurrency(a, c, lang), direction };
    return React.createElement(I18nContext.Provider, { value }, children);
  }

  function useI18n() {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
    return ctx;
  }

  return { Provider, useI18n };
}

export const { Provider: I18nProvider, useI18n } = createI18nContext();
export default { translations, t, detectLanguage, getDirection, formatDate, formatNumber, formatCurrency, autoTranslate, SUPPORTED_LANGUAGES };
