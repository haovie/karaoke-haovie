import React, { useEffect, useState } from 'react';
import { useRoomStore } from '../../stores/roomStore';

export const QueuePanel: React.FC = () => {
  const queue = useRoomStore(s => s.queue);
  const currentIndex = useRoomStore(s => s.currentIndex);
  const hidden = useRoomStore(s => s.queuePanelBlurred);
  const [isRendered, setIsRendered] = useState(!hidden);

  useEffect(() => {
    if (!hidden) {
      setIsRendered(true);
      return;
    }

    const timeout = window.setTimeout(() => setIsRendered(false), 300);
    return () => window.clearTimeout(timeout);
  }, [hidden]);

  if (queue.length <= currentIndex + 1 || !isRendered) return null;

  const upNext = queue.slice(currentIndex + 1, currentIndex + 6);
  const remaining = Math.max(0, queue.length - (currentIndex + 6));

  return (
    <div className={`absolute top-12 right-12 w-96 bg-black/80 backdrop-blur-md border border-gray-700 rounded-2xl p-6 shadow-2xl z-30 pointer-events-none animate-[slideIn_0.5s_ease-out] transition-opacity duration-300 ${hidden ? 'opacity-0' : 'opacity-100'}`}>
      <h3 className="text-2xl font-bold mb-4 text-white">Tiếp theo</h3>
      <div className="flex flex-col gap-4">
        {upNext.map((item, idx) => (
          <div key={item.id} className="flex gap-4 items-center">
             <div className="text-xl font-bold text-gray-500 w-6">{idx + 1}</div>
             <img src={item.thumbnailUrl} className="w-24 rounded aspect-video object-cover" />
             <div className="flex-1 min-w-0">
               <div className="text-lg font-medium text-white truncate">{item.title}</div>
               <div className="text-sm text-gray-400 truncate">{item.addedBy}</div>
             </div>
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <div className="text-center text-gray-400 mt-4 text-lg">và {remaining} bài khác...</div>
      )}
    </div>
  );
};