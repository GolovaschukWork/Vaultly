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
import { getStaggerStyle } from '@/lib/motion';
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

  const {
    data: activities = [],
    isLoading,
    isFetching,
  } = trpc.activity.list.useQuery({ dataRoomId: roomId, limit: 20 }, { staleTime: 0 });

  const activityList = (
    <ScrollArea className="h-48 xl:h-[calc(100vh-12rem)]">
      {isLoading ? (
        <div className="space-y-3 px-4 py-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-elevated h-10 animate-pulse rounded-md" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="text-content-muted px-4 py-3 text-sm">{t('common:noActivity')}</p>
      ) : (
        <ul className="divide-border divide-y">
          {activities.map((activity, index) => {
            const Icon = activityIcons[activity.type] ?? FileText;
            const labelKey = activityLabels[activity.type] ?? 'activityCreated';
            return (
              <li
                key={activity.id}
                className="animate-fade-in-up flex items-start gap-3 px-4 py-3"
                style={getStaggerStyle(index)}
              >
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
  );

  return (
    <div className="border-border border-t xl:border-t-0 xl:border-l">
      <button
        type="button"
        onClick={toggleActivityPanel}
        className="text-content-primary hover:bg-surface-elevated flex w-full items-center justify-between px-4 py-3 text-sm font-medium xl:hidden"
      >
        <span className="flex items-center gap-2">
          <History className="h-4 w-4" />
          {t('common:recentActivity')}
          {activities.length > 0 && (
            <span className="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 rounded-full px-2 py-0.5 text-xs font-medium">
              {activities.length}
            </span>
          )}
          {isFetching && !isLoading && (
            <span className="bg-surface-elevated text-content-muted rounded-full px-2 py-0.5 text-xs">
              …
            </span>
          )}
        </span>
        {activityPanelOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-out xl:block',
          activityPanelOpen ? 'max-h-96 xl:max-h-none' : 'max-h-0 xl:max-h-none',
        )}
      >
        <div className="border-border hidden border-b px-4 py-3 xl:block">
          <h2 className="text-content-primary flex items-center gap-2 text-sm font-semibold">
            <History className="h-4 w-4" />
            {t('common:recentActivity')}
          </h2>
        </div>
        {activityList}
      </div>
    </div>
  );
}
