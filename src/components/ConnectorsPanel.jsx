/**
 * ConnectorsPanel.jsx
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Platform Connectors & Integrations Panel
 * Azure · Adobe · AWS · GCP · GitHub · Bitbucket · Slack · Zoom
 * Unreal/Epic · Sony · Microsoft · Ubisoft · Redis · Blob Storage
 * Updated: 2026-08-14
 */

import React, { useState, useEffect } from 'react';
import {
  Puzzle, CheckCircle2, XCircle, RefreshCw, ExternalLink,
  Cloud, Code2, MessageSquare, Video, Database, GitBranch,
  Box, Zap, Settings, Plus, Trash2, AlertTriangle
} from 'lucide-react';

// ─── Connector Definitions ────────────────────────────────────────────────────
const CONNECTORS = {
  // Cloud Providers
  azure: {
    name: 'Microsoft Azure',   category: 'cloud', icon: '☁️', color: '#0078d4',
    description: 'Azure Blob Storage, Cognitive Services, DevOps, Functions',
    features: ['Blob Storage', 'Cognitive AI', 'DevOps Pipelines', 'Functions', 'AKS'],
    docsUrl: 'https://docs.microsoft.com/azure',
    envVar: 'AZURE_CONNECTION_STRING',
  },
  aws: {
    name: 'Amazon Web Services', category: 'cloud', icon: '🟡', color: '#ff9900',
    description: 'S3, Lambda, EC2, RDS, CloudFront, SQS',
    features: ['S3 Bucket', 'Lambda', 'EC2', 'RDS', 'CloudFront'],
    docsUrl: 'https://docs.aws.amazon.com',
    envVar: 'AWS_ACCESS_KEY_ID',
  },
  gcp: {
    name: 'Google Cloud Platform', category: 'cloud', icon: '🔵', color: '#4285f4',
    description: 'Cloud Storage, Functions, Firestore, BigQuery, Pub/Sub',
    features: ['Cloud Storage', 'Cloud Functions', 'Firestore', 'BigQuery'],
    docsUrl: 'https://cloud.google.com/docs',
    envVar: 'GOOGLE_CLOUD_KEY',
  },

  // Developer Tools
  github: {
    name: 'GitHub',       category: 'dev', icon: '🐙', color: '#24292e',
    description: 'Repositories, Actions, Issues, Packages, Copilot',
    features: ['Repositories', 'GitHub Actions', 'Issues', 'Packages', 'Copilot'],
    docsUrl: 'https://docs.github.com',
    envVar: 'GITHUB_TOKEN',
  },
  bitbucket: {
    name: 'Bitbucket',    category: 'dev', icon: '🪣', color: '#0052cc',
    description: 'Repositories, Pipelines, Issues, Code Review',
    features: ['Repositories', 'Pipelines', 'Pull Requests', 'Issues'],
    docsUrl: 'https://developer.atlassian.com/cloud/bitbucket',
    envVar: 'BITBUCKET_TOKEN',
  },

  // Communication
  slack: {
    name: 'Slack',        category: 'comms', icon: '💬', color: '#4a154b',
    description: 'Channels, Messages, Webhooks, Bots, Workflow Builder',
    features: ['Channels', 'Webhooks', 'Bot API', 'Workflow Builder'],
    docsUrl: 'https://api.slack.com',
    envVar: 'SLACK_WEBHOOK_URL',
  },
  zoom: {
    name: 'Zoom',         category: 'comms', icon: '📹', color: '#2d8cff',
    description: 'Meetings, Webinars, Recordings, SDK, AI Companion',
    features: ['Meetings API', 'Webinars', 'Recordings', 'SDK'],
    docsUrl: 'https://developers.zoom.us',
    envVar: 'ZOOM_API_KEY',
  },

  // Creative
  adobe: {
    name: 'Adobe Creative Cloud', category: 'creative', icon: '🎨', color: '#ff0000',
    description: 'Photoshop, Illustrator, Premiere, Analytics, Document Cloud',
    features: ['Photoshop API', 'PDF Services', 'Analytics', 'Fonts'],
    docsUrl: 'https://developer.adobe.com',
    envVar: 'ADOBE_CLIENT_ID',
  },

  // Data / Infra
  redis: {
    name: 'Redis',        category: 'data', icon: '🔴', color: '#d82c20',
    description: 'In-memory caching, Pub/Sub, Streams, Search, JSON',
    features: ['Key-Value Cache', 'Pub/Sub', 'Streams', 'RedisSearch', 'RedisJSON'],
    docsUrl: 'https://redis.io/docs',
    envVar: 'REDIS_URL',
  },
  blob: {
    name: 'Azure Blob Storage', category: 'data', icon: '📦', color: '#0078d4',
    description: 'Scalable object storage for images, videos, backups',
    features: ['File Upload', 'CDN Integration', 'Versioning', 'Access Tiers'],
    docsUrl: 'https://docs.microsoft.com/azure/storage/blobs',
    envVar: 'AZURE_BLOB_CONNECTION_STRING',
  },

  // Game Platforms
  unreal: {
    name: 'Unreal Engine / Epic', category: 'game', icon: '🎮', color: '#0070f3',
    description: 'Epic Online Services, Unreal Engine SDK, Marketplace',
    features: ['EOS SDK', 'Marketplace API', 'Dev Programs', 'Matchmaking'],
    docsUrl: 'https://dev.epicgames.com/docs',
    envVar: 'EPIC_CLIENT_ID',
  },
  sony: {
    name: 'PlayStation / Sony', category: 'game', icon: '🎮', color: '#003791',
    description: 'PlayStation SDK, PSN, Developer Portal, Trophies',
    features: ['PS5 SDK', 'PSN API', 'Trophies', 'Online Storage'],
    docsUrl: 'https://partners.playstation.net',
    envVar: 'SONY_CLIENT_ID',
  },
  microsoft_gaming: {
    name: 'Xbox / Microsoft',  category: 'game', icon: '🟢', color: '#107c10',
    description: 'Xbox SDK, Game Pass, PlayFab, Azure PlayFab',
    features: ['Xbox Live', 'PlayFab', 'Game Pass API', 'Achievements'],
    docsUrl: 'https://developer.microsoft.com/gaming',
    envVar: 'XBOX_CLIENT_ID',
  },
  ubisoft: {
    name: 'Ubisoft Connect', category: 'game', icon: '🎮', color: '#007aff',
    description: 'Achievements, Store, Social, Ubisoft API',
    features: ['Achievements', 'Ubisoft Store', 'Social Graph', 'DRM'],
    docsUrl: 'https://ubisoftconnect.com/en-US',
    envVar: 'UBISOFT_CLIENT_ID',
  },
};

const CATEGORIES = {
  all:      { label: 'All',            icon: Puzzle },
  cloud:    { label: 'Cloud',          icon: Cloud },
  dev:      { label: 'Dev Tools',      icon: Code2 },
  comms:    { label: 'Communication',  icon: MessageSquare },
  creative: { label: 'Creative',       icon: '🎨' },
  data:     { label: 'Data / Infra',   icon: Database },
  game:     { label: 'Game Platforms', icon: '🎮' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function ConnectorCard({ id, connector, connected, onConnect, onTest, testing }) {
  return (
    <div style={{
      background: 'var(--card-bg)', border: `1px solid ${connected ? connector.color : 'var(--border)'}`,
      borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: `${connector.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
          {connector.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{connector.name}</div>
          <div style={{ fontSize: 11, opacity: 0.5 }}>{connector.description}</div>
        </div>
        <div>
          {connected
            ? <CheckCircle2 size={18} color="#22c55e" />
            : <XCircle size={18} style={{ opacity: 0.3 }} />}
        </div>
      </div>

      {/* Features */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {connector.features?.slice(0, 4).map(f => (
          <span key={f} style={{ fontSize: 10, background: 'var(--border)', padding: '2px 7px', borderRadius: 8, opacity: 0.7 }}>{f}</span>
        ))}
      </div>

      {/* Env var hint */}
      {connector.envVar && (
        <div style={{ fontSize: 10, fontFamily: 'monospace', opacity: 0.4, background: 'var(--border)', padding: '3px 8px', borderRadius: 6, display: 'inline-block', width: 'fit-content' }}>
          Set {connector.envVar} in .env
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onConnect(id)}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', background: connected ? '#ef444415' : connector.color, color: connected ? '#ef4444' : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >
          {connected ? 'Disconnect' : 'Connect'}
        </button>
        {connected && (
          <button
            onClick={() => onTest(id)}
            disabled={testing === id}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', cursor: 'pointer', fontSize: 12 }}
          >
            {testing === id ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : 'Test'}
          </button>
        )}
        {connector.docsUrl && (
          <a href={connector.docsUrl} target="_blank" rel="noopener noreferrer"
            style={{ padding: '8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ConnectorsPanel() {
  const [connected, setConnected] = useState({ redis: true, github: true });
  const [activeCategory, setActiveCategory] = useState('all');
  const [testResults, setTestResults] = useState({});
  const [testing, setTesting] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const toggle = (id) => setConnected(prev => ({ ...prev, [id]: !prev[id] }));

  const test = async (id) => {
    setTesting(id);
    try {
      const token = localStorage.getItem('nexus_token') || '';
      const res = await fetch(`/api/connectors/${id}/test`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setTestResults(prev => ({ ...prev, [id]: data }));
    } catch (err) {
      setTestResults(prev => ({ ...prev, [id]: { success: false, error: err.message } }));
    } finally {
      setTesting(null);
    }
  };

  const filtered = Object.entries(CONNECTORS).filter(([id, c]) => {
    const catMatch = activeCategory === 'all' || c.category === activeCategory;
    const searchMatch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return catMatch && searchMatch;
  });

  const connectedCount = Object.values(connected).filter(Boolean).length;

  return (
    <div style={{ padding: 24, color: 'var(--text)' }}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>🔌 Platform Connectors</h1>
          <div style={{ fontSize: 13, opacity: 0.5, marginTop: 4 }}>{connectedCount} of {Object.keys(CONNECTORS).length} connected</div>
        </div>
        <input
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search connectors…"
          style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 13, width: 200 }}
        />
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: `1px solid ${activeCategory === key ? '#6366f1' : 'var(--border)'}`,
              background: activeCategory === key ? '#6366f120' : 'var(--card-bg)', color: activeCategory === key ? '#6366f1' : 'var(--text)',
              cursor: 'pointer', fontSize: 12, fontWeight: activeCategory === key ? 700 : 400, display: 'flex', alignItems: 'center', gap: 5
            }}
          >
            {typeof cat.icon === 'string' ? cat.icon : <cat.icon size={12} />}
            {cat.label}
            {key !== 'all' && (
              <span style={{ background: activeCategory === key ? '#6366f1' : 'var(--border)', color: activeCategory === key ? '#fff' : 'var(--text)', borderRadius: 10, padding: '0 5px', fontSize: 10 }}>
                {Object.values(CONNECTORS).filter(c => c.category === key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Test Results Banner */}
      {Object.keys(testResults).length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(testResults).map(([id, result]) => (
            <div key={id} style={{ background: result.success ? '#22c55e15' : '#ef444415', border: `1px solid ${result.success ? '#22c55e40' : '#ef444440'}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              {result.success ? <CheckCircle2 size={13} color="#22c55e" /> : <AlertTriangle size={13} color="#ef4444" />}
              <strong>{CONNECTORS[id]?.name || id}:</strong>
              {result.success ? `✓ Connected (${result.latency})` : result.error || 'Failed'}
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {filtered.map(([id, connector]) => (
          <ConnectorCard
            key={id} id={id} connector={connector}
            connected={!!connected[id]}
            onConnect={toggle} onTest={test} testing={testing}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', opacity: 0.4, padding: 40, fontSize: 14 }}>
          No connectors found for "{searchQuery}"
        </div>
      )}

      {/* Security note */}
      <div style={{ marginTop: 24, background: '#6366f110', border: '1px solid #6366f130', borderRadius: 10, padding: '10px 14px', fontSize: 12, opacity: 0.8 }}>
        🔒 API keys and credentials are loaded exclusively from environment variables. They are never stored in code or committed to version control.
      </div>
    </div>
  );
}
