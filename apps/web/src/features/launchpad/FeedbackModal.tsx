import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { Avatar } from '../../components/ui/avatar';
import { Spinner } from '../../components/ui/spinner';
import { userAtom } from '../../state/atoms';
import { launchpadApi, type LaunchpadProject } from './api';

const RATING_MAX = 10;

export interface FeedbackModalProps {
  project: LaunchpadProject;
  open: boolean;
  onClose: () => void;
}

/** "Yorum & Puan" modalı: 1-10 puan + yorum, mevcut geri bildirimleri gösterir. */
export function FeedbackModal({ project, open, onClose }: FeedbackModalProps) {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(RATING_MAX);
  const [comment, setComment] = useState('');

  const detail = useQuery({
    queryKey: ['launchpad', 'detail', project.id],
    queryFn: () => launchpadApi.detail(project.id),
    enabled: open,
  });

  // Formu mevcut feedback ile bir kez doldur: arka plandaki refetch (invalidate)
  // gelip gide kullaniciyi yaptigi degisiklikten geri almamali.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current) return;
    const mine = detail.data?.myFeedback;
    if (!mine) return;
    prefilled.current = true;
    setRating(mine.rating);
    setComment(mine.comment ?? '');
  }, [detail.data]);

  const submit = useMutation({
    mutationFn: () => launchpadApi.feedback(project.id, { rating, comment: comment.trim() || undefined }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['launchpad'] });
      toast.success('Yorumun gönderildi');
      onClose();
    },
    onError: (err) => toast.error(err.message || 'Gönderilemedi'),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit.mutate();
  };

  const myFeedback = detail.data?.myFeedback;
  const previous = detail.data?.feedback ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Yorum & Puan"
      description={`${project.name} için görüşünü paylaş.`}
      size="lg"
    >
      {!user ? (
        <p className="text-sm text-ink-500 dark:text-ink-400">
          Yorum yapmak ve puan vermek için giriş yapmalısın.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {myFeedback ? (
            <p className="rounded-md bg-ink-50 p-2 text-xs text-ink-600 dark:bg-ink-800/60 dark:text-ink-300">
              Önceki puanın: <span className="font-semibold">{myFeedback.rating}</span>. Kaydetmek mevcut
              yorumunu günceller.
            </p>
          ) : null}

          <fieldset>
            <legend className="text-sm font-medium text-ink-700 dark:text-ink-300">Puanın</legend>
            <div className="mt-2 flex items-center gap-1.5" role="radiogroup" aria-label="Puan">
              {Array.from({ length: RATING_MAX }, (_, i) => i + 1).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} puan`}
                  onClick={() => setRating(value)}
                  className={`rounded-md p-1 transition-colors ${
                    value <= rating ? 'text-amber-500' : 'text-ink-300 hover:text-amber-400 dark:text-ink-600'
                  }`}
                >
                  <Star className="h-5 w-5" fill="currentColor" aria-hidden />
                </button>
              ))}
              <span className="ml-1 text-sm font-semibold">{rating}</span>
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="feedback-comment" className="text-sm font-medium text-ink-700 dark:text-ink-300">
              Yorum
            </label>
            <textarea
              id="feedback-comment"
              rows={4}
              maxLength={1_000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Projeyi deneyimlerine göre değerlendir."
              className="w-full rounded-md border border-ink-300 bg-white p-3 text-sm dark:border-ink-700 dark:bg-ink-900"
            />
          </div>

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

      <section className="mt-6 border-t border-ink-200 pt-4 dark:border-ink-800" aria-label="Yorum listesi">
        <h3 className="text-sm font-semibold">Son yorumlar</h3>
        {detail.isPending ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : null}
        {!detail.isPending && previous.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Henüz yorum yok.</p>
        ) : null}
        {previous.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-3">
            {previous.map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                <Avatar src={item.author.avatarUrl ?? undefined} name={item.author.name} size="sm" />
                <div className="min-w-0">
                  <p className="text-xs font-medium">
                    {item.author.name}{' '}
                    <span className="text-ink-500 dark:text-ink-400">
                      · {item.rating}/{RATING_MAX} puan
                    </span>
                  </p>
                  {item.comment ? <p className="text-sm">{item.comment}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </Modal>
  );
}
