import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { FavoritesResponse, NftSummary } from '@/types/api'
import { favoritesApi } from '@/lib/api/endpoints'
import { qk } from '@/lib/query/client'
import { useStoredSession } from '@/lib/auth/session-store'
import { errorMessage } from '@/lib/api/client'

export function useFavorites() {
  const session = useStoredSession()
  return useQuery({
    queryKey: qk.favorites(session?.userId ?? 'anon'),
    queryFn: ({ signal }) => favoritesApi.list({ signal }),
    enabled: Boolean(session),
    staleTime: 60_000,
  })
}

/**
 * Favoritar/desfavoritar com ATUALIZAÇÃO OTIMISTA e ROLLBACK:
 *  onMutate  -> cancela consultas em voo, salva snapshot e aplica a mudança no cache;
 *  onError   -> restaura o snapshot e anuncia a falha;
 *  onSettled -> revalida com a API (fonte da verdade).
 */
export function useToggleFavorite() {
  const qc = useQueryClient()
  const session = useStoredSession()
  const key = qk.favorites(session?.userId ?? 'anon')
  return useMutation({
    mutationKey: ['favorite-toggle'],
    mutationFn: ({ nft, next }: { nft: NftSummary; next: boolean }) => (next ? favoritesApi.add(nft.id) : favoritesApi.remove(nft.id)),
    onMutate: async ({ nft, next }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<FavoritesResponse>(key)
      const base = previous ?? { nftIds: [], items: [] }
      qc.setQueryData<FavoritesResponse>(key, {
        nftIds: next ? [nft.id, ...base.nftIds.filter((id) => id !== nft.id)] : base.nftIds.filter((id) => id !== nft.id),
        items: next ? [nft, ...base.items.filter((i) => i.id !== nft.id)] : base.items.filter((i) => i.id !== nft.id),
      })
      return { previous }
    },
    onError: (error, { nft, next }, ctx) => {
      qc.setQueryData(key, ctx?.previous)
      toast.error(next ? `Não foi possível favoritar ${nft.name}` : `Não foi possível remover ${nft.name} dos favoritos`, {
        description: `${errorMessage(error)} O estado anterior foi restaurado.`,
      })
    },
    onSuccess: (_d, { nft, next }) => {
      toast.success(next ? `${nft.name} adicionado aos favoritos` : `${nft.name} removido dos favoritos`, { id: `fav-${nft.id}` })
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}

/** Hook de conveniência para botões de favorito (redireciona visitante para login). */
export function useFavoriteToggle(nft: NftSummary | undefined) {
  const session = useStoredSession()
  const favorites = useFavorites()
  const toggle = useToggleFavorite()
  const navigate = useNavigate()
  const href = useRouterState({ select: (s) => s.location.href })
  const isFavorite = Boolean(nft && favorites.data?.nftIds.includes(nft.id))
  const onToggle = () => {
    if (!nft) return
    if (!session) {
      toast.info('Entre para salvar favoritos', { id: 'fav-login' })
      void navigate({ to: '/login', search: { redirect: href } })
      return
    }
    toggle.mutate({ nft, next: !isFavorite })
  }
  return { isFavorite, onToggle, pending: toggle.isPending && toggle.variables?.nft.id === nft?.id }
}
