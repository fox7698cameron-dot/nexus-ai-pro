/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * useWebSocket — Socket.io real-time connection hook
 * Singleton socket shared per page load; auto-reconnects on auth change
 * Date: 2026-08-09
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

// Singleton socket instance (shared across component tree)
let _socket = null;
let _refCount = 0;

function getSocket(accessToken) {
  if (!_socket || !_socket.connected) {
    _socket = io('/', {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: true,
    });
  }
  return _socket;
}

/**
 * Connect to the Socket.io server and subscribe to events.
 *
 * @param {string|null} accessToken  - JWT access token for authentication
 * @param {Record<string, (data: any) => void>} handlers - Map of event→handler
 * @returns {{ connected: boolean, socket: import('socket.io-client').Socket|null, emit: Function }}
 */
export function useWebSocket(accessToken, handlers = {}) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const handlersRef = useRef(handlers);

  // Keep handlers ref up-to-date without re-subscribing
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket(accessToken);
    socketRef.current = socket;
    _refCount++;

    // Connection lifecycle
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) setConnected(true);

    // Dynamic event dispatch — new events delegated to latest handlers
    const onAny = (eventName, data) => {
      const handler = handlersRef.current[eventName];
      if (typeof handler === 'function') handler(data);
    };
    socket.onAny(onAny);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.offAny(onAny);
      _refCount--;
      if (_refCount <= 0) {
        socket.disconnect();
        _socket = null;
        _refCount = 0;
      }
    };
  }, [accessToken]);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { connected, socket: socketRef.current, emit };
}
