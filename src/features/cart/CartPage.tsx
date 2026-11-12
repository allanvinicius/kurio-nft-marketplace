import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ShoppingBag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { CartItem, Quote } from '@/types/api'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { NftImage } from '@/components/shared/NftImage'
import { QuantityStepper } from '@/components/shared/QuantityStepper'
import { EmptyState, ErrorState, BackgroundUpdating } from '@/components/shared/states'
import { MobileTopBar } from '@/components/layout/MobileTopBar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { NftCard, NftCardSkeleton } from '@/features/catalog/NftCard'
import { catalogQueryOptions } from '@/features/catalog/queries'
import { formatEth, mulEth, equalsEth } from '@/lib/money/eth'
import { errorMessage } from '@/lib/api/client'
import { cn } from '@/lib/utils/cn'
import { useCart, useQuote, useRemoveCartItem, useUpdateCartItem } from './queries'
import { CouponForm, QuoteTotals } from './CartSummary'
import { QuoteIssues } from './QuoteIssues'

export function CartPage() {
  const cart = useCart()
  const quote = useQuote('ethereum')
  const navigate = useNavigate()
  const items = cart.data?.items ?? []
  const quoteData = quote.data
  const canCheckout = Boolean(quoteData?.purchasable) && !quote.isFetching && items.length > 0

  return (
    <div className="md:pt-8">
      <MobileTopBar title="Carrinho de NFTs" />
      <div className="container-site">
        <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/', hash: 'catalogo' }, { label: 'Carrinho' }]} />
        <h1 className="sr-only max-md:hidden">Carrinho de NFTs</h1>

        {cart.isPending ? (
          <CartSkeleton />
        ) : cart.isError ? (
          <ErrorState className="mt-6" message={errorMessage(cart.error)} onRetry={() => void cart.refetch()} retrying={cart.isFetching} />
        ) : items.length === 0 ? (
          <EmptyState
            className="mt-6"
            title="Seu carrinho está vazio"
            message="Explore o catálogo e adicione NFTs para continuar."
            action={
              <Button asChild>
                <Link to="/" hash="catalogo">
                  <ShoppingBag className="size-4" aria-hidden /> Explorar NFTs
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-8 md:mt-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[782px_1fr] xl:gap-[86px]">
            <section aria-labelledby="cart-items-title">
              <h2 id="cart-items-title" className="sr-only">
                Itens no carrinho
              </h2>
              <div className="mb-3 lg:hidden">
                <QuoteIssues quote={quoteData} />
              </div>
              <table className="hidden w-full border-separate border-spacing-y-3 md:table">
                <caption className="sr-only">Itens do carrinho com preço, quantidade e total</caption>
                <thead>
                  <tr className="text-left text-[17px] font-bold text-fg">
                    <th scope="col" className="w-[311px] border-b border-line-strong pb-2 font-bold">NFTs</th>
                    <th scope="col" className="w-[138px] border-b border-line-strong pb-2 font-bold">Preço</th>
                    <th scope="col" className="w-[136px] border-b border-line-strong pb-2 font-bold">Edições</th>
                    <th scope="col" className="border-b border-line-strong pb-2 font-bold">Total</th>
                    <th scope="col" className="w-14 border-b border-line-strong pb-2">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <CartRow key={item.id} item={item} quote={quoteData} />
                  ))}
                </tbody>
              </table>
              <ul className="flex flex-col gap-6 md:hidden">
                {items.map((item) => (
                  <MobileCartItem key={item.id} item={item} />
                ))}
              </ul>
            </section>

            <aside aria-labelledby="summary-title" className="max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-30 max-md:max-h-[60dvh] max-md:overflow-y-auto max-md:rounded-t-[28px] max-md:bg-surface max-md:px-5 max-md:pb-5 max-md:pt-5 max-md:shadow-[0_-12px_30px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between border-b border-line-strong pb-2 max-md:hidden">
                <h2 id="summary-title" className="text-[20px] font-bold">
                  Resumo da carteira
                </h2>
                <BackgroundUpdating active={quote.isFetching && !quote.isPending} label="Recalculando…" />
              </div>
              <div className="hidden lg:block lg:pt-4">
                <QuoteIssues quote={quoteData} />
              </div>
              <div className="mt-6 max-md:hidden">
                <CouponForm couponCode={cart.data?.couponCode ?? null} variant="desktop" />
              </div>
              <div className="md:hidden">
                <CouponForm couponCode={cart.data?.couponCode ?? null} variant="mobile" />
              </div>
              <QuoteTotals quote={quoteData} loading={quote.isPending} className="mt-5" updating={quote.isFetching && !quote.isPending} />
              {quote.isError ? (
                <p role="alert" className="mt-3 text-[13px] text-danger">
                  Não foi possível calcular o total. <button className="underline" onClick={() => void quote.refetch()}>Tentar novamente</button>
                </p>
              ) : null}
              <Button
                className="mt-5 h-10 w-full text-[16px] max-md:h-[56px] max-md:rounded-full max-md:bg-gradient-to-r max-md:from-accent max-md:to-[#c27c43] max-md:text-[18px]"
                disabled={!canCheckout}
                onClick={() => void navigate({ to: '/checkout' })}
                data-testid="go-checkout"
              >
                Conectar e finalizar
              </Button>
              {!canCheckout && quoteData && !quoteData.purchasable ? (
                <p className="mt-2 text-center text-[12px] text-danger">Resolva os avisos do carrinho para finalizar.</p>
              ) : null}
              <p className="mt-4 text-center max-md:hidden">
                <Link to="/" hash="catalogo" className="text-[16px] text-accent-strong hover:underline">
                  Continuar explorando
                </Link>
              </p>
            </aside>
          </div>
        )}

        <AlsoViewed hidden={items.length > 0} />
        {items.length > 0 ? <div className="h-[420px] md:hidden" aria-hidden /> : null}
      </div>
    </div>
  )
}

function lineTotal(item: CartItem, quote: Quote | undefined) {
  const line = quote?.lines.find((l) => l.cartItemId === item.id && l.quantity === item.quantity)
  return line ? line.lineTotal : mulEth(item.unitPrice, item.quantity)
}

function useItemActions(item: CartItem) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const max = Math.max(item.quantity, Math.min(item.available, item.maxPerOrder))
  const setQty = (quantity: number) =>
    update.mutate(
      { itemId: item.id, quantity },
      { onError: (e) => toast.error(`Não foi possível alterar ${item.name}`, { description: `${errorMessage(e)} A quantidade anterior foi restaurada.` }) },
    )
  const onRemove = () =>
    remove.mutate(item.id, {
      onSuccess: () => toast.success(`${item.name} removido do carrinho`),
      onError: (e) => toast.error('Não foi possível remover o item', { description: errorMessage(e) }),
    })
  return { setQty, onRemove, max, removing: remove.isPending, updating: update.isPending }
}

function ItemNotices({ item }: { item: CartItem }) {
  const changed = !equalsEth(item.unitPrice, item.addedUnitPrice)
  return (
    <>
      {changed ? (
        <span className="mt-1 inline-flex items-center gap-1 text-[12px] text-accent-strong" data-testid="price-changed">
          ↻ Preço alterado (antes <s>{formatEth(item.addedUnitPrice)}</s>)
        </span>
      ) : null}
      {item.available === 0 ? (
        <span className="mt-1 block text-[12px] font-bold text-danger">⚠ Esgotado — remova o item</span>
      ) : item.quantity > item.available ? (
        <span className="mt-1 block text-[12px] font-bold text-danger">⚠ Apenas {item.available} disponível(is)</span>
      ) : null}
    </>
  )
}

function CartRow({ item, quote }: { item: CartItem; quote: Quote | undefined }) {
  const { setQty, onRemove, max, removing } = useItemActions(item)
  const over = item.quantity > item.available
  return (
    <tr className={cn('bg-surface align-middle', removing && 'opacity-50')} data-testid="cart-row">
      <td className="p-0">
        <div className="flex items-center gap-4">
          <NftImage image={item.image} sizes="70px" width={70} className="size-[70px] shrink-0" />
          <div className="py-1">
            <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="text-[16px] font-bold text-fg hover:text-accent-strong">
              {item.name}
            </Link>
            <p className="text-[14px] text-subtle">
              ID do token: {item.tokenId} · <span title="Edição">{item.editionLabel}</span>
            </p>
            <ItemNotices item={item} />
          </div>
        </div>
      </td>
      <td className="text-[16px] font-bold text-muted">{formatEth(item.unitPrice)}</td>
      <td>
        <div className="flex flex-col items-start gap-1">
          <QuantityStepper value={item.quantity} max={max} onChange={setQty} label={item.name} size="compact" />
          {over && item.available > 0 ? (
            <button type="button" className="text-[12px] text-accent-strong underline" onClick={() => setQty(item.available)}>
              Ajustar para {item.available}
            </button>
          ) : null}
        </div>
      </td>
      <td className="text-[16px] font-bold text-accent-strong" data-testid="line-total">{formatEth(lineTotal(item, quote))}</td>
      <td className="pr-4 text-right">
        <button type="button" onClick={onRemove} disabled={removing} className="rounded p-1.5 text-subtle hover:text-danger" aria-label={`Remover ${item.name} (${item.editionLabel}) do carrinho`}>
          <Trash2 className="size-5" aria-hidden />
        </button>
      </td>
    </tr>
  )
}

function MobileCartItem({ item }: { item: CartItem }) {
  const { setQty, onRemove, max, removing } = useItemActions(item)
  return (
    <li className={cn('flex overflow-hidden rounded-[24px] bg-surface', removing && 'opacity-50')} data-testid="cart-row-mobile">
      <NftImage image={item.image} sizes="140px" width={140} className="w-[38%] shrink-0 self-stretch" />
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="text-[17px] font-bold text-fg">
            {item.name}
          </Link>
          <button type="button" onClick={onRemove} className="p-1 text-subtle" aria-label={`Remover ${item.name} do carrinho`}>
            <Trash2 className="size-5" aria-hidden />
          </button>
        </div>
        <p className="text-[15px] text-subtle">Edição: {item.editionLabel}</p>
        <ItemNotices item={item} />
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <p className="text-[20px] font-bold text-accent-strong">{formatEth(item.unitPrice)}</p>
          <QuantityStepper value={item.quantity} max={max} onChange={setQty} label={item.name} size="compact" />
        </div>
      </div>
    </li>
  )
}

function AlsoViewed({ hidden }: { hidden?: boolean }) {
  const query = useQuery(catalogQueryOptions({ tab: 'trending', sort: 'recent', page: 1, pageSize: 5 }))
  return (
    <section aria-labelledby="also-title" className={cn('mt-16 md:mt-[100px]', hidden && 'max-md:hidden')}>
      <h2 id="also-title" className="border-b border-line-strong pb-3 text-[18px] font-bold text-accent-strong">
        Colecionadores também viram
      </h2>
      <ul className="mt-8 grid grid-cols-2 gap-[26px] md:grid-cols-3 lg:grid-cols-5">
        {query.isPending
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i}>
                <NftCardSkeleton />
              </li>
            ))
          : (query.data?.items ?? []).map((n) => (
              <li key={n.id}>
                <NftCard nft={n} sizes="(min-width: 1024px) 219px, 45vw" />
              </li>
            ))}
      </ul>
    </section>
  )
}

function CartSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[782px_1fr] xl:gap-[86px]" aria-busy="true" aria-label="Carregando carrinho">
      <div className="flex flex-col gap-3 pt-10">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[70px] w-full" />
        ))}
      </div>
      <div className="flex flex-col gap-4 pt-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}
