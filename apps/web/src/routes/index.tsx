import { Button, Card, CardContent, CardHeader, CardTitle } from '@vaultly/ui';
import { createFileRoute, Link } from '@tanstack/react-router';
import { FolderOpen, Plus, Trash2, Vault } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppShell } from '@/components/app-shell';
import { CreateDataRoomDialog, DeleteConfirmDialog } from '@/components/dialogs';
import { EmptyState } from '@/components/empty-state';
import { toast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc';
import { formatDate } from '@/lib/utils';

export const Route = createFileRoute('/')({
  component: DataRoomsPage,
});

function DataRoomsPage() {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const utils = trpc.useUtils();
  const { data: rooms = [], isLoading, error, refetch } = trpc.dataRoom.list.useQuery();

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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-content-primary text-2xl font-bold">{t('common:dataRooms')}</h1>
            <p className="text-content-secondary text-sm">{t('common:tagline')}</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            {t('actions:newDataRoom')}
          </Button>
        </div>

        {error && (
          <div className="border-danger/30 bg-danger/10 mb-6 rounded-lg border p-4 text-center">
            <p className="text-danger mb-2">{t('common:error')}</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              {t('common:retry')}
            </Button>
          </div>
        )}

        {isLoading ? (
          <p className="text-content-muted py-16 text-center">{t('common:loading')}</p>
        ) : rooms.length === 0 ? (
          <EmptyState
            variant="rooms"
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('actions:createDataRoom')}
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <Card key={room.id} className="group relative transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <Vault className="text-brand-600 h-8 w-8" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => setDeleteTarget({ id: room.id, name: room.name })}
                      aria-label={t('actions:delete')}
                    >
                      <Trash2 className="text-danger h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="text-lg">
                    <Link
                      to="/rooms/$roomId"
                      params={{ roomId: room.id }}
                      className="hover:text-brand-600"
                    >
                      {room.name}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link
                    to="/rooms/$roomId"
                    params={{ roomId: room.id }}
                    className="text-content-secondary hover:text-brand-600 flex items-center gap-2 text-sm"
                  >
                    <FolderOpen className="h-4 w-4" />
                    {t('actions:open')}
                  </Link>
                  <p className="text-content-muted mt-2 text-xs">{formatDate(room.updatedAt)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateDataRoomDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(name) => createRoom.mutate({ name })}
        isLoading={createRoom.isPending}
      />

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
