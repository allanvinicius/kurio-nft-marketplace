import { AlertTriangle, RefreshCw, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

export function ErrorState({ title = 'Não foi possível carregar', message, onRetry, retrying, className }: { title?: string; message: string; onRetry?: () => void; retrying?: boolean; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 rounded-[8px] border border-line bg-surface px-6 py-10 text-center', className)}>
      <AlertTriangle className="size-8 text-accent-strong" aria-hidden />
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="max-w-md text-[15px] text-muted">{message}</p>
      {onRetry ? (
        <Button onClick={onRetry} loading={retrying} className="mt-2">
          {!retrying ? <RefreshCw className="size-4" aria-hidden /> : null}
          Tentar novamente
        </Button>
      ) : null}
    </div>
  )
}

export function EmptyState({ title, message, action, className }: { title: string; message: string; action?: React.ReactNode; className?: string }) {
  return (
    <div role="status" className={cn('flex flex-col items-center gap-3 rounded-[8px] border border-dashed border-line px-6 py-12 text-center', className)}>
      <SearchX className="size-8 text-accent-strong" aria-hidden />
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="max-w-md text-[15px] text-muted">{message}</p>
      {action}
    </div>
  )
}

/** Indicador discreto de atualização em segundo plano (não desloca o layout). */
export function BackgroundUpdating({ active, label = 'Atualizando…' }: { active: boolean; label?: string }) {
  return (
    <span role="status" aria-live="polite" className={cn('inline-flex items-center gap-1.5 text-xs text-dim transition-opacity', active ? 'opacity-100' : 'opacity-0')}>
      {active ? (
        <>
          <RefreshCw className="size-3 animate-spin motion-reduce:animate-none" aria-hidden />
          {label}
        </>
      ) : null}
    </span>
  )
}
