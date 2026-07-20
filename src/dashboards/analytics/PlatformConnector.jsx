// 2026-07-20
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, Loader2, Key, Trash2, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
import { PLATFORM_CONFIG } from './SocialMetrics.jsx';

const ALL_PLATFORMS = Object.keys(PLATFORM_CONFIG);

// Platform-specific credential field definitions
const PLATFORM_FIELDS = {
  tiktok: [
    { key: 'accessToken', label: 'Access Token', placeholder: 'Paste your TikTok API access token', required: true },
    { key: 'clientId', label: 'Client Key', placeholder: 'TikTok for Developers → App → Client key', required: false },
  ],
  instagram: [
    { key: 'accessToken', label: 'Access Token', placeholder: 'Instagram Graph API access token', required: true },
    { key: 'clientId', label: 'App ID', placeholder: 'Facebook App ID', required: false },
  ],
  facebook: [
    { key: 'accessToken', label: 'Page Access Token', placeholder: 'Facebook Page long-lived access token', required: true },
    { key: 'clientId', label: 'App ID', placeholder: 'Facebook App ID', required: false },
  ],
  twitch: [
    { key: 'accessToken', label: 'OAuth Token', placeholder: 'Twitch OAuth user access token', required: true },
    { key: 'clientId', label: 'Client ID', placeholder: 'Twitch Developer Console → Application → Client ID', required: true },
  ],
  discord: [
    { key: 'accessToken', label: 'Bot Token', placeholder: 'Discord Developer Portal → Bot → Token', required: true },
    { key: 'clientId', label: 'Server ID', placeholder: 'Your Discord server / guild ID', required: false },
  ],
  lemon8: [
    { key: 'accessToken', label: 'Access Token', placeholder: 'Lemon8 API access token', required: true },
  ],
  reddit: [
    { key: 'accessToken', label: 'Access Token', placeholder: 'Reddit OAuth access token', required: true },
    { key: 'clientId', label: 'Client ID', placeholder: 'Reddit App → Client ID', required: false },
    { key: 'clientSecret', label: 'Client Secret', placeholder: 'Reddit App → Client Secret', required: false },
  ],
  redgifs: [
    { key: 'accessToken', label: 'Access Token', placeholder: 'RedGIFs API access token', required: true },
  ],
};

const PLATFORM_DOCS = {
  tiktok: 'https://developers.tiktok.com/doc/tiktok-api-v2-getting-started/',
  instagram: 'https://developers.facebook.com/docs/instagram-api/',
  facebook: 'https://developers.facebook.com/docs/pages/getting-started/',
  twitch: 'https://dev.twitch.tv/docs/authentication/',
  discord: 'https://discord.com/developers/docs/topics/oauth2',
  lemon8: 'https://lemon8-app.com/',
  reddit: 'https://www.reddit.com/prefs/apps',
  redgifs: 'https://redgifs.com/developers',
};

// ------------------------------------------------
// Single platform connector card
// ------------------------------------------------
function PlatformCard({ platform, apiBase }) {
  const cfg = PLATFORM_CONFIG[platform];
  const fields = PLATFORM_FIELDS[platform] || [];

  const [status, setStatus] = useState('unknown'); // 'unknown' | 'connected' | 'disconnected'
  const [formValues, setFormValues] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.key, '']))
  );
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null); // null | { ok, message }
  const [error, setError] = useState(null);

  // Check connection status on mount
  useEffect(() => {
    checkStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  async function checkStatus() {
    try {
      const res = await fetch(`${apiBase}/${platform}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` },
      });
      if (!res.ok) { setStatus('disconnected'); return; }
      const json = await res.json();
      setStatus(json.isConnected ? 'connected' : 'disconnected');
    } catch {
      setStatus('disconnected');
    }
  }

  async function handleConnect(e) {
    e.preventDefault();
    setError(null);
    setTestResult(null);

    const required = fields.filter((f) => f.required);
    for (const f of required) {
      if (!formValues[f.key]?.trim()) {
        setError(`${f.label} is required.`);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
        body: JSON.stringify({ platform, ...formValues }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Connection failed');
      setStatus('connected');
      setExpanded(false);
      setFormValues(Object.fromEntries(fields.map((f) => [f.key, ''])));
      setTestResult({ ok: true, message: json.message || 'Connected successfully.' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm(`Disconnect ${cfg.label}? Your credentials will be removed from the server.`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/connect/${platform}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` },
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to disconnect');
      }
      setStatus('disconnected');
      setTestResult(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTestConnection() {
    setTestResult(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/refresh/${platform}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Test failed');
      setTestResult({ ok: true, message: 'Connection test passed.' });
    } catch (err) {
      setTestResult({ ok: false, message: err.message });
    } finally {
      setLoading(false);
    }
  }

  const isConnected = status === 'connected';

  return (
    <div
      className="bg-gray-800 rounded-xl border overflow-hidden transition-all"
      style={{ borderColor: isConnected ? cfg.color + '66' : '#374151' }}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 p-4">
        <span className="text-xl leading-none">{cfg.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="text-white font-semibold text-sm">{cfg.label}</div>
          <div className="text-gray-500 text-xs">{cfg.tagline}</div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <span className="flex items-center gap-1 text-green-400 text-xs font-semibold">
              <CheckCircle2 size={13} className="shrink-0" /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-gray-500 text-xs">
              <XCircle size={13} className="shrink-0" /> Not connected
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 ml-2">
          {isConnected && (
            <>
              <button
                onClick={handleTestConnection}
                disabled={loading}
                className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors disabled:opacity-40"
                title="Test connection"
              >
                <RefreshCw size={13} />
              </button>
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="p-1.5 rounded-lg bg-gray-700 hover:bg-red-900 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40"
                title="Disconnect"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
          {!isConnected && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
              style={{ background: cfg.color + '33', border: `1px solid ${cfg.color}66` }}
            >
              <Key size={12} />
              {expanded ? 'Cancel' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div
          className={`mx-4 mb-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
            testResult.ok
              ? 'bg-green-900/40 border border-green-700/50 text-green-400'
              : 'bg-red-900/40 border border-red-700/50 text-red-400'
          }`}
        >
          {testResult.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {testResult.message}
        </div>
      )}

      {/* Connect form */}
      {!isConnected && expanded && (
        <form onSubmit={handleConnect} className="border-t border-gray-700 px-4 pb-4 pt-3 space-y-3">
          {/* Credential guidance */}
          <div className="flex items-start gap-2 bg-indigo-900/30 border border-indigo-700/40 rounded-lg p-3 text-xs text-indigo-300">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-indigo-400" />
            <div>
              You must supply your own API credentials. Nexus AI Pro never generates or shares tokens.
              {PLATFORM_DOCS[platform] && (
                <a
                  href={PLATFORM_DOCS[platform]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 mt-1 underline underline-offset-2"
                >
                  Get {cfg.label} credentials <ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>

          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-gray-400 text-xs mb-1">
                {field.label}
                {field.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              <input
                type="password"
                autoComplete="off"
                placeholder={field.placeholder}
                value={formValues[field.key]}
                onChange={(e) =>
                  setFormValues((v) => ({ ...v, [field.key]: e.target.value }))
                }
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          ))}

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs">
              <XCircle size={12} /> {error}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: cfg.color, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
              {loading ? 'Saving…' : 'Save & Connect'}
            </button>
            <span className="text-gray-600 text-xs">Encrypted on the server</span>
          </div>
        </form>
      )}
    </div>
  );
}

// ================================================
// Main Component
// ================================================
export default function PlatformConnector({ apiBase = '/api/analytics' }) {
  const connectedCount = 0; // Will be updated dynamically in a full integration

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h2 className="text-white font-bold text-base mb-1">Connect Your Platforms</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          Enter your own API credentials for each platform. All tokens are encrypted with AES-256-GCM
          before being stored on the server — they are never logged, returned in API responses, or
          stored in your browser.
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-indigo-400">
          <CheckCircle2 size={13} />
          <span>End-to-end encrypted credential storage</span>
          <span className="mx-1 text-gray-600">·</span>
          <CheckCircle2 size={13} />
          <span>No third-party credential sharing</span>
          <span className="mx-1 text-gray-600">·</span>
          <CheckCircle2 size={13} />
          <span>Revoke anytime</span>
        </div>
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ALL_PLATFORMS.map((platform) => (
          <PlatformCard key={platform} platform={platform} apiBase={apiBase} />
        ))}
      </div>
    </div>
  );
}
