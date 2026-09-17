import { useEffect, useState } from 'react';
import { useSocket } from './useSocket';
import { useRoomStore } from '../stores/roomStore';
import { C2S } from '@karaoke/shared';
import { socket } from '../lib/socket';

export const useRoom = (type: 'tv' | 'remote', roomCodeParam?: string) => {
  const { isConnected } = useSocket();
  const { setNickname, setIsHost } = useRoomStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isConnected) return;

    setIsLoading(true);

    try {
      if (type === 'tv') {
        // TV: create a fresh room, or re-create/rejoin the saved one using the
        // same code so existing QR codes keep working even after a server
        // restart wiped the in-memory room.
        const savedCode = localStorage.getItem('tv_room_code');
        socket.emit(C2S.ROOM_CREATE, { nickname: 'Host', roomCode: savedCode || undefined });
        setIsHost(true);
      } else if (type === 'remote' && roomCodeParam) {
        // Remote: join room with nickname if available
        const storedNick = localStorage.getItem('remote_nickname');
        if (storedNick) {
          setNickname(storedNick);
          socket.emit(C2S.ROOM_JOIN, { roomCode: roomCodeParam, nickname: storedNick });
        }
        // If no nickname yet, NicknameModal will handle joining
      }
    } catch (err) {
      console.error('Room init error', err);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, type, roomCodeParam]);

  // Save room code to localStorage when received from server (TV only)
  const roomCode = useRoomStore(s => s.roomCode);
  useEffect(() => {
    if (type === 'tv' && roomCode) {
      localStorage.setItem('tv_room_code', roomCode);
    }
  }, [type, roomCode]);

  return { roomCode, isLoading };
};