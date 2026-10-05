import { expect, test } from '@playwright/test'

test('universe cursor HUD follows the pointer and the camera', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')

  const canvas = page.locator('.system-canvas')
  await expect(canvas).toBeVisible({ timeout: 30_000 })
  const hud = canvas.locator('.viewport-hud')
  await expect(hud).toContainText('X — · Y — AU')
  await expect(hud.locator('.map-coordinate-canvas')).toContainText('X — · Y —')

  const svgBounds = await canvas.locator('.system-svg').boundingBox()
  if (!svgBounds) throw new Error('Universe SVG is not visible')
  const x = svgBounds.x + svgBounds.width * 0.7
  const y = svgBounds.y + svgBounds.height * 0.65
  await page.mouse.move(x, y)
  await expect(hud).toContainText(/X -?\d+\.\d+ · Y -?\d+\.\d+ AU/)
  await expect(hud.locator('.map-coordinate-canvas')).toContainText(/X -?\d+\.\d+ · Y -?\d+\.\d+/)
  const beforeZoom = await hud.innerText()

  await page.mouse.wheel(0, -500)
  await expect.poll(() => hud.innerText()).not.toBe(beforeZoom)

  const canvasBounds = await canvas.boundingBox()
  if (!canvasBounds) throw new Error('Universe canvas is not visible')
  await page.mouse.move(canvasBounds.x - 5, canvasBounds.y + canvasBounds.height / 2)
  await expect(hud).toContainText('X — · Y — AU')
  await expect(hud.locator('.map-coordinate-canvas')).toContainText('X — · Y —')
})
