import { FolderOpen, Vault } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EmptyStateProps {
  variant: 'rooms' | 'room' | 'folder';
  action?: React.ReactNode;
}

export function EmptyState({ variant, action }: EmptyStateProps) {
  const { t } = useTranslation();

  const config = {
    rooms: {
      icon: Vault,
      title: t('common:emptyRooms'),
      description: t('common:emptyRoomsDescription'),
    },
    room: {
      icon: FolderOpen,
      title: t('common:emptyRoom'),
      description: t('common:emptyFolderDescription'),
    },
    folder: {
      icon: FolderOpen,
      title: t('common:emptyFolder'),
      description: t('common:emptyFolderDescription'),
    },
  };

  const { icon: Icon, title, description } = config[variant];

  return (
    <div className="animate-fade-in border-border bg-surface-elevated/50 flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-20 text-center">
      <div
        className="animate-scale-in from-brand-500/20 to-brand-600/5 mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br"
        style={{ animationDelay: '80ms' }}
      >
        <Icon className="text-brand-600 dark:text-brand-400 h-8 w-8" />
      </div>
      <h3
        className="animate-fade-in-up text-content-primary mb-2 text-xl font-semibold"
        style={{ animationDelay: '120ms' }}
      >
        {title}
      </h3>
      <p
        className="animate-fade-in-up text-content-secondary mb-8 max-w-sm text-sm leading-relaxed"
        style={{ animationDelay: '160ms' }}
      >
        {description}
      </p>
      {action && (
        <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          {action}
        </div>
      )}
    </div>
  );
}
