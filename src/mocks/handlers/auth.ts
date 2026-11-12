import { http, HttpResponse } from 'msw'
import type { CurrentSessionResponse, LoginRequest, RegisterRequest, SessionResponse, User } from '@/types/api'
import { db, hashPassword, nextId, nowIso, persist, randomToken } from '../persistence/db'
import type { UserRecord } from '../fixtures/users'
import { getScenario } from '../scenarios'
import { dropUserConnections } from '../socket/server'
import { API, EMAIL_RE, USERNAME_RE, apiError, authenticate, passwordProblems, readJson, withNetwork } from './utils'

export function toUser(u: UserRecord): User {
  return { id: u.id, username: u.username, email: u.email, displayName: u.displayName, avatarUrl: u.avatarUrl }
}

function openSession(user: UserRecord): SessionResponse {
  const token = randomToken()
  const expiresAt = Date.now() + getScenario().sessionTtlMs
  db().sessions[token] = { userId: user.id, expiresAt }
  persist()
  return { user: toUser(user), token, expiresAt: new Date(expiresAt).toISOString() }
}

export const authHandlers = [
  http.post(
    `${API}/auth/register`,
    withNetwork(async ({ request }) => {
      const body = await readJson<RegisterRequest>(request)
      const username = String(body.username ?? '').trim().toLowerCase()
      const email = String(body.email ?? '').trim().toLowerCase()
      const password = String(body.password ?? '')
      const fields: Record<string, string> = {}
      if (!USERNAME_RE.test(username)) fields.username = 'Use 3 a 24 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.'
      if (!EMAIL_RE.test(email)) fields.email = 'Informe um e-mail válido.'
      const pwProblem = passwordProblems(password)
      if (pwProblem) fields.password = pwProblem
      if (Object.keys(fields).length) return apiError(400, 'VALIDATION_ERROR', 'Revise os campos destacados.', { fields })
      const users = Object.values(db().users)
      if (users.some((u) => u.email === email)) return apiError(409, 'EMAIL_TAKEN', 'Já existe uma conta com este e-mail.', { fields: { email: 'Este e-mail já está cadastrado.' } })
      if (users.some((u) => u.username === username)) return apiError(409, 'USERNAME_TAKEN', 'Nome de usuário indisponível.', { fields: { username: 'Este nome de usuário já está em uso.' } })
      const salt = randomToken(8)
      const user: UserRecord = {
        id: nextId('usr'),
        username,
        email,
        displayName: username,
        avatarUrl: null,
        ensName: '',
        ensSuffix: '.eth',
        walletNickname: '',
        salt,
        passwordHash: await hashPassword(salt, password),
        updatedAt: nowIso(),
      }
      db().users[user.id] = user
      db().favorites[user.id] = []
      db().wallets[user.id] = []
      persist()
      return HttpResponse.json(openSession(user), { status: 201 })
    }),
  ),

  http.post(
    `${API}/auth/login`,
    withNetwork(async ({ request }) => {
      const body = await readJson<LoginRequest>(request)
      const email = String(body.email ?? '').trim().toLowerCase()
      const password = String(body.password ?? '')
      const fields: Record<string, string> = {}
      if (!EMAIL_RE.test(email)) fields.email = 'Informe um e-mail válido.'
      if (!password) fields.password = 'Informe sua senha.'
      if (Object.keys(fields).length) return apiError(400, 'VALIDATION_ERROR', 'Revise os campos destacados.', { fields })
      const user = Object.values(db().users).find((u) => u.email === email)
      if (!user || (await hashPassword(user.salt, password)) !== user.passwordHash) {
        return apiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
      }
      return HttpResponse.json(openSession(user))
    }),
  ),

  http.get(
    `${API}/auth/session`,
    withNetwork(({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const session = db().sessions[auth.token]!
      return HttpResponse.json<CurrentSessionResponse>({ user: toUser(auth.user), expiresAt: new Date(session.expiresAt).toISOString() })
    }),
  ),

  http.post(
    `${API}/auth/logout`,
    withNetwork(({ request }) => {
      const auth = authenticate(request)
      if (auth.ok) {
        delete db().sessions[auth.token]
        dropUserConnections(auth.user.id)
        persist()
      }
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
