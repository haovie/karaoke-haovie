import { RoomStore } from './types.js';
import { RoomState, QueueItem, UserInfo, PlayerState, generateRoomCode } from '@karaoke/shared';

const MAX_QUEUE_SIZE = 100;
const MAX_USER_QUEUE = 10;

export class InMemoryRoomStore implements RoomStore {
  private rooms = new Map<string, RoomState>();

  createRoom(desiredCode?: string): RoomState {
    let code: string;
    // Reuse the requested code when it's valid and free (e.g. a TV re-creating
    // its room with the same code after a server restart, so existing QR codes
    // keep working). Otherwise generate a fresh unique code.
    if (desiredCode && /^[A-HJ-NP-Z2-9]{6}$/.test(desiredCode) && !this.rooms.has(desiredCode)) {
      code = desiredCode;
    } else {
      do {
        code = generateRoomCode();
      } while (this.rooms.has(code));
    }

    const now = Date.now();
    const state: RoomState = {
      roomCode: code,
      queue: [],
      currentIndex: -1,
      version: 0,
      users: [],
      playerState: {
        videoId: null,
        currentTime: 0,
        duration: 0,
        state: 'idle',
        volume: 100
      },
      createdAt: now,
      lastActivityAt: now,
      blockedVideoIds: [],
      overlayVisible: false
    };

    this.rooms.set(code, state);
    return state;
  }

  getRoom(code: string): RoomState | undefined {
    return this.rooms.get(code);
  }

  deleteRoom(code: string): void {
    this.rooms.delete(code);
  }

  addToQueue(code: string, item: QueueItem, version: number): RoomState {
    const room = this.getRoom(code);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (room.version !== version) throw new Error('VERSION_CONFLICT');

    if (room.queue.some(q => q.videoId === item.videoId)) {
      throw new Error('DUPLICATE_VIDEO');
    }

    const activeQueue = room.queue.slice(Math.max(0, room.currentIndex));
    if (activeQueue.length >= MAX_QUEUE_SIZE) {
      throw new Error('QUEUE_FULL');
    }

    const userCount = activeQueue.filter(q => q.addedBy === item.addedBy).length;
    if (userCount >= MAX_USER_QUEUE) {
      throw new Error('USER_QUEUE_FULL');
    }

    room.queue.push(item);
    // Auto-start playback on the first song when nothing is currently playing.
    if (room.currentIndex === -1) {
      room.currentIndex = 0;
    }
    room.version++;
    this.touchRoom(code);
    return room;
  }

  removeFromQueue(code: string, itemId: string, nickname: string, isHost: boolean, version: number): RoomState {
    const room = this.getRoom(code);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (room.version !== version) throw new Error('VERSION_CONFLICT');

    const index = room.queue.findIndex(q => q.id === itemId);
    if (index === -1) throw new Error('ITEM_NOT_FOUND');

    const item = room.queue[index];
    if (!isHost && item.addedBy !== nickname) {
      throw new Error('NOT_AUTHORIZED');
    }

    room.queue.splice(index, 1);
    if (room.currentIndex >= index && room.currentIndex > 0) {
      room.currentIndex--;
    } else if (room.queue.length === 0) {
      room.currentIndex = -1;
    }

    room.version++;
    this.touchRoom(code);
    return room;
  }

  reorderQueue(code: string, itemId: string, newIndex: number, version: number): RoomState {
    const room = this.getRoom(code);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (room.version !== version) throw new Error('VERSION_CONFLICT');

    const index = room.queue.findIndex(q => q.id === itemId);
    if (index === -1) throw new Error('ITEM_NOT_FOUND');
    if (index <= room.currentIndex || newIndex <= room.currentIndex) {
      throw new Error('NOT_AUTHORIZED'); // can't reorder past history
    }
    
    if (newIndex >= room.queue.length) newIndex = room.queue.length - 1;

    const [item] = room.queue.splice(index, 1);
    room.queue.splice(newIndex, 0, item);
    
    room.version++;
    this.touchRoom(code);
    return room;
  }

  prioritizeInQueue(code: string, itemId: string, version: number): RoomState {
    const room = this.getRoom(code);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (room.version !== version) throw new Error('VERSION_CONFLICT');

    const index = room.queue.findIndex(q => q.id === itemId);
    if (index === -1) throw new Error('ITEM_NOT_FOUND');
    if (index <= room.currentIndex) throw new Error('NOT_AUTHORIZED');

    const [item] = room.queue.splice(index, 1);
    room.queue.splice(room.currentIndex + 1, 0, item);

    room.version++;
    this.touchRoom(code);
    return room;
  }

  addUser(code: string, user: UserInfo): RoomState {
    const room = this.getRoom(code);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    
    const existingIdx = room.users.findIndex(u => u.socketId === user.socketId);
    if (existingIdx !== -1) {
      room.users[existingIdx] = user;
    } else {
      room.users.push(user);
    }
    
    this.touchRoom(code);
    return room;
  }

  removeUser(code: string, socketId: string): RoomState {
    const room = this.getRoom(code);
    if (!room) throw new Error('ROOM_NOT_FOUND');

    room.users = room.users.filter(u => u.socketId !== socketId);
    this.touchRoom(code);
    return room;
  }

  updatePlayerState(code: string, state: PlayerState): RoomState {
    const room = this.getRoom(code);
    if (!room) throw new Error('ROOM_NOT_FOUND');

    room.playerState = state;
    this.touchRoom(code);
    return room;
  }

  advanceQueue(code: string): RoomState {
    const room = this.getRoom(code);
    if (!room) throw new Error('ROOM_NOT_FOUND');

    if (room.currentIndex < room.queue.length - 1) {
      room.currentIndex++;
    }
    this.touchRoom(code);
    return room;
  }

  setOverlayVisible(code: string, visible: boolean): RoomState {
    const room = this.getRoom(code);
    if (!room) throw new Error('ROOM_NOT_FOUND');

    room.overlayVisible = visible;
    this.touchRoom(code);
    return room;
  }

  touchRoom(code: string): void {
    const room = this.getRoom(code);
    if (room) {
      room.lastActivityAt = Date.now();
    }
  }

  getStaleRooms(maxIdleMs: number): string[] {
    const now = Date.now();
    const stale: string[] = [];
    for (const [code, room] of this.rooms.entries()) {
      if (now - room.lastActivityAt > maxIdleMs) {
        stale.push(code);
      }
    }
    return stale;
  }
}
