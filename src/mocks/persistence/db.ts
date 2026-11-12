import type { Cart, NftDetail, Order, Quote, Wallet, WalletConnection, NftUpdatedEvent, OrderUpdatedEvent } from '@/types/api'
import { buildNftFixtures } from '../fixtures/nfts'
import { buildUserFixtures, buildWalletFixtures, type UserRecord } from '../fixtures/users'

/**
 * "Banco" do backend simulado. Vive no contexto da página (handlers MSW executam no cliente)
 * e é persistido em localStorage para sobreviver a refresh. `resetDb()` restaura o seed.
 */

export interface CartItemRecord {
  id: string
  nftId: string
  editionId: string
  quantity: number
  addedUnitPrice: string
}

export interface CartRecord {
  id: string
  ownerType: Cart['ownerType']
  userId: string | null
  items: CartItemRecord[]
  couponCode: string | null
  version: number
  updatedAt: string
}

export interface OrderRecord extends Order {
  fingerprint: string
  settleAt: number
  cartId: string
}

export interface DbState {
  schemaVersion: 4
  seq: number
  nfts: Record<string, NftDetail>
  users: Record<string, UserRecord>
  sessions: Record<string, { userId: string; expiresAt: number }>
  favorites: Record<string, string[]>
  carts: Record<string, CartRecord>
  userCarts: Record<string, string>
  quotes: Record<string, Quote>
  orders: Record<string, OrderRecord>
  idempotency: Record<string, { fingerprint: string; orderId: string }>
  wallets: Record<string, Wallet[]>
  connections: Record<string, WalletConnection & { userId: string }>
  events: Array<NftUpdatedEvent | OrderUpdatedEvent>
}

const STORAGE_KEY = 'kurio.mock.db'

function seed(): DbState {
  const nfts = Object.fromEntries(buildNftFixtures().map((n) => [n.id, n]))
  const users = Object.fromEntries(buildUserFixtures().map((u) => [u.id, u]))
  return {
    schemaVersion: 4,
    seq: 1000,
    nfts,
    users,
    sessions: {},
    favorites: { usr_ana: ['ivory-baron-088'], usr_bruno: [] },
    carts: {},
    userCarts: {},
    quotes: {},
    orders: {},
    idempotency: {},
    wallets: buildWalletFixtures(),
    connections: {},
    events: [],
  }
}

let state: DbState = seed()

export function loadDb(): DbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DbState
      if (parsed.schemaVersion === 4) {
        state = parsed
        return state
      }
    }
  } catch {
    /* estado corrompido: volta ao seed */
  }
  state = seed()
  persist()
  return state
}

export function db(): DbState {
  return state
}

export function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* quota/indisponível: segue em memória */
  }
}

export function resetDb() {
  state = seed()
  persist()
}

export function nextId(prefix: string): string {
  state.seq += 1
  return `${prefix}_${state.seq.toString(36)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** Hash FNV-1a 32 bits em hex (determinístico, suficiente para a simulação). */
export function fnv(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export async function hashPassword(salt: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function randomToken(bytes = 24): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
