import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { InMemoryRoomStore } from './store/memory.js';
import { YouTubeService } from './services/youtube.js';
import { createRouter } from './routes/api.js';
import { setupSocketHandlers } from './socket/handlers.js';

// Load env from the current working directory first (e.g. apps/server/.env or
// when env vars are injected by Docker), then fall back to the monorepo root
// .env so a single root-level .env works during local development regardless
// of which directory the process was started from.
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const port = process.env.PORT || 3001;
const corsOrigin = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST']
  }
});

const store = new InMemoryRoomStore();
const cacheTtl = parseInt(process.env.SEARCH_CACHE_TTL || '21600000', 10);
const youtube = new YouTubeService(process.env.YOUTUBE_API_KEY || '', cacheTtl);

app.use('/api', createRouter(store, youtube));

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

setupSocketHandlers(io, store);

// Room cleanup interval
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_IDLE_MS = 2 * 60 * 60 * 1000; // 2 hours

setInterval(() => {
  const staleRooms = store.getStaleRooms(MAX_IDLE_MS);
  for (const code of staleRooms) {
    store.deleteRoom(code);
    console.log(`Cleaned up stale room: ${code}`);
  }
}, CLEANUP_INTERVAL);

server.listen(port, () => {
  console.log(`🚀 Karaoke backend server running on port ${port}`);
});
