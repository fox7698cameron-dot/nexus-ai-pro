/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Social media connectors panel: real OAuth2 connect/disconnect per platform.
 * A platform shows "Not configured" until the operator sets its CLIENT_ID/SECRET
 * env vars server-side — this UI never implies a connection that doesn't exist.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Share2, Link2, Unlink, AlertCircle } from 'lucide-react';
import { socialService } from '../social-service.js';

export function SocialConnectorsPanel() {
  const [platforms, setPlatforms] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [connectingPlatform, setConnectingPlatform] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [platformsData, connectionsData] = await Promise.all([
        socialService.listPlatforms(),
        socialService.listConnections()
      ]);
      setPlatforms(platformsData.platforms);
      setConnections(connectionsData.connections);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const social = params.get('social');
    const platform = params.get('platform');
    if (social === 'connected') {
      setNotice(`${platform} connected successfully.`);
      load();
    } else if (social === 'error') {
      setError(`Failed to connect ${platform}. The connection may have been cancelled or denied.`);
    }
    if (social) {
      params.delete('social');
      params.delete('platform');
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
      window.history.replaceState({}, '', next);
    }
  }, [load]);

  const handleConnect = async (platform) => {
    setError(null);
    setConnectingPlatform(platform);
    try {
      const { url } = await socialService.getConnectUrl(platform);
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (platform) => {
    setError(null);
    try {
      await socialService.disconnect(platform);
      setConnections((prev) => prev.filter((c) => c.platform !== platform));
    } catch (err) {
      setError(err.message);
    }
  };

  const connectionFor = (platform) => connections.find((c) => c.platform === platform) || null;

  return (
    <div className="tool-content">
      <div className="panel-header">
        <Share2 size={18} />
        <h3>Social Media Connectors</h3>
      </div>

      {notice && <div className="empty-state" style={{ color: '#10b981' }}>{notice}</div>}
      {error && <div className="empty-state" style={{ color: '#ef4444' }}>{error}</div>}

      {loading ? (
        <div className="empty-state">Loading connectors…</div>
      ) : (
        <div className="template-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {platforms.map((p) => {
            const connection = connectionFor(p.platform);
            return (
              <div
                key={p.platform}
                style={{
                  display: 'flex', flexDirection: 'column', gap: '8px',
                  padding: '14px', background: 'var(--bg-3)', border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
              >
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{p.label}</div>

                {!p.supported ? (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>{p.reason}</span>
                  </div>
                ) : connection ? (
                  <>
                    <div style={{ fontSize: '0.75rem', color: '#10b981' }}>
                      Connected{connection.connectedAccount?.username ? ` as ${connection.connectedAccount.username}` : ''}
                    </div>
                    <button
                      onClick={() => handleDisconnect(p.platform)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center',
                        background: 'var(--bg-4)', color: 'var(--text-1)', border: '1px solid var(--border)',
                        borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.8rem'
                      }}
                    >
                      <Unlink size={14} /> Disconnect
                    </button>
                  </>
                ) : !p.configured ? (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Not configured on this server</div>
                ) : (
                  <button
                    onClick={() => handleConnect(p.platform)}
                    disabled={connectingPlatform === p.platform}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center',
                      background: 'var(--accent)', color: '#fff', border: 'none',
                      borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.8rem'
                    }}
                  >
                    <Link2 size={14} /> Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
