import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryRoomStore } from '../store/memory';

describe('InMemoryRoomStore', () => {
  let store: InMemoryRoomStore;

  beforeEach(() => {
    store = new InMemoryRoomStore();
  });

  describe('createRoom', () => {
    it('should create a room with valid code', () => {
      const room = store.createRoom();
      expect(room.roomCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
      expect(room.queue).toEqual([]);
      expect(room.currentIndex).toBe(-1);
      expect(room.version).toBe(0);
      expect(room.users).toEqual([]);
      expect(room.playerState.state).toBe('idle');
    });

    it('should generate unique room codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 20; i++) {
        codes.add(store.createRoom().roomCode);
      }
      expect(codes.size).toBe(20);
    });
  });

  describe('addToQueue', () => {
    it('should add an item to the queue', () => {
      const room = store.createRoom();
      const item = makeQueueItem({ videoId: 'vid1', addedBy: 'Alice' });
      const updated = store.addToQueue(room.roomCode, item, 0);
      expect(updated.queue).toHaveLength(1);
      expect(updated.queue[0].videoId).toBe('vid1');
      expect(updated.version).toBe(1);
    });

    it('should reject duplicate videoId', () => {
      const room = store.createRoom();
      const item1 = makeQueueItem({ videoId: 'vid1', addedBy: 'Alice' });
      store.addToQueue(room.roomCode, item1, 0);
      const item2 = makeQueueItem({ videoId: 'vid1', addedBy: 'Bob' });
      expect(() => store.addToQueue(room.roomCode, item2, 1)).toThrow('DUPLICATE_VIDEO');
    });

    it('should allow a completed video to be added again', () => {
      const room = store.createRoom();
      store.addToQueue(room.roomCode, makeQueueItem({ videoId: 'vid1', addedBy: 'Alice' }), 0);
      store.addToQueue(room.roomCode, makeQueueItem({ videoId: 'vid2', addedBy: 'Bob' }), 1);
      store.advanceQueue(room.roomCode);

      const updated = store.addToQueue(
        room.roomCode,
        makeQueueItem({ videoId: 'vid1', addedBy: 'Alice' }),
        2
      );

      expect(updated.queue[2].videoId).toBe('vid1');
    });

    it('should reject on version mismatch', () => {
      const room = store.createRoom();
      const item = makeQueueItem({ videoId: 'vid1' });
      expect(() => store.addToQueue(room.roomCode, item, 99)).toThrow('VERSION_CONFLICT');
    });

    it('should reject when queue is full (100 items)', () => {
      const room = store.createRoom();
      for (let i = 0; i < 100; i++) {
        const item = makeQueueItem({ videoId: `vid${i}`, addedBy: `User${i % 20}` });
        store.addToQueue(room.roomCode, item, i);
      }
      const item = makeQueueItem({ videoId: 'overflow', addedBy: 'NewUser' });
      expect(() => store.addToQueue(room.roomCode, item, 100)).toThrow('QUEUE_FULL');
    });

    it('should reject when user has 10 items in queue', () => {
      const room = store.createRoom();
      for (let i = 0; i < 10; i++) {
        store.addToQueue(room.roomCode, makeQueueItem({ videoId: `vid${i}`, addedBy: 'Alice' }), i);
      }
      expect(() => store.addToQueue(room.roomCode, makeQueueItem({ videoId: 'vid99', addedBy: 'Alice' }), 10)).toThrow('USER_QUEUE_FULL');
    });

    it('should throw ROOM_NOT_FOUND for invalid code', () => {
      expect(() => store.addToQueue('XXXXXX', makeQueueItem(), 0)).toThrow('ROOM_NOT_FOUND');
    });

    it('should allow a user to add after their completed items have played', () => {
      const room = store.createRoom();
      for (let i = 0; i < 10; i++) {
        store.addToQueue(room.roomCode, makeQueueItem({ videoId: `played${i}`, addedBy: 'Alice' }), i);
      }

      for (let i = 0; i < 9; i++) {
        store.advanceQueue(room.roomCode);
      }

      const updated = store.addToQueue(
        room.roomCode,
        makeQueueItem({ videoId: 'new-song', addedBy: 'Alice' }),
        10
      );

      expect(updated.queue).toHaveLength(11);
      expect(updated.queue[10].videoId).toBe('new-song');
    });

    it('should exclude completed items from the total queue limit', () => {
      const room = store.createRoom();
      for (let i = 0; i < 100; i++) {
        store.addToQueue(room.roomCode, makeQueueItem({ videoId: `played${i}`, addedBy: `User${i}` }), i);
      }

      for (let i = 0; i < 99; i++) {
        store.advanceQueue(room.roomCode);
      }

      expect(() => store.addToQueue(
        room.roomCode,
        makeQueueItem({ videoId: 'new-song', addedBy: 'NewUser' }),
        100
      )).not.toThrow();
    });

  });

  describe('removeFromQueue', () => {
    it('should remove own item', () => {
      const room = store.createRoom();
      const item = makeQueueItem({ videoId: 'vid1', addedBy: 'Alice' });
      store.addToQueue(room.roomCode, item, 0);
      const updated = store.removeFromQueue(room.roomCode, item.id, 'Alice', false, 1);
      expect(updated.queue).toHaveLength(0);
    });

    it('should let host remove any item', () => {
      const room = store.createRoom();
      const item = makeQueueItem({ videoId: 'vid1', addedBy: 'Alice' });
      store.addToQueue(room.roomCode, item, 0);
      const updated = store.removeFromQueue(room.roomCode, item.id, 'Host', true, 1);
      expect(updated.queue).toHaveLength(0);
    });

    it('should reject non-owner non-host removal', () => {
      const room = store.createRoom();
      const item = makeQueueItem({ videoId: 'vid1', addedBy: 'Alice' });
      store.addToQueue(room.roomCode, item, 0);
      expect(() => store.removeFromQueue(room.roomCode, item.id, 'Bob', false, 1)).toThrow('NOT_AUTHORIZED');
    });

    it('should adjust currentIndex when removing before it', () => {
      const room = store.createRoom();
      const items = ['a', 'b', 'c'].map((v, i) => {
        const item = makeQueueItem({ videoId: `vid${v}`, addedBy: 'Host' });
        store.addToQueue(room.roomCode, item, i);
        return item;
      });
      // Added 3 items: currentIndex is 0 (first item playing)
      // Advance to index 2
      store.advanceQueue(room.roomCode); // currentIndex = 1
      store.advanceQueue(room.roomCode); // currentIndex = 2
      // Remove item at index 0 (before currentIndex 2)
      const updated = store.removeFromQueue(room.roomCode, items[0].id, 'Host', true, 3);
      expect(updated.currentIndex).toBe(1); // adjusted from 2 to 1 since item before was removed
    });
  });

  describe('reorderQueue', () => {
    it('should reorder items after currentIndex', () => {
      const room = store.createRoom();
      const items = ['a', 'b', 'c'].map((v, i) => {
        const item = makeQueueItem({ videoId: `vid${v}`, addedBy: 'Host' });
        store.addToQueue(room.roomCode, item, i);
        return item;
      });
      // Reorder: move last item (index 2) to index 1
      const updated = store.reorderQueue(room.roomCode, items[2].id, 1, 3);
      expect(updated.queue[1].videoId).toBe('vidc');
      expect(updated.queue[2].videoId).toBe('vidb');
    });

    it('should reject reordering past current index', () => {
      const room = store.createRoom();
      const item = makeQueueItem({ videoId: 'vid1', addedBy: 'Host' });
      store.addToQueue(room.roomCode, item, 0);
      store.advanceQueue(room.roomCode);
      expect(() => store.reorderQueue(room.roomCode, item.id, 0, 1)).toThrow('NOT_AUTHORIZED');
    });
  });

  describe('prioritizeInQueue', () => {
    it('should move item to currentIndex + 1', () => {
      const room = store.createRoom();
      const items = ['a', 'b', 'c', 'd'].map((v, i) => {
        const item = makeQueueItem({ videoId: `vid${v}`, addedBy: 'Host' });
        store.addToQueue(room.roomCode, item, i);
        return item;
      });
      // Initial currentIndex is 0 (playing item 'a')
      // Prioritize item 'd' (index 3) to position 1 (currentIndex + 1)
      const updated = store.prioritizeInQueue(room.roomCode, items[3].id, 4);
      expect(updated.queue[1].videoId).toBe('vidd');
    });
  });

  describe('advanceQueue', () => {
    it('should increment currentIndex', () => {
      const room = store.createRoom();
      store.addToQueue(room.roomCode, makeQueueItem({ videoId: 'v1' }), 0); // currentIndex is 0
      store.addToQueue(room.roomCode, makeQueueItem({ videoId: 'v2' }), 1); // currentIndex is 0
      const updated = store.advanceQueue(room.roomCode);
      expect(updated.currentIndex).toBe(1);
    });

    it('should not advance past queue length', () => {
      const room = store.createRoom();
      store.addToQueue(room.roomCode, makeQueueItem({ videoId: 'v1' }), 0); // currentIndex is 0
      const updated = store.advanceQueue(room.roomCode); // stays at 0 since queue.length is 1
      expect(updated.currentIndex).toBe(0);
    });
  });

  describe('user management', () => {
    it('should add and remove users', () => {
      const room = store.createRoom();
      const user = { socketId: 's1', nickname: 'Alice', joinedAt: Date.now(), isHost: false };
      store.addUser(room.roomCode, user);
      expect(store.getRoom(room.roomCode)!.users).toHaveLength(1);
      store.removeUser(room.roomCode, 's1');
      expect(store.getRoom(room.roomCode)!.users).toHaveLength(0);
    });
  });

  describe('stale room cleanup', () => {
    it('should identify stale rooms', () => {
      const room = store.createRoom();
      // Artificially set lastActivityAt to 3 hours ago
      const state = store.getRoom(room.roomCode)!;
      state.lastActivityAt = Date.now() - 3 * 60 * 60 * 1000;
      const stale = store.getStaleRooms(2 * 60 * 60 * 1000);
      expect(stale).toContain(room.roomCode);
    });

    it('should not flag active rooms', () => {
      const room = store.createRoom();
      const stale = store.getStaleRooms(2 * 60 * 60 * 1000);
      expect(stale).not.toContain(room.roomCode);
    });
  });
});

// Helper to create QueueItem
let counter = 0;
function makeQueueItem(overrides: Partial<{ videoId: string; addedBy: string }> = {}) {
  counter++;
  return {
    id: `item-${counter}-${Date.now()}`,
    videoId: overrides.videoId || `vid${counter}`,
    title: `Test Song ${counter}`,
    channelTitle: 'Test Channel',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    durationSec: 180,
    addedBy: overrides.addedBy || 'TestUser',
    addedAt: Date.now(),
  };
}
