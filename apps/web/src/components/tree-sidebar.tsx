import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { cn, ScrollArea } from '@vaultly/ui';
import { ChevronDown, ChevronRight, Folder, GripVertical } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { trpc } from '@/lib/trpc';
import { toast } from '@/hooks/use-toast';

interface TreeSidebarProps {
  roomId: string;
  currentFolderId?: string | null;
}

interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  children: FolderNode[];
}

function buildTree(folders: { id: string; name: string; parentId: string | null }[]): FolderNode[] {
  const map = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];

  folders.forEach((f) => map.set(f.id, { ...f, children: [] }));

  folders.forEach((f) => {
    const node = map.get(f.id)!;
    if (f.parentId && map.has(f.parentId)) {
      map.get(f.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function DraggableFolderItem({
  node,
  roomId,
  currentFolderId,
  depth = 0,
}: {
  node: FolderNode;
  roomId: string;
  currentFolderId?: string | null;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const { t } = useTranslation();

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `folder-${node.id}`,
    data: { type: 'folder', id: node.id },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-folder-${node.id}`,
    data: { type: 'folder', id: node.id },
  });

  const isActive = currentFolderId === node.id;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        ref={setDropRef}
        className={cn(
          'flex items-center gap-1 rounded-md pr-1',
          isOver && 'bg-brand-100 dark:bg-brand-900/30',
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-content-muted hover:text-content-primary p-0.5"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="w-4" />
          )}
        </button>

        <button
          ref={setDragRef}
          {...listeners}
          {...attributes}
          className="text-content-muted hover:text-content-primary cursor-grab p-0.5 active:cursor-grabbing"
          aria-label={t('actions:move')}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <Link
          to="/rooms/$roomId/f/$folderId"
          params={{ roomId, folderId: node.id }}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
            isActive
              ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
              : 'text-content-secondary hover:bg-surface-elevated hover:text-content-primary',
            isDragging && 'opacity-50',
          )}
        >
          <Folder className="h-4 w-4 shrink-0" />
          <span className="truncate">{node.name}</span>
        </Link>
      </div>

      {expanded &&
        node.children.map((child) => (
          <DraggableFolderItem
            key={child.id}
            node={child}
            roomId={roomId}
            currentFolderId={currentFolderId}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

export function TreeSidebar({ roomId, currentFolderId }: TreeSidebarProps) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data: folders = [], isLoading } = trpc.folder.listAll.useQuery({ dataRoomId: roomId });
  const tree = useMemo(() => buildTree(folders), [folders]);

  const moveFolder = trpc.folder.move.useMutation({
    onSuccess: () => {
      void utils.folder.listAll.invalidate({ dataRoomId: roomId });
      void utils.folder.list.invalidate();
    },
    onError: (err) =>
      toast({ title: t('errors:moveFailed'), description: err.message, variant: 'destructive' }),
  });

  const moveFile = trpc.file.move.useMutation({
    onSuccess: () => {
      void utils.file.list.invalidate();
    },
    onError: (err) =>
      toast({ title: t('errors:moveFailed'), description: err.message, variant: 'destructive' }),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
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

  const { setNodeRef: setRootDropRef, isOver: isRootOver } = useDroppable({
    id: 'drop-root',
    data: { type: 'folder', id: null },
  });

  const activeFolder = activeId?.startsWith('folder-')
    ? folders.find((f) => `folder-${f.id}` === activeId)
    : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full flex-col">
        <div className="border-border border-b px-4 py-3">
          <h2 className="text-content-primary text-sm font-semibold">{t('common:folders')}</h2>
        </div>

        <ScrollArea className="flex-1 px-2 py-2">
          {isLoading ? (
            <p className="text-content-muted px-2 py-4 text-sm">{t('common:loading')}</p>
          ) : (
            <>
              <div
                ref={setRootDropRef}
                className={cn('mb-1 rounded-md', isRootOver && 'bg-brand-100 dark:bg-brand-900/30')}
              >
                <Link
                  to="/rooms/$roomId"
                  params={{ roomId }}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                    !currentFolderId
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                      : 'text-content-secondary hover:bg-surface-elevated',
                  )}
                >
                  <Folder className="h-4 w-4" />
                  {t('common:root')}
                </Link>
              </div>

              {tree.map((node) => (
                <DraggableFolderItem
                  key={node.id}
                  node={node}
                  roomId={roomId}
                  currentFolderId={currentFolderId}
                />
              ))}
            </>
          )}
        </ScrollArea>
      </div>

      <DragOverlay>
        {activeFolder && (
          <div className="bg-surface border-border flex items-center gap-2 rounded-md border px-3 py-2 shadow-lg">
            <Folder className="h-4 w-4" />
            <span className="text-sm">{activeFolder.name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
