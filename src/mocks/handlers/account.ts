import { http, HttpResponse } from 'msw'
import type { ChangePasswordRequest, Profile, UpdateAvatarRequest, UpdateProfileRequest, Wallet, WalletInput, WalletProvider, NetworkId } from '@/types/api'
import { db, hashPassword, nextId, nowIso, persist, randomToken } from '../persistence/db'
import type { UserRecord } from '../fixtures/users'
import { API, EMAIL_RE, USERNAME_RE, WALLET_RE, apiError, authenticate, passwordProblems, readJson, withNetwork } from './utils'

function toProfile(u: UserRecord): Profile {
  return {
    id: u.id,
    displayName: u.displayName,
    username: u.username,
    email: u.email,
    ensName: u.ensName,
    ensSuffix: u.ensSuffix,
    walletNickname: u.walletNickname,
    avatarUrl: u.avatarUrl,
    updatedAt: u.updatedAt,
  }
}

const ENS_RE = /^[a-z0-9-]{0,32}$/
const PROVIDERS: WalletProvider[] = ['metamask', 'walletconnect', 'coinbase']
const NETWORKS: NetworkId[] = ['ethereum', 'polygon', 'solana']

function validateWallet(body: Partial<WalletInput>): Record<string, string> {
  const f: Record<string, string> = {}
  if (!body.displayName?.trim()) f.displayName = 'Informe o nome de exibição.'
  if (!body.nickname?.trim()) f.nickname = 'Informe um apelido para a carteira.'
  if (!body.profileName?.trim()) f.profileName = 'Informe o nome do perfil.'
  if (!body.network || !NETWORKS.includes(body.network)) f.network = 'Selecione uma rede.'
  if (!body.address || !WALLET_RE.test(body.address)) f.address = 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais.'
  if (body.secondaryAddress && !WALLET_RE.test(body.secondaryAddress) && !/^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/i.test(body.secondaryAddress)) f.secondaryAddress = 'Use um endereço 0x válido ou um nome ENS (ex.: nome.eth).'
  if (!body.provider || !PROVIDERS.includes(body.provider)) f.provider = 'Selecione o tipo de carteira.'
  if (!body.referralCode?.trim()) f.referralCode = 'Informe o código de indicação.'
  if (!body.email || !EMAIL_RE.test(body.email)) f.email = 'Informe um e-mail válido.'
  if (!body.ensName || !ENS_RE.test(body.ensName)) f.ensName = 'Use letras minúsculas, números e hífen.'
  return f
}

export const accountHandlers = [
  http.get(
    `${API}/profile`,
    withNetwork(({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      return HttpResponse.json(toProfile(auth.user))
    }),
  ),

  http.patch(
    `${API}/profile`,
    withNetwork(async ({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const body = await readJson<UpdateProfileRequest>(request)
      const fields: Record<string, string> = {}
      const username = String(body.username ?? '').trim().toLowerCase()
      const email = String(body.email ?? '').trim().toLowerCase()
      if (!String(body.displayName ?? '').trim()) fields.displayName = 'Informe o nome de exibição.'
      if (!USERNAME_RE.test(username)) fields.username = 'Use 3 a 24 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.'
      if (!EMAIL_RE.test(email)) fields.email = 'Informe um e-mail válido.'
      if (!ENS_RE.test(String(body.ensName ?? '')) || !body.ensName) fields.ensName = 'Use letras minúsculas, números e hífen.'
      if (!String(body.walletNickname ?? '').trim()) fields.walletNickname = 'Informe um apelido.'
      const others = Object.values(db().users).filter((u) => u.id !== auth.user.id)
      if (!fields.username && others.some((u) => u.username === username)) fields.username = 'Este nome de usuário já está em uso.'
      if (!fields.email && others.some((u) => u.email === email)) fields.email = 'Este e-mail já está cadastrado.'
      if (Object.keys(fields).length) {
        const conflict = fields.username?.includes('em uso') || fields.email?.includes('cadastrado')
        return apiError(conflict ? 409 : 400, conflict ? (fields.email?.includes('cadastrado') ? 'EMAIL_TAKEN' : 'USERNAME_TAKEN') : 'VALIDATION_ERROR', 'Revise os campos destacados.', { fields })
      }
      Object.assign(auth.user, {
        displayName: String(body.displayName).trim(),
        username,
        email,
        ensName: String(body.ensName),
        ensSuffix: body.ensSuffix === '.kurio.eth' ? '.kurio.eth' : '.eth',
        walletNickname: String(body.walletNickname).trim(),
        updatedAt: nowIso(),
      })
      persist()
      return HttpResponse.json(toProfile(auth.user))
    }),
  ),

  http.put(
    `${API}/profile/avatar`,
    withNetwork(async ({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const body = await readJson<UpdateAvatarRequest>(request)
      const dataUrl = String(body.dataUrl ?? '')
      if (!/^data:image\/(png|jpeg|webp);base64,/.test(dataUrl)) return apiError(400, 'VALIDATION_ERROR', 'Formato de imagem não suportado. Use PNG, JPG ou WebP.', { fields: { avatar: 'Use PNG, JPG ou WebP.' } })
      if (dataUrl.length > 1_400_000) return apiError(400, 'VALIDATION_ERROR', 'A imagem deve ter até 1 MB.', { fields: { avatar: 'A imagem deve ter até 1 MB.' } })
      auth.user.avatarUrl = dataUrl
      auth.user.updatedAt = nowIso()
      persist()
      return HttpResponse.json(toProfile(auth.user))
    }),
  ),

  http.delete(
    `${API}/profile/avatar`,
    withNetwork(({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      auth.user.avatarUrl = null
      auth.user.updatedAt = nowIso()
      persist()
      return HttpResponse.json(toProfile(auth.user))
    }),
  ),

  http.post(
    `${API}/profile/password`,
    withNetwork(async ({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const body = await readJson<ChangePasswordRequest>(request)
      const current = String(body.currentPassword ?? '')
      const next = String(body.newPassword ?? '')
      if ((await hashPassword(auth.user.salt, current)) !== auth.user.passwordHash) {
        return apiError(400, 'INVALID_CURRENT_PASSWORD', 'A senha atual está incorreta.', { fields: { currentPassword: 'A senha atual está incorreta.' } })
      }
      const problem = passwordProblems(next)
      if (problem) return apiError(400, 'VALIDATION_ERROR', problem, { fields: { newPassword: problem } })
      if (next === current) return apiError(400, 'VALIDATION_ERROR', 'A nova senha deve ser diferente da atual.', { fields: { newPassword: 'A nova senha deve ser diferente da atual.' } })
      auth.user.salt = randomToken(8)
      auth.user.passwordHash = await hashPassword(auth.user.salt, next)
      auth.user.updatedAt = nowIso()
      persist()
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  // ------------------------------------------------------------------ Carteiras
  http.get(
    `${API}/wallets`,
    withNetwork(({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      return HttpResponse.json<Wallet[]>(db().wallets[auth.user.id] ?? [])
    }),
  ),

  http.post(
    `${API}/wallets`,
    withNetwork(async ({ request }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const body = await readJson<WalletInput>(request)
      const role = body.role === 'secondary' ? 'secondary' : 'primary'
      const list = (db().wallets[auth.user.id] ??= [])
      if (list.some((w) => w.role === role)) return apiError(409, 'WALLET_ROLE_EXISTS', role === 'primary' ? 'Você já possui uma carteira principal.' : 'Você já possui uma carteira secundária.')
      if (role === 'secondary' && !list.some((w) => w.role === 'primary')) return apiError(400, 'VALIDATION_ERROR', 'Cadastre a carteira principal antes da secundária.')
      const fields = validateWallet(body)
      if (Object.keys(fields).length) return apiError(400, 'VALIDATION_ERROR', 'Revise os campos da carteira.', { fields })
      const wallet: Wallet = {
        id: nextId('wal'),
        role,
        displayName: body.displayName!.trim(),
        nickname: body.nickname!.trim(),
        profileName: body.profileName!.trim(),
        network: body.network!,
        address: body.address!,
        secondaryAddress: body.secondaryAddress?.trim() || null,
        provider: body.provider!,
        referralCode: body.referralCode!.trim(),
        email: body.email!.trim().toLowerCase(),
        ensName: body.ensName!,
        ensSuffix: body.ensSuffix === '.kurio.eth' ? '.kurio.eth' : '.eth',
        updatedAt: nowIso(),
      }
      list.push(wallet)
      persist()
      return HttpResponse.json(wallet, { status: 201 })
    }),
  ),

  http.patch(
    `${API}/wallets/:id`,
    withNetwork(async ({ request, params }) => {
      const auth = authenticate(request)
      if (!auth.ok) return auth.response
      const list = db().wallets[auth.user.id] ?? []
      const wallet = list.find((w) => w.id === params.id)
      if (!wallet) {
        const owned = Object.values(db().wallets).some((l) => l.some((w) => w.id === params.id))
        return owned ? apiError(403, 'FORBIDDEN', 'Esta carteira pertence a outra conta.') : apiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
      }
      const body = await readJson<WalletInput>(request)
      const merged = { ...wallet, ...body, role: wallet.role }
      const fields = validateWallet(merged)
      if (Object.keys(fields).length) return apiError(400, 'VALIDATION_ERROR', 'Revise os campos da carteira.', { fields })
      Object.assign(wallet, {
        displayName: merged.displayName.trim(),
        nickname: merged.nickname.trim(),
        profileName: merged.profileName.trim(),
        network: merged.network,
        address: merged.address,
        secondaryAddress: merged.secondaryAddress?.trim() || null,
        provider: merged.provider,
        referralCode: merged.referralCode.trim(),
        email: merged.email.trim().toLowerCase(),
        ensName: merged.ensName,
        ensSuffix: merged.ensSuffix === '.kurio.eth' ? '.kurio.eth' : '.eth',
        updatedAt: nowIso(),
      })
      persist()
      return HttpResponse.json(wallet)
    }),
  ),
]
