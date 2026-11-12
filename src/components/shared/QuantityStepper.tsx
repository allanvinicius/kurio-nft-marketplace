import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/**
 * Seletor de quantidade inteira. Os limites (disponibilidade/limite por pedido) são
 * informados pela API; o botão de incremento é desabilitado no limite e o motivo é anunciado.
 */
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label,
  size = 'md',
  disabled,
  variant = 'solid',
}: {
  value: number
  min?: number
  max: number
  onChange: (v: number) => void
  label: string
  size?: 'sm' | 'md'
  disabled?: boolean
  variant?: 'solid' | 'ghost'
}) {
  const btn = cn(
    'flex items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40',
    variant === 'solid' ? 'bg-accent text-bg hover:bg-accent-hover' : 'border border-line text-fg hover:border-accent',
    size === 'md' ? 'h-[46px] w-[31px]' : 'size-[22px]',
  )
  return (
    <div role="group" aria-label={label} className="flex items-center gap-3">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label={`Diminuir quantidade de ${label}`}>
        <Minus className={size === 'md' ? 'size-5' : 'size-3.5'} strokeWidth={3} aria-hidden />
      </button>
      <output aria-live="polite" aria-label={`Quantidade: ${value}`} className={cn('min-w-[1.5ch] text-center text-fg tabular-nums', size === 'md' ? 'text-xl' : 'text-[17px]')}>
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label={`Aumentar quantidade de ${label}`}>
        <Plus className={size === 'md' ? 'size-5' : 'size-3.5'} strokeWidth={3} aria-hidden />
      </button>
    </div>
  )
}
