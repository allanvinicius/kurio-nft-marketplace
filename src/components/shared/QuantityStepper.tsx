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
}: {
  value: number
  min?: number
  max: number
  onChange: (v: number) => void
  label: string
  size?: 'md' | 'compact'
  disabled?: boolean
}) {
  const dimensions = {
    md: 'h-[46px] w-[31px]',
    compact: 'h-[34px] w-[22px]',
  }
  const btn = cn(
    'flex items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40',
    'bg-accent text-bg hover:bg-accent-hover',
    dimensions[size],
  )
  return (
    <div role="group" aria-label={label} className={cn('flex items-center', size === 'compact' ? 'gap-3.5' : 'gap-3')}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label={`Diminuir quantidade de ${label}`}>
        <Minus className={size === 'md' ? 'size-5' : 'size-3.5'} strokeWidth={3} aria-hidden />
      </button>
      <output aria-live="polite" aria-label={`Quantidade: ${value}`} className="min-w-[1.5ch] text-center text-xl text-fg tabular-nums">
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label={`Aumentar quantidade de ${label}`}>
        <Plus className={size === 'md' ? 'size-5' : 'size-3.5'} strokeWidth={3} aria-hidden />
      </button>
    </div>
  )
}
