import { test, expect, openApp, login, mockApi, reachCheckout, authedApi } from '../helpers/app'

test.describe('Compra completa', () => {
  test('do catálogo ao recibo confirmado; carrinho perde só o comprado; recibo é snapshot @mobile', async ({ page, isMobile }) => {
    await openApp(page)
    // Catálogo -> detalhe
    await page.getByTestId('catalog-grid').getByRole('link', { name: 'Emerald Ape #042' }).click()
    await expect(page).toHaveURL(/\/nft\/emerald-ape-042/)
    await page.getByRole('button', { name: /^Aumentar quantidade/ }).filter({ visible: true }).first().click()
    await page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ }).filter({ visible: true }).click()
    await expect(page).toHaveURL(/\/cart$/)
    await expect(page.getByTestId('quote-total').filter({ visible: true })).toHaveText('2.396 ETH')

    // Checkout exige login e retorna ao fluxo
    await page.getByTestId('go-checkout').filter({ visible: true }).click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
    await login(page, 'ana')
    await expect(page).toHaveURL(/\/checkout$/)

    // Carteira: conectar
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByTestId('wallet-connection')).toContainText('Conectada')
    await page.getByTestId('confirm-purchase').click()
    const dialog = page.getByRole('dialog', { name: 'Revise sua compra' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByTestId('quote-total')).toHaveText('2.396 ETH')
    await dialog.getByTestId('confirm-order').click()

    await expect(page).toHaveURL(/\/orders\/ord_/)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('receipt-total')).toHaveText('2.396 ETH')
    await expect(page.getByTestId('receipt-lines')).toContainText('Emerald Ape #042')
    const orderUrl = page.url()

    // Snapshot: alteração posterior de preço não muda o recibo
    await mockApi(page, 'POST', '/__mock/nft-update', { nftId: 'emerald-ape-042', price: '9.99' })
    await page.reload()
    await expect(page.getByTestId('receipt-total')).toHaveText('2.396 ETH')
    expect(page.url()).toBe(orderUrl)

    // Carrinho esvaziado (somente o comprado)
    await page.goto('/cart')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
    if (!isMobile) await expect(page.getByTestId('cart-count')).toHaveCount(0)
  })

  test('confirmação remove apenas as quantidades compradas e preserva o restante', async ({ page }) => {
    await reachCheckout(page, { scenario: 'slow-payment', items: [{ id: 'ivory-baron-088', quantity: 2 }] })
    await page.getByTestId('confirm-purchase').click()
    await page.getByRole('dialog').getByTestId('confirm-order').click()
    await expect(page.getByRole('heading', { name: 'Aguardando confirmação na rede' })).toBeVisible()
    const orderId = page.url().split('/orders/')[1]!
    // Enquanto o pedido está pendente, o colecionador adiciona mais itens
    await authedApi(page, 'POST', '/api/cart/items', { nftId: 'ivory-baron-088', editionId: 'ivory-baron-088-1of50', quantity: 1 })
    await authedApi(page, 'POST', '/api/cart/items', { nftId: 'emerald-ape-042', editionId: 'emerald-ape-042-1of50', quantity: 1 })
    await mockApi(page, 'POST', `/__mock/orders/${orderId}/settle`)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('receipt-lines')).toContainText('(x 2)')
    await page.goto('/cart')
    const rows = page.getByTestId('cart-row')
    await expect(rows).toHaveCount(2)
    await expect(rows.filter({ hasText: 'Ivory Baron #088' }).getByRole('group')).toContainText('1')
    await expect(rows.filter({ hasText: 'Emerald Ape #042' })).toBeVisible()
  })
})
