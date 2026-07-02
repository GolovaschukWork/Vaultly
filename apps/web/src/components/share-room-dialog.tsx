import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  cn,
} from '@vaultly/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { toast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc';

const inviteFormSchema = z.object({
  email: z.string().trim().email('invalidEmail').max(255, 'emailTooLong'),
  role: z.enum(['EDITOR', 'VIEWER']),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface ShareRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  roomName: string;
}

function FieldError({ message }: { message?: string }) {
  const { t } = useTranslation();
  if (!message) return null;
  return <p className="text-danger text-sm">{t(`errors:${message}`)}</p>;
}

export function ShareRoomDialog({ open, onOpenChange, roomId, roomName }: ShareRoomDialogProps) {
  const { t } = useTranslation();
  const utils = trpc.useUtils();

  const { data: members = [], isLoading } = trpc.member.list.useQuery(
    { dataRoomId: roomId },
    { enabled: open },
  );

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: { email: '', role: 'VIEWER' },
  });

  const invite = trpc.member.invite.useMutation({
    onSuccess: () => {
      void utils.member.list.invalidate({ dataRoomId: roomId });
      form.reset({ email: '', role: 'VIEWER' });
      toast({ title: t('sharing:inviteSent') });
    },
    onError: (err) => {
      form.setError('root', { message: err.message });
    },
  });

  const removeMember = trpc.member.remove.useMutation({
    onSuccess: () => {
      void utils.member.list.invalidate({ dataRoomId: roomId });
      toast({ title: t('sharing:memberRemoved') });
    },
    onError: (err) =>
      toast({ title: t('errors:deleteFailed'), description: err.message, variant: 'destructive' }),
  });

  const handleInvite = form.handleSubmit((values) => {
    form.clearErrors('root');
    invite.mutate({
      dataRoomId: roomId,
      email: values.email,
      role: values.role,
    });
  });

  const selectedRole = form.watch('role');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('sharing:title')}</DialogTitle>
          <DialogDescription>{t('sharing:description', { name: roomName })}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">{t('auth:email')}</Label>
            <Input
              id="invite-email"
              type="email"
              maxLength={255}
              placeholder={t('sharing:emailPlaceholder')}
              {...form.register('email')}
            />
            <FieldError message={form.formState.errors.email?.message} />
          </div>

          <div className="space-y-2">
            <Label>{t('sharing:role')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['VIEWER', 'EDITOR'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  className={cn(
                    'border-border rounded-lg border px-3 py-2 text-sm transition-colors',
                    selectedRole === role
                      ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400'
                      : 'text-content-secondary hover:bg-surface-elevated',
                  )}
                  onClick={() => form.setValue('role', role)}
                >
                  {role === 'EDITOR' ? t('sharing:roleEditor') : t('sharing:roleViewer')}
                </button>
              ))}
            </div>
          </div>

          {form.formState.errors.root?.message && (
            <p className="text-danger text-sm">{form.formState.errors.root.message}</p>
          )}

          <Button type="submit" disabled={invite.isPending} className="w-full">
            {invite.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {t('sharing:invite')}
          </Button>
        </form>

        <div className="border-border mt-2 border-t pt-4">
          <h3 className="text-content-primary mb-3 text-sm font-medium">{t('sharing:members')}</h3>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="text-content-muted h-5 w-5 animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-content-secondary text-sm">{t('sharing:noMembers')}</p>
          ) : (
            <ul className="space-y-2">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="border-border flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-content-primary truncate text-sm font-medium">
                      {member.email}
                    </p>
                    <p className="text-content-muted text-xs">
                      {member.role === 'EDITOR' ? t('sharing:roleEditor') : t('sharing:roleViewer')}
                      {member.status === 'PENDING' && ` · ${t('sharing:pending')}`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-danger hover:text-danger h-8 w-8 shrink-0"
                    disabled={removeMember.isPending}
                    onClick={() => removeMember.mutate({ id: member.id })}
                    aria-label={t('sharing:removeMember')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions:close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
