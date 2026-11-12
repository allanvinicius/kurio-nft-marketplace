import { test, expect, openApp, reachCheckout, mockApi } from '../helpers/app'

test.describe('Tempo real (Socket.IO) durante o checkout', () => {
  test('preço alterado: aviso, resumo atualizado e cotação desatualizada bloqueada @mobile', async ({ page, isMobile }) => {
    await reachCheckout(page, { connect: !isMobile })
    await page.getByTestId('confirm-purchase').click()
    const dialog = page.getByRole('dialog', { name: 'Revise sua compra' })
    await expect(dialog.getByTestId('quote-total')).toHaveText('1.206 ETH')

    // O "servidor" altera o preço -> evento nft.updated chega pelo socket.io-client
    await mockApi(page, 'POST', '/__mock/nft-update', { nftId: 'emerald-ape-042', editionId: 'emerald-ape-042-1of50', price: '1.29' })
    await expect(page.getByText('Preço atualizado: Emerald Ape #042')).toBeVisible()
    await expect(dialog.getByText(/A cotação mudou em tempo real/)).toBeVisible()
    await expect(dialog.getByTestId('confirm-order')).toBeDisabled()

    await dialog.getByRole('button', { name: 'Revisar nova cotação' }).click()
    await expect(dialog.getByTestId('quote-total')).toHaveText('1.306 ETH')
    await expect(dialog.getByTestId('confirm-order')).toBeEnabled()
    await dialog.getByTestId('confirm-order').click()
    await expect(page.getByTestId('receipt-total')).toHaveText('1.306 ETH', { timeout: 10_000 })
    if (isMobile) await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
  })

  test('alteração de preço no envio (QUOTE_STALE) exige nova confirmação', async ({ page }) => {
    await reachCheckout(page, { scenario: 'checkout-price-change' })
    await page.getByTestId('confirm-purchase').click()
    const dialog = page.getByRole('dialog', { name: 'Revise sua compra' })
    await dialog.getByTestId('confirm-order').click()
    await expect(dialog.getByText(/Os valores mudaram enquanto você confirmava/)).toBeVisible()
    await expect(dialog.getByTestId('quote-total')).toHaveText('1.306 ETH')
    await expect(page).toHaveURL(/\/checkout$/)
    await dialog.getByTestId('confirm-order').click()
    await expect(page.getByTestId('receipt-total')).toHaveText('1.306 ETH', { timeout: 10_000 })
  })

  test('edição esgotada durante a compra impede a confirmação', async ({ page }) => {
    await reachCheckout(page, { scenario: 'checkout-sold-out' })
    await page.getByTestId('confirm-purchase').click()
    await page.getByRole('dialog').getByTestId('confirm-order').click()
    await expect(page.getByText('Disponibilidade alterada').first()).toBeVisible()
    await expect(page.getByTestId('confirm-purchase')).toBeDisabled()
    await expect(page.getByTestId('quote-issues').filter({ visible: true }).first()).toContainText('esgotou')
  })

  test('catálogo, detalhe e carrinho refletem nft.updated sem recarregar', async ({ page }) => {
    await openApp(page, '/nft/emerald-ape-042')
    await page.getByRole('button', { name: 'COMPRAR' }).click()
    await expect(page.getByTestId('quote-total')).toHaveText('1.206 ETH')
    await mockApi(page, 'POST', '/__mock/nft-update', { nftId: 'emerald-ape-042', editionId: 'emerald-ape-042-1of50', price: '1.50' })
    await expect(page.getByTestId('quote-total')).toHaveText('1.516 ETH')
    await expect(page.getByTestId('price-changed').filter({ visible: true })).toBeVisible()
    await page.getByRole('link', { name: 'Emerald Ape #042' }).first().click()
    await expect(page.getByTestId('detail-price')).toContainText('1.50 ETH')
    await page.goto('/')
    await expect(page.getByTestId('catalog-grid').getByTestId('nft-card').first()).toContainText('1.50 ETH')
    await mockApi(page, 'POST', '/__mock/nft-update', { nftId: 'emerald-ape-042', editionId: 'emerald-ape-042-1of50', price: '1.60' })
    await expect(page.getByTestId('catalog-grid').getByTestId('nft-card').first()).toContainText('1.60 ETH')
  })
})
