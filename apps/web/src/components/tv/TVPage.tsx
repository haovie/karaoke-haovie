import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRoom } from '../../hooks/useRoom';
import { useRoomStore } from '../../stores/roomStore';
import { usePlayer } from '../../hooks/usePlayer';
import { YouTubePlayer } from './YouTubePlayer';
import { PlayerOverlay } from './PlayerOverlay';
import { QueuePanel } from './QueuePanel';
import { QROverlay } from './QROverlay';
import { IdleScreen } from './IdleScreen';
import { socket } from '../../lib/socket';
import { C2S } from '@karaoke/shared';

export default function TVPage() {
  const { roomCode } = useParams();
  const { isLoading } = useRoom('tv', roomCode);
  const currentSong = useRoomStore(s => s.currentSong());
  const queue = useRoomStore(s => s.queue);
  const overlayVisible = useRoomStore(s => s.overlayVisible);
  
  const [showQR, setShowQR] = useState(false);
  const { isReady, isMuted, unmute } = usePlayer('yt-player-container');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        const state = useRoomStore.getState().playerState.state;
        if (state === 'playing') socket.emit(C2S.PLAYER_PAUSE);
        else socket.emit(C2S.PLAYER_PLAY);
      } else if (e.code === 'ArrowRight') {
        socket.emit(C2S.PLAYER_NEXT);
      } else if (e.code === 'KeyQ') {
        setShowQR(s => !s);
      } else if (e.code === 'KeyI') {
        socket.emit(C2S.OVERLAY_SET, { visible: !useRoomStore.getState().overlayVisible });
      } else if (e.code === 'KeyF') {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-karaoke-dark text-white text-2xl">Đang tải phòng...</div>;

  const hasContent = currentSong || queue.length > 0;

  return (
    <div className="relative w-screen h-screen bg-karaoke-dark overflow-hidden flex flex-col pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
      {/* The YouTube player container must always be mounted so the IFrame API
          can attach to it as soon as it's ready. When there's nothing playing
          we simply overlay the idle screen on top of it. */}
      <div className="flex-1 w-full h-full relative">
        <YouTubePlayer />
        {hasContent ? (
          <>
            {isMuted && isReady && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-40">
                 <button onClick={unmute} className="bg-karaoke-primary text-white text-3xl px-8 py-4 rounded-full font-bold shadow-xl hover:scale-105 transition">Bấm để bắt đầu</button>
              </div>
            )}
            <PlayerOverlay visible={overlayVisible} />
          </>
        ) : (
          <div className="absolute inset-0 z-30">
            <IdleScreen />
          </div>
        )}
      </div>
      {hasContent && <QueuePanel />}

      {showQR && <QROverlay onClose={() => setShowQR(false)} />}
      
      {/* Hidden controls helper for hosts */}
      <div className="absolute top-4 right-4 flex gap-2 opacity-10 hover:opacity-100 transition z-50">
         <button onClick={() => socket.emit(C2S.OVERLAY_SET, { visible: !overlayVisible })} className="bg-gray-800 text-white p-3 rounded">
           {overlayVisible ? 'Ẩn thông tin' : 'Hiện thông tin'}
         </button>
         <button onClick={() => setShowQR(true)} className="bg-gray-800 text-white p-3 rounded">QR</button>
      </div>
    </div>
  );
}