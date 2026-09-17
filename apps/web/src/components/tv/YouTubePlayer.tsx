import React from 'react';

export const YouTubePlayer: React.FC = () => {
  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <div id="yt-player-container" className="w-full h-full pointer-events-none" />
    </div>
  );
};