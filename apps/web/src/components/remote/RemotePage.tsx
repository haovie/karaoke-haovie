import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRoom } from '../../hooks/useRoom';
import { useRoomStore } from '../../stores/roomStore';
import { NicknameModal } from './NicknameModal';
import { ConnectionStatus } from './ConnectionStatus';
import { SearchTab } from './SearchTab';
import { QueueTab } from './QueueTab';
import { ControlTab } from './ControlTab';

export default function RemotePage() {
  const { roomCode } = useParams();
  const { isLoading } = useRoom('remote', roomCode);
  const nickname = useRoomStore(s => s.nickname);
  const currentSong = useRoomStore(s => s.currentSong());
  const queue = useRoomStore(s => s.queue);
  const currentIndex = useRoomStore(s => s.currentIndex);
  const upcomingCount = Math.max(0, queue.length - (currentIndex + 1));
  const [activeTab, setActiveTab] = useState<'search' | 'queue' | 'control'>('search');

  if (isLoading && !nickname) return <div className="h-screen bg-karaoke-dark flex items-center justify-center text-white">Đang tải...</div>;
  
  if (!nickname) return <NicknameModal />;

  return (
    <div className="h-[100dvh] flex flex-col bg-karaoke-dark text-white overflow-hidden">
      <ConnectionStatus />
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <div hidden={activeTab !== 'search'}>
          <SearchTab />
        </div>
        <div hidden={activeTab !== 'queue'}>
          <QueueTab />
        </div>
        <div hidden={activeTab !== 'control'}>
          <ControlTab />
        </div>
      </div>

      {currentSong && activeTab !== 'control' && (
        <div 
          className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex items-center gap-3 cursor-pointer"
          onClick={() => setActiveTab('control')}
        >
          <img src={currentSong.thumbnailUrl} alt="thumbnail" className="w-12 h-12 object-cover rounded" />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate text-sm">{currentSong.title}</div>
            <div className="text-xs text-karaoke-primary truncate">Đang phát</div>
          </div>
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
      )}

      <div className="flex border-t border-gray-800 bg-gray-900 pb-[env(safe-area-inset-bottom)]">
        <button onClick={() => setActiveTab('search')} className={`flex-1 py-4 flex flex-col items-center justify-center gap-1 ${activeTab === 'search' ? 'text-karaoke-primary' : 'text-gray-500'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <span className="text-[10px]">Tìm kiếm</span>
        </button>
        <button onClick={() => setActiveTab('queue')} className={`flex-1 py-4 flex flex-col items-center justify-center gap-1 ${activeTab === 'queue' ? 'text-karaoke-primary' : 'text-gray-500'}`}>
          <div className="relative">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
             {upcomingCount > 0 && (
               <div className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                 {upcomingCount}
               </div>
             )}
          </div>
          <span className="text-[10px]">Hàng đợi</span>
        </button>
        <button onClick={() => setActiveTab('control')} className={`flex-1 py-4 flex flex-col items-center justify-center gap-1 ${activeTab === 'control' ? 'text-karaoke-primary' : 'text-gray-500'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
          <span className="text-[10px]">Điều khiển</span>
        </button>
      </div>
    </div>
  );
}