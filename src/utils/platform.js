/**
 * utils/platform.js
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Multi-Platform Detection & Capability Utilities
 * Supports: Linux, Windows, macOS, iOS, Android, Electron
 * Desktop, Mobile, Tablet form factor detection
 * Updated: 2026-08-14
 */

// ─── OS Detection ─────────────────────────────────────────────────────────────
export function detectOS() {
  if (typeof window === 'undefined') {
    // Node.js / server side — synchronous check via process.platform
    const p = (typeof process !== 'undefined' && process.platform) || 'unknown';
    if (p === 'linux') return 'linux';
    if (p === 'darwin') return 'macos';
    if (p === 'win32') return 'windows';
    return 'server';
  }

  const ua = navigator.userAgent.toLowerCase();
  const pl = navigator.platform?.toLowerCase() || '';

  if (ua.includes('iphone') || ua.includes('ipod')) return 'ios';
  if (ua.includes('ipad')) return 'ipados';
  if (ua.includes('android')) return 'android';
  if (pl.includes('win') || ua.includes('windows')) return 'windows';
  if (pl.includes('mac') || ua.includes('macintosh')) return 'macos';
  if (pl.includes('linux') || ua.includes('linux')) return 'linux';
  if (ua.includes('cros')) return 'chromeos';

  return 'unknown';
}

// ─── Runtime Environment ──────────────────────────────────────────────────────
export function detectRuntime() {
  if (typeof window !== 'undefined') {
    if (window.electron !== undefined || typeof window.__ELECTRON__ !== 'undefined') return 'electron';
    if (typeof window.Capacitor !== 'undefined') return 'capacitor';
    if (typeof window.webkit?.messageHandlers !== 'undefined') return 'ios-webview';
    if (typeof window.__android_native !== 'undefined') return 'android-webview';
  }
  if (typeof process !== 'undefined' && process.versions?.node) return 'node';
  return 'browser';
}

// ─── Form Factor Detection ────────────────────────────────────────────────────
export function detectFormFactor() {
  if (typeof window === 'undefined') return 'server';
  const w = window.innerWidth;
  if (w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

// ─── Feature Detection ────────────────────────────────────────────────────────
export const capabilities = {
  /** WebAuthn / FIDO2 / Biometrics */
  biometrics: typeof window !== 'undefined' && !!window.PublicKeyCredential,

  /** Web Bluetooth (for IoT / peripherals) */
  bluetooth: typeof navigator !== 'undefined' && !!navigator.bluetooth,

  /** Service Worker / PWA */
  serviceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,

  /** WebRTC */
  webRTC: typeof window !== 'undefined' && !!window.RTCPeerConnection,

  /** WebGL / 3D rendering */
  webGL: (() => {
    try {
      if (typeof document === 'undefined') return false;
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch { return false; }
  })(),

  /** WebXR (AR/VR) */
  webXR: typeof navigator !== 'undefined' && !!navigator.xr,

  /** Notification API */
  notifications: typeof window !== 'undefined' && 'Notification' in window,

  /** Geolocation */
  geolocation: typeof navigator !== 'undefined' && !!navigator.geolocation,

  /** Camera & Microphone */
  mediaDevices: typeof navigator !== 'undefined' && !!navigator.mediaDevices,

  /** Share API */
  shareAPI: typeof navigator !== 'undefined' && !!navigator.share,

  /** Offline / IndexedDB */
  indexedDB: typeof window !== 'undefined' && !!window.indexedDB,

  /** Clipboard */
  clipboard: typeof navigator !== 'undefined' && !!navigator.clipboard,

  /** Haptic Feedback (mobile) */
  haptics: typeof navigator !== 'undefined' && !!navigator.vibrate,
};

// ─── Platform Info Object ─────────────────────────────────────────────────────
export function getPlatformInfo() {
  const os = detectOS();
  const runtime = detectRuntime();
  const formFactor = detectFormFactor();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isMobile = formFactor === 'mobile';
  const isTablet = formFactor === 'tablet';
  const isDesktop = formFactor === 'desktop';
  const isElectron = runtime === 'electron';
  const isCapacitor = runtime === 'capacitor';
  const isNative = isElectron || isCapacitor;
  const isiOS = os === 'ios' || os === 'ipados';
  const isAndroid = os === 'android';

  return {
    os, runtime, formFactor, userAgent,
    isMobile, isTablet, isDesktop,
    isElectron, isCapacitor, isNative,
    isMobilePlatform: isMobile || isTablet || isiOS || isAndroid,
    isiOS, isAndroid,
    isWindows: os === 'windows',
    isMacOS: os === 'macos',
    isLinux: os === 'linux',
    screen: typeof window !== 'undefined' ? { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio || 1 } : null,
    capabilities,
    supportsAR: capabilities.webXR || isiOS, // ARKit fallback on iOS
    supportsVR: capabilities.webXR,
  };
}

// ─── HTTPS / Secure Context Check ────────────────────────────────────────────
export function isSecureContext() {
  if (typeof window !== 'undefined') return window.isSecureContext || location.protocol === 'https:';
  return true; // Server-side is always considered secure
}

// ─── Capacitor Bridge Helper ──────────────────────────────────────────────────
export async function callNative(plugin, method, args = {}) {
  if (typeof window === 'undefined') return null;
  if (window.Capacitor?.Plugins?.[plugin]?.[method]) {
    return window.Capacitor.Plugins[plugin][method](args);
  }
  console.warn(`[Platform] Native plugin ${plugin}.${method} not available`);
  return null;
}

// ─── Electron IPC Helper ──────────────────────────────────────────────────────
export async function callElectron(channel, ...args) {
  if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
    return window.electron.ipcRenderer.invoke(channel, ...args);
  }
  return null;
}

// ─── Responsive Breakpoints ────────────────────────────────────────────────────
export const BREAKPOINTS = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export function useBreakpoint() {
  if (typeof window === 'undefined') return 'lg';
  const w = window.innerWidth;
  if (w < BREAKPOINTS.sm) return 'xs';
  if (w < BREAKPOINTS.md) return 'sm';
  if (w < BREAKPOINTS.lg) return 'md';
  if (w < BREAKPOINTS.xl) return 'lg';
  if (w < BREAKPOINTS['2xl']) return 'xl';
  return '2xl';
}

// Export singleton platform info
export const platform = getPlatformInfo();
export default platform;
