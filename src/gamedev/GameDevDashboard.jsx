// src/gamedev/GameDevDashboard.jsx
// 2026-07-12 | Game dev: Unreal/Epic/Sony/Microsoft/Ubisoft connectors, achievement & progress tracking

import React, { useState, useEffect } from 'react';
import {
  Gamepad2, Trophy, Star, Zap, Users, Activity,
  CheckCircle, Circle, TrendingUp, Package, Globe,
  Cpu, Monitor, Smartphone, Box, Play, BarChart3,
  Lock, Unlock, ArrowRight, Shield
} from 'lucide-react';

const PLATFORMS = {
  unreal: {
    name: 'Unreal Engine',
    icon: '⚡',
    color: '#1a1a2e',
    accent: '#e91e63',
    publisher: 'Epic Games',
    connected: true,
    sdkVersion: 'UE 5.4',
    features: ['Nanite', 'Lumen', 'MetaHuman', 'Niagara', 'PCG', 'Blueprint', 'Online Subsystem'],
  },
  epic: {
    name: 'Epic Games Store',
    icon: '🎮',
    color: '#0d1117',
    accent: '#0080ff',
    publisher: 'Epic Games',
    connected: true,
    sdkVersion: 'EOS SDK 1.16',
    features: ['Achievements', 'Cloud Saves', 'Leaderboards', 'Matchmaking', 'Voice Chat', 'Anti-Cheat'],
  },
  sony: {
    name: 'PlayStation Network',
    icon: '🎮',
    color: '#003087',
    accent: '#0070cc',
    publisher: 'Sony Interactive',
    connected: false,
    sdkVersion: 'PS5 SDK 8.0',
    features: ['Trophies', 'Share Play', 'Activity Cards', 'PS Store', 'Remote Play', 'DualSense'],
  },
  microsoft: {
    name: 'Xbox / Game Pass',
    icon: '🎯',
    color: '#107c10',
    accent: '#52b043',
    publisher: 'Microsoft',
    connected: false,
    sdkVersion: 'GDK 2024.03',
    features: ['Achievements', 'Game Pass', 'Xbox Live', 'Smart Delivery', 'Play Anywhere', 'Cloud Gaming'],
  },
  ubisoft: {
    name: 'Ubisoft Connect',
    icon: '🔷',
    color: '#1f1b4b',
    accent: '#1f9bde',
    publisher: 'Ubisoft',
    connected: false,
    sdkVersion: 'UC SDK 2.1',
    features: ['Challenges', 'Units Rewards', 'Club Challenges', 'Cross-play', 'Overlay', 'Stats'],
  },
  steam: {
    name: 'Steam',
    icon: '🌊',
    color: '#1b2838',
    accent: '#66c0f4',
    publisher: 'Valve',
    connected: true,
    sdkVersion: 'Steamworks SDK 1.57',
    features: ['Achievements', 'Workshop', 'Trading Cards', 'Remote Play', 'Anti-Cheat', 'Cloud'],
  },
};

const ACHIEVEMENT_TIERS = {
  bronze: { color: '#cd7f32', icon: '🥉', xp: 50 },
  silver: { color: '#c0c0c0', icon: '🥈', xp: 150 },
  gold: { color: '#ffd700', icon: '🥇', xp: 400 },
  platinum: { color: '#e5e4e2', icon: '💎', xp: 1000 },
};

const SAMPLE_ACHIEVEMENTS = [
  { id: 1, title: 'First Blood', desc: 'Complete your first mission', tier: 'bronze', unlocked: true, progress: 1, target: 1, platform: 'epic', xp: 50, unlockedAt: Date.now() - 86400000 * 3 },
  { id: 2, title: 'Centurion', desc: 'Defeat 100 enemies', tier: 'silver', unlocked: true, progress: 100, target: 100, platform: 'steam', xp: 150, unlockedAt: Date.now() - 86400000 },
  { id: 3, title: 'World Explorer', desc: 'Discover all map areas', tier: 'gold', unlocked: false, progress: 67, target: 100, platform: 'epic', xp: 400, unlockedAt: null },
  { id: 4, title: 'Legendary Hero', desc: 'Complete all story missions on Legendary', tier: 'platinum', unlocked: false, progress: 12, target: 30, platform: 'steam', xp: 1000, unlockedAt: null },
  { id: 5, title: 'Speed Runner', desc: 'Complete Act 1 in under 30 minutes', tier: 'gold', unlocked: false, progress: 0, target: 1, platform: 'epic', xp: 400, unlockedAt: null },
  { id: 6, title: 'Collector', desc: 'Gather 50 unique items', tier: 'silver', unlocked: true, progress: 50, target: 50, platform: 'steam', xp: 150, unlockedAt: Date.now() - 86400000 * 7 },
];

const BUILD_METRICS = {
  lastBuild: { status: 'success', duration: '4m 32s', platform: 'Win64+PS5', timestamp: Date.now() - 1800000 },
  fps: { pc: 144, ps5: 60, xbox: 60, mobile: 30 },
  polyCount: '2.4M',
  drawCalls: 1842,
  textureMemory: '2.1 GB',
  bundleSize: '48.3 GB',
  crashRate: 0.02,
  dau: 12847,
  retention: { d1: 68, d7: 42, d30: 28 },
};

function PlatformConnector({ platform, data, onToggle }) {
  return (
    <div className={`platform-connector ${data.connected ? 'connected' : ''}`} style={{ borderColor: data.connected ? data.accent : '#333' }}>
      <div className="connector-header" style={{ background: data.color }}>
        <div className="connector-icon">{data.icon}</div>
        <div className="connector-info">
          <div className="connector-name" style={{ color: 'white' }}>{data.name}</div>
          <div className="connector-sdk" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>{data.sdkVersion}</div>
        </div>
        <div
          className={`connection-status ${data.connected ? 'on' : 'off'}`}
          onClick={onToggle}
        >
          {data.connected ? <Unlock size={12} /> : <Lock size={12} />}
          {data.connected ? 'Connected' : 'Connect'}
        </div>
      </div>
      {data.connected && (
        <div className="connector-features">
          {data.features.slice(0, 4).map(f => (
            <div key={f} className="feature-chip" style={{ color: data.accent }}>
              <CheckCircle size={10} />
              {f}
            </div>
          ))}
          {data.features.length > 4 && (
            <div className="feature-chip more">+{data.features.length - 4} more</div>
          )}
        </div>
      )}
      {!data.connected && (
        <div className="connector-connect-cta">
          <p>Configure credentials in Settings to enable {data.name} integration</p>
        </div>
      )}
    </div>
  );
}

function AchievementCard({ achievement }) {
  const tier = ACHIEVEMENT_TIERS[achievement.tier];
  const pct = Math.min(100, (achievement.progress / achievement.target) * 100);

  return (
    <div className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}>
      <div className="achievement-icon">
        <span style={{ fontSize: '1.5rem' }}>{tier.icon}</span>
        {!achievement.unlocked && (
          <div className="achievement-lock">
            <Lock size={12} />
          </div>
        )}
      </div>
      <div className="achievement-info">
        <div className="achievement-title" style={{ color: achievement.unlocked ? tier.color : '#888' }}>
          {achievement.title}
        </div>
        <div className="achievement-desc">{achievement.desc}</div>
        {!achievement.unlocked && (
          <div className="achievement-progress">
            <div className="ap-bar-track">
              <div className="ap-bar-fill" style={{ width: `${pct}%`, background: tier.color }} />
            </div>
            <span className="ap-count">{achievement.progress}/{achievement.target}</span>
          </div>
        )}
        {achievement.unlocked && (
          <div className="achievement-unlocked-at">
            <CheckCircle size={11} style={{ color: '#10b981' }} />
            {new Date(achievement.unlockedAt).toLocaleDateString()}
          </div>
        )}
      </div>
      <div className="achievement-xp" style={{ color: tier.color }}>+{tier.xp} XP</div>
    </div>
  );
}

export default function GameDevDashboard() {
  const [platforms, setPlatforms] = useState(PLATFORMS);
  const [activeTab, setActiveTab] = useState('overview');
  const [achievementFilter, setAchievementFilter] = useState('all');
  const [metrics, setMetrics] = useState(BUILD_METRICS);

  useEffect(() => {
    const t = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        fps: {
          pc: Math.floor(130 + Math.random() * 30),
          ps5: 60,
          xbox: 60,
          mobile: Math.floor(28 + Math.random() * 4),
        },
        dau: Math.floor(12000 + Math.random() * 2000),
        drawCalls: Math.floor(1800 + Math.random() * 100),
      }));
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const togglePlatform = (key) => {
    setPlatforms(prev => ({
      ...prev,
      [key]: { ...prev[key], connected: !prev[key].connected },
    }));
  };

  const unlockedCount = SAMPLE_ACHIEVEMENTS.filter(a => a.unlocked).length;
  const totalXP = SAMPLE_ACHIEVEMENTS.filter(a => a.unlocked).reduce((s, a) => s + ACHIEVEMENT_TIERS[a.tier].xp, 0);
  const filteredAchievements = achievementFilter === 'all'
    ? SAMPLE_ACHIEVEMENTS
    : achievementFilter === 'unlocked'
      ? SAMPLE_ACHIEVEMENTS.filter(a => a.unlocked)
      : SAMPLE_ACHIEVEMENTS.filter(a => !a.unlocked);

  return (
    <div className="gamedev-dashboard">
      <div className="gd-header">
        <div>
          <h1><Gamepad2 size={24} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />Game Dev Hub</h1>
          <p className="gd-sub">Platform connectors, builds, achievements &amp; analytics</p>
        </div>
      </div>

      <div className="gd-tabs">
        {['overview', 'platforms', 'achievements', 'analytics'].map(tab => (
          <button
            key={tab}
            className={`gd-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          <div className="gd-summary">
            <div className="gd-stat">
              <Trophy size={20} style={{ color: '#ffd700' }} />
              <div><div className="gds-value">{unlockedCount}/{SAMPLE_ACHIEVEMENTS.length}</div><div className="gds-label">Achievements</div></div>
            </div>
            <div className="gd-stat">
              <Star size={20} style={{ color: '#7c3aed' }} />
              <div><div className="gds-value">{totalXP.toLocaleString()}</div><div className="gds-label">Total XP</div></div>
            </div>
            <div className="gd-stat">
              <Users size={20} style={{ color: '#3b82f6' }} />
              <div><div className="gds-value">{metrics.dau.toLocaleString()}</div><div className="gds-label">Daily Active Users</div></div>
            </div>
            <div className="gd-stat">
              <Activity size={20} style={{ color: '#10b981' }} />
              <div><div className="gds-value">{metrics.fps.pc}</div><div className="gds-label">PC FPS</div></div>
            </div>
          </div>

          <div className="gd-build-status">
            <h2>Latest Build</h2>
            <div className={`build-card ${metrics.lastBuild.status}`}>
              <div className="build-status-icon">
                {metrics.lastBuild.status === 'success' ? <CheckCircle size={20} style={{ color: '#10b981' }} /> : <Circle size={20} style={{ color: '#ef4444' }} />}
              </div>
              <div className="build-info">
                <div className="build-result" style={{ color: metrics.lastBuild.status === 'success' ? '#10b981' : '#ef4444' }}>
                  {metrics.lastBuild.status === 'success' ? 'Build Succeeded' : 'Build Failed'}
                </div>
                <div className="build-meta">
                  {metrics.lastBuild.platform} · {metrics.lastBuild.duration} · {new Date(metrics.lastBuild.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>

          <div className="gd-perf-grid">
            <div className="perf-card">
              <Cpu size={16} style={{ color: '#3b82f6' }} />
              <span className="perf-label">Draw Calls</span>
              <span className="perf-value">{metrics.drawCalls.toLocaleString()}</span>
            </div>
            <div className="perf-card">
              <Package size={16} style={{ color: '#7c3aed' }} />
              <span className="perf-label">Bundle Size</span>
              <span className="perf-value">{metrics.bundleSize}</span>
            </div>
            <div className="perf-card">
              <Monitor size={16} style={{ color: '#f97316' }} />
              <span className="perf-label">Texture Mem</span>
              <span className="perf-value">{metrics.textureMemory}</span>
            </div>
            <div className="perf-card">
              <Shield size={16} style={{ color: '#10b981' }} />
              <span className="perf-label">Crash Rate</span>
              <span className="perf-value">{metrics.crashRate}%</span>
            </div>
          </div>

          <div className="retention-grid">
            <h2>Player Retention</h2>
            <div className="ret-stats">
              {[['D1', metrics.retention.d1], ['D7', metrics.retention.d7], ['D30', metrics.retention.d30]].map(([label, val]) => (
                <div key={label} className="ret-stat">
                  <div className="ret-bar-track">
                    <div className="ret-bar-fill" style={{ height: `${val}%`, background: val >= 50 ? '#10b981' : val >= 30 ? '#eab308' : '#ef4444' }} />
                  </div>
                  <div className="ret-value">{val}%</div>
                  <div className="ret-label">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'platforms' && (
        <div className="platforms-list">
          <p className="platforms-intro">Connect your game to major platforms and storefronts. Configure API credentials in Settings.</p>
          {Object.entries(platforms).map(([key, data]) => (
            <PlatformConnector
              key={key}
              platform={key}
              data={data}
              onToggle={() => togglePlatform(key)}
            />
          ))}
        </div>
      )}

      {activeTab === 'achievements' && (
        <div>
          <div className="achievement-summary">
            <div className="ach-stat">
              <Trophy size={20} style={{ color: '#ffd700' }} />
              <div><div className="gds-value">{unlockedCount}</div><div className="gds-label">Unlocked</div></div>
            </div>
            <div className="ach-stat">
              <Lock size={20} style={{ color: '#888' }} />
              <div><div className="gds-value">{SAMPLE_ACHIEVEMENTS.length - unlockedCount}</div><div className="gds-label">Locked</div></div>
            </div>
            <div className="ach-stat">
              <Star size={20} style={{ color: '#ffd700' }} />
              <div><div className="gds-value">{totalXP}</div><div className="gds-label">XP Earned</div></div>
            </div>
          </div>

          <div className="achievement-filters">
            {['all', 'unlocked', 'locked'].map(f => (
              <button
                key={f}
                className={`ach-filter ${achievementFilter === f ? 'active' : ''}`}
                onClick={() => setAchievementFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="achievements-grid">
            {filteredAchievements.map(a => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="analytics-section">
          <h2>Cross-Platform Analytics</h2>
          <div className="platform-analytics">
            {['PC', 'PS5', 'Xbox', 'Mobile'].map((platform, i) => {
              const vals = [metrics.fps.pc, metrics.fps.ps5, metrics.fps.xbox, metrics.fps.mobile];
              const daus = [Math.floor(metrics.dau * 0.45), Math.floor(metrics.dau * 0.25), Math.floor(metrics.dau * 0.2), Math.floor(metrics.dau * 0.1)];
              return (
                <div key={platform} className="pa-card">
                  <div className="pa-platform">{platform}</div>
                  <div className="pa-fps">{vals[i]} <span>FPS</span></div>
                  <div className="pa-dau">{daus[i].toLocaleString()} <span>DAU</span></div>
                  <div className="pa-bar-track">
                    <div className="pa-bar-fill" style={{ width: `${(daus[i] / metrics.dau) * 100}%`, background: ['#3b82f6', '#0070cc', '#52b043', '#ec4899'][i] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .gamedev-dashboard { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }
        .gd-header { margin-bottom: 1.5rem; }
        .gd-header h1 { margin: 0; font-size: 1.75rem; font-weight: 700; }
        .gd-sub { margin: 0.25rem 0 0; font-size: 0.875rem; color: #888; }
        .gd-tabs { display: flex; gap: 0.25rem; background: #111; border-radius: 8px; padding: 0.25rem; margin-bottom: 1.5rem; }
        .gd-tab { flex: 1; padding: 0.5rem; background: transparent; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; color: #888; }
        .gd-tab.active { background: #7c3aed; color: white; }
        .gd-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
        .gd-stat { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: #111; border-radius: 10px; border: 1px solid #222; }
        .gds-value { font-size: 1.4rem; font-weight: 700; }
        .gds-label { font-size: 0.75rem; color: #888; }
        .gd-build-status { margin-bottom: 1.5rem; }
        .gd-build-status h2 { font-size: 1rem; margin-bottom: 0.75rem; }
        .build-card { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #111; border-radius: 10px; border: 1px solid #222; }
        .build-result { font-weight: 700; font-size: 1rem; }
        .build-meta { font-size: 0.8rem; color: #888; margin-top: 0.2rem; }
        .gd-perf-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; }
        .perf-card { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; padding: 0.875rem; background: #111; border-radius: 10px; border: 1px solid #222; text-align: center; }
        .perf-label { font-size: 0.75rem; color: #888; }
        .perf-value { font-size: 1rem; font-weight: 700; }
        .retention-grid h2 { font-size: 1rem; margin-bottom: 1rem; }
        .ret-stats { display: flex; gap: 1.5rem; height: 120px; align-items: flex-end; }
        .ret-stat { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; }
        .ret-bar-track { height: 100px; width: 40px; background: #222; border-radius: 4px; overflow: hidden; display: flex; align-items: flex-end; }
        .ret-bar-fill { width: 100%; border-radius: 4px; transition: height 0.5s ease; }
        .ret-value { font-size: 0.875rem; font-weight: 700; }
        .ret-label { font-size: 0.75rem; color: #888; }
        .platforms-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .platforms-intro { font-size: 0.875rem; color: #888; margin-bottom: 1rem; }
        .platform-connector { border: 1px solid; border-radius: 10px; overflow: hidden; }
        .connector-header { display: flex; align-items: center; gap: 1rem; padding: 0.875rem 1rem; }
        .connector-icon { font-size: 1.5rem; }
        .connector-info { flex: 1; }
        .connector-name { font-weight: 700; font-size: 0.95rem; }
        .connection-status { display: flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; background: rgba(255,255,255,0.1); color: white; }
        .connector.connected .connection-status { background: rgba(16,185,129,0.2); color: #10b981; }
        .connector-features { display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0.75rem 1rem; border-top: 1px solid #222; }
        .feature-chip { display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; padding: 0.2rem 0.5rem; background: #1a1a1a; border-radius: 4px; }
        .feature-chip.more { color: #888; }
        .connector-connect-cta { padding: 0.75rem 1rem; font-size: 0.8rem; color: #888; border-top: 1px solid #222; }
        .achievement-summary { display: flex; gap: 1rem; margin-bottom: 1rem; }
        .ach-stat { display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1rem; background: #111; border-radius: 10px; border: 1px solid #222; flex: 1; }
        .achievement-filters { display: flex; gap: 0.25rem; margin-bottom: 1rem; }
        .ach-filter { padding: 0.35rem 0.75rem; border-radius: 6px; border: 1px solid #333; background: transparent; cursor: pointer; font-size: 0.8rem; color: #888; }
        .ach-filter.active { background: #7c3aed; color: white; border-color: #7c3aed; }
        .achievements-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.75rem; }
        .achievement-card { display: flex; align-items: center; gap: 0.875rem; padding: 0.875rem; background: #111; border-radius: 10px; border: 1px solid #222; position: relative; }
        .achievement-card.unlocked { border-color: #2a2a2a; }
        .achievement-card.locked { opacity: 0.65; }
        .achievement-icon { position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
        .achievement-lock { position: absolute; bottom: -2px; right: -2px; background: #111; border-radius: 50%; padding: 2px; }
        .achievement-info { flex: 1; }
        .achievement-title { font-size: 0.875rem; font-weight: 700; }
        .achievement-desc { font-size: 0.75rem; color: #888; margin: 0.15rem 0; }
        .achievement-progress { margin-top: 0.35rem; }
        .ap-bar-track { height: 4px; background: #222; border-radius: 2px; overflow: hidden; margin-bottom: 0.2rem; }
        .ap-bar-fill { height: 100%; border-radius: 2px; }
        .ap-count { font-size: 0.7rem; color: #888; }
        .achievement-unlocked-at { display: flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; color: #10b981; margin-top: 0.2rem; }
        .achievement-xp { font-size: 0.8rem; font-weight: 700; white-space: nowrap; }
        .platform-analytics { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
        .pa-card { background: #111; border-radius: 10px; padding: 1rem; border: 1px solid #222; }
        .pa-platform { font-size: 0.85rem; color: #888; font-weight: 600; margin-bottom: 0.5rem; }
        .pa-fps { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.2rem; }
        .pa-fps span, .pa-dau span { font-size: 0.75rem; color: #888; font-weight: 400; }
        .pa-dau { font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem; }
        .pa-bar-track { height: 6px; background: #222; border-radius: 3px; overflow: hidden; }
        .pa-bar-fill { height: 100%; border-radius: 3px; }
        @media (max-width: 640px) {
          .gd-summary { grid-template-columns: repeat(2, 1fr); }
          .gd-perf-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
}
