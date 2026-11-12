import { useSyncExternalStore } from 'react'
import { readJsonStorage, writeStorage } from '@/lib/utils/storage'

/**
 * Armazena apenas o token opaco da sessão (nunca a senha) + id do usuário.
 * `epoch` incrementa a cada login/logout/expiração: respostas de requisições
 * iniciadas em outra época são descartadas (isolamento entre usuários).
 */
export interface StoredSession {
  token: string
  userId: string
  expiresAt: string
}

export type SessionEndReason = 'logout' | 'expired' | 'switch'

const KEY = 'kurio.session'

let current: StoredSession | null = readJsonStorage<StoredSession>(KEY)
let epoch = 0
let lastEnd: { reason: SessionEndReason; at: number } | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export const sessionStore = {
  get(): StoredSession | null {
    return current
  },
  getToken(): string | null {
    return current?.token ?? null
  },
  getEpoch(): number {
    return epoch
  },
  lastEnd() {
    return lastEnd
  },
  start(session: StoredSession) {
    const switching = current !== null && current.userId !== session.userId
    current = session
    epoch += 1
    lastEnd = switching ? { reason: 'switch', at: Date.now() } : null
    writeStorage(KEY, JSON.stringify(session))
    emit()
  },
  end(reason: SessionEndReason) {
    if (!current) return
    current = null
    epoch += 1
    lastEnd = { reason, at: Date.now() }
    writeStorage(KEY, null)
    emit()
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

// Sincroniza logout/login feitos em outra aba.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return
    const next = readJsonStorage<StoredSession>(KEY)
    if (next?.token === current?.token) return
    current = next
    epoch += 1
    lastEnd = next ? null : { reason: 'logout', at: Date.now() }
    emit()
  })
}

export function useStoredSession(): StoredSession | null {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.get, sessionStore.get)
}
