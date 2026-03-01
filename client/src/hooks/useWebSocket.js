import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Low-level WebSocket hook for managing WebSocket connections
 * @param {string} url - WebSocket server URL (default: ws://localhost:3001)
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoConnect - Auto-connect on mount (default: true)
 * @param {number} options.reconnectInterval - Reconnect interval in ms (default: 3000)
 * @param {number} options.maxReconnectAttempts - Max reconnect attempts (default: Infinity)
 * @returns {Object} WebSocket state and methods
 */
export function useWebSocket(url = 'ws://localhost:3001', options = {}) {
  // Use relative URL in development to go through Vite proxy
  const wsUrl = import.meta.env.DEV ? 'ws://localhost:3001' : url;
  const {
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = Infinity,
  } = options;

  const [connectionState, setConnectionState] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'error'
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const messageHandlersRef = useRef([]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState('connecting');
    setError(null);

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
        setError(null);
      };

      ws.onclose = (event) => {
        setConnectionState('disconnected');
        wsRef.current = null;

        // Attempt to reconnect if not closed intentionally
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (err) => {
        setError(err);
        setConnectionState('error');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          // Notify all registered handlers
          messageHandlersRef.current.forEach((handler) => {
            try {
              handler(data);
            } catch (handlerError) {
              console.error('Message handler error:', handlerError);
            }
          });
        } catch {
          setLastMessage(event.data);
          messageHandlersRef.current.forEach((handler) => {
            try {
              handler(event.data);
            } catch (handlerError) {
              console.error('Message handler error:', handlerError);
            }
          });
        }
      };

      wsRef.current = ws;
    } catch (err) {
      setError(err);
      setConnectionState('error');
    }
  }, [url, reconnectInterval, maxReconnectAttempts]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Client closed');
      wsRef.current = null;
    }

    setConnectionState('disconnected');
    reconnectAttemptsRef.current = 0;
  }, []);

  // Send message through WebSocket
  const send = useCallback((message) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected. Message not sent:', message);
      return false;
    }

    try {
      const data = typeof message === 'string' ? message : JSON.stringify(message);
      wsRef.current.send(data);
      return true;
    } catch (err) {
      console.error('Failed to send message:', err);
      return false;
    }
  }, []);

  // Register a message handler
  const onMessage = useCallback((handler) => {
    messageHandlersRef.current.push(handler);
    return () => {
      messageHandlersRef.current = messageHandlersRef.current.filter(
        (h) => h !== handler
      );
    };
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    lastMessage,
    error,
    send,
    connect,
    disconnect,
    onMessage,
  };
}

export default useWebSocket;
