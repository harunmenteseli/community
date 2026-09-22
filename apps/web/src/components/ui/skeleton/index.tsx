import { cn } from '../../../lib/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
}

export function Skeleton({ className, lines, ...props }: SkeletonProps) {
  if (lines) {
    return (
      <div className={cn('flex flex-col gap-2', className)} aria-hidden>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="shimmer-block h-4 rounded-md" style={{ width: `${Math.max(60, 100 - i * 12)}%` }} />
        ))}
      </div>
    );
  }
  return <div className={cn('shimmer-block rounded-md', className)} aria-hidden {...props} />;
}