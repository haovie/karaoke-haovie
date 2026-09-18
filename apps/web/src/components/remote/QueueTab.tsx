import React from 'react';
import { useRoomStore } from '../../stores/roomStore';
import { socket } from '../../lib/socket';
import { SongCard } from '../shared/SongCard';
import { C2S, QueueItem } from '@karaoke/shared';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const QueueTab = () => {
  const queue = useRoomStore(s => s.queue);
  const currentIndex = useRoomStore(s => s.currentIndex);
  const nickname = useRoomStore(s => s.nickname);
  const isHost = useRoomStore(s => s.isHost);

  const currentSong = currentIndex >= 0 ? queue[currentIndex] : null;
  const upcomingQueue = queue.slice(currentIndex + 1);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const newIndex = upcomingQueue.findIndex(item => item.id === over.id) + currentIndex + 1;
      socket.emit(C2S.QUEUE_REORDER, {
        itemId: active.id,
        newIndex,
        version: useRoomStore.getState().version
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-karaoke-dark p-4 pb-24 overflow-y-auto">
      {currentSong && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-karaoke-primary animate-pulse" />
            Đang phát
          </h2>
          <div className="border border-karaoke-primary/60 rounded-lg overflow-hidden shadow-lg">
            <SongCard {...currentSong} compact addedBy={currentSong.addedBy} />
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">
          Tiếp theo ({upcomingQueue.length})
        </h2>
        {upcomingQueue.length === 0 ? (
          <div className="text-center text-gray-500 py-8 bg-gray-800/50 rounded-lg">Chưa có bài nào</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={upcomingQueue.map(q => q.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {upcomingQueue.map((item, idx) => (
                  <SortableItem 
                    key={item.id} 
                    item={item} 
                    idx={idx} 
                    canDelete={isHost || item.addedBy === nickname}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};

interface SortableItemProps {
  item: QueueItem;
  idx: number;
  canDelete: boolean;
}

const SortableItem: React.FC<SortableItemProps> = ({ item, idx, canDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const nickname = useRoomStore(s => s.nickname);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    socket.emit(C2S.QUEUE_REMOVE, {
      itemId: item.id,
      nickname,
      version: useRoomStore.getState().version
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative flex items-center bg-gray-800 rounded-lg overflow-hidden group border border-gray-700/40 hover:border-gray-600 transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="p-3 text-gray-500 hover:text-gray-300 touch-none cursor-grab active:cursor-grabbing flex items-center justify-center min-h-[44px]"
        title="Kéo để đổi thứ tự"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 10-4 0 2 2 0 004 0zm7 0a2 2 0 10-4 0 2 2 0 004 0zm-7 8a2 2 0 10-4 0 2 2 0 004 0zm7 0a2 2 0 10-4 0 2 2 0 004 0zm-7 8a2 2 0 10-4 0 2 2 0 004 0zm7 0a2 2 0 10-4 0 2 2 0 004 0z" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <SongCard {...item} compact addedBy={item.addedBy} />
      </div>

      <div className="flex items-center gap-1 pr-2 flex-shrink-0">
        <div className="pr-1 text-xs text-gray-500 font-medium">#{idx + 1}</div>
        {canDelete && (
          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-400 p-2.5 rounded-lg hover:bg-red-500/10 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
            title="Xóa bài hát khỏi hàng đợi"
            aria-label="Xóa bài"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};