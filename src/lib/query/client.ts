import { QueryClient } from '@tanstack/react-query'
import type { CatalogParams, NetworkId } from '@/types/api'
import { isApiError, StaleSessionResponse } from '@/lib/api/client'

/**
 * Chaves de query. Dados privados ficam sob `['user', userId, ...]` para que
 * logout/troca de usuário removam tudo com um único `removeQueries(['user'])`.
 * O carrinho do visitante fica sob `['guest', guestCartId, ...]`.
 */
export type CartOwner = { kind: 'user'; id: string } | { kind: 'guest'; id: string }

export const qk = {
  session: (token: string | null) => ['session', token] as const,
  featured: () => ['featured'] as const,
  catalog: (params: CatalogParams) => ['catalog', params] as const,
  catalogAll: () => ['catalog'] as const,
  nft: (id: string) => ['nft', id] as const,
  nftAll: () => ['nft'] as const,
  cart: (owner: CartOwner) => [owner.kind, owner.id, 'cart'] as const,
  quote: (owner: CartOwner, cartVersion: number, network: NetworkId) => [owner.kind, owner.id, 'cart', 'quote', cartVersion, network] as const,
  favorites: (userId: string) => ['user', userId, 'favorites'] as const,
  profile: (userId: string) => ['user', userId, 'profile'] as const,
  wallets: (userId: string) => ['user', userId, 'wallets'] as const,
  order: (userId: string, orderId: string) => ['user', userId, 'order', orderId] as const,
  orders: (userId: string) => ['user', userId, 'order'] as const,
  userAll: () => ['user'] as const,
}

/** Política de retry: nunca repete 4xx (erros determinísticos); até 2x para rede/5xx/timeout. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof StaleSessionResponse) return false
  if (isApiError(error)) return error.isTransient && failureCount < 2
  return failureCount < 2
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        retryDelay: (attempt) => Math.min(400 * 2 ** attempt, 3_000),
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        // Mutations não são repetidas automaticamente: evita duplicar operações.
        retry: false,
      },
    },
  })
}
