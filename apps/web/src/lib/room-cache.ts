import type { trpc } from '@/lib/trpc';

type Utils = ReturnType<typeof trpc.useUtils>;

export function invalidateRoomActivity(utils: Utils, roomId: string) {
  void utils.activity.list.invalidate({ dataRoomId: roomId });
}
