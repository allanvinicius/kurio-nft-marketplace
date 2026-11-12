import { test, expect, openApp, setScenario } from '../helpers/app'

test.describe('Carregamento lento, falhas e recuperação', () => {
  test('skeletons durante carregamento lento @mobile', async ({ page }) => {
    await page.goto('/?scenario=slow')
    await expect(page.getByRole('list', { name: 'Carregando NFTs' })).toBeVisible()
    await expect(page.locator('.skeleton').filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByTestId('catalog-grid').getByTestId('nft-card')).toHaveCount(9, { timeout: 15_000 })
    await setScenario(page, 'fast')
  })

  test('erro 5xx mostra feedback e "Tentar novamente" recupera', async ({ page }) => {
    await openApp(page, '/', 'catalog-error')
    await expect(page.getByRole('alert').filter({ hasText: 'temporariamente indisponível' })).toBeVisible({ timeout: 15_000 })
    await setScenario(page, 'fast')
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByTestId('catalog-grid').getByTestId('nft-card')).toHaveCount(9)
  })

  test('falha de conexão mostra mensagem de rede', async ({ page }) => {
    await page.goto('/?scenario=offline')
    await expect(page.getByText('Sem conexão com o servidor', { exact: false })).toBeVisible({ timeout: 15_000 })
    await setScenario(page, 'fast')
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByTestId('catalog-grid').getByTestId('nft-card')).toHaveCount(9)
  })

  test('skeleton do detalhe e do resumo do carrinho', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042?scenario=slow')
    await expect(page.getByLabel('Carregando NFT')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'COMPRAR' }).click()
    await expect(page.getByLabel('Calculando resumo').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('quote-total').first()).toBeVisible({ timeout: 15_000 })
    await setScenario(page, 'fast')
  })
})
