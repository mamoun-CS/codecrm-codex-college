'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getSocket, disconnectSocket, isSocketConnected } from '../lib/socket';

interface SocketContextType {
  socket: any;
  isConnected: boolean;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = getSocket();
    setSocket(socketInstance);

    // Set up connection status listener
    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleConnectError = (error: any) => {
      console.error('❌ Global socket connection error:', error.message);
      setIsConnected(false);
    };

    // Listen for connection events
    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.on('connect_error', handleConnectError);

    // Set initial connection status
    setIsConnected(socketInstance.connected);

    // Cleanup function
    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.off('connect_error', handleConnectError);
    };
  }, []);

  const reconnect = () => {
    if (socket) {
      socket.connect();
    } else {
      const newSocket = getSocket();
      setSocket(newSocket);
    }
  };

  const value = {
    socket,
    isConnected,
    reconnect,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}