import { readStorage, uuid, writeStorage } from '@/lib/utils/storage'

/**
 * Identificador do carrinho do visitante. O carrinho em si vive no servidor (MSW);
 * o cliente guarda apenas o id para sobreviver a refresh e permitir o merge no login.
 */
const KEY = 'kurio.guestCartId'

export function getGuestCartId(): string {
  let id = readStorage(KEY)
  if (!id) {
    id = `gcart_${uuid()}`
    writeStorage(KEY, id)
  }
  return id
}

export function peekGuestCartId(): string | null {
  return readStorage(KEY)
}

export function rotateGuestCartId(): string {
  const id = `gcart_${uuid()}`
  writeStorage(KEY, id)
  return id
}
