import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Cart, NetworkId } from '@/types/api'
import { cartApi, quoteApi } from '@/lib/api/endpoints'
import { qk, type CartOwner } from '@/lib/query/client'
import { useStoredSession } from '@/lib/auth/session-store'
import { getGuestCartId } from '@/lib/cart/guest-cart'

/** Dono do carrinho: usuário autenticado ou visitante (id persistido localmente). */
export function useCartOwner(): CartOwner {
  const session = useStoredSession()
  return session ? { kind: 'user', id: session.userId } : { kind: 'guest', id: getGuestCartId() }
}

export function useCart() {
  const owner = useCartOwner()
  return useQuery({
    queryKey: qk.cart(owner),
    queryFn: ({ signal }) => cartApi.get({ signal }),
    staleTime: 10_000,
  })
}

export function useCartCount(): number {
  const { data } = useCart()
  return data?.items.reduce((s, i) => s + i.quantity, 0) ?? 0
}

/**
 * Cotação autoritativa (subtotal, desconto, taxa, total) — sempre da API.
 * A chave inclui a versão do carrinho: qualquer mudança gera nova cotação; eventos
 * `nft.updated` invalidam a cotação ativa.
 */
export function useQuote(network: NetworkId = 'ethereum', opts: { enabled?: boolean } = {}) {
  const owner = useCartOwner()
  const cart = useCart()
  const version = cart.data?.version ?? 0
  return useQuery({
    queryKey: qk.quote(owner, version, network),
    queryFn: ({ signal }) => quoteApi.create({ network }, { signal }),
    enabled: (opts.enabled ?? true) && Boolean(cart.data && cart.data.items.length > 0),
    staleTime: 0,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: 'always',
  })
}

function useSetCart() {
  const qc = useQueryClient()
  const owner = useCartOwner()
  return (cart: Cart) => qc.setQueryData(qk.cart(owner), cart)
}

export function useAddToCart() {
  const setCart = useSetCart()
  return useMutation({
    mutationFn: (vars: { nftId: string; editionId: string; quantity: number }) => cartApi.addItem(vars),
    onSuccess: setCart,
  })
}

/** Alteração de quantidade com atualização otimista e rollback. */
export function useUpdateCartItem() {
  const qc = useQueryClient()
  const owner = useCartOwner()
  const key = qk.cart(owner)
  return useMutation({
    mutationFn: (vars: { itemId: string; quantity: number }) => cartApi.updateItem(vars.itemId, vars.quantity),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key, exact: true })
      const previous = qc.getQueryData<Cart>(key)
      if (previous) qc.setQueryData<Cart>(key, { ...previous, items: previous.items.map((i) => (i.id === vars.itemId ? { ...i, quantity: vars.quantity } : i)) })
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous)
    },
    onSuccess: (cart) => qc.setQueryData(key, cart),
  })
}

export function useRemoveCartItem() {
  const setCart = useSetCart()
  return useMutation({ mutationFn: (itemId: string) => cartApi.removeItem(itemId), onSuccess: setCart })
}

export function useApplyCoupon() {
  const setCart = useSetCart()
  return useMutation({ mutationFn: (code: string) => cartApi.applyCoupon(code), onSuccess: setCart })
}

export function useRemoveCoupon() {
  const setCart = useSetCart()
  return useMutation({ mutationFn: () => cartApi.removeCoupon(), onSuccess: setCart })
}

export function useAcknowledgePrices() {
  const setCart = useSetCart()
  return useMutation({ mutationFn: () => cartApi.acknowledge(), onSuccess: setCart })
}
