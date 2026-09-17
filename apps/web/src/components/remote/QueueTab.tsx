import { useState } from 'react';
import { useRoomStore } from '../../stores/roomStore';
import { socket } from '../../lib/socket';
import { SongCard } from '../shared/SongCard';
import { C2S } from '@karaoke/shared';
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
    if (active.id !== over?.id) {
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
          <h2 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Đang phát</h2>
          <div className="border border-karaoke-primary rounded-lg">
            <SongCard {...currentSong} compact />
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

const SortableItem = ({ item, idx, canDelete }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const nickname = useRoomStore(s => s.nickname);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDelete = () => {
    socket.emit(C2S.QUEUE_REMOVE, {
      itemId: item.id,
      nickname,
      version: useRoomStore.getState().version
    });
  };

  return (
    <div ref={setNodeRef} style={style} className="relative overflow-hidden rounded-lg group">
      {canDelete && (
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center">
          <button onClick={handleDelete} className="text-white w-full h-full min-h-[44px]">Xóa</button>
        </div>
      )}
      <div className="relative bg-gray-800 flex items-center gap-2 transition-transform active:bg-gray-700">
        <div {...attributes} {...listeners} className="p-3 text-gray-500 touch-none">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 10-4 0 2 2 0 004 0zm7 0a2 2 0 10-4 0 2 2 0 004 0zm-7 8a2 2 0 10-4 0 2 2 0 004 0zm7 0a2 2 0 10-4 0 2 2 0 004 0zm-7 8a2 2 0 10-4 0 2 2 0 004 0zm7 0a2 2 0 10-4 0 2 2 0 004 0z"/></svg>
        </div>
        <div className="flex-1">
          <SongCard {...item} compact />
        </div>
        <div className="pr-3 text-xs text-gray-500 font-medium">#{idx + 1}</div>
      </div>
    </div>
  );
};