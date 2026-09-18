import { PlayerStateStatus, PlayerState } from '@karaoke/shared';

export interface PlayerAdapter {
  load(videoId: string): void;
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  setVolume(volume: number): void;
  getState(): PlayerState;
  destroy(): void;
  on(event: 'stateChange' | 'error' | 'ready', callback: (data?: any) => void): void;
}

const YT_IFRAME_API_SRC = 'https://www.youtube.com/iframe_api';
let ytApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window !== 'undefined' && window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${YT_IFRAME_API_SRC}"]`);
    const previousCallback = window.onYouTubeIframeAPIReady;
    let settled = false;
    let timeoutId: number | null = null;

    const cleanup = () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };

    const succeed = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (!window.YT?.Player) {
        ytApiPromise = null;
        reject(new Error('YouTube IFrame API loaded but window.YT.Player is missing'));
        return;
      }
      resolve();
    };

    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      ytApiPromise = null;
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    window.onYouTubeIframeAPIReady = () => {
      try { previousCallback?.(); } catch {}
      succeed();
    };

    timeoutId = window.setTimeout(() => {
      fail(new Error('Timed out loading YouTube IFrame API'));
    }, 15000);

    if (existing) {
      existing.addEventListener('error', () => fail(new Error('Failed to load YouTube IFrame API script')), { once: true });
      return;
    }

    const tag = document.createElement('script');
    tag.src = YT_IFRAME_API_SRC;
    tag.async = true;
    tag.addEventListener('error', () => fail(new Error('Failed to load YouTube IFrame API script')), { once: true });
    const firstScriptTag = document.getElementsByTagName('script')[0];
    if (firstScriptTag?.parentNode) firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    else (document.head ?? document.documentElement).appendChild(tag);
  });

  return ytApiPromise;
}

export class YouTubePlayerAdapter implements PlayerAdapter {
  private player: YT.Player | null = null;
  private isReady = false;
  private targetId: string;
  private callbacks: Record<string, ((data?: any) => void)[]> = { stateChange: [], error: [], ready: [] };
  private reportInterval: number | null = null;
  private currentVideoId: string | null = null;
  private hasInteracted = false;
  private destroyed = false;
  private initPromise: Promise<void> | null = null;

  constructor(targetId: string) {
    this.targetId = targetId;
    this.initPromise = this.init();
  }

  private async init() {
    try {
      await loadYouTubeApi();
      if (this.destroyed) return;
      this.createPlayer();
    } catch (err) {
      if (this.destroyed) return;
      this.emit('error', err instanceof Error ? err.message : String(err));
    }
  }

  private createPlayer() {
    if (this.destroyed || this.player) return;
    if (!window.YT?.Player) {
      this.emit('error', 'YouTube player API is not available');
      return;
    }
    const target = document.getElementById(this.targetId);
    if (!target) {
      this.emit('error', `YouTube player target #${this.targetId} not found`);
      return;
    }
    try {
      this.player = new window.YT.Player(this.targetId, {
      playerVars: {
        autoplay: 1,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        disablekb: 1,
        playsinline: 1,
        cc_load_policy: 0
      },
      events: {
        onReady: this.handleReady.bind(this),
        onStateChange: this.handleStateChange.bind(this),
        onError: this.handleError.bind(this)
      }
      });
    } catch (err) {
      this.emit('error', err instanceof Error ? err.message : String(err));
    }
  }

  private handleReady() {
    this.isReady = true;
    this.player?.mute(); // Mute initially due to browser autoplay policies
    if (this.currentVideoId) this.player?.loadVideoById(this.currentVideoId);
    this.emit('ready');
    
    this.reportInterval = window.setInterval(() => {
      this.emit('stateChange');
    }, 1000);
  }

  private handleStateChange(event: YT.OnStateChangeEvent) {
    if (event.data === window.YT.PlayerState.PLAYING && !this.hasInteracted) {
      // Browser autoplay policy might pause it if unmuted without interaction. 
      // Leave it up to UI to unmute.
    }
    this.emit('stateChange');
  }

  private handleError(event: YT.OnErrorEvent) {
    this.emit('error', event.data);
  }

  public load(videoId: string) {
    this.currentVideoId = videoId;
    if (this.isReady && this.player) {
      this.player.loadVideoById(videoId);
    }
  }

  public play() {
    if (this.isReady && this.player) this.player.playVideo();
  }

  public pause() {
    if (this.isReady && this.player) this.player.pauseVideo();
  }

  public seek(seconds: number) {
    if (this.isReady && this.player) this.player.seekTo(seconds, true);
  }

  public setVolume(volume: number) {
    if (this.isReady && this.player) {
      this.player.setVolume(volume);
      if (volume > 0 && this.player.isMuted()) {
        this.player.unMute();
      }
    }
  }

  public getState(): PlayerState {
    if (!this.isReady || !this.player || !this.player.getPlayerState) {
      return {
        videoId: this.currentVideoId,
        currentTime: 0,
        duration: 0,
        state: 'idle',
        volume: 100
      };
    }

    const stateMap: Record<number, PlayerStateStatus> = {
      [-1]: 'idle',
      [0]: 'ended',
      [1]: 'playing',
      [2]: 'paused',
      [3]: 'buffering',
      [5]: 'idle'
    };
    
    let ytState = -1;
    try { ytState = this.player.getPlayerState(); } catch(e){}

    return {
      videoId: this.currentVideoId,
      currentTime: this.player.getCurrentTime() || 0,
      duration: this.player.getDuration() || 0,
      state: stateMap[ytState] || 'idle',
      volume: this.player.isMuted() ? 0 : (this.player.getVolume() || 100)
    };
  }

  public destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.isReady = false;
    if (this.reportInterval !== null) {
      window.clearInterval(this.reportInterval);
      this.reportInterval = null;
    }
    if (this.player) {
      try { this.player.destroy(); } catch {}
      this.player = null;
    }
    this.callbacks = { stateChange: [], error: [], ready: [] };
  }

  public on(event: 'stateChange' | 'error' | 'ready', callback: (data?: any) => void) {
    this.callbacks[event].push(callback);
  }

  private emit(event: 'stateChange' | 'error' | 'ready', data?: any) {
    this.callbacks[event].forEach(cb => cb(data));
  }
}