import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useRoomStore } from '../../stores/roomStore';
import { socket } from '../../lib/socket';
import { SearchResult, C2S, parseYouTubeUrl } from '@karaoke/shared';
import { SongCard } from '../shared/SongCard';
import { useToast } from '../shared/Toast';

export const SearchTab = () => {
  const [query, setQuery] = useState('');
  const [karaokeOnly, setKaraokeOnly] = useState(true);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const nickname = useRoomStore(s => s.nickname);
  const toast = useToast();

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      
      const videoId = parseYouTubeUrl(query);
      if (videoId) {
        setLoading(true);
        try {
          const res = await api.getVideoDetails(videoId);
          setResults(res ? [res] : []);
        } catch (err) {
          toast.error('Không tìm thấy video');
        }
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await api.searchSongs(query, karaokeOnly);
        setResults(res);
      } catch (err) {
        toast.error('Lỗi khi tìm kiếm');
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, karaokeOnly]);

  const handleAdd = (song: SearchResult) => {
    const version = useRoomStore.getState().version;
    socket.emit(C2S.QUEUE_ADD, {
      ...song,
      nickname,
      version,
    });
    toast.success('Đã thêm vào hàng đợi');
  };

  return (
    <div className="flex flex-col h-full bg-karaoke-dark p-4 gap-4">
      <div className="flex gap-2">
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm bài hát hoặc dán link YouTube"
          className="flex-1 bg-gray-800 text-white rounded-xl px-4 min-h-[44px] focus:outline-none focus:border-karaoke-primary border border-gray-700"
        />
      </div>
      <div className="flex justify-between items-center px-1">
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input 
            type="checkbox" 
            checked={karaokeOnly} 
            onChange={(e) => setKaraokeOnly(e.target.checked)}
            className="w-5 h-5 rounded text-karaoke-primary bg-gray-800 border-gray-600 focus:ring-karaoke-primary"
          />
          Chỉ tìm bản karaoke
        </label>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-20">
        {loading ? (
          Array(5).fill(0).map((_, i) => (
             <div key={i} className="flex gap-3 bg-gray-800 p-2 rounded-lg animate-pulse">
                <div className="w-32 h-18 bg-gray-700 rounded" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-700 rounded w-1/2" />
                </div>
             </div>
          ))
        ) : results.length > 0 ? (
          results.map(r => (
            <SongCard 
              key={r.videoId} 
              {...r} 
              action={
                <button 
                  onClick={() => handleAdd(r)}
                  className="bg-gray-700 hover:bg-karaoke-primary text-white text-sm font-medium px-4 py-2 rounded-lg min-h-[44px] transition-colors"
                >
                  + Thêm
                </button>
              }
            />
          ))
        ) : query.trim() ? (
          <div className="text-center text-gray-500 mt-10">Không tìm thấy kết quả</div>
        ) : (
          <div className="text-center text-gray-500 mt-10 space-y-4">
             <div className="text-4xl">🎤</div>
             <div>Nhập tên bài hát để tìm kiếm<br/>hoặc dán link YouTube</div>
          </div>
        )}
      </div>
    </div>
  );
};