import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function useTelemetrySocket(onNodeActive) {
  const [liveReadings, setLiveReadings] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io('http://localhost:5000', {
      autoConnect: true,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to NexusFlow telemetry stream!');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('telemetry:update', (data) => {
      setLiveReadings((prev) => [data, ...prev.slice(0, 50)]);
    });

    socket.on('node:active', ({ nodeId }) => {
      console.log(`Node ${nodeId} is processing data!`);
      if (typeof onNodeActive === 'function') {
        onNodeActive(nodeId);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [onNodeActive]);

  return { liveReadings, isConnected };
}