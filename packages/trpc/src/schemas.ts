import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(255, 'Name must be at most 255 characters');

export const dataRoomCreateSchema = z.object({
  name: nameSchema,
});

export const dataRoomDeleteSchema = z.object({
  id: z.string().cuid(),
});

export const roomMemberRoleSchema = z.enum(['EDITOR', 'VIEWER']);

export const memberInviteSchema = z.object({
  dataRoomId: z.string().cuid(),
  email: z.string().trim().email('invalidEmail').max(255, 'emailTooLong'),
  role: roomMemberRoleSchema.default('VIEWER'),
});

export const memberListSchema = z.object({
  dataRoomId: z.string().cuid(),
});

export const memberRemoveSchema = z.object({
  id: z.string().cuid(),
});

export const memberUpdateRoleSchema = z.object({
  id: z.string().cuid(),
  role: roomMemberRoleSchema,
});

export const folderListSchema = z.object({
  dataRoomId: z.string().cuid(),
  parentId: z.string().cuid().nullable().optional(),
});

export const folderCreateSchema = z.object({
  name: nameSchema,
  dataRoomId: z.string().cuid(),
  parentId: z.string().cuid().nullable().optional(),
});

export const folderRenameSchema = z.object({
  id: z.string().cuid(),
  name: nameSchema,
});

export const folderDeleteSchema = z.object({
  id: z.string().cuid(),
});

export const folderRestoreSchema = z.object({
  id: z.string().cuid(),
});

export const folderMoveSchema = z.object({
  id: z.string().cuid(),
  targetParentId: z.string().cuid().nullable(),
});

export const fileListSchema = z.object({
  dataRoomId: z.string().cuid(),
  folderId: z.string().cuid().nullable().optional(),
});

export const fileCreateSchema = z.object({
  name: nameSchema,
  size: z.number().int().positive(),
  mimeType: z.literal('application/pdf'),
  dataRoomId: z.string().cuid(),
  folderId: z.string().cuid().nullable().optional(),
  storageKey: z.string().min(1).max(255),
});

export const fileRenameSchema = z.object({
  id: z.string().cuid(),
  name: nameSchema,
});

export const fileDeleteSchema = z.object({
  id: z.string().cuid(),
});

export const fileRestoreSchema = z.object({
  id: z.string().cuid(),
});

export const fileMoveSchema = z.object({
  id: z.string().cuid(),
  targetFolderId: z.string().cuid().nullable(),
});

export const activityListSchema = z.object({
  dataRoomId: z.string().cuid(),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export const searchQuerySchema = z.object({
  dataRoomId: z.string().cuid(),
  q: z.string().min(1).max(255).trim(),
});

export const searchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['file', 'folder']),
  folderId: z.string().nullable(),
  parentId: z.string().nullable(),
});

export type SearchResult = z.infer<typeof searchResultSchema>;

export function createConflictError(message = 'An item with this name already exists') {
  return new TRPCError({
    code: 'CONFLICT',
    message,
  });
}

export function createNotFoundError(message = 'Resource not found') {
  return new TRPCError({
    code: 'NOT_FOUND',
    message,
  });
}

export function createForbiddenError(message = 'Forbidden') {
  return new TRPCError({
    code: 'FORBIDDEN',
    message,
  });
}

export function createBadRequestError(message: string) {
  return new TRPCError({
    code: 'BAD_REQUEST',
    message,
  });
}
