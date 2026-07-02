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
import { Crown, Loader2, Trash2, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useTrpcToast } from '@/hooks/use-trpc-toast';
import { toast } from '@/hooks/use-toast';
import { getTrpcErrorMessage } from '@/lib/trpc-errors';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/providers/auth-provider';

const inviteFormSchema = z.object({
  email: z.string().trim().email('invalidEmail').max(255, 'emailTooLong'),
  role: z.enum(['EDITOR', 'VIEWER']),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;
type MemberRole = 'EDITOR' | 'VIEWER';

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

function RolePicker({
  value,
  onChange,
  disabled,
}: {
  value: MemberRole;
  onChange: (role: MemberRole) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-2">
      {(['VIEWER', 'EDITOR'] as const).map((role) => (
        <button
          key={role}
          type="button"
          disabled={disabled}
          className={cn(
            'border-border rounded-lg border px-3 py-2 text-sm transition-colors',
            value === role
              ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400'
              : 'text-content-secondary hover:bg-surface-elevated',
            disabled && 'cursor-not-allowed opacity-60',
          )}
          onClick={() => onChange(role)}
        >
          {role === 'EDITOR' ? t('sharing:roleEditor') : t('sharing:roleViewer')}
        </button>
      ))}
    </div>
  );
}

export function ShareRoomDialog({ open, onOpenChange, roomId, roomName }: ShareRoomDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const showError = useTrpcToast();
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
      form.setError('root', { message: getTrpcErrorMessage(err, t) });
    },
  });

  const removeMember = trpc.member.remove.useMutation({
    onSuccess: () => {
      void utils.member.list.invalidate({ dataRoomId: roomId });
      toast({ title: t('sharing:memberRemoved') });
    },
    onError: (err) => showError('errors:deleteFailed', err),
  });

  const updateRole = trpc.member.updateRole.useMutation({
    onSuccess: () => {
      void utils.member.list.invalidate({ dataRoomId: roomId });
      toast({ title: t('sharing:roleUpdated') });
    },
    onError: (err) => showError('errors:updateFailed', err),
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
            <RolePicker value={selectedRole} onChange={(role) => form.setValue('role', role)} />
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
          ) : (
            <ul className="space-y-2">
              {user?.email && (
                <li className="border-border bg-brand-500/5 flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-content-primary flex items-center gap-1.5 truncate text-sm font-medium">
                      <Crown className="text-brand-600 dark:text-brand-400 h-4 w-4 shrink-0" />
                      {user.email}
                    </p>
                    <p className="text-content-muted text-xs">{t('sharing:roleOwner')}</p>
                  </div>
                </li>
              )}

              {members.length === 0 ? (
                <p className="text-content-secondary text-sm">{t('sharing:noMembers')}</p>
              ) : (
                members.map((member) => (
                  <li
                    key={member.id}
                    className="border-border flex flex-col gap-3 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-content-primary truncate text-sm font-medium">
                        {member.email}
                      </p>
                      {member.status === 'PENDING' && (
                        <p className="text-content-muted text-xs">{t('sharing:pending')}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <RolePicker
                        value={member.role}
                        onChange={(role) => updateRole.mutate({ id: member.id, role })}
                        disabled={updateRole.isPending || removeMember.isPending}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-danger hover:text-danger h-8 w-8 shrink-0"
                        disabled={removeMember.isPending || updateRole.isPending}
                        onClick={() => removeMember.mutate({ id: member.id })}
                        aria-label={t('sharing:removeMember')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))
              )}
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
