// 2026-07-20
import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { PLATFORM_CONFIG } from './SocialMetrics.jsx';

// Platforms that have video retention data
const VIDEO_PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'redgifs'];

// ------------------------------------------------
// Custom tooltip
// ------------------------------------------------
function RetentionTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs text-white shadow-xl">
      <div className="text-gray-400 mb-1">At {label}% of video</div>
      <div className="font-semibold">{payload[0]?.value?.toFixed(1)}% still watching</div>
    </div>
  );
}

// ------------------------------------------------
// Find major drop-off points in retention curve
// ------------------------------------------------
function findDropOffs(curve, threshold = 8) {
  const dropOffs = [];
  for (let i = 1; i < curve.length; i++) {
    const drop = curve[i - 1].retention - curve[i].retention;
    if (drop >= threshold) {
      dropOffs.push({ position: curve[i].position, drop: drop.toFixed(1) });
    }
  }
  return dropOffs;
}

// ------------------------------------------------
// Benchmark lines (industry averages)
// ------------------------------------------------
const BENCHMARKS = {
  tiktok: 55,
  instagram: 50,
  facebook: 42,
  twitch: 60,
  redgifs: 65,
};

// ================================================
// Main Component
// ================================================
export default function RetentionTracker({ apiBase = '/api/analytics' }) {
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [retentionData, setRetentionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRetention = useCallback(async (platform) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/${platform}/retention`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setRetentionData(json);
    } catch (err) {
      setError(err.message);
      // Build client-side fallback curve so UI always renders
      setRetentionData({
        platform,
        isMock: true,
        avgRetention: BENCHMARKS[platform] || 50,
        curve: Array.from({ length: 21 }, (_, i) => {
          const pos = i * 5;
          return {
            position: pos,
            retention: parseFloat(
              Math.max(0, 100 - Math.pow(pos / 100, 1.3) * 65 + Math.random() * 4).toFixed(1)
            ),
          };
        }),
      });
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchRetention(selectedPlatform);
  }, [selectedPlatform, fetchRetention]);

  const cfg = PLATFORM_CONFIG[selectedPlatform];
  const curve = retentionData?.curve || [];
  const dropOffs = findDropOffs(curve);
  const benchmark = BENCHMARKS[selectedPlatform];

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow-xl p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h2 className="text-white font-bold text-base flex-1 min-w-0">
          Audience Retention
        </h2>
        {retentionData?.isMock && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-900/70 text-amber-400 border border-amber-700/50">
            MOCK DATA
          </span>
        )}
      </div>

      {/* Platform selector */}
      <div className="flex flex-wrap gap-2 mb-5">
        {VIDEO_PLATFORMS.map((p) => {
          const c = PLATFORM_CONFIG[p];
          const active = p === selectedPlatform;
          return (
            <button
              key={p}
              onClick={() => setSelectedPlatform(p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                active
                  ? 'text-white shadow-lg'
                  : 'text-gray-400 border-gray-700 hover:border-gray-500 bg-gray-800'
              }`}
              style={
                active
                  ? { background: c.color + '33', borderColor: c.color, color: 'white' }
                  : {}
              }
            >
              <span>{c.emoji}</span>
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Stats row */}
      {retentionData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <div
              className="text-2xl font-bold"
              style={{ color: cfg.color }}
            >
              {retentionData.avgRetention?.toFixed(1)}%
            </div>
            <div className="text-gray-400 text-xs mt-0.5">Avg Retention</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-indigo-400">{benchmark}%</div>
            <div className="text-gray-400 text-xs mt-0.5">Industry Avg</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <div
              className={`text-2xl font-bold ${
                retentionData.avgRetention >= benchmark ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {retentionData.avgRetention >= benchmark ? '+' : ''}
              {(retentionData.avgRetention - benchmark).toFixed(1)}%
            </div>
            <div className="text-gray-400 text-xs mt-0.5">vs Benchmark</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-amber-400">{dropOffs.length}</div>
            <div className="text-gray-400 text-xs mt-0.5">Drop-off Points</div>
          </div>
        </div>
      )}

      {/* Chart */}
      {loading && (
        <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
          Loading retention data…
        </div>
      )}

      {!loading && curve.length > 0 && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={curve} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id={`retGrad-${selectedPlatform}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cfg.color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={cfg.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
              <XAxis
                dataKey="position"
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                label={{ value: 'Video Progress', position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 10 }}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                width={38}
              />
              <Tooltip content={<RetentionTooltip />} />

              {/* Benchmark line */}
              <ReferenceLine
                y={benchmark}
                stroke="#6366f1"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: `Industry ${benchmark}%`, fill: '#818cf8', fontSize: 10, position: 'right' }}
              />

              {/* Drop-off markers */}
              {dropOffs.map((d) => (
                <ReferenceLine
                  key={d.position}
                  x={d.position}
                  stroke="#ef4444"
                  strokeDasharray="4 2"
                  strokeWidth={1}
                  label={{
                    value: `−${d.drop}%`,
                    fill: '#f87171',
                    fontSize: 9,
                    position: 'top',
                  }}
                />
              ))}

              <Area
                type="monotone"
                dataKey="retention"
                name="Retention"
                stroke={cfg.color}
                strokeWidth={2.5}
                fill={`url(#retGrad-${selectedPlatform})`}
                activeDot={{ r: 5, fill: cfg.color, stroke: 'white', strokeWidth: 1.5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Drop-off callouts */}
      {dropOffs.length > 0 && !loading && (
        <div className="mt-4">
          <div className="text-gray-400 text-xs font-medium mb-2">Significant Drop-off Points</div>
          <div className="flex flex-wrap gap-2">
            {dropOffs.map((d) => (
              <div
                key={d.position}
                className="flex items-center gap-1.5 bg-red-900/30 border border-red-700/40 rounded-lg px-3 py-1.5 text-xs"
              >
                <span className="text-red-400 font-bold">▼ {d.drop}%</span>
                <span className="text-gray-400">at</span>
                <span className="text-white font-medium">{d.position}% mark</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 text-amber-500 text-xs">
          Note: Using estimated data ({error}). Connect platform for real retention analytics.
        </div>
      )}
    </div>
  );
}
