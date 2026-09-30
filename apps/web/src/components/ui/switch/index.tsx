import { cn } from '../../../lib/cn';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

/**
 * Tercih anahtari. Gercek `role="switch"` butonu kullanir: klavyeyle
 * Space/Enter calisir, `aria-checked` ile ekran okuyuculara durumu bildirir.
 */
export function Switch({ checked, onCheckedChange, label, description, disabled, id }: SwitchProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium text-ink-800 dark:text-ink-100">
          {label}
        </label>
        {description ? <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-accent-600' : 'bg-ink-300 dark:bg-ink-700',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}
