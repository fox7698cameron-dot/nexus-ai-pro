// src/services/analytics.service.js
// Social media analytics aggregation — TikTok, Instagram, Facebook, Twitch,
// Discord, Lemon8, Reddit, RedGIFs, YouTube, Twitter (real-time via Socket.IO)
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import crypto from 'crypto';
import { EventEmitter } from 'events';
import { SOCIAL_PLATFORMS } from '../config/constants.js';
import { encrypt, decrypt } from './crypto.service.js';

export const analyticsEvents = new EventEmitter();

// In-memory store keyed by userId → platform → metrics[]
const _store = new Map();

function getUserStore(userId) {
  if (!_store.has(userId)) _store.set(userId, new Map());
  return _store.get(userId);
}

// Aggregate metrics across all connected platforms for a user
export function getAggregatedMetrics(userId) {
  const store = getUserStore(userId);
  const summary = {
    totalFollowers: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalReach: 0,
    avgEngagementRate: 0,
    platforms: {},
    updatedAt: new Date().toISOString(),
  };

  let platformCount = 0;
  let engagementSum = 0;

  for (const [platform, snapshots] of store) {
    const latest = snapshots[snapshots.length - 1];
    if (!latest) continue;
    summary.platforms[platform] = latest;
    summary.totalFollowers += latest.followers ?? 0;
    summary.totalViews += latest.totalViews ?? 0;
    summary.totalLikes += latest.totalLikes ?? 0;
    summary.totalComments += latest.totalComments ?? 0;
    summary.totalShares += latest.totalShares ?? 0;
    summary.totalReach += latest.reach ?? 0;
    engagementSum += latest.engagementRate ?? 0;
    platformCount++;
  }

  if (platformCount > 0) summary.avgEngagementRate = engagementSum / platformCount;
  return summary;
}

// Store a new metrics snapshot (called by platform connector or webhook)
export function recordSnapshot(userId, platform, metrics) {
  if (!SOCIAL_PLATFORMS.includes(platform)) throw new Error(`Unknown platform: ${platform}`);
  const store = getUserStore(userId);
  if (!store.has(platform)) store.set(platform, []);

  const snapshot = {
    id: crypto.randomUUID(),
    platform,
    recordedAt: new Date().toISOString(),
    ...metrics,
  };
  const snapshots = store.get(platform);
  snapshots.push(snapshot);
  // Keep last 1000 snapshots per platform
  if (snapshots.length > 1000) snapshots.shift();

  analyticsEvents.emit('metrics:updated', { userId, platform, snapshot });
  return snapshot;
}

// Time-series data for charts (last N snapshots for a platform)
export function getTimeSeries(userId, platform, limit = 30) {
  const store = getUserStore(userId);
  const snapshots = store.get(platform) ?? [];
  return snapshots.slice(-limit);
}

// Platform-specific reach & retention for a set of posts
export function getContentMetrics(userId, platform) {
  const store = getUserStore(userId);
  const snapshots = store.get(platform) ?? [];
  const latest = snapshots[snapshots.length - 1];
  if (!latest) return null;

  return {
    platform,
    reach: latest.reach ?? 0,
    impressions: latest.impressions ?? 0,
    avgViewDurationSec: latest.avgViewDurationSec ?? 0,
    watchTimeSec: latest.watchTimeSec ?? 0,
    engagementRate: latest.engagementRate ?? 0,
    subscriberGrowth: latest.subscriberGrowth ?? 0,
    topPosts: latest.topPosts ?? [],
    updatedAt: latest.recordedAt,
  };
}

// Generate mock data for development / demo (replace with real API calls in production)
export function seedDemoMetrics(userId) {
  const platforms = SOCIAL_PLATFORMS;
  for (const platform of platforms) {
    recordSnapshot(userId, platform, {
      followers: Math.floor(Math.random() * 100000) + 1000,
      following: Math.floor(Math.random() * 2000) + 100,
      totalPosts: Math.floor(Math.random() * 500) + 10,
      totalViews: Math.floor(Math.random() * 5000000) + 10000,
      totalLikes: Math.floor(Math.random() * 500000) + 1000,
      totalComments: Math.floor(Math.random() * 50000) + 100,
      totalShares: Math.floor(Math.random() * 100000) + 500,
      reach: Math.floor(Math.random() * 1000000) + 5000,
      impressions: Math.floor(Math.random() * 2000000) + 10000,
      engagementRate: parseFloat((Math.random() * 8 + 0.5).toFixed(4)),
      avgViewDurationSec: Math.floor(Math.random() * 120) + 5,
      watchTimeSec: Math.floor(Math.random() * 10000000) + 10000,
      subscriberGrowth: Math.floor(Math.random() * 5000) - 500,
    });
  }
}
