import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useProjectSocket(token, onEvent) {
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
    socket.on('project:event', (event) => onEventRef.current?.(event));

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return { connected };
}
