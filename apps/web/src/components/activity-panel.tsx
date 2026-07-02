import { cn, ScrollArea } from '@vaultly/ui';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Folder,
  FolderPlus,
  History,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { trpc } from '@/lib/trpc';
import { formatDate } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';

interface ActivityPanelProps {
  roomId: string;
}

const activityIcons: Record<string, typeof Folder> = {
  CREATED: FolderPlus,
  RENAMED: Pencil,
  DELETED: Trash2,
  MOVED: Folder,
  UPLOADED: Upload,
};

const activityLabels: Record<string, string> = {
  CREATED: 'activityCreated',
  RENAMED: 'activityRenamed',
  DELETED: 'activityDeleted',
  MOVED: 'activityMoved',
  UPLOADED: 'activityUploaded',
};

export function ActivityPanel({ roomId }: ActivityPanelProps) {
  const { t } = useTranslation();
  const { activityPanelOpen, toggleActivityPanel } = useUIStore();

  const { data: activities = [], isLoading } = trpc.activity.list.useQuery(
    { dataRoomId: roomId, limit: 20 },
    { enabled: activityPanelOpen },
  );

  return (
    <div className="border-border border-t lg:border-t-0 lg:border-l">
      <button
        type="button"
        onClick={toggleActivityPanel}
        className="text-content-primary hover:bg-surface-elevated flex w-full items-center justify-between px-4 py-3 text-sm font-medium lg:hidden"
      >
        <span className="flex items-center gap-2">
          <History className="h-4 w-4" />
          {t('common:recentActivity')}
        </span>
        {activityPanelOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all lg:block',
          activityPanelOpen ? 'max-h-96 lg:max-h-none' : 'max-h-0 lg:max-h-none',
        )}
      >
        <div className="border-border hidden border-b px-4 py-3 lg:block">
          <h2 className="text-content-primary flex items-center gap-2 text-sm font-semibold">
            <History className="h-4 w-4" />
            {t('common:recentActivity')}
          </h2>
        </div>

        <ScrollArea className="h-48 lg:h-[calc(100vh-12rem)]">
          {isLoading ? (
            <p className="text-content-muted px-4 py-3 text-sm">{t('common:loading')}</p>
          ) : activities.length === 0 ? (
            <p className="text-content-muted px-4 py-3 text-sm">{t('common:noActivity')}</p>
          ) : (
            <ul className="divide-border divide-y">
              {activities.map((activity) => {
                const Icon = activityIcons[activity.type] ?? FileText;
                const labelKey = activityLabels[activity.type] ?? 'activityCreated';
                return (
                  <li key={activity.id} className="flex items-start gap-3 px-4 py-3">
                    <Icon className="text-content-muted mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-content-primary text-sm">
                        <span className="font-medium">{activity.entityName}</span>{' '}
                        <span className="text-content-secondary">{t(`common:${labelKey}`)}</span>
                      </p>
                      <p className="text-content-muted text-xs">{formatDate(activity.createdAt)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
