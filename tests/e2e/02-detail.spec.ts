import { test, expect, openApp } from '../helpers/app'

test.describe('Detalhe do NFT', () => {
  test('acesso direto, galeria, edições e limite de quantidade @mobile', async ({ page, isMobile }) => {
    await openApp(page, '/nft/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByTestId('edition-1/50')).toHaveAttribute('aria-checked', 'true')
    // Edição 1/10: máx. 3 por pedido
    await page.getByTestId('edition-1/10').click()
    await expect(page.getByTestId('edition-limit')).toContainText('máx. 3 por pedido')
    const inc = page.getByRole('button', { name: /^Aumentar quantidade/ }).filter({ visible: true }).first()
    await inc.click()
    await inc.click()
    await expect(inc).toBeDisabled()
    if (!isMobile) {
      await page.getByRole('button', { name: /Ver imagem 2/ }).first().click()
      await expect(page.getByRole('button', { name: /Ver imagem 2/ }).first()).toHaveAttribute('aria-current', 'true')
    }
  })

  test('edição esgotada fica indisponível', async ({ page }) => {
    await openApp(page, '/nft/sage-nomad-009')
    const soldOut = page.getByTestId('edition-1/1')
    await expect(soldOut).toHaveAttribute('aria-disabled', 'true')
    await expect(soldOut).toContainText('(esgotada)')
    await soldOut.click({ force: true })
    await expect(soldOut).toHaveAttribute('aria-checked', 'false')
  })

  test('NFT inexistente mostra 404 e rota inexistente mostra página não encontrada', async ({ page }) => {
    await openApp(page, '/nft/nao-existe-999')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await page.goto('/rota/que/nao/existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })
})
