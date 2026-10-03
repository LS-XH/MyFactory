import { expect, test } from '@playwright/test'

test('loads the command console', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await expect(page.getByText('HELIX')).toBeVisible()
  await expect(page.getByText('猎户门 · 07')).toBeVisible()
  const fps = page.locator('.frame-rate-indicator')
  await expect(fps).toBeVisible()
  await expect(fps.locator('strong')).not.toHaveText('0', { timeout: 10_000 })

  await page.locator('.overview-item').first().dblclick()
  await expect(page.getByText('生产区', { exact: true })).toBeVisible()
  await expect(fps).toBeVisible()
  await expect(fps.locator('strong')).not.toHaveText('0')
})
