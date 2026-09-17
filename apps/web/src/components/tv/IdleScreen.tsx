import React from 'react';
import { QROverlay } from './QROverlay';

export const IdleScreen: React.FC = () => {
  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-900 via-karaoke-dark to-purple-900 flex flex-col">
       <div className="p-8 text-center mt-12">
         <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-karaoke-primary to-karaoke-secondary drop-shadow-lg">KARAOKE PARTY</h1>
         <p className="text-2xl text-gray-300 mt-4">Phòng đang trống. Quét mã để thêm bài hát!</p>
       </div>
       <div className="flex-1 relative">
         <QROverlay />
       </div>
    </div>
  );
};