import { expect, test } from '@playwright/test'
import { mockOrbitalSave } from './orbitalFixture'

test('selected-object commands are square icons with hover labels and keep targeting behavior', async ({ page }) => {
  await mockOrbitalSave(page)
  await page.goto('/')
  await page.locator('.overview-item[title="地平线 · 铁壁"]').click()

  const buttons = page.locator('.selected-actions .object-action-button')
  await expect(buttons.first()).toBeVisible()
  const attack = page.getByRole('button', { name: '攻击', exact: true })
  await expect(attack).toHaveText('')
  await expect(attack.locator('svg')).toHaveAttribute('aria-hidden', 'true')
  const size = await attack.boundingBox()
  expect(size?.width).toBe(size?.height)
  expect(size?.width).toBeGreaterThanOrEqual(50)

  await attack.hover()
  await expect.poll(() => attack.evaluate((element) => getComputedStyle(element, '::after').opacity)).toBe('1')
  await attack.click()
  await expect(attack).toHaveAttribute('aria-pressed', 'true')
})
