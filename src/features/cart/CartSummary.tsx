import { useId, useState } from 'react'
import { Tag, X } from 'lucide-react'
import type { Quote } from '@/types/api'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth, isZeroEth } from '@/lib/money/eth'
import { errorMessage, isApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils/cn'
import { useApplyCoupon, useRemoveCoupon } from './queries'

/** Formulário de cupom (aplicar/remover) com erros da API associados ao campo. */
export function CouponForm({ couponCode, variant = 'desktop', compact }: { couponCode: string | null; variant?: 'desktop' | 'mobile'; compact?: boolean }) {
  const id = useId()
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (couponCode) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-[4px] border border-accent/60 bg-band px-3 py-2 text-[14px]" role="status">
        <span className="flex items-center gap-2">
          <Tag className="size-4 text-accent-strong" aria-hidden />
          Cupom <strong className="text-accent-strong">{couponCode}</strong> aplicado
        </span>
        <button type="button" onClick={() => remove.mutate()} disabled={remove.isPending} className="flex items-center gap-1 text-[13px] text-muted hover:text-fg" aria-label={`Remover cupom ${couponCode}`}>
          <X className="size-4" aria-hidden /> Remover
        </button>
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const value = code.trim()
        if (!value) {
          setError('Informe um código promocional.')
          return
        }
        setError(null)
        apply.mutate(value, {
          onSuccess: () => setCode(''),
          onError: (err) => setError((isApiError(err) && err.fields.code) || errorMessage(err)),
        })
      }}
    >
      {!compact ? (
        <label htmlFor={`${id}-code`} className={cn('mb-[9px] block text-[14px] font-bold', variant === 'mobile' && 'sr-only')}>
          Código promocional
        </label>
      ) : (
        <label htmlFor={`${id}-code`} className="sr-only">
          Código promocional
        </label>
      )}
      <div className={cn('flex overflow-hidden', variant === 'desktop' ? 'h-10 rounded-[4px] border border-accent' : 'h-[50px] rounded-full border border-line bg-bg/40')}>
        <input
          id={`${id}-code`}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            if (error) setError(null)
          }}
          placeholder="Digite o código promocional..."
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          className={cn('min-w-0 flex-1 bg-transparent px-2 text-fg placeholder:text-subtle focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-2', variant === 'desktop' ? 'text-[12px]' : 'px-5 text-[14px]')}
          data-testid="coupon-input"
        />
        <button type="submit" disabled={apply.isPending} aria-busy={apply.isPending || undefined} className={cn('bg-accent font-bold text-bg hover:bg-accent-hover disabled:opacity-60', variant === 'desktop' ? 'w-[102px] text-[16px]' : 'rounded-full px-6 text-[16px]')}>
          {apply.isPending ? 'Aplicando…' : 'Aplicar'}
        </button>
      </div>
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-2 text-[13px] text-danger">
          ⚠ {error}
        </p>
      ) : null}
    </form>
  )
}

/** Resumo de valores — sempre a cotação da API (fonte autoritativa). */
export function QuoteTotals({ quote, loading, className, updating }: { quote: Quote | undefined; loading: boolean; className?: string; updating?: boolean }) {
  if (loading || !quote) {
    return (
      <div className={cn('flex flex-col gap-4', className)} aria-busy="true" aria-label="Calculando resumo">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
        <div className="mt-4 flex justify-between">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-28" />
        </div>
      </div>
    )
  }
  return (
    <dl className={cn('flex flex-col', updating && 'opacity-70 transition-opacity', className)} data-testid="quote-totals" aria-live="polite" aria-atomic="true">
      <div className="flex items-baseline justify-between py-[5px]">
        <dt className="text-[16px] text-fg">Subtotal</dt>
        <dd className="text-[18px] text-fg" data-testid="quote-subtotal">{formatEth(quote.subtotal)}</dd>
      </div>
      <div className="flex items-baseline justify-between py-[5px]">
        <dt className="text-[16px] text-fg">{quote.coupon?.status === 'applied' ? `Desconto (${quote.coupon.code})` : 'Desconto do lançamento'}</dt>
        <dd className="text-[16px] text-fg" data-testid="quote-discount">
          (-) {isZeroEth(quote.discount) ? '0.00' : formatEth(quote.discount, { suffix: false })} ETH
        </dd>
      </div>
      <div className="flex items-baseline justify-between py-[5px]">
        <dt className="text-[16px] text-fg">Taxa de rede</dt>
        <dd className="text-[18px] text-fg" data-testid="quote-fee">{formatEth(quote.networkFee)}</dd>
      </div>
      <p className="text-right text-[12px] text-accent-strong">Taxa estimada</p>
      <div className="mt-[22px] flex items-baseline justify-between">
        <dt className="text-[16px] font-bold text-fg">Total</dt>
        <dd className="text-[18px] font-bold text-accent-strong" data-testid="quote-total">{formatEth(quote.total)}</dd>
      </div>
    </dl>
  )
}
