import { io } from 'socket.io-client';

// Socket.IO client instance
let socket: any = null;

/**
 * Initialize and return the socket connection
 * @returns {Socket} Socket.IO client instance
 */
export const getSocket = () => {
  if (!socket) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    // Determine WebSocket URL based on current protocol to avoid mixed content
    const getWebSocketUrl = () => {
      const normalizeBaseUrl = (raw?: string | null) => {
        if (!raw) {
          return null;
        }

        try {
          const hasProtocol = /^(https?|wss?):\/\//i.test(raw);
          const parsed = new URL(hasProtocol ? raw : `http://${raw}`);

          const protocol =
            parsed.protocol === 'https:' ? 'wss:' :
            parsed.protocol === 'http:' ? 'ws:' :
            parsed.protocol;

          return `${protocol}//${parsed.host}`;
        } catch {
          return null;
        }
      };

      const fallbackFromWindow = () => {
        if (typeof window === 'undefined') {
          return null;
        }
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}`;
      };

      const fallback = 'ws://localhost:3001';

      return (
        normalizeBaseUrl(process.env.NEXT_PUBLIC_WEBSOCKET_URL) ||
        normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL) ||
        fallbackFromWindow() ||
        fallback
      );
    };

    socket = io(`${getWebSocketUrl().replace(/\/+$/, '')}/realtime`, {
      transports: ['websocket'],
      auth: {
        token: token,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      autoConnect: true,
    });

    // Connection event handlers
    socket.on('connect', () => {
    });

    socket.on('disconnect', (reason: string) => {
    });

    socket.on('connect_error', (error: any) => {
      console.error('❌ Socket connection error:', error.message);
    });

    socket.on('reconnect', (attemptNumber: number) => {
    });

    socket.on('reconnect_attempt', (attemptNumber: number) => {
    });

    socket.on('reconnect_error', (error: any) => {
      console.error('❌ Socket reconnection error:', error.message);
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ Socket reconnection failed after all attempts');
    });

    // Server confirmation
    socket.on('connected', (data: any) => {
    });
  }

  return socket;
};

/**
 * Disconnect the socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Check if socket is connected
 * @returns {boolean}
 */
export const isSocketConnected = () => {
  return socket && socket.connected;
};

/**
 * Reconnect the socket
 */
export const reconnectSocket = () => {
  if (socket) {
    socket.connect();
  } else {
    getSocket();
  }
};

export default getSocket;
