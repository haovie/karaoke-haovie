import { Server, Socket } from 'socket.io';
import { RoomStore } from '../store/types.js';
import { v4 as uuidv4 } from 'uuid';
import {
  C2S,
  S2C,
  roomJoinSchema,
  queueAddSchema,
  queueRemoveSchema,
  queueReorderSchema,
  queuePrioritySchema,
  playerSeekSchema,
  playerVolumeSchema,
  playerStateSchema,
  overlaySetSchema,
  RoomJoinPayload,
  QueueAddPayload,
  QueueRemovePayload,
  QueueReorderPayload,
  QueuePriorityPayload,
  PlayerSeekPayload,
  PlayerVolumePayload,
  PlayerStatePayload,
  OverlaySetPayload,
  QueueItem
} from '@karaoke/shared';

interface SocketData {
  nickname: string;
  roomCode: string;
  isHost: boolean;
}

export function setupSocketHandlers(io: Server, store: RoomStore) {
  io.on('connection', (socket: Socket) => {
    
    const socketData: Partial<SocketData> = {};

    socket.on(C2S.ROOM_CREATE, (data?: { nickname?: string; roomCode?: string }) => {
      try {
        // If the client (TV) provides a room code, rejoin it when it still
        // exists, or recreate it with the SAME code when the server lost it
        // (e.g. after a restart). This keeps previously shown QR codes valid.
        const desired = data?.roomCode;
        let room = desired ? store.getRoom(desired) : undefined;
        if (!room) {
          room = store.createRoom(desired);
        }
        socket.join(room.roomCode);

        const nickname = data?.nickname || 'Host';
        socketData.nickname = nickname;
        socketData.roomCode = room.roomCode;
        socketData.isHost = true;

        store.addUser(room.roomCode, {
          socketId: socket.id,
          nickname,
          joinedAt: Date.now(),
          isHost: true
        });

        socket.emit(S2C.ROOM_STATE, store.getRoom(room.roomCode));
      } catch (err: any) {
        socket.emit(S2C.ERROR, { error: err.message });
      }
    });

    socket.on(C2S.ROOM_JOIN, (data: RoomJoinPayload) => {
      try {
        const parsed = roomJoinSchema.parse(data);
        const room = store.getRoom(parsed.roomCode);
        
        if (!room) {
          return socket.emit(S2C.ERROR, { error: 'Room not found' });
        }

        socket.join(parsed.roomCode);
        socketData.nickname = parsed.nickname;
        socketData.roomCode = parsed.roomCode;
        socketData.isHost = false;

        const userInfo = {
          socketId: socket.id,
          nickname: parsed.nickname,
          joinedAt: Date.now(),
          isHost: false
        };

        store.addUser(parsed.roomCode, userInfo);

        socket.emit(S2C.ROOM_STATE, store.getRoom(parsed.roomCode));
        socket.to(parsed.roomCode).emit(S2C.USER_JOINED, userInfo);
      } catch (err: any) {
        socket.emit(S2C.ERROR, { error: err.message });
      }
    });

    socket.on(C2S.QUEUE_ADD, (data: QueueAddPayload) => {
      try {
        if (!socketData.roomCode) throw new Error('Not in a room');
        const parsed = queueAddSchema.parse(data);

        const item: QueueItem = {
          id: uuidv4(),
          videoId: parsed.videoId,
          title: parsed.title,
          channelTitle: parsed.channelTitle,
          thumbnailUrl: parsed.thumbnailUrl,
          durationSec: parsed.durationSec,
          addedBy: parsed.nickname,
          addedAt: Date.now()
        };

        const updatedRoom = store.addToQueue(socketData.roomCode, item, parsed.version);
        io.to(socketData.roomCode).emit(S2C.QUEUE_UPDATED, { queue: updatedRoom.queue, version: updatedRoom.version, currentIndex: updatedRoom.currentIndex });
      } catch (err: any) {
        socket.emit(S2C.ERROR, { error: err.message });
      }
    });

    socket.on(C2S.QUEUE_REMOVE, (data: QueueRemovePayload) => {
      try {
        if (!socketData.roomCode || !socketData.nickname) throw new Error('Not properly joined');
        const parsed = queueRemoveSchema.parse(data);

        const updatedRoom = store.removeFromQueue(socketData.roomCode, parsed.itemId, socketData.nickname, !!socketData.isHost, parsed.version);
        io.to(socketData.roomCode).emit(S2C.QUEUE_UPDATED, { queue: updatedRoom.queue, version: updatedRoom.version, currentIndex: updatedRoom.currentIndex });
      } catch (err: any) {
        socket.emit(S2C.ERROR, { error: err.message });
      }
    });

    socket.on(C2S.QUEUE_REORDER, (data: QueueReorderPayload) => {
      try {
        if (!socketData.roomCode) throw new Error('Not in a room');
        const parsed = queueReorderSchema.parse(data);

        const updatedRoom = store.reorderQueue(socketData.roomCode, parsed.itemId, parsed.newIndex, parsed.version);
        io.to(socketData.roomCode).emit(S2C.QUEUE_UPDATED, { queue: updatedRoom.queue, version: updatedRoom.version, currentIndex: updatedRoom.currentIndex });
      } catch (err: any) {
        socket.emit(S2C.ERROR, { error: err.message });
      }
    });

    socket.on(C2S.QUEUE_PRIORITY, (data: QueuePriorityPayload) => {
      try {
        if (!socketData.roomCode) throw new Error('Not in a room');
        const parsed = queuePrioritySchema.parse(data);

        const updatedRoom = store.prioritizeInQueue(socketData.roomCode, parsed.itemId, parsed.version);
        io.to(socketData.roomCode).emit(S2C.QUEUE_UPDATED, { queue: updatedRoom.queue, version: updatedRoom.version, currentIndex: updatedRoom.currentIndex });
      } catch (err: any) {
        socket.emit(S2C.ERROR, { error: err.message });
      }
    });

    socket.on(C2S.PLAYER_PLAY, () => {
      if (socketData.roomCode) {
        io.to(socketData.roomCode).emit(S2C.PLAYER_PLAY);
      }
    });

    socket.on(C2S.PLAYER_PAUSE, () => {
      if (socketData.roomCode) {
        io.to(socketData.roomCode).emit(S2C.PLAYER_PAUSE);
      }
    });

    socket.on(C2S.PLAYER_NEXT, () => {
      if (socketData.roomCode) {
        try {
          const room = store.advanceQueue(socketData.roomCode);
          io.to(socketData.roomCode).emit(S2C.QUEUE_UPDATED, { queue: room.queue, version: room.version, currentIndex: room.currentIndex });
          io.to(socketData.roomCode).emit(S2C.PLAYER_NEXT);
        } catch (err: any) {
          socket.emit(S2C.ERROR, { error: err.message });
        }
      }
    });

    socket.on(C2S.PLAYER_SEEK, (data: PlayerSeekPayload) => {
      try {
        if (!socketData.roomCode) throw new Error('Not in a room');
        const parsed = playerSeekSchema.parse(data);
        io.to(socketData.roomCode).emit(S2C.PLAYER_SEEK, parsed);
      } catch (err: any) {
        socket.emit(S2C.ERROR, { error: err.message });
      }
    });

    socket.on(C2S.PLAYER_VOLUME, (data: PlayerVolumePayload) => {
      try {
        if (!socketData.roomCode) throw new Error('Not in a room');
        const parsed = playerVolumeSchema.parse(data);
        io.to(socketData.roomCode).emit(S2C.PLAYER_VOLUME, parsed);
      } catch (err: any) {
        socket.emit(S2C.ERROR, { error: err.message });
      }
    });

    socket.on(C2S.PLAYER_STATE_REPORT, (data: PlayerStatePayload) => {
      try {
        if (!socketData.roomCode) throw new Error('Not in a room');
        const parsed = playerStateSchema.parse(data);
        store.updatePlayerState(socketData.roomCode, parsed);
        socket.to(socketData.roomCode).emit(S2C.PLAYER_STATE, parsed);
      } catch (err: any) {
        socket.emit(S2C.ERROR, { error: err.message });
      }
    });

    socket.on(C2S.OVERLAY_SET, (data: OverlaySetPayload) => {
      try {
        if (!socketData.roomCode) throw new Error('Not in a room');
        const parsed = overlaySetSchema.parse(data);
        store.setOverlayVisible(socketData.roomCode, parsed.visible);
        io.to(socketData.roomCode).emit(S2C.OVERLAY_STATE, parsed);
      } catch (err: any) {
        socket.emit(S2C.ERROR, { error: err.message });
      }
    });

    socket.on('disconnect', () => {
      if (socketData.roomCode) {
        try {
          store.removeUser(socketData.roomCode, socket.id);
          io.to(socketData.roomCode).emit(S2C.USER_LEFT, { socketId: socket.id });
        } catch (e) {
          // ignore
        }
      }
    });
  });
}
