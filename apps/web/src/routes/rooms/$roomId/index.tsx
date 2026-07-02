import { Button } from '@vaultly/ui';
import { createFileRoute } from '@tanstack/react-router';
import { FolderPlus, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityPanel } from '@/components/activity-panel';
import { AppShell } from '@/components/app-shell';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { CreateFolderDialog, DeleteConfirmDialog, RenameDialog } from '@/components/dialogs';
import { EmptyState } from '@/components/empty-state';
import { FileExplorer, type ExplorerItem } from '@/components/file-explorer';
import { PDFViewer } from '@/components/pdf-viewer';
import { SearchBar } from '@/components/search-bar';
import { TreeSidebar } from '@/components/tree-sidebar';
import { UploadDropzone } from '@/components/upload-dropzone';
import { toast, ToastAction } from '@/hooks/use-toast';
import { deleteBlob, generateStorageKey, storeBlob } from '@/lib/dexie';
import { trpc } from '@/lib/trpc';
import { ensurePdfExtension, PDF_MIME_TYPE } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';

export const Route = createFileRoute('/rooms/$roomId/')({
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = Route.useParams();
  const { t } = useTranslation();
  const { setPreviewFile } = useUIStore();

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

  const createFolder = trpc.folder.create.useMutation({
    onSuccess: (folder) => {
      void utils.folder.list.invalidate();
      void utils.folder.listAll.invalidate({ dataRoomId: roomId });
      void utils.activity.list.invalidate({ dataRoomId: roomId });
      setCreateFolderOpen(false);
      toast({ title: t('actions:created', { name: folder.name }) });
    },
    onError: (err) =>
      toast({ title: t('errors:createFailed'), description: err.message, variant: 'destructive' }),
  });

  const renameFolder = trpc.folder.rename.useMutation({
    onSuccess: (folder) => {
      void utils.folder.list.invalidate();
      void utils.folder.listAll.invalidate({ dataRoomId: roomId });
      setRenameTarget(null);
      toast({ title: t('actions:renamed', { name: folder.name }) });
    },
    onError: (err) =>
      toast({ title: t('errors:renameFailed'), description: err.message, variant: 'destructive' }),
  });

  const renameFile = trpc.file.rename.useMutation({
    onSuccess: (file) => {
      void utils.file.list.invalidate();
      setRenameTarget(null);
      toast({ title: t('actions:renamed', { name: file.name }) });
    },
    onError: (err) =>
      toast({ title: t('errors:renameFailed'), description: err.message, variant: 'destructive' }),
  });

  const deleteFolder = trpc.folder.delete.useMutation({
    onSuccess: () => {
      void utils.folder.list.invalidate();
      void utils.folder.listAll.invalidate({ dataRoomId: roomId });
      void utils.activity.list.invalidate({ dataRoomId: roomId });
      const name = deleteTarget?.name ?? '';
      setDeleteTarget(null);
      toast({
        title: t('actions:deleted', { name }),
        action: (
          <ToastAction
            altText={t('actions:undo')}
            onClick={() => restoreFolder.mutate({ id: deleteTarget!.id })}
          >
            {t('actions:undo')}
          </ToastAction>
        ),
      });
    },
    onError: (err) =>
      toast({ title: t('errors:deleteFailed'), description: err.message, variant: 'destructive' }),
  });

  const restoreFolder = trpc.folder.restore.useMutation({
    onSuccess: () => {
      void utils.folder.list.invalidate();
      void utils.folder.listAll.invalidate({ dataRoomId: roomId });
      toast({ title: t('actions:restored', { name: deleteTarget?.name ?? '' }) });
    },
  });

  const deleteFile = trpc.file.delete.useMutation({
    onSuccess: () => {
      const target = deleteTarget;
      void utils.file.list.invalidate();
      void utils.activity.list.invalidate({ dataRoomId: roomId });
      setDeleteTarget(null);

      if (target?.type === 'file') {
        const storageKey = target.storageKey;
        const fileId = target.id;
        const fileName = target.name;

        toast({
          title: t('actions:deleted', { name: fileName }),
          action: (
            <ToastAction
              altText={t('actions:undo')}
              onClick={() => restoreFile.mutate({ id: fileId })}
            >
              {t('actions:undo')}
            </ToastAction>
          ),
        });

        setTimeout(() => {
          void deleteBlob(storageKey);
        }, 10000);
      }
    },
    onError: (err) =>
      toast({ title: t('errors:deleteFailed'), description: err.message, variant: 'destructive' }),
  });

  const restoreFile = trpc.file.restore.useMutation({
    onSuccess: () => {
      void utils.file.list.invalidate();
      toast({ title: t('actions:restored', { name: deleteTarget?.name ?? '' }) });
    },
  });

  const createFile = trpc.file.create.useMutation();

  const handleUpload = async (uploadFiles: File[]) => {
    for (const file of uploadFiles) {
      const storageKey = generateStorageKey();
      try {
        await storeBlob(storageKey, file, file.name, PDF_MIME_TYPE);
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
          description: err instanceof Error ? err.message : undefined,
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
    if (deleteTarget.type === 'folder') {
      deleteFolder.mutate({ id: deleteTarget.id });
    } else {
      deleteFile.mutate({ id: deleteTarget.id });
    }
  };

  const isLoading = foldersLoading || filesLoading;
  const isEmpty = !isLoading && items.length === 0;

  return (
    <>
      <AppShell
        sidebar={<TreeSidebar roomId={roomId} />}
        activityPanel={<ActivityPanel roomId={roomId} />}
        header={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Breadcrumbs roomId={roomId} roomName={room?.name ?? '...'} />
            <SearchBar roomId={roomId} className="w-full sm:max-w-xs" />
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setCreateFolderOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            {t('actions:newFolder')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setUploadOpen((v) => !v)}>
            <Upload className="mr-2 h-4 w-4" />
            {t('actions:upload')}
          </Button>
        </div>

        {uploadOpen && (
          <div className="mb-6">
            <UploadDropzone onUpload={handleUpload} isUploading={createFile.isPending} />
          </div>
        )}

        {isEmpty ? (
          <EmptyState variant="room" />
        ) : (
          <FileExplorer
            roomId={roomId}
            items={items}
            isLoading={isLoading}
            onRename={setRenameTarget}
            onDelete={setDeleteTarget}
            onPreview={(item) =>
              setPreviewFile({ id: item.id, name: item.name, storageKey: item.storageKey })
            }
          />
        )}
      </AppShell>

      <PDFViewer />

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
    </>
  );
}
