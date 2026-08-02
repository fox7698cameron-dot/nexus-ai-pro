// src/gaming/GameDevConnectors.jsx
// 2026-08-02 — Game Development Connectors & Achievement Tracking
// Platforms: Unreal/Epic Games, Sony PlayStation, Microsoft Xbox, Ubisoft Connect
// Features: build pipeline, achievement system, game progress, SDK integration

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2, Trophy, Star, Zap, CheckCircle, Clock,
  Activity, Globe, Shield, Users, Download, Upload,
  Play, Pause, RefreshCw, Settings, Link, Unlink,
  Monitor, Cpu, Box, BarChart3, Award, Target, Lock
} from 'lucide-react';

const PLATFORMS = [
  {
    id: 'epic',
    name: 'Epic Games / Unreal',
    icon: '⚡',
    color: '#0078d4',
    sdkVersion: 'UE 5.4',
    features: ['Nanite', 'Lumen', 'MetaSounds', 'Online Subsystem', 'Epic Online Services'],
    authEnv: 'EPIC_CLIENT_ID',
  },
  {
    id: 'sony',
    name: 'PlayStation',
    icon: '🎮',
    color: '#003087',
    sdkVersion: 'PS5 SDK 8.0',
    features: ['DualSense Haptics', 'Activities API', 'Trophy System', 'PSN Auth', 'Game Help'],
    authEnv: 'SONY_NP_CLIENT_ID',
  },
  {
    id: 'xbox',
    name: 'Xbox / Microsoft',
    icon: '🟩',
    color: '#107c10',
    sdkVersion: 'GDK 2406',
    features: ['Xbox Live', 'Play Anywhere', 'Smart Delivery', 'Achievements', 'Gamertag API'],
    authEnv: 'XBOX_CLIENT_ID',
  },
  {
    id: 'ubisoft',
    name: 'Ubisoft Connect',
    icon: '🔵',
    color: '#0070cc',
    sdkVersion: 'SDK 2.4',
    features: ['UConnect Auth', 'Actions & Challenges', 'In-game Shop', 'Friend List', 'Cloud Saves'],
    authEnv: 'UBISOFT_APP_ID',
  },
];

const ACHIEVEMENT_TYPES = [
  { id: 'combat',      label: 'Combat',       icon: '⚔️',  color: '#ff4444' },
  { id: 'exploration', label: 'Exploration',  icon: '🗺️',  color: '#00aaff' },
  { id: 'crafting',    label: 'Crafting',     icon: '🔨',  color: '#ffaa00' },
  { id: 'social',      label: 'Social',       icon: '👥',  color: '#00ff88' },
  { id: 'speed',       label: 'Speed Run',    icon: '⚡',  color: '#aa44ff' },
  { id: 'collection',  label: 'Collection',   icon: '📦',  color: '#ff6600' },
  { id: 'hidden',      label: 'Hidden',       icon: '🕵️', color: '#aaaaaa' },
  { id: 'story',       label: 'Story',        icon: '📖',  color: '#44ffaa' },
];

const DEMO_ACHIEVEMENTS = [
  { id: 'a1', name: 'First Blood', type: 'combat', xp: 50, rarity: 'common', unlocked: true, unlockedAt: '2026-07-15', platforms: ['epic', 'xbox'], progress: 1, target: 1 },
  { id: 'a2', name: 'World Explorer', type: 'exploration', xp: 200, rarity: 'rare', unlocked: true, unlockedAt: '2026-07-28', platforms: ['epic', 'sony', 'xbox'], progress: 100, target: 100 },
  { id: 'a3', name: 'Speed Demon', type: 'speed', xp: 500, rarity: 'epic', unlocked: false, platforms: ['epic'], progress: 3, target: 5 },
  { id: 'a4', name: 'Master Craftsman', type: 'crafting', xp: 300, rarity: 'rare', unlocked: false, platforms: ['sony', 'ubisoft'], progress: 45, target: 100 },
  { id: 'a5', name: 'Social Butterfly', type: 'social', xp: 150, rarity: 'uncommon', unlocked: true, unlockedAt: '2026-08-01', platforms: ['xbox', 'ubisoft'], progress: 50, target: 50 },
  { id: 'a6', name: 'The Collector', type: 'collection', xp: 1000, rarity: 'legendary', unlocked: false, platforms: ['epic', 'sony', 'xbox', 'ubisoft'], progress: 127, target: 500 },
  { id: 'a7', name: '???', type: 'hidden', xp: 777, rarity: 'legendary', unlocked: false, platforms: ['epic'], progress: 0, target: 1 },
  { id: 'a8', name: 'Story Complete', type: 'story', xp: 2000, rarity: 'legendary', unlocked: false, platforms: ['epic', 'sony', 'xbox', 'ubisoft'], progress: 6, target: 15 },
];

const RARITIES = {
  common:    { label: 'Common',    color: '#aaaaaa', glow: '#aaa3' },
  uncommon:  { label: 'Uncommon',  color: '#00ff88', glow: '#0f83' },
  rare:      { label: 'Rare',      color: '#00aaff', glow: '#0af3' },
  epic:      { label: 'Epic',      color: '#9146ff', glow: '#91f3' },
  legendary: { label: 'Legendary', color: '#ffaa00', glow: '#fa03' },
};

function PlatformCard({ platform, connected, onToggle, buildStatus }) {
  const pct = buildStatus?.progress || 0;
  return (
    <div style={{
      background: connected ? `linear-gradient(135deg, ${platform.color}15, rgba(0,0,0,0.6))` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${connected ? platform.color + '44' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 16, padding: 18,
      boxShadow: connected ? `0 0 20px ${platform.color}15` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>{platform.icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{platform.name}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{platform.sdkVersion}</div>
          </div>
        </div>
        <button
          onClick={() => onToggle(platform.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: 600,
            background: connected ? 'rgba(255,68,68,0.1)' : `${platform.color}22`,
            border: `1px solid ${connected ? '#ff4444' : platform.color}44`,
            color: connected ? '#ff6666' : platform.color,
          }}
        >
          {connected ? <><Unlink size={10} /> Disconnect</> : <><Link size={10} /> Connect</>}
        </button>
      </div>

      {connected && buildStatus && (
        <div style={{ marginBottom: 14, padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Build pipeline</span>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: buildStatus.status === 'success' ? '#00ff88' : buildStatus.status === 'building' ? '#ffaa00' : '#ff4444',
            }}>{buildStatus.status?.toUpperCase()}</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 3, height: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: `linear-gradient(90deg, ${platform.color}88, ${platform.color})`,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{buildStatus.step}</div>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {platform.features.map(f => (
          <span key={f} style={{
            fontSize: 9, padding: '2px 7px', borderRadius: 10,
            background: connected ? `${platform.color}15` : 'rgba(255,255,255,0.04)',
            border: `1px solid ${connected ? platform.color + '30' : 'rgba(255,255,255,0.06)'}`,
            color: connected ? platform.color : 'rgba(255,255,255,0.35)',
            fontWeight: 500,
          }}>{f}</span>
        ))}
      </div>

      {!connected && (
        <div style={{ marginTop: 10, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
          Configure <code style={{ color: 'rgba(255,255,255,0.4)' }}>{platform.authEnv}</code> in environment to connect.
        </div>
      )}
    </div>
  );
}

function AchievementCard({ achievement }) {
  const type = ACHIEVEMENT_TYPES.find(t => t.id === achievement.type) || ACHIEVEMENT_TYPES[0];
  const rarity = RARITIES[achievement.rarity] || RARITIES.common;
  const progress = achievement.target > 0 ? Math.round((achievement.progress / achievement.target) * 100) : 0;
  const hidden = achievement.type === 'hidden' && !achievement.unlocked;

  return (
    <div style={{
      background: achievement.unlocked
        ? `linear-gradient(135deg, ${rarity.glow}, rgba(0,0,0,0.7))`
        : 'rgba(255,255,255,0.02)',
      border: `1px solid ${achievement.unlocked ? rarity.color + '44' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 14, padding: 14,
      filter: achievement.unlocked ? 'none' : 'grayscale(0.4)',
      opacity: achievement.unlocked ? 1 : 0.7,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          fontSize: 22, width: 42, height: 42, display: 'flex', alignItems: 'center',
          justifyContent: 'center', borderRadius: 10,
          background: achievement.unlocked ? `${rarity.color}22` : 'rgba(255,255,255,0.05)',
          border: `1px solid ${achievement.unlocked ? rarity.color + '44' : 'rgba(255,255,255,0.08)'}`,
          flexShrink: 0,
        }}>
          {hidden ? <Lock size={16} color="rgba(255,255,255,0.3)" /> : type.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: achievement.unlocked ? '#fff' : 'rgba(255,255,255,0.5)' }}>
              {hidden ? '???' : achievement.name}
            </span>
            <span style={{
              fontSize: 9, padding: '1px 6px', borderRadius: 8,
              background: `${rarity.color}22`, border: `1px solid ${rarity.color}44`, color: rarity.color,
              fontWeight: 700, letterSpacing: '0.05em',
            }}>{rarity.label.toUpperCase()}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{type.icon} {type.label}</span>
            <span style={{ fontSize: 10, color: '#ffaa00', fontWeight: 600 }}>+{achievement.xp} XP</span>
          </div>
        </div>
        {achievement.unlocked && <CheckCircle size={16} color="#00ff88" />}
      </div>

      {!achievement.unlocked && !hidden && achievement.target > 1 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>Progress</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>
              {achievement.progress}/{achievement.target}
            </span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 3, height: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: `linear-gradient(90deg, ${rarity.color}88, ${rarity.color})`,
            }} />
          </div>
        </div>
      )}

      {achievement.unlocked && achievement.unlockedAt && (
        <div style={{ marginTop: 6, fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
          Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
        {achievement.platforms.map(pid => {
          const p = PLATFORMS.find(x => x.id === pid);
          return p ? (
            <span key={pid} style={{
              fontSize: 8, padding: '1px 6px', borderRadius: 8,
              background: `${p.color}15`, border: `1px solid ${p.color}30`,
              color: p.color, fontWeight: 500,
            }}>{p.icon} {p.name.split(' ')[0]}</span>
          ) : null;
        })}
      </div>
    </div>
  );
}

export default function GameDevConnectors({ userRole = 'user' }) {
  const [connected, setConnected] = useState({ epic: false, sony: false, xbox: false, ubisoft: false });
  const [buildStatuses, setBuildStatuses] = useState({});
  const [achievements, setAchievements] = useState(DEMO_ACHIEVEMENTS);
  const [achievementFilter, setAchievementFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('platforms');

  const totalXP = achievements.filter(a => a.unlocked).reduce((s, a) => s + a.xp, 0);
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  const toggleConnect = useCallback((platformId) => {
    setConnected(prev => {
      const nowConnected = !prev[platformId];
      if (nowConnected) {
        // Simulate a build pipeline starting
        setBuildStatuses(bs => ({
          ...bs,
          [platformId]: { status: 'building', progress: 0, step: 'Initializing SDK...' },
        }));
        // Simulate progress
        let step = 0;
        const steps = [
          { progress: 20, step: 'Authenticating credentials...' },
          { progress: 45, step: 'Loading platform SDK...' },
          { progress: 70, step: 'Syncing achievements...' },
          { progress: 90, step: 'Configuring build pipeline...' },
          { progress: 100, step: 'Connected ✓' },
        ];
        const interval = setInterval(() => {
          if (step >= steps.length) {
            clearInterval(interval);
            setBuildStatuses(bs => ({
              ...bs,
              [platformId]: { status: 'success', progress: 100, step: 'Ready' },
            }));
            return;
          }
          setBuildStatuses(bs => ({ ...bs, [platformId]: { status: 'building', ...steps[step] } }));
          step++;
        }, 800);
      } else {
        setBuildStatuses(bs => { const n = { ...bs }; delete n[platformId]; return n; });
      }
      return { ...prev, [platformId]: nowConnected };
    });
  }, []);

  const filteredAchievements = achievementFilter === 'all'
    ? achievements
    : achievementFilter === 'unlocked'
      ? achievements.filter(a => a.unlocked)
      : achievements.filter(a => a.type === achievementFilter);

  const tabs = [
    { id: 'platforms', label: 'Platform SDKs', icon: Globe },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
    { id: 'progress', label: 'Game Progress', icon: Activity },
  ];

  return (
    <div style={{ background: '#080b10', minHeight: '100vh', color: '#fff', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '16px 24px',
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Gamepad2 size={22} color="#9146ff" /> Game Dev Hub
        </h1>
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          Platform SDKs · Achievement tracking · Build pipelines
        </p>
      </div>

      {/* XP bar */}
      <div style={{
        padding: '12px 24px', background: 'rgba(255,170,0,0.05)',
        borderBottom: '1px solid rgba(255,170,0,0.1)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Trophy size={16} color="#ffaa00" />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#ffaa00' }}>{totalXP.toLocaleString()} XP</span>
        </div>
        <div style={{ height: 20, width: 1, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          <span style={{ color: '#00ff88', fontWeight: 700 }}>{unlockedCount}</span> / {achievements.length} achievements unlocked
        </div>
        <div style={{ flex: 1, maxWidth: 200 }}>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${(unlockedCount / achievements.length) * 100}%`,
              background: 'linear-gradient(90deg, #ffaa00, #ff6600)',
            }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '12px 24px 0', display: 'flex', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {tabs.map(t => {
          const TI = t.icon;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: '10px 10px 0 0', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: activeTab === t.id ? 'rgba(255,255,255,0.06)' : 'transparent',
              border: activeTab === t.id ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
              borderBottom: activeTab === t.id ? '1px solid #080b10' : '1px solid transparent',
              color: activeTab === t.id ? '#fff' : 'rgba(255,255,255,0.4)',
              marginBottom: activeTab === t.id ? -1 : 0,
            }}>
              <TI size={12} /> {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ padding: '20px 24px' }}>
        {activeTab === 'platforms' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {PLATFORMS.map(p => (
              <PlatformCard
                key={p.id}
                platform={p}
                connected={connected[p.id]}
                buildStatus={buildStatuses[p.id]}
                onToggle={toggleConnect}
              />
            ))}
          </div>
        )}

        {activeTab === 'achievements' && (
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {['all', 'unlocked', ...ACHIEVEMENT_TYPES.map(t => t.id)].map(id => {
                const t = ACHIEVEMENT_TYPES.find(x => x.id === id);
                return (
                  <button key={id} onClick={() => setAchievementFilter(id)} style={{
                    padding: '3px 10px', borderRadius: 16, cursor: 'pointer', fontSize: 10, fontWeight: 600,
                    background: achievementFilter === id ? 'rgba(0,255,136,0.12)' : 'transparent',
                    border: `1px solid ${achievementFilter === id ? '#00ff88' : 'rgba(255,255,255,0.1)'}`,
                    color: achievementFilter === id ? '#00ff88' : 'rgba(255,255,255,0.4)',
                  }}>
                    {id === 'all' ? 'All' : id === 'unlocked' ? '✅ Unlocked' : `${t?.icon} ${t?.label}`}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {filteredAchievements.map(a => <AchievementCard key={a.id} achievement={a} />)}
            </div>
          </>
        )}

        {activeTab === 'progress' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {PLATFORMS.map(p => {
              const pAchievements = achievements.filter(a => a.platforms.includes(p.id));
              const pUnlocked = pAchievements.filter(a => a.unlocked).length;
              const pXP = pAchievements.filter(a => a.unlocked).reduce((s, a) => s + a.xp, 0);
              return (
                <div key={p.id} style={{
                  background: 'rgba(255,255,255,0.03)', border: `1px solid ${p.color}22`, borderRadius: 16, padding: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 22 }}>{p.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: p.color }}>{p.sdkVersion}</div>
                    </div>
                  </div>
                  {[
                    { label: 'Achievements', value: `${pUnlocked}/${pAchievements.length}`, color: p.color },
                    { label: 'XP Earned', value: `${pXP.toLocaleString()} XP`, color: '#ffaa00' },
                    { label: 'Completion', value: `${pAchievements.length > 0 ? Math.round((pUnlocked / pAchievements.length) * 100) : 0}%`, color: '#00ff88' },
                  ].map(s => (
                    <div key={s.label} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{s.label}</span>
                      <span style={{ fontSize: 11, color: s.color, fontWeight: 700 }}>{s.value}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pAchievements.length > 0 ? (pUnlocked / pAchievements.length) * 100 : 0}%`,
                        background: `linear-gradient(90deg, ${p.color}88, ${p.color})`,
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
