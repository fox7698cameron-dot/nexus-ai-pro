/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * 2026-07-29 - Analytics engine: social media, reach, retention, real-time metrics
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// In-memory metric store (production uses Redis + TimescaleDB)
const metricStore = new Map();
const streamSubscribers = new Map();

const PLATFORMS = Object.freeze([
  'tiktok', 'instagram', 'facebook', 'twitch', 'discord',
  'lemon8', 'reddit', 'redgifs', 'youtube', 'twitter'
]);

const METRIC_TYPES = Object.freeze([
  'views', 'likes', 'comments', 'shares', 'reach',
  'impressions', 'followers', 'retention_rate', 'watch_time',
  'click_rate', 'save_rate', 'live_viewers', 'subscribers'
]);

function getStoreKey(userId, platform) {
  return `${userId}:${platform}`;
}

// Generate realistic synthetic metrics for display when no live API key is set
function synthMetric(base, variance = 0.2) {
  const delta = base * variance;
  return Math.max(0, Math.round(base + (Math.random() * 2 - 1) * delta));
}

function buildSnapshot(platform) {
  const bases = {
    tiktok:    { views: 125000, likes: 18000, comments: 420, shares: 2100, reach: 95000, followers: 48000, retention_rate: 68, watch_time: 42 },
    instagram: { views: 88000,  likes: 12500, comments: 310, shares: 890,  reach: 72000, followers: 35000, retention_rate: 54, watch_time: 28 },
    facebook:  { views: 45000,  likes: 5200,  comments: 180, shares: 420,  reach: 38000, followers: 22000, retention_rate: 41, watch_time: 18 },
    twitch:    { views: 32000,  likes: 4100,  comments: 2800, shares: 0,   reach: 28000, live_viewers: 1200, followers: 15000, retention_rate: 72, watch_time: 95 },
    discord:   { views: 0,      likes: 0,     comments: 5400, shares: 0,   reach: 18000, followers: 9500,  retention_rate: 88, watch_time: 0 },
    lemon8:    { views: 22000,  likes: 3100,  comments: 210, shares: 480,  reach: 19000, followers: 8200,  retention_rate: 62, watch_time: 35 },
    reddit:    { views: 95000,  likes: 14200, comments: 3200, shares: 1800, reach: 88000, followers: 42000, retention_rate: 45, watch_time: 0 },
    redgifs:   { views: 68000,  likes: 9800,  comments: 310, shares: 620,  reach: 61000, followers: 28000, retention_rate: 58, watch_time: 22 },
    youtube:   { views: 180000, likes: 24000, comments: 1800, shares: 3200, reach: 155000, subscribers: 62000, retention_rate: 52, watch_time: 480 },
    twitter:   { views: 52000,  likes: 7800,  comments: 940, shares: 2100, reach: 44000, followers: 31000, retention_rate: 38, watch_time: 0 }
  };

  const b = bases[platform] || {};
  const snapshot = { platform, timestamp: new Date().toISOString() };
  for (const [k, v] of Object.entries(b)) {
    snapshot[k] = synthMetric(v);
  }
  return snapshot;
}

export function getMetrics(userId, platform, range = '7d') {
  if (platform && !PLATFORMS.includes(platform)) {
    return { error: 'Unknown platform', status: 400 };
  }

  const targets = platform ? [platform] : [...PLATFORMS];
  const result = {};

  for (const p of targets) {
    const key = getStoreKey(userId, p);
    const stored = metricStore.get(key) || [];

    // Return stored + synthetic fill
    if (stored.length < 7) {
      const fill = Array.from({ length: 7 }, (_, i) => ({
        ...buildSnapshot(p),
        timestamp: new Date(Date.now() - i * 86400000).toISOString()
      }));
      result[p] = fill;
    } else {
      result[p] = stored.slice(-getPointCount(range));
    }
  }

  return { data: result, platforms: targets, range, status: 200 };
}

function getPointCount(range) {
  const map = { '1d': 24, '7d': 7, '30d': 30, '90d': 90 };
  return map[range] || 7;
}

export function ingestMetric(userId, platform, metric, value) {
  if (!PLATFORMS.includes(platform)) return { error: 'Unknown platform', status: 400 };
  if (!METRIC_TYPES.includes(metric)) return { error: 'Unknown metric', status: 400 };

  const key = getStoreKey(userId, platform);
  const existing = metricStore.get(key) || [];

  const last = existing[existing.length - 1] || buildSnapshot(platform);
  const updated = { ...last, [metric]: value, timestamp: new Date().toISOString() };
  existing.push(updated);
  if (existing.length > 1000) existing.splice(0, existing.length - 1000);
  metricStore.set(key, existing);

  // Broadcast to real-time subscribers
  broadcastMetric(userId, platform, updated);

  return { status: 200 };
}

export function getCurrentSnapshot(userId) {
  const snapshots = {};
  for (const p of PLATFORMS) {
    const key = getStoreKey(userId, p);
    const stored = metricStore.get(key) || [];
    snapshots[p] = stored[stored.length - 1] || buildSnapshot(p);
  }
  return { snapshots, status: 200 };
}

export function getReachSummary(userId) {
  const snap = getCurrentSnapshot(userId).snapshots;
  let totalReach = 0, totalFollowers = 0, totalViews = 0, totalLikes = 0;

  for (const s of Object.values(snap)) {
    totalReach += s.reach || 0;
    totalFollowers += (s.followers || 0) + (s.subscribers || 0);
    totalViews += s.views || 0;
    totalLikes += s.likes || 0;
  }

  const engagementRate = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(2) : 0;

  return {
    totalReach,
    totalFollowers,
    totalViews,
    totalLikes,
    engagementRate: parseFloat(engagementRate),
    platforms: PLATFORMS.length,
    status: 200
  };
}

export function getRetentionData(userId, platform) {
  if (platform && !PLATFORMS.includes(platform)) return { error: 'Unknown platform', status: 400 };

  const targets = platform ? [platform] : PLATFORMS.filter(p => ['tiktok', 'instagram', 'twitch', 'youtube'].includes(p));
  const result = {};

  for (const p of targets) {
    const key = getStoreKey(userId, p);
    const stored = metricStore.get(key) || [];
    const rates = stored.length
      ? stored.map(s => ({ timestamp: s.timestamp, retention_rate: s.retention_rate || 0, watch_time: s.watch_time || 0 }))
      : [{ timestamp: new Date().toISOString(), retention_rate: buildSnapshot(p).retention_rate, watch_time: buildSnapshot(p).watch_time || 0 }];
    result[p] = rates;
  }

  return { data: result, status: 200 };
}

// Real-time streaming
export function subscribe(userId, callback) {
  const subId = uuidv4();
  const existing = streamSubscribers.get(userId) || new Map();
  existing.set(subId, callback);
  streamSubscribers.set(userId, existing);
  return subId;
}

export function unsubscribe(userId, subId) {
  const subs = streamSubscribers.get(userId);
  if (subs) subs.delete(subId);
}

function broadcastMetric(userId, platform, data) {
  const subs = streamSubscribers.get(userId);
  if (!subs) return;
  for (const cb of subs.values()) {
    try { cb({ platform, data }); } catch { /* subscriber error */ }
  }
}

// Kick off synthetic real-time updates every 30s for demo purposes
let realtimeInterval = null;
export function startRealtimeSimulation(userIds) {
  if (realtimeInterval) return;
  realtimeInterval = setInterval(() => {
    for (const userId of userIds) {
      const platform = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];
      const snap = buildSnapshot(platform);
      broadcastMetric(userId, platform, snap);
    }
  }, 30000);
}

export { PLATFORMS, METRIC_TYPES };
