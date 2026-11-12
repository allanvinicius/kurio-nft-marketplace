import { http, HttpResponse } from 'msw'
import type { CatalogParams, CatalogResponse, CatalogSort, CatalogTab, CategoryId, FavoritesResponse, FeaturedResponse, NetworkId } from '@/types/api'
import { isEthAmount } from '@/lib/money/eth'
import { db, persist } from '../persistence/db'
import { FEATURED_HERO_IDS, SPOTLIGHT_ID, CATEGORY_LABELS, NETWORK_LABELS } from '../fixtures/nfts'
import { getScenario, nextLatency, scenarioRuntime } from '../scenarios'
import { queryCatalog, toSummary } from '../domain'
import { API, apiError, authenticate, withNetwork } from './utils'

const TABS: CatalogTab[] = ['all', 'new', 'trending']
const SORTS: CatalogSort[] = ['recent', 'price-asc', 'price-desc', 'name']

function parseParams(url: URL): CatalogParams | { error: Record<string, string> } {
  const sp = url.searchParams
  const fields: Record<string, string> = {}
  const params: CatalogParams = {}
  const q = sp.get('q')
  if (q) params.q = q.slice(0, 80)
  const category = sp.get('category')
  if (category) {
    if (category in CATEGORY_LABELS) params.category = category as CategoryId
    else fields.category = 'Categoria inválida.'
  }
  const networks = sp.getAll('network').flatMap((n) => n.split(',')).filter(Boolean)
  if (networks.length) {
    if (networks.every((n) => n in NETWORK_LABELS)) params.networks = networks as NetworkId[]
    else fields.network = 'Rede inválida.'
  }
  for (const key of ['minPrice', 'maxPrice'] as const) {
    const v = sp.get(key)
    if (v) {
      if (isEthAmount(v)) params[key] = v
      else fields[key] = 'Valor decimal inválido.'
    }
  }
  const tab = sp.get('tab')
  if (tab) {
    if (TABS.includes(tab as CatalogTab)) params.tab = tab as CatalogTab
    else fields.tab = 'Aba inválida.'
  }
  const sort = sp.get('sort')
  if (sort) {
    if (SORTS.includes(sort as CatalogSort)) params.sort = sort as CatalogSort
    else fields.sort = 'Ordenação inválida.'
  }
  const page = Number(sp.get('page') ?? '1')
  params.page = Number.isInteger(page) && page > 0 ? page : 1
  const pageSize = Number(sp.get('pageSize') ?? '9')
  params.pageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 9
  return Object.keys(fields).length ? { error: fields } : params
}

/** Latência do catálogo: em "out-of-order", requisições alternam lenta/rápida. */
function catalogLatency() {
  const scenario = getScenario()
  if (scenario.outOfOrderCatalog) {
    scenarioRuntime.catalogRequestCount += 1
    return scenarioRuntime.catalogRequestCount % 2 === 1 ? 1600 : 100
  }
  return nextLatency()
}

export const catalogHandlers = [
  http.get(
    `${API}/nfts/featured`,
    withNetwork(() => {
      const store = db()
      const hero = FEATURED_HERO_IDS.map((id) => store.nfts[id]).filter((n) => n !== undefined).map(toSummary)
      const spotlight = toSummary(store.nfts[SPOTLIGHT_ID]!)
      return HttpResponse.json<FeaturedResponse>({ hero, spotlight })
    }),
  ),

  http.get(
    `${API}/nfts`,
    withNetwork(
      ({ request }) => {
        const scenario = getScenario()
        if (scenario.catalog === 'network-error') return HttpResponse.error()
        if (scenario.catalog === 'error-500') return apiError(503, 'TRANSIENT_FAILURE', 'O catálogo está temporariamente indisponível.')
        const parsed = parseParams(new URL(request.url))
        if ('error' in parsed) return apiError(400, 'VALIDATION_ERROR', 'Parâmetros de busca inválidos.', { fields: parsed.error })
        const result = queryCatalog(parsed)
        if (scenario.catalog === 'empty') {
          return HttpResponse.json<CatalogResponse>({ ...result, items: [], total: 0, totalPages: 1, page: 1, facets: { ...result.facets, categories: result.facets.categories.map((c) => ({ ...c, count: 0 })), networks: result.facets.networks.map((n) => ({ ...n, count: 0 })) } })
        }
        return HttpResponse.json<CatalogResponse>(result)
      },
      { latency: catalogLatency },
    ),
  ),

  http.get(
    `${API}/nfts/:id`,
    withNetwork(({ params }) => {
      const nft = db().nfts[String(params.id)]
      if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
      return HttpResponse.json(nft)
    }),
  ),

  // ------------------------------------------------------------------ Favoritos
  http.get(
    `${API}/favorites`,
    withNetwork(({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const ids = db().favorites[auth.user.id] ?? []
      const items = ids.map((id) => db().nfts[id]).filter((n) => n !== undefined).map(toSummary)
      return HttpResponse.json<FavoritesResponse>({ nftIds: ids, items })
    }),
  ),

  http.put(
    `${API}/favorites/:nftId`,
    withNetwork(({ request, params }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      if (getScenario().favoritesMutation === 'error-500') return apiError(500, 'TRANSIENT_FAILURE', 'Não foi possível salvar o favorito.')
      const nftId = String(params.nftId)
      if (!db().nfts[nftId]) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
      const list = (db().favorites[auth.user.id] ??= [])
      if (!list.includes(nftId)) list.unshift(nftId)
      persist()
      return HttpResponse.json({ nftIds: list })
    }),
  ),

  http.delete(
    `${API}/favorites/:nftId`,
    withNetwork(({ request, params }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      if (getScenario().favoritesMutation === 'error-500') return apiError(500, 'TRANSIENT_FAILURE', 'Não foi possível remover o favorito.')
      const nftId = String(params.nftId)
      db().favorites[auth.user.id] = (db().favorites[auth.user.id] ?? []).filter((id) => id !== nftId)
      persist()
      return HttpResponse.json({ nftIds: db().favorites[auth.user.id] })
    }),
  ),
]
