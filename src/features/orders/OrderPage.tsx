import { useEffect } from 'react'
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Loader2, X, XCircle } from 'lucide-react'
import type { Order } from '@/types/api'
import { orderApi } from '@/lib/api/endpoints'
import { qk } from '@/lib/query/client'
import { errorMessage, isApiError } from '@/lib/api/client'
import { formatEth } from '@/lib/money/eth'
import { shortAddress } from '@/lib/utils/forms'
import { useStoredSession } from '@/lib/auth/session-store'
import { useRealtimeStatus } from '@/app/providers/realtime'
import { NftImage } from '@/components/shared/NftImage'
import { ThankYouIcon } from '@/components/shared/brand-icons'
import { ErrorState } from '@/components/shared/states'
import { NotFoundPage } from '@/components/shared/NotFoundPage'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { clearAttemptForOrder } from '@/features/checkout/attempt'

const routeApi = getRouteApi('/orders/$orderId')

const NETWORK_LABEL = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' } as const

/**
 * Estado do pedido: REST é a fonte da verdade (GET /orders/:id); `order.updated`
 * (Socket.IO) atualiza o cache em tempo real. Enquanto pendente, há um polling lento
 * de segurança (8 s) para o caso de o tempo real estar indisponível.
 * Pedidos confirmados/recusados são terminais.
 */
export function OrderPage() {
  const { orderId } = routeApi.useParams()
  const session = useStoredSession()
  const userId = session?.userId ?? 'anon'
  const realtime = useRealtimeStatus()
  const query = useQuery({
    queryKey: qk.order(userId, orderId),
    queryFn: ({ signal }) => orderApi.get(orderId, { signal }),
    enabled: Boolean(session),
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? 8_000 : false),
    retry: (count, e) => !(isApiError(e) && e.status < 500 && e.status > 0) && count < 3,
  })
  const status = query.data?.status

  useEffect(() => {
    if (status === 'confirmed' || status === 'rejected') clearAttemptForOrder(orderId)
  }, [status, orderId])

  if (query.isPending) return <OrderShell><OrderSkeleton /></OrderShell>
  if (query.isError) {
    if (isApiError(query.error) && (query.error.status === 404 || query.error.status === 403)) {
      return <NotFoundPage title="Pedido não encontrado" message="Este pedido não existe ou pertence a outra conta." />
    }
    return (
      <div className="container-site py-16">
        <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} retrying={query.isFetching} />
      </div>
    )
  }
  const order = query.data
  return (
    <OrderShell>
      {order.status === 'pending' ? <Pending order={order} realtime={realtime} /> : order.status === 'rejected' ? <Rejected order={order} /> : <Receipt order={order} />}
    </OrderShell>
  )
}

function OrderShell({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-center px-4 py-10 md:pb-24 md:pt-[166px]">{children}</div>
}

function CardFrame({ children, labelledBy }: { children: React.ReactNode; labelledBy: string }) {
  const navigate = useNavigate()
  return (
    <section aria-labelledby={labelledBy} className="relative w-full max-w-[578px] border-b-[10px] border-accent bg-surface">
      <button type="button" onClick={() => void navigate({ to: '/' })} className="absolute right-5 top-5 p-1 text-accent-strong hover:text-fg" aria-label="Fechar e voltar ao início">
        <X className="size-5" aria-hidden />
      </button>
      {children}
    </section>
  )
}

function Pending({ order, realtime }: { order: Order; realtime: string }) {
  return (
    <CardFrame labelledBy="pending-title">
      <div className="flex flex-col items-center gap-4 px-8 py-12 text-center" role="status" aria-live="polite">
        <Loader2 className="size-12 animate-spin text-accent-strong motion-reduce:animate-none" aria-hidden />
        <h1 id="pending-title" className="text-[20px] font-bold">
          Aguardando confirmação na rede
        </h1>
        <p className="max-w-sm text-[15px] text-muted">
          Seu pedido <strong className="text-fg">{order.id}</strong> foi recebido e está pendente. Você pode recarregar a página ou fechar a aba com segurança: o status será recuperado sem criar outra compra.
        </p>
        <p className="text-[13px] text-dim">
          Total: {formatEth(order.receipt.total)} · Tempo real: {realtime === 'connected' ? 'conectado' : 'reconectando — sincronizando pela API'}
        </p>
      </div>
    </CardFrame>
  )
}

function Rejected({ order }: { order: Order }) {
  return (
    <CardFrame labelledBy="rejected-title">
      <div className="flex flex-col items-center gap-4 px-8 py-12 text-center" role="alert">
        <XCircle className="size-12 text-danger" aria-hidden />
        <h1 id="rejected-title" className="text-[20px] font-bold">
          Pagamento recusado
        </h1>
        <p className="max-w-sm text-[15px] text-muted">{order.rejectionReason ?? 'A transação não foi concluída.'}</p>
        <p className="text-[14px] text-fg">Nenhum valor foi cobrado e os itens continuam no seu carrinho.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/checkout">Tentar novamente</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/cart">Voltar ao carrinho</Link>
          </Button>
        </div>
        <p className="text-[12px] text-dim">Pedido {order.id}</p>
      </div>
    </CardFrame>
  )
}

function Receipt({ order }: { order: Order }) {
  const r = order.receipt
  const d = new Date(order.updatedAt)
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d).replace('.', '')
  const date = `${String(d.getDate()).padStart(2, '0')} ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${d.getFullYear()}`
  const tx = order.transaction
  return (
    <CardFrame labelledBy="receipt-title">
      <div className="flex flex-col items-center px-6 pb-6 pt-[22px]">
        <ThankYouIcon className="h-[80px] w-[70px] text-accent" />
        <h1 id="receipt-title" className="mt-3 text-center text-[16px] font-bold text-muted">
          Seus NFTs agora estão na sua carteira
        </h1>
      </div>
      <dl className="grid grid-cols-2 gap-y-4 border-y border-accent px-6 py-4 text-[14px] sm:grid-cols-[auto_auto_auto_auto] sm:justify-between sm:px-9">
        <div className="sm:border-r sm:border-accent sm:pr-4">
          <dt className="font-bold text-muted">ID da transação</dt>
          <dd className="text-muted" title={tx?.hash} data-testid="tx-hash">
            {tx ? shortAddress(tx.hash).toUpperCase().replace('0X', '0x') : '—'}
          </dd>
        </div>
        <div className="sm:border-r sm:border-accent sm:px-4">
          <dt className="text-muted">Data</dt>
          <dd className="text-muted">{date}</dd>
        </div>
        <div className="sm:border-r sm:border-accent sm:px-4">
          <dt className="text-muted">Total</dt>
          <dd className="text-muted">{formatEth(r.total)}</dd>
        </div>
        <div className="sm:pl-4">
          <dt className="font-bold text-muted">Carteira</dt>
          <dd className="text-muted">{r.walletLabel}</dd>
        </div>
      </dl>
      <div className="px-6 pt-6 sm:px-11">
        <h2 className="text-[16px] font-bold">Detalhes da transação</h2>
        <table className="mt-3 w-full border-separate border-spacing-y-3 text-left" data-testid="receipt-lines">
          <caption className="sr-only">Itens comprados</caption>
          <thead>
            <tr className="text-[17px]">
              <th scope="col" className="border-b border-line-strong pb-2 font-bold">NFTs</th>
              <th scope="col" className="border-b border-line-strong pb-2 text-center font-bold">Edições</th>
              <th scope="col" className="border-b border-line-strong pb-2 text-right font-bold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {r.lines.map((l) => (
              <tr key={`${l.nftId}-${l.editionId}`}>
                <td>
                  <div className="flex items-center gap-3">
                    <NftImage image={l.image} sizes="70px" width={70} className="size-[60px] shrink-0 rounded-[4px] sm:size-[70px]" />
                    <div>
                      <p className="text-[16px] font-bold">{l.name}</p>
                      <p className="text-[14px] text-subtle">
                        ID do token: {l.tokenId} · {l.editionLabel}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="text-center text-[14px] text-muted">(x {l.quantity})</td>
                <td className="text-right text-[18px] font-bold text-accent-strong">{formatEth(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-1 flex flex-col gap-1 border-b border-line-strong pb-3 sm:pl-[170px]">
          {r.couponCode ? (
            <div className="flex justify-between text-[16px]">
              <dt>Desconto ({r.couponCode})</dt>
              <dd>(-) {formatEth(r.discount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between text-[16px]">
            <dt>Taxa de rede</dt>
            <dd className="text-[18px]">{formatEth(r.networkFee)}</dd>
          </div>
          <div className="flex justify-between text-[16px] font-bold">
            <dt>Total</dt>
            <dd className="text-[18px] text-accent-strong" data-testid="receipt-total">
              {formatEth(r.total)}
            </dd>
          </div>
        </dl>
        <p className="mx-auto mt-4 max-w-[470px] text-center text-[14px] leading-[22px] text-muted">
          Transação confirmada na {NETWORK_LABEL[r.network]}. A propriedade foi transferida para sua carteira conectada ({shortAddress(r.walletAddress)}) e registrada na rede.
        </p>
        <div className="flex justify-center pb-12 pt-6">
          {tx ? (
            <Button asChild className="h-12 px-4 text-[17px] font-medium">
              <a href={tx.explorerUrl} target="_blank" rel="noopener noreferrer" aria-label="Ver no Etherscan (link simulado, abre em nova aba)">
                Ver no Etherscan <ExternalLink className="size-4" aria-hidden />
              </a>
            </Button>
          ) : null}
        </div>
        <p className="-mt-8 pb-6 text-center text-[11px] text-dim">Referência e link de exploração simulados (ambiente de demonstração).</p>
      </div>
    </CardFrame>
  )
}

function OrderSkeleton() {
  return (
    <div className="w-full max-w-[578px] bg-surface p-8" aria-busy="true" aria-label="Carregando pedido">
      <Skeleton className="mx-auto size-20" />
      <Skeleton className="mx-auto mt-4 h-5 w-72" />
      <Skeleton className="mt-8 h-12 w-full" />
      <Skeleton className="mt-6 h-[70px] w-full" />
      <Skeleton className="mt-3 h-[70px] w-full" />
    </div>
  )
}
