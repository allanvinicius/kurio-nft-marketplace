import { HttpResponse, delay, type DefaultBodyType, type HttpResponseResolver, type PathParams } from 'msw'
import type { ApiErrorBody, ApiErrorCode } from '@/types/api'
import { consumeFailRule, nextLatency } from '../scenarios'
import { db, persist } from '../persistence/db'
import type { UserRecord } from '../fixtures/users'

export const API = '*/api'

export function apiError(status: number, code: ApiErrorCode, message: string, extra: Partial<ApiErrorBody['error']> = {}) {
  return HttpResponse.json<ApiErrorBody>({ error: { code, message, ...extra } }, { status })
}

/**
 * Envolve um resolver com as condições de rede do cenário ativo:
 * latência (determinística), falhas pontuais configuradas e falha de conexão.
 */
export function withNetwork<P extends PathParams, B extends DefaultBodyType>(
  resolver: HttpResponseResolver<P, B>,
  opts: { latency?: () => number } = {},
): HttpResponseResolver<P, B> {
  return async (info) => {
    const url = new URL(info.request.url)
    const rule = consumeFailRule(info.request.method, url.pathname)
    const ms = opts.latency ? opts.latency() : nextLatency()
    if (ms > 0) await delay(ms)
    if (rule) {
      if (rule.status === 'network') return HttpResponse.error()
      return apiError(rule.status, rule.status >= 500 ? 'TRANSIENT_FAILURE' : 'VALIDATION_ERROR', 'Falha simulada pelo cenário de testes.')
    }
    return resolver(info)
  }
}

export type AuthResult = { ok: true; user: UserRecord; token: string } | { ok: false; response: Response }

export function authenticate(request: Request): AuthResult {
  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return { ok: false, response: apiError(401, 'UNAUTHENTICATED', 'Faça login para continuar.') }
  const store = db()
  const session = store.sessions[token]
  if (!session) return { ok: false, response: apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.') }
  if (session.expiresAt <= Date.now()) {
    delete store.sessions[token]
    persist()
    return { ok: false, response: apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.') }
  }
  const user = store.users[session.userId]
  if (!user) return { ok: false, response: apiError(401, 'SESSION_EXPIRED', 'Sessão inválida.') }
  return { ok: true, user, token }
}

/** Autenticação opcional: retorna usuário se houver token válido; erro apenas se token inválido/expirado. */
export function optionalAuth(request: Request): AuthResult | { ok: true; user: null; token: null } {
  if (!request.headers.get('authorization')) return { ok: true, user: null, token: null }
  return authenticate(request)
}

export async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    return (await request.json()) as Partial<T>
  } catch {
    return {}
  }
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const USERNAME_RE = /^[a-z0-9._-]{3,24}$/
export const WALLET_RE = /^0x[a-fA-F0-9]{40}$/

export function passwordProblems(pw: string): string | null {
  if (pw.length < 8) return 'A senha precisa de ao menos 8 caracteres.'
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Use letras e números na senha.'
  return null
}
