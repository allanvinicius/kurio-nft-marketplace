import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { NftDetail, NftUpdatedEvent, Order, OrderUpdatedEvent } from '@/types/api'
import { db, nextId, nowIso, persist } from '../persistence/db'
import { getScenario } from '../scenarios'

/**
 * Servidor Socket.IO simulado.
 *
 * Transporte: o `socket.io-client` da aplicação conecta com `transports: ['websocket']`.
 * O MSW intercepta o construtor `WebSocket` no contexto da página (`ws.link`) e o
 * `@mswjs/socket.io-binding` codifica/decodifica os pacotes Engine.IO/Socket.IO.
 * Não existe servidor real: a "conexão" é atendida dentro da página.
 *
 * Limitações documentadas em docs/SOCKET_EVENTS.md (sem rooms/namespaces nativos,
 * sem long-polling, sem compartilhamento entre abas).
 */

type SocketIoConnection = ReturnType<typeof toSocketIo>

interface ClientEntry {
  id: string
  io: SocketIoConnection
  close: (code?: number, reason?: string) => void
  userId: string | null
  pingTimer: ReturnType<typeof setInterval>
}

const clients = new Map<string, ClientEntry>()

/**
 * O MSW normaliza o path `/socket.io/` para `/` antes de casar o padrão (suporte nativo a Socket.IO),
 * então o link casa a raiz de qualquer host. Conexões que não são Engine.IO (ex.: HMR do Vite)
 * seguem para o servidor real via `server.connect()`.
 */
const socketLink = ws.link(/^wss?:\/\/[^/]+\/?$/)

export const socketHandler = socketLink.addEventListener('connection', (connection) => {
  if (!connection.client.url.searchParams.has('EIO')) {
    connection.server.connect()
    return
  }
  if (getScenario().socketOffline) {
    // Fecha imediatamente: o cliente entra em backoff de reconexão.
    queueMicrotask(() => connection.client.close(1000, 'offline'))
    return
  }

  const io = toSocketIo(connection)
  const entry: ClientEntry = {
    id: connection.client.id,
    io,
    close: (code, reason) => connection.client.close(code, reason),
    userId: null,
    // Engine.IO exige PING do servidor; sem ele o cliente expira por pingTimeout.
    pingTimer: setInterval(() => {
      try {
        connection.client.send('2')
      } catch {
        /* conexão já encerrada */
      }
    }, 20_000),
  }
  clients.set(entry.id, entry)

  io.client.on('session.join', (_event, payload: { token: string | null } | undefined) => {
    const token = payload?.token ?? null
    const session = token ? db().sessions[token] : undefined
    entry.userId = session && session.expiresAt > Date.now() ? session.userId : null
    io.client.emit('session.ready', { userId: entry.userId })
  })

  connection.client.addEventListener('close', () => {
    clearInterval(entry.pingTimer)
    clients.delete(entry.id)
  })
})

function remember(event: NftUpdatedEvent | OrderUpdatedEvent) {
  const store = db()
  store.events.push(event)
  if (store.events.length > 60) store.events.splice(0, store.events.length - 60)
  persist()
}

export function publishNftUpdated(nft: NftDetail, change: NftUpdatedEvent['payload']['change']): NftUpdatedEvent {
  const event: NftUpdatedEvent = {
    eventId: nextId('evt'),
    type: 'nft.updated',
    resourceId: nft.id,
    version: nft.version,
    occurredAt: nowIso(),
    payload: {
      nftId: nft.id,
      name: nft.name,
      price: nft.price,
      totalAvailable: nft.totalAvailable,
      editions: nft.editions.map(({ id, label, price, available }) => ({ id, label, price, available })),
      change,
    },
  }
  remember(event)
  for (const c of clients.values()) c.io.client.emit('nft.updated', event)
  return event
}

export function publishOrderUpdated(order: Order): OrderUpdatedEvent {
  const event: OrderUpdatedEvent = {
    eventId: nextId('evt'),
    type: 'order.updated',
    resourceId: order.id,
    version: order.version,
    occurredAt: nowIso(),
    userId: order.userId,
    payload: {
      orderId: order.id,
      status: order.status,
      transaction: order.transaction,
      rejectionReason: order.rejectionReason,
    },
  }
  remember(event)
  emitRaw(event)
  return event
}

/** Reenvia um evento (usado para simular duplicatas e eventos antigos). */
export function emitRaw(event: NftUpdatedEvent | OrderUpdatedEvent) {
  for (const c of clients.values()) {
    if (event.type === 'order.updated') {
      // Eventos privados só vão para conexões autenticadas do dono.
      if (c.userId && c.userId === event.userId) c.io.client.emit('order.updated', event)
    } else {
      c.io.client.emit('nft.updated', event)
    }
  }
}

/** Derruba todas as conexões (simula queda de rede do tempo real). */
export function disconnectAll(): number {
  const count = clients.size
  for (const c of [...clients.values()]) c.close(1000, 'server disconnect')
  return count
}

/** Encerra conexões associadas a um usuário (ex.: logout no "servidor"). */
export function dropUserConnections(userId: string) {
  for (const c of clients.values()) if (c.userId === userId) c.userId = null
}

export function connectedClients() {
  return [...clients.values()].map((c) => ({ id: c.id, userId: c.userId }))
}
