import { Button } from '@vaultly/ui';
import { Link } from '@tanstack/react-router';
import { ShieldX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppShell } from '@/components/app-shell';
import { useRoomAccess } from '@/hooks/use-room-access';

interface RoomAccessGateProps {
  roomId: string;
  children: React.ReactNode;
}

export function RoomAccessGate({ roomId, children }: RoomAccessGateProps) {
  const { t } = useTranslation();
  const { isLoading, isError } = useRoomAccess(roomId);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-content-muted text-sm">{t('common:loading')}</p>
        </div>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell>
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
          <div className="bg-surface-elevated mb-5 flex h-14 w-14 items-center justify-center rounded-2xl">
            <ShieldX className="text-content-muted h-7 w-7" />
          </div>
          <h1 className="text-content-primary mb-2 text-xl font-semibold">
            {t('errors:roomNotFound')}
          </h1>
          <p className="text-content-secondary mb-6 text-sm">
            {t('errors:roomNotFoundDescription')}
          </p>
          <Button asChild>
            <Link to="/">{t('common:backToDataRooms')}</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return children;
}
