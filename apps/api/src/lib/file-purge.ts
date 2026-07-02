import { prisma } from '@vaultly/db';
import { removeStorageObject } from './supabase-storage';

/** Matches client undo toast window (apps/web/src/hooks/use-toast.ts). */
export const SOFT_DELETE_GRACE_MS = 10_000;

export async function purgeFileStorage(storageKey: string): Promise<void> {
  if (!storageKey.includes('/')) return;

  try {
    await removeStorageObject(storageKey);
  } catch {
    // Blob may already be removed; continue with metadata cleanup.
  }
}

export async function hardDeleteFileRecord(fileId: string): Promise<void> {
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) return;

  await purgeFileStorage(file.storageKey);
  await prisma.file.delete({ where: { id: fileId } });
}

export async function purgeExpiredSoftDeletedFiles(dataRoomId?: string): Promise<void> {
  const cutoff = new Date(Date.now() - SOFT_DELETE_GRACE_MS);
  const expired = await prisma.file.findMany({
    where: {
      deletedAt: { not: null, lt: cutoff },
      ...(dataRoomId ? { dataRoomId } : {}),
    },
  });

  for (const file of expired) {
    await hardDeleteFileRecord(file.id);
  }
}

export async function purgeAllRoomFileStorage(dataRoomId: string): Promise<void> {
  const files = await prisma.file.findMany({
    where: { dataRoomId },
    select: { storageKey: true },
  });

  await Promise.all(files.map((file) => purgeFileStorage(file.storageKey)));
}
