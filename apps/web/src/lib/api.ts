import type { SearchResult, CreateRoomResponse, ErrorResponse } from '@karaoke/shared';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ErrorResponse).error || 'API Error');
  }
  return data as T;
}

export const api = {
  searchSongs: (query: string, karaokeOnly: boolean): Promise<SearchResult[]> => {
    return fetchJson<{results: SearchResult[]}>(`/api/search?q=${encodeURIComponent(query)}&karaokeOnly=${karaokeOnly}`).then(res => res.results);
  },
  getVideoDetails: (videoId: string): Promise<SearchResult | null> => {
    return fetchJson<SearchResult | null>(`/api/video/${encodeURIComponent(videoId)}`);
  },
  createRoom: (): Promise<string> => {
    return fetchJson<CreateRoomResponse>('/api/rooms', { method: 'POST' }).then(res => res.roomCode);
  }
};