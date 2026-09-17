import { useState } from 'react';
import { useRoomStore } from '../../stores/roomStore';
import { useParams } from 'react-router-dom';
import { socket } from '../../lib/socket';
import { C2S } from '@karaoke/shared';

export const NicknameModal = () => {
  const [val, setVal] = useState('');
  const setNickname = useRoomStore(s => s.setNickname);
  const { roomCode } = useParams();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = val.trim().slice(0, 30);
    if (clean && roomCode) {
      localStorage.setItem('remote_nickname', clean);
      setNickname(clean);
      // Join the room now that we have a nickname
      socket.emit(C2S.ROOM_JOIN, { roomCode, nickname: clean });
    }
  };

  return (
    <div className="fixed inset-0 bg-karaoke-dark flex flex-col items-center justify-center p-6 z-50">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-700 p-6 rounded-2xl shadow-xl">
        <div className="text-4xl text-center mb-4">🎤</div>
        <h2 className="text-2xl font-bold text-white mb-2 text-center">Karaoke Party</h2>
        <p className="text-gray-400 text-center mb-6">Nhập tên để tham gia phòng <span className="text-karaoke-primary font-bold">{roomCode}</span></p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input 
            type="text" 
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="Nhập tên của bạn"
            maxLength={30}
            className="w-full bg-gray-800 text-white border border-gray-600 rounded-xl px-4 py-3 min-h-[44px] focus:outline-none focus:border-karaoke-primary text-lg"
            autoFocus
          />
          <button 
            type="submit" 
            disabled={!val.trim()}
            className="w-full bg-karaoke-primary text-white rounded-xl py-3 font-bold text-lg disabled:opacity-50 min-h-[44px] transition-colors hover:bg-purple-600"
          >
            Vào phòng
          </button>
        </form>
      </div>
    </div>
  );
};