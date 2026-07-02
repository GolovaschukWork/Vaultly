import { ActivityType, prisma } from '@vaultly/db';
import {
  createBadRequestError,
  createConflictError,
  createNotFoundError,
  dataRoomCreateSchema,
  dataRoomDeleteSchema,
  folderCreateSchema,
  folderDeleteSchema,
  folderListSchema,
  folderMoveSchema,
  folderRenameSchema,
  folderRestoreSchema,
  fileCreateSchema,
  fileDeleteSchema,
  fileListSchema,
  fileMoveSchema,
  fileRenameSchema,
  fileRestoreSchema,
  activityListSchema,
  searchQuerySchema,
  protectedProcedure,
  router,
} from '@vaultly/trpc';
import {
  getAccessibleFile,
  getAccessibleFolder,
  getRoomAccess,
  requireRoomAccess,
  requireRoomOwner,
} from './access';
import { createSignedStorageUrl } from '../lib/supabase-storage';
import { ensureInvitesActivated, memberRouter } from './member.router';

async function logActivity(
  dataRoomId: string,
  type: ActivityType,
  entityType: string,
  entityId: string,
  entityName: string,
) {
  await prisma.activity.create({
    data: { dataRoomId, type, entityType, entityId, entityName },
  });
}

async function checkFolderNameConflict(
  dataRoomId: string,
  parentId: string | null,
  name: string,
  excludeId?: string,
) {
  const existing = await prisma.folder.findFirst({
    where: {
      dataRoomId,
      parentId,
      name,
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  if (existing) throw createConflictError();
}

async function checkFileNameConflict(
  dataRoomId: string,
  folderId: string | null,
  name: string,
  excludeId?: string,
) {
  const existing = await prisma.file.findFirst({
    where: {
      dataRoomId,
      folderId,
      name,
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  if (existing) throw createConflictError();
}

async function softDeleteFolderCascade(folderId: string) {
  const children = await prisma.folder.findMany({
    where: { parentId: folderId, deletedAt: null },
  });

  for (const child of children) {
    await softDeleteFolderCascade(child.id);
  }

  await prisma.file.updateMany({
    where: { folderId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  await prisma.folder.update({
    where: { id: folderId },
    data: { deletedAt: new Date() },
  });
}

async function restoreFolderCascade(folderId: string) {
  await prisma.folder.update({
    where: { id: folderId },
    data: { deletedAt: null },
  });

  await prisma.file.updateMany({
    where: { folderId },
    data: { deletedAt: null },
  });

  const children = await prisma.folder.findMany({
    where: { parentId: folderId },
  });

  for (const child of children) {
    await restoreFolderCascade(child.id);
  }
}

async function isDescendantOf(folderId: string, ancestorId: string): Promise<boolean> {
  let current = await prisma.folder.findUnique({ where: { id: folderId } });
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    current = await prisma.folder.findUnique({ where: { id: current.parentId } });
  }
  return false;
}

export const appRouter = router({
  dataRoom: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await ensureInvitesActivated(ctx);

      const owned = await prisma.dataRoom.findMany({
        where: { userId: ctx.userId },
        orderBy: { updatedAt: 'desc' },
      });

      const memberships = await prisma.roomMember.findMany({
        where: { userId: ctx.userId, status: 'ACTIVE' },
        include: { dataRoom: true },
        orderBy: { updatedAt: 'desc' },
      });

      const ownedRooms = owned.map((room) => ({
        ...room,
        accessRole: 'owner' as const,
      }));

      const sharedRooms = memberships
        .filter((membership) => membership.dataRoom.userId !== ctx.userId)
        .map((membership) => ({
          ...membership.dataRoom,
          accessRole: membership.role === 'EDITOR' ? ('editor' as const) : ('viewer' as const),
        }));

      return [...ownedRooms, ...sharedRooms];
    }),

    getAccess: protectedProcedure.input(dataRoomDeleteSchema).query(async ({ ctx, input }) => {
      await ensureInvitesActivated(ctx);
      const accessRole = await getRoomAccess(input.id, ctx.userId);
      if (!accessRole) throw createNotFoundError('Data room not found');
      return { accessRole };
    }),

    create: protectedProcedure.input(dataRoomCreateSchema).mutation(async ({ ctx, input }) => {
      const room = await prisma.dataRoom.create({
        data: { name: input.name, userId: ctx.userId },
      });
      await logActivity(room.id, ActivityType.CREATED, 'room', room.id, room.name);
      return room;
    }),

    delete: protectedProcedure.input(dataRoomDeleteSchema).mutation(async ({ ctx, input }) => {
      await requireRoomOwner(input.id, ctx.userId);
      await prisma.dataRoom.delete({ where: { id: input.id } });
    }),
  }),

  member: memberRouter,

  folder: router({
    list: protectedProcedure.input(folderListSchema).query(async ({ ctx, input }) => {
      await requireRoomAccess(input.dataRoomId, ctx.userId, 'viewer');
      return prisma.folder.findMany({
        where: {
          dataRoomId: input.dataRoomId,
          parentId: input.parentId ?? null,
          deletedAt: null,
        },
        orderBy: { name: 'asc' },
      });
    }),

    listAll: protectedProcedure
      .input(folderListSchema.pick({ dataRoomId: true }))
      .query(async ({ ctx, input }) => {
        await requireRoomAccess(input.dataRoomId, ctx.userId, 'viewer');
        return prisma.folder.findMany({
          where: { dataRoomId: input.dataRoomId, deletedAt: null },
          orderBy: { name: 'asc' },
        });
      }),

    create: protectedProcedure.input(folderCreateSchema).mutation(async ({ ctx, input }) => {
      await requireRoomAccess(input.dataRoomId, ctx.userId, 'editor');
      const parentId = input.parentId ?? null;
      await checkFolderNameConflict(input.dataRoomId, parentId, input.name);

      if (parentId) {
        const parent = await prisma.folder.findFirst({
          where: { id: parentId, dataRoomId: input.dataRoomId, deletedAt: null },
        });
        if (!parent) throw createNotFoundError('Parent folder not found');
      }

      const folder = await prisma.folder.create({
        data: {
          name: input.name,
          dataRoomId: input.dataRoomId,
          parentId,
        },
      });
      await logActivity(input.dataRoomId, ActivityType.CREATED, 'folder', folder.id, folder.name);
      return folder;
    }),

    rename: protectedProcedure.input(folderRenameSchema).mutation(async ({ ctx, input }) => {
      const folder = await getAccessibleFolder(input.id, ctx.userId, 'editor');
      await checkFolderNameConflict(folder.dataRoomId, folder.parentId, input.name, folder.id);

      const updated = await prisma.folder.update({
        where: { id: input.id },
        data: { name: input.name },
      });
      await logActivity(folder.dataRoomId, ActivityType.RENAMED, 'folder', folder.id, input.name);
      return updated;
    }),

    delete: protectedProcedure.input(folderDeleteSchema).mutation(async ({ ctx, input }) => {
      const folder = await getAccessibleFolder(input.id, ctx.userId, 'editor');
      await softDeleteFolderCascade(input.id);
      await logActivity(folder.dataRoomId, ActivityType.DELETED, 'folder', folder.id, folder.name);
    }),

    restore: protectedProcedure.input(folderRestoreSchema).mutation(async ({ ctx, input }) => {
      const folder = await getAccessibleFolder(input.id, ctx.userId, 'editor', true);

      if (folder.parentId) {
        const parent = await prisma.folder.findFirst({
          where: { id: folder.parentId, deletedAt: null },
        });
        if (!parent) {
          throw createBadRequestError('Cannot restore folder: parent folder is deleted');
        }
      }

      await restoreFolderCascade(input.id);
    }),

    move: protectedProcedure.input(folderMoveSchema).mutation(async ({ ctx, input }) => {
      const folder = await getAccessibleFolder(input.id, ctx.userId, 'editor');

      if (input.targetParentId === input.id) {
        throw createBadRequestError('Cannot move folder into itself');
      }

      if (input.targetParentId) {
        const isDescendant = await isDescendantOf(input.targetParentId, input.id);
        if (isDescendant) {
          throw createBadRequestError('Cannot move folder into its own descendant');
        }

        const target = await prisma.folder.findFirst({
          where: {
            id: input.targetParentId,
            dataRoomId: folder.dataRoomId,
            deletedAt: null,
          },
        });
        if (!target) throw createNotFoundError('Target folder not found');
      }

      await checkFolderNameConflict(
        folder.dataRoomId,
        input.targetParentId,
        folder.name,
        folder.id,
      );

      const updated = await prisma.folder.update({
        where: { id: input.id },
        data: { parentId: input.targetParentId },
      });
      await logActivity(folder.dataRoomId, ActivityType.MOVED, 'folder', folder.id, folder.name);
      return updated;
    }),

    getPath: protectedProcedure.input(folderDeleteSchema).query(async ({ ctx, input }) => {
      await getAccessibleFolder(input.id, ctx.userId, 'viewer');
      const path: { id: string; name: string }[] = [];
      let current = await prisma.folder.findFirst({
        where: { id: input.id, deletedAt: null },
      });

      while (current) {
        path.unshift({ id: current.id, name: current.name });
        if (!current.parentId) break;
        current = await prisma.folder.findFirst({
          where: { id: current.parentId, deletedAt: null },
        });
      }

      return path;
    }),
  }),

  file: router({
    list: protectedProcedure.input(fileListSchema).query(async ({ ctx, input }) => {
      await requireRoomAccess(input.dataRoomId, ctx.userId, 'viewer');
      return prisma.file.findMany({
        where: {
          dataRoomId: input.dataRoomId,
          folderId: input.folderId ?? null,
          deletedAt: null,
        },
        orderBy: { name: 'asc' },
      });
    }),

    getPreviewUrl: protectedProcedure.input(fileDeleteSchema).query(async ({ ctx, input }) => {
      const file = await getAccessibleFile(input.id, ctx.userId, 'viewer');

      if (!file.storageKey.includes('/')) {
        throw createBadRequestError(
          'This file was uploaded before cloud storage. Please delete and upload it again.',
        );
      }

      const url = await createSignedStorageUrl(file.storageKey);
      if (!url) {
        throw createNotFoundError('PDF file not found in storage');
      }

      return { url };
    }),

    create: protectedProcedure.input(fileCreateSchema).mutation(async ({ ctx, input }) => {
      await requireRoomAccess(input.dataRoomId, ctx.userId, 'editor');
      const folderId = input.folderId ?? null;
      await checkFileNameConflict(input.dataRoomId, folderId, input.name);

      if (folderId) {
        const folder = await prisma.folder.findFirst({
          where: { id: folderId, dataRoomId: input.dataRoomId, deletedAt: null },
        });
        if (!folder) throw createNotFoundError('Folder not found');
      }

      const file = await prisma.file.create({
        data: {
          name: input.name,
          size: input.size,
          mimeType: input.mimeType,
          dataRoomId: input.dataRoomId,
          folderId,
          storageKey: input.storageKey,
        },
      });
      await logActivity(input.dataRoomId, ActivityType.UPLOADED, 'file', file.id, file.name);
      return file;
    }),

    rename: protectedProcedure.input(fileRenameSchema).mutation(async ({ ctx, input }) => {
      const file = await getAccessibleFile(input.id, ctx.userId, 'editor');
      await checkFileNameConflict(file.dataRoomId, file.folderId, input.name, file.id);

      const updated = await prisma.file.update({
        where: { id: input.id },
        data: { name: input.name },
      });
      await logActivity(file.dataRoomId, ActivityType.RENAMED, 'file', file.id, input.name);
      return updated;
    }),

    delete: protectedProcedure.input(fileDeleteSchema).mutation(async ({ ctx, input }) => {
      const file = await getAccessibleFile(input.id, ctx.userId, 'editor');
      await prisma.file.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
      await logActivity(file.dataRoomId, ActivityType.DELETED, 'file', file.id, file.name);
    }),

    restore: protectedProcedure.input(fileRestoreSchema).mutation(async ({ ctx, input }) => {
      const file = await getAccessibleFile(input.id, ctx.userId, 'editor', true);

      if (file.folderId) {
        const folder = await prisma.folder.findFirst({
          where: { id: file.folderId, deletedAt: null },
        });
        if (!folder) {
          throw createBadRequestError('Cannot restore file: parent folder is deleted');
        }
      }

      await prisma.file.update({
        where: { id: input.id },
        data: { deletedAt: null },
      });
    }),

    move: protectedProcedure.input(fileMoveSchema).mutation(async ({ ctx, input }) => {
      const file = await getAccessibleFile(input.id, ctx.userId, 'editor');

      if (input.targetFolderId) {
        const target = await prisma.folder.findFirst({
          where: {
            id: input.targetFolderId,
            dataRoomId: file.dataRoomId,
            deletedAt: null,
          },
        });
        if (!target) throw createNotFoundError('Target folder not found');
      }

      await checkFileNameConflict(file.dataRoomId, input.targetFolderId, file.name, file.id);

      const updated = await prisma.file.update({
        where: { id: input.id },
        data: { folderId: input.targetFolderId },
      });
      await logActivity(file.dataRoomId, ActivityType.MOVED, 'file', file.id, file.name);
      return updated;
    }),
  }),

  activity: router({
    list: protectedProcedure.input(activityListSchema).query(async ({ ctx, input }) => {
      await requireRoomAccess(input.dataRoomId, ctx.userId, 'viewer');
      return prisma.activity.findMany({
        where: { dataRoomId: input.dataRoomId },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });
    }),
  }),

  search: router({
    query: protectedProcedure.input(searchQuerySchema).query(async ({ ctx, input }) => {
      await requireRoomAccess(input.dataRoomId, ctx.userId, 'viewer');
      const q = input.q.toLowerCase();

      const [folders, files] = await Promise.all([
        prisma.folder.findMany({
          where: {
            dataRoomId: input.dataRoomId,
            deletedAt: null,
            name: { contains: q, mode: 'insensitive' },
          },
          take: 20,
        }),
        prisma.file.findMany({
          where: {
            dataRoomId: input.dataRoomId,
            deletedAt: null,
            name: { contains: q, mode: 'insensitive' },
          },
          take: 20,
        }),
      ]);

      return [
        ...folders.map((f) => ({
          id: f.id,
          name: f.name,
          type: 'folder' as const,
          folderId: f.parentId,
          parentId: f.parentId,
        })),
        ...files.map((f) => ({
          id: f.id,
          name: f.name,
          type: 'file' as const,
          folderId: f.folderId,
          parentId: f.folderId,
          storageKey: f.storageKey,
        })),
      ];
    }),
  }),
});

export type AppRouter = typeof appRouter;
