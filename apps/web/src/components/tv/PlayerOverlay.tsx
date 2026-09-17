import React from 'react';
import { useRoomStore } from '../../stores/roomStore';
import { formatDuration } from '@karaoke/shared';

export const PlayerOverlay: React.FC<{ visible?: boolean }> = ({ visible = false }) => {
  const currentSong = useRoomStore(s => s.currentSong());
  const nextSong = useRoomStore(s => s.nextSong());
  const playerState = useRoomStore(s => s.playerState);
  const users = useRoomStore(s => s.users);

  if (!currentSong || !visible) return null;

  const progress = playerState.duration > 0 ? (playerState.currentTime / playerState.duration) * 100 : 0;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-32 pb-8 px-12 z-30 pointer-events-none">
       <div className="flex justify-between items-end mb-4">
         <div className="flex-1 min-w-0 pr-8">
           <h1 className="text-5xl font-bold text-white drop-shadow-lg truncate">{currentSong.title}</h1>
           <p className="text-2xl text-gray-300 mt-2 truncate">{currentSong.channelTitle} • Thêm bởi: {currentSong.addedBy}</p>
         </div>
         <div className="flex flex-col items-end flex-shrink-0 text-right">
           <div className="flex items-center gap-2 bg-gray-800/80 px-4 py-2 rounded-full mb-4">
             <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
             <span className="text-xl font-medium">{users.length} người</span>
           </div>
           {nextSong && (
             <div className="text-xl text-gray-400">
               Tiếp theo: <span className="text-white font-medium">{nextSong.title}</span>
             </div>
           )}
         </div>
       </div>
       
       <div className="w-full bg-gray-700/50 h-3 rounded-full overflow-hidden">
         <div className="bg-karaoke-primary h-full transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }} />
       </div>
       <div className="flex justify-between text-lg text-gray-300 mt-2 font-mono">
         <span>{formatDuration(Math.floor(playerState.currentTime))}</span>
         <span>{formatDuration(Math.floor(playerState.duration))}</span>
       </div>
    </div>
  );
};