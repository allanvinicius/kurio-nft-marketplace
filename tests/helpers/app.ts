import { test as base, expect, type Page } from '@playwright/test'

/**
 * Helpers dos testes. Toda interação com o "servidor" passa pela rede da página
 * (fetch -> Service Worker do MSW -> handlers), nunca por atalhos no estado da UI.
 */
export const USERS = {
  ana: { email: 'ana@kurio.dev', password: 'Kurio@2026', name: 'Ana Colecionadora' },
  bruno: { email: 'bruno@kurio.dev', password: 'Kurio@2026', name: 'Bruno Nakamoto' },
} as const

export async function mockApi<T = unknown>(page: Page, method: string, path: string, body?: unknown): Promise<T> {
  return page.evaluate(
    async ({ method, path, body }) => {
      const res = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
      const text = await res.text()
      return text ? JSON.parse(text) : null
    },
    { method, path, body },
  ) as Promise<T>
}

/** Chamada autenticada com o token da sessão atual (lido do storage da página). */
export async function authedApi<T = unknown>(page: Page, method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<{ status: number; body: T; headers: Record<string, string> }> {
  return page.evaluate(
    async ({ method, path, body, headers }) => {
      const session = JSON.parse(localStorage.getItem('kurio.session') ?? 'null') as { token: string } | null
      const res = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.token}` } : {}), ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const text = await res.text()
      return { status: res.status, body: text ? JSON.parse(text) : null, headers: Object.fromEntries(res.headers.entries()) }
    },
    { method, path, body, headers },
  ) as Promise<{ status: number; body: T; headers: Record<string, string> }>
}

export async function realtimeStats(page: Page) {
  return page.evaluate(() => ({ ...(window as unknown as { __kurioRealtime: { stats: { received: number; applied: number; ignoredDuplicate: number; ignoredStale: number; ignoredForeign: number } } }).__kurioRealtime.stats }))
}

/** Faz login, coloca itens no carrinho e chega ao checkout com a carteira conectada. */
export async function reachCheckout(page: Page, opts: { user?: keyof typeof USERS; scenario?: string; items?: Array<{ id: string; quantity?: number }> } = {}) {
  await openApp(page, '/login', opts.scenario ?? 'fast')
  await login(page, opts.user ?? 'ana')
  for (const it of opts.items ?? [{ id: 'emerald-ape-042' }]) await addToCart(page, it.id, { quantity: it.quantity })
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByTestId('wallet-connection')).toContainText('Conectada')
}

export async function setScenario(page: Page, id: string) {
  await mockApi(page, 'PUT', '/__mock/scenario', { id })
}

/** Abre a aplicação com o cenário escolhido (persistido pelo MSW para os próximos carregamentos). */
export async function openApp(page: Page, path = '/', scenario = 'fast') {
  const sep = path.includes('?') ? '&' : '?'
  await page.goto(`${path}${sep}scenario=${scenario}`)
  await expect(page.locator('html[data-realtime="connected"]')).toHaveCount(1, { timeout: 15_000 })
}

export async function login(page: Page, user: keyof typeof USERS = 'ana', from = '/login') {
  const u = USERS[user]
  if (!page.url().includes('/login')) await page.goto(from)
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('contato@email.com').fill(u.email)
  await dialog.getByPlaceholder('Senha', { exact: true }).fill(u.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

export async function addToCart(page: Page, nftId: string, opts: { edition?: string; quantity?: number; goToCart?: boolean } = {}) {
  await page.goto(`/nft/${nftId}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  if (opts.edition) await page.getByTestId(`edition-${opts.edition}`).first().click()
  const inc = page.getByRole('button', { name: /^Aumentar quantidade/ }).filter({ visible: true }).first()
  for (let i = 1; i < (opts.quantity ?? 1); i++) await inc.click()
  await page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ }).filter({ visible: true }).click()
  await expect(page).toHaveURL(/\/cart$/)
}

export const test = base.extend<{ isMobile: boolean }>({
  isMobile: async ({ viewport }, use) => {
    await use((viewport?.width ?? 1440) < 768)
  },
})

export { expect }
