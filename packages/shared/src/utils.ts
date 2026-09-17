// Characters allowed in room codes: A-Z excluding O and I, 2-9 excluding 0 and 1
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;

/**
 * Generate a random room code of 6 characters.
 * Excludes ambiguous characters: O/0 and I/1.
 */
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

/**
 * Parse a YouTube video ID from various URL formats.
 * Supports:
 *   - youtube.com/watch?v=ID
 *   - youtu.be/ID
 *   - youtube.com/embed/ID
 *   - youtube.com/shorts/ID
 *   - youtube.com/v/ID
 *   - Raw video ID (11 characters)
 *
 * Returns null if no valid ID is found.
 */
export function parseYouTubeUrl(input: string): string | null {
  if (!input) return null;

  const trimmed = input.trim();

  // Try as URL first
  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.replace('www.', '');

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      // /watch?v=ID
      const v = url.searchParams.get('v');
      if (v && isValidVideoId(v)) return v;

      // /embed/ID, /v/ID, /shorts/ID
      const pathMatch = url.pathname.match(/^\/(embed|v|shorts)\/([a-zA-Z0-9_-]{11})/);
      if (pathMatch && isValidVideoId(pathMatch[2])) return pathMatch[2];
    }

    if (hostname === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0];
      if (id && isValidVideoId(id)) return id;
    }
  } catch {
    // Not a valid URL, try as raw ID
  }

  // Try as raw video ID (exactly 11 chars of allowed characters)
  if (isValidVideoId(trimmed)) return trimmed;

  return null;
}

function isValidVideoId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}

/**
 * Parse ISO 8601 duration to seconds.
 * Examples: PT3M45S → 225, PT1H2M3S → 3723, PT30S → 30
 */
export function parseISODuration(iso: string): number {
  if (!iso) return 0;

  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format seconds to human-readable duration string.
 * Examples: 225 → "3:45", 3723 → "1:02:03", 30 → "0:30"
 */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 0) return '0:00';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}
