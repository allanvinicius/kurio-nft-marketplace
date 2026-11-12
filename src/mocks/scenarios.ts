/**
 * Cenários determinísticos da camada MSW.
 *
 * Seleção (prioridade):
 *   1. `?scenario=<id>` na URL ao carregar a aplicação (persistido em seguida);
 *   2. valor salvo em localStorage (`kurio.mock.scenario`);
 *   3. `default`.
 * Também é possível alterar em tempo de execução via `PUT /__mock/scenario` ou pelo painel de cenários.
 *
 * Todos os tempos aleatórios usam PRNG com semente fixa (mulberry32) => reprodutíveis.
 */

export type ScenarioId =
  | 'default'
  | 'fast'
  | 'slow'
  | 'variable-latency'
  | 'out-of-order'
  | 'empty-catalog'
  | 'catalog-error'
  | 'offline'
  | 'favorites-failure'
  | 'session-short'
  | 'wallet-reject'
  | 'checkout-price-change'
  | 'checkout-sold-out'
  | 'order-timeout'
  | 'payment-rejected'
  | 'slow-payment'

export interface ScenarioConfig {
  id: ScenarioId
  label: string
  description: string
  latency: { min: number; max: number }
  seed: number
  catalog: 'ok' | 'empty' | 'error-500' | 'network-error'
  outOfOrderCatalog: boolean
  favoritesMutation: 'ok' | 'error-500'
  walletConnect: 'ok' | 'reject'
  orderCreate: 'ok' | 'timeout-once'
  orderTimeoutMs: number
  checkout: 'ok' | 'price-change-once' | 'sold-out-once'
  payment: 'confirmed' | 'rejected'
  paymentDelayMs: number
  sessionTtlMs: number
  /** Socket recusa conexões (simula indisponibilidade do tempo real). */
  socketOffline: boolean
}

const BASE: Omit<ScenarioConfig, 'id' | 'label' | 'description'> = {
  latency: { min: 120, max: 380 },
  seed: 42,
  catalog: 'ok',
  outOfOrderCatalog: false,
  favoritesMutation: 'ok',
  walletConnect: 'ok',
  orderCreate: 'ok',
  orderTimeoutMs: 15000,
  checkout: 'ok',
  payment: 'confirmed',
  paymentDelayMs: 2500,
  sessionTtlMs: 1000 * 60 * 60 * 8,
  socketOffline: false,
}

export const SCENARIOS: Record<ScenarioId, ScenarioConfig> = {
  default: { ...BASE, id: 'default', label: 'Padrão', description: 'Sucesso com latência realista (120–380 ms).' },
  fast: { ...BASE, id: 'fast', label: 'Rápido (testes)', description: 'Sem latência; pagamento confirma em 600 ms.', latency: { min: 0, max: 0 }, paymentDelayMs: 600 },
  slow: { ...BASE, id: 'slow', label: 'Rede lenta', description: 'Todas as respostas levam ~2,5 s (skeletons visíveis).', latency: { min: 2400, max: 2600 } },
  'variable-latency': { ...BASE, id: 'variable-latency', label: 'Latência variável', description: 'Latência de 100 ms a 1,8 s com semente fixa.', latency: { min: 100, max: 1800 } },
  'out-of-order': { ...BASE, id: 'out-of-order', label: 'Respostas fora de ordem', description: 'Consultas do catálogo alternam 1,6 s / 100 ms: respostas antigas chegam depois das novas.', outOfOrderCatalog: true },
  'empty-catalog': { ...BASE, id: 'empty-catalog', label: 'Catálogo vazio', description: 'A listagem de NFTs retorna 0 resultados.', catalog: 'empty' },
  'catalog-error': { ...BASE, id: 'catalog-error', label: 'Erro 500 no catálogo', description: 'GET /api/nfts responde 500.', catalog: 'error-500' },
  offline: { ...BASE, id: 'offline', label: 'Sem conexão', description: 'GET /api/nfts falha na rede e o Socket.IO recusa conexões.', catalog: 'network-error', socketOffline: true },
  'favorites-failure': { ...BASE, id: 'favorites-failure', label: 'Falha em favoritos', description: 'Mutations de favoritos respondem 500 (rollback otimista).', favoritesMutation: 'error-500' },
  'session-short': { ...BASE, id: 'session-short', label: 'Sessão curta (45 s)', description: 'Sessões expiram 45 s após o login.', sessionTtlMs: 45_000 },
  'wallet-reject': { ...BASE, id: 'wallet-reject', label: 'Carteira recusa conexão', description: 'POST /api/wallet-connections responde 403.', walletConnect: 'reject' },
  'checkout-price-change': { ...BASE, id: 'checkout-price-change', label: 'Preço alterado na compra', description: 'Na 1ª tentativa de pedido o preço muda (nft.updated) e a API responde QUOTE_STALE.', checkout: 'price-change-once' },
  'checkout-sold-out': { ...BASE, id: 'checkout-sold-out', label: 'Edição esgotada na compra', description: 'Na 1ª tentativa de pedido a edição esgota (nft.updated) e a API responde 409.', checkout: 'sold-out-once' },
  'order-timeout': { ...BASE, id: 'order-timeout', label: 'Timeout após criar pedido', description: 'O 1º POST /api/orders cria o pedido mas só responde após 15 s (cliente expira em 6 s e recupera pela chave de idempotência).', orderCreate: 'timeout-once' },
  'payment-rejected': { ...BASE, id: 'payment-rejected', label: 'Pagamento recusado', description: 'Pedidos são recusados pela rede simulada.', payment: 'rejected' },
  'slow-payment': { ...BASE, id: 'slow-payment', label: 'Pagamento demorado (12 s)', description: 'Sem latência REST; o pedido fica pendente por 12 s (teste de queda/refresh durante o pagamento).', latency: { min: 0, max: 0 }, paymentDelayMs: 12_000 },
}

const STORAGE_KEY = 'kurio.mock.scenario'

let current: ScenarioConfig = SCENARIOS.default
/** Estado efêmero por cenário (ex.: "once" já consumido). */
export const scenarioRuntime = { checkoutTriggered: false, orderTimeoutTriggered: false, catalogRequestCount: 0 }

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function initScenario(): ScenarioConfig {
  let id: string | null
  try {
    id = new URL(window.location.href).searchParams.get('scenario')
  } catch {
    id = null
  }
  const stored = safeStorage()?.getItem(STORAGE_KEY) ?? null
  const chosen = (id && id in SCENARIOS ? id : stored && stored in SCENARIOS ? stored : 'default') as ScenarioId
  setScenario(chosen)
  return current
}

export function setScenario(id: ScenarioId): ScenarioConfig {
  current = SCENARIOS[id]
  scenarioRuntime.checkoutTriggered = false
  scenarioRuntime.orderTimeoutTriggered = false
  scenarioRuntime.catalogRequestCount = 0
  resetRng()
  safeStorage()?.setItem(STORAGE_KEY, id)
  return current
}

export function getScenario(): ScenarioConfig {
  return current
}

// ---------------------------------------------------------------------------
// PRNG determinístico
// ---------------------------------------------------------------------------
let rngState = 42
function resetRng() {
  rngState = current.seed
}
export function random(): number {
  rngState |= 0
  rngState = (rngState + 0x6d2b79f5) | 0
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function nextLatency(): number {
  const { min, max } = current.latency
  if (max <= 0) return 0
  return Math.round(min + (max - min) * random())
}

// ---------------------------------------------------------------------------
// Falhas pontuais (fila "fail-next"), configuráveis via POST /__mock/fail-next
// ---------------------------------------------------------------------------
export interface FailRule {
  /** Ex.: "PUT /api/favorites/:id" ou "GET /api/nfts" (comparado por prefixo de rota). */
  route: string
  status: number | 'network'
  times: number
}

const failRules: FailRule[] = []

export function addFailRule(rule: FailRule) {
  failRules.push({ ...rule })
}

export function clearFailRules() {
  failRules.length = 0
}

export function consumeFailRule(method: string, pathname: string): FailRule | null {
  const key = `${method.toUpperCase()} ${pathname}`
  const idx = failRules.findIndex((r) => {
    const pattern = new RegExp('^' + r.route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:[a-zA-Z]+/g, '[^/]+') + '$')
    return pattern.test(key)
  })
  if (idx === -1) return null
  const rule = failRules[idx]!
  rule.times -= 1
  if (rule.times <= 0) failRules.splice(idx, 1)
  return rule
}
