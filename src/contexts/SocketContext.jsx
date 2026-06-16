// File: SocketContext.jsx | Date: 2026-06-16 | Nexus AI Pro
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { isAuthenticated, getAccessToken } = useAuth();
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const listenersRef = useRef(new Map());

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnected(false);
    setConnecting(false);
  }, []);

  const connect = useCallback(async () => {
    if (socketRef.current?.connected) return;
    disconnect();

    const token = getAccessToken();
    if (!token) return;

    setConnecting(true);
    setError(null);

    try {
      // Dynamically import socket.io-client to avoid hard dependency failure
      const { io } = await import('socket.io-client');

      const socket = io(window.location.origin, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
      });

      socket.on('connect', () => {
        setConnected(true);
        setConnecting(false);
        setError(null);

        // Re-register existing listeners on reconnect
        listenersRef.current.forEach((handlers, event) => {
          handlers.forEach((handler) => socket.on(event, handler));
        });
      });

      socket.on('disconnect', (reason) => {
        setConnected(false);
        if (reason === 'io server disconnect') {
          // Server-initiated disconnect, don't auto-reconnect
          setError('Disconnected by server');
        }
      });

      socket.on('connect_error', (err) => {
        setConnecting(false);
        setError(err.message || 'Connection error');
      });

      socketRef.current = socket;
    } catch (err) {
      setConnecting(false);
      setError('Socket.IO client not available');
      console.warn('[SocketContext] socket.io-client not installed:', err.message);
    }
  }, [getAccessToken, disconnect]);

  // Connect/disconnect based on auth state
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, connect, disconnect]);

  const on = useCallback((event, handler) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event).add(handler);

    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  }, []);

  const off = useCallback((event, handler) => {
    if (listenersRef.current.has(event)) {
      listenersRef.current.get(event).delete(handler);
      if (listenersRef.current.get(event).size === 0) {
        listenersRef.current.delete(event);
      }
    }

    if (socketRef.current) {
      socketRef.current.off(event, handler);
    }
  }, []);

  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
      return true;
    }
    console.warn('[SocketContext] Cannot emit, not connected:', event);
    return false;
  }, []);

  const joinRoom = useCallback((room) => {
    emit('join:room', { room });
  }, [emit]);

  const leaveRoom = useCallback((room) => {
    emit('leave:room', { room });
  }, [emit]);

  const value = {
    connected,
    connecting,
    error,
    on,
    off,
    emit,
    joinRoom,
    leaveRoom,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export default SocketContext;
