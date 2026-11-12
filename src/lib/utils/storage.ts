/** Acesso defensivo ao storage (modo privado, bloqueio de cookies, SSR). */
export function readStorage(key: string, kind: 'local' | 'session' = 'local'): string | null {
  try {
    return (kind === 'local' ? localStorage : sessionStorage).getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string | null, kind: 'local' | 'session' = 'local') {
  try {
    const s = kind === 'local' ? localStorage : sessionStorage
    if (value === null) s.removeItem(key)
    else s.setItem(key, value)
  } catch {
    /* ignore */
  }
}

export function readJsonStorage<T>(key: string, kind: 'local' | 'session' = 'local'): T | null {
  const raw = readStorage(key, kind)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}
