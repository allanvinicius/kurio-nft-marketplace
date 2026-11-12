import { io, type Socket } from 'socket.io-client'
import type { QueryClient, Query } from '@tanstack/react-query'
import type { Cart, CatalogResponse, ClientToServerEvents, FavoritesResponse, NftDetail, NftSummary, NftUpdatedEvent, Order, OrderUpdatedEvent, ServerToClientEvents } from '@/types/api'
import { qk } from '@/lib/query/client'
import { formatEth, equalsEth } from '@/lib/money/eth'

/**
 * Cliente de tempo real (socket.io-client).
 *
 * - Um socket por sessão: ao trocar de usuário/logout o socket anterior é encerrado
 *   e todos os listeners liberados (nenhum evento da sessão antiga alcança a nova).
 * - Eventos têm `eventId` (deduplicação) e `version` (ordenação): duplicatas e versões
 *   antigas são ignoradas, nunca regredindo um estado mais recente.
 * - Após reconexão, recursos ativos são reconciliados via REST (invalidação).
 */

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline'

export interface RealtimeNotice {
  id: string
  kind: 'nft-price' | 'nft-availability' | 'order-confirmed' | 'order-rejected' | 'reconnected'
  title: string
  description?: string
  nftId?: string
  orderId?: string
}

type Listener<T> = (value: T) => void

const SEEN_LIMIT = 500

export class RealtimeClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
  private sessionKey: string | null = null
  private userId: string | null = null
  private token: string | null = null
  private seen = new Set<string>()
  private seenOrder: string[] = []
  private versions = new Map<string, number>()
  private everConnected = false
  private statusValue: RealtimeStatus = 'idle'
  private statusListeners = new Set<Listener<RealtimeStatus>>()
  private noticeListeners = new Set<Listener<RealtimeNotice>>()
  /** Contadores para diagnóstico/testes (exibidos no painel de cenários). */
  readonly stats = { received: 0, applied: 0, ignoredDuplicate: 0, ignoredStale: 0, ignoredForeign: 0 }

  constructor(
    private readonly queryClient: QueryClient,
    private readonly url: string,
  ) {}

  get status() {
    return this.statusValue
  }

  onStatus(l: Listener<RealtimeStatus>) {
    this.statusListeners.add(l)
    return () => {
      this.statusListeners.delete(l)
    }
  }

  onNotice(l: Listener<RealtimeNotice>) {
    this.noticeListeners.add(l)
    return () => {
      this.noticeListeners.delete(l)
    }
  }

  private setStatus(s: RealtimeStatus) {
    this.statusValue = s
    for (const l of this.statusListeners) l(s)
    if (typeof document !== 'undefined') document.documentElement.dataset.realtime = s
  }

  private notify(n: Omit<RealtimeNotice, 'id'>) {
    const notice = { ...n, id: `${n.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }
    for (const l of this.noticeListeners) l(notice)
  }

  /** (Re)inicia o socket para a sessão informada. Idempotente para a mesma sessão. */
  connect(session: { token: string | null; userId: string | null }) {
    const key = `${session.userId ?? 'guest'}:${session.token ?? ''}`
    if (this.socket && this.sessionKey === key) return
    this.disconnect()
    this.sessionKey = key
    this.userId = session.userId
    this.token = session.token
    this.everConnected = false
    this.versions.clear()
    this.setStatus('connecting')

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(this.url, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4_000,
      timeout: 8_000,
    })
    this.socket = socket

    socket.on('connect', () => {
      socket.emit('session.join', { token: this.token })
      const isReconnect = this.everConnected
      this.everConnected = true
      this.setStatus('connected')
      if (isReconnect) {
        this.reconcile()
        this.notify({ kind: 'reconnected', title: 'Conexão em tempo real restabelecida', description: 'Preços, disponibilidade e pedidos foram sincronizados.' })
      }
    })
    socket.on('disconnect', () => this.setStatus(this.everConnected ? 'reconnecting' : 'connecting'))
    socket.on('connect_error', () => this.setStatus(this.everConnected ? 'reconnecting' : 'offline'))
    socket.on('nft.updated', (e) => this.handleNft(e))
    socket.on('order.updated', (e) => this.handleOrder(e))
  }

  disconnect() {
    if (!this.socket) return
    this.socket.removeAllListeners()
    this.socket.disconnect()
    this.socket = null
    this.sessionKey = null
    this.setStatus('idle')
  }

  /** Reconciliação após reconexão: REST é a fonte da verdade. */
  reconcile() {
    const qc = this.queryClient
    void qc.invalidateQueries({ queryKey: qk.catalogAll() })
    void qc.invalidateQueries({ queryKey: qk.nftAll() })
    void qc.invalidateQueries({ predicate: (q) => isCartQuery(q) })
    if (this.userId) void qc.invalidateQueries({ queryKey: qk.orders(this.userId) })
  }

  private markSeen(eventId: string): boolean {
    if (this.seen.has(eventId)) return false
    this.seen.add(eventId)
    this.seenOrder.push(eventId)
    if (this.seenOrder.length > SEEN_LIMIT) this.seen.delete(this.seenOrder.shift()!)
    return true
  }

  private knownVersion(key: string, fallback: number | undefined) {
    return Math.max(this.versions.get(key) ?? 0, fallback ?? 0)
  }

  private handleNft(event: NftUpdatedEvent) {
    this.stats.received += 1
    if (!this.markSeen(event.eventId)) {
      this.stats.ignoredDuplicate += 1
      return
    }
    const qc = this.queryClient
    const key = `nft:${event.resourceId}`
    const cached = qc.getQueryData<NftDetail>(qk.nft(event.resourceId))
    const cachedSummaryVersion = findSummaryVersion(qc, event.resourceId)
    if (event.version <= this.knownVersion(key, Math.max(cached?.version ?? 0, cachedSummaryVersion ?? 0))) {
      this.stats.ignoredStale += 1
      return
    }
    this.versions.set(key, event.version)
    this.stats.applied += 1
    const p = event.payload

    const patchSummary = <T extends NftSummary>(n: T): T =>
      n.id === p.nftId && event.version > n.version ? { ...n, price: p.price, totalAvailable: p.totalAvailable, version: event.version } : n

    // Detalhe
    qc.setQueryData<NftDetail>(qk.nft(p.nftId), (old) =>
      old && event.version > old.version
        ? {
            ...old,
            price: p.price,
            totalAvailable: p.totalAvailable,
            version: event.version,
            editions: old.editions.map((e) => {
              const u = p.editions.find((x) => x.id === e.id)
              return u ? { ...e, price: u.price, available: u.available } : e
            }),
          }
        : old,
    )
    // Catálogo (todas as páginas/filtros em cache)
    qc.setQueriesData<CatalogResponse>({ queryKey: qk.catalogAll() }, (old) => (old ? { ...old, items: old.items.map(patchSummary) } : old))
    qc.setQueriesData<{ hero: NftSummary[]; spotlight: NftSummary }>({ queryKey: qk.featured() }, (old) =>
      old ? { hero: old.hero.map(patchSummary), spotlight: patchSummary(old.spotlight) } : old,
    )
    qc.setQueriesData<FavoritesResponse>({ predicate: (q) => q.queryKey[0] === 'user' && q.queryKey[2] === 'favorites' }, (old) =>
      old ? { ...old, items: old.items.map(patchSummary) } : old,
    )

    // Carrinho: atualiza imediatamente e invalida a cotação (valores autoritativos vêm da API).
    let inCart: Cart['items'][number] | undefined
    let previousPrice: string | undefined
    qc.setQueriesData<Cart>({ predicate: (q) => isCartRootQuery(q) }, (old) => {
      if (!old) return old
      return {
        ...old,
        items: old.items.map((it) => {
          if (it.nftId !== p.nftId) return it
          const u = p.editions.find((x) => x.id === it.editionId)
          if (!u) return it
          inCart = it
          previousPrice = it.unitPrice
          return { ...it, unitPrice: u.price, available: u.available }
        }),
      }
    })
    void qc.invalidateQueries({ predicate: (q) => isCartQuery(q) })

    if (inCart) {
      const edition = p.editions.find((x) => x.id === inCart!.editionId)
      if (edition && previousPrice && !equalsEth(previousPrice, edition.price)) {
        this.notify({
          kind: 'nft-price',
          nftId: p.nftId,
          title: `Preço atualizado: ${p.name}`,
          description: `Edição ${edition.label}: ${formatEth(previousPrice)} → ${formatEth(edition.price)}. O resumo do carrinho foi recalculado.`,
        })
      } else if (edition && edition.available < inCart.quantity) {
        this.notify({
          kind: 'nft-availability',
          nftId: p.nftId,
          title: `Disponibilidade alterada: ${p.name}`,
          description: edition.available === 0 ? `A edição ${edition.label} esgotou.` : `Restam ${edition.available} unidade(s) da edição ${edition.label}.`,
        })
      }
    }
  }

  private handleOrder(event: OrderUpdatedEvent) {
    this.stats.received += 1
    if (!this.userId || event.userId !== this.userId) {
      this.stats.ignoredForeign += 1
      return
    }
    if (!this.markSeen(event.eventId)) {
      this.stats.ignoredDuplicate += 1
      return
    }
    const qc = this.queryClient
    const key = `order:${event.resourceId}`
    const cached = qc.getQueryData<Order>(qk.order(this.userId, event.resourceId))
    if (event.version <= this.knownVersion(key, cached?.version)) {
      this.stats.ignoredStale += 1
      return
    }
    this.versions.set(key, event.version)
    this.stats.applied += 1
    const p = event.payload
    qc.setQueryData<Order>(qk.order(this.userId, p.orderId), (old) =>
      old && old.status === 'pending' && event.version > old.version
        ? { ...old, status: p.status, transaction: p.transaction, rejectionReason: p.rejectionReason, version: event.version }
        : old,
    )
    // Garante consistência total do recibo via REST.
    void qc.invalidateQueries({ queryKey: qk.order(this.userId, p.orderId) })
    if (p.status === 'confirmed') {
      void qc.invalidateQueries({ predicate: (q) => isCartQuery(q) })
      this.notify({ kind: 'order-confirmed', orderId: p.orderId, title: 'Pagamento confirmado', description: 'Seus NFTs já estão na sua carteira.' })
    } else if (p.status === 'rejected') {
      this.notify({ kind: 'order-rejected', orderId: p.orderId, title: 'Pagamento recusado', description: p.rejectionReason ?? 'A transação não foi concluída.' })
    }
  }
}

function isCartQuery(q: Query) {
  const k = q.queryKey
  return (k[0] === 'user' || k[0] === 'guest') && k[2] === 'cart'
}

function isCartRootQuery(q: Query) {
  return isCartQuery(q) && q.queryKey.length === 3
}

function findSummaryVersion(qc: QueryClient, nftId: string): number | undefined {
  let v: number | undefined
  for (const [, data] of qc.getQueriesData<CatalogResponse>({ queryKey: qk.catalogAll() })) {
    const found = data?.items.find((i) => i.id === nftId)
    if (found) v = Math.max(v ?? 0, found.version)
  }
  return v
}
