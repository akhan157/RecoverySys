import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { browser, expect, $ } from '@wdio/globals'

const here = path.dirname(fileURLToPath(import.meta.url))
const screenshotsDir = path.join(here, '..', 'artifacts', 'screenshots')

async function shot(name) {
  fs.mkdirSync(screenshotsDir, { recursive: true })
  await browser.saveScreenshot(path.join(screenshotsDir, `${name}.png`))
}

async function visible(selector, timeout = 60_000) {
  const element = await $(selector)
  await element.waitForDisplayed({ timeout })
  return element
}

async function clickTab(id) {
  const tab = await $(`#mc-tab-${id}`)
  await tab.waitForClickable({ timeout: 60_000 })
  await tab.click()
}

async function waitForText(selector, needle, timeout = 60_000) {
  const element = await $(selector)
  const target = needle.toLowerCase()
  await browser.waitUntil(
    async () => {
      try {
        return (await element.getText()).toLowerCase().includes(target)
      } catch {
        return false
      }
    },
    {
      timeout,
      timeoutMsg: `Expected ${selector} to contain "${needle}"`,
    }
  )
  return element
}

async function selectCatalogPart(categoryLabel, partName) {
  const chip = await $(
    `//button[contains(@class,"parts-category-chip")][normalize-space(.)="${categoryLabel}"]`
  )
  await chip.waitForClickable({ timeout: 30_000 })
  await chip.click()

  const search = await $('input[aria-label="Search parts"]')
  await search.waitForDisplayed({ timeout: 30_000 })
  await search.setValue(partName)

  const card = await $(
    `//button[contains(@class,"parts-card")][contains(normalize-space(.), '${partName}')]`
  )
  await card.waitForClickable({ timeout: 30_000 })
  await card.click()

  const clear = await $('button[aria-label="Clear search"]')
  if (await clear.isExisting()) {
    await clear.click()
  }
}

async function setInput(id, value) {
  const input = await visible(id)
  await input.setValue(value)
  await expect(await input.getValue()).toBe(value)
}

describe('RecoverySys desktop', () => {
  before(async () => {
    fs.mkdirSync(screenshotsDir, { recursive: true })
    await visible('h1.mc-header__brand')

    // Deterministic fresh launch: clear the webview's local store (and the
    // first-visit demo trigger) before the workflow starts.
    await browser.execute(() => {
      localStorage.clear()
      sessionStorage.clear()
      localStorage.setItem('recoverysys-visited', '1')
    })
    await browser.refresh()
    await visible('h1.mc-header__brand')
  })

  it('opens the real app with the RecoverySys brand and V1.3 RC3 label', async () => {
    const brand = await visible('h1.mc-header__brand')
    const brandText = await brand.getText()
    expect(brandText).toContain('RECOVERYSYS_V1.3 RC3')
    expect(brandText).toContain('V1.3 RC3')

    const tablist = await visible('nav[role="tablist"]')
    expect(await tablist.getText()).toContain('DASHBOARD')
    expect(await tablist.getText()).toContain('RECOVERY_BRIEF')

    await shot('01-launch-brand')
  })

  it('starts a fresh plan and enters the required rocket, motor and bay inputs', async () => {
    await clickTab('guided_review')
    const start = await $(
      '//button[contains(@class,"guided-review__action-card")][contains(., "START A NEW PLAN")]'
    )
    await start.waitForClickable({ timeout: 30_000 })
    await start.click()

    await visible('#mass')
    expect(await (await $('#mc-tab-specs')).getAttribute('aria-selected')).toBe('true')

    await setInput('#mass', '2500')
    await setInput('#impulse', '640')
    await setInput('#burn', '1.8')
    await setInput('#airframe-id', '3.9')
    await setInput('#bay-length', '18')
    await setInput('#cd', '0.5')

    await shot('02-specs-filled')
  })

  it('selects a main and drogue parachute from the catalog', async () => {
    await clickTab('dashboard')
    await visible('.parts-category-chip')

    await selectCatalogPart('Main Chute', '24" Compact Light')
    await waitForText('div.mc-slot[data-slot="main_chute"]', '24" Compact Light')
    await waitForText('div.mc-slot[data-slot="main_chute"]', '99')

    await selectCatalogPart('Drogue Chute', '24" Hexagon')
    await waitForText('div.mc-slot[data-slot="drogue_chute"]', '24" Hexagon')

    await shot('03-hardware-selected')
  })

  it('runs the simulation and renders the Recovery Brief with numeric sections', async () => {
    await clickTab('simulation')
    const run = await $('button.mc-run-btn')
    await run.waitForClickable({ timeout: 60_000 })
    await run.click()

    await browser.waitUntil(
      async () => {
        const main = await $('main')
        const text = await main.getText()
        return /APOGEE_ALTITUDE\s*\n?[\d,]+/.test(text)
      },
      { timeout: 90_000, timeoutMsg: 'APOGEE_ALTITUDE did not render a numeric value' }
    )
    expect(await (await $('main')).getText()).not.toContain('RESULT_STALE')
    await shot('04-simulation-result')

    await clickTab('recovery_brief')
    await waitForText('.mc-brief h2', 'Recovery Brief')
    expect(await (await $('.mc-brief')).getText()).toContain('CURRENT RESULT')

    const estimates = await waitForText(
      'section[aria-labelledby="brief-estimates-title"]',
      'Apogee'
    )
    const estimatesText = await estimates.getText()
    expect(estimatesText).toMatch(/Apogee[\s\S]*?[\d,]+[\s\S]*?ft/i)
    expect(estimatesText).toMatch(/Drift[\s\S]*?[\d,]+[\s\S]*?ft/i)

    const deployment = await waitForText(
      'section[aria-labelledby="brief-deployment-title"]',
      'Dual deploy (drogue + main)'
    )
    const deploymentText = await deployment.getText()
    expect(deploymentText).toContain('Main deployment')
    expect(deploymentText).toContain('Landing')
    expect(deploymentText).toMatch(/Altitude[\s\S]*?[\d,]+[\s\S]*?ft/i)

    const mass = await waitForText('section[aria-labelledby="brief-mass-title"]', 'Main Chute')
    const massText = await mass.getText()
    expect(massText).toContain('Drogue Chute')
    expect(massText).toMatch(/Known recovery total/i)
    expect(massText).toMatch(/\d+ g/)

    const loadPath = await waitForText(
      'section[aria-labelledby="brief-load-path-title"]',
      'Governing load case'
    )
    const loadPathText = await loadPath.getText()
    expect(loadPathText).toContain('Ejection pull')
    expect(loadPathText).toMatch(/Governing load case:[\s\S]*?[\d,]+[\s\S]*?lbs/)

    await shot('05-recovery-brief')
  })

  it('persists the saved plan after reload/relaunch', async () => {
    // usePersistence debounces localStorage writes by 300 ms.
    await browser.pause(1_000)
    const persisted = await browser.execute(() => localStorage.getItem('recoverysys-config'))
    expect(persisted).toBeTruthy()
    expect(String(persisted)).toContain('2500')

    // WebDriver relaunch semantics differ by provider. msedgedriver gives each
    // session a fresh temporary WebView2 profile, so a Windows reloadSession
    // cannot see the previous session's localStorage. The embedded macOS
    // provider restarts the real app profile, so it can exercise a full
    // process relaunch there.
    if (process.platform === 'win32') {
      await browser.refresh()
    } else {
      await browser.reloadSession()
    }
    await visible('h1.mc-header__brand')

    await clickTab('specs')
    await visible('#mass')
    expect(await (await $('#mass')).getValue()).toBe('2500')
    expect(await (await $('#impulse')).getValue()).toBe('640')

    await clickTab('dashboard')
    await waitForText('div.mc-slot[data-slot="main_chute"]', '24" Compact Light')
    await waitForText('div.mc-slot[data-slot="drogue_chute"]', '24" Hexagon')

    await shot('06-relaunch-persisted')
  })
})
