import { FileText, Folder } from 'lucide-react';
import { cn } from '@vaultly/ui';

interface DragPreviewProps {
  type: 'folder' | 'file';
  name: string;
  className?: string;
}

export function DragPreview({ type, name, className }: DragPreviewProps) {
  const Icon = type === 'folder' ? Folder : FileText;

  return (
    <div
      className={cn(
        'bg-surface border-border flex w-52 cursor-grabbing items-center gap-2.5 rounded-lg border px-3 py-2 shadow-xl ring-1 ring-black/5 dark:ring-white/10',
        'scale-[1.02] rotate-1',
        className,
      )}
    >
      <Icon
        className={cn('h-4 w-4 shrink-0', type === 'folder' ? 'text-brand-500' : 'text-danger')}
      />
      <span className="text-content-primary truncate text-sm font-medium">{name}</span>
    </div>
  );
}
