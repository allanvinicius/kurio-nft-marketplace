import { useRouter } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/** Barra superior dos frames mobile (voltar + título). */
export function MobileTopBar({ title, right, className, align = 'center' }: { title?: string; right?: React.ReactNode; className?: string; align?: 'center' | 'left' }) {
  const router = useRouter()
  return (
    <div className={cn('flex items-center gap-4 px-5 pt-5 pb-3 md:hidden', className)}>
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? router.history.back() : void router.navigate({ to: '/' }))}
        className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted"
        aria-label="Voltar"
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      {title ? <h1 className={cn('flex-1 truncate text-[22px] font-bold tracking-wide text-fg', align === 'center' ? 'text-center' : 'text-left text-[20px] tracking-normal')}>{title}</h1> : <span className="flex-1" />}
      {right ?? (title && align === 'center' ? <span className="size-11" aria-hidden /> : null)}
    </div>
  )
}
