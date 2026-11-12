import { setupWorker } from 'msw/browser'
import { authHandlers } from './handlers/auth'
import { catalogHandlers } from './handlers/catalog'
import { cartHandlers } from './handlers/cart'
import { orderHandlers } from './handlers/orders'
import { accountHandlers } from './handlers/account'
import { controlHandlers } from './handlers/control'
import { socketHandler } from './socket/server'
import { loadDb } from './persistence/db'
import { initScenario } from './scenarios'
import { rescheduleAllPending } from './domain'

export const handlers = [...controlHandlers, ...authHandlers, ...catalogHandlers, ...cartHandlers, ...orderHandlers, ...accountHandlers, socketHandler]

/**
 * Inicia o backend simulado. Deve completar ANTES de qualquer chamada Axios
 * ou criação do socket (o MSW precisa interceptar o construtor WebSocket).
 */
export async function startMockBackend() {
  initScenario()
  loadDb()
  rescheduleAllPending()
  const worker = setupWorker(...handlers)
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: import.meta.env.PROD,
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
  return worker
}
