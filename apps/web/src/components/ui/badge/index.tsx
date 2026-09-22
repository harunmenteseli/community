import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        neutral: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300',
        accent: 'bg-accent-600/10 text-accent-700 dark:text-accent-300 dark:bg-accent-500/15',
        success: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-500/15',
        danger: 'bg-red-600/10 text-red-700 dark:text-red-300 dark:bg-red-500/15',
        warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
        ai: 'bg-gradient-to-r from-accent-600 to-sky-600 text-white shadow-sm',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}