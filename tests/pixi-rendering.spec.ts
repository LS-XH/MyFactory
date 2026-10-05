import { expect, test } from '@playwright/test'

test.use({ deviceScaleFactor: 2 })

async function expectHiDpiCanvas(canvas: import('@playwright/test').Locator) {
  const pixels = await canvas.evaluate((element: HTMLCanvasElement) => ({
    width: element.width,
    height: element.height,
    cssWidth: element.getBoundingClientRect().width,
    cssHeight: element.getBoundingClientRect().height,
  }))
  expect(pixels.width).toBeGreaterThanOrEqual(pixels.cssWidth * 2 - 2)
  expect(pixels.height).toBeGreaterThanOrEqual(pixels.cssHeight * 2 - 2)
}

test('star map and surface keep their controls over GPU-rendered scene layers', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')

  const mapCanvas = page.locator('.space-map-pixi-layer canvas')
  await expect(mapCanvas).toBeVisible()
  expect(await mapCanvas.evaluate((canvas: HTMLCanvasElement) => Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl')))).toBe(true)
  await expectHiDpiCanvas(mapCanvas)

  await page.locator('.map-star').first().evaluate((element) => element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
  await expect(page.locator('.time-card .cyan')).toHaveText('200%')
  await page.locator('.overview-item').first().dblclick()

  const surfaceCanvas = page.locator('.surface-pixi-layer canvas')
  await expect(surfaceCanvas).toBeVisible()
  expect(await surfaceCanvas.evaluate((canvas: HTMLCanvasElement) => Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl')))).toBe(true)
  await expectHiDpiCanvas(surfaceCanvas)
  await expect(page.locator('.surface-footer')).toContainText('条链路')
  await expect(page.locator('.react-flow__edge')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('focused ship icon is visible on the star map', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error' && message.text().includes('轨道对象图标')) errors.push(message.text()) })
  await page.route('**/api/save/orbital-objects', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ schemaVersion: 2, entities: [{
      id: 'ship-icon-test', kind: 'ship', definitionId: 'Imicus', name: '图标测试飞船',
      starId: 'Star0041', position: { x: 0.12, y: -4.45 }, orbit: 1,
      ownerFactionId: 'Player', status: 'online', tasks: []
    }] })
  }))
  await page.goto('/')
  await page.locator('.overview-item[title="图标测试飞船"]').dblclick()
  await expect(page.locator('.space-entity[data-selectable-id="ship-icon-test"]')).toBeVisible()
  await expect(page.locator('.space-map-pixi-layer')).toHaveAttribute('data-ready-icons', /^[1-9]\d*$/)
  await expect.poll(async () => Number(await page.locator('.space-map-pixi-layer').getAttribute('data-active-icon-pixels'))).toBeGreaterThan(96)
  expect(errors).toEqual([])
})
