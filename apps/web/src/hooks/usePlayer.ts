import { useEffect, useRef, useState } from 'react';
import { YouTubePlayerAdapter } from '../lib/playerAdapter';
import { useRoomStore } from '../stores/roomStore';
import { socket } from '../lib/socket';
import { S2C, C2S } from '@karaoke/shared';

export const usePlayer = (containerId: string) => {
  const adapterRef = useRef<YouTubePlayerAdapter | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  
  const errorSkipTimeout = useRef<number | null>(null);

  useEffect(() => {
    adapterRef.current = new YouTubePlayerAdapter(containerId);
    
    adapterRef.current.on('ready', () => {
      setIsReady(true);
      setIsMuted(true);
    });

    adapterRef.current.on('stateChange', () => {
      if (!adapterRef.current) return;
      const state = adapterRef.current.getState();
      useRoomStore.getState().updatePlayerState(state);
      socket.emit(C2S.PLAYER_STATE_REPORT, state);
      
      if (state.state === 'ended') {
        socket.emit(C2S.PLAYER_NEXT);
      }
    });

    adapterRef.current.on('error', () => {
       if (errorSkipTimeout.current) clearTimeout(errorSkipTimeout.current);
       errorSkipTimeout.current = window.setTimeout(() => {
         socket.emit(C2S.PLAYER_NEXT);
       }, 3000);
    });

    return () => {
      adapterRef.current?.destroy();
      if (errorSkipTimeout.current) clearTimeout(errorSkipTimeout.current);
    };
  }, [containerId]);

  // Load new video when currentSong changes
  const currentSong = useRoomStore(s => s.currentSong());
  useEffect(() => {
    if (isReady && currentSong && currentSong.videoId) {
       const state = adapterRef.current?.getState();
       if (state?.videoId !== currentSong.videoId) {
         adapterRef.current?.load(currentSong.videoId);
       }
    }
  }, [currentSong?.videoId, isReady]);

  // Listen for player commands from remotes
  useEffect(() => {
    const handlePlay = () => adapterRef.current?.play();
    const handlePause = () => adapterRef.current?.pause();
    const handleNext = () => {
      // Advance queue and load next song
      const store = useRoomStore.getState();
      const nextIdx = store.currentIndex + 1;
      if (nextIdx < store.queue.length) {
        adapterRef.current?.load(store.queue[nextIdx].videoId);
      }
    };
    const handleSeek = (data: {time: number}) => adapterRef.current?.seek(data.time);
    const handleVolume = (data: {volume: number}) => adapterRef.current?.setVolume(data.volume);

    socket.on(S2C.PLAYER_PLAY, handlePlay);
    socket.on(S2C.PLAYER_PAUSE, handlePause);
    socket.on(S2C.PLAYER_SEEK, handleSeek);
    socket.on(S2C.PLAYER_VOLUME, handleVolume);
    socket.on(S2C.PLAYER_NEXT, handleNext);

    return () => {
      socket.off(S2C.PLAYER_PLAY, handlePlay);
      socket.off(S2C.PLAYER_PAUSE, handlePause);
      socket.off(S2C.PLAYER_SEEK, handleSeek);
      socket.off(S2C.PLAYER_VOLUME, handleVolume);
      socket.off(S2C.PLAYER_NEXT, handleNext);
    };
  }, []);

  const unmute = () => {
    adapterRef.current?.setVolume(100);
    setIsMuted(false);
  };

  return { playerRef: adapterRef, isReady, isMuted, unmute };
};