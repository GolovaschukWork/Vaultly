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
  getSortedRowModel,
  type Column,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  FileText,
  Folder,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { formatDate, formatFileSize } from '@/lib/utils';
import { getStaggerStyle } from '@/lib/motion';

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

function SortableHeader({
  column,
  label,
  className,
}: {
  column: Column<ExplorerItem, unknown>;
  label: string;
  className?: string;
}) {
  const sorted = column.getIsSorted();

  return (
    <button
      type="button"
      className={cn(
        'hover:text-content-primary inline-flex items-center gap-1 transition-colors',
        sorted && 'text-content-primary',
        className,
      )}
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      <span>{label}</span>
      {sorted === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
      )}
    </button>
  );
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
  animationIndex = 0,
}: {
  item: ExplorerItem;
  roomId: string;
  onRename: (item: ExplorerItem) => void;
  onDelete: (item: ExplorerItem) => void;
  onPreview?: (item: Extract<ExplorerItem, { type: 'file' }>) => void;
  canEdit?: boolean;
  animationIndex?: number;
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
    <div
      className="animate-fade-in-up border-border bg-surface flex items-center gap-3 rounded-xl border p-3 shadow-sm transition-shadow hover:shadow-md"
      style={getStaggerStyle(animationIndex)}
    >
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
  animationIndex = 0,
}: {
  item: ExplorerItem;
  children: React.ReactNode;
  canEdit?: boolean;
  animationIndex?: number;
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
        'animate-fade-in-up border-border hover:bg-surface-elevated border-b transition-colors',
        isDragging && 'opacity-30',
      )}
      style={getStaggerStyle(animationIndex)}
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
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const columnHelper = createColumnHelper<ExplorerItem>();

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'drag',
        header: '',
        cell: () => null,
        enableSorting: false,
      }),
      columnHelper.accessor('name', {
        header: ({ column }) => <SortableHeader column={column} label={t('common:name')} />,
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
      columnHelper.accessor('type', {
        header: ({ column }) => (
          <SortableHeader
            column={column}
            label={t('common:type')}
            className="hidden md:inline-flex"
          />
        ),
        cell: (info) => (
          <span className="text-content-secondary hidden whitespace-nowrap capitalize md:inline">
            {info.getValue() === 'folder' ? t('common:folder') : t('common:file')}
          </span>
        ),
      }),
      columnHelper.accessor((row) => (row.type === 'file' ? row.size : -1), {
        id: 'size',
        header: ({ column }) => (
          <SortableHeader
            column={column}
            label={t('common:size')}
            className="hidden md:inline-flex"
          />
        ),
        sortingFn: (rowA, rowB) => {
          const sizeA = rowA.original.type === 'file' ? rowA.original.size : -1;
          const sizeB = rowB.original.type === 'file' ? rowB.original.size : -1;
          return sizeA - sizeB;
        },
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
        header: ({ column }) => (
          <SortableHeader
            column={column}
            label={t('common:modified')}
            className="hidden lg:inline-flex"
          />
        ),
        sortingFn: (rowA, rowB) => {
          const dateA = new Date(rowA.original.updatedAt).getTime();
          const dateB = new Date(rowB.original.updatedAt).getTime();
          return dateA - dateB;
        },
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
        enableSorting: false,
      }),
    ],
    [columnHelper, roomId, onRename, onDelete, onPreview, canEdit, t],
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const sortedItems = table.getRowModel().rows.map((row) => row.original);

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
        {sortedItems.map((item, index) => (
          <MobileItemCard
            key={`${item.type}-${item.id}`}
            item={item}
            roomId={roomId}
            onRename={onRename}
            onDelete={onDelete}
            onPreview={onPreview}
            canEdit={canEdit}
            animationIndex={index}
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
                  if (header.id === 'drag' || header.id === 'actions') {
                    return (
                      <th
                        key={header.id}
                        className={cn(
                          'text-content-muted px-4 py-3 text-left text-xs font-medium tracking-wider uppercase',
                          header.id === 'drag' && 'hidden w-8 px-2 md:table-cell',
                          header.id === 'actions' && 'w-12',
                        )}
                      />
                    );
                  }

                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'text-content-muted px-4 py-3 text-left text-xs font-medium tracking-wider uppercase',
                        header.id === 'type' && 'hidden md:table-cell',
                        header.id === 'size' && 'hidden md:table-cell',
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
            {table.getRowModel().rows.map((row, index) => (
              <DraggableRow
                key={row.id}
                item={row.original}
                canEdit={canEdit}
                animationIndex={index}
              >
                {row.getVisibleCells().map((cell) => {
                  if (cell.column.id === 'drag') return null;
                  if (cell.column.id === 'type') {
                    return (
                      <td key={cell.id} className="hidden px-4 py-3 md:table-cell">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  }
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
