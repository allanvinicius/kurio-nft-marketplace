import '@fontsource-variable/roboto-mono/wght.css'
import './app/styles/globals.css'

/**
 * Ordem de boot:
 *  1. backend simulado (MSW: REST via Service Worker + WebSocket interceptado na página);
 *  2. aplicação (React, Router, Query, socket.io-client).
 *
 * A aplicação é importada DEPOIS do MSW porque o engine.io-client captura
 * `globalThis.WebSocket` no momento em que o módulo é avaliado; importá-lo antes
 * faria o Socket.IO usar o WebSocket nativo (não interceptado).
 */
async function enableMocks() {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'false') return
  const { startMockBackend } = await import('./mocks/browser')
  await startMockBackend()
}

async function bootstrap() {
  await enableMocks()
  const { mountApp } = await import('./app/mount')
  mountApp(document.getElementById('root')!)
}

void bootstrap().catch((error: unknown) => {
  console.error('Falha ao iniciar a KURIO', error)
  document.getElementById('app-loading')?.remove()
  document.getElementById('app-load-error')?.removeAttribute('hidden')
})
