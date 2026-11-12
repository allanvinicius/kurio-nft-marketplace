import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Heart, Mail, Search, ShoppingCart, Star } from 'lucide-react'
import { toast } from 'sonner'
import type { Edition, NftDetail } from '@/types/api'
import { nftQueryOptions } from './queries'
import { catalogQueryOptions } from '@/features/catalog/queries'
import { useAddToCart, useCart } from '@/features/cart/queries'
import { useFavoriteToggle, } from '@/features/favorites/queries'
import { NftCard, NftCardSkeleton } from '@/features/catalog/NftCard'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { NftImage } from '@/components/shared/NftImage'
import { QuantityStepper } from '@/components/shared/QuantityStepper'
import { Stars } from '@/components/shared/Stars'
import { ErrorState } from '@/components/shared/states'
import { NotFoundPage } from '@/components/shared/NotFoundPage'
import { MobileTopBar } from '@/components/layout/MobileTopBar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LinkedinIcon, TwitterIcon } from '@/components/shared/brand-icons'
import { formatEth } from '@/lib/money/eth'
import { errorMessage, isApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils/cn'
import { useIsDesktop } from '@/hooks/useMediaQuery'

const routeApi = getRouteApi('/nft/$nftId')

export function NftDetailPage() {
  const { nftId } = routeApi.useParams()
  const query = useQuery(nftQueryOptions(nftId))

  if (query.isPending) return <DetailSkeleton />
  if (query.isError) {
    if (isApiError(query.error) && query.error.status === 404) {
      return <NotFoundPage title="NFT não encontrado" message="Este NFT não existe, foi removido ou o link está incorreto." />
    }
    return (
      <div className="container-site py-16">
        <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} retrying={query.isFetching} />
      </div>
    )
  }
  return <NftDetailView key={query.data.id} nft={query.data} />
}

function defaultEdition(nft: NftDetail): Edition | undefined {
  return nft.editions.find((e) => e.label === '1/50' && e.available > 0) ?? nft.editions.find((e) => e.available > 0) ?? nft.editions[0]
}

function NftDetailView({ nft }: { nft: NftDetail }) {
  const navigate = useNavigate()
  const cart = useCart()
  const add = useAddToCart()
  const fav = useFavoriteToggle(nft)
  const [editionId, setEditionId] = useState(() => defaultEdition(nft)?.id ?? '')
  const [qty, setQty] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const isDesktop = useIsDesktop()
  const edition = nft.editions.find((e) => e.id === editionId)
  const inCart = cart.data?.items.find((i) => i.nftId === nft.id && i.editionId === editionId)?.quantity ?? 0
  const limit = edition ? Math.max(0, Math.min(edition.available, edition.maxPerOrder) - inCart) : 0
  const soldOut = !edition || edition.available === 0

  // Disponibilidade pode mudar em tempo real (nft.updated): mantém a quantidade válida.
  const prevLimit = useRef(limit)
  useEffect(() => {
    if (limit < qty && limit > 0) {
      setQty(limit)
      if (prevLimit.current !== limit) toast.info(`Quantidade ajustada para ${limit}`, { description: 'A disponibilidade desta edição mudou.' })
    }
    prevLimit.current = limit
  }, [limit, qty])

  const addToCart = (goToCart: boolean) => {
    if (!edition || limit === 0) return
    setAddError(null)
    add.mutate(
      { nftId: nft.id, editionId: edition.id, quantity: qty },
      {
        onSuccess: () => {
          if (goToCart) void navigate({ to: '/cart' })
          else toast.success(`${nft.name} (${edition.label}) adicionado ao carrinho`, { action: { label: 'Ver carrinho', onClick: () => void navigate({ to: '/cart' }) } })
          setQty(1)
        },
        onError: (e) => {
          setAddError(errorMessage(e))
          toast.error('Não foi possível adicionar ao carrinho', { description: errorMessage(e) })
        },
      },
    )
  }

  const image = nft.gallery[activeImage] ?? nft.image
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  const limitText = soldOut
    ? `A edição ${edition?.label ?? ''} está esgotada.`
    : limit === 0
      ? `Você já tem o máximo permitido desta edição no carrinho (${inCart}).`
      : `${edition!.available} disponíve${edition!.available === 1 ? 'l' : 'is'} · máx. ${edition!.maxPerOrder} por pedido${inCart ? ` · ${inCart} no carrinho` : ''}`

  return (
    <article aria-labelledby="nft-title" className="md:pt-8">
      {/* Mobile: imagem com ações sobrepostas */}
      <div className="relative md:hidden">
        <MobileTopBar
          className="absolute inset-x-0 top-0 z-10"
          right={
            <button type="button" onClick={fav.onToggle} aria-pressed={fav.isFavorite} aria-label={fav.isFavorite ? 'Remover dos favoritos' : 'Favoritar'} className="flex size-11 items-center justify-center rounded-full border border-line bg-surface text-accent-strong">
              <Heart className="size-5" fill={fav.isFavorite ? 'currentColor' : 'none'} aria-hidden />
            </button>
          }
        />
        <div className="px-5 pt-[52px]">
          {isDesktop ? null : <NftImage image={nft.image} sizes="100vw" priority className="aspect-square w-full rounded-t-[22px]" width={960} />}
        </div>
      </div>

      <div className="container-site max-md:px-0">
        <div className="hidden md:block">
          <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/', hash: 'catalogo' }]} />
        </div>

        <div className="md:mt-2 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-8 lg:grid-cols-[100px_444px_1fr] lg:gap-0">
          {/* Galeria */}
          <div className="hidden lg:flex lg:flex-col lg:gap-4" role="group" aria-label="Galeria de imagens">
            {nft.gallery.map((g, i) => (
              <button
                key={g.base}
                type="button"
                onClick={() => setActiveImage(i)}
                aria-label={`Ver imagem ${i + 1}: ${g.alt}`}
                aria-current={i === activeImage ? 'true' : undefined}
                className={cn('size-[100px] overflow-hidden rounded-[6px] ring-offset-2 ring-offset-bg', i === activeImage && 'ring-2 ring-accent')}
              >
                <NftImage image={g} sizes="100px" decorative width={100} className="size-full" />
              </button>
            ))}
          </div>
          <div className="relative hidden bg-surface p-5 md:block lg:ml-7 lg:h-[444px] lg:w-[444px]">
            {isDesktop ? <NftImage image={image} sizes="(min-width: 1024px) 404px, 45vw" priority width={404} className="aspect-square w-full rounded-[20px] object-cover" /> : null}
            <button type="button" onClick={() => setZoomOpen(true)} className="absolute right-6 top-6 flex size-8 items-center justify-center rounded-full bg-bg/90 text-fg" aria-label="Ampliar imagem">
              <Search className="size-5" aria-hidden />
            </button>
            <div className="mt-3 flex gap-2 lg:hidden" role="group" aria-label="Galeria de imagens">
              {nft.gallery.map((g, i) => (
                <button key={g.base} type="button" onClick={() => setActiveImage(i)} aria-label={`Ver imagem ${i + 1}`} aria-current={i === activeImage ? 'true' : undefined} className={cn('size-16 overflow-hidden rounded-[6px]', i === activeImage && 'ring-2 ring-accent')}>
                  <NftImage image={g} sizes="64px" decorative width={64} className="size-full" />
                </button>
              ))}
            </div>
          </div>

          {/* Informações */}
          <div className="relative -mt-6 rounded-t-[32px] bg-surface px-6 pb-40 pt-8 md:mt-0 md:rounded-none md:bg-transparent md:p-0 md:pb-0 lg:pl-[33px]">
            <div className="flex items-start justify-between gap-3">
              <h1 id="nft-title" className="text-[22px] font-bold leading-tight text-fg md:text-[28px]">
                {nft.name}
              </h1>
              <span className="flex shrink-0 items-center gap-1 rounded-full border border-accent px-2.5 py-1 text-[15px] text-fg md:hidden" role="img" aria-label={`Nota ${nft.rating} de 5 (${nft.reviewsCount} avaliações)`}>
                <Star className="size-4 text-accent" fill="currentColor" aria-hidden />
                <span aria-hidden>
                  {nft.rating}({nft.reviewsCount})
                </span>
              </span>
            </div>
            <div className="mt-2 hidden items-center justify-between gap-4 border-b border-line-strong/70 pb-2 md:flex lg:mr-[23px]">
              <p className="text-[22px] font-bold text-accent-strong" data-testid="detail-price">
                <span className="sr-only">Preço da edição selecionada: </span>
                {edition ? formatEth(edition.price) : formatEth(nft.price)}
              </p>
              <Stars rating={nft.rating} count={nft.reviewsCount} />
            </div>

            <h2 className="mt-5 hidden text-[15px] font-bold md:block">Sobre este NFT:</h2>
            <p className="mt-3 text-[15px] leading-[30px] text-muted md:mt-2 md:text-[15px] md:leading-6">{nft.description}</p>

            <fieldset className="mt-4">
              <legend className="text-[17px] font-bold md:text-[15px]">Edição:</legend>
              <div className="mt-3 flex flex-wrap gap-2.5 md:gap-2" role="radiogroup" aria-label="Edição">
                {nft.editions.map((e) => {
                  const selected = e.id === editionId
                  const out = e.available === 0
                  return (
                    <button
                      key={e.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-disabled={out || undefined}
                      onClick={() => {
                        if (out) return
                        setEditionId(e.id)
                        setQty(1)
                        setAddError(null)
                      }}
                      title={out ? 'Edição esgotada' : `${e.label}: ${formatEth(e.price)}`}
                      className={cn(
                        'h-[30px] rounded-full border px-2 text-[16px] transition-colors md:h-[26px] md:text-[14px]',
                        selected ? 'border-accent font-bold text-accent-strong' : 'border-line text-fg/90 hover:border-accent',
                        out && 'cursor-not-allowed text-dim line-through hover:border-line',
                      )}
                      data-testid={`edition-${e.label}`}
                    >
                      {e.label}
                      {out ? <span className="sr-only"> (esgotada)</span> : null}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div className="mt-5 hidden flex-wrap items-center justify-between gap-4 md:flex lg:mr-0">
              <QuantityStepper value={qty} max={Math.max(1, limit)} onChange={setQty} label={nft.name} disabled={soldOut || limit === 0} />
              <div className="flex gap-2">
                <Button className="h-10 w-[130px] text-[15px]" onClick={() => addToCart(true)} loading={add.isPending} disabled={soldOut || limit === 0}>
                  COMPRAR
                </Button>
                <Button variant="outline" className="h-10 w-[130px] text-[15px] font-medium text-fg" onClick={fav.onToggle} aria-pressed={fav.isFavorite} disabled={fav.pending}>
                  <Heart className="size-5 text-accent-strong" fill={fav.isFavorite ? 'currentColor' : 'none'} aria-hidden />
                  {fav.isFavorite ? 'Favoritado' : 'Favoritar'}
                </Button>
              </div>
            </div>
            <p className={cn('mt-2 text-[13px]', soldOut || limit === 0 ? 'text-danger' : 'text-dim')} role="status" data-testid="edition-limit">
              {limitText}
            </p>
            {addError ? (
              <p role="alert" className="mt-1 text-[13px] text-danger">
                {addError}
              </p>
            ) : null}

            <dl className="mt-3 flex flex-col text-[17px] leading-[50px] text-muted md:text-[16px] md:leading-8">
              <div className="flex gap-2">
                <dt>ID do token:</dt>
                <dd>{nft.tokenId}</dd>
              </div>
              <div className="flex gap-2">
                <dt>Coleção:</dt>
                <dd>{nft.collection}</dd>
              </div>
              <div className="flex gap-2">
                <dt>Atributos:</dt>
                <dd>{nft.attributes.join(', ')}</dd>
              </div>
            </dl>
            <div className="mt-1 hidden items-center gap-2 md:flex">
              <span className="text-[15px] font-bold">Compartilhar este NFT:</span>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no LinkedIn (abre em nova aba)" className="text-fg hover:text-accent-strong">
                <LinkedinIcon className="size-[18px]" />
              </a>
              <a href={`mailto:?subject=${encodeURIComponent(nft.name)}&body=${encodeURIComponent(shareUrl)}`} aria-label="Compartilhar por e-mail" className="text-fg hover:text-accent-strong">
                <Mail className="size-[18px]" aria-hidden />
              </a>
              <a href={`https://x.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(nft.name)}`} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no Twitter (abre em nova aba)" className="text-fg hover:text-accent-strong">
                <TwitterIcon className="size-[18px]" />
              </a>
            </div>
          </div>
        </div>

        {/* Abas */}
        <Tabs defaultValue="details" className="mt-[86px] hidden md:block">
          <TabsList aria-label="Informações do NFT">
            <TabsTrigger value="details">Detalhes do NFT</TabsTrigger>
            <TabsTrigger value="reviews" className="font-normal">
              Avaliações de colecionadores ({nft.reviewsCount})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="pt-3 text-[15px] leading-6 text-muted">
            {nft.longDescription.map((p) => (
              <p key={p.slice(0, 20)} className="mb-6">
                {p}
              </p>
            ))}
            <h3 className="font-bold text-fg">Rede:</h3>
            <p className="mb-3 mt-1">{nft.networkNote}</p>
            <h3 className="font-bold text-fg">Contrato:</h3>
            <p className="mb-3 mt-1">{nft.contract}</p>
            <h3 className="font-bold text-fg">Direitos autorais:</h3>
            <p className="mt-1">{nft.royalties}</p>
          </TabsContent>
          <TabsContent value="reviews" className="pt-4">
            <ul className="flex flex-col gap-4">
              {nft.reviews.map((r) => (
                <li key={r.id} className="rounded-[8px] bg-surface p-4">
                  <p className="flex items-center gap-2 font-bold">
                    {r.author}
                    <span className="flex" role="img" aria-label={`${r.rating} de 5 estrelas`}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className="size-3.5 text-accent" fill={i < r.rating ? 'currentColor' : 'none'} aria-hidden />
                      ))}
                    </span>
                  </p>
                  <p className="mt-1 text-[15px] text-muted">{r.comment}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] text-dim">Exibindo {nft.reviews.length} de {nft.reviewsCount} avaliações.</p>
          </TabsContent>
        </Tabs>

        <MoreFromCollection currentId={nft.id} />
      </div>

      {/* Barra fixa mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-[28px] bg-surface px-6 pb-5 pt-4 shadow-[0_-12px_30px_rgba(0,0,0,0.45)] md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[16px] text-fg">Qtd.</span>
            <QuantityStepper value={qty} max={Math.max(1, limit)} onChange={setQty} label={nft.name} size="sm" disabled={soldOut || limit === 0} />
          </div>
          <p className="text-[22px] font-bold text-accent-strong">{edition ? formatEth(edition.price) : formatEth(nft.price)}</p>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button size="pill" className="h-[52px] flex-1 bg-gradient-to-r from-accent to-[#c27c43] text-[17px]" onClick={() => addToCart(true)} loading={add.isPending} disabled={soldOut || limit === 0}>
            Comprar NFT
          </Button>
          <button type="button" onClick={() => addToCart(false)} disabled={soldOut || limit === 0 || add.isPending} className="flex size-[52px] items-center justify-center rounded-full bg-band text-accent-strong disabled:opacity-40" aria-label="Adicionar ao carrinho">
            <ShoppingCart className="size-5" aria-hidden />
          </button>
        </div>
      </div>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-[min(92vw,820px)] p-4" accentBar={false}>
          <DialogTitle className="sr-only">{nft.name} ampliado</DialogTitle>
          <DialogDescription className="sr-only">{image.alt}</DialogDescription>
          <NftImage image={image} sizes="820px" width={960} className="w-full rounded-[16px]" />
        </DialogContent>
      </Dialog>
    </article>
  )
}

function MoreFromCollection({ currentId }: { currentId: string }) {
  const params = useMemo(() => ({ tab: 'all' as const, sort: 'recent' as const, page: 1, pageSize: 16 }), [])
  const query = useQuery(catalogQueryOptions(params))
  const items = (query.data?.items ?? []).filter((n) => n.id !== currentId).slice(0, 15)
  const scroller = useRef<HTMLUListElement>(null)
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(items.length / 5))
  const go = (p: number) => {
    setPage(p)
    const el = scroller.current
    if (el) el.scrollTo({ left: p * el.clientWidth })
  }
  return (
    <section aria-labelledby="more-title" className="mt-16 max-md:px-5 md:mt-[100px]">
      <h2 id="more-title" className="border-b border-line-strong pb-3 text-[18px] font-bold text-accent-strong">
        Mais desta coleção
      </h2>
      <ul ref={scroller} className="scrollbar-none mt-8 grid motion-safe:scroll-smooth snap-x snap-mandatory auto-cols-[calc((100%-4*26px)/5)] grid-flow-col gap-[26px] overflow-x-auto max-lg:auto-cols-[45%]" onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}>
        {query.isPending
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="snap-start">
                <NftCardSkeleton />
              </li>
            ))
          : items.map((n) => (
              <li key={n.id} className="snap-start">
                <NftCard nft={n} sizes="(min-width: 1024px) 219px, 45vw" />
              </li>
            ))}
      </ul>
      {pages > 1 ? (
        <div className="mt-8 flex justify-center gap-0" role="group" aria-label="Páginas do carrossel">
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} type="button" onClick={() => go(i)} aria-label={`Página ${i + 1} do carrossel`} aria-current={i === page ? 'true' : undefined} className="flex size-6 items-center justify-center">
              <span aria-hidden className={cn('size-3 rounded-full border border-accent', i === page && 'bg-accent')} />
            </button>
          ))}
        </div>
      ) : null}
      <p className="mt-6 text-center md:hidden">
        <Link to="/" hash="catalogo" className="text-accent-strong underline-offset-4 hover:underline">
          Ver catálogo completo
        </Link>
      </p>
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div className="container-site md:pt-8" aria-busy="true" aria-label="Carregando NFT">
      <Skeleton className="hidden h-5 w-40 md:block" />
      <div className="mt-4 grid gap-8 md:grid-cols-2 lg:grid-cols-[100px_444px_1fr] lg:gap-0">
        <div className="hidden flex-col gap-4 lg:flex">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="size-[100px] rounded-[6px]" />
          ))}
        </div>
        <div className="bg-surface p-5 lg:ml-7 lg:size-[444px]">
          <Skeleton className="aspect-square w-full rounded-[20px]" />
        </div>
        <div className="flex flex-col gap-4 lg:pl-[33px]">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[26px] w-14 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  )
}
