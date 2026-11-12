import { test, expect, openApp, setScenario, mockApi } from '../helpers/app'

test.describe('Catálogo: busca, filtros, ordenação, paginação e histórico', () => {
  test('filtros combinados, ordenação e paginação refletem na URL e na API; histórico restaura @mobile', async ({ page, isMobile }) => {
    const apiCalls: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('/api/nfts?')) apiCalls.push(r.url())
    })
    await openApp(page)
    const grid = page.getByTestId('catalog-grid')
    await expect(grid.getByTestId('nft-card')).toHaveCount(9)
    await expect(grid.getByTestId('nft-card').first()).toContainText('Emerald Ape #042')

    // Página 2
    await page.getByRole('link', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByRole('link', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')

    // Filtro de coleção reinicia a paginação
    if (isMobile) await page.getByRole('button', { name: 'Abrir filtros' }).click()
    const filters = isMobile ? page.getByRole('dialog') : page.getByRole('complementary', { name: 'Filtros do catálogo' })
    await filters.getByRole('button', { name: /^Música/ }).click()
    await expect(page).toHaveURL(/category=musica/)
    await expect(page).not.toHaveURL(/page=/)
    // Combinado com rede
    await filters.getByRole('checkbox', { name: /Polygon/ }).click()
    await expect(page).toHaveURL(/network=polygon/)

    // Ordenação por menor preço (no mobile fica na gaveta de filtros)
    await page.getByRole('combobox', { name: 'Ordenar por' }).filter({ visible: true }).click()
    await page.getByRole('option', { name: 'Menor preço' }).click()
    if (isMobile) await page.getByRole('button', { name: /^Ver .* resultados$/ }).click()
    await expect(page).toHaveURL(/sort=price-asc/)
    const names = await grid.getByTestId('nft-card').locator('h3').allTextContents()
    expect(names).toEqual(['Sunset Groove #349', 'Amber Rhythm #302', 'Golden Beat #207'])
    const last = apiCalls.at(-1)!
    expect(last).toContain('category=musica')
    expect(last).toContain('network=polygon')
    expect(last).toContain('sort=price-asc')

    // Histórico: voltar desfaz a ordenação; avançar restaura
    await page.goBack()
    await expect(page).not.toHaveURL(/sort=/)
    await expect(page).toHaveURL(/network=polygon/)
    await page.goForward()
    await expect(page).toHaveURL(/sort=price-asc/)
    await expect(grid.getByTestId('nft-card').first()).toContainText('Sunset Groove #349')

    // Refresh mantém o estado
    await page.reload()
    await expect(page.getByTestId('catalog-grid').getByTestId('nft-card')).toHaveCount(3)
    await expect(page).toHaveURL(/category=musica.*network=polygon|network=polygon.*category=musica/)
  })

  test('busca textual e resultado vazio com limpeza de filtros', async ({ page }) => {
    await openApp(page)
    await page.goto('/?q=ivory%20baron')
    const cards = page.getByTestId('catalog-grid').getByTestId('nft-card')
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText('Ivory Baron #088')
    await page.goto('/?q=inexistente-xyz')
    await expect(page.getByRole('status').filter({ hasText: 'Nenhum NFT encontrado' })).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros' }).first().click()
    await expect(page).toHaveURL(/\/$|\/#catalogo$|\/\?$/)
    await expect(page.getByTestId('catalog-grid').getByTestId('nft-card')).toHaveCount(9)
  })

  test('respostas fora de ordem não sobrescrevem a consulta atual', async ({ page }) => {
    await openApp(page, '/', 'out-of-order')
    // 1ª consulta (lenta, 1.6 s) já foi feita no carregamento; dispara 2 mudanças rápidas
    await page.getByRole('button', { name: 'Em alta' }).click() // lenta (ímpar)
    await page.getByRole('button', { name: 'Novos lançamentos' }).click() // rápida (par)
    await expect(page).toHaveURL(/tab=new/)
    await page.waitForTimeout(2000) // deixa a resposta antiga chegar depois
    const names = await page.getByTestId('catalog-grid').getByTestId('nft-card').locator('h3').allTextContents()
    expect(names).toContain('Emerald Ape #042')
    expect(names).not.toContain('Forest Regent #003') // "Em alta" incluiria
    await expect(page.getByRole('button', { name: 'Novos lançamentos' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('catálogo vazio no cenário empty-catalog', async ({ page }) => {
    await openApp(page, '/', 'empty-catalog')
    await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible()
    await setScenario(page, 'fast')
  })

  test('controle: API rejeita parâmetros inválidos com 400 (contrato)', async ({ page }) => {
    await openApp(page)
    const res = await mockApi<{ error: { code: string } }>(page, 'GET', '/api/nfts?sort=bogus')
    expect(res.error.code).toBe('VALIDATION_ERROR')
  })
})
