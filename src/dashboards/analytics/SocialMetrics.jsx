// 2026-07-20
import React from 'react';
import {
  LineChart, Line, ResponsiveContainer, Tooltip, YAxis,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ------------------------------------------------
// Platform configuration
// ------------------------------------------------
export const PLATFORM_CONFIG = {
  tiktok: {
    label: 'TikTok',
    color: '#ff0050',
    bg: 'bg-[#010101]',
    border: 'border-[#ff0050]',
    emoji: '🎵',
    tagline: 'Short-form video',
  },
  instagram: {
    label: 'Instagram',
    color: '#E1306C',
    bg: 'bg-[#1a0a10]',
    border: 'border-[#E1306C]',
    emoji: '📸',
    tagline: 'Photos & Reels',
  },
  facebook: {
    label: 'Facebook',
    color: '#1877F2',
    bg: 'bg-[#050e1a]',
    border: 'border-[#1877F2]',
    emoji: '👍',
    tagline: 'Social network',
  },
  twitch: {
    label: 'Twitch',
    color: '#9146FF',
    bg: 'bg-[#0d0515]',
    border: 'border-[#9146FF]',
    emoji: '🎮',
    tagline: 'Live streaming',
  },
  discord: {
    label: 'Discord',
    color: '#5865F2',
    bg: 'bg-[#080a1e]',
    border: 'border-[#5865F2]',
    emoji: '💬',
    tagline: 'Community',
  },
  lemon8: {
    label: 'Lemon8',
    color: '#FFEB3B',
    bg: 'bg-[#1a1800]',
    border: 'border-[#FFEB3B]',
    emoji: '🍋',
    tagline: 'Lifestyle & photos',
  },
  reddit: {
    label: 'Reddit',
    color: '#FF4500',
    bg: 'bg-[#1a0800]',
    border: 'border-[#FF4500]',
    emoji: '🤖',
    tagline: 'Communities',
  },
  redgifs: {
    label: 'RedGIFs',
    color: '#FF6B35',
    bg: 'bg-[#1a0b05]',
    border: 'border-[#FF6B35]',
    emoji: '🎞️',
    tagline: 'GIF sharing',
  },
};

// ------------------------------------------------
// Format large numbers with K/M suffix
// ------------------------------------------------
function fmt(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtPct(n) {
  if (n == null) return '—';
  return `${n.toFixed(1)}%`;
}

// ------------------------------------------------
// Trend indicator
// ------------------------------------------------
function TrendBadge({ value }) {
  if (value == null) return null;
  const positive = value > 0;
  const neutral = value === 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
        neutral
          ? 'bg-gray-700 text-gray-400'
          : positive
          ? 'bg-green-900/60 text-green-400'
          : 'bg-red-900/60 text-red-400'
      }`}
    >
      {neutral ? (
        <Minus size={11} />
      ) : positive ? (
        <TrendingUp size={11} />
      ) : (
        <TrendingDown size={11} />
      )}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

// ------------------------------------------------
// Stat row inside a card
// ------------------------------------------------
function StatRow({ label, value, sub }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-gray-700/40 last:border-0">
      <span className="text-gray-400 text-xs">{label}</span>
      <span className="text-white text-sm font-medium">
        {value}
        {sub && <span className="text-gray-500 ml-1 text-xs">{sub}</span>}
      </span>
    </div>
  );
}

// ------------------------------------------------
// Custom sparkline tooltip
// ------------------------------------------------
function SparkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white shadow-lg">
      <div className="text-gray-400">{label}</div>
      <div>{fmt(payload[0].value)}</div>
    </div>
  );
}

// ================================================
// Main Component
// ================================================
/**
 * SocialMetrics — card for a single platform.
 *
 * Props:
 *   platform  – one of PLATFORM_CONFIG keys
 *   metrics   – object with followers/likes/views/reach/retention/engagementRate/change/timeSeries
 *   compact   – render a smaller card (default false)
 */
export default function SocialMetrics({ platform, metrics, compact = false }) {
  const cfg = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.tiktok;
  const accentColor = cfg.color;

  const sparkData = (metrics?.timeSeries || []).map((d) => ({
    date: d.date,
    v: d.value,
  }));

  return (
    <div
      className={`relative flex flex-col rounded-xl border bg-gray-900 shadow-lg overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-xl ${cfg.border}`}
      style={{ borderColor: accentColor + '55' }}
    >
      {/* Mock data badge */}
      {metrics?.isMock && (
        <div className="absolute top-2 right-2 z-10">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-900/70 text-amber-400 border border-amber-700/50">
            MOCK
          </span>
        </div>
      )}

      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: `linear-gradient(135deg, ${accentColor}22 0%, transparent 70%)` }}
      >
        <span className="text-2xl leading-none select-none">{cfg.emoji}</span>
        <div className="min-w-0">
          <div className="text-white font-bold text-sm">{cfg.label}</div>
          <div className="text-gray-500 text-[11px] truncate">{cfg.tagline}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-white font-bold text-lg leading-none">{fmt(metrics?.followers)}</div>
          <div className="text-gray-500 text-[10px]">followers</div>
        </div>
      </div>

      {/* Sparkline */}
      {sparkData.length > 0 && (
        <div className="px-4 pt-1 pb-2 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip content={<SparkTooltip />} />
              <Line
                type="monotone"
                dataKey="v"
                stroke={accentColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: accentColor }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats */}
      <div className="px-4 pb-3 pt-1 space-y-0.5">
        <StatRow label="Likes" value={fmt(metrics?.likes)} />
        <StatRow label="Views" value={fmt(metrics?.views)} />
        <StatRow label="Reach" value={fmt(metrics?.reach)} />
        {!compact && (
          <>
            <StatRow label="Impressions" value={fmt(metrics?.impressions)} />
            <StatRow label="Comments" value={fmt(metrics?.comments)} />
            <StatRow label="Shares" value={fmt(metrics?.shares)} />
          </>
        )}
        <StatRow label="Retention" value={fmtPct(metrics?.retention)} />
        <div className="flex items-center justify-between pt-1">
          <span className="text-gray-400 text-xs">Engagement</span>
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-bold"
              style={{ color: accentColor }}
            >
              {fmtPct(metrics?.engagementRate)}
            </span>
            <TrendBadge value={metrics?.change?.views} />
          </div>
        </div>
      </div>
    </div>
  );
}
