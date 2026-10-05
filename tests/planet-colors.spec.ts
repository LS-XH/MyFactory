import { expect, test } from '@playwright/test'

test('planet category color matches between overview and inspector', async ({ page }) => {
  await page.route('**/api/save/**', (route) => route.request().method() === 'GET'
    ? route.continue()
    : route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  await page.goto('/')
  await expect(page.locator('.space-map-pixi-layer canvas')).toBeVisible()
  await page.locator('.map-star').first().evaluate((element) => element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
  await page.getByRole('tab', { name: '对象' }).click()

  const planet = page.locator('.overview-item:has(svg.lucide-orbit)').first()
  await expect(planet).toBeVisible()
  await planet.click()

  const overviewColor = await planet.locator('.asset-icon').evaluate((element) => getComputedStyle(element).color)
  const inspectorColor = await page.locator('.large-object-icon').evaluate((element) => getComputedStyle(element).color)
  expect(inspectorColor).toBe(overviewColor)
  await expect(page.locator('.object-name-block small')).toContainText('星球')
})
