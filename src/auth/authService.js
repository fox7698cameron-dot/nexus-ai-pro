// 2026-07-20
const API_BASE = '/api/auth';

const STORAGE_KEYS = {
  ROLE: 'nexus_role',
  DISPLAY_NAME: 'nexus_display_name',
  USER_ID: 'nexus_user_id',
  EMAIL: 'nexus_email',
};

function parseJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

class AuthService {
  async login(email, password, mfaCode = null) {
    const body = { email, password };
    if (mfaCode) body.mfaCode = mfaCode;

    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');

    if (data.user) {
      localStorage.setItem(STORAGE_KEYS.ROLE, data.user.role || 'user');
      localStorage.setItem(STORAGE_KEYS.DISPLAY_NAME, data.user.displayName || '');
      localStorage.setItem(STORAGE_KEYS.USER_ID, data.user.id || '');
      localStorage.setItem(STORAGE_KEYS.EMAIL, data.user.email || '');
    }

    return data;
  }

  async register(userData) {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(userData),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');

    if (data.user) {
      localStorage.setItem(STORAGE_KEYS.ROLE, data.user.role || 'user');
      localStorage.setItem(STORAGE_KEYS.DISPLAY_NAME, data.user.displayName || '');
      localStorage.setItem(STORAGE_KEYS.USER_ID, data.user.id || '');
      localStorage.setItem(STORAGE_KEYS.EMAIL, data.user.email || '');
    }

    return data;
  }

  async logout() {
    try {
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    }
  }

  async refresh() {
    const res = await fetch(`${API_BASE}/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Token refresh failed');

    if (data.user) {
      localStorage.setItem(STORAGE_KEYS.ROLE, data.user.role || 'user');
      localStorage.setItem(STORAGE_KEYS.DISPLAY_NAME, data.user.displayName || '');
      localStorage.setItem(STORAGE_KEYS.USER_ID, data.user.id || '');
      localStorage.setItem(STORAGE_KEYS.EMAIL, data.user.email || '');
    }

    return data;
  }

  async getMe() {
    const res = await fetch(`${API_BASE}/me`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    return res.json();
  }

  getUser() {
    const role = localStorage.getItem(STORAGE_KEYS.ROLE);
    const displayName = localStorage.getItem(STORAGE_KEYS.DISPLAY_NAME);
    const id = localStorage.getItem(STORAGE_KEYS.USER_ID);
    const email = localStorage.getItem(STORAGE_KEYS.EMAIL);

    if (!id && !email) return null;

    return { role, displayName, id, email };
  }

  isAuthenticated() {
    const user = this.getUser();
    return user !== null && !!user.id;
  }

  hasRole(role) {
    const user = this.getUser();
    if (!user) return false;
    if (Array.isArray(role)) return role.includes(user.role);
    return user.role === role;
  }

  clearSession() {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  }
}

const authService = new AuthService();
export default authService;
