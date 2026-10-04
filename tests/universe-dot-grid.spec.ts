import { expect, test } from '@playwright/test'

async function mockConfigSave(page: import('@playwright/test').Page) {
  await page.route('**/api/save/config', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      return
    }
    const response = await route.fetch()
    const config = await response.json()
    config.settings.starMapGridSpacingAu = 1
    config.settings.starMapGridFadeStartZoom = 1
    config.settings.starMapGridFadeEndZoom = 2
    config.settings.starAuLengthFactor = 1
    await route.fulfill({ response, json: config })
  })
}

test('AU dot spacing is configurable and stays fixed in world space while zooming', async ({ page }) => {
  await mockConfigSave(page)
  await page.goto('/')
  await page.getByRole('button', { name: '设置' }).click()
  await page.getByRole('tab', { name: '星图' }).click()
  const spacing = page.getByRole('spinbutton', { name: '星图圆点间距' })
  await expect(spacing).toHaveValue('1')
  await spacing.fill('2')
  await spacing.press('Enter')
  await page.locator('.overlay-header .icon-button').click()

  const svg = page.locator('.system-svg')
  const box = await svg.boundingBox()
  if (!box) throw new Error('Universe SVG is not visible')
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.7)
  await page.mouse.wheel(0, -120)
  const pattern = page.locator('#space-map-au-dot-grid')
  await expect(pattern).toHaveAttribute('width', '2')
  const firstScale = await svg.evaluate((element) => element.getScreenCTM()?.a ?? 0)

  await page.waitForTimeout(450)
  await page.mouse.wheel(0, -120)
  await page.waitForTimeout(450)
  await expect(pattern).toHaveAttribute('width', '2')
  const secondScale = await svg.evaluate((element) => element.getScreenCTM()?.a ?? 0)
  expect(secondScale).toBeGreaterThan(firstScale * 1.5)
})

test('dot-grid start and end thresholds fade independently of the stellar-system threshold', async ({ page }) => {
  await mockConfigSave(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.getByRole('button', { name: '设置' }).click()
  await page.getByRole('tab', { name: '星图' }).click()
  const gridEnd = page.getByRole('slider', { name: '圆点网格完全出现阈值' })
  await gridEnd.focus()
  await gridEnd.press('ArrowRight')
  await expect(gridEnd.locator('..')).toContainText('400%')
  const gridStart = page.getByRole('slider', { name: '圆点网格开始出现阈值' })
  await gridStart.focus()
  await gridStart.press('ArrowRight')
  await expect(gridStart.locator('..')).toContainText('200%')
  await page.locator('.overlay-header .icon-button').click()

  const svg = page.locator('.system-svg')
  const box = await svg.boundingBox()
  if (!box) throw new Error('Universe SVG is not visible')
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.7)
  await page.mouse.wheel(0, -120)
  await page.waitForTimeout(450)
  await expect(page.locator('.space-map-dot-grid')).toHaveCount(0)
  await page.evaluate(() => {
    const state = window as typeof window & { __gridFadeSamples?: { initial: number; final?: number } }
    const observer = new MutationObserver(() => {
      const grid = document.querySelector('.space-map-dot-grid')
      if (!grid) return
      observer.disconnect()
      state.__gridFadeSamples = { initial: Number(getComputedStyle(grid).opacity) }
      setTimeout(() => { state.__gridFadeSamples!.final = Number(getComputedStyle(grid).opacity) }, 550)
    })
    observer.observe(document.body, { childList: true, subtree: true })
  })
  await page.mouse.wheel(0, -120)
  await expect(page.locator('.space-map-dot-grid')).toHaveCount(1)
  await page.waitForFunction(() => (window as typeof window & { __gridFadeSamples?: { final?: number } }).__gridFadeSamples?.final !== undefined)
  const fade = await page.evaluate(() => (window as typeof window & { __gridFadeSamples: { initial: number; final: number } }).__gridFadeSamples)
  expect(fade.initial).toBeLessThan(0.1)
  expect(fade.final).toBeGreaterThan(0.45)

  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(150)
  const fadingOut = Number(await page.locator('.space-map-dot-grid').getAttribute('opacity'))
  expect(fadingOut).toBeGreaterThan(0)
  expect(fadingOut).toBeLessThan(fade.final)
  await page.waitForTimeout(350)
  await expect(page.locator('.space-map-dot-grid')).toHaveCount(0)
})

test('the in-app reduced-motion switch skips the dot-grid fade', async ({ page }) => {
  await mockConfigSave(page)
  await page.goto('/')
  await page.getByRole('button', { name: '设置' }).click()
  const toggle = page.getByRole('button', { name: '减少动态效果' })
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await page.locator('.overlay-header .icon-button').click()

  const svg = page.locator('.system-svg')
  const box = await svg.boundingBox()
  if (!box) throw new Error('Universe SVG is not visible')
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.7)
  await page.mouse.wheel(0, -120)
  await expect(page.locator('.space-map-dot-grid')).toHaveCount(1)
  expect(Number(await page.locator('.space-map-dot-grid').getAttribute('opacity'))).toBeGreaterThan(0.45)
})
