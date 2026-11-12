/**
 * Contratos REST e de eventos da KURIO.
 * Compartilhados entre o cliente (Axios/TanStack Query) e a camada de mocks (MSW),
 * garantindo tipagem ponta a ponta entre transporte, estado e interface.
 *
 * Regras:
 *  - Valores em ETH trafegam SEMPRE como string decimal (`EthAmount`).
 *  - Quantidades são inteiros.
 */

export type EthAmount = string
export type ISODate = string

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'SESSION_EXPIRED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'USERNAME_TAKEN'
  | 'INSUFFICIENT_AVAILABILITY'
  | 'EDITION_UNAVAILABLE'
  | 'COUPON_INVALID'
  | 'COUPON_EXPIRED'
  | 'QUOTE_STALE'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INVALID_CURRENT_PASSWORD'
  | 'WALLET_REJECTED'
  | 'WALLET_ROLE_EXISTS'
  | 'CART_EMPTY'
  | 'TRANSIENT_FAILURE'

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    /** Erros por campo (validação). Chave = nome do campo no payload. */
    fields?: Record<string, string>
    /** Dados adicionais (ex.: nova cotação em QUOTE_STALE). */
    details?: unknown
  }
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------
export type CategoryId =
  | 'arte-digital'
  | 'fotografia'
  | 'musica'
  | 'arte-3d'
  | 'colecionaveis'
  | 'generativa'
  | 'jogos'
  | 'assinaturas'
  | 'utilidade'

export type NetworkId = 'ethereum' | 'polygon' | 'solana'

export type EditionKind = '1/1' | '1/10' | '1/50' | 'ABERTA'

export interface Edition {
  id: string
  label: EditionKind
  price: EthAmount
  /** Unidades disponíveis para compra. 0 = esgotada. */
  available: number
  /** Limite por pedido para esta edição. */
  maxPerOrder: number
}

export interface NftReview {
  id: string
  author: string
  rating: number
  comment: string
  createdAt: ISODate
}

export interface NftSummary {
  id: string
  name: string
  tokenId: string
  collection: string
  category: CategoryId
  network: NetworkId
  image: NftImage
  /** Preço da edição padrão (menor preço disponível). */
  price: EthAmount
  /** Preço anterior quando há promoção. */
  compareAtPrice: EthAmount | null
  rarity: 'raro' | null
  createdAt: ISODate
  trendingScore: number
  isNew: boolean
  /** Versão monotônica do recurso; usada para ordenar eventos em tempo real. */
  version: number
  /** Soma das unidades disponíveis em todas as edições. */
  totalAvailable: number
}

export interface NftImage {
  /** Base do asset: /assets/nfts/<art>-<view> (sufixo -<size>.webp é adicionado pelo cliente). */
  base: string
  alt: string
  /** Proporção largura/altura do asset. */
  ratio: number
}

export interface NftDetail extends NftSummary {
  description: string
  longDescription: string[]
  attributes: string[]
  rating: number
  reviewsCount: number
  reviews: NftReview[]
  gallery: NftImage[]
  editions: Edition[]
  contract: string
  royalties: string
  networkNote: string
}

export type CatalogTab = 'all' | 'new' | 'trending'
export type CatalogSort = 'recent' | 'price-asc' | 'price-desc' | 'name'

export interface CatalogParams {
  q?: string
  category?: CategoryId
  networks?: NetworkId[]
  minPrice?: string
  maxPrice?: string
  tab?: CatalogTab
  sort?: CatalogSort
  page?: number
  pageSize?: number
}

export interface FacetCount<T extends string> {
  id: T
  label: string
  count: number
}

export interface CatalogResponse {
  items: NftSummary[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  facets: {
    categories: FacetCount<CategoryId>[]
    networks: FacetCount<NetworkId>[]
    priceRange: { min: EthAmount; max: EthAmount }
  }
  /** Eco dos parâmetros efetivamente aplicados pela API. */
  applied: Required<Pick<CatalogParams, 'tab' | 'sort' | 'page' | 'pageSize'>> & Omit<CatalogParams, 'tab' | 'sort' | 'page' | 'pageSize'>
}

export interface FeaturedResponse {
  hero: NftSummary[]
  spotlight: NftSummary
}

// ---------------------------------------------------------------------------
// Sessão e conta
// ---------------------------------------------------------------------------
export interface User {
  id: string
  username: string
  email: string
  displayName: string
  avatarUrl: string | null
}

export interface SessionResponse {
  user: User
  token: string
  expiresAt: ISODate
}

export interface CurrentSessionResponse {
  user: User
  expiresAt: ISODate
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

// ---------------------------------------------------------------------------
// Favoritos
// ---------------------------------------------------------------------------
export interface FavoritesResponse {
  nftIds: string[]
  items: NftSummary[]
}

// ---------------------------------------------------------------------------
// Carrinho
// ---------------------------------------------------------------------------
export interface CartItem {
  id: string
  nftId: string
  editionId: string
  editionLabel: EditionKind
  name: string
  tokenId: string
  image: NftImage
  quantity: number
  /** Preço unitário atual da edição. */
  unitPrice: EthAmount
  /** Preço unitário no momento em que o item foi adicionado/última revisão. */
  addedUnitPrice: EthAmount
  available: number
  maxPerOrder: number
}

export interface Cart {
  id: string
  ownerType: 'guest' | 'user'
  items: CartItem[]
  couponCode: string | null
  /** Incrementado a cada alteração do carrinho. */
  version: number
  updatedAt: ISODate
}

export interface AddCartItemRequest {
  nftId: string
  editionId: string
  quantity: number
}

export interface UpdateCartItemRequest {
  quantity: number
}

export interface ApplyCouponRequest {
  code: string
}

export interface MergeCartRequest {
  guestCartId: string
}

// ---------------------------------------------------------------------------
// Cotação
// ---------------------------------------------------------------------------
export type QuoteIssueCode = 'PRICE_CHANGED' | 'INSUFFICIENT_AVAILABILITY' | 'SOLD_OUT' | 'COUPON_INVALID' | 'COUPON_EXPIRED'

export interface QuoteIssue {
  code: QuoteIssueCode
  cartItemId?: string
  message: string
  previous?: string
  current?: string
}

export interface QuoteLine {
  cartItemId: string
  nftId: string
  editionId: string
  editionLabel: EditionKind
  name: string
  tokenId: string
  image: NftImage
  quantity: number
  unitPrice: EthAmount
  lineTotal: EthAmount
  available: number
}

export interface Quote {
  id: string
  /** Hash determinístico do conteúdo; muda quando qualquer valor muda. */
  hash: string
  cartId: string
  cartVersion: number
  network: NetworkId
  lines: QuoteLine[]
  coupon: { code: string; status: 'applied' | 'invalid' | 'expired'; description: string } | null
  subtotal: EthAmount
  discount: EthAmount
  networkFee: EthAmount
  total: EthAmount
  issues: QuoteIssue[]
  /** true quando a cotação pode ser usada para criar um pedido. */
  purchasable: boolean
  createdAt: ISODate
  expiresAt: ISODate
}

export interface QuoteRequest {
  network?: NetworkId
}

// ---------------------------------------------------------------------------
// Carteiras e conexão
// ---------------------------------------------------------------------------
export type WalletProvider = 'metamask' | 'walletconnect' | 'coinbase'
export type WalletRole = 'primary' | 'secondary'

export interface Wallet {
  id: string
  role: WalletRole
  displayName: string
  nickname: string
  profileName: string
  network: NetworkId
  address: string
  secondaryAddress: string | null
  provider: WalletProvider
  referralCode: string
  email: string
  ensName: string
  ensSuffix: '.eth' | '.kurio.eth'
  updatedAt: ISODate
}

export type WalletInput = Omit<Wallet, 'id' | 'updatedAt'>

export interface WalletConnection {
  id: string
  walletId: string
  provider: WalletProvider
  network: NetworkId
  address: string
  status: 'connected'
  connectedAt: ISODate
}

export interface WalletConnectRequest {
  walletId: string
  provider: WalletProvider
  network: NetworkId
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------
export type OrderStatus = 'pending' | 'confirmed' | 'rejected'

export interface CollectorDetails {
  displayName: string
  username: string
  profileName: string
  email: string
  referralCode: string
  ensName: string
  note?: string
}

export interface CreateOrderRequest {
  quoteId: string
  quoteHash: string
  walletId: string
  connectionId: string
  network: NetworkId
  collector: CollectorDetails
}

export interface OrderLineSnapshot {
  nftId: string
  editionId: string
  editionLabel: EditionKind
  name: string
  tokenId: string
  image: NftImage
  quantity: number
  unitPrice: EthAmount
  lineTotal: EthAmount
}

export interface Order {
  id: string
  userId: string
  status: OrderStatus
  /** Versão monotônica do pedido (eventos order.updated). */
  version: number
  idempotencyKey: string
  /** Snapshot imutável do recibo. */
  receipt: {
    lines: OrderLineSnapshot[]
    subtotal: EthAmount
    discount: EthAmount
    networkFee: EthAmount
    total: EthAmount
    couponCode: string | null
    network: NetworkId
    walletLabel: string
    walletAddress: string
    provider: WalletProvider
  }
  transaction: { hash: string; explorerUrl: string } | null
  rejectionReason: string | null
  createdAt: ISODate
  updatedAt: ISODate
}

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------
export interface Profile {
  id: string
  displayName: string
  username: string
  email: string
  ensName: string
  ensSuffix: '.eth' | '.kurio.eth'
  walletNickname: string
  avatarUrl: string | null
  updatedAt: ISODate
}

export type UpdateProfileRequest = Pick<Profile, 'displayName' | 'username' | 'email' | 'ensName' | 'ensSuffix' | 'walletNickname'>

export interface UpdateAvatarRequest {
  /** data URL (image/png|jpeg|webp), até 1 MB. */
  dataUrl: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

// ---------------------------------------------------------------------------
// Eventos Socket.IO
// ---------------------------------------------------------------------------
export interface RealtimeEnvelope<TType extends string, TPayload> {
  /** Identidade estável do evento (deduplicação). */
  eventId: string
  type: TType
  resourceId: string
  /** Versão do recurso após o evento. */
  version: number
  occurredAt: ISODate
  /** Presente em eventos privados: dono do recurso. */
  userId?: string
  payload: TPayload
}

export type NftUpdatedEvent = RealtimeEnvelope<
  'nft.updated',
  {
    nftId: string
    name: string
    price: EthAmount
    totalAvailable: number
    editions: Array<Pick<Edition, 'id' | 'label' | 'price' | 'available'>>
    change: 'price' | 'availability' | 'price-and-availability'
  }
>

export type OrderUpdatedEvent = RealtimeEnvelope<
  'order.updated',
  {
    orderId: string
    status: OrderStatus
    transaction: Order['transaction']
    rejectionReason: string | null
  }
>

export interface ServerToClientEvents {
  'nft.updated': (event: NftUpdatedEvent) => void
  'order.updated': (event: OrderUpdatedEvent) => void
  'session.ready': (info: { userId: string | null }) => void
}

export interface ClientToServerEvents {
  'session.join': (payload: { token: string | null }) => void
}
