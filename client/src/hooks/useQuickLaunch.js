import { useState, useCallback, useRef, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';

/**
 * Hook for launching and managing npm scripts
 * @param {Object} options - Configuration options
 * @param {string} options.wsUrl - WebSocket server URL
 * @returns {Object} Quick launch state and methods
 */
export function useQuickLaunch(options = {}) {
  const { wsUrl = 'ws://localhost:3001' } = options;

  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const [currentLaunchId, setCurrentLaunchId] = useState(null);

  const logBufferRef = useRef([]);
  const launchIdRef = useRef(0);

  const {
    isConnected,
    send,
    onMessage,
    connectionState,
  } = useWebSocket(wsUrl);

  // Handle incoming WebSocket messages for launch logs
  useEffect(() => {
    const unsubscribe = onMessage((message) => {
      if (!message || typeof message !== 'object') return;

      const { type, payload, launchId } = message;

      // Only process messages for the current launch
      if (launchId && launchId !== currentLaunchId) {
        return;
      }

      switch (type) {
        case 'launch_started':
          setIsRunning(true);
          setError(null);
          setLogs([]);
          logBufferRef.current = [];
          if (payload?.launchId) {
            setCurrentLaunchId(payload.launchId);
          }
          break;

        case 'launch:log':
        case 'launch_log':
        case 'script_output':
        case 'stdout':
        case 'stderr':
          const logEntry = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            level: type === 'stderr' ? 'error' : 'info',
            message: (payload?.log || payload?.message || payload?.line || String(payload)),
            source: type,
          };
          logBufferRef.current.push(logEntry);
          // Batch update logs to avoid excessive re-renders
          setLogs((prev) => [...prev, logEntry]);
          break;

        case 'launch_complete':
        case 'script_complete':
          setIsRunning(false);
          setCurrentLaunchId(null);
          if (payload?.exitCode !== 0) {
            setError(`Script exited with code ${payload.exitCode}`);
          }
          break;

        case 'launch_error':
        case 'script_error':
          setIsRunning(false);
          setCurrentLaunchId(null);
          setError(payload?.message || 'Launch failed');
          break;

        case 'launch_stopped':
          setIsRunning(false);
          setCurrentLaunchId(null);
          logBufferRef.current.push({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            level: 'warning',
            message: 'Launch stopped by user',
            source: 'system',
          });
          break;

        default:
          break;
      }
    });

    return unsubscribe;
  }, [onMessage, currentLaunchId]);

  // Launch an npm script
  const launch = useCallback(
    async (launchOptions = {}) => {
      if (!isConnected) {
        setError('WebSocket not connected');
        return false;
      }

      if (isRunning) {
        setError('A script is already running. Stop it first.');
        return false;
      }

      const newLaunchId = ++launchIdRef.current;
      setError(null);
      setLogs([]);
      logBufferRef.current = [];

      const message = {
        type: 'launch',
        launchId: newLaunchId,
        ...launchOptions,
      };

      const sent = send(message);

      if (sent) {
        setCurrentLaunchId(newLaunchId);
        setIsRunning(true);
      }

      return sent;
    },
    [isConnected, isRunning, send]
  );

  // Stop the current launch
  const stop = useCallback(() => {
    if (!isRunning || !currentLaunchId) {
      return false;
    }

    const message = {
      type: 'stop',
      launchId: currentLaunchId,
    };

    return send(message);
  }, [isRunning, currentLaunchId, send]);

  // Clear logs
  const clearLogs = useCallback(() => {
    setLogs([]);
    logBufferRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRunning && currentLaunchId) {
        stop();
      }
    };
  }, [isRunning, currentLaunchId, stop]);

  return {
    launch,
    stop,
    logs,
    isRunning,
    error,
    clearLogs,
    isConnected,
    connectionState,
    currentLaunchId,
  };
}

export default useQuickLaunch;
