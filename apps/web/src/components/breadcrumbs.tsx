import { Link } from '@tanstack/react-router';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { trpc } from '@/lib/trpc';

interface BreadcrumbsProps {
  roomId: string;
  roomName: string;
  folderId?: string | null;
}

export function Breadcrumbs({ roomId, roomName, folderId }: BreadcrumbsProps) {
  const { t } = useTranslation('common');

  const { data: path = [] } = trpc.folder.getPath.useQuery(
    { id: folderId! },
    { enabled: !!folderId },
  );

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 overflow-x-auto text-sm">
      <Link
        to="/"
        className="text-content-secondary hover:text-content-primary flex shrink-0 items-center gap-1"
      >
        <Home className="h-4 w-4" />
        <span className="hidden sm:inline">{t('home')}</span>
      </Link>

      <ChevronRight className="text-content-muted h-4 w-4 shrink-0" />

      <Link
        to="/rooms/$roomId"
        params={{ roomId }}
        className="text-content-secondary hover:text-content-primary max-w-[120px] truncate sm:max-w-none"
      >
        {roomName}
      </Link>

      {path.map((segment) => (
        <span key={segment.id} className="flex shrink-0 items-center gap-1">
          <ChevronRight className="text-content-muted h-4 w-4" />
          <Link
            to="/rooms/$roomId/f/$folderId"
            params={{ roomId, folderId: segment.id }}
            className="text-content-secondary hover:text-content-primary max-w-[100px] truncate sm:max-w-[200px]"
          >
            {segment.name}
          </Link>
        </span>
      ))}
    </nav>
  );
}
