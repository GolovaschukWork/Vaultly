import { createFileRoute } from '@tanstack/react-router';
import { RoomExplorer } from '@/components/room-explorer';

export const Route = createFileRoute('/rooms/$roomId/f/$folderId')({
  component: FolderPage,
});

function FolderPage() {
  const { roomId, folderId } = Route.useParams();
  return <RoomExplorer roomId={roomId} folderId={folderId} />;
}
