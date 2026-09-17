import { useEffect, useState } from 'react';
import { useRoomStore } from '../../stores/roomStore';

export const ConnectionStatus = () => {
  const state = useRoomStore(s => s.connectionState);
  const [showConnected, setShowConnected] = useState(false);

  useEffect(() => {
    if (state === 'connected') {
      setShowConnected(true);
      const timer = setTimeout(() => setShowConnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  if (state === 'connecting') {
    return <div className="bg-yellow-600/90 text-white text-xs text-center py-1 font-medium z-40">Đang kết nối...</div>;
  }
  if (state === 'disconnected') {
    return <div className="bg-red-600/90 text-white text-xs text-center py-1 font-medium z-40">Mất kết nối. Đang thử lại...</div>;
  }
  if (showConnected) {
    return <div className="bg-green-600/90 text-white text-xs text-center py-1 font-medium z-40 animate-[fadeOut_3s_ease-in-out_forwards]">Đã kết nối</div>;
  }
  return null;
};