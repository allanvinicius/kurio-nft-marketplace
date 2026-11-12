import { http, HttpResponse } from 'msw'
import type { AddCartItemRequest, ApplyCouponRequest, Cart, MergeCartRequest, NetworkId, QuoteRequest, UpdateCartItemRequest } from '@/types/api'
import { db, nextId, persist } from '../persistence/db'
import { checkCoupon, computeQuote, getOrCreateCart, limitFor, mergeCarts, serializeCart, touchCart } from '../domain'
import { API, apiError, authenticate, optionalAuth, readJson, withNetwork } from './utils'

const NETWORKS: NetworkId[] = ['ethereum', 'polygon', 'solana']

function resolveCart(request: Request) {
  const auth = optionalAuth(request)
  if (!auth.ok) return { ok: false as const, response: auth.response }
  const cart = getOrCreateCart({ userId: auth.user?.id ?? null, guestCartId: request.headers.get('x-cart-id') })
  return { ok: true as const, cart }
}

function cartResponse(cart: Parameters<typeof serializeCart>[0], status = 200) {
  return HttpResponse.json<Cart>(serializeCart(cart), { status })
}

export const cartHandlers = [
  http.get(
    `${API}/cart`,
    withNetwork(({ request }) => {
      const r = resolveCart(request)
      if (!r.ok) return r.response
      return cartResponse(r.cart)
    }),
  ),

  http.post(
    `${API}/cart/items`,
    withNetwork(async ({ request }) => {
      const r = resolveCart(request)
      if (!r.ok) return r.response
      const body = await readJson<AddCartItemRequest>(request)
      const nftId = String(body.nftId ?? '')
      const editionId = String(body.editionId ?? '')
      const quantity = Number(body.quantity)
      if (!Number.isInteger(quantity) || quantity < 1) return apiError(400, 'VALIDATION_ERROR', 'Quantidade inválida.', { fields: { quantity: 'Informe um número inteiro maior que zero.' } })
      const nft = db().nfts[nftId]
      if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
      const edition = nft.editions.find((e) => e.id === editionId)
      if (!edition) return apiError(404, 'NOT_FOUND', 'Edição não encontrada.')
      if (edition.available === 0) return apiError(409, 'EDITION_UNAVAILABLE', `A edição ${edition.label} está esgotada.`)
      const existing = r.cart.items.find((i) => i.nftId === nftId && i.editionId === editionId)
      const desired = (existing?.quantity ?? 0) + quantity
      const limit = Math.min(edition.available, edition.maxPerOrder)
      if (desired > limit) {
        return apiError(409, 'INSUFFICIENT_AVAILABILITY', `Limite de ${limit} unidade(s) para a edição ${edition.label}.`, { details: { limit, inCart: existing?.quantity ?? 0 } })
      }
      if (existing) {
        existing.quantity = desired
        existing.addedUnitPrice = edition.price
      } else {
        r.cart.items.push({ id: nextId('ci'), nftId, editionId, quantity, addedUnitPrice: edition.price })
      }
      touchCart(r.cart)
      return cartResponse(r.cart, 201)
    }),
  ),

  http.patch(
    `${API}/cart/items/:itemId`,
    withNetwork(async ({ request, params }) => {
      const r = resolveCart(request)
      if (!r.ok) return r.response
      const item = r.cart.items.find((i) => i.id === params.itemId)
      if (!item) return apiError(404, 'NOT_FOUND', 'Item não está no carrinho.')
      const body = await readJson<UpdateCartItemRequest>(request)
      const quantity = Number(body.quantity)
      if (!Number.isInteger(quantity) || quantity < 1) return apiError(400, 'VALIDATION_ERROR', 'Quantidade inválida.', { fields: { quantity: 'Informe um número inteiro maior que zero.' } })
      const limit = limitFor(item.nftId, item.editionId)
      if (!limit) return apiError(404, 'NOT_FOUND', 'Edição não encontrada.')
      // Permite reduzir mesmo acima do limite (para resolver indisponibilidade); aumentar exige disponibilidade.
      if (quantity > item.quantity && quantity > limit.max) {
        return apiError(409, 'INSUFFICIENT_AVAILABILITY', `Limite de ${limit.max} unidade(s) disponível(is).`, { details: { limit: limit.max } })
      }
      item.quantity = quantity
      touchCart(r.cart)
      return cartResponse(r.cart)
    }),
  ),

  http.delete(
    `${API}/cart/items/:itemId`,
    withNetwork(({ request, params }) => {
      const r = resolveCart(request)
      if (!r.ok) return r.response
      const before = r.cart.items.length
      r.cart.items = r.cart.items.filter((i) => i.id !== params.itemId)
      if (before === r.cart.items.length) return apiError(404, 'NOT_FOUND', 'Item não está no carrinho.')
      touchCart(r.cart)
      return cartResponse(r.cart)
    }),
  ),

  /** Confirma ciência das alterações de preço (atualiza o preço de referência dos itens). */
  http.post(
    `${API}/cart/acknowledge`,
    withNetwork(({ request }) => {
      const r = resolveCart(request)
      if (!r.ok) return r.response
      for (const item of r.cart.items) {
        const edition = db().nfts[item.nftId]?.editions.find((e) => e.id === item.editionId)
        if (edition) item.addedUnitPrice = edition.price
      }
      touchCart(r.cart)
      return cartResponse(r.cart)
    }),
  ),

  http.put(
    `${API}/cart/coupon`,
    withNetwork(async ({ request }) => {
      const r = resolveCart(request)
      if (!r.ok) return r.response
      const body = await readJson<ApplyCouponRequest>(request)
      const code = String(body.code ?? '').trim()
      if (!code) return apiError(400, 'VALIDATION_ERROR', 'Informe um código promocional.', { fields: { code: 'Informe um código promocional.' } })
      const check = checkCoupon(code)
      if (!check.ok) {
        return check.reason === 'expired'
          ? apiError(422, 'COUPON_EXPIRED', `O cupom ${check.code} expirou.`, { fields: { code: 'Este cupom expirou.' } })
          : apiError(422, 'COUPON_INVALID', 'Código promocional inválido.', { fields: { code: 'Código promocional inválido.' } })
      }
      r.cart.couponCode = check.code
      touchCart(r.cart)
      return cartResponse(r.cart)
    }),
  ),

  http.delete(
    `${API}/cart/coupon`,
    withNetwork(({ request }) => {
      const r = resolveCart(request)
      if (!r.ok) return r.response
      r.cart.couponCode = null
      touchCart(r.cart)
      return cartResponse(r.cart)
    }),
  ),

  http.post(
    `${API}/cart/merge`,
    withNetwork(async ({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const body = await readJson<MergeCartRequest>(request)
      const guest = db().carts[String(body.guestCartId ?? '')]
      const target = getOrCreateCart({ userId: auth.user.id, guestCartId: null })
      if (guest && guest.ownerType === 'guest' && guest.items.length) mergeCarts(guest, target)
      else if (guest && guest.ownerType === 'guest') {
        delete db().carts[guest.id]
        persist()
      }
      return cartResponse(target)
    }),
  ),

  // ------------------------------------------------------------------ Cotação
  http.post(
    `${API}/quotes`,
    withNetwork(async ({ request }) => {
      const r = resolveCart(request)
      if (!r.ok) return r.response
      const body = await readJson<QuoteRequest>(request)
      const network = NETWORKS.includes(body.network as NetworkId) ? (body.network as NetworkId) : 'ethereum'
      const quote = computeQuote(r.cart, network)
      persist()
      return HttpResponse.json(quote)
    }),
  ),
]
