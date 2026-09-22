import { cn } from '../../../lib/cn';

export interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-20 w-20 text-2xl',
};

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Avatar({ src, alt, name, size = 'md', className, ...props }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? name ?? ''}
        loading="lazy"
        className={cn('rounded-full object-cover', sizeClasses[size], className)}
        {...props}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={alt ?? name ?? ''}
      className={cn(
        'flex shrink-0 select-none items-center justify-center rounded-full bg-accent-600/15 font-semibold text-accent-700 dark:bg-accent-500/20 dark:text-accent-300',
        sizeClasses[size],
        className,
      )}
    >
      {name ? initials(name) : '?'}
    </span>
  );
}