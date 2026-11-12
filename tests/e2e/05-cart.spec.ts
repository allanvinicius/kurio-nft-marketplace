import { test, expect, openApp, login, addToCart } from '../helpers/app'

test.describe('Carrinho', () => {
  test('quantidades, remoção, cupom, persistência após refresh e merge no login @mobile', async ({ page, isMobile }) => {
    await openApp(page)
    await addToCart(page, 'emerald-ape-042')
    await addToCart(page, 'violet-nomad-314', { quantity: 2 })
    const rows = page.getByTestId(isMobile ? 'cart-row-mobile' : 'cart-row')
    await expect(rows).toHaveCount(2)
    const total = page.getByTestId('quote-total').filter({ visible: true })
    await expect(total).toHaveText('3.986 ETH') // 1.19 + 2*1.39 + 0.016

    // Quantidade
    await rows.filter({ hasText: 'Emerald Ape #042' }).getByRole('button', { name: /^Aumentar quantidade/ }).click()
    await expect(total).toHaveText('5.176 ETH')
    // Remoção
    await rows.filter({ hasText: 'Violet Nomad #314' }).getByRole('button', { name: /^Remover/ }).click()
    await expect(rows).toHaveCount(1)
    await expect(total).toHaveText('2.396 ETH')

    // Cupom inválido / expirado / válido
    const coupon = page.getByTestId('coupon-input').filter({ visible: true })
    const apply = page.getByRole('button', { name: 'Aplicar' }).filter({ visible: true })
    await coupon.fill('NAOEXISTE')
    await apply.click()
    await expect(page.getByText('Código promocional inválido.').filter({ visible: true })).toBeVisible()
    await expect(coupon).toHaveAttribute('aria-invalid', 'true')
    await coupon.fill('EXPIRADO')
    await apply.click()
    await expect(page.getByText('Este cupom expirou.').filter({ visible: true })).toBeVisible()
    await coupon.fill('KURIO10')
    await apply.click()
    await expect(page.getByText(/Cupom KURIO10 aplicado/).filter({ visible: true })).toBeVisible()
    await expect(total).toHaveText('2.158 ETH') // 2.38 - 0.238 + 0.016

    // Refresh mantém itens e cupom
    await page.reload()
    await expect(rows).toHaveCount(1)
    await expect(page.getByTestId('quote-total').filter({ visible: true })).toHaveText('2.158 ETH')

    // Remover cupom
    await page.getByRole('button', { name: 'Remover cupom KURIO10' }).filter({ visible: true }).click()
    await expect(page.getByTestId('quote-total').filter({ visible: true })).toHaveText('2.396 ETH')

    // Login preserva os itens do visitante (merge)
    await page.goto('/login?redirect=%2Fcart')
    await login(page, 'ana')
    await expect(page).toHaveURL(/\/cart$/)
    await expect(page.getByTestId(isMobile ? 'cart-row-mobile' : 'cart-row')).toHaveCount(1)
    await expect(page.getByTestId(isMobile ? 'cart-row-mobile' : 'cart-row').first()).toContainText('Emerald Ape #042')
  })

  test('limite por edição é respeitado pela API', async ({ page }) => {
    await openApp(page)
    await addToCart(page, 'emerald-ape-042', { edition: '1/10', quantity: 3 })
    await page.goto('/nft/emerald-ape-042')
    await page.getByTestId('edition-1/10').click()
    await expect(page.getByTestId('edition-limit')).toContainText('máximo permitido')
    await expect(page.getByRole('button', { name: 'COMPRAR' })).toBeDisabled()
  })
})
