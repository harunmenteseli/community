import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { userAtom } from '../../state/atoms';
import { reportsApi } from './api';
import {
  REPORT_MESSAGE_MAX,
  REPORT_REASON_OPTIONS,
  TARGET_LABELS,
  isSelfReport,
  validateReport,
  type ReportReason,
  type ReportTargetType,
} from './options';

export interface ReportModalProps {
  open: boolean;
  targetType: ReportTargetType;
  targetId: string;
  /** Modal başlığında okunacak hedef adı (post başlığı, kullanıcı adı, kayıt adı). */
  targetName?: string;
  onClose: () => void;
}

/** Post / kullanıcı / vitrin kaydı için ortak şikâyet modalı. */
export function ReportModal({ open, targetType, targetId, targetName, onClose }: ReportModalProps) {
  const user = useAtomValue(userAtom);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: (input: { reason: ReportReason; message?: string }) => reportsApi.create({ ...input, targetType, targetId }),
    onSuccess: () => {
      toast.success('Şikâyetin alındı, inceleniyor');
      setReason(null);
      setMessage('');
      setError(null);
      onClose();
    },
    onError: (err) => setError(err.message || 'Şikâyet gönderilemedi'),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const problem = validateReport(reason, message);
    setError(problem);
    if (problem || !reason) return;
    submit.mutate({ reason, message: message.trim() || undefined });
  };

  const label = TARGET_LABELS[targetType];
  const selfReport = isSelfReport(targetType, targetId, user?.id ?? null);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Şikâyet et"
      description={
        targetName ? `${label}: ${targetName}` : `${label} hakkında sorun bildir.`
      }
    >
      {!user ? (
        <p className="text-sm text-ink-500 dark:text-ink-400">
          Şikâyet bildirmek için giriş yapmalısın.
        </p>
      ) : selfReport ? (
        <p className="text-sm text-ink-500 dark:text-ink-400">
          Kendi profilini şikâyet edemezsin.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <fieldset>
            <legend className="text-sm font-medium text-ink-700 dark:text-ink-300">Sebep</legend>
            <div className="mt-2 flex flex-col gap-1.5">
              {REPORT_REASON_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 text-sm text-ink-700 dark:text-ink-300"
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={option.value}
                    checked={reason === option.value}
                    onChange={() => setReason(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-message" className="text-sm font-medium text-ink-700 dark:text-ink-300">
              Açıklama
            </label>
            <textarea
              id="report-message"
              rows={4}
              maxLength={REPORT_MESSAGE_MAX}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ne olduğunu kısaca anlat."
              className="w-full rounded-md border border-ink-300 bg-white p-3 text-sm dark:border-ink-700 dark:bg-ink-900"
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" loading={submit.isPending}>
              Gönder
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
