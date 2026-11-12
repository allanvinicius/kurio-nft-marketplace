import { Link } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import type { NftSummary } from '@/types/api'
import { NftImage } from '@/components/shared/NftImage'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/money/eth'
import { cn } from '@/lib/utils/cn'
import { useFavoriteToggle } from '@/features/favorites/queries'

export function FavoriteIconButton({ nft, className }: { nft: NftSummary; className?: string }) {
  const { isFavorite, onToggle, pending } = useFavoriteToggle(nft)
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
      disabled={pending}
      className={cn('flex size-9 items-center justify-center rounded-full bg-[#2a1912]/85 text-accent-strong transition-opacity hover:text-fg', className)}
      data-testid={`favorite-${nft.id}`}
    >
      <Heart className="size-5" fill={isFavorite ? 'currentColor' : 'none'} aria-hidden />
    </button>
  )
}

export function NftCard({ nft, priority, sizes = '(min-width: 1024px) 250px, (min-width: 768px) 30vw, 42vw', stagger }: { nft: NftSummary; priority?: boolean; sizes?: string; stagger?: boolean }) {
  return (
    <article className={cn('group relative flex flex-col', stagger && 'max-md:mt-[52px]')} data-testid="nft-card">
      <div className="relative bg-surface px-1 pb-[18px] pt-[31px] max-md:rounded-[16px] max-md:p-1.5">
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="block" tabIndex={-1} aria-hidden>
          <NftImage image={nft.image} sizes={sizes} priority={priority} decorative className="aspect-square w-full rounded-[16px] max-md:rounded-[12px]" />
        </Link>
        {nft.rarity ? (
          <span className="absolute left-0 top-[12px] bg-accent px-3 py-1 text-sm font-bold uppercase text-bg max-md:top-6">Raro</span>
        ) : null}
        <FavoriteIconButton nft={nft} className="absolute right-3 top-9 z-10 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100 md:aria-pressed:opacity-100 max-md:right-3 max-md:top-3" />
      </div>
      <h3 className="mt-[12px] text-[16px] leading-tight text-cream max-md:mt-3 max-md:px-3 max-md:text-[15px]">
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="after:absolute after:inset-0 after:content-[''] hover:text-accent-strong focus-visible:underline">
          {nft.name}
        </Link>
      </h3>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-3 text-[18px] font-bold text-accent-strong max-md:px-3 max-md:text-[16px]">
        <span>
          <span className="sr-only">Preço: </span>
          {formatEth(nft.price)}
        </span>
        {nft.compareAtPrice ? (
          <span className="font-normal text-dim">
            <span className="sr-only">Preço anterior: </span>
            <s>{formatEth(nft.compareAtPrice)}</s>
          </span>
        ) : null}
      </p>
      {nft.totalAvailable === 0 ? <p className="mt-1 text-sm text-danger max-md:px-3">Esgotado</p> : null}
    </article>
  )
}

export function NftCardSkeleton({ stagger }: { stagger?: boolean }) {
  return (
    <div className={cn('flex flex-col', stagger && 'max-md:mt-[52px]')} aria-hidden>
      <div className="bg-surface px-1 pb-[18px] pt-[31px] max-md:rounded-[16px] max-md:p-1.5">
        <Skeleton className="aspect-square w-full rounded-[16px]" />
      </div>
      <Skeleton className="mt-[21px] h-4 w-3/5 max-md:mt-3" />
      <Skeleton className="mt-2 h-5 w-2/5" />
    </div>
  )
}
