import { Button, cn } from '@vaultly/ui';
import { FolderPlus, Share2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RoomToolbarProps {
  onCreateFolder: () => void;
  onToggleUpload: () => void;
  uploadOpen: boolean;
  canEdit?: boolean;
  onShare?: () => void;
  showShare?: boolean;
}

export function RoomToolbar({
  onCreateFolder,
  onToggleUpload,
  uploadOpen,
  canEdit = true,
  onShare,
  showShare = false,
}: RoomToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
      {showShare && onShare && (
        <Button
          size="sm"
          variant="outline"
          onClick={onShare}
          className="col-span-2 w-full sm:col-span-1 sm:w-auto"
        >
          <Share2 className="h-4 w-4" />
          <span className="truncate">{t('sharing:share')}</span>
        </Button>
      )}
      {canEdit && (
        <>
          <Button size="sm" onClick={onCreateFolder} className="w-full sm:w-auto">
            <FolderPlus className="h-4 w-4" />
            <span className="truncate">{t('actions:newFolder')}</span>
          </Button>
          <Button
            size="sm"
            variant={uploadOpen ? 'secondary' : 'outline'}
            onClick={onToggleUpload}
            className="w-full sm:w-auto"
          >
            <Upload className="h-4 w-4" />
            <span className="truncate">{t('actions:upload')}</span>
          </Button>
        </>
      )}
    </div>
  );
}

interface RoomPageHeaderProps {
  breadcrumbs: React.ReactNode;
  search: React.ReactNode;
}

export function RoomPageHeader({ breadcrumbs, search }: RoomPageHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="min-w-0">{breadcrumbs}</div>
      <div className="hidden min-w-0 sm:block">{search}</div>
    </div>
  );
}

export function RoomMobileSearch({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('mb-4 sm:hidden', className)}>{children}</div>;
}
