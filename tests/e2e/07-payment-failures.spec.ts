import { test, expect, reachCheckout, authedApi } from '../helpers/app'
import type { Order } from '../../src/types/api'

test.describe('Falhas de pagamento e idempotência', () => {
  test('pagamento recusado preserva os itens no carrinho', async ({ page }) => {
    await reachCheckout(page, { scenario: 'payment-rejected' })
    await page.getByTestId('confirm-purchase').click()
    await page.getByRole('dialog').getByTestId('confirm-order').click()
    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Nenhum valor foi cobrado')).toBeVisible()
    await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
    await expect(page.getByTestId('cart-row')).toHaveCount(1)
  })

  test('cliques repetidos geram um único pedido', async ({ page }) => {
    await reachCheckout(page)
    await page.getByTestId('confirm-purchase').click()
    const btn = page.getByRole('dialog').getByTestId('confirm-order')
    await expect(btn).toBeEnabled()
    // 3 cliques síncronos no mesmo tick
    await btn.evaluate((el: HTMLButtonElement) => {
      el.click()
      el.click()
      el.click()
    })
    await expect(page).toHaveURL(/\/orders\/ord_/)
    const orders = await authedApi<Order[]>(page, 'GET', '/api/orders')
    expect(orders.body).toHaveLength(1)
  })

  test('timeout após criação do pedido recupera o MESMO pedido pela chave de idempotência', async ({ page }) => {
    test.setTimeout(60_000)
    await reachCheckout(page, { scenario: 'order-timeout' })
    const keys: string[] = []
    page.on('request', (r) => {
      if (r.url().endsWith('/api/orders') && r.method() === 'POST') keys.push(r.headers()['idempotency-key'] ?? '')
    })
    const replay = page.waitForResponse((r) => r.url().endsWith('/api/orders') && r.request().method() === 'POST' && r.status() === 200, { timeout: 20_000 })
    await page.getByTestId('confirm-purchase').click()
    await page.getByRole('dialog').getByTestId('confirm-order').click()
    await expect(page.getByText(/A resposta demorou\. Verificando seu pedido/)).toBeVisible({ timeout: 10_000 })
    const res = await replay
    expect(res.headers()['idempotent-replayed']).toBe('true')
    await expect(page).toHaveURL(/\/orders\/ord_/)
    expect(keys.length).toBeGreaterThanOrEqual(2)
    expect(new Set(keys).size).toBe(1)
    const orders = await authedApi<Order[]>(page, 'GET', '/api/orders')
    expect(orders.body).toHaveLength(1)
  })

  test('mesma chave com conteúdo diferente gera conflito (contrato)', async ({ page }) => {
    await reachCheckout(page)
    const quote = await authedApi<{ id: string; hash: string }>(page, 'POST', '/api/quotes', { network: 'ethereum' })
    const conn = await authedApi<{ id: string }>(page, 'POST', '/api/wallet-connections', { walletId: 'wal_ana_primary', provider: 'metamask', network: 'ethereum' })
    const base = { quoteId: quote.body.id, quoteHash: quote.body.hash, walletId: 'wal_ana_primary', connectionId: conn.body.id, network: 'ethereum', collector: { displayName: 'Ana', username: 'ana.kurio', profileName: 'ana', email: 'ana@kurio.dev', referralCode: 'KURIO', ensName: 'ana.eth' } }
    const first = await authedApi(page, 'POST', '/api/orders', base, { 'Idempotency-Key': 'test-key-123456' })
    expect(first.status).toBe(201)
    const again = await authedApi(page, 'POST', '/api/orders', base, { 'Idempotency-Key': 'test-key-123456' })
    expect(again.status).toBe(200)
    const conflict = await authedApi<{ error: { code: string } }>(page, 'POST', '/api/orders', { ...base, collector: { ...base.collector, displayName: 'Outro' } }, { 'Idempotency-Key': 'test-key-123456' })
    expect(conflict.status).toBe(409)
    expect(conflict.body.error.code).toBe('IDEMPOTENCY_CONFLICT')
  })

  test('carteira recusa conexão', async ({ page }) => {
    await reachCheckout(page).catch(() => undefined)
    await page.goto('/checkout?scenario=wallet-reject')
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByTestId('wallet-connection')).toContainText('recusada')
    await page.getByTestId('confirm-purchase').click()
    await expect(page.getByRole('dialog', { name: 'Revise sua compra' })).toHaveCount(0)
  })
})
