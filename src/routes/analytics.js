// ================================================
// NEXUS AI PRO - Social Media Analytics Routes
// ================================================
// Copyright © 2025-2026 Cameron Fox. All rights reserved.

import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

// ─── AES-256-GCM token encryption ────────────────────────────────────────────
// Derive a stable 32-byte key from env vars (set these in .env for production)
const _encKey = crypto.scryptSync(
  process.env.ANALYTICS_ENCRYPTION_SECRET || 'nexus-analytics-secret-change-in-prod',
  process.env.ANALYTICS_ENCRYPTION_SALT   || 'nexus-analytics-salt-change-in-prod',
  32
);

function encryptToken(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', _encKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    iv:        iv.toString('hex'),
    encrypted: encrypted.toString('hex'),
    tag:       cipher.getAuthTag().toString('hex'),
  };
}

function decryptToken({ iv, encrypted, tag }) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', _encKey, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

// ─── In-memory connected-platform store ──────────────────────────────────────
// Stores: platform -> { encrypted, accountId, accountName, connectedAt }
const connectedPlatforms = new Map();

// ─── Valid platform identifiers ───────────────────────────────────────────────
const PLATFORMS = new Set([
  'tiktok', 'instagram', 'facebook', 'twitch',
  'discord', 'lemon8', 'reddit', 'redgifs',
]);

// ─── Utility helpers ──────────────────────────────────────────────────────────
function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate a 30-day time series with realistic drift
function timeSeries(base, days = 30, variance = 0.22) {
  const out = [];
  let val = base;
  for (let i = days; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    const delta = val * variance * (Math.random() * 2 - 1);
    val = Math.max(0, Math.round(val + delta));
    out.push({ date, value: val });
  }
  return out;
}

// ─── Per-platform mock metrics ────────────────────────────────────────────────
// Each call is intentionally fresh so charts look alive across page refreshes;
// callers that want stability should cache the response.
function buildMockMetrics(platform) {
  switch (platform) {
    case 'tiktok':
      return {
        views:           rnd(2_600_000, 3_100_000),
        likes:           rnd(130_000, 160_000),
        comments:        rnd(16_000, 22_000),
        shares:          rnd(28_000, 36_000),
        followers:       rnd(82_000, 88_000),
        watchTime:       rnd(4_200_000, 5_400_000),
        completionRate:  +(0.62 + Math.random() * 0.12).toFixed(3),
        fyp_impressions: rnd(2_900_000, 3_600_000),
        engagementRate:  +(0.055 + Math.random() * 0.03).toFixed(4),
        contentTypes: [
          { type: 'Original Video', count: rnd(40, 55), avgViews: rnd(55_000, 72_000), avgLikes: rnd(2_800, 4_200), avgEngagement: 0.071 },
          { type: 'Duet',           count: rnd(8,  16), avgViews: rnd(28_000, 42_000), avgLikes: rnd(1_400, 2_000), avgEngagement: 0.058 },
          { type: 'Stitch',         count: rnd(5,  12), avgViews: rnd(38_000, 54_000), avgLikes: rnd(2_000, 2_800), avgEngagement: 0.065 },
        ],
      };

    case 'instagram':
      return {
        reach:         rnd(380_000, 450_000),
        impressions:   rnd(820_000, 960_000),
        likes:         rnd(54_000, 70_000),
        comments:      rnd(6_000, 9_000),
        saves:         rnd(18_000, 26_000),
        storyViews:    rnd(120_000, 155_000),
        reachRate:     +(0.44 + Math.random() * 0.1).toFixed(3),
        followers:     rnd(94_000, 104_000),
        engagementRate: +(0.045 + Math.random() * 0.02).toFixed(4),
        contentTypes: [
          { type: 'Reel',     count: rnd(28, 42), avgReach: rnd(24_000, 34_000), avgLikes: rnd(2_400, 3_400), avgEngagement: 0.059 },
          { type: 'Post',     count: rnd(50, 76), avgReach: rnd(7_000,  11_000), avgLikes: rnd(820,   1_100), avgEngagement: 0.041 },
          { type: 'Story',    count: rnd(200, 280), avgViews: rnd(3_600, 5_000), avgReplies: rnd(40, 60),    avgEngagement: 0.035 },
          { type: 'Carousel', count: rnd(14, 24), avgReach: rnd(10_000, 15_000), avgLikes: rnd(1_200, 1_800), avgEngagement: 0.055 },
        ],
      };

    case 'facebook':
      return {
        pageViews:     rnd(88_000, 110_000),
        postReach:     rnd(290_000, 360_000),
        reactions:     rnd(36_000, 50_000),
        shares:        rnd(8_200, 12_000),
        comments:      rnd(4_800, 7_200),
        pageFollowers: rnd(62_000, 74_000),
        videoViews:    rnd(160_000, 210_000),
        engagementRate: +(0.030 + Math.random() * 0.015).toFixed(4),
        contentTypes: [
          { type: 'Video',  count: rnd(18, 28), avgReach: rnd(15_000, 22_000), avgViews: rnd(7_000, 11_000),  avgEngagement: 0.047 },
          { type: 'Photo',  count: rnd(40, 58), avgReach: rnd(6_000,   9_000), avgReactions: rnd(540, 740),   avgEngagement: 0.031 },
          { type: 'Link',   count: rnd(28, 42), avgReach: rnd(3_400,   5_400), avgClicks: rnd(200, 340),      avgEngagement: 0.024 },
          { type: 'Story',  count: rnd(48, 72), avgViews: rnd(3_200,   4_600), avgReplies: rnd(26, 42),       avgEngagement: 0.028 },
        ],
      };

    case 'twitch':
      return {
        avgConcurrentViewers: rnd(1_100, 1_400),
        peakViewers:          rnd(4_200, 5_400),
        followers:            rnd(26_000, 32_000),
        subscribers:          rnd(1_600, 2_100),
        streamHours:          rnd(280, 360),
        chatMessages:         rnd(820_000, 980_000),
        clipViews:            rnd(220_000, 280_000),
        engagementRate:       +(0.065 + Math.random() * 0.025).toFixed(4),
        contentTypes: [
          { type: 'Just Chatting', streams: rnd(14, 22), avgViewers: rnd(1_200, 1_600), avgDuration: +(2.8 + Math.random() * 0.8).toFixed(1) },
          { type: 'FPS Games',     streams: rnd(20, 30), avgViewers: rnd(980,   1_300), avgDuration: +(3.8 + Math.random() * 0.8).toFixed(1) },
          { type: 'Strategy',      streams: rnd(6,  12), avgViewers: rnd(860,   1_100), avgDuration: +(5.0 + Math.random() * 1.0).toFixed(1) },
          { type: 'Creative',      streams: rnd(3,   7), avgViewers: rnd(720,    920), avgDuration: +(2.4 + Math.random() * 0.8).toFixed(1) },
        ],
      };

    case 'discord':
      return {
        members:       rnd(13_000, 16_000),
        onlineNow:     rnd(720, 980),
        messagesSent:  rnd(360_000, 430_000),
        voiceMinutes:  rnd(76_000, 96_000),
        boosts:        rnd(18, 32),
        channels:      rnd(32, 46),
        engagementRate: +(0.055 + Math.random() * 0.02).toFixed(4),
        contentTypes: [
          { type: 'Text Channels',  count: rnd(18, 28), avgDailyMessages: rnd(1_200, 1_800) },
          { type: 'Voice Channels', count: rnd(8,  16), avgDailyMinutes:  rnd(2_400, 3_400) },
          { type: 'Forum Channels', count: rnd(2,   6), avgDailyPosts:    rnd(48, 80) },
        ],
      };

    case 'lemon8':
      return {
        views:         rnd(170_000, 210_000),
        likes:         rnd(12_000, 17_000),
        saves:         rnd(7_500, 10_500),
        followers:     rnd(20_000, 26_000),
        reach:         rnd(84_000, 108_000),
        engagementRate: +(0.038 + Math.random() * 0.015).toFixed(4),
        contentTypes: [
          { type: 'Lifestyle', count: rnd(22, 36), avgViews: rnd(6_200,  8_600), avgLikes: rnd(580,  760), avgSaves: rnd(280, 380) },
          { type: 'Beauty',    count: rnd(12, 22), avgViews: rnd(8_200, 11_200), avgLikes: rnd(720,  980), avgSaves: rnd(420, 580) },
          { type: 'Food',      count: rnd(8,  16), avgViews: rnd(5_400,  7_400), avgLikes: rnd(460,  640), avgSaves: rnd(250, 340) },
          { type: 'Travel',    count: rnd(5,  12), avgViews: rnd(7_600, 10_400), avgLikes: rnd(660,  880), avgSaves: rnd(360, 480) },
        ],
      };

    case 'reddit':
      return {
        karma:           rnd(44_000, 54_000),
        postKarma:       rnd(28_000, 36_000),
        commentKarma:    rnd(14_000, 20_000),
        followers:       rnd(3_000, 4_200),
        postViews:       rnd(720_000, 860_000),
        awardsReceived:  rnd(38, 58),
        engagementRate:  +(0.028 + Math.random() * 0.016).toFixed(4),
        contentTypes: [
          { type: 'Text Post', count: rnd(36, 50), avgKarma: rnd(740,  920), avgComments: rnd(40, 58),   avgViews: rnd(10_000, 15_000) },
          { type: 'Link Post', count: rnd(14, 24), avgKarma: rnd(1_100, 1_400), avgComments: rnd(60, 88),   avgViews: rnd(24_000, 34_000) },
          { type: 'Image',     count: rnd(18, 30), avgKarma: rnd(1_900, 2_500), avgComments: rnd(80, 112),  avgViews: rnd(36_000, 50_000) },
          { type: 'Video',     count: rnd(5,  12), avgKarma: rnd(3_000, 4_000), avgComments: rnd(110, 150), avgViews: rnd(58_000, 80_000) },
        ],
      };

    case 'redgifs':
      return {
        views:       rnd(1_100_000, 1_400_000),
        likes:       rnd(78_000, 98_000),
        followers:   rnd(11_000, 15_000),
        totalGIFs:   rnd(260, 310),
        engagementRate: +(0.038 + Math.random() * 0.018).toFixed(4),
        contentTypes: [
          { type: 'Short Clip', count: rnd(120, 160), avgViews: rnd(3_600, 5_000), avgLikes: rnd(270, 380) },
          { type: 'Loop GIF',   count: rnd(80,  120), avgViews: rnd(3_200, 4_400), avgLikes: rnd(240, 330) },
          { type: 'Long Form',  count: rnd(36,   54), avgViews: rnd(5_400, 7_200), avgLikes: rnd(380, 520) },
        ],
      };

    default:
      return {};
  }
}

// ─── Retention curves ─────────────────────────────────────────────────────────
function retentionCurve(platform) {
  const curves = {
    tiktok:    [100, 82, 71, 67, 63, 59, 57, 55, 54, 53],
    instagram: [100, 74, 58, 48, 42, 37, 33, 30, 28, 27],
    facebook:  [100, 69, 51, 41, 34, 29, 25, 22, 20, 19],
    twitch:    [100, 94, 89, 85, 82, 79, 76, 74, 72, 71],
    discord:   [100, 98, 96, 95, 94, 93, 92, 92, 91, 91],
    lemon8:    [100, 71, 55, 44, 37, 32, 28, 25, 23, 22],
    reddit:    [100, 64, 42, 28, 18, 12,  8,  5,  3,  2],
    redgifs:   [100, 88, 77, 69, 63, 58, 54, 51, 49, 47],
  };
  const base = curves[platform] || [100, 75, 60, 50, 43, 37, 33, 30, 28, 26];
  return base.map((pct, i) => ({
    timePercent:      i * 10,
    retentionPercent: Math.max(0, pct + rnd(-3, 3)),
  }));
}

// ─── Posting-time heatmap (7 days × 24 hours) ────────────────────────────────
function bestPostingTimes(platform) {
  const peakSlotMap = {
    tiktok:    [[1,7],[3,19],[5,21],[6,15],[0,20]],
    instagram: [[2,11],[4,14],[6,10],[1,18],[3,13]],
    facebook:  [[3,13],[5,15],[6,11],[2,12],[4,14]],
    twitch:    [[6,20],[0,19],[5,21],[1,20],[0,21]],
    discord:   [[6,16],[0,15],[1,18],[5,17],[0,16]],
    lemon8:    [[0,9],[3,12],[6,10],[2,11],[4,13]],
    reddit:    [[1,9],[2,10],[3,9],[4,10],[1,10]],
    redgifs:   [[5,22],[6,21],[0,20],[4,22],[6,20]],
  };
  const peaks = new Set((peakSlotMap[platform] || []).map(([d, h]) => `${d}:${h}`));
  const grid = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const isPeak = peaks.has(`${d}:${h}`);
      grid.push({ day: d, hour: h, score: isPeak ? rnd(75, 98) : rnd(8, 44) });
    }
  }
  return grid;
}

// ─── Platform validator middleware ────────────────────────────────────────────
function validatePlatform(req, res) {
  const platform = req.params.platform?.toLowerCase();
  if (!PLATFORMS.has(platform)) {
    res.status(404).json({
      error:     `Unknown platform: ${req.params.platform}`,
      supported: [...PLATFORMS],
    });
    return null;
  }
  return platform;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIXED ROUTES
// Register before :platform to avoid shadowing
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/analytics/overview
router.get('/overview', (req, res) => {
  const allPlatforms = [...PLATFORMS];
  let totalFollowers = 0;
  let totalReach     = 0;
  const engRates     = [];
  let topPlatform    = { name: 'tiktok', followers: 0 };

  for (const p of allPlatforms) {
    const d = buildMockMetrics(p);
    const followers = d.followers ?? d.members ?? d.karma ?? 0;
    const reach     = d.reach ?? d.postReach ?? d.views ?? d.pageViews ?? followers * 2;
    totalFollowers += followers;
    totalReach     += reach;
    if (d.engagementRate) engRates.push(d.engagementRate);
    if (followers > topPlatform.followers) topPlatform = { name: p, followers };
  }

  const avgEngagement = engRates.length
    ? engRates.reduce((a, b) => a + b, 0) / engRates.length
    : 0;

  res.json({
    summary: {
      totalFollowers,
      totalReach,
      avgEngagementRate:    +((avgEngagement * 100).toFixed(2)),
      topPlatform:          topPlatform.name,
      connectedPlatforms:   connectedPlatforms.size,
      totalPlatforms:       allPlatforms.length,
    },
    platforms: allPlatforms.map(p => {
      const d = buildMockMetrics(p);
      return {
        platform:       p,
        connected:      connectedPlatforms.has(p),
        followers:      d.followers ?? d.members ?? d.karma ?? 0,
        engagementRate: d.engagementRate ?? 0,
        reach:          d.reach ?? d.postReach ?? d.views ?? d.pageViews ?? 0,
      };
    }),
    lastUpdated: new Date().toISOString(),
  });
});

// GET /api/analytics/reach
router.get('/reach', (req, res) => {
  const allPlatforms = [...PLATFORMS];
  const platforms = allPlatforms.map(p => {
    const d = buildMockMetrics(p);
    const reach = d.reach ?? d.postReach ?? d.views ?? d.pageViews ?? (d.followers ?? 0) * 2;
    return {
      platform:      p,
      reach,
      impressions:   Math.round(reach * (1.7 + Math.random() * 0.9)),
      uniqueAccounts: Math.round(reach * (0.55 + Math.random() * 0.3)),
      reachGrowthPct: +((Math.random() * 40 - 10).toFixed(1)),
      timeSeries:    timeSeries(Math.round(reach / 30), 30),
    };
  });

  const totalReach = platforms.reduce((s, p) => s + p.reach, 0);

  res.json({
    totalCrossplatformReach:   totalReach,
    uniqueEstimatedReach:      Math.round(totalReach * (0.65 + Math.random() * 0.1)),
    platforms,
    lastUpdated: new Date().toISOString(),
  });
});

// GET /api/analytics/retention
router.get('/retention', (req, res) => {
  const allPlatforms = [...PLATFORMS];
  res.json({
    platforms: allPlatforms.map(p => {
      const curve = retentionCurve(p);
      const at50  = curve.find(pt => pt.timePercent === 50)?.retentionPercent ?? 40;
      return { platform: p, curve, avgRetentionAt50Pct: at50 };
    }),
    lastUpdated: new Date().toISOString(),
  });
});

// GET /api/analytics/trending
router.get('/trending', (req, res) => {
  res.json({
    trending: [
      {
        platform: 'tiktok',
        title:    'Behind the Scenes: Day in My Life',
        views:    rnd(1_100_000, 1_400_000),
        likes:    rnd(80_000,    96_000),
        engagementRate: 0.082,
        postedAt: new Date(Date.now() - 172_800_000).toISOString(),
      },
      {
        platform: 'instagram',
        title:    'Morning Routine Reel',
        reach:    rnd(76_000, 94_000),
        likes:    rnd(5_600,   7_200),
        engagementRate: 0.074,
        postedAt: new Date(Date.now() - 86_400_000).toISOString(),
      },
      {
        platform: 'reddit',
        title:    'Built this in a weekend — feedback welcome',
        karma:    rnd(4_200, 5_600),
        comments: rnd(200, 270),
        engagementRate: 0.061,
        postedAt: new Date(Date.now() - 259_200_000).toISOString(),
      },
      {
        platform: 'twitch',
        title:    'Raid Train Saturday',
        viewers:  rnd(4_200, 5_200),
        chatMessages: rnd(24_000, 32_000),
        engagementRate: 0.094,
        postedAt: new Date(Date.now() - 604_800_000).toISOString(),
      },
      {
        platform: 'facebook',
        title:    'Live Q&A Session',
        reach:    rnd(38_000, 48_000),
        reactions: rnd(3_000, 4_000),
        engagementRate: 0.055,
        postedAt: new Date(Date.now() - 345_600_000).toISOString(),
      },
      {
        platform: 'lemon8',
        title:    'NYC Fall Aesthetic Guide',
        views:    rnd(24_000, 34_000),
        likes:    rnd(1_800,   2_600),
        saves:    rnd(860,     1_200),
        engagementRate: 0.068,
        postedAt: new Date(Date.now() - 432_000_000).toISOString(),
      },
      {
        platform: 'discord',
        title:    '#general AMA thread',
        messages: rnd(3_800, 5_000),
        reactions: rnd(1_600, 2_100),
        engagementRate: 0.072,
        postedAt: new Date(Date.now() - 518_400_000).toISOString(),
      },
      {
        platform: 'redgifs',
        title:    'Timelapse: Painting Commission',
        views:    rnd(130_000, 168_000),
        likes:    rnd(8_400,  10_800),
        engagementRate: 0.051,
        postedAt: new Date(Date.now() - 691_200_000).toISOString(),
      },
    ],
    lastUpdated: new Date().toISOString(),
  });
});

// GET /api/analytics/schedule
router.get('/schedule', (req, res) => {
  const allPlatforms = [...PLATFORMS];
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  res.json({
    platforms: allPlatforms.map(p => {
      const heatmap = bestPostingTimes(p);
      const topSlots = [...heatmap]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(s => ({ day: DAY_NAMES[s.day], hour: s.hour, score: s.score }));
      return { platform: p, heatmap, topSlots };
    }),
    lastUpdated: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PARAMETERIZED PLATFORM ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/analytics/:platform
router.get('/:platform', (req, res) => {
  const platform = validatePlatform(req, res);
  if (!platform) return;

  const metrics = buildMockMetrics(platform);
  const primary = metrics.views ?? metrics.reach ?? metrics.pageViews
                ?? metrics.members ?? metrics.karma ?? 10_000;
  const followersBase = metrics.followers ?? metrics.members ?? metrics.karma ?? 1_000;

  res.json({
    platform,
    connected:   connectedPlatforms.has(platform),
    metrics,
    timeSeries: {
      primary:   timeSeries(Math.round(primary / 30)),
      followers: timeSeries(Math.round(followersBase / 30), 30, 0.08),
    },
    retention:   retentionCurve(platform),
    schedule:    bestPostingTimes(platform),
    lastUpdated: new Date().toISOString(),
  });
});

// GET /api/analytics/:platform/realtime
router.get('/:platform/realtime', (req, res) => {
  const platform = validatePlatform(req, res);
  if (!platform) return;

  const now = Date.now();
  const last5Minutes = Array.from({ length: 5 }, (_, i) => ({
    timestamp:       new Date(now - (4 - i) * 60_000).toISOString(),
    activeUsers:     rnd(180, 840),
    newInteractions: rnd(40,  320),
  }));

  res.json({
    platform,
    liveMetrics: {
      currentViewers:       platform === 'twitch'  ? rnd(800,  1_700) : undefined,
      onlineMembers:        platform === 'discord' ? rnd(600,  1_000) : undefined,
      activeUsers:          rnd(200, 900),
      interactionsPerMin:   rnd(35, 190),
      recentLikes:          rnd(8,   90),
      recentComments:       rnd(2,   24),
      recentShares:         rnd(0,   14),
    },
    last5Minutes,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/analytics/:platform/connect
router.post('/:platform/connect', (req, res) => {
  const platform = validatePlatform(req, res);
  if (!platform) return;

  const { accessToken, refreshToken, accountId, accountName } = req.body;
  if (!accessToken) {
    return res.status(400).json({ error: 'accessToken is required' });
  }

  const payload   = JSON.stringify({ accessToken, refreshToken, accountId, accountName });
  const encrypted = encryptToken(payload);

  connectedPlatforms.set(platform, {
    encrypted,
    accountId:   accountId   || 'mock-account',
    accountName: accountName || `${platform} Account`,
    connectedAt: new Date().toISOString(),
  });

  res.json({
    success:     true,
    platform,
    accountName: accountName || `${platform} Account`,
    connectedAt: new Date().toISOString(),
  });
});

// DELETE /api/analytics/:platform/disconnect
router.delete('/:platform/disconnect', (req, res) => {
  const platform = validatePlatform(req, res);
  if (!platform) return;

  const wasConnected = connectedPlatforms.has(platform);
  connectedPlatforms.delete(platform);

  res.json({ success: true, platform, wasConnected });
});

export default router;
