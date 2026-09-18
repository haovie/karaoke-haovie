import type { RoomState, QueueItem, UserInfo, PlayerState } from '@karaoke/shared';

export interface RoomStore {
  createRoom(code?: string): RoomState;
  getRoom(code: string): RoomState | undefined;
  deleteRoom(code: string): void;
  addToQueue(code: string, item: QueueItem, version: number): RoomState;
  removeFromQueue(code: string, itemId: string, nickname: string, isHost: boolean, version: number): RoomState;
  reorderQueue(code: string, itemId: string, newIndex: number, version: number): RoomState;
  prioritizeInQueue(code: string, itemId: string, version: number): RoomState;
  addUser(code: string, user: UserInfo): RoomState;
  removeUser(code: string, socketId: string): RoomState;
  updatePlayerState(code: string, state: PlayerState): RoomState;
  advanceQueue(code: string): RoomState;
  touchRoom(code: string): void;
  getStaleRooms(maxIdleMs: number): string[];
  setOverlayVisible(code: string, visible: boolean): RoomState;
  setQueuePanelBlurred(code: string, blurred: boolean): RoomState;
}
