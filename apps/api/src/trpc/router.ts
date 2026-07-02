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
  publicProcedure,
  router,
} from '@vaultly/trpc';

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
    list: publicProcedure.query(async () => {
      return prisma.dataRoom.findMany({
        orderBy: { updatedAt: 'desc' },
      });
    }),

    create: publicProcedure.input(dataRoomCreateSchema).mutation(async ({ input }) => {
      const room = await prisma.dataRoom.create({
        data: { name: input.name },
      });
      await logActivity(room.id, ActivityType.CREATED, 'room', room.id, room.name);
      return room;
    }),

    delete: publicProcedure.input(dataRoomDeleteSchema).mutation(async ({ input }) => {
      const room = await prisma.dataRoom.findUnique({ where: { id: input.id } });
      if (!room) throw createNotFoundError('Data room not found');
      await prisma.dataRoom.delete({ where: { id: input.id } });
    }),
  }),

  folder: router({
    list: publicProcedure.input(folderListSchema).query(async ({ input }) => {
      return prisma.folder.findMany({
        where: {
          dataRoomId: input.dataRoomId,
          parentId: input.parentId ?? null,
          deletedAt: null,
        },
        orderBy: { name: 'asc' },
      });
    }),

    listAll: publicProcedure
      .input(folderListSchema.pick({ dataRoomId: true }))
      .query(async ({ input }) => {
        return prisma.folder.findMany({
          where: { dataRoomId: input.dataRoomId, deletedAt: null },
          orderBy: { name: 'asc' },
        });
      }),

    create: publicProcedure.input(folderCreateSchema).mutation(async ({ input }) => {
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

    rename: publicProcedure.input(folderRenameSchema).mutation(async ({ input }) => {
      const folder = await prisma.folder.findFirst({
        where: { id: input.id, deletedAt: null },
      });
      if (!folder) throw createNotFoundError('Folder not found');

      await checkFolderNameConflict(folder.dataRoomId, folder.parentId, input.name, folder.id);

      const updated = await prisma.folder.update({
        where: { id: input.id },
        data: { name: input.name },
      });
      await logActivity(folder.dataRoomId, ActivityType.RENAMED, 'folder', folder.id, input.name);
      return updated;
    }),

    delete: publicProcedure.input(folderDeleteSchema).mutation(async ({ input }) => {
      const folder = await prisma.folder.findFirst({
        where: { id: input.id, deletedAt: null },
      });
      if (!folder) throw createNotFoundError('Folder not found');

      await softDeleteFolderCascade(input.id);
      await logActivity(folder.dataRoomId, ActivityType.DELETED, 'folder', folder.id, folder.name);
    }),

    restore: publicProcedure.input(folderRestoreSchema).mutation(async ({ input }) => {
      const folder = await prisma.folder.findUnique({ where: { id: input.id } });
      if (!folder) throw createNotFoundError('Folder not found');

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

    move: publicProcedure.input(folderMoveSchema).mutation(async ({ input }) => {
      const folder = await prisma.folder.findFirst({
        where: { id: input.id, deletedAt: null },
      });
      if (!folder) throw createNotFoundError('Folder not found');

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

    getPath: publicProcedure.input(folderDeleteSchema).query(async ({ input }) => {
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
    list: publicProcedure.input(fileListSchema).query(async ({ input }) => {
      return prisma.file.findMany({
        where: {
          dataRoomId: input.dataRoomId,
          folderId: input.folderId ?? null,
          deletedAt: null,
        },
        orderBy: { name: 'asc' },
      });
    }),

    create: publicProcedure.input(fileCreateSchema).mutation(async ({ input }) => {
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

    rename: publicProcedure.input(fileRenameSchema).mutation(async ({ input }) => {
      const file = await prisma.file.findFirst({
        where: { id: input.id, deletedAt: null },
      });
      if (!file) throw createNotFoundError('File not found');

      await checkFileNameConflict(file.dataRoomId, file.folderId, input.name, file.id);

      const updated = await prisma.file.update({
        where: { id: input.id },
        data: { name: input.name },
      });
      await logActivity(file.dataRoomId, ActivityType.RENAMED, 'file', file.id, input.name);
      return updated;
    }),

    delete: publicProcedure.input(fileDeleteSchema).mutation(async ({ input }) => {
      const file = await prisma.file.findFirst({
        where: { id: input.id, deletedAt: null },
      });
      if (!file) throw createNotFoundError('File not found');

      await prisma.file.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
      await logActivity(file.dataRoomId, ActivityType.DELETED, 'file', file.id, file.name);
    }),

    restore: publicProcedure.input(fileRestoreSchema).mutation(async ({ input }) => {
      const file = await prisma.file.findUnique({ where: { id: input.id } });
      if (!file) throw createNotFoundError('File not found');

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

    move: publicProcedure.input(fileMoveSchema).mutation(async ({ input }) => {
      const file = await prisma.file.findFirst({
        where: { id: input.id, deletedAt: null },
      });
      if (!file) throw createNotFoundError('File not found');

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
    list: publicProcedure.input(activityListSchema).query(async ({ input }) => {
      return prisma.activity.findMany({
        where: { dataRoomId: input.dataRoomId },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });
    }),
  }),

  search: router({
    query: publicProcedure.input(searchQuerySchema).query(async ({ input }) => {
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
        })),
      ];
    }),
  }),
});

export type AppRouter = typeof appRouter;
