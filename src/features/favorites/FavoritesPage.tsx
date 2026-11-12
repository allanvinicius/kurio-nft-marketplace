import { Link } from '@tanstack/react-router'
import { AccountLayout } from '@/features/profile/AccountLayout'
import { NftCard, NftCardSkeleton } from '@/features/catalog/NftCard'
import { EmptyState, ErrorState, BackgroundUpdating } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/api/client'
import { useFavorites } from './queries'

export function FavoritesPage() {
  const favorites = useFavorites()
  return (
    <AccountLayout active="favorites">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-bold">Lista de interesse</h1>
        <BackgroundUpdating active={favorites.isFetching && !favorites.isPending} />
      </div>
      <div className="mt-6">
        {favorites.isPending ? (
          <ul className="grid grid-cols-2 gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i}>
                <NftCardSkeleton />
              </li>
            ))}
          </ul>
        ) : favorites.isError ? (
          <ErrorState message={errorMessage(favorites.error)} onRetry={() => void favorites.refetch()} />
        ) : favorites.data.items.length === 0 ? (
          <EmptyState
            title="Nenhum favorito ainda"
            message="Toque no coração de um NFT para salvá-lo aqui. Seus favoritos ficam salvos na sua conta."
            action={
              <Button asChild>
                <Link to="/" hash="catalogo">
                  Explorar NFTs
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3" data-testid="favorites-grid">
            {favorites.data.items.map((n) => (
              <li key={n.id}>
                <NftCard nft={n} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </AccountLayout>
  )
}
