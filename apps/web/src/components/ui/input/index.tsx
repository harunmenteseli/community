import { forwardRef } from 'react';
import { cn } from '../../../lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'h-10 w-full rounded-md border bg-white px-3 text-sm text-ink-900 shadow-sm transition-colors',
          'placeholder:text-ink-400 dark:bg-ink-900 dark:text-ink-100 dark:placeholder:text-ink-500',
          'border-ink-300 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20',
          'dark:border-ink-700 dark:focus:border-accent-500',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';