import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from './shared/Toast';

export default function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        let code = localStorage.getItem('tv_room_code');
        if (!code) {
           code = await api.createRoom();
           localStorage.setItem('tv_room_code', code);
        }
        navigate(`/room/${code}`, { replace: true });
      } catch (err) {
        setLoading(false);
        toast.error('Không thể tạo phòng. Vui lòng thử lại.');
      }
    };
    init();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-karaoke-dark flex items-center justify-center text-white">
      {loading ? (
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-karaoke-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-xl">Đang khởi tạo phòng...</p>
        </div>
      ) : (
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-500 mb-4">Lỗi</h1>
          <button onClick={() => window.location.reload()} className="bg-karaoke-primary px-6 py-2 rounded-full">Thử lại</button>
        </div>
      )}
    </div>
  );
}