import { Button, cn } from '@vaultly/ui';
import { useTranslation } from 'react-i18next';

export type ExplorerFilterType = 'all' | 'folders' | 'files';

interface ExplorerFilterProps {
  value: ExplorerFilterType;
  onChange: (value: ExplorerFilterType) => void;
  className?: string;
}

const OPTIONS: ExplorerFilterType[] = ['all', 'folders', 'files'];

export function ExplorerFilter({ value, onChange, className }: ExplorerFilterProps) {
  const { t } = useTranslation();

  const labels: Record<ExplorerFilterType, string> = {
    all: t('common:filterAll'),
    folders: t('common:filterFolders'),
    files: t('common:filterFiles'),
  };

  return (
    <div
      className={cn(
        'border-border bg-surface-elevated inline-flex rounded-lg border p-1',
        className,
      )}
      role="group"
      aria-label={t('common:filterByType')}
    >
      {OPTIONS.map((option) => (
        <Button
          key={option}
          type="button"
          size="sm"
          variant={value === option ? 'secondary' : 'ghost'}
          className="h-8 px-3"
          onClick={() => onChange(option)}
        >
          {labels[option]}
        </Button>
      ))}
    </div>
  );
}

export function filterExplorerItems<T extends { type: 'folder' | 'file' }>(
  items: T[],
  filter: ExplorerFilterType,
): T[] {
  if (filter === 'all') return items;
  if (filter === 'folders') return items.filter((item) => item.type === 'folder');
  return items.filter((item) => item.type === 'file');
}
