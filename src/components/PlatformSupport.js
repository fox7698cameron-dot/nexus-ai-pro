/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * PlatformSupport.js
 * Updated: 2026-10-16
 * Multi-platform detection and capability gates
 * Platforms: Linux, Windows, macOS, iOS, Electron, web
 * Form factors: desktop, mobile, tablet
 */

// ── Platform detection ────────────────────────────────────────────────────────
export const PLATFORMS = {
  WEB:      'web',
  ELECTRON: 'electron',
  IOS:      'ios',
  ANDROID:  'android',
  MACOS:    'macos',
  WINDOWS:  'windows',
  LINUX:    'linux',
};

export const FORM_FACTORS = {
  MOBILE:  'mobile',
  TABLET:  'tablet',
  DESKTOP: 'desktop',
};

export function detectPlatform() {
  if (typeof window === 'undefined') return PLATFORMS.LINUX; // SSR / Node

  // Electron
  if (window.electron || window.process?.type === 'renderer') return PLATFORMS.ELECTRON;

  // Capacitor (iOS/Android)
  if (window.Capacitor?.isNativePlatform?.()) {
    return window.Capacitor.getPlatform?.() === 'ios' ? PLATFORMS.IOS : PLATFORMS.ANDROID;
  }

  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return PLATFORMS.IOS;
  if (/android/.test(ua))           return PLATFORMS.ANDROID;
  if (/mac os x/.test(ua))          return PLATFORMS.MACOS;
  if (/windows/.test(ua))           return PLATFORMS.WINDOWS;
  if (/linux/.test(ua))             return PLATFORMS.LINUX;
  return PLATFORMS.WEB;
}

export function detectFormFactor() {
  if (typeof window === 'undefined') return FORM_FACTORS.DESKTOP;
  const w = window.innerWidth;
  if (w < 768)  return FORM_FACTORS.MOBILE;
  if (w < 1024) return FORM_FACTORS.TABLET;
  return FORM_FACTORS.DESKTOP;
}

// ── OS info ───────────────────────────────────────────────────────────────────
export function getOSInfo() {
  const platform = detectPlatform();
  const formFactor = detectFormFactor();
  return {
    platform,
    formFactor,
    isNative: [PLATFORMS.IOS, PLATFORMS.ANDROID].includes(platform),
    isElectron: platform === PLATFORMS.ELECTRON,
    isMobile: formFactor === FORM_FACTORS.MOBILE,
    isTablet: formFactor === FORM_FACTORS.TABLET,
    isDesktop: formFactor === FORM_FACTORS.DESKTOP,
    supportsWebAuthn: typeof window !== 'undefined' && !!window.PublicKeyCredential,
    supportsBiometrics: typeof window !== 'undefined' && !!window.PublicKeyCredential,
    supportsServiceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    supportsNotifications: typeof Notification !== 'undefined',
    supportsShare: typeof navigator !== 'undefined' && !!navigator.share,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };
}

// ── Responsive breakpoints ────────────────────────────────────────────────────
export const BREAKPOINTS = {
  sm:  640,
  md:  768,
  lg:  1024,
  xl:  1280,
  '2xl': 1536,
};

export function useResponsive() {
  if (typeof window === 'undefined') return { width: 1280, isMobile: false, isTablet: false, isDesktop: true };
  const [width, setWidth] = React.useState(window.innerWidth);
  React.useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);
  return {
    width,
    isMobile:  width < BREAKPOINTS.md,
    isTablet:  width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
  };
}

// ── Platform-aware safe area insets ──────────────────────────────────────────
// For iOS notch / home indicator / Android status bar
export function getSafeAreaInsets() {
  if (typeof window === 'undefined') return { top: 0, bottom: 0, left: 0, right: 0 };
  const style = getComputedStyle(document.documentElement);
  return {
    top:    parseInt(style.getPropertyValue('--sat') || '0', 10),
    bottom: parseInt(style.getPropertyValue('--sab') || '0', 10),
    left:   parseInt(style.getPropertyValue('--sal') || '0', 10),
    right:  parseInt(style.getPropertyValue('--sar') || '0', 10),
  };
}

// ── Feature availability table ────────────────────────────────────────────────
export function getFeatureAvailability() {
  const os = getOSInfo();
  return {
    biometrics:     os.supportsWebAuthn || os.isNative,
    pushNotifications: os.isNative || os.supportsNotifications,
    offlineMode:    os.supportsServiceWorker,
    nativeShare:    os.supportsShare,
    fileSystem:     os.isElectron || os.isNative,
    cameraAccess:   os.isNative || (typeof navigator !== 'undefined' && !!navigator.mediaDevices),
    bluetoothAccess: os.isNative,
    hapticFeedback: os.isNative,
    deepLinks:      os.isNative || os.isElectron,
    backgroundFetch: os.isNative,
  };
}

// ── Secure channel for native communications ──────────────────────────────────
// All native-to-web communication must go through this bridge
// (not eval/innerHTML injection). This mirrors Capacitor's plugin model.
export const SecureNativeBridge = {
  call(pluginName, methodName, args = {}) {
    if (typeof window === 'undefined') return Promise.reject(new Error('Not in browser'));
    // Capacitor native call
    if (window.Capacitor?.Plugins?.[pluginName]) {
      return window.Capacitor.Plugins[pluginName][methodName]?.(args) || Promise.resolve(null);
    }
    // Electron IPC (main process handles the actual native call)
    if (window.electron?.invoke) {
      return window.electron.invoke(`${pluginName}:${methodName}`, args);
    }
    return Promise.reject(new Error(`Native plugin ${pluginName} not available on this platform`));
  },

  isAvailable(pluginName) {
    if (window.Capacitor?.Plugins?.[pluginName]) return true;
    if (window.electron?.plugins?.[pluginName]) return true;
    return false;
  },
};

// ── HTTPS enforcement ─────────────────────────────────────────────────────────
export function enforceHttps() {
  if (typeof window === 'undefined') return;
  if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('192.168.')) {
    window.location.replace(window.location.href.replace(/^http:/, 'https:'));
  }
}

// ── Initialise once ───────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  enforceHttps();
  // Set CSS env vars for safe area (iOS)
  document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top, 0px)');
  document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom, 0px)');
  document.documentElement.style.setProperty('--sal', 'env(safe-area-inset-left, 0px)');
  document.documentElement.style.setProperty('--sar', 'env(safe-area-inset-right, 0px)');
}
