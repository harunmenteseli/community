import { forwardRef } from 'react';
import { cn } from '../../../lib/cn';
import { type FieldError } from 'react-hook-form';
import { Input } from '../input';

export const Field = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    hint?: string;
    error?: FieldError | string;
  }
>(({ label, hint, error, id, className, ...props }, ref) => {
  const errorMessage = typeof error === 'string' ? error : error?.message;
  const fieldId = id ?? props.name;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={fieldId} className="text-sm font-medium text-ink-700 dark:text-ink-300">
          {label}
        </label>
      ) : null}
      <Input ref={ref} id={fieldId} aria-invalid={Boolean(errorMessage)} error={Boolean(errorMessage)} {...props} />
      {errorMessage ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-400 dark:text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
});

Field.displayName = 'Field';