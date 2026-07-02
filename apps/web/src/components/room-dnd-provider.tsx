import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { useState } from 'react';
import { DragPreview } from '@/components/drag-preview';
import { useTrpcToast } from '@/hooks/use-trpc-toast';
import { invalidateRoomActivity } from '@/lib/room-cache';
import { trpc } from '@/lib/trpc';

interface ActiveDragItem {
  id: string;
  type: 'folder' | 'file';
  name: string;
}

interface RoomDndProviderProps {
  roomId: string;
  children: React.ReactNode;
}

export function RoomDndProvider({ roomId, children }: RoomDndProviderProps) {
  const showError = useTrpcToast();
  const [activeItem, setActiveItem] = useState<ActiveDragItem | null>(null);
  const utils = trpc.useUtils();

  const moveFolder = trpc.folder.move.useMutation({
    onSuccess: () => {
      void utils.folder.listAll.invalidate({ dataRoomId: roomId });
      void utils.folder.list.invalidate();
      invalidateRoomActivity(utils, roomId);
    },
    onError: (err) => showError('errors:moveFailed', err),
  });

  const moveFile = trpc.file.move.useMutation({
    onSuccess: () => {
      void utils.file.list.invalidate();
      invalidateRoomActivity(utils, roomId);
    },
    onError: (err) => showError('errors:moveFailed', err),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { type: 'folder' | 'file'; id: string; name: string };
    if (data) {
      setActiveItem({ id: data.id, type: data.type, name: data.name });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as { type: string; id: string };
    const overData = over.data.current as { type: string; id: string | null };

    if (!activeData || !overData) return;

    const targetFolderId = overData.id;

    if (activeData.type === 'folder') {
      if (activeData.id === targetFolderId) return;
      moveFolder.mutate({ id: activeData.id, targetParentId: targetFolderId });
    } else if (activeData.type === 'file') {
      moveFile.mutate({ id: activeData.id, targetFolderId: targetFolderId });
    }
  };

  const handleDragCancel = () => setActiveItem(null);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
        {activeItem ? <DragPreview type={activeItem.type} name={activeItem.name} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
