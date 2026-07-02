import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityPanel } from '@/components/activity-panel';
import { AppShell } from '@/components/app-shell';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { CreateFolderDialog, DeleteConfirmDialog, RenameDialog } from '@/components/dialogs';
import { EmptyState } from '@/components/empty-state';
import { FileExplorer, type ExplorerItem } from '@/components/file-explorer';
import { PDFViewer } from '@/components/pdf-viewer';
import { RoomDndProvider } from '@/components/room-dnd-provider';
import { RoomMobileSearch, RoomPageHeader, RoomToolbar } from '@/components/room-toolbar';
import { SearchBar } from '@/components/search-bar';
import { TreeSidebar } from '@/components/tree-sidebar';
import { UploadDropzone } from '@/components/upload-dropzone';
import { ShareRoomDialog } from '@/components/share-room-dialog';
import {
  ExplorerFilter,
  filterExplorerItems,
  type ExplorerFilterType,
} from '@/components/explorer-filter';
import { toast, TOAST_REMOVE_DELAY, ToastAction } from '@/hooks/use-toast';
import { useTrpcToast } from '@/hooks/use-trpc-toast';
import { useRoomAccess } from '@/hooks/use-room-access';
import { deleteStoredFile, uploadFile } from '@/lib/file-storage';
import { invalidateRoomActivity } from '@/lib/room-cache';
import { trpc } from '@/lib/trpc';
import { getTrpcErrorMessage } from '@/lib/trpc-errors';
import { ensurePdfExtension, PDF_MIME_TYPE } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { useUIStore } from '@/stores/ui-store';

export const Route = createFileRoute('/rooms/$roomId/')({
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = Route.useParams();
  const { t } = useTranslation();
  const { setPreviewFile } = useUIStore();
  const { user } = useAuth();
  const showError = useTrpcToast();
  const { canEdit, isOwner } = useRoomAccess(roomId);

  const [explorerFilter, setExplorerFilter] = useState<ExplorerFilterType>('all');

  const [shareOpen, setShareOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ExplorerItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExplorerItem | null>(null);

  const utils = trpc.useUtils();

  const { data: rooms = [] } = trpc.dataRoom.list.useQuery();
  const room = rooms.find((r) => r.id === roomId);

  const { data: folders = [], isLoading: foldersLoading } = trpc.folder.list.useQuery({
    dataRoomId: roomId,
    parentId: null,
  });

  const { data: files = [], isLoading: filesLoading } = trpc.file.list.useQuery({
    dataRoomId: roomId,
    folderId: null,
  });

  const items: ExplorerItem[] = useMemo(
    () => [
      ...folders.map((f) => ({
        id: f.id,
        type: 'folder' as const,
        name: f.name,
        updatedAt: f.updatedAt,
      })),
      ...files.map((f) => ({
        id: f.id,
        type: 'file' as const,
        name: f.name,
        size: f.size,
        storageKey: f.storageKey,
        updatedAt: f.updatedAt,
      })),
    ],
    [folders, files],
  );

  const filteredItems = useMemo(
    () => filterExplorerItems(items, explorerFilter),
    [items, explorerFilter],
  );

  const createFolder = trpc.folder.create.useMutation({
    onSuccess: (folder) => {
      void utils.folder.list.invalidate();
      void utils.folder.listAll.invalidate({ dataRoomId: roomId });
      void utils.activity.list.invalidate({ dataRoomId: roomId });
      setCreateFolderOpen(false);
      toast({ title: t('actions:created', { name: folder.name }) });
    },
    onError: (err) => showError('errors:createFailed', err),
  });

  const renameFolder = trpc.folder.rename.useMutation({
    onSuccess: (folder) => {
      void utils.folder.list.invalidate();
      void utils.folder.listAll.invalidate({ dataRoomId: roomId });
      invalidateRoomActivity(utils, roomId);
      setRenameTarget(null);
      toast({ title: t('actions:renamed', { name: folder.name }) });
    },
    onError: (err) => showError('errors:renameFailed', err),
  });

  const renameFile = trpc.file.rename.useMutation({
    onSuccess: (file) => {
      void utils.file.list.invalidate();
      invalidateRoomActivity(utils, roomId);
      setRenameTarget(null);
      toast({ title: t('actions:renamed', { name: file.name }) });
    },
    onError: (err) => showError('errors:renameFailed', err),
  });

  const deleteFolder = trpc.folder.delete.useMutation({
    onError: (err) => showError('errors:deleteFailed', err),
  });

  const restoreFolder = trpc.folder.restore.useMutation({
    onError: (err) => showError('errors:restoreFailed', err),
  });

  const deleteFile = trpc.file.delete.useMutation({
    onError: (err) => showError('errors:deleteFailed', err),
  });

  const restoreFile = trpc.file.restore.useMutation({
    onError: (err) => showError('errors:restoreFailed', err),
  });

  const createFile = trpc.file.create.useMutation();

  const handleUpload = async (uploadFiles: File[]) => {
    if (!user) return;

    for (const file of uploadFiles) {
      try {
        const storageKey = await uploadFile(user.id, file);
        await createFile.mutateAsync({
          name: ensurePdfExtension(file.name),
          size: file.size,
          mimeType: PDF_MIME_TYPE,
          dataRoomId: roomId,
          folderId: null,
          storageKey,
        });
        toast({ title: t('actions:uploaded', { name: file.name }) });
      } catch (err) {
        toast({
          title: t('errors:uploadFailed'),
          description: getTrpcErrorMessage(err, t),
          variant: 'destructive',
        });
      }
    }
    void utils.file.list.invalidate();
    void utils.activity.list.invalidate({ dataRoomId: roomId });
    setUploadOpen(false);
  };

  const handleRename = (name: string) => {
    if (!renameTarget) return;
    if (renameTarget.type === 'folder') {
      renameFolder.mutate({ id: renameTarget.id, name });
    } else {
      renameFile.mutate({ id: renameTarget.id, name: ensurePdfExtension(name) });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    if (target.type === 'folder') {
      deleteFolder.mutate(
        { id: target.id },
        {
          onSuccess: () => {
            void utils.folder.list.invalidate();
            void utils.folder.listAll.invalidate({ dataRoomId: roomId });
            invalidateRoomActivity(utils, roomId);
            toast({
              title: t('actions:deleted', { name: target.name }),
              action: (
                <ToastAction
                  altText={t('actions:undo')}
                  onClick={() =>
                    restoreFolder.mutate(
                      { id: target.id },
                      {
                        onSuccess: () => {
                          void utils.folder.list.invalidate();
                          void utils.folder.listAll.invalidate({ dataRoomId: roomId });
                          invalidateRoomActivity(utils, roomId);
                          toast({ title: t('actions:restored', { name: target.name }) });
                        },
                      },
                    )
                  }
                >
                  {t('actions:undo')}
                </ToastAction>
              ),
            });
          },
        },
      );
      return;
    }

    deleteFile.mutate(
      { id: target.id },
      {
        onSuccess: () => {
          void utils.file.list.invalidate();
          invalidateRoomActivity(utils, roomId);
          const blobPurgeTimer = window.setTimeout(
            () => void deleteStoredFile(target.storageKey),
            TOAST_REMOVE_DELAY,
          );
          toast({
            title: t('actions:deleted', { name: target.name }),
            action: (
              <ToastAction
                altText={t('actions:undo')}
                onClick={() => {
                  window.clearTimeout(blobPurgeTimer);
                  restoreFile.mutate(
                    { id: target.id },
                    {
                      onSuccess: () => {
                        void utils.file.list.invalidate();
                        invalidateRoomActivity(utils, roomId);
                        toast({ title: t('actions:restored', { name: target.name }) });
                      },
                    },
                  );
                }}
              >
                {t('actions:undo')}
              </ToastAction>
            ),
          });
        },
      },
    );
  };

  const isLoading = foldersLoading || filesLoading;
  const isEmpty = !isLoading && items.length === 0;

  return (
    <RoomDndProvider roomId={roomId}>
      <AppShell
        sidebar={<TreeSidebar roomId={roomId} />}
        activityPanel={<ActivityPanel roomId={roomId} />}
        header={
          <RoomPageHeader
            breadcrumbs={<Breadcrumbs roomId={roomId} roomName={room?.name ?? '...'} />}
            search={<SearchBar roomId={roomId} className="w-full" />}
          />
        }
      >
        <RoomMobileSearch>
          <SearchBar roomId={roomId} className="w-full" />
        </RoomMobileSearch>

        <div className="mb-4">
          <RoomToolbar
            onCreateFolder={() => setCreateFolderOpen(true)}
            onToggleUpload={() => setUploadOpen((v) => !v)}
            uploadOpen={uploadOpen}
            canEdit={canEdit}
            showShare={isOwner}
            onShare={() => setShareOpen(true)}
          />
        </div>

        {uploadOpen && canEdit && (
          <div className="mb-6">
            <UploadDropzone onUpload={handleUpload} isUploading={createFile.isPending} />
          </div>
        )}

        {isEmpty ? (
          <EmptyState variant="room" />
        ) : (
          <>
            <div className="mb-4">
              <ExplorerFilter value={explorerFilter} onChange={setExplorerFilter} />
            </div>
            <FileExplorer
              roomId={roomId}
              items={filteredItems}
              isLoading={isLoading}
              canEdit={canEdit}
              onRename={setRenameTarget}
              onDelete={setDeleteTarget}
              onPreview={(item) =>
                setPreviewFile({ id: item.id, name: item.name, storageKey: item.storageKey })
              }
            />
          </>
        )}
      </AppShell>

      <PDFViewer />

      <ShareRoomDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        roomId={roomId}
        roomName={room?.name ?? '...'}
      />

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onSubmit={(name) => createFolder.mutate({ name, dataRoomId: roomId })}
        isLoading={createFolder.isPending}
      />

      {renameTarget && (
        <RenameDialog
          open={!!renameTarget}
          onOpenChange={(open) => !open && setRenameTarget(null)}
          currentName={renameTarget.name}
          itemType={renameTarget.type}
          onSubmit={handleRename}
          isLoading={renameFolder.isPending || renameFile.isPending}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          onConfirm={handleDelete}
          name={deleteTarget.name}
          itemType={deleteTarget.type}
          isFolder={deleteTarget.type === 'folder'}
          isLoading={deleteFolder.isPending || deleteFile.isPending}
        />
      )}
    </RoomDndProvider>
  );
}
