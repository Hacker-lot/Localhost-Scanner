import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';

/**
 * Hook for port scanning functionality
 * @param {Object} options - Configuration options
 * @param {number} options.autoScanInterval - Auto-scan interval in ms (default: 30000)
 * @param {boolean} options.autoScanOnMount - Start auto-scan on mount (default: false)
 * @param {string} options.wsUrl - WebSocket server URL
 * @returns {Object} Port scanner state and methods
 */
export function usePortScanner(options = {}) {
  const {
    autoScanInterval = 30000,
    autoScanOnMount = false,
    wsUrl = 'ws://localhost:3001',
  } = options;

  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanProgress, setScanProgress] = useState(null);

  const autoScanTimerRef = useRef(null);
  const scanIdRef = useRef(0);

  const {
    connectionState,
    isConnected,
    send,
    onMessage,
    lastMessage,
  } = useWebSocket(wsUrl);

  // Handle incoming WebSocket messages
  useEffect(() => {
    const unsubscribe = onMessage((message) => {
      if (!message || typeof message !== 'object') return;

      const { type, data, payload } = message;

      switch (type) {
        case 'ports:update':
          setLoading(false);
          setError(null);
          setScanProgress(null);
          if (data || payload) {
            setPorts(data || payload);
          }
          break;

        case 'scan_error':
          setLoading(false);
          setScanProgress(null);
          setError((data || payload)?.message || 'Scan failed');
          break;

        case 'scan_started':
          setLoading(true);
          setError(null);
          setScanProgress(payload?.progress || null);
          break;

        case 'scan_progress':
          setScanProgress(payload?.progress || null);
          if (payload?.ports) {
            setPorts((prev) => {
              // Merge new ports with existing, avoiding duplicates
              const existingIds = new Set(prev.map((p) => p.id || p.port));
              const newPorts = (payload.ports || []).filter(
                (p) => !existingIds.has(p.id || p.port)
              );
              return [...prev, ...newPorts];
            });
          }
          break;

        case 'scan_complete':
          setLoading(false);
          setScanProgress(null);
          if (payload?.ports) {
            setPorts(payload.ports);
          }
          break;

        case 'port_found':
          setPorts((prev) => {
            const exists = prev.some((p) => p.port === payload?.port);
            if (exists) return prev;
            return [...prev, payload];
          });
          break;

        default:
          console.log('Unknown message type:', type);
          break;
      }
    });

    return unsubscribe;
  }, [onMessage]);

  // Trigger a port scan
  const scan = useCallback(
    (scanOptions = {}) => {
      if (!isConnected) {
        setError('WebSocket not connected');
        return false;
      }

      const currentScanId = ++scanIdRef.current;
      setLoading(true);
      setError(null);
      setPorts([]);
      setScanProgress(null);

      const message = {
        type: 'scan:start',
        scanId: currentScanId,
        ...scanOptions,
      };

      return send(message);
    },
    [isConnected, send]
  );

  // Start auto-scan
  const startAutoScan = useCallback(
    (interval = autoScanInterval) => {
      if (autoScanTimerRef.current) {
        return; // Already running
      }

      const runScan = () => {
        scan();
      };

      // Run initial scan immediately
      runScan();

      // Set up interval for subsequent scans
      autoScanTimerRef.current = setInterval(runScan, interval);
    },
    [scan, autoScanInterval]
  );

  // Stop auto-scan
  const stopAutoScan = useCallback(() => {
    if (autoScanTimerRef.current) {
      clearInterval(autoScanTimerRef.current);
      autoScanTimerRef.current = null;
    }
  }, []);

  // Auto-scan on mount if configured
  useEffect(() => {
    if (autoScanOnMount) {
      startAutoScan(autoScanInterval);
    }

    return () => {
      stopAutoScan();
    };
  }, [autoScanOnMount, autoScanInterval, startAutoScan, stopAutoScan]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoScan();
    };
  }, [stopAutoScan]);

  return {
    ports,
    loading,
    error,
    scan,
    startAutoScan,
    stopAutoScan,
    scanProgress,
    isConnected,
    connectionState,
  };
}

export default usePortScanner;
