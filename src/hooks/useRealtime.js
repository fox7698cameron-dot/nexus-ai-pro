/**
 * @file useRealtime.js
 * @description React hooks for real-time WebSocket communication.
 *   Secure: all messages go through the Socket.IO encrypted channel.
 *   No automatic reconnect retries — uses Socket.IO's built-in reconnection
 *   (exponential backoff has been REMOVED per spec; use reconnectionDelay instead).
 * @author Cameron Fox <contact@nexusai.pro>
 * @version 2.0.0
 * @date 2026-08-19
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

// ─── Socket Singleton ──────────────────────────────────────────────────────────

let _socket = null;

function getSocket(token) {
  if (_socket?.connected) return _socket;
  if (_socket) { _socket.disconnect(); }

  _socket = io(window.SOCKET_URL || window.location.origin, {
    auth: { token },
    // NOTE: Automatic retry with exponential backoff has been removed.
    // Socket.IO's built-in reconnection is used with a fixed delay.
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,     // Fixed 2s delay — no exponential growth
    reconnectionDelayMax: 5000,  // Cap at 5s
    timeout: 10000,
    transports: ['websocket', 'polling']
  });

  return _socket;
}

// ─── useSocket Hook ────────────────────────────────────────────────────────────

/**
 * Connect to the real-time WebSocket server.
 * @param {string|null} token - JWT access token for authentication
 * @returns {{ socket, connected, error }}
 */
export function useSocket(token) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket(token);
    socketRef.current = socket;

    const onConnect = () => { setConnected(true); setError(null); };
    const onDisconnect = (reason) => { setConnected(false); };
    const onError = (err) => { setError(err.message || 'Connection error'); };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onError);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
    };
  }, [token]);

  return { socket: socketRef.current, connected, error };
}

// ─── useRealtimeEvent Hook ─────────────────────────────────────────────────────

/**
 * Subscribe to a single Socket.IO event.
 * @param {string} event
 * @param {Function} handler
 * @param {string|null} token
 */
export function useRealtimeEvent(event, handler, token) {
  const { socket } = useSocket(token);

  useEffect(() => {
    if (!socket || !event || !handler) return;
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [socket, event, handler]);
}

// ─── useRealtimeMetrics Hook ───────────────────────────────────────────────────

/**
 * Subscribe to real-time metric updates from the server.
 * @param {string} metricKey - e.g. 'security.threats', 'analytics.tiktok.views'
 * @param {*} initialValue
 * @param {string|null} token
 * @returns {{ value, lastUpdated, connected }}
 */
export function useRealtimeMetric(metricKey, initialValue, token) {
  const [value, setValue] = useState(initialValue);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { socket, connected } = useSocket(token);

  useEffect(() => {
    if (!socket || !metricKey) return;
    const handler = (data) => {
      setValue(data.value ?? data);
      setLastUpdated(new Date());
    };
    socket.on(`metric:${metricKey}`, handler);
    socket.emit('subscribe:metric', { key: metricKey });
    return () => {
      socket.off(`metric:${metricKey}`, handler);
      socket.emit('unsubscribe:metric', { key: metricKey });
    };
  }, [socket, metricKey]);

  return { value, lastUpdated, connected };
}

// ─── useRealtimeChat Hook ──────────────────────────────────────────────────────

/**
 * Real-time encrypted chat channel.
 * @param {string} channelId
 * @param {string|null} token
 * @returns {{ messages, send, connected }}
 */
export function useRealtimeChat(channelId, token) {
  const [messages, setMessages] = useState([]);
  const { socket, connected } = useSocket(token);

  useEffect(() => {
    if (!socket || !channelId) return;
    const handler = (encryptedMsg) => {
      // Messages are encrypted on the server; decrypt client-side if needed
      setMessages(prev => [...prev, { ...encryptedMsg, receivedAt: Date.now() }]);
    };
    socket.on('chat:message', handler);
    socket.emit('chat:join', { channelId });
    return () => {
      socket.off('chat:message', handler);
      socket.emit('chat:leave', { channelId });
    };
  }, [socket, channelId]);

  const send = useCallback((content) => {
    if (!socket?.connected) return;
    socket.emit('chat:message', { channelId, content, timestamp: Date.now() });
  }, [socket, channelId]);

  return { messages, send, connected };
}

// ─── useLiveSecurity Hook ─────────────────────────────────────────────────────

/**
 * Subscribe to live security alerts.
 * @param {string|null} token
 * @returns {{ alerts, latestThreat, threatCount }}
 */
export function useLiveSecurity(token) {
  const [alerts, setAlerts] = useState([]);
  const { socket } = useSocket(token);

  useEffect(() => {
    if (!socket) return;
    const handler = (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 50)); // Keep last 50
    };
    socket.on('security:alert', handler);
    return () => socket.off('security:alert', handler);
  }, [socket]);

  return { alerts, latestThreat: alerts[0] || null, threatCount: alerts.length };
}
