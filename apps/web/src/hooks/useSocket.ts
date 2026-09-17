import { useEffect, useRef } from 'react';
import { socket, connectSocket, disconnectSocket } from '../lib/socket';
import { useRoomStore } from '../stores/roomStore';
import { useToastStore } from '../components/shared/Toast';
import { S2C } from '@karaoke/shared';

// Track if listeners are already set up (singleton across all useSocket calls)
let listenersSetUp = false;
let connectionCount = 0;

export const useSocket = () => {
  const hasSetUp = useRef(false);

  useEffect(() => {
    connectionCount++;
    connectSocket();

    // Only set up listeners once globally
    if (!listenersSetUp) {
      listenersSetUp = true;
      hasSetUp.current = true;

      const onConnect = () => useRoomStore.getState().setConnectionState('connected');
      const onDisconnect = () => useRoomStore.getState().setConnectionState('disconnected');
      const onConnectError = () => useRoomStore.getState().setConnectionState('connecting');

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('connect_error', onConnectError);

      socket.on(S2C.ROOM_STATE, (state) => {
        // Preserve client-only fields when merging server state
        const { nickname, isHost, connectionState, isConnected } = useRoomStore.getState();
        useRoomStore.getState().setRoomState(state);
        // Restore client-only fields that server doesn't know about
        if (nickname) {
          useRoomStore.setState({ nickname, isHost, connectionState, isConnected });
        }
      });

      socket.on(S2C.QUEUE_UPDATED, (data) => {
        const { queue, version } = data;
        // currentIndex may or may not be present
        const currentIndex = data.currentIndex !== undefined
          ? data.currentIndex
          : useRoomStore.getState().currentIndex;
        useRoomStore.getState().updateQueue(queue, currentIndex, version);
      });

      socket.on(S2C.PLAYER_STATE, (state) => {
        useRoomStore.getState().updatePlayerState(state);
      });

      socket.on(S2C.OVERLAY_STATE, ({ visible }) => {
        useRoomStore.getState().setOverlayVisible(visible);
      });

      socket.on(S2C.USER_JOINED, (user) => {
        const state = useRoomStore.getState();
        const exists = state.users.some(u => u.socketId === user.socketId);
        if (!exists) {
          useRoomStore.setState({ users: [...state.users, user] });
        }
      });

      socket.on(S2C.USER_LEFT, ({ socketId }) => {
        const state = useRoomStore.getState();
        useRoomStore.setState({
          users: state.users.filter(u => u.socketId !== socketId)
        });
      });

      socket.on(S2C.ERROR, (err) => {
        console.error('[Socket Error]', err);
        const message: string = err?.error || 'Đã xảy ra lỗi';
        if (/room not found/i.test(message)) {
          // The room no longer exists (e.g. server restarted). Reset local
          // join state so the UI can prompt the user again instead of showing
          // an empty, non-working screen.
          const { isHost } = useRoomStore.getState();
          if (isHost) {
            // TV: drop the stale saved code so a fresh room is created.
            localStorage.removeItem('tv_room_code');
          } else {
            localStorage.removeItem('remote_nickname');
            useRoomStore.setState({ nickname: '' });
          }
          useToastStore.getState().addToast('Phòng không tồn tại hoặc đã đóng. Vui lòng thử lại.', 'error');
        } else {
          useToastStore.getState().addToast(message, 'error');
        }
      });
    }

    return () => {
      connectionCount--;
      // Only disconnect when the LAST consumer unmounts (page-level)
      if (connectionCount <= 0) {
        connectionCount = 0;
        listenersSetUp = false;
        socket.removeAllListeners();
        disconnectSocket();
      }
    };
  }, []);

  return {
    isConnected: useRoomStore(s => s.isConnected),
  };
};