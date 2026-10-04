import { expect, test } from '@playwright/test'

test('high-zoom system uses small SVG coordinates and screen-space labels', async ({ page }) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')

  const star = page.locator('.map-star').first()
  await star.waitFor()
  // A visible orbit can intersect the viewport while its star center is outside it.
  await star.evaluate((element) => element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
  const svg = page.locator('.system-svg')
  const bounds = await svg.boundingBox()
  if (!bounds) throw new Error('Universe SVG is not visible')
  for (let index = 0; index < 12; index += 1) {
    const zoomText = await page.locator('.time-card .cyan').innerText()
    if (Number.parseFloat(zoomText) >= 12_800) break
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    await page.mouse.wheel(0, -500)
    await page.waitForTimeout(110)
  }
  await expect(page.locator('.time-card .cyan')).toHaveText('12800%')
  await expect.poll(async () => {
    const viewBox = (await svg.getAttribute('viewBox'))?.split(/\s+/).map(Number) ?? []
    return viewBox.length === 4 && Math.abs(viewBox[0]) < 20 && Math.abs(viewBox[1]) < 20 && viewBox[2] < 20
  }).toBe(true)
  await expect(page.locator('.system-label-svg text').first()).toBeVisible()
  await expect(svg.locator('.celestial-name text')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('universe SVG and label layer cover the entire operable viewport', async ({ page }) => {
  await page.goto('/')
  const canvas = await page.locator('.system-canvas').boundingBox()
  const svg = await page.locator('.system-svg').boundingBox()
  if (!canvas || !svg) throw new Error('Universe viewport is not visible')
  expect(svg.x).toBeCloseTo(canvas.x, 1)
  expect(svg.y).toBeCloseTo(canvas.y, 1)
  expect(svg.width).toBeCloseTo(canvas.width, 1)
  expect(svg.height).toBeCloseTo(canvas.height, 1)
  const view = (await page.locator('.system-svg').getAttribute('viewBox'))?.split(/\s+/).map(Number) ?? []
  expect(view[2] / view[3]).toBeCloseTo(canvas.width / canvas.height, 4)
})
