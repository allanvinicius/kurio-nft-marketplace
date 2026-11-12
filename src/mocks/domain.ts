import type {
  Cart,
  CartItem,
  CatalogParams,
  CatalogResponse,
  CategoryId,
  NetworkId,
  NftDetail,
  NftSummary,
  Order,
  Quote,
  QuoteIssue,
  QuoteLine,
} from '@/types/api'
import { addEth, compareEth, eth, equalsEth, mulEth, percentOf, subEth, toEthString, minEth, maxEth, isEthAmount } from '@/lib/money/eth'
import { CATEGORY_LABELS, NETWORK_LABELS } from './fixtures/nfts'
import { COUPONS, NETWORK_FEES } from './fixtures/users'
import { db, fnv, nextId, nowIso, persist, randomToken, type CartRecord, type OrderRecord } from './persistence/db'
import { publishNftUpdated, publishOrderUpdated } from './socket/server'
import { getScenario } from './scenarios'

// ---------------------------------------------------------------------------
// NFTs
// ---------------------------------------------------------------------------
export function toSummary(n: NftDetail): NftSummary {
  const { id, name, tokenId, collection, category, network, image, price, compareAtPrice, rarity, createdAt, trendingScore, isNew, version, totalAvailable } = n
  return { id, name, tokenId, collection, category, network, image, price, compareAtPrice, rarity, createdAt, trendingScore, isNew, version, totalAvailable }
}

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as CategoryId[]
const NETWORK_ORDER = Object.keys(NETWORK_LABELS) as NetworkId[]

function normalize(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function queryCatalog(params: CatalogParams): CatalogResponse {
  const all = Object.values(db().nfts)
  const tab = params.tab ?? 'all'
  const sort = params.sort ?? 'recent'
  const pageSize = Math.min(Math.max(params.pageSize ?? 9, 1), 48)
  const q = params.q ? normalize(params.q.trim()) : ''

  const matchQ = (n: NftDetail) =>
    !q || normalize(`${n.name} ${n.collection} ${CATEGORY_LABELS[n.category]} ${n.attributes.join(' ')}`).includes(q)
  const matchTab = (n: NftDetail) => (tab === 'new' ? n.isNew : tab === 'trending' ? n.trendingScore >= 70 : true)
  const matchCategory = (n: NftDetail) => !params.category || n.category === params.category
  const matchNetwork = (n: NftDetail) => !params.networks?.length || params.networks.includes(n.network)
  const matchPrice = (n: NftDetail) =>
    (!params.minPrice || compareEth(n.price, params.minPrice) >= 0) && (!params.maxPrice || compareEth(n.price, params.maxPrice) <= 0)

  const base = all.filter((n) => matchQ(n) && matchTab(n))
  const filtered = base.filter((n) => matchCategory(n) && matchNetwork(n) && matchPrice(n))

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'price-asc':
        return compareEth(a.price, b.price) || a.name.localeCompare(b.name)
      case 'price-desc':
        return compareEth(b.price, a.price) || a.name.localeCompare(b.name)
      case 'name':
        return a.name.localeCompare(b.name, 'pt-BR')
      case 'recent':
      default:
        if (tab === 'trending') return b.trendingScore - a.trendingScore
        return b.createdAt.localeCompare(a.createdAt)
    }
  })

  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(params.page ?? 1, 1), totalPages)
  const items = sorted.slice((page - 1) * pageSize, page * pageSize).map(toSummary)

  // Facetas: cada faceta considera os demais filtros (padrão de busca facetada).
  const categories = CATEGORY_ORDER.map((id) => ({
    id,
    label: CATEGORY_LABELS[id],
    count: base.filter((n) => n.category === id && matchNetwork(n) && matchPrice(n)).length,
  }))
  const networks = NETWORK_ORDER.map((id) => ({
    id,
    label: NETWORK_LABELS[id],
    count: base.filter((n) => n.network === id && matchCategory(n) && matchPrice(n)).length,
  }))
  const prices = all.map((n) => n.price)
  const priceRange = prices.reduce((acc, p) => ({ min: minEth(acc.min, p), max: maxEth(acc.max, p) }), { min: prices[0] ?? '0', max: prices[0] ?? '0' })

  return {
    items,
    page,
    pageSize,
    total,
    totalPages,
    facets: { categories, networks, priceRange },
    applied: { ...params, tab, sort, page, pageSize },
  }
}

export function recomputeTotals(nft: NftDetail) {
  nft.totalAvailable = nft.editions.reduce((s, e) => s + e.available, 0)
  const def = nft.editions.find((e) => e.label === '1/50') ?? nft.editions[0]
  if (def) nft.price = def.price
}

/** Altera preço/disponibilidade de uma edição e publica `nft.updated`. */
export function mutateEdition(nftId: string, editionId: string | null, change: { price?: string; available?: number }) {
  const nft = db().nfts[nftId]
  if (!nft) return null
  const edition = editionId ? nft.editions.find((e) => e.id === editionId) : nft.editions.find((e) => e.label === '1/50')
  if (!edition) return null
  if (change.price !== undefined && isEthAmount(change.price)) edition.price = toEthString(eth(change.price))
  if (change.available !== undefined) edition.available = Math.max(0, Math.floor(change.available))
  recomputeTotals(nft)
  nft.version += 1
  persist()
  const kind = change.price !== undefined && change.available !== undefined ? 'price-and-availability' : change.price !== undefined ? 'price' : 'availability'
  return publishNftUpdated(nft, kind)
}

// ---------------------------------------------------------------------------
// Carrinho
// ---------------------------------------------------------------------------
export function getOrCreateCart(opts: { userId: string | null; guestCartId: string | null }): CartRecord {
  const store = db()
  if (opts.userId) {
    const existingId = store.userCarts[opts.userId]
    if (existingId && store.carts[existingId]) return store.carts[existingId]
    const cart: CartRecord = { id: nextId('cart'), ownerType: 'user', userId: opts.userId, items: [], couponCode: null, version: 1, updatedAt: nowIso() }
    store.carts[cart.id] = cart
    store.userCarts[opts.userId] = cart.id
    persist()
    return cart
  }
  const existingGuest = opts.guestCartId ? store.carts[opts.guestCartId] : undefined
  if (existingGuest?.ownerType === 'guest') return existingGuest
  const cart: CartRecord = { id: opts.guestCartId && /^gcart_[a-z0-9-]{6,}$/i.test(opts.guestCartId) ? opts.guestCartId : `gcart_${randomToken(8)}`, ownerType: 'guest', userId: null, items: [], couponCode: null, version: 1, updatedAt: nowIso() }
  store.carts[cart.id] = cart
  persist()
  return cart
}

export function touchCart(cart: CartRecord) {
  cart.version += 1
  cart.updatedAt = nowIso()
  persist()
}

export function serializeCart(cart: CartRecord): Cart {
  const store = db()
  const items: CartItem[] = []
  for (const it of cart.items) {
    const nft = store.nfts[it.nftId]
    const edition = nft?.editions.find((e) => e.id === it.editionId)
    if (!nft || !edition) continue
    items.push({
      id: it.id,
      nftId: nft.id,
      editionId: edition.id,
      editionLabel: edition.label,
      name: nft.name,
      tokenId: nft.tokenId,
      image: nft.image,
      quantity: it.quantity,
      unitPrice: edition.price,
      addedUnitPrice: it.addedUnitPrice,
      available: edition.available,
      maxPerOrder: edition.maxPerOrder,
    })
  }
  return { id: cart.id, ownerType: cart.ownerType, items, couponCode: cart.couponCode, version: cart.version, updatedAt: cart.updatedAt }
}

export function limitFor(nftId: string, editionId: string): { available: number; max: number } | null {
  const edition = db().nfts[nftId]?.editions.find((e) => e.id === editionId)
  if (!edition) return null
  return { available: edition.available, max: Math.min(edition.available, edition.maxPerOrder) }
}

/** Mescla o carrinho do visitante no carrinho do usuário, respeitando limites. */
export function mergeCarts(guest: CartRecord, target: CartRecord) {
  for (const g of guest.items) {
    const limit = limitFor(g.nftId, g.editionId)
    if (!limit) continue
    const existing = target.items.find((t) => t.nftId === g.nftId && t.editionId === g.editionId)
    if (existing) existing.quantity = Math.min(existing.quantity + g.quantity, Math.max(limit.max, existing.quantity))
    else target.items.push({ ...g, id: nextId('ci'), quantity: Math.min(g.quantity, Math.max(limit.max, 1)) })
  }
  if (!target.couponCode && guest.couponCode) target.couponCode = guest.couponCode
  delete db().carts[guest.id]
  touchCart(target)
}

// ---------------------------------------------------------------------------
// Cupom e cotação
// ---------------------------------------------------------------------------
export type CouponCheck = { ok: true; code: string; description: string } | { ok: false; code: string; reason: 'invalid' | 'expired' }

export function checkCoupon(code: string): CouponCheck {
  const rule = COUPONS.find((c) => c.code === code.trim().toUpperCase())
  if (!rule) return { ok: false, code, reason: 'invalid' }
  if (new Date(rule.expiresAt).getTime() < Date.now()) return { ok: false, code: rule.code, reason: 'expired' }
  return { ok: true, code: rule.code, description: rule.description }
}

function couponDiscount(code: string, subtotal: string): string {
  const rule = COUPONS.find((c) => c.code === code)
  if (!rule || compareEth(subtotal, rule.minSubtotal) < 0) return '0'
  const raw = rule.kind === 'percent' ? percentOf(subtotal, Number(rule.value)) : rule.value
  return minEth(toEthString(eth(raw).toDecimalPlaces(6)), subtotal)
}

export function computeQuote(cart: CartRecord, network: NetworkId): Quote {
  const store = db()
  const serialized = serializeCart(cart)
  const issues: QuoteIssue[] = []
  const lines: QuoteLine[] = serialized.items.map((it) => {
    if (!equalsEth(it.unitPrice, it.addedUnitPrice)) {
      issues.push({ code: 'PRICE_CHANGED', cartItemId: it.id, message: `O preço de ${it.name} (${it.editionLabel}) mudou.`, previous: it.addedUnitPrice, current: it.unitPrice })
    }
    if (it.available === 0) {
      issues.push({ code: 'SOLD_OUT', cartItemId: it.id, message: `${it.name} (${it.editionLabel}) esgotou.`, current: '0' })
    } else if (it.quantity > it.available) {
      issues.push({ code: 'INSUFFICIENT_AVAILABILITY', cartItemId: it.id, message: `Restam apenas ${it.available} unidade(s) de ${it.name} (${it.editionLabel}).`, current: String(it.available) })
    }
    return {
      cartItemId: it.id,
      nftId: it.nftId,
      editionId: it.editionId,
      editionLabel: it.editionLabel,
      name: it.name,
      tokenId: it.tokenId,
      image: it.image,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      lineTotal: mulEth(it.unitPrice, it.quantity),
      available: it.available,
    }
  })
  const subtotal = lines.length ? addEth(...lines.map((l) => l.lineTotal)) : '0'
  let coupon: Quote['coupon'] = null
  let discount = '0'
  if (cart.couponCode) {
    const check = checkCoupon(cart.couponCode)
    if (check.ok) {
      discount = couponDiscount(check.code, subtotal)
      coupon = { code: check.code, status: 'applied', description: check.description }
    } else {
      coupon = { code: check.code, status: check.reason, description: check.reason === 'expired' ? 'Cupom expirado' : 'Cupom inválido' }
      issues.push({ code: check.reason === 'expired' ? 'COUPON_EXPIRED' : 'COUPON_INVALID', message: check.reason === 'expired' ? `O cupom ${check.code} expirou.` : `O cupom ${check.code} é inválido.` })
    }
  }
  const networkFee = lines.length ? NETWORK_FEES[network] : '0'
  const total = lines.length ? addEth(subEth(subtotal, discount), networkFee) : '0'
  const hash = fnv(
    JSON.stringify({ l: lines.map((l) => [l.cartItemId, l.editionId, l.quantity, l.unitPrice, l.available >= l.quantity]), c: coupon?.code ?? null, cs: coupon?.status ?? null, discount, networkFee, total, network }),
  )
  const blocking = issues.some((i) => i.code === 'SOLD_OUT' || i.code === 'INSUFFICIENT_AVAILABILITY' || i.code === 'COUPON_INVALID' || i.code === 'COUPON_EXPIRED')
  const quote: Quote = {
    id: `quo_${hash}_${cart.version}`,
    hash,
    cartId: cart.id,
    cartVersion: cart.version,
    network,
    lines,
    coupon,
    subtotal,
    discount,
    networkFee,
    total,
    issues,
    purchasable: lines.length > 0 && !blocking,
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  }
  store.quotes[quote.id] = quote
  const ids = Object.keys(store.quotes)
  if (ids.length > 40) for (const id of ids.slice(0, ids.length - 40)) delete store.quotes[id]
  return quote
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------
const timers = new Map<string, ReturnType<typeof setTimeout>>()

export function scheduleSettlement(order: OrderRecord) {
  if (order.status !== 'pending' || timers.has(order.id)) return
  const delay = Math.max(0, order.settleAt - Date.now())
  timers.set(
    order.id,
    setTimeout(() => {
      timers.delete(order.id)
      settleOrder(order.id)
    }, delay),
  )
}

export function rescheduleAllPending() {
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()
  for (const o of Object.values(db().orders)) if (o.status === 'pending') scheduleSettlement(o)
}

/** Liquidação idempotente do pedido: pending -> confirmed|rejected (terminais). */
export function settleOrder(orderId: string): OrderRecord | null {
  const store = db()
  const order = store.orders[orderId]
  if (!order || order.status !== 'pending') return order ?? null
  const scenario = getScenario()
  let rejection: string | null = scenario.payment === 'rejected' ? 'A transação foi recusada pela rede simulada (saldo insuficiente na carteira).' : null

  if (!rejection) {
    for (const line of order.receipt.lines) {
      const edition = store.nfts[line.nftId]?.editions.find((e) => e.id === line.editionId)
      if (!edition || edition.available < line.quantity) {
        rejection = `Disponibilidade insuficiente para ${line.name} no momento da liquidação.`
        break
      }
    }
  }

  const touched = new Set<string>()
  if (!rejection) {
    for (const line of order.receipt.lines) {
      const nft = store.nfts[line.nftId]!
      const edition = nft.editions.find((e) => e.id === line.editionId)!
      edition.available -= line.quantity
      recomputeTotals(nft)
      nft.version += 1
      touched.add(nft.id)
    }
    // Remove do carrinho apenas os itens e quantidades comprados.
    const cart = store.carts[order.cartId]
    if (cart) {
      for (const line of order.receipt.lines) {
        const item = cart.items.find((i) => i.nftId === line.nftId && i.editionId === line.editionId)
        if (!item) continue
        item.quantity -= line.quantity
      }
      cart.items = cart.items.filter((i) => i.quantity > 0)
      if (cart.items.length === 0) cart.couponCode = null
      touchCart(cart)
    }
    order.status = 'confirmed'
    const txHash = `0x${fnv(order.id + 'a')}${fnv(order.id + 'b')}${fnv(order.id + 'c')}${fnv(order.id + 'd')}${fnv(order.id + 'e')}${fnv(order.id + 'f')}${fnv(order.id + 'g')}${fnv(order.id + 'h')}`
    order.transaction = { hash: txHash, explorerUrl: `https://sepolia.etherscan.io/tx/${txHash}` }
  } else {
    order.status = 'rejected'
    order.rejectionReason = rejection
  }
  order.version += 1
  order.updatedAt = nowIso()
  for (const conn of Object.values(store.connections)) if (conn.userId === order.userId) delete store.connections[conn.id]
  persist()
  for (const id of touched) publishNftUpdated(store.nfts[id]!, 'availability')
  publishOrderUpdated(order)
  return order
}

export function publicOrder(o: OrderRecord): Order {
  const { fingerprint: _f, settleAt: _s, cartId: _c, ...rest } = o
  return rest
}
