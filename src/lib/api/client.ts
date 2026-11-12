import axios, { AxiosError, CanceledError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import type { ApiErrorBody, ApiErrorCode } from '@/types/api'
import { sessionStore } from '@/lib/auth/session-store'
import { getGuestCartId } from '@/lib/cart/guest-cart'

/**
 * Cliente HTTP único da aplicação. Responsabilidades:
 *  - injeta `Authorization` e `X-Cart-Id` (carrinho de visitante);
 *  - normaliza erros em `ApiError` tipado;
 *  - descarta respostas de uma época de sessão anterior (troca de usuário/logout);
 *  - sinaliza expiração de sessão (401 SESSION_EXPIRED).
 * Não contém respostas fictícias: tudo vem da rede (MSW em demonstração).
 */

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'UNKNOWN'
  readonly fields: Record<string, string>
  readonly details: unknown
  constructor(opts: { status: number; code: ApiError['code']; message: string; fields?: Record<string, string>; details?: unknown }) {
    super(opts.message)
    this.name = 'ApiError'
    this.status = opts.status
    this.code = opts.code
    this.fields = opts.fields ?? {}
    this.details = opts.details
  }
  get isTransient() {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT' || this.status >= 500
  }
}

export class StaleSessionResponse extends CanceledError<unknown> {
  constructor() {
    super('Resposta descartada: pertence a uma sessão anterior')
  }
}

interface KurioConfig extends InternalAxiosRequestConfig {
  _epoch?: number
  _hadToken?: boolean
}

type ExpireListener = (code: ApiErrorCode) => void
const expireListeners = new Set<ExpireListener>()
export function onSessionRejected(listener: ExpireListener) {
  expireListeners.add(listener)
  return () => {
    expireListeners.delete(listener)
  }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10_000,
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((config: KurioConfig) => {
  const token = sessionStore.getToken()
  config._epoch = sessionStore.getEpoch()
  config._hadToken = Boolean(token)
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  else config.headers.set('X-Cart-Id', getGuestCartId())
  return config
})

api.interceptors.response.use(
  (response) => {
    const config = response.config as KurioConfig
    if (config._epoch !== undefined && config._epoch !== sessionStore.getEpoch()) throw new StaleSessionResponse()
    return response
  },
  (error: unknown) => {
    if (axios.isCancel(error)) throw error
    if (!(error instanceof AxiosError)) throw error
    const config = (error.config ?? {}) as KurioConfig
    if (config._epoch !== undefined && config._epoch !== sessionStore.getEpoch()) throw new StaleSessionResponse()
    if (error.code === 'ECONNABORTED' || error.code === AxiosError.ETIMEDOUT) {
      throw new ApiError({ status: 0, code: 'TIMEOUT', message: 'A operação demorou demais para responder.' })
    }
    if (!error.response) {
      throw new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Sem conexão com o servidor. Verifique sua rede e tente novamente.' })
    }
    const body = error.response.data as Partial<ApiErrorBody> | undefined
    const apiErr = new ApiError({
      status: error.response.status,
      code: body?.error?.code ?? (error.response.status >= 500 ? 'TRANSIENT_FAILURE' : 'UNKNOWN'),
      message: body?.error?.message ?? 'Algo deu errado. Tente novamente.',
      fields: body?.error?.fields,
      details: body?.error?.details,
    })
    if (error.response.status === 401 && config._hadToken && (apiErr.code === 'SESSION_EXPIRED' || apiErr.code === 'UNAUTHENTICATED')) {
      for (const l of expireListeners) l(apiErr.code)
    }
    throw apiErr
  },
)

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const res = await api.request<T>(config)
  return res.data
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

export function errorMessage(e: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (isApiError(e)) return e.message
  if (e instanceof Error && e.message) return e.message
  return fallback
}
