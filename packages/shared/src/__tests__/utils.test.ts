import { describe, it, expect } from 'vitest';
import { generateRoomCode, parseYouTubeUrl, parseISODuration, formatDuration } from '../utils';

describe('generateRoomCode', () => {
  it('should generate a 6-character code', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
  });

  it('should only contain allowed characters (A-HJ-NP-Z2-9)', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateRoomCode();
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
  });

  it('should not contain ambiguous characters O, 0, I, 1', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateRoomCode();
      expect(code).not.toMatch(/[O01I]/);
    }
  });

  it('should generate unique codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      codes.add(generateRoomCode());
    }
    // With 30^6 possibilities, 50 codes should all be unique
    expect(codes.size).toBe(50);
  });
});

describe('parseYouTubeUrl', () => {
  it('should parse youtube.com/watch?v= format', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should parse youtu.be/ short URL', () => {
    expect(parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should parse youtube.com/embed/ format', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should parse youtube.com/shorts/ format', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should parse youtube.com/v/ format', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/v/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should parse mobile youtube URLs', () => {
    expect(parseYouTubeUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should parse raw video ID', () => {
    expect(parseYouTubeUrl('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should handle URLs with extra parameters', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLtest&index=1')).toBe('dQw4w9WgXcQ');
  });

  it('should handle URLs with timestamps', () => {
    expect(parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?t=120')).toBe('dQw4w9WgXcQ');
  });

  it('should return null for invalid input', () => {
    expect(parseYouTubeUrl('')).toBeNull();
    expect(parseYouTubeUrl('not a url')).toBeNull();
    expect(parseYouTubeUrl('https://example.com')).toBeNull();
    expect(parseYouTubeUrl('abc')).toBeNull();
  });

  it('should handle whitespace around input', () => {
    expect(parseYouTubeUrl('  dQw4w9WgXcQ  ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeUrl('  https://youtu.be/dQw4w9WgXcQ  ')).toBe('dQw4w9WgXcQ');
  });

  it('should handle IDs with hyphens and underscores', () => {
    expect(parseYouTubeUrl('abc-def_gh1')).toBe('abc-def_gh1');
  });
});

describe('parseISODuration', () => {
  it('should parse PT3M45S (3 min 45 sec)', () => {
    expect(parseISODuration('PT3M45S')).toBe(225);
  });

  it('should parse PT1H2M3S (1 hour 2 min 3 sec)', () => {
    expect(parseISODuration('PT1H2M3S')).toBe(3723);
  });

  it('should parse PT30S (30 sec)', () => {
    expect(parseISODuration('PT30S')).toBe(30);
  });

  it('should parse PT5M (5 min, no seconds)', () => {
    expect(parseISODuration('PT5M')).toBe(300);
  });

  it('should parse PT1H (1 hour only)', () => {
    expect(parseISODuration('PT1H')).toBe(3600);
  });

  it('should return 0 for empty/invalid input', () => {
    expect(parseISODuration('')).toBe(0);
    expect(parseISODuration('invalid')).toBe(0);
  });
});

describe('formatDuration', () => {
  it('should format seconds to mm:ss', () => {
    expect(formatDuration(225)).toBe('3:45');
  });

  it('should format to h:mm:ss for hours', () => {
    expect(formatDuration(3723)).toBe('1:02:03');
  });

  it('should format 30 seconds', () => {
    expect(formatDuration(30)).toBe('0:30');
  });

  it('should format 0 seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('should handle negative numbers', () => {
    expect(formatDuration(-5)).toBe('0:00');
  });

  it('should pad single-digit seconds', () => {
    expect(formatDuration(61)).toBe('1:01');
  });
});
