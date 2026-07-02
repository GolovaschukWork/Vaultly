import { Button, Card, CardContent, CardHeader, CardTitle } from '@vaultly/ui';
import { createFileRoute, Link } from '@tanstack/react-router';
import { FolderOpen, Plus, Share2, Trash2, Vault } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppShell } from '@/components/app-shell';
import { CreateDataRoomDialog, DeleteConfirmDialog } from '@/components/dialogs';
import { EmptyState } from '@/components/empty-state';
import { ShareRoomDialog } from '@/components/share-room-dialog';
import { toast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

export const Route = createFileRoute('/')({
  component: DataRoomsPage,
});

function DataRoomsPage() {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { session } = useAuth();
  const utils = trpc.useUtils();
  const {
    data: rooms = [],
    isLoading,
    error,
    refetch,
  } = trpc.dataRoom.list.useQuery(undefined, {
    enabled: !!session,
  });

  const createRoom = trpc.dataRoom.create.useMutation({
    onSuccess: (room) => {
      void utils.dataRoom.list.invalidate();
      setCreateOpen(false);
      toast({ title: t('actions:created', { name: room.name }) });
    },
    onError: (err) =>
      toast({ title: t('errors:createFailed'), description: err.message, variant: 'destructive' }),
  });

  const deleteRoom = trpc.dataRoom.delete.useMutation({
    onSuccess: () => {
      void utils.dataRoom.list.invalidate();
      setDeleteTarget(null);
    },
    onError: (err) =>
      toast({ title: t('errors:deleteFailed'), description: err.message, variant: 'destructive' }),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-content-primary text-3xl font-bold tracking-tight">
              {t('common:dataRooms')}
            </h1>
            <p className="text-content-secondary mt-1 text-sm">{t('common:tagline')}</p>
          </div>
          <Button size="lg" onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4" />
            {t('actions:newDataRoom')}
          </Button>
        </div>

        {error && (
          <div className="border-danger/30 bg-danger/10 mb-6 rounded-xl border p-4 text-center">
            <p className="text-danger mb-1 font-medium">{t('common:error')}</p>
            <p className="text-content-secondary mb-3 text-sm">{error.message}</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              {t('common:retry')}
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="border-border bg-surface-elevated h-36 animate-pulse rounded-xl border"
              />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState
            variant="rooms"
            action={
              <Button size="lg" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                {t('actions:createDataRoom')}
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => {
              const isOwner = room.accessRole === 'owner';

              return (
                <Card
                  key={room.id}
                  className="group relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="from-brand-500/5 absolute inset-x-0 top-0 h-1 bg-gradient-to-r to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="from-brand-500/20 to-brand-600/5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br">
                        <Vault className="text-brand-600 dark:text-brand-400 h-5 w-5" />
                      </div>
                      <div className="flex items-center gap-1">
                        {!isOwner && (
                          <span className="text-content-muted bg-surface-elevated rounded-full px-2 py-0.5 text-xs">
                            {t('sharing:sharedRoom')}
                          </span>
                        )}
                        {isOwner && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={() => setShareTarget({ id: room.id, name: room.name })}
                              aria-label={t('sharing:share')}
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={() => setDeleteTarget({ id: room.id, name: room.name })}
                              aria-label={t('actions:delete')}
                            >
                              <Trash2 className="text-danger h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <CardTitle>
                      <Link
                        to="/rooms/$roomId"
                        params={{ roomId: room.id }}
                        className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                      >
                        {room.name}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link
                      to="/rooms/$roomId"
                      params={{ roomId: room.id }}
                      className="text-content-secondary hover:text-brand-600 dark:hover:text-brand-400 inline-flex items-center gap-2 text-sm transition-colors"
                    >
                      <FolderOpen className="h-4 w-4" />
                      {t('actions:open')}
                    </Link>
                    <p className="text-content-muted mt-2 text-xs">{formatDate(room.updatedAt)}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <CreateDataRoomDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(name) => createRoom.mutate({ name })}
        isLoading={createRoom.isPending}
      />

      {shareTarget && (
        <ShareRoomDialog
          open={!!shareTarget}
          onOpenChange={(open) => !open && setShareTarget(null)}
          roomId={shareTarget.id}
          roomName={shareTarget.name}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          onConfirm={() => deleteRoom.mutate({ id: deleteTarget.id })}
          name={deleteTarget.name}
          itemType="room"
          isLoading={deleteRoom.isPending}
        />
      )}
    </AppShell>
  );
}
