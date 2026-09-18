// ── Client → Server Events ──────────────────────────────────────────────────
export const C2S = {
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  QUEUE_ADD: 'queue:add',
  QUEUE_REMOVE: 'queue:remove',
  QUEUE_REORDER: 'queue:reorder',
  QUEUE_PRIORITY: 'queue:priority',
  PLAYER_PLAY: 'player:play',
  PLAYER_PAUSE: 'player:pause',
  PLAYER_NEXT: 'player:next',
  PLAYER_SEEK: 'player:seek',
  PLAYER_VOLUME: 'player:volume',
  PLAYER_STATE_REPORT: 'player:state:report',
  OVERLAY_SET: 'overlay:set',
  QUEUE_PANEL_BLUR_SET: 'queue-panel:blur:set',
} as const;

// ── Server → Client Events ──────────────────────────────────────────────────
export const S2C = {
  ROOM_STATE: 'room:state',
  QUEUE_UPDATED: 'queue:updated',
  PLAYER_STATE: 'player:state',
  PLAYER_PLAY: 'player:play',
  PLAYER_PAUSE: 'player:pause',
  PLAYER_NEXT: 'player:next',
  PLAYER_SEEK: 'player:seek',
  PLAYER_VOLUME: 'player:volume',
  USER_JOINED: 'user:joined',
  USER_LEFT: 'user:left',
  ERROR: 'error',
  OVERLAY_STATE: 'overlay:state',
  QUEUE_PANEL_BLUR_STATE: 'queue-panel:blur:state',
} as const;

export type C2SEvent = (typeof C2S)[keyof typeof C2S];
export type S2CEvent = (typeof S2C)[keyof typeof S2C];
