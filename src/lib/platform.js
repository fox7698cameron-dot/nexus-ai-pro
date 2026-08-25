/**
 * src/lib/platform.js
 * Nexus AI Pro — Multi-Platform & OS Detection
 * Labeled: 2026-08-25
 *
 * Detects current platform and provides platform-specific utilities.
 * Supports: Linux, Windows, macOS, iOS, Android, Electron
 * Form factors: Desktop, Mobile, Tablet
 */

// ── Platform detection ────────────────────────────────────────────────────────

/**
 * Detect operating system.
 * Returns: 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'unknown'
 */
export function detectOS() {
  // Electron main process
  if (typeof process !== 'undefined' && process.versions?.electron) {
    return process.platform === 'darwin' ? 'macos'
         : process.platform === 'win32'  ? 'windows'
         : 'linux';
  }

  if (typeof navigator === 'undefined') return 'linux'; // SSR

  const ua  = navigator.userAgent;
  const p   = navigator.platform || '';

  if (/iPhone|iPad|iPod/.test(ua) || (p === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Win/.test(p))  return 'windows';
  if (/Mac/.test(p))  return 'macos';
  if (/Linux/.test(p)) return 'linux';
  return 'unknown';
}

/**
 * Detect form factor.
 * Returns: 'mobile' | 'tablet' | 'desktop'
 */
export function detectFormFactor() {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth || screen.width;
  if (w < 600)  return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Detect if running inside Electron.
 */
export function isElectron() {
  return typeof window !== 'undefined' && !!window.electron;
}

/**
 * Detect if running as a Capacitor native app.
 */
export function isCapacitor() {
  return typeof window !== 'undefined' &&
    (!!window.Capacitor || typeof (window.Capacitor) !== 'undefined');
}

/**
 * Detect if running as a PWA (standalone mode).
 */
export function isPWA() {
  return typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

// ── Feature detection ─────────────────────────────────────────────────────────

/**
 * Check if WebAuthn (biometrics) is available.
 */
export function supportsWebAuthn() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential;
}

/**
 * Check if biometric (platform authenticator) is likely available.
 * Returns a Promise<boolean>.
 */
export async function supportsBiometric() {
  if (!supportsWebAuthn()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Check if the device supports touch input.
 */
export function supportsTouch() {
  return typeof window !== 'undefined' && (
    'ontouchstart' in window || navigator.maxTouchPoints > 0
  );
}

/**
 * Check if the Notifications API is available and permitted.
 */
export async function supportsNotifications() {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied')  return false;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

// ── Responsive breakpoints ────────────────────────────────────────────────────
export const BREAKPOINTS = Object.freeze({
  mobile:  600,
  tablet:  1024,
  desktop: 1280,
  wide:    1920
});

/**
 * React hook for responsive design.
 * Usage: const { isMobile, isTablet, isDesktop } = usePlatform();
 */
export function usePlatform() {
  const { useState, useEffect, useMemo } = (typeof React !== 'undefined' ? React : require('react'));

  const getWidths = () => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  const [dims, setDims] = useState(getWidths);

  useEffect(() => {
    let timer;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setDims(getWidths()), 100);
    };
    window.addEventListener('resize', handler);
    return () => { window.removeEventListener('resize', handler); clearTimeout(timer); };
  }, []);

  return useMemo(() => ({
    os:        detectOS(),
    formFactor: detectFormFactor(),
    isElectron: isElectron(),
    isCapacitor: isCapacitor(),
    isPWA:     isPWA(),
    isMobile:  dims.w < BREAKPOINTS.mobile,
    isTablet:  dims.w >= BREAKPOINTS.mobile && dims.w < BREAKPOINTS.tablet,
    isDesktop: dims.w >= BREAKPOINTS.tablet,
    isWide:    dims.w >= BREAKPOINTS.wide,
    width:     dims.w,
    height:    dims.h,
    supportsWebAuthn: supportsWebAuthn(),
    supportsTouch:    supportsTouch()
  }), [dims]);
}

// ── Platform-specific secure storage ─────────────────────────────────────────
/**
 * Secure key-value storage that uses the most secure option for the platform.
 * - Electron: uses safeStorage (system keychain)
 * - Capacitor: uses SecureStoragePlugin
 * - Web: sessionStorage (in-memory only for sensitive data)
 *
 * NEVER use localStorage for sensitive tokens or credentials.
 */
export const SecureStorage = {
  /**
   * Store a value securely.
   * Key must not contain colons.
   */
  async set(key, value) {
    if (isElectron() && window.electron?.secureStorage) {
      return window.electron.secureStorage.set(key, value);
    }
    if (isCapacitor() && window.Capacitor?.Plugins?.SecureStorage) {
      return window.Capacitor.Plugins.SecureStorage.set({ key, value });
    }
    // Web fallback: sessionStorage (tab-scoped, cleared on close)
    try { sessionStorage.setItem(`nexus:secure:${key}`, value); } catch {}
  },

  async get(key) {
    if (isElectron() && window.electron?.secureStorage) {
      return window.electron.secureStorage.get(key);
    }
    if (isCapacitor() && window.Capacitor?.Plugins?.SecureStorage) {
      const r = await window.Capacitor.Plugins.SecureStorage.get({ key });
      return r?.value;
    }
    try { return sessionStorage.getItem(`nexus:secure:${key}`); } catch { return null; }
  },

  async remove(key) {
    if (isElectron() && window.electron?.secureStorage) {
      return window.electron.secureStorage.remove(key);
    }
    if (isCapacitor() && window.Capacitor?.Plugins?.SecureStorage) {
      return window.Capacitor.Plugins.SecureStorage.remove({ key });
    }
    try { sessionStorage.removeItem(`nexus:secure:${key}`); } catch {}
  }
};
