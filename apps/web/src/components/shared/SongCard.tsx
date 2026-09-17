import React from 'react';
import { formatDuration } from '@karaoke/shared';

interface SongCardProps {
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSec: number;
  isKaraoke?: boolean;
  action?: React.ReactNode;
  compact?: boolean;
}

export const SongCard: React.FC<SongCardProps> = ({ title, channelTitle, thumbnailUrl, durationSec, isKaraoke, action, compact }) => {
  const isK = isKaraoke ?? title.toLowerCase().includes('karaoke');
  return (
    <div className={`flex gap-3 items-center bg-gray-800 rounded-lg overflow-hidden p-2 ${compact ? 'text-sm' : ''}`}>
      <div className="relative flex-shrink-0">
        <img src={thumbnailUrl} alt={title} className={`${compact ? 'w-24' : 'w-32'} aspect-video object-cover rounded`} />
        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
          {formatDuration(durationSec)}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{title}</div>
        <div className="text-gray-400 text-xs truncate mt-1">{channelTitle}</div>
        {isK && <span className="inline-block mt-1 text-[10px] bg-karaoke-secondary text-white px-1.5 py-0.5 rounded">KARAOKE</span>}
      </div>
      {action && <div className="flex-shrink-0 pr-1">{action}</div>}
    </div>
  );
};