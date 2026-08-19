/**
 * @file serverRoutes.js
 * @description Centralized API client — typed fetch wrapper for all Nexus AI Pro endpoints.
 *   All tokens are read from sessionStorage (set by AuthSystem, never hard-coded).
 *   All HTTPS traffic is enforced by the server's helmet + TLS config.
 * @author Cameron Fox <contact@nexusai.pro>
 * @version 2.0.0
 * @date 2026-08-19
 */

// ─── Base Fetch ────────────────────────────────────────────────────────────────

const API_BASE = typeof window !== 'undefined'
  ? (window.API_BASE || (window.location.origin + '/api'))
  : 'http://localhost:3001/api';

/**
 * Authenticated fetch. Token is read from sessionStorage — never hard-coded.
 * @param {string} path
 * @param {RequestInit} opts
 * @returns {Promise<any>}
 */
async function apiFetch(path, opts = {}) {
  const token = typeof sessionStorage !== 'undefined'
    ? sessionStorage.getItem('nexus_access_token')
    : null;

  const headers = {
    'Content-Type': 'application/json',
    'X-Request-ID': crypto.randomUUID?.() || Math.random().toString(36).slice(2),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...opts.headers
  };

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({ error: 'Invalid response' }));

  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status, data });

  return data;
}

// ─── Auth API ──────────────────────────────────────────────────────────────────

export const AuthAPI = {
  register: (body) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  verifyMfa: (body) => apiFetch('/auth/mfa/verify', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  registerBiometric: (credential) => apiFetch('/auth/biometric/register', { method: 'POST', body: JSON.stringify({ credential }) }),
  verifyBiometric: (assertion) => apiFetch('/auth/biometric/verify', { method: 'POST', body: JSON.stringify({ assertion }) })
};

// ─── Security API ──────────────────────────────────────────────────────────────

export const SecurityAPI = {
  getStatus: () => apiFetch('/security/status'),
  getDashboard: () => apiFetch('/security/dashboard'),
  runScan: () => apiFetch('/security/scan', { method: 'POST' }),
  patchVuln: (id) => apiFetch('/security/patch', { method: 'POST', body: JSON.stringify({ id }) }),
  rotateKeys: () => apiFetch('/security/rotate-keys', { method: 'POST' }),
  getAuditLog: (limit = 100, offset = 0) => apiFetch(`/security/audit?limit=${limit}&offset=${offset}`),
  getAlerts: () => apiFetch('/security/alerts'),
  getEncryptionHealth: () => apiFetch('/security/encryption-health')
};

// ─── Chat / AI API ─────────────────────────────────────────────────────────────

export const ChatAPI = {
  sendMessage: (body) => apiFetch('/chat', { method: 'POST', body: JSON.stringify(body) }),
  getChats: (userId) => apiFetch(`/chats/${userId}`),
  getChat: (chatId) => apiFetch(`/chat/${chatId}`),
  updateChat: (chatId, body) => apiFetch(`/chat/${chatId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteChat: (chatId) => apiFetch(`/chat/${chatId}`, { method: 'DELETE' }),
  saveMemory: (body) => apiFetch('/memory', { method: 'POST', body: JSON.stringify(body) }),
  getMemory: (userId) => apiFetch(`/memory/${userId}`),
  deleteMemory: (id) => apiFetch(`/memory/${id}`, { method: 'DELETE' })
};

// ─── Workflow API ──────────────────────────────────────────────────────────────

export const WorkflowAPI = {
  create: (body) => apiFetch('/workflows', { method: 'POST', body: JSON.stringify(body) }),
  list: (userId) => apiFetch(`/workflows/${userId}`),
  execute: (workflowId, inputs) => apiFetch(`/workflows/${workflowId}/execute`, { method: 'POST', body: JSON.stringify({ inputs }) })
};

// ─── Payment API ───────────────────────────────────────────────────────────────

export const PaymentAPI = {
  checkout: (body) => apiFetch('/payments/checkout', { method: 'POST', body: JSON.stringify(body) })
};

// ─── Connector API ─────────────────────────────────────────────────────────────

export const ConnectorAPI = {
  list: () => apiFetch('/connectors'),
  getAuthUrl: (connectorId) => apiFetch(`/connectors/${connectorId}/auth-url`, { method: 'POST' })
};

// ─── I18n API ──────────────────────────────────────────────────────────────────

export const I18nAPI = {
  getTranslations: (lang) => apiFetch(`/i18n/translations/${lang}`),
  translate: (text, target) => apiFetch('/i18n/translate', { method: 'POST', body: JSON.stringify({ text, target }) })
};

// ─── Health Check ──────────────────────────────────────────────────────────────

export const HealthAPI = {
  check: () => apiFetch('/health')
};

export default apiFetch;
