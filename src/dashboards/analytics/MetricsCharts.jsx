// 2026-07-20
import React, { useMemo } from 'react';
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { PLATFORM_CONFIG } from './SocialMetrics.jsx';

// ------------------------------------------------
// Helpers
// ------------------------------------------------
function fmt(n) {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const CHART_COLORS = Object.fromEntries(
  Object.entries(PLATFORM_CONFIG).map(([k, v]) => [k, v.color])
);

const DARK_AXIS = { fill: '#9ca3af', fontSize: 11 };
const DARK_GRID = { stroke: '#374151', strokeDasharray: '3 3' };
const DARK_BG = 'transparent';

// ------------------------------------------------
// Shared custom tooltip
// ------------------------------------------------
function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs text-white shadow-xl">
      {label && <div className="text-gray-400 mb-1">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-semibold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------
// Views by Platform — BarChart
// ------------------------------------------------
export function ViewsByPlatformChart({ platforms }) {
  const data = useMemo(
    () =>
      platforms.map((m) => ({
        name: PLATFORM_CONFIG[m.platform]?.label || m.platform,
        Views: m.views,
        Reach: m.reach,
        platform: m.platform,
      })),
    [platforms]
  );

  return (
    <div className="bg-gray-800 rounded-xl p-4 shadow">
      <h3 className="text-white font-semibold text-sm mb-3">Views &amp; Reach by Platform</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }} barCategoryGap="30%">
          <CartesianGrid {...DARK_GRID} />
          <XAxis dataKey="name" tick={DARK_AXIS} />
          <YAxis tickFormatter={fmt} tick={DARK_AXIS} width={40} />
          <Tooltip content={<DarkTooltip />} cursor={{ fill: '#ffffff0a' }} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
          {data.map((d, i) => (
            <React.Fragment key={d.platform}>
              {i === 0 && (
                <>
                  <Bar dataKey="Views" radius={[3, 3, 0, 0]}>
                    {data.map((entry) => (
                      <Cell key={entry.platform} fill={CHART_COLORS[entry.platform] || '#8b5cf6'} />
                    ))}
                  </Bar>
                  <Bar dataKey="Reach" radius={[3, 3, 0, 0]} fill="#6366f1" opacity={0.5} />
                </>
              )}
            </React.Fragment>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ------------------------------------------------
// Engagement Over Time — multi-series LineChart
// ------------------------------------------------
export function EngagementTimelineChart({ platforms }) {
  // Merge all platforms' time series onto the same date axis
  const data = useMemo(() => {
    const dateMap = {};
    platforms.forEach((m) => {
      (m.timeSeries || []).forEach((point) => {
        if (!dateMap[point.date]) dateMap[point.date] = { date: point.date };
        dateMap[point.date][m.platform] = point.value;
      });
    });
    return Object.values(dateMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14); // last 14 days for clarity
  }, [platforms]);

  return (
    <div className="bg-gray-800 rounded-xl p-4 shadow">
      <h3 className="text-white font-semibold text-sm mb-3">Engagement Over Time (last 14 days)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid {...DARK_GRID} />
          <XAxis dataKey="date" tick={DARK_AXIS} tickFormatter={(v) => v.slice(5)} />
          <YAxis tickFormatter={fmt} tick={DARK_AXIS} width={40} />
          <Tooltip content={<DarkTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
          {platforms.map((m) => (
            <Line
              key={m.platform}
              type="monotone"
              dataKey={m.platform}
              name={PLATFORM_CONFIG[m.platform]?.label || m.platform}
              stroke={CHART_COLORS[m.platform] || '#8b5cf6'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ------------------------------------------------
// Audience Distribution — PieChart
// ------------------------------------------------
const RADIAN = Math.PI / 180;
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }) {
  if (percent < 0.04) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function AudienceDistributionChart({ platforms }) {
  const data = useMemo(
    () =>
      platforms.map((m) => ({
        name: PLATFORM_CONFIG[m.platform]?.label || m.platform,
        value: m.followers,
        platform: m.platform,
      })),
    [platforms]
  );

  return (
    <div className="bg-gray-800 rounded-xl p-4 shadow">
      <h3 className="text-white font-semibold text-sm mb-3">Audience Distribution by Platform</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="value"
            labelLine={false}
            label={<PieLabel />}
          >
            {data.map((entry) => (
              <Cell key={entry.platform} fill={CHART_COLORS[entry.platform] || '#8b5cf6'} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0];
              return (
                <div className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs text-white shadow-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.payload.fill }} />
                    <span>{d.name}</span>
                  </div>
                  <div className="text-gray-300 mt-1">{fmt(d.value)} followers</div>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: '#9ca3af' }}
            formatter={(value, entry) => (
              <span style={{ color: entry.color }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ------------------------------------------------
// Posting Time Heatmap — grid of engagement intensity
// ------------------------------------------------
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = ['6am', '9am', '12pm', '3pm', '6pm', '9pm', '12am'];

function generateHeatmapData() {
  return DAYS.map((day) => ({
    day,
    hours: HOURS.map((hour) => ({
      hour,
      // Simulate higher engagement evenings + weekends
      value: Math.round(
        (Math.random() * 60 + 20) *
          (hour === '6pm' || hour === '9pm' ? 1.8 : 1) *
          (day === 'Sat' || day === 'Sun' ? 1.4 : 1)
      ),
    })),
  }));
}

const HEATMAP_DATA = generateHeatmapData();

function heatColor(value) {
  // 0..100 → dark purple to bright purple/pink
  const intensity = Math.min(value / 140, 1);
  const r = Math.round(80 + intensity * 175);
  const g = Math.round(20 + intensity * 20);
  const b = Math.round(120 + intensity * 80);
  return `rgb(${r},${g},${b})`;
}

export function PostingHeatmapChart() {
  return (
    <div className="bg-gray-800 rounded-xl p-4 shadow">
      <h3 className="text-white font-semibold text-sm mb-3">Best Posting Times (Engagement Intensity)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[360px]">
          <thead>
            <tr>
              <th className="text-gray-500 font-normal pb-2 text-left w-10">Day</th>
              {HOURS.map((h) => (
                <th key={h} className="text-gray-500 font-normal pb-2 text-center px-0.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HEATMAP_DATA.map((row) => (
              <tr key={row.day}>
                <td className="text-gray-400 pr-2 py-0.5 font-medium">{row.day}</td>
                {row.hours.map((cell) => (
                  <td key={cell.hour} className="py-0.5 px-0.5">
                    <div
                      className="rounded h-6 flex items-center justify-center cursor-default text-[9px] font-bold select-none"
                      style={{
                        background: heatColor(cell.value),
                        color: cell.value > 80 ? 'white' : 'rgba(255,255,255,0.5)',
                      }}
                      title={`${row.day} ${cell.hour}: ${cell.value}%`}
                    >
                      {cell.value}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center gap-2 mt-3 justify-end">
          <span className="text-gray-500 text-[10px]">Low</span>
          {[20, 50, 80, 110, 140].map((v) => (
            <div
              key={v}
              className="w-4 h-3 rounded-sm"
              style={{ background: heatColor(v) }}
            />
          ))}
          <span className="text-gray-500 text-[10px]">High</span>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------
// Composed export — all charts
// ------------------------------------------------
export default function MetricsCharts({ platforms = [] }) {
  if (!platforms.length) {
    return (
      <div className="text-center py-16 text-gray-500 text-sm">
        No platform data available.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ViewsByPlatformChart platforms={platforms} />
      <AudienceDistributionChart platforms={platforms} />
      <div className="lg:col-span-2">
        <EngagementTimelineChart platforms={platforms} />
      </div>
      <div className="lg:col-span-2">
        <PostingHeatmapChart />
      </div>
    </div>
  );
}
