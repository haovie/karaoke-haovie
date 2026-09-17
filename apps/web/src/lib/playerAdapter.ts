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

export class YouTubePlayerAdapter implements PlayerAdapter {
  private player: YT.Player | null = null;
  private isReady = false;
  private targetId: string;
  private callbacks: Record<string, ((data?: any) => void)[]> = { stateChange: [], error: [], ready: [] };
  private reportInterval: number | null = null;
  private currentVideoId: string | null = null;
  private hasInteracted = false;
  
  constructor(targetId: string) {
    this.targetId = targetId;
    this.init();
  }

  private init() {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        this.createPlayer();
      };
    } else {
      this.createPlayer();
    }
  }

  private createPlayer() {
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
  }

  private handleReady() {
    this.isReady = true;
    this.player?.mute(); // Mute initially due to browser autoplay policies
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
    if (this.reportInterval) window.clearInterval(this.reportInterval);
    if (this.player) this.player.destroy();
  }

  public on(event: 'stateChange' | 'error' | 'ready', callback: (data?: any) => void) {
    this.callbacks[event].push(callback);
  }

  private emit(event: 'stateChange' | 'error' | 'ready', data?: any) {
    this.callbacks[event].forEach(cb => cb(data));
  }
}