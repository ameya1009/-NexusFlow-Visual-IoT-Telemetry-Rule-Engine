import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';
const THROTTLE_MS = 300;

export function useTelemetrySocket(onNodeActive) {
  const [liveReadings, setLiveReadings] = useState([]);
  const [latestReading, setLatestReading] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connected' | 'reconnecting' | 'disconnected'

  const bufferRef = useRef([]);
  const lastFlushRef = useRef(0);
  const timerRef = useRef(null);
  const onNodeActiveRef = useRef(onNodeActive);

  useEffect(() => {
    onNodeActiveRef.current = onNodeActive;
  }, [onNodeActive]);

  useEffect(() => {
    const flushBuffer = () => {
      if (bufferRef.current.length === 0) return;
      const incomingBatch = [...bufferRef.current].reverse();
      bufferRef.current = [];
      lastFlushRef.current = Date.now();

      setLatestReading(incomingBatch[0]);
      setLiveReadings((prev) => [...incomingBatch, ...prev].slice(0, 50));
    };

    const scheduleFlush = () => {
      const elapsed = Date.now() - lastFlushRef.current;
      if (elapsed >= THROTTLE_MS) {
        flushBuffer();
      } else if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          flushBuffer();
        }, THROTTLE_MS - elapsed);
      }
    };

    const socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      setConnectionStatus('connected');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('reconnecting');
    });

    socket.io.on('reconnect_attempt', () => {
      setConnectionStatus('reconnecting');
    });

    socket.io.on('reconnect', () => {
      setConnectionStatus('connected');
    });

    socket.on('telemetry:update', (data) => {
      const normalized = {
        ...data,
        timestamp: data?.timestamp || new Date().toLocaleTimeString(),
        value: Number(data?.value ?? 0),
      };
      bufferRef.current.push(normalized);
      scheduleFlush();
    });

    socket.on('alert:fired', (alertPayload) => {
      const entry = {
        id: alertPayload?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        message: alertPayload?.message || 'Rule threshold triggered',
        severity: alertPayload?.severity || 'warning',
        ruleId: alertPayload?.ruleId || alertPayload?.nodeId || 'rule',
        value: alertPayload?.value,
        timestamp: alertPayload?.timestamp || new Date().toLocaleTimeString(),
      };
      setAlerts((prev) => [entry, ...prev].slice(0, 30));
    });

    socket.on('node:active', ({ nodeId }) => {
      if (typeof onNodeActiveRef.current === 'function') {
        onNodeActiveRef.current(nodeId);
      }
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      socket.disconnect();
      setConnectionStatus('disconnected');
    };
  }, []);

  return {
    liveReadings,
    latestReading,
    alerts,
    connectionStatus,
    isConnected: connectionStatus === 'connected',
  };
}