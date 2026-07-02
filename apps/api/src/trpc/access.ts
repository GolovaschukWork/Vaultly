import { prisma } from '@vaultly/db';
import { createForbiddenError, createNotFoundError } from '@vaultly/trpc';

export type RoomAccessRole = 'owner' | 'editor' | 'viewer';

const ROLE_RANK: Record<RoomAccessRole, number> = {
  viewer: 0,
  editor: 1,
  owner: 2,
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function activatePendingInvites(userId: string, email: string | null) {
  if (!email) return;

  await prisma.roomMember.updateMany({
    where: {
      email: normalizeEmail(email),
      status: 'PENDING',
      userId: null,
    },
    data: {
      userId,
      status: 'ACTIVE',
    },
  });
}

export async function getRoomAccess(
  dataRoomId: string,
  userId: string,
): Promise<RoomAccessRole | null> {
  const room = await prisma.dataRoom.findUnique({ where: { id: dataRoomId } });
  if (!room) return null;
  if (room.userId === userId) return 'owner';

  const member = await prisma.roomMember.findFirst({
    where: { dataRoomId, userId, status: 'ACTIVE' },
  });
  if (!member) return null;

  return member.role === 'EDITOR' ? 'editor' : 'viewer';
}

export async function requireRoomAccess(
  dataRoomId: string,
  userId: string,
  minRole: RoomAccessRole = 'viewer',
) {
  const access = await getRoomAccess(dataRoomId, userId);
  if (!access) throw createNotFoundError('Data room not found');
  if (ROLE_RANK[access] < ROLE_RANK[minRole]) throw createForbiddenError();
  return access;
}

export async function requireRoomOwner(dataRoomId: string, userId: string) {
  return requireRoomAccess(dataRoomId, userId, 'owner');
}

export async function getAccessibleFolder(
  folderId: string,
  userId: string,
  minRole: RoomAccessRole = 'viewer',
  includeDeleted = false,
) {
  const folder = await prisma.folder.findFirst({
    where: {
      id: folderId,
      ...(includeDeleted ? {} : { deletedAt: null }),
    },
  });
  if (!folder) throw createNotFoundError('Folder not found');

  await requireRoomAccess(folder.dataRoomId, userId, minRole);
  return folder;
}

export async function getAccessibleFile(
  fileId: string,
  userId: string,
  minRole: RoomAccessRole = 'viewer',
  includeDeleted = false,
) {
  const file = await prisma.file.findFirst({
    where: {
      id: fileId,
      ...(includeDeleted ? {} : { deletedAt: null }),
    },
  });
  if (!file) throw createNotFoundError('File not found');

  await requireRoomAccess(file.dataRoomId, userId, minRole);
  return file;
}

// Backwards-compatible aliases
export async function getOwnedRoom(dataRoomId: string, userId: string) {
  return requireRoomOwner(dataRoomId, userId);
}

export const getOwnedFolder = (folderId: string, userId: string, includeDeleted = false) =>
  getAccessibleFolder(folderId, userId, 'editor', includeDeleted);

export const getOwnedFile = (fileId: string, userId: string, includeDeleted = false) =>
  getAccessibleFile(fileId, userId, 'editor', includeDeleted);
