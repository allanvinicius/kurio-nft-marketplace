import { http, HttpResponse, delay } from 'msw'
import type { CreateOrderRequest, NetworkId, Order, WalletConnectRequest, WalletProvider } from '@/types/api'
import { db, fnv, nextId, nowIso, persist } from '../persistence/db'
import { computeQuote, getOrCreateCart, mutateEdition, publicOrder, scheduleSettlement, settleOrder } from '../domain'
import { getScenario, scenarioRuntime } from '../scenarios'
import { addEth } from '@/lib/money/eth'
import { API, EMAIL_RE, apiError, authenticate, readJson, withNetwork } from './utils'

const PROVIDER_LABEL: Record<WalletProvider, string> = { metamask: 'MetaMask', walletconnect: 'WalletConnect', coinbase: 'Coinbase Wallet' }
const NETWORKS: NetworkId[] = ['ethereum', 'polygon', 'solana']

function fingerprintOf(body: Partial<CreateOrderRequest>) {
  return fnv(
    JSON.stringify({
      q: body.quoteHash,
      w: body.walletId,
      c: body.connectionId,
      n: body.network,
      col: body.collector ?? null,
    }),
  )
}

export const orderHandlers = [
  // ------------------------------------------------------------ Conexão de carteira
  http.post(
    `${API}/wallet-connections`,
    withNetwork(async ({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const body = await readJson<WalletConnectRequest>(request)
      const wallet = (db().wallets[auth.user.id] ?? []).find((w) => w.id === body.walletId)
      if (!wallet) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
      if (!body.provider || !(body.provider in PROVIDER_LABEL)) return apiError(400, 'VALIDATION_ERROR', 'Selecione uma carteira.', { fields: { provider: 'Selecione uma carteira.' } })
      if (!NETWORKS.includes(body.network as NetworkId)) return apiError(400, 'VALIDATION_ERROR', 'Selecione uma rede.', { fields: { network: 'Selecione uma rede.' } })
      await delay(400)
      if (getScenario().walletConnect === 'reject') return apiError(403, 'WALLET_REJECTED', `A conexão foi recusada em ${PROVIDER_LABEL[body.provider]}.`)
      const connection = {
        id: nextId('conn'),
        userId: auth.user.id,
        walletId: wallet.id,
        provider: body.provider,
        network: body.network as NetworkId,
        address: wallet.address,
        status: 'connected' as const,
        connectedAt: nowIso(),
      }
      db().connections[connection.id] = connection
      persist()
      const { userId: _u, ...pub } = connection
      return HttpResponse.json(pub, { status: 201 })
    }),
  ),

  http.delete(
    `${API}/wallet-connections/:id`,
    withNetwork(({ request, params }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const conn = db().connections[String(params.id)]
      if (conn && conn.userId !== auth.user.id) return apiError(403, 'FORBIDDEN', 'Conexão pertence a outro usuário.')
      delete db().connections[String(params.id)]
      persist()
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  // ------------------------------------------------------------ Pedidos
  http.post(
    `${API}/orders`,
    withNetwork(async ({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const key = request.headers.get('idempotency-key')
      if (!key || key.length < 8) return apiError(400, 'VALIDATION_ERROR', 'Cabeçalho Idempotency-Key obrigatório.')
      const body = await readJson<CreateOrderRequest>(request)
      const store = db()
      const fingerprint = fingerprintOf(body)
      const idemKey = `${auth.user.id}:${key}`
      const previous = store.idempotency[idemKey]
      if (previous) {
        if (previous.fingerprint !== fingerprint) {
          return apiError(409, 'IDEMPOTENCY_CONFLICT', 'Esta chave de idempotência já foi usada com outro conteúdo.')
        }
        const order = store.orders[previous.orderId]!
        return HttpResponse.json<Order>(publicOrder(order), { status: 200, headers: { 'Idempotent-Replayed': 'true' } })
      }

      // Validação do payload
      const fields: Record<string, string> = {}
      const c = body.collector
      if (!c?.displayName?.trim()) fields['collector.displayName'] = 'Obrigatório.'
      if (!c?.username?.trim()) fields['collector.username'] = 'Obrigatório.'
      if (!c?.email || !EMAIL_RE.test(c.email)) fields['collector.email'] = 'E-mail inválido.'
      if (!NETWORKS.includes(body.network as NetworkId)) fields.network = 'Selecione uma rede.'
      if (Object.keys(fields).length) return apiError(400, 'VALIDATION_ERROR', 'Revise os dados do colecionador.', { fields })
      const wallet = (store.wallets[auth.user.id] ?? []).find((w) => w.id === body.walletId)
      if (!wallet) return apiError(400, 'VALIDATION_ERROR', 'Selecione uma carteira cadastrada.', { fields: { walletId: 'Selecione uma carteira cadastrada.' } })
      const connection = body.connectionId ? store.connections[body.connectionId] : undefined
      if (!connection || connection.userId !== auth.user.id || connection.walletId !== wallet.id) {
        return apiError(409, 'WALLET_REJECTED', 'A carteira não está conectada. Conecte novamente para continuar.')
      }

      const cart = getOrCreateCart({ userId: auth.user.id, guestCartId: null })
      if (!cart.items.length) return apiError(409, 'CART_EMPTY', 'Seu carrinho está vazio.')

      // Cenários: alteração de preço / esgotamento durante a compra (uma vez).
      const scenario = getScenario()
      if (scenario.checkout !== 'ok' && !scenarioRuntime.checkoutTriggered) {
        scenarioRuntime.checkoutTriggered = true
        const first = cart.items[0]!
        const edition = store.nfts[first.nftId]!.editions.find((e) => e.id === first.editionId)!
        if (scenario.checkout === 'price-change-once') mutateEdition(first.nftId, first.editionId, { price: addEth(edition.price, '0.10') })
        else mutateEdition(first.nftId, first.editionId, { available: 0 })
      }

      const quote = computeQuote(cart, body.network as NetworkId)
      persist()
      if (quote.hash !== body.quoteHash) {
        return apiError(409, 'QUOTE_STALE', 'Os valores mudaram desde a sua revisão. Confirme a nova cotação.', { details: quote })
      }
      if (!quote.purchasable) {
        return apiError(409, 'INSUFFICIENT_AVAILABILITY', 'Alguns itens não estão mais disponíveis na quantidade escolhida.', { details: quote })
      }

      const now = nowIso()
      const order = {
        id: nextId('ord'),
        userId: auth.user.id,
        status: 'pending' as const,
        version: 1,
        idempotencyKey: key,
        receipt: {
          lines: quote.lines.map(({ nftId, editionId, editionLabel, name, tokenId, image, quantity, unitPrice, lineTotal }) => ({ nftId, editionId, editionLabel, name, tokenId, image, quantity, unitPrice, lineTotal })),
          subtotal: quote.subtotal,
          discount: quote.discount,
          networkFee: quote.networkFee,
          total: quote.total,
          couponCode: quote.coupon?.status === 'applied' ? quote.coupon.code : null,
          network: quote.network,
          walletLabel: PROVIDER_LABEL[connection.provider],
          walletAddress: wallet.address,
          provider: connection.provider,
        },
        transaction: null,
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
        fingerprint,
        settleAt: Date.now() + scenario.paymentDelayMs,
        cartId: cart.id,
      }
      store.orders[order.id] = order
      store.idempotency[idemKey] = { fingerprint, orderId: order.id }
      persist()
      scheduleSettlement(order)

      if (scenario.orderCreate === 'timeout-once' && !scenarioRuntime.orderTimeoutTriggered) {
        scenarioRuntime.orderTimeoutTriggered = true
        // O pedido JÁ foi criado; a resposta se perde (cliente expira antes).
        await delay(scenario.orderTimeoutMs)
      }
      return HttpResponse.json<Order>(publicOrder(order), { status: 201 })
    }),
  ),

  http.get(
    `${API}/orders`,
    withNetwork(({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const status = new URL(request.url).searchParams.get('status')
      const orders = Object.values(db().orders)
        .filter((o) => o.userId === auth.user.id && (!status || o.status === status))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(publicOrder)
      return HttpResponse.json(orders)
    }),
  ),

  http.get(
    `${API}/orders/:id`,
    withNetwork(({ request, params }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      let order = db().orders[String(params.id)]
      if (!order) return apiError(404, 'NOT_FOUND', 'Pedido não encontrado.')
      if (order.userId !== auth.user.id) return apiError(403, 'FORBIDDEN', 'Este pedido pertence a outra conta.')
      // Liquidação tardia (ex.: aba fechada durante o pagamento).
      if (order.status === 'pending' && order.settleAt <= Date.now()) order = settleOrder(order.id) ?? order
      else if (order.status === 'pending') scheduleSettlement(order)
      return HttpResponse.json<Order>(publicOrder(order))
    }),
  ),
]
