/*
 * Copyright © 2025-2026 Cameron Fox
 * Licensed under the Apache 2.0 License
 * File: src/dashboards/AnalyticsDashboard.jsx
 * Last updated: 2026-05-09
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  Component,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Music2,
  Instagram,
  Facebook,
  Tv2,
  MessageSquare,
  Leaf,
  Globe,
  Film,
  RefreshCw,
  Users,
  Eye,
  Heart,
  Radio,
  TrendingUp,
  FileText,
  AlertTriangle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORMS = [
  { key: 'tiktok',    label: 'TikTok',     Icon: Music2        },
  { key: 'instagram', label: 'Instagram',  Icon: Instagram     },
  { key: 'facebook',  label: 'Facebook',   Icon: Facebook      },
  { key: 'twitch',    label: 'Twitch',     Icon: Tv2           },
  { key: 'discord',   label: 'Discord',    Icon: MessageSquare },
  { key: 'lemon8',    label: 'Lemon8',     Icon: Leaf          },
  { key: 'reddit',    label: 'Reddit',     Icon: Globe         },
  { key: 'redgifs',   label: 'RedGifs',    Icon: Film          },
];

const METRIC_KEYS = [
  { key: 'followers',      label: 'Followers',       Icon: Users,      fmt: 'number' },
  { key: 'views',          label: 'Views',            Icon: Eye,        fmt: 'number' },
  { key: 'likes',          label: 'Likes',            Icon: Heart,      fmt: 'number' },
  { key: 'reach',          label: 'Reach',            Icon: Radio,      fmt: 'number' },
  { key: 'retention',      label: 'Retention',        Icon: TrendingUp, fmt: 'pct'    },
  { key: 'engagementRate', label: 'Eng. Rate',        Icon: TrendingUp, fmt: 'pct'    },
  { key: 'posts',          label: 'Posts',            Icon: FileText,   fmt: 'number' },
];

const POLL_INTERVAL_MS = 30_000;
const TOKEN_KEY = 'nexus_token';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(value, type) {
  if (value == null) return '—';
  if (type === 'pct') return `${Number(value).toFixed(1)}%`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function getToken(user) {
  return user?.token || localStorage.getItem(TOKEN_KEY) || '';
}

function authHeaders(user) {
  const token = getToken(user);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// Error Boundary
// ---------------------------------------------------------------------------

class AnalyticsErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(err) {
    return { hasError: true, message: err?.message || 'Unknown error' };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-10 text-red-400">
          <AlertTriangle className="w-10 h-10 mb-3" />
          <p className="text-lg font-semibold">Something went wrong</p>
          <p className="text-sm mt-1 text-gray-400">{this.state.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-gray-700 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Bar (mini bar chart cell)
// ---------------------------------------------------------------------------

function Bar({ value, max, colorClass = 'bg-teal-500' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
      <div
        className={`${colorClass} h-1.5 rounded-full transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aggregate totals banner
// ---------------------------------------------------------------------------

function AggregateBanner({ data, loading }) {
  const { t } = useTranslation();

  const totals = METRIC_KEYS.reduce((acc, { key, fmt: f }) => {
    if (f === 'number') {
      acc[key] = PLATFORMS.reduce(
        (s, p) => s + (data?.[p.key]?.[key] || 0),
        0
      );
    }
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        { key: 'followers', label: t('Followers') },
        { key: 'views',     label: t('Views')     },
        { key: 'likes',     label: t('Likes')     },
        { key: 'reach',     label: t('Reach')     },
      ].map(({ key, label }) => (
        <div
          key={key}
          className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-1"
        >
          <span className="text-xs text-gray-400 uppercase tracking-wider">
            {label}
          </span>
          {loading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <span className="text-2xl font-bold text-teal-400">
              {fmt(totals[key], 'number')}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Platform card
// ---------------------------------------------------------------------------

function PlatformCard({ platform, metrics, loading, maxValues }) {
  const { t } = useTranslation();
  const { label, Icon } = platform;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-teal-400 shrink-0" />
        <span className="font-semibold text-white text-sm">{label}</span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {METRIC_KEYS.map(({ key, label: mLabel, fmt: fType }) => {
          const val = metrics?.[key];
          return (
            <div key={key} className="flex flex-col">
              <span className="text-xs text-gray-400">{t(mLabel)}</span>
              {loading ? (
                <Skeleton className="h-4 w-16 mt-1" />
              ) : (
                <>
                  <span className="text-sm font-medium text-white">
                    {fmt(val, fType)}
                  </span>
                  {fType === 'number' && (
                    <Bar
                      value={val || 0}
                      max={maxValues[key] || 1}
                      colorClass="bg-teal-500"
                    />
                  )}
                  {fType === 'pct' && (
                    <Bar
                      value={val || 0}
                      max={100}
                      colorClass="bg-emerald-500"
                    />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

function AnalyticsDashboardInner({ user }) {
  const { t } = useTranslation();

  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const pollRef = useRef(null);

  // ---- fetch initial / polled data ----------------------------------------

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/dashboard', {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(user),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json?.data ?? json);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ---- manual refresh via POST --------------------------------------------

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/analytics/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(user),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json?.data ?? json);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  // ---- polling setup ------------------------------------------------------

  useEffect(() => {
    fetchDashboard();
    pollRef.current = setInterval(fetchDashboard, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchDashboard]);

  // ---- compute per-metric maximums for bar scaling ------------------------

  const maxValues = METRIC_KEYS.reduce((acc, { key, fmt: f }) => {
    if (f === 'number') {
      acc[key] = Math.max(
        1,
        ...PLATFORMS.map(p => data?.[p.key]?.[key] || 0)
      );
    } else {
      acc[key] = 100;
    }
    return acc;
  }, {});

  // ---- render -------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-6 sm:px-8">
      {/* Title row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-teal-400">
            {t('Analytics Dashboard')}
          </h1>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-0.5">
              {t('Last updated')}: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50
                     text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          aria-label={t('Refresh analytics')}
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
          />
          {t('Refresh')}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 bg-red-900/40 border border-red-700
                        text-red-300 text-sm rounded-lg px-4 py-3 mb-6">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{t('Error')}: {error}</span>
        </div>
      )}

      {/* Aggregate totals */}
      <AggregateBanner data={data} loading={loading} />

      {/* Platform grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {PLATFORMS.map(platform => (
          <PlatformCard
            key={platform.key}
            platform={platform}
            metrics={data?.[platform.key]}
            loading={loading}
            maxValues={maxValues}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export with error boundary wrapper
// ---------------------------------------------------------------------------

export default function AnalyticsDashboard(props) {
  return (
    <AnalyticsErrorBoundary>
      <AnalyticsDashboardInner {...props} />
    </AnalyticsErrorBoundary>
  );
}
