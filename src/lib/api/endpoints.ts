import type {
  AddCartItemRequest,
  Cart,
  CatalogParams,
  CatalogResponse,
  ChangePasswordRequest,
  CreateOrderRequest,
  CurrentSessionResponse,
  FavoritesResponse,
  FeaturedResponse,
  LoginRequest,
  NftDetail,
  Order,
  Profile,
  Quote,
  QuoteRequest,
  RegisterRequest,
  SessionResponse,
  UpdateProfileRequest,
  Wallet,
  WalletConnectRequest,
  WalletConnection,
  WalletInput,
} from '@/types/api'
import { request } from './client'

/** Funções tipadas por recurso. Todas passam pelo Axios (`request`). */

type Opts = { signal?: AbortSignal }

export const authApi = {
  login: (body: LoginRequest) => request<SessionResponse>({ method: 'POST', url: '/auth/login', data: body }),
  register: (body: RegisterRequest) => request<SessionResponse>({ method: 'POST', url: '/auth/register', data: body }),
  session: (o: Opts = {}) => request<CurrentSessionResponse>({ method: 'GET', url: '/auth/session', signal: o.signal }),
  logout: () => request<void>({ method: 'POST', url: '/auth/logout' }),
}

export function catalogSearchParams(p: CatalogParams): URLSearchParams {
  const sp = new URLSearchParams()
  if (p.q) sp.set('q', p.q)
  if (p.category) sp.set('category', p.category)
  if (p.networks?.length) sp.set('network', p.networks.join(','))
  if (p.minPrice) sp.set('minPrice', p.minPrice)
  if (p.maxPrice) sp.set('maxPrice', p.maxPrice)
  if (p.tab) sp.set('tab', p.tab)
  if (p.sort) sp.set('sort', p.sort)
  if (p.page) sp.set('page', String(p.page))
  if (p.pageSize) sp.set('pageSize', String(p.pageSize))
  return sp
}

export const nftApi = {
  list: (params: CatalogParams, o: Opts = {}) => request<CatalogResponse>({ method: 'GET', url: '/nfts', params: catalogSearchParams(params), signal: o.signal }),
  featured: (o: Opts = {}) => request<FeaturedResponse>({ method: 'GET', url: '/nfts/featured', signal: o.signal }),
  detail: (id: string, o: Opts = {}) => request<NftDetail>({ method: 'GET', url: `/nfts/${encodeURIComponent(id)}`, signal: o.signal }),
}

export const favoritesApi = {
  list: (o: Opts = {}) => request<FavoritesResponse>({ method: 'GET', url: '/favorites', signal: o.signal }),
  add: (nftId: string) => request<{ nftIds: string[] }>({ method: 'PUT', url: `/favorites/${encodeURIComponent(nftId)}` }),
  remove: (nftId: string) => request<{ nftIds: string[] }>({ method: 'DELETE', url: `/favorites/${encodeURIComponent(nftId)}` }),
}

export const cartApi = {
  get: (o: Opts = {}) => request<Cart>({ method: 'GET', url: '/cart', signal: o.signal }),
  addItem: (body: AddCartItemRequest) => request<Cart>({ method: 'POST', url: '/cart/items', data: body }),
  updateItem: (itemId: string, quantity: number) => request<Cart>({ method: 'PATCH', url: `/cart/items/${itemId}`, data: { quantity } }),
  removeItem: (itemId: string) => request<Cart>({ method: 'DELETE', url: `/cart/items/${itemId}` }),
  applyCoupon: (code: string) => request<Cart>({ method: 'PUT', url: '/cart/coupon', data: { code } }),
  removeCoupon: () => request<Cart>({ method: 'DELETE', url: '/cart/coupon' }),
  acknowledge: () => request<Cart>({ method: 'POST', url: '/cart/acknowledge' }),
  merge: (guestCartId: string) => request<Cart>({ method: 'POST', url: '/cart/merge', data: { guestCartId } }),
}

export const quoteApi = {
  create: (body: QuoteRequest, o: Opts = {}) => request<Quote>({ method: 'POST', url: '/quotes', data: body, signal: o.signal }),
}

/** Timeout menor para criação de pedido: força a recuperação por idempotência. */
export const ORDER_TIMEOUT_MS = 6_000

export const orderApi = {
  create: (body: CreateOrderRequest, idempotencyKey: string) =>
    request<Order>({ method: 'POST', url: '/orders', data: body, headers: { 'Idempotency-Key': idempotencyKey }, timeout: ORDER_TIMEOUT_MS }),
  get: (id: string, o: Opts = {}) => request<Order>({ method: 'GET', url: `/orders/${encodeURIComponent(id)}`, signal: o.signal }),
  list: (status?: Order['status'], o: Opts = {}) => request<Order[]>({ method: 'GET', url: '/orders', params: status ? { status } : undefined, signal: o.signal }),
}

export const walletApi = {
  list: (o: Opts = {}) => request<Wallet[]>({ method: 'GET', url: '/wallets', signal: o.signal }),
  create: (body: WalletInput) => request<Wallet>({ method: 'POST', url: '/wallets', data: body }),
  update: (id: string, body: Partial<WalletInput>) => request<Wallet>({ method: 'PATCH', url: `/wallets/${id}`, data: body }),
  connect: (body: WalletConnectRequest) => request<WalletConnection>({ method: 'POST', url: '/wallet-connections', data: body }),
  disconnect: (id: string) => request<void>({ method: 'DELETE', url: `/wallet-connections/${id}` }),
}

export const profileApi = {
  get: (o: Opts = {}) => request<Profile>({ method: 'GET', url: '/profile', signal: o.signal }),
  update: (body: UpdateProfileRequest) => request<Profile>({ method: 'PATCH', url: '/profile', data: body }),
  updateAvatar: (dataUrl: string) => request<Profile>({ method: 'PUT', url: '/profile/avatar', data: { dataUrl } }),
  removeAvatar: () => request<Profile>({ method: 'DELETE', url: '/profile/avatar' }),
  changePassword: (body: ChangePasswordRequest) => request<void>({ method: 'POST', url: '/profile/password', data: body }),
}

/** Controle do backend simulado (somente demonstração/testes). */
export const mockControlApi = {
  scenario: () => request<{ current: { id: string; label: string; description: string }; scenarios: Array<{ id: string; label: string; description: string }> }>({ method: 'GET', url: '/scenario', baseURL: '/__mock' }),
  setScenario: (id: string) => request({ method: 'PUT', url: '/scenario', baseURL: '/__mock', data: { id } }),
  reset: () => request({ method: 'POST', url: '/reset', baseURL: '/__mock' }),
  nftUpdate: (body: { nftId: string; editionId?: string; price?: string; available?: number }) => request({ method: 'POST', url: '/nft-update', baseURL: '/__mock', data: body }),
  expireSession: () => request({ method: 'POST', url: '/session/expire', baseURL: '/__mock' }),
  disconnectSocket: () => request({ method: 'POST', url: '/socket/disconnect', baseURL: '/__mock' }),
  replayEvent: () => request({ method: 'POST', url: '/socket/replay', baseURL: '/__mock' }),
  staleEvent: (nftId: string) => request({ method: 'POST', url: '/socket/stale', baseURL: '/__mock', data: { nftId } }),
}
