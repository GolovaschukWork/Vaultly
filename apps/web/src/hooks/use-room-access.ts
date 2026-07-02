import { trpc } from '@/lib/trpc';

export function useRoomAccess(roomId: string) {
  const { data, isLoading, isError } = trpc.dataRoom.getAccess.useQuery({ id: roomId });

  const accessRole = data?.accessRole;
  const canEdit = accessRole === 'owner' || accessRole === 'editor';
  const isOwner = accessRole === 'owner';

  return { accessRole, canEdit, isOwner, isLoading, isError };
}
