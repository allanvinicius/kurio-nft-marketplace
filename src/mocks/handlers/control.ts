import { http, HttpResponse } from 'msw'
import type { NftUpdatedEvent } from '@/types/api'
import { db, nextId, nowIso, persist, resetDb } from '../persistence/db'
import { SCENARIOS, addFailRule, clearFailRules, getScenario, setScenario, type FailRule, type ScenarioId } from '../scenarios'
import { mutateEdition, rescheduleAllPending, settleOrder } from '../domain'
import { connectedClients, disconnectAll, emitRaw } from '../socket/server'
import { apiError, readJson } from './utils'

/**
 * Endpoints de controle do backend simulado (`/__mock/*`).
 * Usados pelo painel de cenários e pelos testes Playwright. Eles alteram o ESTADO do servidor
 * simulado; a interface só reage via REST/Socket.IO, nunca por chamadas diretas.
 */
const C = '*/__mock'

export const controlHandlers = [
  http.get(`${C}/scenario`, () =>
    HttpResponse.json({ current: getScenario(), scenarios: Object.values(SCENARIOS).map(({ id, label, description }) => ({ id, label, description })) }),
  ),

  http.put(`${C}/scenario`, async ({ request }) => {
    const body = await readJson<{ id: ScenarioId }>(request)
    if (!body.id || !(body.id in SCENARIOS)) return apiError(400, 'VALIDATION_ERROR', 'Cenário desconhecido.')
    return HttpResponse.json({ current: setScenario(body.id) })
  }),

  http.post(`${C}/reset`, async ({ request }) => {
    const body = await readJson<{ scenario?: ScenarioId }>(request)
    resetDb()
    clearFailRules()
    setScenario(body.scenario && body.scenario in SCENARIOS ? body.scenario : getScenario().id)
    rescheduleAllPending()
    return HttpResponse.json({ ok: true, scenario: getScenario().id })
  }),

  http.post(`${C}/fail-next`, async ({ request }) => {
    const body = await readJson<FailRule>(request)
    if (!body.route) return apiError(400, 'VALIDATION_ERROR', 'Informe "route" (ex.: "PUT /api/favorites/:id").')
    addFailRule({ route: body.route, status: body.status ?? 500, times: body.times ?? 1 })
    return HttpResponse.json({ ok: true })
  }),

  http.post(`${C}/nft-update`, async ({ request }) => {
    const body = await readJson<{ nftId: string; editionId?: string; price?: string; available?: number }>(request)
    const event = mutateEdition(String(body.nftId), body.editionId ?? null, { price: body.price, available: body.available })
    if (!event) return apiError(404, 'NOT_FOUND', 'NFT/edição não encontrado.')
    return HttpResponse.json(event)
  }),

  http.post(`${C}/session/expire`, () => {
    const sessions = db().sessions
    for (const token of Object.keys(sessions)) sessions[token]!.expiresAt = Date.now() - 1
    persist()
    return HttpResponse.json({ ok: true, expired: Object.keys(sessions).length })
  }),

  http.post(`${C}/socket/disconnect`, () => HttpResponse.json({ ok: true, closed: disconnectAll() })),

  http.get(`${C}/socket/clients`, () => HttpResponse.json(connectedClients())),

  http.get(`${C}/events`, () => HttpResponse.json(db().events)),

  /** Reenvia o último evento (ou o informado) com o MESMO eventId: duplicata. */
  http.post(`${C}/socket/replay`, async ({ request }) => {
    const body = await readJson<{ eventId?: string }>(request)
    const events = db().events
    const event = body.eventId ? events.find((e) => e.eventId === body.eventId) : events[events.length - 1]
    if (!event) return apiError(404, 'NOT_FOUND', 'Nenhum evento para reenviar.')
    emitRaw(event)
    return HttpResponse.json(event)
  }),

  /** Emite um nft.updated ANTIGO (versão menor que a atual, preço diferente): deve ser ignorado. */
  http.post(`${C}/socket/stale`, async ({ request }) => {
    const body = await readJson<{ nftId: string; price?: string }>(request)
    const nft = db().nfts[String(body.nftId)]
    if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    const price = body.price ?? '0.01'
    const event: NftUpdatedEvent = {
      eventId: nextId('evt'),
      type: 'nft.updated',
      resourceId: nft.id,
      version: Math.max(0, nft.version - 1),
      occurredAt: new Date(Date.now() - 60_000).toISOString(),
      payload: {
        nftId: nft.id,
        name: nft.name,
        price,
        totalAvailable: nft.totalAvailable,
        editions: nft.editions.map((e) => ({ id: e.id, label: e.label, price: e.label === '1/50' ? price : e.price, available: e.available })),
        change: 'price',
      },
    }
    emitRaw(event)
    return HttpResponse.json(event)
  }),

  /** Força a liquidação imediata de um pedido pendente. */
  http.post(`${C}/orders/:id/settle`, ({ params }) => {
    const order = db().orders[String(params.id)]
    if (!order) return apiError(404, 'NOT_FOUND', 'Pedido não encontrado.')
    order.settleAt = Date.now()
    return HttpResponse.json({ status: settleOrder(order.id)?.status, at: nowIso() })
  }),
]
