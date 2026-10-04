import { expect, test } from '@playwright/test'

test('overview and map double-clicks use the configured object focus zoom', async ({ page }) => {
  await page.route('**/api/save/config', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      return
    }
    const response = await route.fetch()
    const config = await response.json()
    config.settings.objectFocusZoom = 8
    await route.fulfill({ response, json: config })
  })
  await page.goto('/')

  const setFocusZoom = async () => {
    await page.getByRole('button', { name: '设置' }).click()
    await page.getByRole('tab', { name: '星图' }).click()
    const slider = page.getByRole('slider', { name: '对象双击聚焦倍率' })
    await slider.focus()
    await slider.press('ArrowRight')
    await page.locator('.overlay-header .icon-button').click()
  }

  await setFocusZoom()
  await page.locator('.overview-item[title="地平线 · 铁壁"]').dblclick()
  await expect(page.locator('.time-card .cyan')).toHaveText('1600%')

  await setFocusZoom()
  await page.locator('.space-entity[data-selectable-id="station-horizon"]').evaluate((element) => {
    element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
  })
  await expect(page.locator('.time-card .cyan')).toHaveText('3200%')
})
