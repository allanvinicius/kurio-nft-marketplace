import { test, expect, openApp } from '../helpers/app'

test.describe('Acessibilidade: teclado, foco e formulários', () => {
  test('link "Pular para o conteúdo" e foco visível', async ({ page }) => {
    await openApp(page)
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#conteudo$/)
  })

  test('diálogo de busca prende e restaura o foco', async ({ page }) => {
    await openApp(page)
    const trigger = page.getByRole('button', { name: 'Buscar NFTs' }).first()
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Buscar NFTs' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel('Termo de busca')).toBeFocused()
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
    // Busca por teclado
    await page.keyboard.press('Enter')
    await page.keyboard.type('golden')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/q=golden/)
  })

  test('filtros e paginação operáveis por teclado', async ({ page }) => {
    await openApp(page)
    const music = page.getByRole('button', { name: /^Música/ })
    await music.focus()
    await page.keyboard.press('Space')
    await expect(page).toHaveURL(/category=musica/)
    await expect(music).toHaveAttribute('aria-pressed', 'true')
  })

  test('validação de login associa mensagens aos campos', async ({ page }) => {
    await openApp(page, '/login')
    const email = page.getByPlaceholder('contato@email.com')
    await email.focus()
    await page.keyboard.press('Enter')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const describedBy = await email.getAttribute('aria-describedby')
    await expect(page.locator(`#${describedBy}`)).toHaveText(/Informe seu e-mail/)
    await expect(email).toBeFocused()
    // Esc fecha o diálogo e retorna ao início
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/$|\/\?/)
  })
})
