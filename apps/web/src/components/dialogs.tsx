import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@vaultly/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const nameFormSchema = z.object({
  name: z.string().min(1).max(255).trim(),
});

type NameFormValues = z.infer<typeof nameFormSchema>;

interface CreateDataRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void;
  isLoading?: boolean;
}

export function CreateDataRoomDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreateDataRoomDialogProps) {
  const { t } = useTranslation();
  const form = useForm<NameFormValues>({
    resolver: zodResolver(nameFormSchema),
    defaultValues: { name: '' },
  });

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit(values.name);
    form.reset();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('actions:createDataRoom')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room-name">{t('actions:dataRoomName')}</Label>
            <Input
              id="room-name"
              {...form.register('name')}
              placeholder={t('actions:enterName')}
              maxLength={255}
              autoFocus
            />
            {form.formState.errors.name && (
              <p className="text-danger text-sm">{t('errors:nameRequired')}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('actions:cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {t('actions:create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void;
  isLoading?: boolean;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreateFolderDialogProps) {
  const { t } = useTranslation();
  const form = useForm<NameFormValues>({
    resolver: zodResolver(nameFormSchema),
    defaultValues: { name: '' },
  });

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit(values.name);
    form.reset();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('actions:createFolder')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">{t('actions:folderName')}</Label>
            <Input
              id="folder-name"
              {...form.register('name')}
              placeholder={t('actions:enterName')}
              maxLength={255}
              autoFocus
            />
            {form.formState.errors.name && (
              <p className="text-danger text-sm">{t('errors:nameRequired')}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('actions:cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {t('actions:create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void;
  currentName: string;
  itemType: 'file' | 'folder';
  isLoading?: boolean;
}

export function RenameDialog({
  open,
  onOpenChange,
  onSubmit,
  currentName,
  itemType,
  isLoading,
}: RenameDialogProps) {
  const { t } = useTranslation();
  const form = useForm<NameFormValues>({
    resolver: zodResolver(nameFormSchema),
    defaultValues: { name: currentName },
  });

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit(values.name);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('actions:renameItem', { type: t(`common:${itemType}`) })}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rename-input">
              {itemType === 'file' ? t('actions:fileName') : t('actions:folderName')}
            </Label>
            <Input id="rename-input" {...form.register('name')} maxLength={255} autoFocus />
            {form.formState.errors.name && (
              <p className="text-danger text-sm">{t('errors:nameRequired')}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('actions:cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {t('actions:save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  name: string;
  itemType: 'file' | 'folder' | 'room';
  isFolder?: boolean;
  isLoading?: boolean;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  name,
  itemType,
  isFolder,
  isLoading,
}: DeleteConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('actions:deleteItem', { type: t(`common:${itemType}`) })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('actions:deleteConfirm', { name })}
            {isFolder && <span className="mt-2 block">{t('actions:deleteFolderWarning')}</span>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('actions:cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-danger text-danger-fg hover:bg-danger/90"
            disabled={isLoading}
          >
            {t('actions:delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
