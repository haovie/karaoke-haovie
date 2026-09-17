import { Router } from 'express';
import { RoomStore } from '../store/types.js';
import { YouTubeService, QuotaExceededError } from '../services/youtube.js';
import { searchRateLimiter } from '../services/rateLimiter.js';
import { roomCodeSchema } from '@karaoke/shared';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createRouter(store: RoomStore, youtube: YouTubeService): ReturnType<typeof Router> {
  const router = Router();

  router.post('/rooms', (req, res) => {
    try {
      const room = store.createRoom();
      res.json({ roomCode: room.roomCode });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/rooms/:code', (req, res) => {
    const code = req.params.code;
    const parsed = roomCodeSchema.safeParse(code);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid room code format' });
    }

    const room = store.getRoom(parsed.data);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Return public fields
    res.json(room);
  });

  router.get('/search', searchRateLimiter, async (req, res) => {
    const q = req.query.q as string;
    const karaokeOnly = req.query.karaokeOnly === 'true';

    if (!q) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }

    try {
      const result = await youtube.search(q, karaokeOnly);
      res.json(result);
    } catch (err: any) {
      if (err instanceof QuotaExceededError) {
        try {
          const songsData = await fs.readFile(path.join(__dirname, '../data/songs.json'), 'utf-8');
          const songs = JSON.parse(songsData);
          // Simple client side filter fallback
          const normalized = q.toLowerCase();
          const filtered = songs.filter((s: any) => s.title.toLowerCase().includes(normalized) || s.channelTitle.toLowerCase().includes(normalized));
          res.json({ results: filtered, fromCache: true });
        } catch (readErr) {
          res.status(500).json({ error: 'YouTube API quota exceeded and fallback failed' });
        }
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  router.get('/video/:videoId', async (req, res) => {
    const videoId = req.params.videoId;
    if (!videoId) {
      return res.status(400).json({ error: 'Missing videoId' });
    }

    try {
      const details = await youtube.getVideoDetails(videoId);
      if (!details) {
        return res.status(404).json({ error: 'Video not found or not embeddable' });
      }
      res.json(details);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
