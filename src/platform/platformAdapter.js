/**
 * Nexus AI Pro — Platform Adapter
 * Unified API for platform-specific features: biometrics, notifications, filesystem.
 * Supports: Web (PWA), Electron (Windows/macOS/Linux), Capacitor (iOS/Android).
 * date: 2026-06-08
 */

// ── Platform detection ────────────────────────────────────────────────────────

export const Platform = Object.freeze({
  WEB: 'web',
  ELECTRON: 'electron',
  IOS: 'ios',
  ANDROID: 'android',
});

export function detectPlatform() {
  if (typeof window === 'undefined') return Platform.WEB;
  if (window.electron?.ipc) return Platform.ELECTRON;
  if (window.Capacitor?.getPlatform) {
    const p = window.Capacitor.getPlatform();
    if (p === 'ios') return Platform.IOS;
    if (p === 'android') return Platform.ANDROID;
  }
  return Platform.WEB;
}

// ── Biometric auth adapter ────────────────────────────────────────────────────

export async function requestBiometricAuth(reason = 'Authenticate to Nexus AI Pro') {
  const platform = detectPlatform();

  if (platform === Platform.ELECTRON && window.electron?.biometric?.authenticate) {
    return window.electron.biometric.authenticate({ reason });
  }

  if ((platform === Platform.IOS || platform === Platform.ANDROID) && window.Capacitor) {
    try {
      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
      await NativeBiometric.verifyIdentity({ reason, title: 'Biometric Auth', subtitle: 'Nexus AI Pro', description: reason, fallbackTitle: 'Use Password', useFallback: true });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Web: WebAuthn
  if (window.PublicKeyCredential) {
    return { success: false, useWebAuthn: true };
  }

  return { success: false, unavailable: true };
}

// ── Secure storage adapter ────────────────────────────────────────────────────

export const SecureStorage = {
  async set(key, value) {
    const platform = detectPlatform();
    if ((platform === Platform.IOS || platform === Platform.ANDROID) && window.Capacitor) {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key, value: typeof value === 'string' ? value : JSON.stringify(value) });
    } else if (platform === Platform.ELECTRON && window.electron?.store?.set) {
      window.electron.store.set(key, value);
    } else {
      sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  },

  async get(key) {
    const platform = detectPlatform();
    if ((platform === Platform.IOS || platform === Platform.ANDROID) && window.Capacitor) {
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key });
      try { return value ? JSON.parse(value) : null; } catch { return value; }
    } else if (platform === Platform.ELECTRON && window.electron?.store?.get) {
      return window.electron.store.get(key);
    } else {
      const v = sessionStorage.getItem(key);
      try { return v ? JSON.parse(v) : null; } catch { return v; }
    }
  },

  async remove(key) {
    const platform = detectPlatform();
    if ((platform === Platform.IOS || platform === Platform.ANDROID) && window.Capacitor) {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.remove({ key });
    } else if (platform === Platform.ELECTRON && window.electron?.store?.delete) {
      window.electron.store.delete(key);
    } else {
      sessionStorage.removeItem(key);
    }
  },
};

// ── Push notifications adapter ────────────────────────────────────────────────

export async function requestNotificationPermission() {
  const platform = detectPlatform();
  if ((platform === Platform.IOS || platform === Platform.ANDROID) && window.Capacitor) {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const result = await PushNotifications.requestPermissions();
    return result.receive === 'granted';
  }
  if ('Notification' in window) {
    const result = await Notification.requestPermission();
    return result === 'granted';
  }
  return false;
}

export async function sendLocalNotification(title, body, id = 1) {
  const platform = detectPlatform();
  if ((platform === Platform.IOS || platform === Platform.ANDROID) && window.Capacitor) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.schedule({ notifications: [{ title, body, id, schedule: { at: new Date(Date.now() + 100) } }] });
  } else if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icon-192.png' });
  }
}

// ── Haptics adapter ───────────────────────────────────────────────────────────

export async function hapticFeedback(style = 'medium') {
  const platform = detectPlatform();
  if ((platform === Platform.IOS || platform === Platform.ANDROID) && window.Capacitor) {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const styleMap = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: styleMap[style] || ImpactStyle.Medium }).catch(() => {});
  } else if (navigator.vibrate) {
    navigator.vibrate(style === 'light' ? 30 : style === 'heavy' ? 100 : 50);
  }
}

// ── App info ──────────────────────────────────────────────────────────────────

export function getPlatformInfo() {
  return {
    platform: detectPlatform(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    language: typeof navigator !== 'undefined' ? navigator.language : 'en',
    darkMode: typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches,
    touchDevice: typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
    screenWidth: typeof window !== 'undefined' ? window.screen.width : 0,
    screenHeight: typeof window !== 'undefined' ? window.screen.height : 0,
  };
}

export default { detectPlatform, Platform, requestBiometricAuth, SecureStorage, requestNotificationPermission, sendLocalNotification, hapticFeedback, getPlatformInfo };
