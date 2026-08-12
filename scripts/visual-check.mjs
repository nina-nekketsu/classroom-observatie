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

    assert(await page.getByRole('navigation', { name: 'Hoofdnavigatie' }).isVisible(), `${setup.name}: main navigation is missing`)
    await page.getByRole('button', { name: 'Klassen' }).click()
    assert(await page.getByRole('heading', { name: 'Klassen' }).isVisible(), `${setup.name}: classes view did not open`)
    assert(await page.getByLabel('CSV of TSV kiezen').isVisible(), `${setup.name}: CSV/TSV file input is missing`)
    const classesOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    assert(!classesOverflow, `${setup.name}: classes view has horizontal overflow`)
    await page.screenshot({ path: `${artifactDir}${setup.name}-classes-v4.png`, fullPage: true })
    await page.getByRole('button', { name: 'Live' }).click()

    assert(await page.getByRole('button', { name: /afwezig melden/i }).count() === 32, `${setup.name}: attendance grid does not show 32 students`)
    assert(await page.getByRole('navigation', { name: 'Alfabetische navigatie' }).getByRole('link', { name: 'N', exact: true }).getAttribute('href') === '#attendance-N', `${setup.name}: attendance alphabet navigation is missing N`)
    assert(await page.locator('#attendance-N').count() === 1, `${setup.name}: attendance N target is missing`)
    await page.screenshot({ path: `${artifactDir}${setup.name}-attendance-v3.png`, fullPage: true })
    await page.getByRole('button', { name: 'Noah B. afwezig melden' }).click()
    await page.getByRole('button', { name: 'Aanwezigheid afronden' }).click()

    assert(await page.locator('.student-card').count() === 31, `${setup.name}: live grid does not hide the absent student`)
    assert(await page.getByRole('button', { name: 'Noah B. selecteren' }).count() === 0, `${setup.name}: absent Noah remains selectable in live view`)
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

    await page.screenshot({ path: `${artifactDir}${setup.name}-live-v3.png`, fullPage: true })
    await page.getByRole('button', { name: 'Sara K. selecteren' }).click()
    assert(await page.getByLabel('Observatie voor Sara K.').isVisible(), `${setup.name}: observation panel did not open`)
    await page.screenshot({ path: `${artifactDir}${setup.name}-actions-v3.png`, fullPage: true })
    const panel = page.getByLabel('Observatie voor Sara K.')
    await panel.evaluate((node) => { node.scrollTop = node.scrollHeight })
    assert(await page.getByLabel('Lesnotitie').isVisible(), `${setup.name}: lesson-note composer is not reachable by scrolling`)
    await page.getByLabel('Lesnotitie').fill('Volgende les direct controleren.')
    await page.getByRole('checkbox', { name: 'Belangrijke notitie' }).check()
    await page.getByRole('button', { name: 'Notitie bewaren' }).click()
    await page.getByRole('button', { name: 'Sluiten' }).click()
    assert(await page.getByRole('button', { name: 'Notities van Sara K.' }).evaluate((node) => node.classList.contains('important')), `${setup.name}: important note does not highlight the live note bar`)
    await page.getByRole('button', { name: /Belangrijke notities/ }).click()
    assert(await page.getByLabel('Belangrijke notities van de klas').isVisible(), `${setup.name}: important-note class overview did not open`)
    await page.screenshot({ path: `${artifactDir}${setup.name}-important-notes-v3.png`, fullPage: true })
    await page.getByLabel('Belangrijke notities van de klas').getByRole('button', { name: 'Sluiten' }).click()

    await page.getByRole('tab', { name: 'Huiswerk & spullen' }).click()
    assert(await page.getByRole('navigation', { name: 'Alfabetische navigatie' }).getByRole('link', { name: 'N', exact: true }).getAttribute('href') === '#preparation-N', `${setup.name}: preparation alphabet navigation is missing N`)
    assert(await page.locator('#preparation-N').count() === 1, `${setup.name}: preparation N target is missing`)
    await context.close()
  }
  console.log('VISUAL_CHECK_OK mobile+desktop · main navigation · classes/import view · 32 attendance · alphabetical navigation · absent hidden live · no overflow/overlap · important-note flow')
} finally {
  await browser.close()
}
