import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',    color: '#ff0050', hasVideo: true  },
  { id: 'instagram', label: 'Instagram', color: '#e1306c', hasVideo: true  },
  { id: 'facebook',  label: 'Facebook',  color: '#1877f2', hasVideo: false },
  { id: 'twitch',    label: 'Twitch',    color: '#9146ff', hasVideo: true  },
  { id: 'discord',   label: 'Discord',   color: '#5865f2', hasVideo: false },
  { id: 'lemon8',    label: 'Lemon8',    color: '#ffd700', hasVideo: false },
  { id: 'reddit',    label: 'Reddit',    color: '#ff4500', hasVideo: false },
  { id: 'redgifs',   label: 'RedGIFs',   color: '#ff6b00', hasVideo: true  },
];

const TIME_RANGES = [
  { id: '24h', label: '24h' },
  { id: '7d',  label: '7d'  },
  { id: '30d', label: '30d' },
  { id: '90d', label: '90d' },
  { id: '1y',  label: '1y'  },
];

// ---------------------------------------------------------------------------
// Mock data generator
// ---------------------------------------------------------------------------
function seed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return Math.abs(h);
}

function pseudoRand(s, max = 1) {
  const x = Math.sin(s + 1) * 43758.5453123;
  return (x - Math.floor(x)) * max;
}

function generateTrendPoints(platform, range) {
  const counts = { '24h': 24, '7d': 7, '30d': 30, '90d': 90, '1y': 12 };
  const n = counts[range] || 30;
  const base = seed(platform + range) % 80000 + 20000;
  const points = [];
  let cur = base;
  for (let i = 0; i < n; i++) {
    const r = pseudoRand(seed(platform + range + i));
    cur = Math.max(1000, cur + (r - 0.45) * base * 0.15);
    points.push(Math.round(cur));
  }
  return points;
}

function generateBarData(platform, range) {
  const counts = { '24h': 7, '7d': 7, '30d': 30, '90d': 12, '1y': 12 };
  const n = counts[range] || 7;
  const base = seed(platform + range + 'bar') % 50000 + 10000;
  return Array.from({ length: n }, (_, i) => {
    const r = pseudoRand(seed(platform + range + 'bar' + i));
    return Math.round(base * (0.5 + r));
  });
}

const CONTENT_TITLES = {
  tiktok:    ['POV: Monday vibes', 'Day in my life', 'This transition tho', 'Reply to @user dance', 'Blew up overnight'],
  instagram: ['Golden hour shoot', 'Outfit of the week', 'Behind the scenes', 'Q&A story highlights', 'New collab drop'],
  facebook:  ['Community update', 'Live session recap', 'Fan milestone post', 'Product launch reel', 'Ask me anything'],
  twitch:    ['Ranked grind session', 'Just chatting #42', 'Sub goal reached!', 'New game first look', 'Charity stream VOD'],
  discord:   ['Server announcement', 'Bot update thread', 'AMA in #general', 'Event recap post', 'New roles & perks'],
  lemon8:    ['Morning routine', 'GRWM skincare', 'Aesthetic café haul', 'Book recommendations', 'Travel journal'],
  reddit:    ['I built a thing [OC]', 'Hot take: unpopular', 'Analysis deep-dive', 'Megathread highlights', 'AMA top answers'],
  redgifs:   ['Weekend highlights', 'Trending clip #1', 'Fan submission picks', 'Monthly best-of', 'New series teaser'],
};

function generateTopContent(platform) {
  const titles = CONTENT_TITLES[platform] || ['Post 1','Post 2','Post 3','Post 4','Post 5'];
  return titles.map((title, i) => {
    const s = seed(platform + title);
    return {
      id: i,
      title,
      views:    Math.round(pseudoRand(s,       2000000) + 10000),
      likes:    Math.round(pseudoRand(s + 1,   100000)  + 1000),
      comments: Math.round(pseudoRand(s + 2,   20000)   + 100),
      shares:   Math.round(pseudoRand(s + 3,   50000)   + 500),
    };
  });
}

function generateMetrics(platform, range) {
  const s = seed(platform + range);
  const prev_s = seed(platform + range + 'prev');
  const base = {
    views:          Math.round(pseudoRand(s,      5000000) + 500000),
    likes:          Math.round(pseudoRand(s + 1,  500000)  + 50000),
    reach:          Math.round(pseudoRand(s + 2,  3000000) + 300000),
    followers:      Math.round(pseudoRand(s + 3,  1000000) + 100000),
    retentionRate:  +(pseudoRand(s + 4,   60) + 30).toFixed(1),
    engagementRate: +(pseudoRand(s + 5,   12) + 2).toFixed(2),
    impressions:    Math.round(pseudoRand(s + 6,  8000000) + 800000),
    watchTime:      Math.round(pseudoRand(s + 7,  500000)  + 50000),
  };
  const prev = {
    views:          Math.round(pseudoRand(prev_s,      5000000) + 500000),
    likes:          Math.round(pseudoRand(prev_s + 1,  500000)  + 50000),
    reach:          Math.round(pseudoRand(prev_s + 2,  3000000) + 300000),
    followers:      Math.round(pseudoRand(prev_s + 3,  1000000) + 100000),
    retentionRate:  +(pseudoRand(prev_s + 4, 60) + 30).toFixed(1),
    engagementRate: +(pseudoRand(prev_s + 5, 12) + 2).toFixed(2),
    impressions:    Math.round(pseudoRand(prev_s + 6,  8000000) + 800000),
    watchTime:      Math.round(pseudoRand(prev_s + 7,  500000)  + 50000),
  };
  return { current: base, previous: prev };
}

function generateOAuthStatus() {
  const statuses = {};
  PLATFORMS.forEach((p, i) => {
    statuses[p.id] = i < 5 ? 'connected' : 'disconnected';
  });
  return statuses;
}

// ---------------------------------------------------------------------------
// API integration hooks
// ---------------------------------------------------------------------------
async function fetchAnalytics(platform, timeRange) {
  try {
    const res = await fetch(`/api/analytics/${platform}?range=${timeRange}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null; // graceful fallback to mock data
  }
}

async function refreshAllPlatforms(timeRange) {
  const results = {};
  await Promise.allSettled(
    PLATFORMS.map(async (p) => {
      const data = await fetchAnalytics(p.id, timeRange);
      results[p.id] = data;
    })
  );
  return results;
}

// ---------------------------------------------------------------------------
// Number formatting helpers
// ---------------------------------------------------------------------------
function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function fmtTime(mins) {
  if (mins >= 60) return (mins / 60).toFixed(1) + 'h';
  return mins + 'm';
}

function pctChange(cur, prev) {
  if (!prev) return 0;
  return +((cur - prev) / prev * 100).toFixed(1);
}

// ---------------------------------------------------------------------------
// Platform SVG Icons
// ---------------------------------------------------------------------------
function PlatformIcon({ platform, size = 20 }) {
  const s = size;
  const icons = {
    tiktok: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#ff0050"/>
        <path d="M17 8.5a4.5 4.5 0 01-4.5-4.5h-2v10.5a2 2 0 11-2-2v-2.1A4.1 4.1 0 1014.5 14.5V10a6.6 6.6 0 002.5.5V8.5z" fill="white"/>
      </svg>
    ),
    instagram: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#e1306c"/>
        <rect x="5" y="5" width="14" height="14" rx="4" stroke="white" strokeWidth="1.5" fill="none"/>
        <circle cx="12" cy="12" r="3.5" stroke="white" strokeWidth="1.5" fill="none"/>
        <circle cx="16.5" cy="7.5" r="1" fill="white"/>
      </svg>
    ),
    facebook: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#1877f2"/>
        <path d="M13.5 8h2V5.5h-2C11.5 5.5 10 7 10 9v1.5H8V13h2v6h2.5v-6H15l.5-2.5H12.5V9c0-.6.4-1 1-1z" fill="white"/>
      </svg>
    ),
    twitch: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#9146ff"/>
        <path d="M6 4l-1.5 4v11.5h4.5V22h2.5l2.5-2.5h3.5l4-4V4H6zm11.5 10l-2.5 2.5H11l-2.5 2.5v-2.5H5.5V5.5h12v8.5z" fill="white"/>
        <rect x="10" y="8" width="1.5" height="4" fill="white"/>
        <rect x="13.5" y="8" width="1.5" height="4" fill="white"/>
      </svg>
    ),
    discord: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#5865f2"/>
        <path d="M18.9 5.8A17 17 0 0014.5 4.5a12.7 12.7 0 00-.6 1.2 15.7 15.7 0 00-4.7 0A12.3 12.3 0 008.6 4.5 17 17 0 004.2 5.8C1.4 10 .6 14.1 1 18.1a17.2 17.2 0 005.2 2.6 12.7 12.7 0 001.1-1.8 11.1 11.1 0 01-1.8-.9l.4-.3a12.2 12.2 0 0010.5 0l.4.3a11.1 11.1 0 01-1.7.9 13 13 0 001.1 1.8 17.1 17.1 0 005.2-2.6c.5-4.6-.7-8.6-3.5-11.3zM8.7 15.4c-1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.8 2.2-1.9 2.2zm6.6 0c-1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.8 2.2-1.9 2.2z" fill="white"/>
      </svg>
    ),
    lemon8: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#ffd700"/>
        <text x="12" y="17" textAnchor="middle" fontSize="14" fill="#333">🍋</text>
      </svg>
    ),
    reddit: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#ff4500"/>
        <circle cx="12" cy="12.5" r="5" fill="white"/>
        <circle cx="9.5" cy="12" r="1" fill="#ff4500"/>
        <circle cx="14.5" cy="12" r="1" fill="#ff4500"/>
        <path d="M9.5 15c1.4.8 3.6.8 5 0" stroke="#ff4500" strokeWidth="1" strokeLinecap="round" fill="none"/>
        <circle cx="18.5" cy="7" r="1.5" fill="white"/>
        <path d="M14 7.5l3.5-1" stroke="white" strokeWidth="1.2"/>
        <circle cx="19" cy="10.5" r="1" fill="white"/>
      </svg>
    ),
    redgifs: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#ff6b00"/>
        <path d="M8 7l9 5-9 5V7z" fill="white"/>
      </svg>
    ),
  };
  return icons[platform] || <svg width={s} height={s} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#888"/></svg>;
}

// ---------------------------------------------------------------------------
// SVG Line Chart
// ---------------------------------------------------------------------------
function LineChart({ data, color, width = 400, height = 120 }) {
  const [hovered, setHovered] = useState(null);
  const svgRef = useRef(null);
  const pad = { top: 10, right: 16, bottom: 28, left: 44 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => ({
    x: pad.left + (i / (data.length - 1)) * w,
    y: pad.top + (1 - (v - min) / range) * h,
    v,
    i,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(pad.top + h).toFixed(1)} L${pts[0].x.toFixed(1)},${(pad.top + h).toFixed(1)} Z`;

  const yTicks = 3;
  const yTickVals = Array.from({ length: yTicks }, (_, i) => min + (range / (yTicks - 1)) * i);

  return (
    <svg
      ref={svgRef}
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: 'visible' }}
      onMouseLeave={() => setHovered(null)}
    >
      <defs>
        <linearGradient id={`lg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      {/* Y gridlines */}
      {yTickVals.map((v, i) => {
        const cy = pad.top + (1 - (v - min) / range) * h;
        return (
          <g key={i}>
            <line x1={pad.left} x2={pad.left + w} y1={cy} y2={cy} stroke="rgba(128,128,128,0.15)" strokeWidth="1"/>
            <text x={pad.left - 6} y={cy + 4} textAnchor="end" fontSize="9" fill="rgba(128,128,128,0.7)">{fmt(v)}</text>
          </g>
        );
      })}
      {/* Area fill */}
      <path d={areaPath} fill={`url(#lg-${color.replace('#','')})`}/>
      {/* Line */}
      <path d={linePath} stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
      {/* Hover targets */}
      {pts.map((p) => (
        <rect
          key={p.i}
          x={p.x - (w / data.length) / 2}
          y={pad.top}
          width={w / data.length}
          height={h}
          fill="transparent"
          onMouseEnter={() => setHovered(p)}
        />
      ))}
      {/* Hover marker */}
      {hovered && (
        <>
          <line x1={hovered.x} x2={hovered.x} y1={pad.top} y2={pad.top + h} stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="3,3"/>
          <circle cx={hovered.x} cy={hovered.y} r="5" fill={color} stroke="white" strokeWidth="2"/>
          <rect
            x={Math.min(hovered.x + 8, pad.left + w - 70)}
            y={Math.max(hovered.y - 22, pad.top)}
            width="62" height="18" rx="4"
            fill="rgba(0,0,0,0.75)"
          />
          <text
            x={Math.min(hovered.x + 39, pad.left + w - 39)}
            y={Math.max(hovered.y - 9, pad.top + 13)}
            textAnchor="middle" fontSize="10" fill="white"
          >{fmt(hovered.v)}</text>
        </>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// SVG Bar Chart
// ---------------------------------------------------------------------------
function BarChart({ data, color, width = 400, height = 100 }) {
  const [hovered, setHovered] = useState(null);
  const pad = { top: 8, right: 8, bottom: 20, left: 40 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const max = Math.max(...data) || 1;
  const barW = Math.max(4, (w / data.length) - 3);
  const gap = (w - barW * data.length) / (data.length + 1);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      {/* Y gridlines */}
      {[0, 0.5, 1].map((f, i) => {
        const cy = pad.top + (1 - f) * h;
        return (
          <g key={i}>
            <line x1={pad.left} x2={pad.left + w} y1={cy} y2={cy} stroke="rgba(128,128,128,0.15)" strokeWidth="1"/>
            <text x={pad.left - 4} y={cy + 4} textAnchor="end" fontSize="9" fill="rgba(128,128,128,0.7)">{fmt(max * f)}</text>
          </g>
        );
      })}
      {data.map((v, i) => {
        const bh = Math.max(2, (v / max) * h);
        const bx = pad.left + gap + i * (barW + gap);
        const by = pad.top + h - bh;
        const isHov = hovered === i;
        return (
          <g key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'default' }}
          >
            <rect x={bx} y={by} width={barW} height={bh} rx="3" fill={isHov ? color : color + 'bb'} />
            {isHov && (
              <>
                <rect x={bx - 4} y={by - 22} width="40" height="16" rx="3" fill="rgba(0,0,0,0.75)"/>
                <text x={bx + barW/2} y={by - 10} textAnchor="middle" fontSize="9" fill="white">{fmt(v)}</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// SVG Donut Chart (platform share)
// ---------------------------------------------------------------------------
function DonutChart({ data, size = 180 }) {
  const [hovered, setHovered] = useState(null);
  const cx = size / 2, cy = size / 2, r = size * 0.38, ir = size * 0.24;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let angle = -Math.PI / 2;
  const slices = data.map((d) => {
    const sweep = (d.value / total) * 2 * Math.PI;
    const start = angle;
    angle += sweep;
    return { ...d, start, sweep, end: angle };
  });

  function arcPath(s, e, outer, inner, expand = false) {
    const eo = expand ? outer + 6 : outer;
    const ei = expand ? inner - 3 : inner;
    const x1 = cx + eo * Math.cos(s), y1 = cy + eo * Math.sin(s);
    const x2 = cx + eo * Math.cos(e), y2 = cy + eo * Math.sin(e);
    const x3 = cx + ei * Math.cos(e), y3 = cy + ei * Math.sin(e);
    const x4 = cx + ei * Math.cos(s), y4 = cy + ei * Math.sin(s);
    const large = (e - s) > Math.PI ? 1 : 0;
    return `M${x1},${y1} A${eo},${eo} 0 ${large},1 ${x2},${y2} L${x3},${y3} A${ei},${ei} 0 ${large},0 ${x4},${y4} Z`;
  }

  const hovSlice = hovered !== null ? slices[hovered] : null;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => (
        <path
          key={i}
          d={arcPath(s.start, s.end, r, ir, hovered === i)}
          fill={s.color}
          opacity={hovered === null || hovered === i ? 1 : 0.55}
          style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
        />
      ))}
      {/* Center label */}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="13" fontWeight="600" fill="rgba(200,200,200,0.9)">
        {hovSlice ? hovSlice.label : 'Total'}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="11" fill="rgba(140,140,140,0.8)">
        {hovSlice
          ? `${((hovSlice.value / total) * 100).toFixed(1)}%`
          : fmt(total)}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Animated metric counter
// ---------------------------------------------------------------------------
function AnimatedNumber({ value, format = fmt, duration = 600 }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const raf = useRef(null);

  useEffect(() => {
    const start = prev.current;
    const end = value;
    if (start === end) return;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min((t - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (end - start) * ease));
      if (p < 1) raf.current = requestAnimationFrame(step);
      else { setDisplay(end); prev.current = end; }
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return <>{format(display)}</>;
}

// ---------------------------------------------------------------------------
// Growth indicator
// ---------------------------------------------------------------------------
function GrowthBadge({ pct }) {
  const up = pct >= 0;
  const color = up ? '#22c55e' : '#ef4444';
  const arrow = up ? '▲' : '▼';
  return (
    <span style={{ fontSize: 11, color, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {arrow} {Math.abs(pct)}%
    </span>
  );
}

// ---------------------------------------------------------------------------
// OAuth status badge
// ---------------------------------------------------------------------------
function OAuthBadge({ status, platform, onConnect }) {
  if (status === 'connected') {
    return (
      <span style={{ fontSize: 11, color: '#22c55e', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="#22c55e"/></svg>
        Connected
      </span>
    );
  }
  return (
    <button
      onClick={() => onConnect && onConnect(platform)}
      style={{
        fontSize: 11, color: '#f59e0b', border: '1px solid #f59e0b33',
        background: '#f59e0b11', borderRadius: 4, padding: '2px 8px',
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
      }}
    >
      <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="#f59e0b"/></svg>
      Connect
    </button>
  );
}

// ---------------------------------------------------------------------------
// Top content card
// ---------------------------------------------------------------------------
function TopContentCard({ item, index, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 0', borderBottom: '1px solid rgba(128,128,128,0.12)',
    }}>
      {/* Rank */}
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        background: index === 0 ? color : 'rgba(128,128,128,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: index === 0 ? 'white' : 'rgba(180,180,180,0.8)',
        flexShrink: 0,
      }}>
        {index + 1}
      </div>
      {/* Thumbnail placeholder */}
      <div style={{
        width: 44, height: 44, borderRadius: 6,
        background: `linear-gradient(135deg, ${color}33, ${color}11)`,
        border: `1px solid ${color}33`,
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill={color + '99'}>
          <rect x="1" y="1" width="14" height="14" rx="2" stroke={color + '66'} strokeWidth="1" fill="none"/>
          <path d="M5 4l7 4-7 4V4z" fill={color + 'aa'}/>
        </svg>
      </div>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(128,128,128,0.8)', marginTop: 2, display: 'flex', gap: 10 }}>
          <span>{fmt(item.views)} views</span>
          <span>{fmt(item.likes)} likes</span>
          <span>{fmt(item.comments)} comments</span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'rgba(128,128,128,0.7)', flexShrink: 0 }}>
        {fmt(item.shares)} shares
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric tile
// ---------------------------------------------------------------------------
function MetricTile({ label, value, prev, format = fmt, theme }) {
  const pct = pctChange(value, prev);
  const surface = theme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)';
  const border  = theme === 'light' ? 'rgba(0,0,0,0.08)'  : 'rgba(255,255,255,0.08)';
  const textPri = theme === 'light' ? '#111' : '#f0f0f0';
  const textSec = theme === 'light' ? '#666' : '#999';
  return (
    <div style={{
      background: surface,
      border: `1px solid ${border}`,
      borderRadius: 10, padding: '14px 16px',
    }}>
      <div style={{ fontSize: 11, color: textSec, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: textPri, lineHeight: 1.1 }}>
        <AnimatedNumber value={value} format={format}/>
      </div>
      <div style={{ marginTop: 4 }}>
        <GrowthBadge pct={pct}/>
        <span style={{ fontSize: 10, color: textSec, marginLeft: 4 }}>vs prev period</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
function AnalyticsDashboard({ theme = 'dark', socket, onConnect, onExport }) {
  const [activePlatform, setActivePlatform] = useState('tiktok');
  const [timeRange, setTimeRange] = useState('7d');
  const [oauthStatus, setOauthStatus] = useState(generateOAuthStatus);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [apiData, setApiData] = useState({});  // per-platform API overrides
  const refreshTimer = useRef(null);

  // Theming tokens
  const T = useMemo(() => ({
    bg:      theme === 'light' ? '#f5f6fa' : '#0d0d12',
    surface: theme === 'light' ? '#ffffff'           : '#161620',
    surface2:theme === 'light' ? '#f0f1f5'           : '#1c1c28',
    border:  theme === 'light' ? 'rgba(0,0,0,0.1)'  : 'rgba(255,255,255,0.08)',
    text:    theme === 'light' ? '#111'              : '#f0f0f0',
    textSec: theme === 'light' ? '#666'              : '#999',
    tabAct:  theme === 'light' ? '#fff'              : '#22222f',
  }), [theme]);

  const platform = PLATFORMS.find(p => p.id === activePlatform);
  const color = platform.color;

  // Derived data — use API data if available, else mock
  const metrics = useMemo(() => {
    const api = apiData[activePlatform];
    if (api?.metrics) return api.metrics;
    return generateMetrics(activePlatform, timeRange);
  }, [activePlatform, timeRange, apiData]);

  const trendData = useMemo(() => {
    const api = apiData[activePlatform];
    if (api?.trend) return api.trend;
    return generateTrendPoints(activePlatform, timeRange);
  }, [activePlatform, timeRange, apiData]);

  const barData = useMemo(() => {
    const api = apiData[activePlatform];
    if (api?.bar) return api.bar;
    return generateBarData(activePlatform, timeRange);
  }, [activePlatform, timeRange, apiData]);

  const topContent = useMemo(() => generateTopContent(activePlatform), [activePlatform]);

  const donutData = useMemo(() =>
    PLATFORMS.map(p => ({
      label: p.label,
      color: p.color,
      value: generateMetrics(p.id, timeRange).current.views,
    })),
    [timeRange]
  );

  // Fetch from API on mount and timeRange change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await refreshAllPlatforms(timeRange);
      if (!cancelled) {
        setApiData(prev => {
          const next = { ...prev };
          Object.entries(results).forEach(([k, v]) => { if (v) next[k] = v; });
          return next;
        });
        setLastUpdated(new Date());
      }
    })();
    return () => { cancelled = true; };
  }, [timeRange]);

  // Socket.IO real-time updates
  useEffect(() => {
    if (!socket) return;
    const handler = (update) => {
      if (update?.platform) {
        setApiData(prev => ({ ...prev, [update.platform]: update.data }));
        setLastUpdated(new Date());
        if (update.oauthStatus) {
          setOauthStatus(prev => ({ ...prev, [update.platform]: update.oauthStatus }));
        }
      }
    };
    socket.on('analytics:update', handler);
    return () => socket.off('analytics:update', handler);
  }, [socket]);

  // Auto-refresh polling
  useEffect(() => {
    if (!autoRefresh) { clearInterval(refreshTimer.current); return; }
    refreshTimer.current = setInterval(async () => {
      const results = await refreshAllPlatforms(timeRange);
      setApiData(prev => {
        const next = { ...prev };
        Object.entries(results).forEach(([k, v]) => { if (v) next[k] = v; });
        return next;
      });
      setLastUpdated(new Date());
    }, 30000);
    return () => clearInterval(refreshTimer.current);
  }, [autoRefresh, timeRange]);

  // Export handler
  const handleExport = useCallback(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      platform: activePlatform,
      timeRange,
      metrics,
      trendData,
      barData,
      topContent,
      oauthStatus,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `nexus-analytics-${activePlatform}-${timeRange}.json`;
    a.click(); URL.revokeObjectURL(url);
    onExport && onExport(data);
  }, [activePlatform, timeRange, metrics, trendData, barData, topContent, oauthStatus, onExport]);

  const { current: cur, previous: prev } = metrics;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div style={{
      background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif",
      minHeight: '100vh', padding: '0 0 40px',
    }}>
      {/* ---- Header ---- */}
      <div style={{
        background: T.surface, borderBottom: `1px solid ${T.border}`,
        padding: '14px 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${color}, ${color}88)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <polyline points="1,13 5,7 9,10 13,4 17,8" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Nexus Analytics</div>
            <div style={{ fontSize: 11, color: T.textSec }}>
              Social Intelligence Platform &nbsp;·&nbsp; Updated {lastUpdated.toLocaleTimeString()}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Auto-refresh toggle */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: T.textSec, cursor: 'pointer',
          }}>
            <div
              onClick={() => setAutoRefresh(a => !a)}
              style={{
                width: 36, height: 20, borderRadius: 10,
                background: autoRefresh ? '#22c55e' : 'rgba(128,128,128,0.3)',
                position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
              }}
            >
              <div style={{
                position: 'absolute', top: 2, left: autoRefresh ? 18 : 2,
                width: 16, height: 16, borderRadius: '50%', background: 'white',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}/>
            </div>
            Auto-refresh (30s)
          </label>
          {/* Export button */}
          <button
            onClick={handleExport}
            style={{
              fontSize: 12, padding: '6px 14px', borderRadius: 7,
              background: `${color}22`, border: `1px solid ${color}44`,
              color: color, cursor: 'pointer', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1v8M3.5 6l3 3 3-3M1 10v2h11v-2" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export JSON
          </button>
        </div>
      </div>

      {/* ---- Platform tab bar ---- */}
      <div style={{
        background: T.surface, borderBottom: `1px solid ${T.border}`,
        padding: '0 24px', display: 'flex', gap: 2, overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {PLATFORMS.map(p => {
          const active = activePlatform === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setActivePlatform(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 14px', border: 'none', borderRadius: 0,
                background: 'transparent', cursor: 'pointer', fontWeight: 500,
                fontSize: 13, color: active ? p.color : T.textSec,
                borderBottom: `2px solid ${active ? p.color : 'transparent'}`,
                transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              <PlatformIcon platform={p.id} size={16}/>
              {p.label}
              <span style={{
                fontSize: 10, padding: '1px 5px', borderRadius: 8,
                background: oauthStatus[p.id] === 'connected' ? '#22c55e22' : '#f59e0b22',
                color: oauthStatus[p.id] === 'connected' ? '#22c55e' : '#f59e0b',
              }}>
                {oauthStatus[p.id] === 'connected' ? '●' : '○'}
              </span>
            </button>
          );
        })}
      </div>

      {/* ---- Content area ---- */}
      <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Platform header row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 18, flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PlatformIcon platform={activePlatform} size={28}/>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{platform.label}</div>
              <OAuthBadge
                status={oauthStatus[activePlatform]}
                platform={activePlatform}
                onConnect={onConnect}
              />
            </div>
          </div>
          {/* Time range selector */}
          <div style={{
            display: 'flex', gap: 3,
            background: T.surface2, borderRadius: 8, padding: 3,
            border: `1px solid ${T.border}`,
          }}>
            {TIME_RANGES.map(r => (
              <button
                key={r.id}
                onClick={() => setTimeRange(r.id)}
                style={{
                  padding: '5px 12px', borderRadius: 6, border: 'none',
                  background: timeRange === r.id ? color : 'transparent',
                  color: timeRange === r.id ? 'white' : T.textSec,
                  fontWeight: timeRange === r.id ? 600 : 400,
                  fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* ---- Metric tiles grid ---- */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12, marginBottom: 20,
        }}>
          <MetricTile label="Views"          value={cur.views}          prev={prev.views}          theme={theme}/>
          <MetricTile label="Likes"          value={cur.likes}          prev={prev.likes}          theme={theme}/>
          <MetricTile label="Reach"          value={cur.reach}          prev={prev.reach}          theme={theme}/>
          <MetricTile label="Followers"      value={cur.followers}      prev={prev.followers}      theme={theme}/>
          <MetricTile label="Impressions"    value={cur.impressions}    prev={prev.impressions}    theme={theme}/>
          <MetricTile label="Engagement %"   value={cur.engagementRate} prev={prev.engagementRate}
            format={v => v.toFixed ? v.toFixed(2) + '%' : v + '%'} theme={theme}/>
          <MetricTile label="Retention %"    value={cur.retentionRate}  prev={prev.retentionRate}
            format={v => (typeof v === 'number' ? v.toFixed(1) : v) + '%'} theme={theme}/>
          {platform.hasVideo && (
            <MetricTile label="Watch Time"   value={cur.watchTime}      prev={prev.watchTime}
              format={fmtTime} theme={theme}/>
          )}
        </div>

        {/* ---- Charts row ---- */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16, marginBottom: 20,
        }}>
          {/* Trend line chart */}
          <div style={{
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 12, padding: '16px 18px',
            gridColumn: 'span 2',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              Views Trend — {TIME_RANGES.find(r => r.id === timeRange)?.label}
            </div>
            <LineChart data={trendData} color={color} width={700} height={130}/>
          </div>

          {/* Bar chart */}
          <div style={{
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 12, padding: '16px 18px',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              Daily Breakdown
            </div>
            <BarChart data={barData} color={color} width={380} height={110}/>
          </div>
        </div>

        {/* ---- Bottom row: Top content + Platform share ---- */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {/* Top content */}
          <div style={{
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 12, padding: '16px 18px',
            gridColumn: 'span 2',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              Top Content
            </div>
            <div style={{ fontSize: 11, color: T.textSec, marginBottom: 12 }}>
              Best performing posts for {platform.label}
            </div>
            {topContent.map((item, i) => (
              <TopContentCard key={item.id} item={item} index={i} color={color}/>
            ))}
          </div>

          {/* Donut + legend */}
          <div style={{
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 12, padding: '16px 18px',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              Platform Share
            </div>
            <div style={{ fontSize: 11, color: T.textSec, marginBottom: 12 }}>
              Views distribution across platforms
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <DonutChart data={donutData} size={160}/>
              <div style={{ flex: 1, minWidth: 100 }}>
                {donutData.map((d) => {
                  const total = donutData.reduce((s, x) => s + x.value, 0);
                  const pct = ((d.value / total) * 100).toFixed(1);
                  return (
                    <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }}/>
                      <div style={{ fontSize: 11, flex: 1, color: T.textSec }}>{d.label}</div>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Responsive style tag ---- */}
      <style>{`
        @media (max-width: 900px) {
          /* 2-col metric grid handled by auto-fit minmax */
        }
        @media (max-width: 520px) {
          /* 1-col: minmax(160px) wraps naturally */
        }
        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.3); border-radius: 2px; }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
export { AnalyticsDashboard };
export default AnalyticsDashboard;
