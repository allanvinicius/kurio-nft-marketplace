import { test, expect, openApp, login, mockApi, USERS } from '../helpers/app'

test.describe('Cadastro, login, expiração, logout e troca de usuário', () => {
  test('cadastro: validação, conflito e criação de conta @mobile', async ({ page }) => {
    await openApp(page, '/register')
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /Criar (conta|perfil)/ }).filter({ visible: true }).click()
    const username = dialog.getByPlaceholder('Nome de usuário')
    await expect(username).toHaveAttribute('aria-invalid', 'true')
    await expect(dialog.locator('#reg-username-err')).toBeVisible()
    await expect(username).toHaveAttribute('aria-describedby', 'reg-username-err')

    await username.fill('ana.nova')
    await dialog.getByPlaceholder('Digite seu e-mail').fill(USERS.ana.email)
    await dialog.getByPlaceholder('Senha', { exact: true }).fill('abc12345')
    await dialog.getByPlaceholder('Confirmar senha').fill('abc12399')
    await dialog.getByRole('button', { name: /Criar (conta|perfil)/ }).filter({ visible: true }).click()
    await expect(dialog.getByText('As senhas não conferem.')).toBeVisible()

    await dialog.getByPlaceholder('Confirmar senha').fill('abc12345')
    await dialog.getByRole('button', { name: /Criar (conta|perfil)/ }).filter({ visible: true }).click()
    await expect(dialog.getByText('Este e-mail já está cadastrado.')).toBeVisible()

    await dialog.getByPlaceholder('Digite seu e-mail').fill('nova@kurio.dev')
    await dialog.getByRole('button', { name: /Criar (conta|perfil)/ }).filter({ visible: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    const session = await page.evaluate(() => JSON.parse(localStorage.getItem('kurio.session') ?? 'null'))
    expect(session?.token).toBeTruthy()
    // Senha nunca é armazenada no cliente
    const storage = await page.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage))
    expect(storage).not.toContain('abc12345')
  })

  test('login inválido mostra erro; sessão sobrevive ao refresh', async ({ page }) => {
    await openApp(page, '/login')
    const dialog = page.getByRole('dialog')
    await dialog.getByPlaceholder('contato@email.com').fill(USERS.ana.email)
    await dialog.getByPlaceholder('Senha', { exact: true }).fill('senha-errada1')
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(dialog.getByRole('alert')).toContainText('E-mail ou senha incorretos.')
    await login(page, 'ana')
    await expect(page.getByTestId('account-name')).toHaveText(USERS.ana.name)
    await page.reload()
    await expect(page.getByTestId('account-name')).toHaveText(USERS.ana.name)
  })

  test('expiração de sessão durante a navegação preserva o destino', async ({ page }) => {
    await openApp(page, '/login?redirect=%2Fprofile')
    await login(page, 'ana')
    await expect(page).toHaveURL(/\/profile$/)
    await mockApi(page, 'POST', '/__mock/session/expire')
    await page.getByRole('link', { name: 'Carteiras' }).first().click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fwallets/)
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Sua sessão expirou')
    await login(page, 'ana')
    await expect(page).toHaveURL(/\/wallets$/)
  })

  test('logout e troca de usuário limpam dados privados', async ({ page }) => {
    await openApp(page, '/login?redirect=%2Ffavorites')
    await login(page, 'ana')
    await expect(page.getByTestId('favorites-grid')).toContainText('Ivory Baron #088')
    // Logout
    await page.getByTestId('account-name').click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()
    await page.goto('/favorites')
    await expect(page).toHaveURL(/\/login\?redirect=%2Ffavorites/)
    // Bruno não vê dados da Ana
    await login(page, 'bruno')
    await expect(page.getByText('Nenhum favorito ainda')).toBeVisible()
    await expect(page.getByText('Ivory Baron #088')).toHaveCount(0)
    // Troca direta de usuário (login sobre sessão ativa)
    await page.goto('/login?redirect=%2Ffavorites')
    await login(page, 'ana')
    await expect(page.getByTestId('favorites-grid')).toContainText('Ivory Baron #088')
  })
})
