/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Social media connector service (OAuth2 connect/disconnect status).
 */

export class SocialService {
  constructor(apiBaseUrl = '/api') {
    this.apiBaseUrl = apiBaseUrl;
  }

  authHeaders() {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('nexus:authToken') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async handle(response, fallbackError) {
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || fallbackError);
    }
    return response.json();
  }

  async listPlatforms() {
    const response = await fetch(`${this.apiBaseUrl}/social/platforms`);
    return this.handle(response, 'Failed to fetch platforms');
  }

  async listConnections() {
    const response = await fetch(`${this.apiBaseUrl}/social/connections`, { headers: this.authHeaders() });
    return this.handle(response, 'Failed to fetch connections');
  }

  async getConnectUrl(platform) {
    const response = await fetch(`${this.apiBaseUrl}/social/${platform}/connect`, { headers: this.authHeaders() });
    return this.handle(response, 'Failed to start connection');
  }

  async disconnect(platform) {
    const response = await fetch(`${this.apiBaseUrl}/social/${platform}`, {
      method: 'DELETE',
      headers: this.authHeaders()
    });
    return this.handle(response, 'Failed to disconnect');
  }
}

export const socialService = new SocialService();
