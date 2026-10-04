import { expect, test } from '@playwright/test'

test('universe camera uses left drag and W with Shift acceleration', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  const svg = page.locator('.system-svg')
  const box = await svg.boundingBox()
  if (!box) throw new Error('Universe SVG is not visible')
  const camera = async () => {
    const values = (await svg.getAttribute('viewBox'))?.split(/\s+/).map(Number)
    if (!values || values.length < 2) throw new Error('Universe camera viewBox is missing')
    return { x: values[0], y: values[1] }
  }
  const start = await camera()
  const x = box.x + box.width * 0.8
  const y = box.y + box.height * 0.8
  await page.mouse.move(x, y)
  await page.mouse.down({ button: 'left' })
  await page.mouse.move(x + 100, y + 50, { steps: 8 })
  await page.mouse.up({ button: 'left' })
  const dragged = await camera()
  expect(dragged.x).toBeLessThan(start.x - 10)

  await page.keyboard.down('w')
  await page.waitForTimeout(300)
  await page.keyboard.up('w')
  const normal = await camera()
  const normalDistance = dragged.y - normal.y
  expect(normalDistance).toBeGreaterThan(10)

  await page.keyboard.down('Shift')
  await page.keyboard.down('w')
  await page.waitForTimeout(300)
  await page.keyboard.up('w')
  await page.keyboard.up('Shift')
  const boosted = await camera()
  expect(normal.y - boosted.y).toBeGreaterThan(normalDistance * 1.5)
})

test('surface camera uses left drag and the shared movement keys', async ({ page }) => {
  await page.goto('/')
  await page.locator('.overview-item').first().dblclick()
  const flow = page.locator('.surface-canvas .react-flow')
  const box = await flow.boundingBox()
  if (!box) throw new Error('Surface canvas is not visible')
  const viewport = page.locator('.react-flow__viewport')
  const before = await viewport.getAttribute('style')
  const x = box.x + box.width * 0.8
  const y = box.y + box.height * 0.7
  await page.mouse.move(x, y)
  await page.mouse.down({ button: 'left' })
  await page.mouse.move(x + 100, y + 50, { steps: 8 })
  await page.mouse.up({ button: 'left' })
  const afterDrag = await viewport.getAttribute('style')
  expect(afterDrag).not.toBe(before)
  await page.keyboard.down('d')
  await page.waitForTimeout(250)
  await page.keyboard.up('d')
  expect(await viewport.getAttribute('style')).not.toBe(afterDrag)
})

test('universe blank click tolerates slight pointer movement without losing left-drag panning', async ({ page }) => {
  await page.goto('/')
  const asset = page.locator('.overview-item').first()
  await asset.click()
  await expect(asset).toHaveClass(/selected/)

  const svg = page.locator('.system-svg')
  const box = await svg.boundingBox()
  if (!box) throw new Error('Universe SVG is not visible')
  const x = box.x + box.width * 0.8
  const y = box.y + box.height * 0.8
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 5, y + 2)
  await page.mouse.up()
  await expect(asset).not.toHaveClass(/selected/)

  await asset.click()
  const beforeDrag = await svg.getAttribute('viewBox')
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 100, y + 50, { steps: 8 })
  await page.mouse.up()
  await expect(asset).toHaveClass(/selected/)
  expect(await svg.getAttribute('viewBox')).not.toBe(beforeDrag)
})

test('surface blank click tolerates slight pointer movement without affecting node selection or panning', async ({ page }) => {
  await page.goto('/')
  await page.locator('.overview-item').first().dblclick()
  const node = page.locator('.react-flow__node').first()
  await node.click()
  await expect(node).toHaveClass(/selected/)

  const pane = page.locator('.react-flow__pane')
  const box = await pane.boundingBox()
  if (!box) throw new Error('Surface pane is not visible')
  const x = box.x + box.width * 0.8
  const y = box.y + box.height * 0.7
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 5, y + 2)
  await page.mouse.up()
  await expect(node).not.toHaveClass(/selected/)

  await node.click()
  const viewport = page.locator('.react-flow__viewport')
  const beforeDrag = await viewport.getAttribute('style')
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 100, y + 50, { steps: 8 })
  await page.mouse.up()
  await expect(node).toHaveClass(/selected/)
  expect(await viewport.getAttribute('style')).not.toBe(beforeDrag)
})

test('shortcut page rebinds a direction without writing the real config during the test', async ({ page }) => {
  await page.route('**/api/save/config', async (route) => route.request().method() === 'GET'
    ? route.continue()
    : route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  await page.goto('/')
  await page.getByRole('button', { name: '设置' }).click()
  await page.getByRole('tab', { name: '快捷键' }).click()
  await page.getByRole('button', { name: '向上移动快捷键' }).click()
  await page.keyboard.press('ArrowUp')
  await expect(page.getByRole('button', { name: '向上移动快捷键' })).toHaveText('↑')
  await page.locator('.overlay-header .icon-button').click()
  const svg = page.locator('.system-svg')
  const before = await svg.getAttribute('viewBox')
  await page.keyboard.down('ArrowUp')
  await page.waitForTimeout(250)
  await page.keyboard.up('ArrowUp')
  expect(await svg.getAttribute('viewBox')).not.toBe(before)
})
