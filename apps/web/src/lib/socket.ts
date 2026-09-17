import { io, Socket } from 'socket.io-client';

export const socket: Socket = io('/', {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
});

export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export const emitWithAck = (event: string, data?: any): Promise<void> => {
  return new Promise((resolve) => {
    socket.emit(event, data);
    // Socket events are fire-and-forget; server broadcasts state updates
    resolve();
  });
};