import { z } from 'zod';

// ── Queue Schemas ───────────────────────────────────────────────────────────
export const queueAddSchema = z.object({
  videoId: z.string().min(1).max(20),
  title: z.string().min(1).max(500),
  channelTitle: z.string().min(1).max(200),
  thumbnailUrl: z.string().url(),
  durationSec: z.number().int().min(0),
  nickname: z.string().min(1).max(30),
  version: z.number().int().min(0),
});

export const queueRemoveSchema = z.object({
  itemId: z.string().uuid(),
  nickname: z.string().min(1).max(30),
  version: z.number().int().min(0),
});

export const queueReorderSchema = z.object({
  itemId: z.string().uuid(),
  newIndex: z.number().int().min(0),
  version: z.number().int().min(0),
});

export const queuePrioritySchema = z.object({
  itemId: z.string().uuid(),
  version: z.number().int().min(0),
});

// ── Player Schemas ──────────────────────────────────────────────────────────
export const playerSeekSchema = z.object({
  time: z.number().min(0),
});

export const playerVolumeSchema = z.object({
  volume: z.number().int().min(0).max(100),
});

export const overlaySetSchema = z.object({
  visible: z.boolean(),
});

export const queuePanelBlurSetSchema = z.object({
  blurred: z.boolean(),
});

export const playerStateSchema = z.object({
  videoId: z.string().nullable(),
  currentTime: z.number().min(0),
  duration: z.number().min(0),
  state: z.enum(['idle', 'playing', 'paused', 'ended', 'buffering', 'error']),
  volume: z.number().int().min(0).max(100),
});

// ── Room Schemas ────────────────────────────────────────────────────────────
export const roomJoinSchema = z.object({
  roomCode: z.string().length(6).regex(/^[A-HJ-NP-Z2-9]{6}$/),
  nickname: z.string().min(1).max(30),
});

export const roomCodeSchema = z.string().length(6).regex(/^[A-HJ-NP-Z2-9]{6}$/);
