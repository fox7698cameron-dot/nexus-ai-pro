// ================================================
// NEXUS AI PRO - Game Studio Connectors
// Unreal/Epic | Sony PSN | Xbox | Ubisoft | Steam
// Achievement & Game Progress Tracking
// 2026-08-10 | Version 2.1.0
// ================================================

import React, { useState, useEffect, useCallback } from 'react';

// ── Provider config ──────────────────────────────
const PROVIDERS = [
  { id: 'epic',     label: 'Epic Games / Unreal', icon: '⚡', color: '#0078f2', description: 'Unreal Engine, Fortnite ecosystem, EGS' },
  { id: 'steam',    label: 'Steam / Valve',       icon: '🎮', color: '#1b2838', description: 'Steamworks, achievements, cloud saves', border: '#2a475e' },
  { id: 'psn',      label: 'PlayStation Network', icon: '🎮', color: '#003791', description: 'PS4 / PS5, trophies, online features' },
  { id: 'xbox',     label: 'Xbox / Microsoft',    icon: '🟩', color: '#107c10', description: 'Xbox Live, Game Pass, achievements' },
  { id: 'ubisoft',  label: 'Ubisoft Connect',     icon: '🔷', color: '#003b96', description: 'Uplay, Ubisoft+ subscription' }
];

// ── Achievement badge ─────────────────────────────
function AchievementBadge({ achievement }) {
  const rarityColors = { common: '#9ca3af', uncommon: '#4ade80', rare: '#60a5fa', epic: '#c084fc', legendary: '#fbbf24' };
  const rarity = achievement.rarity || 'common';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
      background: 'rgba(255,255,255,0.04)', border: `1px solid ${rarityColors[rarity]}30`,
      borderRadius: 8, marginBottom: 6
    }}>
      <span style={{ fontSize: 22 }}>{achievement.icon || '🏆'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{achievement.name}</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>{achievement.description || achievement.game}</div>
      </div>
      <div>
        <span style={{ fontSize: 11, color: rarityColors[rarity], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{rarity}</span>
        {achievement.points && <div style={{ fontSize: 10, color: '#475569', textAlign: 'right' }}>+{achievement.points} pts</div>}
      </div>
      <div style={{ fontSize: 11, color: '#374151' }}>
        {achievement.unlockedAt ? new Date(achievement.unlockedAt).toLocaleDateString() : ''}
      </div>
    </div>
  );
}

// ── Game progress card ────────────────────────────
function GameProgressCard({ game }) {
  const pct = Math.min(100, game.completion || 0);
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 16px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{game.icon || '🕹'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600 }}>{game.game}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{game.platform || ''} {game.playtime ? `· ${game.playtime}h played` : ''}</div>
        </div>
        <span style={{ fontSize: 14, color: '#a78bfa', fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 4, height: 5 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#4ade80' : '#a78bfa', borderRadius: 4, transition: 'width .4s' }} />
      </div>
      {game.trophies && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {['platinum','gold','silver','bronze'].map(t => game.trophies[t] != null && (
            <span key={t} style={{ fontSize: 11, color: { platinum: '#e5e7eb', gold: '#fbbf24', silver: '#9ca3af', bronze: '#b45309' }[t] }}>
              {t === 'platinum' ? '🏆' : t === 'gold' ? '🥇' : t === 'silver' ? '🥈' : '🥉'} {game.trophies[t]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Provider connection card ──────────────────────
function ProviderCard({ provider, profile, onConnect, onAddAchievement, onAddProgress }) {
  const [expanded, setExpanded] = useState(false);
  const [achieveForm, setAchieveForm] = useState({ show: false, name: '', description: '', icon: '🏆', points: '', rarity: 'common', game: '' });
  const [progressForm, setProgressForm] = useState({ show: false, game: '', completion: 0, playtime: '' });

  const isConnected = !!profile;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${provider.border || provider.color}30`,
      borderLeft: `3px solid ${provider.color}`,
      borderRadius: 14, padding: '18px 20px', marginBottom: 14
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: isConnected ? 12 : 0 }}>
        <span style={{ fontSize: 24 }}>{provider.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>{provider.label}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{provider.description}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isConnected ? (
            <>
              <span style={{ fontSize: 11, color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '3px 10px', borderRadius: 12, fontWeight: 600 }}>● Connected</span>
              <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14 }}>{expanded ? '▲' : '▼'}</button>
            </>
          ) : (
            <button
              onClick={() => onConnect(provider.id)}
              style={{ background: provider.color, border: 'none', borderRadius: 8, color: '#fff', padding: '7px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >Connect</button>
          )}
        </div>
      </div>

      {/* Connected detail */}
      {isConnected && expanded && (
        <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Achievements', value: profile.achievements?.length ?? 0, color: '#fbbf24' },
              { label: 'Games Tracked', value: profile.gameProgress?.length ?? 0, color: '#60a5fa' }
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Achievements */}
          {profile.achievements?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Recent Achievements</div>
              {profile.achievements.slice(-5).reverse().map(a => (
                <AchievementBadge key={a.id} achievement={a} />
              ))}
            </div>
          )}

          {/* Game progress */}
          {profile.gameProgress?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Game Progress</div>
              {profile.gameProgress.map((g, i) => (
                <GameProgressCard key={i} game={g} />
              ))}
            </div>
          )}

          {/* Add achievement */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button
              onClick={() => setAchieveForm(f => ({ ...f, show: !f.show }))}
              style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8, color: '#fbbf24', padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}
            >+ Achievement</button>
            <button
              onClick={() => setProgressForm(f => ({ ...f, show: !f.show }))}
              style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 8, color: '#60a5fa', padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}
            >+ Game Progress</button>
          </div>

          {achieveForm.show && (
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12, fontWeight: 600 }}>🏆 Log Achievement</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {[
                  { key: 'name', placeholder: 'Achievement name' },
                  { key: 'game', placeholder: 'Game title' },
                  { key: 'description', placeholder: 'Description' },
                  { key: 'points', placeholder: 'XP/Points', type: 'number' }
                ].map(({ key, placeholder, type }) => (
                  <input key={key} type={type || 'text'} placeholder={placeholder} value={achieveForm[key]}
                    onChange={e => setAchieveForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ flex: '1 1 180px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '7px 11px', color: '#fff', fontSize: 13 }} />
                ))}
                <select value={achieveForm.rarity} onChange={e => setAchieveForm(f => ({ ...f, rarity: e.target.value }))}
                  style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '7px 11px', color: '#aaa', fontSize: 13 }}>
                  {['common','uncommon','rare','epic','legendary'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <button
                onClick={() => {
                  if (!achieveForm.name.trim()) return;
                  onAddAchievement(provider.id, { name: achieveForm.name, description: achieveForm.description, game: achieveForm.game, points: Number(achieveForm.points), rarity: achieveForm.rarity, icon: '🏆' });
                  setAchieveForm({ show: false, name: '', description: '', icon: '🏆', points: '', rarity: 'common', game: '' });
                }}
                style={{ background: '#fbbf24', border: 'none', borderRadius: 7, color: '#000', padding: '7px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
              >Log Achievement</button>
            </div>
          )}

          {progressForm.show && (
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12, fontWeight: 600 }}>🕹 Update Game Progress</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                <input placeholder="Game title" value={progressForm.game} onChange={e => setProgressForm(f => ({ ...f, game: e.target.value }))}
                  style={{ flex: '1 1 180px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '7px 11px', color: '#fff', fontSize: 13 }} />
                <input placeholder="Hours played" type="number" value={progressForm.playtime} onChange={e => setProgressForm(f => ({ ...f, playtime: e.target.value }))}
                  style={{ width: 110, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '7px 11px', color: '#fff', fontSize: 13 }} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Completion: {progressForm.completion}%</div>
                <input type="range" min={0} max={100} value={progressForm.completion}
                  onChange={e => setProgressForm(f => ({ ...f, completion: Number(e.target.value) }))}
                  style={{ width: '100%', accentColor: '#60a5fa' }} />
              </div>
              <button
                onClick={() => {
                  if (!progressForm.game.trim()) return;
                  onAddProgress(provider.id, progressForm.game, { completion: progressForm.completion, playtime: Number(progressForm.playtime) });
                  setProgressForm({ show: false, game: '', completion: 0, playtime: '' });
                }}
                style={{ background: '#60a5fa', border: 'none', borderRadius: 7, color: '#000', padding: '7px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
              >Save Progress</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main GameConnectors ──────────────────────────
export default function GameConnectors({ userId = 'guest', authToken }) {
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState('');

  const headers = { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) };

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/game/profile/${userId}`, { headers });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const list = await res.json();
      const map = {};
      list.forEach(p => { map[p.provider] = p; });
      setProfiles(map);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [userId, authToken]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const connectProvider = async (providerId) => {
    setConnecting(providerId);
    // In production: open OAuth popup or redirect to provider auth
    // For demo: create a stub connection
    try {
      const res = await fetch('/api/game/connect', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, provider: providerId, accessToken: `demo_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}` })
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      await fetchProfiles();
    } catch (e) { setError(e.message); }
    finally { setConnecting(''); }
  };

  const addAchievement = async (providerId, achievement) => {
    try {
      const res = await fetch('/api/game/achievement', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, provider: providerId, achievement })
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      await fetchProfiles();
    } catch (e) { setError(e.message); }
  };

  const addProgress = async (providerId, game, progress) => {
    try {
      const res = await fetch('/api/game/progress', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, provider: providerId, game, progress })
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      await fetchProfiles();
    } catch (e) { setError(e.message); }
  };

  const totalAchievements = Object.values(profiles).reduce((s, p) => s + (p.achievements?.length || 0), 0);
  const totalGames = Object.values(profiles).reduce((s, p) => s + (p.gameProgress?.length || 0), 0);
  const connected = Object.values(profiles).length;

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui,-apple-system,sans-serif', padding: '24px' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, background: 'linear-gradient(135deg,#4ade80,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        🎮 Game Studio Connectors
      </h2>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
        Connect your gaming accounts to track achievements, progress, and development activity.
      </p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#fca5a5', fontSize: 13 }}>
          ⚠ {error} <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', float: 'right' }}>✕</button>
        </div>
      )}

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Connected', value: connected, color: '#4ade80' },
          { label: 'Achievements', value: totalAchievements, color: '#fbbf24' },
          { label: 'Games', value: totalGames, color: '#a78bfa' }
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#666', padding: '40px 0' }}>Loading game profiles…</div>
      ) : (
        PROVIDERS.map(provider => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            profile={profiles[provider.id] || null}
            connecting={connecting === provider.id}
            onConnect={connectProvider}
            onAddAchievement={addAchievement}
            onAddProgress={addProgress}
          />
        ))
      )}
    </div>
  );
}
