/**
 * src/components/GameDevHub.jsx
 * Nexus AI Pro — Game Development Hub & Achievement Tracker
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * Real-time tracking: player counts, revenue, ratings, sessions, downloads.
 * Publisher connectors: Unreal/Epic, Sony (PSN), Xbox, Ubisoft Connect.
 * Achievement & game progress tracking with leaderboards.
 */

import React, { useState, useEffect, useCallback } from 'react';
import AuthService from '../auth/AuthService.js';
import { formatNumber, formatCurrency } from '../i18n/index.js';

// ─── Engine / Platform registry ───────────────────────────────────────────────

const ENGINES = {
  unreal: { name: 'Unreal Engine 5', icon: '⚡', color: '#0078F2', lang: 'C++ / Blueprints' },
  unity:  { name: 'Unity 6',         icon: '🎮', color: '#ffffff', lang: 'C#' },
  godot:  { name: 'Godot 4',         icon: '🟢', color: '#478cbf', lang: 'GDScript / C#' },
  custom: { name: 'Custom Engine',   icon: '🔧', color: '#f59e0b', lang: 'C++' },
};

const PUBLISHERS = {
  epic: {
    id: 'epic', name: 'Epic Games Store', icon: '⚡',
    color: '#0078F2', bg: 'rgba(0,120,242,0.1)',
  },
  sony: {
    id: 'sony', name: 'PlayStation Network', icon: '🎮',
    color: '#00BFFF', bg: 'rgba(0,191,255,0.1)',
  },
  xbox: {
    id: 'xbox', name: 'Xbox / Game Pass', icon: '🟩',
    color: '#52b043', bg: 'rgba(82,176,67,0.1)',
  },
  ubisoft: {
    id: 'ubisoft', name: 'Ubisoft Connect', icon: '🦅',
    color: '#007be6', bg: 'rgba(0,123,230,0.1)',
  },
  steam: {
    id: 'steam', name: 'Steam', icon: '🌊',
    color: '#1b2838', bg: 'rgba(27,40,56,0.3)',
  },
};

// ─── API helpers ──────────────────────────────────────────────────────────────

function getHeaders() {
  const token = AuthService.getToken();
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function apiGet(path) {
  const res = await fetch(path, { headers: getHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ icon, label, value, sub, color = '#a855f7' }) {
  return (
    <div style={{
      background: '#12121f', border: '1px solid #2d2d44', borderRadius: 12, padding: '16px',
    }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color, marginTop: 4 }}>
        {typeof value === 'number' ? formatNumber(value) : value}
      </div>
      {sub && <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function AchievementBadge({ achievement }) {
  const pct = Math.min(100, Math.round((achievement.progress / achievement.total) * 100));
  const unlocked = pct >= 100;

  return (
    <div style={{
      background: unlocked ? 'rgba(251,191,36,0.1)' : '#12121f',
      border: `1px solid ${unlocked ? '#fbbf24' : '#2d2d44'}`,
      borderRadius: 12, padding: '14px', display: 'flex', gap: 12, alignItems: 'center',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: unlocked ? '#fbbf24' : '#2d2d44',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, filter: unlocked ? 'none' : 'grayscale(1)',
      }}>
        {achievement.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: unlocked ? '#fbbf24' : '#e2e8f0', fontWeight: 700, fontSize: 14 }}>
          {achievement.name}
        </div>
        <div style={{ color: '#555', fontSize: 12, marginBottom: 6 }}>{achievement.description}</div>
        <div style={{ height: 4, background: '#2d2d44', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: unlocked ? '#fbbf24' : '#a855f7', borderRadius: 2,
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>
          {achievement.progress} / {achievement.total}
          {unlocked && ' · ✅ Unlocked'}
        </div>
      </div>
    </div>
  );
}

function GameCard({ game, onSelect }) {
  const engine = ENGINES[game.engine] ?? ENGINES.custom;

  return (
    <div
      onClick={() => onSelect(game)}
      style={{
        background: '#12121f', border: '1px solid #2d2d44', borderRadius: 14,
        overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#a855f7'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#2d2d44'}
    >
      {/* Cover art placeholder */}
      <div style={{
        height: 100, background: `linear-gradient(135deg, ${engine.color}40, #12121f)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
      }}>
        {engine.icon}
      </div>
      <div style={{ padding: '16px' }}>
        <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 16, marginBottom: 4 }}>{game.title}</div>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>
          {engine.name} · {engine.lang}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ fontSize: 11 }}>
            <div style={{ color: '#555' }}>Players</div>
            <div style={{ color: '#e2e8f0', fontWeight: 700 }}>{formatNumber(game.activePlayers ?? 0)}</div>
          </div>
          <div style={{ fontSize: 11 }}>
            <div style={{ color: '#555' }}>Rating</div>
            <div style={{ color: '#fbbf24', fontWeight: 700 }}>⭐ {(game.rating ?? 0).toFixed(1)}</div>
          </div>
          <div style={{ fontSize: 11 }}>
            <div style={{ color: '#555' }}>Downloads</div>
            <div style={{ color: '#e2e8f0', fontWeight: 700 }}>{formatNumber(game.downloads ?? 0)}</div>
          </div>
          <div style={{ fontSize: 11 }}>
            <div style={{ color: '#555' }}>Revenue</div>
            <div style={{ color: '#10b981', fontWeight: 700 }}>{formatCurrency(game.revenue ?? 0, 'USD')}</div>
          </div>
        </div>
        {/* Publisher badges */}
        <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
          {(game.publishers ?? []).map(pid => {
            const p = PUBLISHERS[pid];
            if (!p) return null;
            return (
              <span key={pid} style={{
                padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600,
                background: p.bg, color: p.color,
              }}>
                {p.icon} {p.name}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GameDetail({ game, onBack }) {
  const engine = ENGINES[game.engine] ?? ENGINES.custom;
  const achievements = game.achievements ?? [];
  const unlocked = achievements.filter(a => a.progress >= a.total).length;

  return (
    <div>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer',
        fontSize: 14, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        ← Back to Games
      </button>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${engine.color}30, #12121f)`,
        border: '1px solid #2d2d44', borderRadius: 16, padding: '24px', marginBottom: 20,
      }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#e2e8f0' }}>{game.title}</h2>
        <div style={{ color: '#555', fontSize: 13, marginBottom: 20 }}>{engine.name} · {engine.lang}</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
          <MetricCard icon="👾" label="Active Players" value={game.activePlayers} color="#a855f7" />
          <MetricCard icon="⬇️" label="Downloads"     value={game.downloads}     color="#3b82f6" />
          <MetricCard icon="💰" label="Revenue"        value={formatCurrency(game.revenue ?? 0, 'USD')} color="#10b981" />
          <MetricCard icon="⭐" label="Rating"         value={(game.rating ?? 0).toFixed(1) + '/5'} color="#fbbf24" />
          <MetricCard icon="⏱" label="Avg Session"    value={`${game.avgSessionMin ?? 0}m`} color="#06b6d4" />
          <MetricCard icon="🔄" label="Retention"      value={`${game.retentionD7 ?? 0}%`} sub="D7" color="#f59e0b" />
        </div>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div style={{ background: '#12121f', border: '1px solid #2d2d44', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>
              🏆 Achievements ({unlocked}/{achievements.length})
            </h3>
            <span style={{ fontSize: 13, color: '#fbbf24' }}>
              {Math.round((unlocked / achievements.length) * 100)}% Complete
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {achievements.map(a => <AchievementBadge key={a.id} achievement={a} />)}
          </div>
        </div>
      )}

      {/* Publisher status */}
      {(game.publishers ?? []).length > 0 && (
        <div style={{ background: '#12121f', border: '1px solid #2d2d44', borderRadius: 14, padding: '20px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Publisher Connect</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {game.publishers.map(pid => {
              const p = PUBLISHERS[pid];
              if (!p) return null;
              return (
                <div key={pid} style={{
                  padding: '12px 16px', background: p.bg, border: `1px solid ${p.color}40`,
                  borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 20 }}>{p.icon}</span>
                  <div>
                    <div style={{ color: p.color, fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                    <div style={{ color: '#555', fontSize: 11 }}>Connected · Syncing</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GameDevHub() {
  const [games, setGames]           = useState([]);
  const [selectedGame, setSelected] = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    apiGet('/api/games')
      .then(d => setGames(d.games ?? []))
      .catch(err => console.error('Load games failed:', err.message))
      .finally(() => setLoading(false));
  }, []);

  const totalPlayers  = games.reduce((s, g) => s + (g.activePlayers ?? 0), 0);
  const totalRevenue  = games.reduce((s, g) => s + (g.revenue ?? 0), 0);
  const totalDownloads = games.reduce((s, g) => s + (g.downloads ?? 0), 0);

  if (selectedGame) {
    return (
      <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <GameDetail game={selectedGame} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700, background: 'linear-gradient(135deg, #a855f7, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Game Development Hub
      </h1>
      <p style={{ margin: '0 0 24px', color: '#555', fontSize: 13 }}>
        Track games across Epic, PlayStation, Xbox, Ubisoft — real-time player metrics &amp; achievements
      </p>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        <MetricCard icon="👾" label="Total Active Players" value={totalPlayers}   color="#a855f7" />
        <MetricCard icon="💰" label="Total Revenue"        value={formatCurrency(totalRevenue, 'USD')} color="#10b981" />
        <MetricCard icon="⬇️" label="Total Downloads"     value={totalDownloads}  color="#3b82f6" />
      </div>

      {/* Publisher status row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        {Object.values(PUBLISHERS).map(p => (
          <div key={p.id} style={{
            padding: '8px 14px', background: p.bg, border: `1px solid ${p.color}40`,
            borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
          }}>
            <span>{p.icon}</span>
            <span style={{ color: p.color, fontWeight: 600 }}>{p.name}</span>
          </div>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#555' }}>Loading games…</div>
      )}

      {!loading && games.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 60, border: '2px dashed #2d2d44', borderRadius: 16, color: '#555',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎮</div>
          <div>No games tracked yet — connect a publisher to get started</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {games.map(g => <GameCard key={g.id} game={g} onSelect={setSelected} />)}
      </div>
    </div>
  );
}
