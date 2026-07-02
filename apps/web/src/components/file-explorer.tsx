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
}

function DraggableRow({ item, children }: { item: ExplorerItem; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${item.type}-${item.id}`,
    data: { type: item.type, id: item.id },
  });

  return (
    <tr
      ref={setNodeRef}
      className={cn(
        'border-border hover:bg-surface-elevated border-b transition-colors',
        isDragging && 'opacity-50',
      )}
    >
      <td className="w-8 px-2 py-3">
        <button
          {...listeners}
          {...attributes}
          className="text-content-muted hover:text-content-primary cursor-grab p-1 active:cursor-grabbing"
          aria-label="Drag"
        >
          <GripVertical className="h-4 w-4" />
        </button>
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
                <Folder className="text-brand-500 h-5 w-5" />
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
              <FileText className="text-danger h-5 w-5" />
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
            <span className="text-content-secondary">
              {item.type === 'file' ? formatFileSize(item.size) : '—'}
            </span>
          );
        },
      }),
      columnHelper.accessor('updatedAt', {
        header: t('common:modified'),
        cell: (info) => (
          <span className="text-content-secondary hidden sm:inline">
            {formatDate(info.getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => {
          const item = info.row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
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
                <DropdownMenuItem
                  onClick={() => onDelete(item)}
                  className="text-danger focus:text-danger"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('actions:delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      }),
    ],
    [columnHelper, roomId, onRename, onDelete, onPreview, t],
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return <p className="text-content-muted py-8 text-center">{t('common:loading')}</p>;
  }

  return (
    <div className="border-border overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[400px]">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-border bg-surface-elevated border-b">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={cn(
                    'text-content-muted px-4 py-3 text-left text-xs font-medium tracking-wider uppercase',
                    header.id === 'drag' && 'w-8 px-2',
                    header.id === 'actions' && 'w-12',
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <DraggableRow key={row.id} item={row.original}>
              {row.getVisibleCells().map((cell) => {
                if (cell.column.id === 'drag') return null;
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
  );
}
