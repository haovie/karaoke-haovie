// ── Queue Item ──────────────────────────────────────────────────────────────
export type QueueItem = {
  id: string;            // uuid nội bộ
  videoId: string;       // YouTube video ID
  title: string;
  channelTitle: string;
  thumbnailUrl: string;  // https://i.ytimg.com/vi/<videoId>/mqdefault.jpg
  durationSec: number;
  addedBy: string;       // nickname
  addedAt: number;       // epoch ms
};

// ── Player State ────────────────────────────────────────────────────────────
export type PlayerStateStatus = 'idle' | 'playing' | 'paused' | 'ended' | 'buffering' | 'error';

export type PlayerState = {
  videoId: string | null;
  currentTime: number;
  duration: number;
  state: PlayerStateStatus;
  volume: number; // 0-100
};

// ── User ────────────────────────────────────────────────────────────────────
export type UserInfo = {
  socketId: string;
  nickname: string;
  joinedAt: number;
  isHost: boolean;
};

// ── Room State ──────────────────────────────────────────────────────────────
export type RoomState = {
  roomCode: string;
  queue: QueueItem[];
  currentIndex: number;  // -1 = nothing playing
  version: number;       // optimistic concurrency
  users: UserInfo[];
  playerState: PlayerState;
  createdAt: number;
  lastActivityAt: number;
  blockedVideoIds: string[];
  overlayVisible: boolean; // hiển thị thông tin bài hát trên màn hình TV
  queuePanelBlurred: boolean; // làm mờ bảng bài hát tiếp theo trên màn hình TV
};

// ── Search Result ───────────────────────────────────────────────────────────
export type SearchResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSec: number;
};

// ── API Responses ───────────────────────────────────────────────────────────
export type CreateRoomResponse = {
  roomCode: string;
};

export type SearchResponse = {
  results: SearchResult[];
  fromCache: boolean;
};

export type ErrorResponse = {
  error: string;
  code?: string;
};

// ── Socket Payloads ─────────────────────────────────────────────────────────
export type QueueAddPayload = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSec: number;
  nickname: string;
  version: number;
};

export type QueueRemovePayload = {
  itemId: string;
  nickname: string;
  version: number;
};

export type QueueReorderPayload = {
  itemId: string;
  newIndex: number;
  version: number;
};

export type QueuePriorityPayload = {
  itemId: string;
  version: number;
};

export type PlayerSeekPayload = {
  time: number;
};

export type PlayerVolumePayload = {
  volume: number;
};

export type OverlaySetPayload = {
  visible: boolean;
};

export type QueuePanelBlurSetPayload = {
  blurred: boolean;
};

export type RoomJoinPayload = {
  roomCode: string;
  nickname: string;
};

export type PlayerStatePayload = {
  videoId: string | null;
  currentTime: number;
  duration: number;
  state: PlayerStateStatus;
  volume: number;
};
