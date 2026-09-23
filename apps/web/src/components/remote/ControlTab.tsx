import { useRef, useState, type PointerEvent } from 'react';
import { useRoomStore } from '../../stores/roomStore';
import { socket } from '../../lib/socket';
import { C2S, formatDuration } from '@karaoke/shared';
import { useToast } from '../shared/Toast';

const SeekBar = ({ currentTime, duration }: { currentTime: number; duration: number }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragRatio, setDragRatio] = useState<number | null>(null);

  const isDragging = dragRatio !== null;
  const ratio = isDragging ? dragRatio! : (duration > 0 ? Math.min(1, currentTime / duration) : 0);
  const displayTime = isDragging ? dragRatio! * duration : currentTime;

  const ratioFromClientX = (clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragRatio(ratioFromClientX(e.clientX));
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setDragRatio(ratioFromClientX(e.clientX));
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const finalRatio = ratioFromClientX(e.clientX);
    setDragRatio(null);
    socket.emit(C2S.PLAYER_SEEK, { time: Math.floor(finalRatio * duration) });
  };

  return (
    <div className="w-full">
      <div
        ref={barRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative h-6 flex items-center cursor-pointer touch-none"
      >
        <div className="absolute left-0 right-0 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-karaoke-primary"
            style={{ width: `${ratio * 100}%`, transition: isDragging ? 'none' : 'width 1s linear' }}
          />
        </div>
        <div
          className="absolute w-4 h-4 bg-karaoke-primary rounded-full -translate-x-1/2 shadow"
          style={{ left: `${ratio * 100}%`, transition: isDragging ? 'none' : 'left 1s linear' }}
        />
      </div>
      <div className="flex justify-between text-sm text-gray-500 font-mono">
        <span>{formatDuration(Math.floor(displayTime))}</span>
        <span>{formatDuration(Math.floor(duration))}</span>
      </div>
    </div>
  );
};

export const ControlTab = () => {
  const playerState = useRoomStore(s => s.playerState);
  const currentSong = useRoomStore(s => s.currentSong());
  const overlayVisible = useRoomStore(s => s.overlayVisible);
  const queuePanelBlurred = useRoomStore(s => s.queuePanelBlurred);
  const toast = useToast();
  
  const [vol, setVol] = useState(playerState.volume);

  const togglePlay = () => {
    if (playerState.state === 'playing') socket.emit(C2S.PLAYER_PAUSE);
    else socket.emit(C2S.PLAYER_PLAY);
  };

  const handleSeekRelative = (seconds: number) => {
    const newTime = Math.max(0, Math.min(playerState.duration, playerState.currentTime + seconds));
    socket.emit(C2S.PLAYER_SEEK, { time: newTime });
  };

  const handleNext = () => socket.emit(C2S.PLAYER_NEXT);

  const toggleOverlay = () => socket.emit(C2S.OVERLAY_SET, { visible: !overlayVisible });
  const toggleQueuePanelBlur = () => socket.emit(C2S.QUEUE_PANEL_BLUR_SET, { blurred: !queuePanelBlurred });
  
  const handleVol = (e: any) => {
    const v = parseInt(e.target.value);
    setVol(v);
    socket.emit(C2S.PLAYER_VOLUME, { volume: v });
  };

  if (!currentSong) {
    return <div className="h-full flex items-center justify-center text-gray-500">Chưa có bài hát nào</div>;
  }

  const [prevVol, setPrevVol] = useState(65);


  const toggleMute = () => {
    if (vol > 0) {
      setPrevVol(vol);
      setVol(0);
      socket.emit(C2S.PLAYER_VOLUME, { volume: 0 });
    } else {
      setVol(prevVol || 50);
      socket.emit(C2S.PLAYER_VOLUME, { volume: prevVol || 50 });
    }
  };

  // Render icon linh hoạt theo mức âm lượng
  const renderVolumeIcon = () => {
    if (vol === 0) {
      return (
        <svg className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      );
    }
    if (vol < 50) {
      return (
        <svg className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      </svg>
    );
  };

  return (
    <div className="flex flex-col h-full bg-karaoke-dark p-6 pb-24">
       <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full gap-8">
         
         <div className="w-full text-center">
           <img src={currentSong.thumbnailUrl} className="w-full aspect-video rounded-xl object-cover shadow-2xl mb-6" />
           <h2 className="text-2xl font-bold truncate px-4">{currentSong.title}</h2>
           <p className="text-gray-400 mt-1">{currentSong.channelTitle}</p>
         </div>

         <SeekBar currentTime={playerState.currentTime} duration={playerState.duration} />

         <div className="flex items-center justify-center gap-4 sm:gap-6 w-full">
            <button onClick={() => handleSeekRelative(-10)} className="w-14 h-14 bg-gray-800 text-white rounded-full flex items-center justify-center active:scale-95 transition-transform font-medium">
              -10s
            </button>
            <button onClick={togglePlay} className="w-20 h-20 bg-karaoke-primary text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
              {playerState.state === 'playing' ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
              ) : (
                <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>
            <button onClick={() => handleSeekRelative(10)} className="w-14 h-14 bg-gray-800 text-white rounded-full flex items-center justify-center active:scale-95 transition-transform font-medium">
              +10s
            </button>
            <button onClick={handleNext} className="w-14 h-14 bg-gray-800 text-white rounded-full flex items-center justify-center active:scale-95 transition-transform">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
         </div>

        <div className="w-full max-w-2xl mx-auto p-[1px] rounded-2xl bg-gradient-to-r from-pink-500/30 via-purple-500/20 to-blue-500/30 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-5 bg-gray-900/90 p-5 rounded-2xl border border-white/10 shadow-inner">

            {/* Nút Mute / Unmute nhanh */}
            <button
              onClick={toggleMute}
              className="group relative p-2.5 rounded-xl bg-gray-800/80 border border-gray-700/60 text-gray-300 hover:text-pink-400 hover:border-pink-500/50 hover:bg-gray-800 transition-all duration-300 shadow-md focus:outline-none"
            >
              {renderVolumeIcon()}
            </button>

            {/* Thanh trượt bọc giao diện tùy chỉnh */}
            <div className="relative flex-1 flex items-center group py-4">

              {/* Track nền mờ bên dưới */}
              <div className="absolute inset-x-0 h-2 bg-gray-800/90 rounded-full overflow-hidden border border-white/5">
                {/* Vạch âm lượng đã kéo qua với gradient neon */}
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 rounded-full transition-all duration-75 relative"
                  style={{ width: `${vol}%` }}
                >
                  {/* Ánh sáng quét bóng ở mép dải màu */}
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 blur-[1px]" />
                </div>
              </div>

              {/* Hiệu ứng hào quang neon (Glow Effect) */}
              <div
                className="absolute h-2 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full blur-sm opacity-50 pointer-events-none transition-all duration-75"
                style={{ width: `${vol}%` }}
              />

              {/* Con trỏ giả (Custom Thumb) chạy đồng bộ với input */}
              <div
                className="absolute w-4 h-4 bg-white border-2 border-pink-500 rounded-full shadow-[0_0_12px_rgba(236,72,153,0.8)] pointer-events-none -translate-x-1/2 transition-transform duration-100 group-hover:scale-125"
                style={{ left: `${vol}%` }}
              >
                {/* Tooltip nổi hiển thị số % khi rê chuột */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-gray-800 border border-pink-500/40 text-[11px] font-semibold text-pink-300 shadow-xl pointer-events-none">
                  {vol}%
                </div>
              </div>

              {/* Input Range ẩn nền, nhận tương tác kéo thả */}
              <input
                type="range"
                min="0"
                max="100"
                value={vol}
                onChange={handleVol}
                className="relative z-10 w-full h-4 opacity-0 cursor-pointer"
              />
            </div>

            {/* Số hiển thị chi tiết bên phải */}
            <div className="flex items-baseline justify-end w-12 font-mono text-sm tracking-tight select-none">
              <span className="font-bold text-white transition-colors duration-150 group-hover:text-pink-400">
                {vol}
              </span>
              <span className="text-xs text-gray-500 ml-0.5">%</span>
            </div>

          </div>
        </div>

         <button
           onClick={toggleQueuePanelBlur}
           className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl font-medium transition-colors ${queuePanelBlurred ? 'bg-karaoke-primary text-white' : 'bg-gray-800 text-gray-300'}`}
         >
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M10.584 10.587a2 2 0 002.828 2.828M9.881 4.255A10.94 10.94 0 0112 4c5.523 0 10 3.582 10 8 0 1.61-.596 3.11-1.616 4.352M6.228 6.228C3.659 7.684 2 9.711 2 12c0 4.418 4.477 8 10 8 1.693 0 3.287-.337 4.684-.933" /></svg>
           {queuePanelBlurred ? 'Hiện rõ danh sách tiếp theo' : 'Làm mờ danh sách tiếp theo'}
         </button>

         <button
           onClick={toggleOverlay}
           className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl font-medium transition-colors ${overlayVisible ? 'bg-karaoke-primary text-white' : 'bg-gray-800 text-gray-300'}`}
         >
           {overlayVisible ? (
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
           ) : (
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
           )}
           {overlayVisible ? 'Ẩn thông tin trên TV' : 'Hiện thông tin trên TV'}
         </button>

       </div>
    </div>
  );
};
