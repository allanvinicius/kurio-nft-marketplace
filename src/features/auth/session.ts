import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { LoginRequest, RegisterRequest, SessionResponse, User } from '@/types/api'
import { authApi, cartApi } from '@/lib/api/endpoints'
import { qk } from '@/lib/query/client'
import { sessionStore, useStoredSession, type SessionEndReason } from '@/lib/auth/session-store'
import { peekGuestCartId, rotateGuestCartId } from '@/lib/cart/guest-cart'
import { isApiError } from '@/lib/api/client'

export function sessionQueryOptions(token: string | null) {
  return queryOptions({
    queryKey: qk.session(token),
    queryFn: ({ signal }) => authApi.session({ signal }),
    enabled: Boolean(token),
    staleTime: 60_000,
    retry: (count, error) => !(isApiError(error) && error.status === 401) && count < 2,
  })
}

export type SessionState =
  | { status: 'guest'; user: null; token: null }
  | { status: 'loading'; user: null; token: string; userId: string }
  | { status: 'authenticated'; user: User; token: string; userId: string }

/** Estado da sessão: token local + validação na API (recuperável após refresh). */
export function useSession(): SessionState {
  const stored = useStoredSession()
  const query = useQuery(sessionQueryOptions(stored?.token ?? null))
  if (!stored) return { status: 'guest', user: null, token: null }
  if (query.data) return { status: 'authenticated', user: query.data.user, token: stored.token, userId: stored.userId }
  return { status: 'loading', user: null, token: stored.token, userId: stored.userId }
}

/**
 * Encerra a sessão local: cancela e remove TODOS os dados privados em cache
 * (sob ['user']) e o carrinho do usuário. Subscriptions do socket são recriadas
 * pelo RealtimeProvider ao observar a mudança de sessão.
 */
export async function endSession(queryClient: QueryClient, reason: SessionEndReason) {
  const prev = sessionStore.get()
  sessionStore.end(reason)
  await queryClient.cancelQueries({ queryKey: qk.userAll() })
  queryClient.removeQueries({ queryKey: qk.userAll() })
  queryClient.removeQueries({ queryKey: ['session'] })
  if (prev) queryClient.removeQueries({ queryKey: ['user', prev.userId] })
}

async function startSession(queryClient: QueryClient, res: SessionResponse) {
  const prev = sessionStore.get()
  if (prev && prev.userId !== res.user.id) {
    await queryClient.cancelQueries({ queryKey: qk.userAll() })
    queryClient.removeQueries({ queryKey: qk.userAll() })
  }
  const guestCartId = peekGuestCartId()
  sessionStore.start({ token: res.token, userId: res.user.id, expiresAt: res.expiresAt })
  queryClient.setQueryData(qk.session(res.token), { user: res.user, expiresAt: res.expiresAt })
  // Preserva os itens do visitante: mescla no carrinho do usuário.
  if (guestCartId) {
    try {
      const merged = await cartApi.merge(guestCartId)
      queryClient.setQueryData(qk.cart({ kind: 'user', id: res.user.id }), merged)
      queryClient.removeQueries({ queryKey: ['guest'] })
      rotateGuestCartId()
    } catch {
      // Mantém o id do carrinho do visitante para uma nova tentativa de merge no próximo login.
      void queryClient.invalidateQueries({ queryKey: qk.cart({ kind: 'user', id: res.user.id }) })
    }
  }
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: LoginRequest) => authApi.login(body),
    onSuccess: (res) => startSession(qc, res),
  })
}

export function useRegister() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: RegisterRequest) => authApi.register(body),
    onSuccess: (res) => startSession(qc, res),
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout()
      } catch {
        /* sessão já inválida no servidor: segue com a limpeza local */
      }
    },
    onSettled: () => endSession(qc, 'logout'),
  })
}
