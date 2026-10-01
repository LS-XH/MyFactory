import { expect, test } from '@playwright/test'

test('loads the command console', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('HELIX')).toBeVisible()
  await expect(page.getByText('猎户门 · 07')).toBeVisible()
  await expect(page.getByText('轨道时间')).toBeVisible()
})
