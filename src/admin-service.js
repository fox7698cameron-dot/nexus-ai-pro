/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Admin user-management service (role assignment).
 */

export class AdminService {
  constructor(apiBaseUrl = '/api') {
    this.apiBaseUrl = apiBaseUrl;
  }

  authHeaders() {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('nexus:authToken') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async listUsers() {
    const response = await fetch(`${this.apiBaseUrl}/admin/users`, { headers: this.authHeaders() });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  }

  async updateUserRole(userId, role) {
    const response = await fetch(`${this.apiBaseUrl}/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
      body: JSON.stringify({ role })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to update role');
    }
    return response.json();
  }
}

export const adminService = new AdminService();
