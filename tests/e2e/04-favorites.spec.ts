import { test, expect, openApp, login, mockApi } from '../helpers/app'

test.describe('Favoritos (otimista + rollback)', () => {
  test('favoritar persiste para o usuário autenticado', async ({ page }) => {
    await openApp(page, '/login?redirect=%2Fnft%2Femerald-ape-042')
    await login(page, 'ana')
    const fav = page.getByRole('button', { name: /^Favoritar$/ })
    await fav.click()
    await expect(page.getByRole('button', { name: 'Favoritado' })).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(page.getByRole('button', { name: 'Favoritado' })).toHaveAttribute('aria-pressed', 'true')
    await page.goto('/favorites')
    await expect(page.getByTestId('favorites-grid')).toContainText('Emerald Ape #042')
  })

  test('falha na mutation faz rollback e o estado se recupera em nova tentativa', async ({ page }) => {
    await openApp(page, '/login?redirect=%2Fnft%2Fgolden-beat-207')
    await login(page, 'ana')
    await mockApi(page, 'POST', '/__mock/fail-next', { route: 'PUT /api/favorites/:id', status: 500, times: 1 })
    await page.getByRole('button', { name: /^Favoritar$/ }).click()
    await expect(page.getByText('Não foi possível favoritar Golden Beat #207')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Favoritar$/ })).toHaveAttribute('aria-pressed', 'false')
    // Nova tentativa funciona
    await page.getByRole('button', { name: /^Favoritar$/ }).click()
    await expect(page.getByRole('button', { name: 'Favoritado' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Favoritado' })).toBeVisible()
  })

  test('visitante é levado ao login ao favoritar', async ({ page }) => {
    await openApp(page, '/nft/emerald-ape-042')
    await page.getByRole('button', { name: /^Favoritar$/ }).click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fnft%2Femerald-ape-042/)
  })
})
