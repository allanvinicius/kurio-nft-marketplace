import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { CreateOrderRequest, Order } from '@/types/api'
import { orderApi } from '@/lib/api/endpoints'
import { ApiError, isApiError } from '@/lib/api/client'
import { qk } from '@/lib/query/client'
import { readJsonStorage, uuid, writeStorage } from '@/lib/utils/storage'

/**
 * Tentativa de pedido persistida (localStorage) — garante que reenvios após timeout,
 * refresh ou reconexão usem a MESMA chave de idempotência e o MESMO payload,
 * recuperando o mesmo pedido em vez de criar outro.
 */
export interface CheckoutAttempt {
  userId: string
  idempotencyKey: string
  payload: CreateOrderRequest
  fingerprint: string
  orderId: string | null
  status: 'sending' | 'uncertain' | 'created'
  createdAt: string
}

const KEY = 'kurio.checkout.attempt'

export function readAttempt(userId: string | null | undefined): CheckoutAttempt | null {
  const a = readJsonStorage<CheckoutAttempt>(KEY)
  return a && userId && a.userId === userId ? a : null
}

export function saveAttempt(a: CheckoutAttempt | null) {
  writeStorage(KEY, a ? JSON.stringify(a) : null)
}

export function clearAttemptForOrder(orderId: string) {
  const a = readJsonStorage<CheckoutAttempt>(KEY)
  if (a?.orderId === orderId) saveAttempt(null)
}

function fingerprintOf(p: CreateOrderRequest) {
  return JSON.stringify([p.quoteHash, p.walletId, p.connectionId, p.network, p.collector])
}

export type SubmitPhase = 'idle' | 'sending' | 'verifying' | 'uncertain' | 'created' | 'failed'

export interface SubmitResult {
  ok: boolean
  order?: Order
  error?: ApiError | Error
}

const AUTO_RETRY_DELAY_MS = 1_200

/**
 * Envio idempotente do pedido.
 *  - Cliques repetidos: ignorados enquanto há envio em voo (ref síncrona).
 *  - Timeout/erro de rede: estado "incerto"; 1 reenvio automático com a mesma chave;
 *    depois, o usuário pode tentar novamente — sempre com a mesma chave.
 *  - Erros definitivos (4xx): a tentativa é descartada; a próxima confirmação usa nova chave.
 */
export function useOrderSubmission(userId: string | null) {
  const qc = useQueryClient()
  const inFlight = useRef(false)
  const [phase, setPhase] = useState<SubmitPhase>('idle')
  const [error, setError] = useState<ApiError | Error | null>(null)

  const send = useCallback(
    async (attempt: CheckoutAttempt, autoRetry: boolean): Promise<SubmitResult> => {
      try {
        const order = await orderApi.create(attempt.payload, attempt.idempotencyKey)
        const created: CheckoutAttempt = { ...attempt, orderId: order.id, status: 'created' }
        saveAttempt(created)
        qc.setQueryData(qk.order(attempt.userId, order.id), order)
        setPhase('created')
        return { ok: true, order }
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
        if (isApiError(err) && err.isTransient) {
          saveAttempt({ ...attempt, status: 'uncertain' })
          if (autoRetry) {
            setPhase('verifying')
            await new Promise((r) => setTimeout(r, AUTO_RETRY_DELAY_MS))
            return send({ ...attempt, status: 'uncertain' }, false)
          }
          setPhase('uncertain')
          setError(err)
          return { ok: false, error: err }
        }
        // Erro definitivo: nenhum pedido criado com esta chave.
        saveAttempt(null)
        setPhase('failed')
        setError(err)
        return { ok: false, error: err }
      }
    },
    [qc],
  )

  const submit = useCallback(
    async (payload: CreateOrderRequest): Promise<SubmitResult | null> => {
      if (inFlight.current || !userId) return null
      inFlight.current = true
      setError(null)
      setPhase('sending')
      try {
        const existing = readAttempt(userId)
        const fingerprint = fingerprintOf(payload)
        // Reaproveita a chave se a tentativa anterior ficou incerta com o mesmo conteúdo.
        const attempt: CheckoutAttempt =
          existing && existing.fingerprint === fingerprint && existing.status !== 'created'
            ? existing
            : { userId, idempotencyKey: `ord-${uuid()}`, payload, fingerprint, orderId: null, status: 'sending', createdAt: new Date().toISOString() }
        saveAttempt(attempt)
        return await send(attempt, true)
      } finally {
        inFlight.current = false
      }
    },
    [send, userId],
  )

  /** Retomada após refresh/reconexão: reenvia a tentativa incerta com a MESMA chave. */
  const resume = useCallback(async (): Promise<SubmitResult | null> => {
    const attempt = readAttempt(userId)
    if (!attempt || attempt.status === 'created' || inFlight.current) return null
    inFlight.current = true
    setPhase('verifying')
    try {
      return await send(attempt, false)
    } finally {
      inFlight.current = false
    }
  }, [send, userId])

  const reset = useCallback(() => {
    setPhase('idle')
    setError(null)
  }, [])

  return { submit, resume, reset, phase, error, isBusy: phase === 'sending' || phase === 'verifying' }
}
