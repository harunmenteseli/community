import { ListPlus, Plus, Trash2, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/cn';

export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 10;

export interface PollDraft {
  question: string;
  options: string[];
}

/** Taslak haldeki anketin yayinlanabilir olup olmadigini kontrol eder. */
export function pollDraftError(poll: PollDraft | null): string | null {
  if (!poll) return null;
  const question = poll.question.trim();
  if (!question) return 'Anket sorusu zorunlu';
  const filled = poll.options.map((o) => o.trim()).filter(Boolean);
  // Once bos satirlari bildir: kullanici zaten 2 satir actiysa "en az 2" mesaji yaniltici.
  if (filled.length !== poll.options.length) return 'Boş seçenek bırakma veya kaldır';
  if (filled.length < POLL_MIN_OPTIONS) return `En az ${POLL_MIN_OPTIONS} seçenek gerekli`;
  if (poll.options.length > POLL_MAX_OPTIONS) return `En fazla ${POLL_MAX_OPTIONS} seçenek eklenebilir`;
  return null;
}

/** Yayina hazir anket govdesi; gecersizse null. */
export function toPollDto(poll: PollDraft | null) {
  if (!poll || pollDraftError(poll)) return undefined;
  return {
    question: poll.question.trim(),
    options: poll.options.map((o) => ({ text: o.trim() })),
  };
}

interface PollEditorProps {
  value: PollDraft | null;
  onChange: (value: PollDraft | null) => void;
  disabled?: boolean;
}

export function PollEditor({ value, onChange, disabled }: PollEditorProps) {
  if (!value) {
    return (
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange({ question: '', options: ['', ''] })}
          disabled={disabled}
        >
          <ListPlus className="h-4 w-4" />
          Anket ekle
        </Button>
      </div>
    );
  }

  const error = pollDraftError(value);
  const setQuestion = (question: string) => onChange({ ...value, question });
  const setOption = (index: number, text: string) =>
    onChange({ ...value, options: value.options.map((o, i) => (i === index ? text : o)) });
  const removeOption = (index: number) =>
    onChange({ ...value, options: value.options.filter((_, i) => i !== index) });

  return (
    <section className="rounded-xl border border-ink-200 p-4 dark:border-ink-800">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Anket</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Anketi kaldır"
          onClick={() => onChange(null)}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <input
        type="text"
        value={value.question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Anket sorusu (zorunlu)"
        maxLength={200}
        aria-label="Anket sorusu"
        disabled={disabled}
        className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500 disabled:opacity-60 dark:border-ink-700 dark:bg-ink-950/40"
      />

      <ul className="mt-3 flex flex-col gap-2">
        {value.options.map((option, index) => (
          <li key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={option}
              onChange={(e) => setOption(index, e.target.value)}
              placeholder={`${index + 1}. seçenek`}
              maxLength={120}
              aria-label={`${index + 1}. seçenek`}
              disabled={disabled}
              className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500 disabled:opacity-60 dark:border-ink-700 dark:bg-ink-950/40"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`${index + 1}. seçeneği kaldır`}
              onClick={() => removeOption(index)}
              disabled={disabled || value.options.length <= POLL_MIN_OPTIONS}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ ...value, options: [...value.options, ''] })}
          disabled={disabled || value.options.length >= POLL_MAX_OPTIONS}
        >
          <Plus className="h-4 w-4" />
          Seçenek ekle
        </Button>
        <span className={cn('text-xs text-ink-500 dark:text-ink-400', error && 'text-red-600 dark:text-red-400')}>
          {error ?? `${value.options.length}/${POLL_MAX_OPTIONS} seçenek`}
        </span>
      </div>
    </section>
  );
}
