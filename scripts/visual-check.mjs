import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const baseUrl = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5173/classroom-observatie/'
const artifactDir = new URL('../artifacts/', import.meta.url).pathname
await mkdir(artifactDir, { recursive: true })

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const browser = await chromium.launch({ headless: true })
try {
  for (const setup of [
    { name: 'mobile', viewport: { width: 390, height: 844 } },
    { name: 'desktop', viewport: { width: 1440, height: 1000 } },
  ]) {
    const context = await browser.newContext({ viewport: setup.viewport })
    const page = await context.newPage()
    await page.goto(baseUrl, { waitUntil: 'networkidle' })

    assert(await page.getByRole('button', { name: /afwezig melden/i }).count() === 32, `${setup.name}: attendance grid does not show 32 students`)
    await page.screenshot({ path: `${artifactDir}${setup.name}-attendance-v2.png`, fullPage: true })
    await page.getByRole('button', { name: 'Aanwezigheid afronden' }).click()

    assert(await page.locator('.student-card').count() === 32, `${setup.name}: live grid does not show 32 students`)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    assert(!overflow, `${setup.name}: page has horizontal overflow`)
    const tabsOverflow = await page.locator('.view-tabs').evaluate((node) => node.scrollWidth > node.clientWidth)
    assert(!tabsOverflow, `${setup.name}: live-view tabs are clipped or require horizontal scrolling`)

    const boxes = await page.locator('.student-card').evaluateAll((nodes) => nodes.map((node) => {
      const box = node.getBoundingClientRect()
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom }
    }))
    for (let index = 0; index < boxes.length; index += 1) {
      for (let other = index + 1; other < boxes.length; other += 1) {
        const a = boxes[index]
        const b = boxes[other]
        const overlaps = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
        assert(!overlaps, `${setup.name}: student cards ${index + 1} and ${other + 1} overlap`)
      }
    }

    await page.screenshot({ path: `${artifactDir}${setup.name}-live-v2.png`, fullPage: true })
    await page.getByRole('button', { name: 'Noah B. selecteren' }).click()
    assert(await page.getByLabel('Observatie voor Noah B.').isVisible(), `${setup.name}: observation panel did not open`)
    await page.screenshot({ path: `${artifactDir}${setup.name}-actions-v2.png`, fullPage: true })
    const panel = page.getByLabel('Observatie voor Noah B.')
    await panel.evaluate((node) => { node.scrollTop = node.scrollHeight })
    assert(await page.getByLabel('Lesnotitie').isVisible(), `${setup.name}: lesson-note composer is not reachable by scrolling`)
    await context.close()
  }
  console.log('VISUAL_CHECK_OK mobile+desktop · 32 students · no horizontal overflow · no card overlap · action panel opens')
} finally {
  await browser.close()
}
