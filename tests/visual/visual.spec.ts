import { test, expect, type Page } from '@playwright/test'

/**
 * Regressão visual com dados estáveis (fixtures determinísticas + cenário `fast`).
 * Baselines versionadas em tests/visual/__screenshots__.
 * Sessão e carrinho são preparados pela API simulada (MSW) para evitar toasts transitórios.
 */
async function prepare(page: Page, withCart: boolean) {
  await page.goto('/?scenario=fast')
  await expect(page.locator('html[data-realtime="connected"]')).toHaveCount(1, { timeout: 15_000 })
  if (!withCart) return
  await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'ana@kurio.dev', password: 'Kurio@2026' }) })
    const s = await res.json()
    localStorage.setItem('kurio.session', JSON.stringify({ token: s.token, userId: s.user.id, expiresAt: s.expiresAt }))
    for (const [nftId, quantity] of [['emerald-ape-042', 2], ['violet-nomad-314', 6], ['ivory-baron-088', 9]] as const) {
      await fetch('/api/cart/items', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.token}` }, body: JSON.stringify({ nftId, editionId: `${nftId}-1of50`, quantity }) })
    }
  })
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  // Aguarda imagens visíveis na viewport (lazy fora da tela não carregam), com teto de 5 s.
  await page.evaluate(() =>
    Promise.race([
      Promise.all(
        [...document.images]
          .filter((i) => !i.complete && i.getBoundingClientRect().top < window.innerHeight)
          .map((i) => new Promise((r) => { i.onload = i.onerror = r })),
      ),
      new Promise((r) => setTimeout(r, 5000)),
    ]),
  )
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
}

const screens = [
  { name: 'inicio', path: '/', cart: false, ready: (p: Page) => expect(p.getByTestId('catalog-grid').getByTestId('nft-card')).toHaveCount(9) },
  { name: 'detalhe', path: '/nft/emerald-ape-042', cart: false, ready: (p: Page) => expect(p.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible() },
  { name: 'carrinho', path: '/cart', cart: true, ready: (p: Page) => expect(p.getByTestId('quote-total').filter({ visible: true })).toHaveText('26.846 ETH') },
  { name: 'pagamento', path: '/checkout', cart: true, ready: (p: Page) => expect(p.getByText('26.846 ETH').filter({ visible: true }).first()).toBeVisible() },
]

test.describe('desktop 1440', () => {
  test.use({ viewport: { width: 1440, height: 1600 } })
  for (const s of screens) {
    test(`${s.name} @visual`, async ({ page }) => {
      await prepare(page, s.cart)
      await page.goto(s.path)
      await s.ready(page)
      await settle(page)
      await expect(page).toHaveScreenshot(`${s.name}-desktop.png`)
    })
  }
})

test.describe('mobile 414', () => {
  test.use({ viewport: { width: 414, height: 896 }, isMobile: true, hasTouch: true })
  for (const s of screens) {
    test(`${s.name} @visual`, async ({ page }) => {
      await prepare(page, s.cart)
      await page.goto(s.path)
      await s.ready(page)
      await settle(page)
      await expect(page).toHaveScreenshot(`${s.name}-mobile.png`)
    })
  }
})
