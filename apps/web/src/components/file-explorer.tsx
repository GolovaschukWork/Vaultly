import { useDraggable } from '@dnd-kit/core';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from '@vaultly/ui';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Eye, FileText, Folder, GripVertical, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { formatDate, formatFileSize } from '@/lib/utils';

export type ExplorerItem =
  | {
      id: string;
      type: 'folder';
      name: string;
      updatedAt: Date | string;
    }
  | {
      id: string;
      type: 'file';
      name: string;
      size: number;
      storageKey: string;
      updatedAt: Date | string;
    };

interface FileExplorerProps {
  roomId: string;
  items: ExplorerItem[];
  onRename: (item: ExplorerItem) => void;
  onDelete: (item: ExplorerItem) => void;
  onPreview?: (item: Extract<ExplorerItem, { type: 'file' }>) => void;
  isLoading?: boolean;
  canEdit?: boolean;
}

function ItemActions({
  item,
  onRename,
  onDelete,
  onPreview,
  canEdit = true,
}: {
  item: ExplorerItem;
  onRename: (item: ExplorerItem) => void;
  onDelete: (item: ExplorerItem) => void;
  onPreview?: (item: Extract<ExplorerItem, { type: 'file' }>) => void;
  canEdit?: boolean;
}) {
  const { t } = useTranslation();

  if (!canEdit && item.type === 'folder') return null;

  if (!canEdit && item.type === 'file' && onPreview) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => onPreview(item)}
      >
        <Eye className="h-4 w-4" />
        <span className="sr-only">{t('actions:preview')}</span>
      </Button>
    );
  }

  if (!canEdit) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {item.type === 'file' && onPreview && (
          <>
            <DropdownMenuItem onClick={() => onPreview(item)}>
              <Eye className="mr-2 h-4 w-4" />
              {t('actions:preview')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => onRename(item)}>
          <Pencil className="mr-2 h-4 w-4" />
          {t('actions:rename')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete(item)} className="text-danger focus:text-danger">
          <Trash2 className="mr-2 h-4 w-4" />
          {t('actions:delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileItemCard({
  item,
  roomId,
  onRename,
  onDelete,
  onPreview,
  canEdit = true,
}: {
  item: ExplorerItem;
  roomId: string;
  onRename: (item: ExplorerItem) => void;
  onDelete: (item: ExplorerItem) => void;
  onPreview?: (item: Extract<ExplorerItem, { type: 'file' }>) => void;
  canEdit?: boolean;
}) {
  const Icon = item.type === 'folder' ? Folder : FileText;

  const content = (
    <>
      <Icon
        className={cn(
          'h-5 w-5 shrink-0',
          item.type === 'folder' ? 'text-brand-500' : 'text-danger',
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-content-primary truncate font-medium">{item.name}</p>
        <p className="text-content-muted text-xs">
          {item.type === 'file' ? formatFileSize(item.size) : '—'} · {formatDate(item.updatedAt)}
        </p>
      </div>
    </>
  );

  return (
    <div className="border-border bg-surface flex items-center gap-3 rounded-xl border p-3 shadow-sm">
      {item.type === 'folder' ? (
        <Link
          to="/rooms/$roomId/f/$folderId"
          params={{ roomId, folderId: item.id }}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          {content}
        </Link>
      ) : (
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() => onPreview?.(item)}
        >
          {content}
        </button>
      )}
      <ItemActions
        item={item}
        onRename={onRename}
        onDelete={onDelete}
        onPreview={onPreview}
        canEdit={canEdit}
      />
    </div>
  );
}

function DraggableRow({
  item,
  children,
  canEdit = true,
}: {
  item: ExplorerItem;
  children: React.ReactNode;
  canEdit?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${item.type}-${item.id}`,
    data: { type: item.type, id: item.id, name: item.name },
    disabled: !canEdit,
  });

  return (
    <tr
      ref={setNodeRef}
      className={cn(
        'border-border hover:bg-surface-elevated border-b transition-colors',
        isDragging && 'opacity-30',
      )}
    >
      <td className="hidden w-8 px-2 py-3 md:table-cell">
        {canEdit ? (
          <button
            type="button"
            {...listeners}
            {...attributes}
            className="text-content-muted hover:text-content-primary cursor-grab touch-none p-1 active:cursor-grabbing"
            aria-label="Drag"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
      </td>
      {children}
    </tr>
  );
}

export function FileExplorer({
  roomId,
  items,
  onRename,
  onDelete,
  onPreview,
  isLoading,
  canEdit = true,
}: FileExplorerProps) {
  const { t } = useTranslation();
  const columnHelper = createColumnHelper<ExplorerItem>();

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'drag',
        header: '',
        cell: () => null,
      }),
      columnHelper.accessor('name', {
        header: t('common:name'),
        cell: (info) => {
          const item = info.row.original;
          if (item.type === 'folder') {
            return (
              <Link
                to="/rooms/$roomId/f/$folderId"
                params={{ roomId, folderId: item.id }}
                className="text-content-primary hover:text-brand-600 flex items-center gap-2 font-medium"
              >
                <Folder className="text-brand-500 h-5 w-5 shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          }
          return (
            <button
              type="button"
              className="text-content-primary hover:text-brand-600 flex items-center gap-2 text-left font-medium"
              onClick={() => onPreview?.(item)}
            >
              <FileText className="text-danger h-5 w-5 shrink-0" />
              <span className="truncate">{item.name}</span>
            </button>
          );
        },
      }),
      columnHelper.display({
        id: 'size',
        header: t('common:size'),
        cell: (info) => {
          const item = info.row.original;
          return (
            <span className="text-content-secondary whitespace-nowrap">
              {item.type === 'file' ? formatFileSize(item.size) : '—'}
            </span>
          );
        },
      }),
      columnHelper.accessor('updatedAt', {
        header: t('common:modified'),
        cell: (info) => (
          <span className="text-content-secondary hidden whitespace-nowrap lg:inline">
            {formatDate(info.getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <ItemActions
            item={info.row.original}
            onRename={onRename}
            onDelete={onDelete}
            onPreview={onPreview}
            canEdit={canEdit}
          />
        ),
      }),
    ],
    [columnHelper, roomId, onRename, onDelete, onPreview, canEdit, t],
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="space-y-2 md:hidden">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface-elevated h-16 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Mobile card list */}
      <div className="space-y-2 md:hidden">
        {items.map((item) => (
          <MobileItemCard
            key={`${item.type}-${item.id}`}
            item={item}
            roomId={roomId}
            onRename={onRename}
            onDelete={onDelete}
            onPreview={onPreview}
            canEdit={canEdit}
          />
        ))}
      </div>

      {/* Desktop table */}
      <div className="border-border hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-border bg-surface-elevated border-b">
                {headerGroup.headers.map((header) => {
                  if (header.id === 'drag') {
                    return <th key={header.id} className="hidden w-8 px-2 md:table-cell" />;
                  }
                  if (header.id === 'size') {
                    return (
                      <th
                        key={header.id}
                        className="text-content-muted hidden px-4 py-3 text-left text-xs font-medium tracking-wider uppercase md:table-cell"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    );
                  }
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'text-content-muted px-4 py-3 text-left text-xs font-medium tracking-wider uppercase',
                        header.id === 'actions' && 'w-12',
                        header.id === 'updatedAt' && 'hidden lg:table-cell',
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <DraggableRow key={row.id} item={row.original} canEdit={canEdit}>
                {row.getVisibleCells().map((cell) => {
                  if (cell.column.id === 'drag') return null;
                  if (cell.column.id === 'size') {
                    return (
                      <td key={cell.id} className="hidden px-4 py-3 md:table-cell">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  }
                  if (cell.column.id === 'updatedAt') {
                    return (
                      <td key={cell.id} className="hidden px-4 py-3 lg:table-cell">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  }
                  return (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </DraggableRow>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
