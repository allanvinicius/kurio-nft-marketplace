import { cn } from '@/lib/utils/cn'

/** Skeleton com shimmer; respeita prefers-reduced-motion (ver globals.css). */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('skeleton rounded-[4px]', className)} {...props} />
}
