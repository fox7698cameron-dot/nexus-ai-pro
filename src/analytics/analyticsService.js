// src/analytics/analyticsService.js
// 2026-07-23 | Nexus AI Pro - Social Analytics + Project Tracking Service
// Platforms: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs
// Real-time metrics via WebSocket events

import { v4 as uuidv4 } from 'uuid';

export const PLATFORMS = Object.freeze({
  TIKTOK: 'tiktok',
  INSTAGRAM: 'instagram',
  FACEBOOK: 'facebook',
  TWITCH: 'twitch',
  DISCORD: 'discord',
  LEMON8: 'lemon8',
  REDDIT: 'reddit',
  REDGIFS: 'redgifs',
  YOUTUBE: 'youtube',
  X: 'x',
});

export const PLATFORM_META = Object.freeze({
  tiktok: { name: 'TikTok', icon: '🎵', color: '#010101', accentColor: '#fe2c55', metrics: ['views', 'likes', 'comments', 'shares', 'followers', 'reach', 'retention', 'watchTime'] },
  instagram: { name: 'Instagram', icon: '📸', color: '#e1306c', accentColor: '#f77737', metrics: ['impressions', 'reach', 'likes', 'comments', 'saves', 'shares', 'profileVisits', 'followers'] },
  facebook: { name: 'Facebook', icon: '👤', color: '#1877f2', accentColor: '#42b72a', metrics: ['reach', 'impressions', 'likes', 'comments', 'shares', 'clicks', 'followers', 'pageLikes'] },
  twitch: { name: 'Twitch', icon: '🎮', color: '#9146ff', accentColor: '#bf94ff', metrics: ['viewers', 'followers', 'subscriptions', 'chatMessages', 'streamTime', 'avgViewers', 'peakViewers'] },
  discord: { name: 'Discord', icon: '💬', color: '#5865f2', accentColor: '#57f287', metrics: ['members', 'onlineMembers', 'messages', 'newMembers', 'boosts', 'activeChannels'] },
  lemon8: { name: 'Lemon8', icon: '🍋', color: '#ffca28', accentColor: '#ff7043', metrics: ['views', 'likes', 'comments', 'followers', 'saves', 'reach'] },
  reddit: { name: 'Reddit', icon: '🤖', color: '#ff4500', accentColor: '#ffd635', metrics: ['upvotes', 'downvotes', 'comments', 'awards', 'reach', 'followers', 'postKarma', 'commentKarma'] },
  redgifs: { name: 'RedGifs', icon: '🎬', color: '#ff3d00', accentColor: '#ff6d00', metrics: ['views', 'likes', 'comments', 'shares', 'followers', 'watchTime'] },
  youtube: { name: 'YouTube', icon: '▶️', color: '#ff0000', accentColor: '#282828', metrics: ['views', 'watchTime', 'subscribers', 'likes', 'comments', 'impressions', 'ctr', 'avgViewDuration'] },
  x: { name: 'X (Twitter)', icon: '✖️', color: '#000000', accentColor: '#1d9bf0', metrics: ['impressions', 'reach', 'likes', 'retweets', 'replies', 'followers', 'profileVisits'] },
});

export class AnalyticsService {
  constructor(io, securityModule) {
    this.io = io;
    this.security = securityModule;
    this.accounts = new Map();
    this.metrics = new Map();
    this.alerts = [];
    this.updateIntervalMs = 30000;
    this._intervalRef = null;
    this._startRealTimeUpdates();
  }

  _startRealTimeUpdates() {
    this._intervalRef = setInterval(() => {
      this._emitLiveMetrics();
    }, this.updateIntervalMs);
  }

  stop() {
    if (this._intervalRef) clearInterval(this._intervalRef);
  }

  _emitLiveMetrics() {
    if (!this.io) return;
    for (const [accountId, account] of this.accounts.entries()) {
      const snapshot = this._buildSnapshot(accountId);
      this.io.emit('analytics:update', { accountId, platform: account.platform, snapshot, ts: Date.now() });
    }
  }

  _buildSnapshot(accountId) {
    const entries = this.metrics.get(accountId) || [];
    if (entries.length === 0) return null;
    return entries[entries.length - 1];
  }

  connectAccount({ userId, platform, handle, accessToken, expiresAt }) {
    if (!PLATFORMS[platform.toUpperCase()]) throw new Error(`Unsupported platform: ${platform}`);

    const accountId = uuidv4();
    this.accounts.set(accountId, {
      id: accountId,
      userId,
      platform: platform.toLowerCase(),
      handle,
      tokenHash: this.security.hash(accessToken),
      encryptedToken: this.security.encrypt(accessToken),
      expiresAt,
      connectedAt: Date.now(),
      active: true,
    });
    this.metrics.set(accountId, []);
    this.security.logAudit('ANALYTICS_ACCOUNT_CONNECTED', { userId, platform, handle });
    return { accountId, platform, handle };
  }

  disconnectAccount(accountId) {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error('Account not found');
    account.active = false;
    this.accounts.set(accountId, account);
    this.security.logAudit('ANALYTICS_ACCOUNT_DISCONNECTED', { accountId });
  }

  recordMetric(accountId, metricData) {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error('Account not found');

    const entry = {
      id: uuidv4(),
      accountId,
      platform: account.platform,
      timestamp: Date.now(),
      ...metricData,
    };

    const existing = this.metrics.get(accountId) || [];
    existing.push(entry);
    // Keep last 10000 entries per account
    if (existing.length > 10000) existing.splice(0, existing.length - 10000);
    this.metrics.set(accountId, existing);

    if (this.io) {
      this.io.emit('analytics:metric', { accountId, platform: account.platform, entry });
    }

    return entry;
  }

  getMetrics(accountId, { from, to, limit = 1000 } = {}) {
    const entries = this.metrics.get(accountId) || [];
    return entries
      .filter(e => (!from || e.timestamp >= from) && (!to || e.timestamp <= to))
      .slice(-limit);
  }

  getAccountsByUser(userId) {
    const result = [];
    for (const account of this.accounts.values()) {
      if (account.userId === userId && account.active) {
        const { encryptedToken, tokenHash, ...safeAccount } = account;
        result.push(safeAccount);
      }
    }
    return result;
  }

  getCrossplatformSummary(userId) {
    const accounts = this.getAccountsByUser(userId);
    const summary = {};

    for (const account of accounts) {
      const latest = this._buildSnapshot(account.id);
      summary[account.platform] = {
        handle: account.handle,
        connectedAt: account.connectedAt,
        latestMetrics: latest || {},
        meta: PLATFORM_META[account.platform] || {},
      };
    }

    return summary;
  }

  getRetentionData(accountId) {
    const entries = this.metrics.get(accountId) || [];
    return entries
      .filter(e => e.retention !== undefined || e.avgViewDuration !== undefined || e.watchTime !== undefined)
      .slice(-100)
      .map(e => ({
        timestamp: e.timestamp,
        retention: e.retention,
        avgViewDuration: e.avgViewDuration,
        watchTime: e.watchTime,
      }));
  }

  createAlert(userId, { platform, metric, condition, threshold }) {
    const alert = {
      id: uuidv4(),
      userId,
      platform,
      metric,
      condition,
      threshold,
      createdAt: Date.now(),
      active: true,
      triggered: false,
    };
    this.alerts.push(alert);
    return alert;
  }

  _checkAlerts() {
    for (const alert of this.alerts) {
      if (!alert.active) continue;
      const accounts = this.getAccountsByUser(alert.userId);
      for (const account of accounts) {
        if (account.platform !== alert.platform) continue;
        const latest = this._buildSnapshot(account.id);
        if (!latest) continue;
        const value = latest[alert.metric];
        if (value === undefined) continue;
        let triggered = false;
        if (alert.condition === 'gt' && value > alert.threshold) triggered = true;
        if (alert.condition === 'lt' && value < alert.threshold) triggered = true;
        if (alert.condition === 'gte' && value >= alert.threshold) triggered = true;
        if (alert.condition === 'lte' && value <= alert.threshold) triggered = true;
        if (triggered && !alert.triggered) {
          alert.triggered = true;
          if (this.io) {
            this.io.emit('analytics:alert', { alert, value, accountId: account.id });
          }
        } else if (!triggered) {
          alert.triggered = false;
        }
      }
    }
  }

  getAggregatedStats(userId, platform, period = '7d') {
    const accounts = this.getAccountsByUser(userId).filter(a => a.platform === platform);
    const periodMs = { '1d': 86400000, '7d': 604800000, '30d': 2592000000 }[period] || 604800000;
    const from = Date.now() - periodMs;

    const allMetrics = accounts.flatMap(a => this.getMetrics(a.id, { from }));

    if (allMetrics.length === 0) return { platform, period, stats: {} };

    const stats = {};
    for (const entry of allMetrics) {
      for (const [key, value] of Object.entries(entry)) {
        if (typeof value !== 'number') continue;
        if (!stats[key]) stats[key] = { total: 0, count: 0, min: Infinity, max: -Infinity };
        stats[key].total += value;
        stats[key].count += 1;
        stats[key].min = Math.min(stats[key].min, value);
        stats[key].max = Math.max(stats[key].max, value);
      }
    }

    for (const k of Object.keys(stats)) {
      stats[k].avg = stats[k].total / stats[k].count;
      if (stats[k].min === Infinity) stats[k].min = 0;
      if (stats[k].max === -Infinity) stats[k].max = 0;
    }

    return { platform, period, dataPoints: allMetrics.length, stats };
  }
}
