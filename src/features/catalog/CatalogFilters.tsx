import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { CatalogResponse, NetworkId, NftSummary } from '@/types/api'
import type { CatalogSearch } from '@/app/router/search-schemas'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { NftImage } from '@/components/shared/NftImage'
import { cn } from '@/lib/utils/cn'
import { eth, formatEthPtBr, toEthString } from '@/lib/money/eth'
import { useCatalogNavigation } from './useCatalogNavigation'

type Facets = CatalogResponse['facets']

const CENT = 100

function toCents(v: string) {
  return eth(v).times(CENT).round().toNumber()
}
function fromCents(c: number) {
  return toEthString(eth(c).dividedBy(CENT))
}

export function CatalogFilters({ search, facets, className, onApplied }: { search: CatalogSearch; facets: Facets | undefined; className?: string; onApplied?: () => void }) {
  const { update } = useCatalogNavigation()
  const selectedNetworks = useMemo(() => (search.network ? (search.network.split(',') as NetworkId[]) : []), [search.network])

  const bounds = facets ? [toCents(facets.priceRange.min), toCents(facets.priceRange.max)] : null
  const urlRange = useMemo(() => (bounds ? [search.min ? toCents(search.min) : bounds[0]!, search.max ? toCents(search.max) : bounds[1]!] : null), [bounds?.[0], bounds?.[1], search.min, search.max]) // eslint-disable-line react-hooks/exhaustive-deps
  const [range, setRange] = useState<number[] | null>(urlRange)
  useEffect(() => setRange(urlRange), [urlRange])

  const toggleNetwork = (id: NetworkId) => {
    const next = selectedNetworks.includes(id) ? selectedNetworks.filter((n) => n !== id) : [...selectedNetworks, id]
    void update({ network: next.length ? [...next].sort().join(',') : undefined })
    onApplied?.()
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <section aria-labelledby="flt-colecoes" className="px-5 pt-[19px]">
        <h2 id="flt-colecoes" className="text-[20px] font-bold text-fg">
          Coleções
        </h2>
        <ul className="mt-3 flex flex-col">
          {facets
            ? facets.categories.map((c) => {
                const active = search.category === c.id
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        void update({ category: active ? undefined : c.id })
                        onApplied?.()
                      }}
                      className={cn(
                        'flex h-10 w-full items-center justify-between rounded-[4px] pl-3 pr-3 text-left text-[16px] transition-colors hover:text-accent-strong',
                        active ? 'font-bold text-accent-strong' : 'text-dim',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {active ? <span aria-hidden className="size-1.5 rounded-full bg-accent" /> : null}
                        {c.label}
                      </span>
                      <span className={cn('font-bold', active ? 'text-accent-strong' : 'text-accent-strong/90')}>({c.count})</span>
                    </button>
                  </li>
                )
              })
            : Array.from({ length: 9 }, (_, i) => (
                <li key={i} className="flex h-10 items-center justify-between pl-3 pr-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-8" />
                </li>
              ))}
        </ul>
      </section>

      <section aria-labelledby="flt-preco" className="px-5 pt-[30px]">
        <h2 id="flt-preco" className="text-[20px] font-bold text-fg">
          Faixa de preço
        </h2>
        {bounds && range ? (
          <form
            className="mt-[14px] flex flex-col gap-3 pl-3"
            onSubmit={(e) => {
              e.preventDefault()
              const [lo, hi] = range as [number, number]
              void update({ min: lo > bounds[0]! ? fromCents(lo) : undefined, max: hi < bounds[1]! ? fromCents(hi) : undefined })
              onApplied?.()
            }}
          >
            <Slider min={bounds[0]} max={bounds[1]} step={1} minStepsBetweenThumbs={1} value={range} onValueChange={setRange} thumbLabels={['Preço mínimo', 'Preço máximo']} />
            <p className="text-[16px] text-fg" aria-live="polite">
              Preço: {formatEthPtBr(fromCents(range[0]!))} - {formatEthPtBr(fromCents(range[1]!))} ETH
            </p>
            <Button type="submit" size="sm" className="h-9 w-fit rounded-[4px] px-3 text-[17px]">
              Aplicar
            </Button>
          </form>
        ) : (
          <div className="mt-4 flex flex-col gap-3 pl-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-9 w-24" />
          </div>
        )}
      </section>

      <section aria-labelledby="flt-rede" className="px-5 pb-5 pt-[30px]">
        <h2 id="flt-rede" className="text-[20px] font-bold text-fg">
          Rede
        </h2>
        <ul className="mt-3 flex flex-col">
          {(facets?.networks ?? []).map((n) => {
            const active = selectedNetworks.includes(n.id)
            return (
              <li key={n.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={active}
                  onClick={() => toggleNetwork(n.id)}
                  className={cn('flex h-10 w-full items-center justify-between rounded-[4px] pl-3 text-left text-[16px] hover:text-accent-strong', active ? 'font-bold text-accent-strong' : 'text-fg/90')}
                >
                  <span className="flex items-center gap-2">
                    {active ? (
                      <span aria-hidden className="text-[13px] leading-none text-accent-strong">
                        ✓
                      </span>
                    ) : null}
                    {n.label}
                  </span>
                  <span className="text-muted">({n.count})</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

export function SpotlightCard({ nft }: { nft: NftSummary | undefined }) {
  return (
    <section aria-labelledby="spotlight-title" className="mt-6 bg-gradient-to-b from-[#2a1a10] to-[#1c120d] pt-[26px]">
      <h2 id="spotlight-title" className="px-5 text-[24px] font-bold tracking-wide text-accent-strong">
        NFT EM DESTAQUE
      </h2>
      <p className="mt-2 text-center text-[22px] font-bold tracking-wide text-fg">OFERTA LIMITADA</p>
      {nft ? (
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="mt-3 block" aria-label={`Ver ${nft.name}, oferta limitada`}>
          <NftImage image={nft.image} sizes="310px" decorative className="aspect-[310/366] w-full rounded-[20px]" />
        </Link>
      ) : (
        <Skeleton className="mt-3 aspect-[310/366] w-full rounded-[20px]" />
      )}
    </section>
  )
}
