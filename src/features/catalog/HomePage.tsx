import { useEffect, useId, useState } from 'react'
import { Link, getRouteApi } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, Search, SlidersHorizontal, X } from 'lucide-react'
import type { CatalogSort, CatalogTab } from '@/types/api'
import { searchToParams, type CatalogSearch } from '@/app/router/search-schemas'
import { Button } from '@/components/ui/button'
import { Dialog, SheetContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, ErrorState, BackgroundUpdating } from '@/components/shared/states'
import { NftImage } from '@/components/shared/NftImage'
import { LoadingImage } from '@/components/shared/LoadingImage'
import { cn } from '@/lib/utils/cn'
import { errorMessage } from '@/lib/api/client'
import { catalogQueryOptions, featuredQueryOptions } from './queries'
import { CatalogFilters, SpotlightCard } from './CatalogFilters'
import { NftCard, NftCardSkeleton } from './NftCard'
import { CatalogJumpLink } from './CatalogJumpLink'
import { useCatalogNavigation } from './useCatalogNavigation'
import { HERO_SLIDES, DIARY_POSTS, PROMOS } from './content'
import { useIsDesktop, useMediaQuery } from '@/hooks/useMediaQuery'

const indexApi = getRouteApi('/')

export function HomeRoutePage() {
  const search = indexApi.useSearch()
  return <HomePage search={search} />
}

const TABS: Array<{ id: CatalogTab; label: string }> = [
  { id: 'all', label: 'Todos os NFTs' },
  { id: 'new', label: 'Novos lançamentos' },
  { id: 'trending', label: 'Em alta' },
]

const SORTS: Array<{ id: CatalogSort; label: string }> = [
  { id: 'recent', label: 'Listados recentemente' },
  { id: 'price-asc', label: 'Menor preço' },
  { id: 'price-desc', label: 'Maior preço' },
  { id: 'name', label: 'Nome (A–Z)' },
]

export function HomePage({ search }: { search: CatalogSearch }) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  return (
    <>
      <MobileSearchBar search={search} onOpenFilters={() => setFiltersOpen(true)} />
      <Hero />
      <Catalog search={search} filtersOpen={filtersOpen} setFiltersOpen={setFiltersOpen} />
      <Promos />
      <Diary />
    </>
  )
}

// ---------------------------------------------------------------------------
function Hero() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const isDesktop = useIsDesktop()
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  useEffect(() => {
    if (paused || hovered || focused || reduceMotion) return
    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % HERO_SLIDES.length)
    }, 6000)
    return () => window.clearTimeout(timer)
  }, [index, paused, hovered, focused, reduceMotion])

  const toggleRotation = reduceMotion ? undefined : () => setPaused((value) => !value)

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques"
      className="container-site md:pt-8"
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true) }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={(event) => setFocused(event.target.matches(':focus-visible'))}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
    >
      {/* Desktop/tablet (só montado no breakpoint: evita baixar a imagem grande no mobile) */}
      {isDesktop ? (
      <div className="hidden min-h-[450px] grid-cols-[1fr_minmax(0,450px)] items-center gap-10 md:grid">
        <div className="relative flex h-full flex-col justify-start pl-0 pt-11 lg:pl-10">
          <p className="text-[16px] text-fg">Bem-vindo à Kurio</p>
          <HeroCopy index={index} desktop />
          <Button asChild size="lg" className="mt-8 h-10 w-[140px] text-[17px] font-bold">
            <CatalogJumpLink search={true}>EXPLORAR</CatalogJumpLink>
          </Button>
          <SlideDots index={index} onSelect={setIndex} paused={paused} onToggleRotation={toggleRotation} className="absolute bottom-[34px] right-0 lg:right-[70px]" />
        </div>
        <HeroArtwork index={index} desktop />
      </div>
      ) : null}

      {/* Mobile (frame "mobile-home") */}
      {isDesktop ? null : (
      <div className="relative mx-0 mt-2 overflow-hidden rounded-[28px] bg-[#5c3b22] bg-[radial-gradient(circle_at_70%_60%,#8a5b33_0,#5c3b22_45%,#3d2617_100%)] p-4 md:hidden">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <p className="text-[13px] text-fg">Bem-vindo à Kurio</p>
            <HeroCopy index={index} />
            <CatalogJumpLink search={true} className="mt-1 inline-flex items-center gap-2 text-[14px] font-bold text-accent-strong">
              EXPLORAR <ArrowRight className="size-4" aria-hidden />
            </CatalogJumpLink>
          </div>
          <HeroArtwork index={index} desktop={false} />
        </div>
        <SlideDots index={index} onSelect={setIndex} paused={paused} onToggleRotation={toggleRotation} className="mt-3 justify-center" />
      </div>
      )}
    </section>
  )
}

function HeroCopy({ index, desktop = false }: { index: number; desktop?: boolean }) {
  const layer = (i: number) => cn(
    'col-start-1 row-start-1 transition-opacity duration-700 ease-in-out motion-reduce:transition-none',
    i === index ? 'opacity-100' : 'pointer-events-none select-none opacity-0',
  )

  return (
    <>
      <h1 className="mt-2 grid text-[20px] leading-[30px] font-bold tracking-wide text-fg uppercase whitespace-pre-line md:mt-[9px] md:text-[34px] md:leading-[1.25] md:tracking-normal lg:text-[43px] lg:leading-[70px]">
        {HERO_SLIDES.map((slide, i) => (
          <span key={slide.nftId} aria-hidden={i !== index} className={layer(i)}>{desktop ? slide.title : slide.mobileTitle}</span>
        ))}
      </h1>
      <p className="mt-2 grid max-w-[560px] text-[13px] leading-5 text-muted md:mt-[3px] md:text-[14px] md:leading-6">
        {HERO_SLIDES.map((slide, i) => (
          <span key={slide.nftId} aria-hidden={i !== index} className={layer(i)}>{desktop ? slide.description : slide.mobileDescription}</span>
        ))}
      </p>
    </>
  )
}

function HeroArtwork({ index, desktop }: { index: number; desktop: boolean }) {
  const active = HERO_SLIDES[index]!

  return (
    <Link to="/nft/$nftId" params={{ nftId: active.nftId }} aria-label={`Ver ${active.name}`} className={cn(
      'grid self-start overflow-hidden',
      desktop ? 'aspect-square w-full self-center rounded-[24px]' : 'size-[120px] rounded-[14px] min-[400px]:size-[136px]',
    )}>
      {HERO_SLIDES.map((slide, i) => (
        <LoadingImage
          key={slide.nftId}
          src={`${slide.image}-${desktop ? 960 : 240}.webp`}
          srcSet={`${slide.image}-240.webp 240w, ${slide.image}-480.webp 480w${desktop ? `, ${slide.image}-960.webp 960w` : ''}`}
          sizes={desktop ? '(min-width: 1024px) 450px, 42vw' : '(min-width: 400px) 136px, 120px'}
          width={desktop ? 450 : 120}
          height={desktop ? 450 : 120}
          alt={slide.alt}
          aria-hidden={i !== index}
          fetchPriority={i === 0 ? 'high' : 'low'}
          className={cn(
            'col-start-1 row-start-1 aspect-square w-full object-cover transition-opacity duration-700 ease-in-out motion-reduce:transition-none',
            i === index ? 'opacity-100' : 'opacity-0',
          )}
        />
      ))}
    </Link>
  )
}

function SlideDots({ index, onSelect, paused, onToggleRotation, className }: {
  index: number
  onSelect: (i: number) => void
  paused: boolean
  onToggleRotation?: () => void
  className?: string
}) {
  return (
    <div className={cn('flex', className)} role="group" aria-label="Controles dos destaques">
      {onToggleRotation && (
        <button
          type="button"
          onClick={onToggleRotation}
          aria-label={paused ? 'Retomar rotação dos destaques' : 'Pausar rotação dos destaques'}
          className="flex size-6 items-center justify-center text-accent"
        >
          {paused ? <Play className="size-3" aria-hidden /> : <Pause className="size-3" aria-hidden />}
        </button>
      )}
      {HERO_SLIDES.map((s, i) => (
        <button
          key={s.nftId}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={`Destaque ${i + 1}: ${s.name}`}
          aria-current={i === index ? 'true' : undefined}
          className="flex size-6 items-center justify-center"
        >
          <span className={cn('size-2 rounded-full bg-accent transition-transform motion-reduce:transition-none', i === index && 'scale-125')} aria-hidden />
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
function MobileSearchBar({ search, onOpenFilters }: { search: CatalogSearch; onOpenFilters: () => void }) {
  const { update } = useCatalogNavigation()
  const [value, setValue] = useState(search.q ?? '')
  useEffect(() => setValue(search.q ?? ''), [search.q])
  // Debounce: reflete a busca na URL (replace) após 350 ms sem digitar.
  useEffect(() => {
    if ((search.q ?? '') === value.trim()) return
    const t = setTimeout(() => void update({ q: value.trim() || undefined }, { replace: true }), 350)
    return () => clearTimeout(t)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="flex items-center gap-3 px-4 pt-6 md:hidden">
      <form role="search" className="relative flex-1" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="mobile-search" className="sr-only">
          Explorar coleções
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <input
          id="mobile-search"
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Explorar coleções"
          className="h-[46px] w-full rounded-[12px] bg-surface pl-11 pr-3 text-[15px] text-fg placeholder:text-muted focus:outline-none focus-visible:outline-2 focus-visible:outline-accent-strong"
        />
      </form>
      <button type="button" onClick={onOpenFilters} aria-label="Abrir filtros" className="flex size-[46px] items-center justify-center rounded-[12px] bg-gradient-to-b from-accent-strong to-[#b8763e] text-bg">
        <SlidersHorizontal className="size-5" aria-hidden />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
function Catalog({ search, filtersOpen, setFiltersOpen }: { search: CatalogSearch; filtersOpen: boolean; setFiltersOpen: (v: boolean) => void }) {
  const params = searchToParams(search)
  const catalog = useQuery(catalogQueryOptions(params))
  const featured = useQuery(featuredQueryOptions())
  const { update, clear } = useCatalogNavigation()
  const sortId = useId()
  const tab = search.tab ?? 'all'
  const hasFilters = Boolean(search.q || search.category || search.network || search.min || search.max)
  const facets = catalog.data?.facets

  const data = catalog.data
  const showSkeleton = catalog.isPending
  const updating = catalog.isFetching && !catalog.isPending

  return (
    <section id="catalogo" aria-labelledby="catalogo-title" className="container-site scroll-mt-6 pt-6 md:pt-[96px]">
      <h2 id="catalogo-title" className="sr-only">
        Catálogo de NFTs
      </h2>
      <div className="lg:grid lg:grid-cols-[310px_1fr] lg:gap-12">
        <aside aria-label="Filtros do catálogo" className="hidden lg:block">
          <div className="bg-surface">
            <CatalogFilters search={search} facets={facets} />
          </div>
          {(featured.isPending || featured.data?.spotlight) && <SpotlightCard nft={featured.data?.spotlight} />}
        </aside>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <div role="group" aria-label="Exibir" className="flex gap-4 overflow-x-auto scrollbar-none md:gap-6">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={tab === t.id}
                  onClick={() => void update({ tab: t.id })}
                  className={cn(
                    'shrink-0 border-b-[3px] pb-0.5 text-[15px]',
                    tab === t.id ? 'border-accent font-bold text-accent-strong' : 'border-transparent text-fg hover:text-accent-strong',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="subtle" size="sm" className="hidden md:inline-flex lg:hidden" onClick={() => setFiltersOpen(true)} aria-label="Abrir filtros">
                <SlidersHorizontal className="size-4" aria-hidden /> Filtros
              </Button>
              <div className="flex items-center gap-2 max-md:hidden">
                <span id={sortId} className="hidden text-[15px] text-fg sm:inline">
                  Ordenar por:
                </span>
                <Select value={search.sort ?? 'recent'} onValueChange={(v) => void update({ sort: v as CatalogSort })}>
                  <SelectTrigger aria-labelledby={sortId} aria-label="Ordenar por" className="h-9 w-auto min-w-[13rem] border-0 bg-transparent px-1 text-[15px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {SORTS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="relative">
            {hasFilters ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ActiveFilters search={search} onClear={() => void clear()} />
              </div>
            ) : null}
            <span className="sr-only" role="status" aria-live="polite">
              {data ? `${data.total} NFT${data.total === 1 ? '' : 's'} encontrados, página ${data.page} de ${data.totalPages}.` : ''}
            </span>
            <div className="absolute right-0 top-1">
              <BackgroundUpdating active={updating} />
            </div>
          </div>

          <div className="mt-[29px]">
            {catalog.isError && !data ? (
              <ErrorState message={errorMessage(catalog.error)} onRetry={() => void catalog.refetch()} retrying={catalog.isFetching} />
            ) : showSkeleton ? (
              <ul className="grid grid-cols-2 gap-x-3 gap-y-[70px] md:grid-cols-3 md:gap-x-[34px]" aria-busy="true" aria-label="Carregando NFTs">
                {Array.from({ length: 9 }, (_, i) => (
                  <li key={i}>
                    <NftCardSkeleton stagger={i % 2 === 1} />
                  </li>
                ))}
              </ul>
            ) : data && data.items.length === 0 ? (
              <EmptyState
                title="Nenhum NFT encontrado"
                message="Não há resultados para a combinação de busca e filtros escolhida."
                action={hasFilters ? <Button onClick={() => void clear()}>Limpar filtros</Button> : null}
              />
            ) : data ? (
              <>
                {catalog.isError ? (
                  <ErrorState className="mb-6 py-4" title="Falha ao atualizar" message={errorMessage(catalog.error)} onRetry={() => void catalog.refetch()} />
                ) : null}
                <ul className={cn('grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-[34px] md:gap-y-[70px]', catalog.isPlaceholderData && 'opacity-60 transition-opacity')} data-testid="catalog-grid">
                  {data.items.map((nft, i) => (
                    <li key={nft.id}>
                      <NftCard nft={nft} priority={i < 3} stagger={i % 2 === 1} />
                    </li>
                  ))}
                </ul>
                <Pagination page={data.page} totalPages={data.totalPages} search={search} />
              </>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="left" aria-describedby="filters-desc">
          <DialogTitle className="px-5 pt-6">Filtros</DialogTitle>
          <DialogDescription id="filters-desc" className="px-5">
            As alterações são aplicadas imediatamente.
          </DialogDescription>
          <div className="px-5 pt-5 md:hidden">
            <label htmlFor="sort-mobile" className="text-[20px] font-bold">
              Ordenar por
            </label>
            <Select value={search.sort ?? 'recent'} onValueChange={(v) => void update({ sort: v as CatalogSort })}>
              <SelectTrigger id="sort-mobile" className="mt-3" aria-label="Ordenar por">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CatalogFilters search={search} facets={facets} className="pb-6" />
          <div className="sticky bottom-0 mt-auto flex gap-3 border-t border-line bg-surface p-4">
            <Button variant="outline" className="flex-1" onClick={() => void clear()}>
              Limpar
            </Button>
            <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
              Ver {data?.total ?? ''} resultados
            </Button>
          </div>
        </SheetContent>
      </Dialog>
    </section>
  )
}

function ActiveFilters({ search, onClear }: { search: CatalogSearch; onClear: () => void }) {
  const { update } = useCatalogNavigation()
  const chips: Array<{ label: string; remove: () => void }> = []
  if (search.q) chips.push({ label: `Busca: “${search.q}”`, remove: () => void update({ q: undefined }) })
  if (search.category) chips.push({ label: `Coleção: ${search.category}`, remove: () => void update({ category: undefined }) })
  if (search.network) chips.push({ label: `Rede: ${search.network.replace(/,/g, ', ')}`, remove: () => void update({ network: undefined }) })
  if (search.min || search.max) chips.push({ label: `Preço: ${search.min ?? '…'}–${search.max ?? '…'} ETH`, remove: () => void update({ min: undefined, max: undefined }) })
  return (
    <>
      {chips.map((c) => (
        <button key={c.label} type="button" onClick={c.remove} className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1 text-[13px] text-muted hover:border-accent hover:text-fg" aria-label={`Remover filtro ${c.label}`}>
          {c.label}
          <X className="size-3.5" aria-hidden />
        </button>
      ))}
      <button type="button" onClick={onClear} className="text-[13px] font-bold text-accent-strong underline-offset-4 hover:underline">
        Limpar filtros
      </button>
    </>
  )
}

function Pagination({ page, totalPages, search }: { page: number; totalPages: number; search: CatalogSearch }) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => totalPages <= 6 || p === 1 || p === totalPages || Math.abs(p - page) <= 1)
  const cell = 'flex size-[35px] items-center justify-center rounded-[4px] border border-line text-[17px] text-fg hover:border-accent'
  const to = (p: number) => ({ ...search, page: p === 1 ? undefined : p })
  return (
    <nav aria-label="Paginação do catálogo" className="mt-[88px] flex justify-end max-md:mt-12 max-md:justify-center">
      <ul className="flex items-center gap-2">
        {page > 1 ? (
          <li>
            <CatalogJumpLink search={to(page - 1)} className={cell} aria-label="Página anterior">
              <ChevronLeft className="size-5" aria-hidden />
            </CatalogJumpLink>
          </li>
        ) : null}
        {pages.map((p, i) => (
          <li key={p} className="flex items-center gap-2">
            {i > 0 && p - pages[i - 1]! > 1 ? <span aria-hidden className="px-1 text-dim">…</span> : null}
            <CatalogJumpLink
              search={to(p)}
              aria-label={`Página ${p}`}
              aria-current={p === page ? 'page' : undefined}
              className={cn(cell, p === page && 'border-accent bg-accent font-bold text-bg')}
            >
              {p}
            </CatalogJumpLink>
          </li>
        ))}
        {page < totalPages ? (
          <li>
            <CatalogJumpLink search={to(page + 1)} className={cell} aria-label="Próxima página">
              <ChevronRight className="size-5" aria-hidden />
            </CatalogJumpLink>
          </li>
        ) : null}
      </ul>
    </nav>
  )
}

// ---------------------------------------------------------------------------
function Promos() {
  return (
    <section aria-label="Coleções em destaque" className="container-site mt-24 grid gap-7 md:mt-[96px] lg:grid-cols-2">
      {PROMOS.map((p) => (
        <article key={p.title} className="grid grid-cols-[minmax(0,287px)_1fr] overflow-hidden rounded-[8px] bg-surface max-sm:grid-cols-1 sm:h-[250px]">
          <NftImage image={p.image} sizes="(min-width: 640px) 287px, 100vw" decorative className="h-[250px] w-full rounded-[16px]" />
          <div className="flex flex-col items-end justify-center gap-2.5 p-6 text-right sm:py-0 sm:pl-2 sm:pr-[30px]">
            <h2 className="whitespace-pre-line text-[18px] font-bold leading-6 text-fg">{p.title}</h2>
            <p className="line-clamp-3 text-[14px] leading-6 text-muted">{p.text}</p>
            <Button asChild className="h-10 w-[140px] text-[15px] font-medium">
              <CatalogJumpLink search={p.search} aria-label={`Explorar: ${p.title.replace('\n', ' ')}`}>
                Explorar <ArrowRight className="size-4" aria-hidden />
              </CatalogJumpLink>
            </Button>
          </div>
        </article>
      ))}
    </section>
  )
}

function Diary() {
  return (
    <section aria-labelledby="diario-title" className="container-site mt-24 md:mt-[124px]">
      <h2 id="diario-title" className="text-center text-[30px] font-bold text-fg">
        Diário da Cunhagem
      </h2>
      <p className="mt-3 text-center text-[15px] text-muted">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[repeat(4,268px)]">
        {DIARY_POSTS.map((d) => (
          <li key={d.title}>
            <article className="relative flex h-full flex-col overflow-hidden rounded-[8px] bg-surface">
              <NftImage image={d.image} sizes="(min-width: 1024px) 268px, 50vw" decorative className="aspect-[268/195] w-full" />
              <div className="flex flex-1 flex-col gap-2 px-4 pb-5 pt-4">
                <p className="text-[13px] text-muted">
                  <time dateTime={d.dateTime}>{d.date}</time> | Leitura de {d.minutes} min
                </p>
                <h3 className="text-[16px] font-bold leading-[21px] text-fg">{d.title}</h3>
                <p className="text-[13px] leading-4 text-muted">{d.excerpt}</p>
                <Link to="/em-breve" search={{ secao: 'diario' }} className="mt-1 text-[13px] font-bold text-accent-strong after:absolute after:inset-0 hover:underline">
                  Ler mais <span aria-hidden>→</span>
                  <span className="sr-only">: {d.title}</span>
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
