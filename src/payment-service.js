/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Payment service: real Stripe Checkout sessions. The server reports
 * "not configured" until the operator sets STRIPE_SECRET_KEY — this client
 * never implies a payment capability that doesn't exist.
 */

export class PaymentService {
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

  async getStatus() {
    const response = await fetch(`${this.apiBaseUrl}/payments/status`);
    return this.handle(response, 'Failed to fetch payment status');
  }

  async listPayments() {
    const response = await fetch(`${this.apiBaseUrl}/payments/history`, { headers: this.authHeaders() });
    return this.handle(response, 'Failed to fetch payment history');
  }

  async createCheckout({ amount, currency, description }) {
    const response = await fetch(`${this.apiBaseUrl}/payments/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
      body: JSON.stringify({ amount, currency, description })
    });
    return this.handle(response, 'Failed to start checkout');
  }
}

export const paymentService = new PaymentService();
