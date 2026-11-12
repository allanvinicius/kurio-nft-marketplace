import { AlertTriangle, Info } from 'lucide-react'
import type { Quote } from '@/types/api'
import { formatEth } from '@/lib/money/eth'
import { Button } from '@/components/ui/button'
import { useAcknowledgePrices } from './queries'

/**
 * Avisos da cotação: mudança de preço (informativa, exige ciência) e problemas
 * de disponibilidade/cupom (bloqueiam a finalização). Anunciados via região viva.
 */
export function QuoteIssues({ quote, showAcknowledge = true }: { quote: Quote | undefined; showAcknowledge?: boolean }) {
  const ack = useAcknowledgePrices()
  if (!quote || quote.issues.length === 0) return null
  const priceChanges = quote.issues.filter((i) => i.code === 'PRICE_CHANGED')
  const blocking = quote.issues.filter((i) => i.code !== 'PRICE_CHANGED')
  return (
    <div className="flex flex-col gap-3" data-testid="quote-issues">
      {priceChanges.length ? (
        <div role="status" className="rounded-[6px] border border-accent/70 bg-info-bg p-4 text-[14px]">
          <p className="flex items-center gap-2 font-bold text-accent-strong">
            <Info className="size-4" aria-hidden /> Preços atualizados desde que você adicionou os itens
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-muted">
            {priceChanges.map((i) => (
              <li key={i.cartItemId}>
                {i.message} {i.previous && i.current ? `${formatEth(i.previous)} → ${formatEth(i.current)}` : null}
              </li>
            ))}
          </ul>
          {showAcknowledge ? (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => ack.mutate()} loading={ack.isPending}>
              Entendi, manter itens com o novo preço
            </Button>
          ) : null}
        </div>
      ) : null}
      {blocking.length ? (
        <div role="alert" className="rounded-[6px] border border-danger/60 bg-danger-bg p-4 text-[14px]">
          <p className="flex items-center gap-2 font-bold text-danger">
            <AlertTriangle className="size-4" aria-hidden /> Ajuste o carrinho para continuar
          </p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-fg/90">
            {blocking.map((i, idx) => (
              <li key={`${i.code}-${i.cartItemId ?? idx}`}>{i.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
