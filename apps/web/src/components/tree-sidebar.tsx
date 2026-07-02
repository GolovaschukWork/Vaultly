import { useDraggable, useDroppable } from '@dnd-kit/core';
import { cn, ScrollArea } from '@vaultly/ui';
import { ChevronDown, ChevronRight, Folder, GripVertical } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { trpc } from '@/lib/trpc';

interface TreeSidebarProps {
  roomId: string;
  currentFolderId?: string | null;
}

const folderLinkClass = (isActive: boolean) =>
  cn(
    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
    isActive
      ? 'bg-brand-100 font-medium text-brand-900 ring-1 ring-inset ring-brand-500/25 dark:bg-brand-500/25 dark:text-brand-950 dark:ring-brand-400/50'
      : 'text-content-secondary hover:bg-surface-elevated hover:text-content-primary',
  );

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

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `folder-${node.id}`,
    data: { type: 'folder' as const, id: node.id, name: node.name },
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
        ref={(el) => {
          setNodeRef(el);
          setDropRef(el);
        }}
        className={cn(
          'flex items-center gap-1 rounded-md pr-1 transition-colors',
          isOver && 'bg-brand-100 ring-brand-500/30 dark:bg-brand-900/30 ring-2',
          isDragging && 'opacity-30',
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-content-muted hover:text-content-primary shrink-0 p-0.5"
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
          type="button"
          {...listeners}
          {...attributes}
          className="text-content-muted hover:text-content-primary shrink-0 cursor-grab touch-none p-0.5 active:cursor-grabbing"
          aria-label={t('actions:move')}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <Link
          to="/rooms/$roomId/f/$folderId"
          params={{ roomId, folderId: node.id }}
          className={cn('min-w-0 flex-1', folderLinkClass(isActive))}
          onClick={(e) => isDragging && e.preventDefault()}
        >
          <Folder
            className={cn('h-4 w-4 shrink-0', isActive && 'text-brand-600 dark:text-brand-900')}
          />
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

  const { data: folders = [], isLoading } = trpc.folder.listAll.useQuery({ dataRoomId: roomId });
  const tree = useMemo(() => buildTree(folders), [folders]);

  const { setNodeRef: setRootDropRef, isOver: isRootOver } = useDroppable({
    id: 'drop-root',
    data: { type: 'folder', id: null },
  });

  return (
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
              className={cn(
                'mb-1 rounded-md transition-colors',
                isRootOver && 'bg-brand-100 ring-brand-500/30 dark:bg-brand-900/30 ring-2',
              )}
            >
              <Link
                to="/rooms/$roomId"
                params={{ roomId }}
                className={cn('w-full', folderLinkClass(!currentFolderId))}
              >
                <Folder
                  className={cn(
                    'h-4 w-4 shrink-0',
                    !currentFolderId && 'text-brand-600 dark:text-brand-900',
                  )}
                />
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
  );
}
