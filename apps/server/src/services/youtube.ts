import { SearchResult, parseISODuration } from '@karaoke/shared';
import { LRUCache } from 'lru-cache';

export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

export class YouTubeService {
  private cache: LRUCache<string, SearchResult[]>;

  constructor(private apiKey: string, cacheTtl: number) {
    this.cache = new LRUCache({
      max: 500,
      ttl: cacheTtl
    });
  }

  async search(query: string, karaokeOnly: boolean): Promise<{ results: SearchResult[], fromCache: boolean }> {
    let normalizedQuery = query.trim().toLowerCase();
    if (karaokeOnly && !normalizedQuery.includes('karaoke')) {
      normalizedQuery += ' karaoke';
    }

    const cached = this.cache.get(normalizedQuery);
    if (cached) {
      return { results: cached, fromCache: true };
    }

    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('videoEmbeddable', 'true');
    searchUrl.searchParams.set('videoSyndicated', 'true');
    searchUrl.searchParams.set('maxResults', '20');
    searchUrl.searchParams.set('regionCode', 'VN');
    searchUrl.searchParams.set('relevanceLanguage', 'vi');
    searchUrl.searchParams.set('q', normalizedQuery);
    searchUrl.searchParams.set('key', this.apiKey);

    const searchRes = await fetch(searchUrl.toString());
    if (!searchRes.ok) {
      if (searchRes.status === 403) {
        throw new QuotaExceededError('YouTube API quota exceeded');
      }
      throw new Error(`YouTube API error: ${searchRes.statusText}`);
    }

    const searchData = await searchRes.json();
    const videoIds = searchData.items?.map((item: any) => item.id.videoId).filter(Boolean) || [];

    if (videoIds.length === 0) {
      return { results: [], fromCache: false };
    }

    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    videosUrl.searchParams.set('part', 'contentDetails,status,snippet');
    videosUrl.searchParams.set('id', videoIds.join(','));
    videosUrl.searchParams.set('key', this.apiKey);

    const videosRes = await fetch(videosUrl.toString());
    if (!videosRes.ok) {
      if (videosRes.status === 403) {
        throw new QuotaExceededError('YouTube API quota exceeded');
      }
      throw new Error(`YouTube API error: ${videosRes.statusText}`);
    }

    const videosData = await videosRes.json();

    const results: SearchResult[] = videosData.items
      ?.filter((item: any) => item.status?.embeddable === true)
      .map((item: any) => ({
        videoId: item.id,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails.mqdefault?.url || item.snippet.thumbnails.default?.url,
        durationSec: parseISODuration(item.contentDetails.duration)
      })) || [];

    this.cache.set(normalizedQuery, results);
    return { results, fromCache: false };
  }

  async getVideoDetails(videoId: string): Promise<SearchResult | null> {
    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    videosUrl.searchParams.set('part', 'contentDetails,status,snippet');
    videosUrl.searchParams.set('id', videoId);
    videosUrl.searchParams.set('key', this.apiKey);

    const res = await fetch(videosUrl.toString());
    if (!res.ok) {
      if (res.status === 403) {
        throw new QuotaExceededError('YouTube API quota exceeded');
      }
      throw new Error(`YouTube API error: ${res.statusText}`);
    }

    const data = await res.json();
    const item = data.items?.[0];
    if (!item || item.status?.embeddable !== true) {
      return null;
    }

    return {
      videoId: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails.mqdefault?.url || item.snippet.thumbnails.default?.url,
      durationSec: parseISODuration(item.contentDetails.duration)
    };
  }
}
