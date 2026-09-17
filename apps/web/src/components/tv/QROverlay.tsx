import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useRoomStore } from '../../stores/roomStore';

export const QROverlay: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const roomCode = useRoomStore(s => s.roomCode);
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;
    const url = `${baseUrl}/r/${roomCode}`;
    QRCode.toDataURL(url, { width: 400, margin: 2, color: { dark: '#000000', light: '#ffffff' } }).then(setQrUrl);
    
    if (onClose) {
      const timer = setTimeout(onClose, 30000);
      return () => clearTimeout(timer);
    }
  }, [roomCode, onClose]);

  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-8" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-3xl p-12 flex flex-col items-center max-w-4xl text-center shadow-2xl" onClick={e => e.stopPropagation()}>
         <h2 className="text-4xl font-bold text-white mb-8">Quét mã để tham gia</h2>
         <div className="bg-white p-4 rounded-2xl mb-8">
           {qrUrl ? <img src={qrUrl} alt="QR Code" className="w-64 h-64" /> : <div className="w-64 h-64 bg-gray-200 animate-pulse" />}
         </div>
         <div className="text-6xl font-black text-karaoke-primary tracking-widest mb-12">{roomCode}</div>
         <div className="grid grid-cols-3 gap-8 text-left">
           <div className="bg-gray-800 p-6 rounded-xl">
             <div className="text-3xl font-bold text-karaoke-accent mb-2">1</div>
             <div className="text-xl text-gray-300">Quét mã QR bằng điện thoại của bạn</div>
           </div>
           <div className="bg-gray-800 p-6 rounded-xl">
             <div className="text-3xl font-bold text-karaoke-accent mb-2">2</div>
             <div className="text-xl text-gray-300">Nhập tên của bạn để vào phòng</div>
           </div>
           <div className="bg-gray-800 p-6 rounded-xl">
             <div className="text-3xl font-bold text-karaoke-accent mb-2">3</div>
             <div className="text-xl text-gray-300">Tìm bài hát và thêm vào hàng đợi</div>
           </div>
         </div>
      </div>
    </div>
  );
};