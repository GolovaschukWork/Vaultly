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
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-surface-elevated mb-4 rounded-full p-4">
        <Icon className="text-content-muted h-10 w-10" />
      </div>
      <h3 className="text-content-primary mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-content-secondary mb-6 max-w-sm text-sm">{description}</p>
      {action}
    </div>
  );
}
