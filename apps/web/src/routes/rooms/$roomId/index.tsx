import { createFileRoute } from '@tanstack/react-router';
import { RoomExplorer } from '@/components/room-explorer';

export const Route = createFileRoute('/rooms/$roomId/')({
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = Route.useParams();
  return <RoomExplorer roomId={roomId} folderId={null} />;
}
