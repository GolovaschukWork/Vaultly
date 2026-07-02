import { prisma } from '@vaultly/db';
import {
  createBadRequestError,
  createConflictError,
  createNotFoundError,
  memberInviteSchema,
  memberListSchema,
  memberRemoveSchema,
  memberUpdateRoleSchema,
  protectedProcedure,
  router,
} from '@vaultly/trpc';
import {
  activatePendingInvites,
  normalizeEmail,
  requireRoomOwner,
  requireRoomAccess,
} from './access';

export const memberRouter = router({
  list: protectedProcedure.input(memberListSchema).query(async ({ ctx, input }) => {
    await requireRoomAccess(input.dataRoomId, ctx.userId, 'viewer');

    return prisma.roomMember.findMany({
      where: { dataRoomId: input.dataRoomId },
      orderBy: { createdAt: 'asc' },
    });
  }),

  invite: protectedProcedure.input(memberInviteSchema).mutation(async ({ ctx, input }) => {
    await requireRoomOwner(input.dataRoomId, ctx.userId);

    const email = normalizeEmail(input.email);
    if (ctx.userEmail && normalizeEmail(ctx.userEmail) === email) {
      throw createBadRequestError('Cannot invite yourself');
    }

    const room = await prisma.dataRoom.findUnique({ where: { id: input.dataRoomId } });
    if (!room) throw createNotFoundError('Data room not found');

    const existing = await prisma.roomMember.findUnique({
      where: {
        dataRoomId_email: {
          dataRoomId: input.dataRoomId,
          email,
        },
      },
    });
    if (existing) throw createConflictError('This member is already invited');

    return prisma.roomMember.create({
      data: {
        dataRoomId: input.dataRoomId,
        email,
        role: input.role,
        status: 'PENDING',
        invitedBy: ctx.userId,
      },
    });
  }),

  remove: protectedProcedure.input(memberRemoveSchema).mutation(async ({ ctx, input }) => {
    const member = await prisma.roomMember.findUnique({ where: { id: input.id } });
    if (!member) throw createNotFoundError('Member not found');

    await requireRoomOwner(member.dataRoomId, ctx.userId);
    await prisma.roomMember.delete({ where: { id: input.id } });
  }),

  updateRole: protectedProcedure.input(memberUpdateRoleSchema).mutation(async ({ ctx, input }) => {
    const member = await prisma.roomMember.findUnique({ where: { id: input.id } });
    if (!member) throw createNotFoundError('Member not found');

    await requireRoomOwner(member.dataRoomId, ctx.userId);

    return prisma.roomMember.update({
      where: { id: input.id },
      data: { role: input.role },
    });
  }),
});

export async function ensureInvitesActivated(ctx: { userId: string; userEmail: string | null }) {
  await activatePendingInvites(ctx.userId, ctx.userEmail);
}
