import { create } from 'zustand';
import type { RoomState, QueueItem, PlayerState, UserInfo } from '@karaoke/shared';

interface RoomStoreState {
  roomCode: string;
  queue: QueueItem[];
  currentIndex: number;
  version: number;
  users: UserInfo[];
  playerState: PlayerState;
  nickname: string;
  isConnected: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected';
  isHost: boolean;
  overlayVisible: boolean;
  queuePanelBlurred: boolean;
  setRoomState: (state: RoomState) => void;
  updateQueue: (queue: QueueItem[], currentIndex: number, version: number) => void;
  updatePlayerState: (state: PlayerState) => void;
  setNickname: (name: string) => void;
  setConnectionState: (state: 'connecting' | 'connected' | 'disconnected') => void;
  setIsHost: (isHost: boolean) => void;
  setOverlayVisible: (visible: boolean) => void;
  setQueuePanelBlurred: (blurred: boolean) => void;
  reset: () => void;
  currentSong: () => QueueItem | null;
  nextSong: () => QueueItem | null;
  remainingCount: () => number;
  myQueueCount: (nickname: string) => number;
}

const defaultPlayerState: PlayerState = {
  videoId: null,
  currentTime: 0,
  duration: 0,
  state: 'idle',
  volume: 100,
};

export const useRoomStore = create<RoomStoreState>((set, get) => ({
  roomCode: '',
  queue: [],
  currentIndex: -1,
  version: 0,
  users: [],
  playerState: defaultPlayerState,
  nickname: '',
  isConnected: false,
  connectionState: 'disconnected',
  isHost: false,
  overlayVisible: false,
  queuePanelBlurred: false,

  setRoomState: (state) => set({ ...state }),
  updateQueue: (queue, currentIndex, version) => set({ queue, currentIndex, version }),
  updatePlayerState: (state) => set({ playerState: state }),
  setNickname: (nickname) => set({ nickname }),
  setConnectionState: (connectionState) => set({ connectionState, isConnected: connectionState === 'connected' }),
  setIsHost: (isHost) => set({ isHost }),

  setOverlayVisible: (overlayVisible) => set({ overlayVisible }),
  setQueuePanelBlurred: (queuePanelBlurred) => set({ queuePanelBlurred }),

  reset: () => set({ roomCode: '', queue: [], currentIndex: -1, version: 0, users: [], playerState: defaultPlayerState, isHost: false, overlayVisible: false, queuePanelBlurred: false }),
  
  currentSong: () => {
    const { queue, currentIndex } = get();
    return currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;
  },
  nextSong: () => {
    const { queue, currentIndex } = get();
    return currentIndex + 1 < queue.length ? queue[currentIndex + 1] : null;
  },
  remainingCount: () => {
    const { queue, currentIndex } = get();
    return Math.max(0, queue.length - (currentIndex + 1));
  },
  myQueueCount: (nickname: string) => {
    const { queue } = get();
    return queue.filter(q => q.addedBy === nickname).length;
  }
}));