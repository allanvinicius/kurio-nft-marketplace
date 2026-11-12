import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { isApiError } from '@/lib/api/client'

/**
 * Aplica erros de validação retornados pela API (error.fields) aos campos do formulário.
 * Retorna true se algum campo recebeu erro (o foco vai para o primeiro).
 */
export function applyApiFieldErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, map: Record<string, Path<T>> = {}): boolean {
  if (!isApiError(error)) return false
  const entries = Object.entries(error.fields)
  entries.forEach(([field, message], i) => {
    const target = (map[field] ?? field) as Path<T>
    setError(target, { type: 'server', message }, { shouldFocus: i === 0 })
  })
  return entries.length > 0
}

export const WALLET_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
export const ENS_FULL_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/i
export const USERNAME_RE = /^[a-z0-9._-]{3,24}$/
export const ENS_LABEL_RE = /^[a-z0-9-]{1,32}$/

export function shortAddress(address: string) {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}
