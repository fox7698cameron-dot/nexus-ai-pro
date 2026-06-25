/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Subscribes to the server's real-time `security:event` stream once a JWT is available,
 * so the Security Center can reflect live scans/threats/key-rotations without polling.
 */
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useSecuritySocket(token, onEvent) {
  const [connected, setConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!token) {
      setConnected(false);
      return;
    }

    const socket = io({ auth: { token } });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('security:event', (event) => onEventRef.current?.(event));

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return { connected };
}
