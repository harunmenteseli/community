import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
}

export function ToolbarButton({ label, active, disabled, onClick, icon }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-600 transition-colors hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-ink-300 dark:hover:bg-ink-800',
        active && 'bg-accent-500/15 text-accent-600 dark:bg-accent-500/20 dark:text-accent-400',
      )}
    >
      {icon}
    </button>
  );
}