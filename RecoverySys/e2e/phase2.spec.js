import { test as base, expect } from '@playwright/test'
import { resolve } from 'node:path'
import {
  getDeterministicRoutingState,
  installDeterministicRouting,
} from './support/deterministicRouting.js'

const motorFixture = resolve('src/test/fixtures/aerotech-k550.eng')

const test = base.extend({
  guardedPage: async ({ page }, use) => {
    const pageErrors = []
    const consoleErrors = []
    const requestErrors = []
    await installDeterministicRouting(page)
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('requestfailed', (request) => {
      if (
        request.url().startsWith('http://127.0.0.1:4174/') &&
        request.failure()?.errorText !== 'net::ERR_ABORTED'
      ) {
        requestErrors.push(`${request.url()} — ${request.failure()?.errorText ?? 'request failed'}`)
      }
    })

    await use(page)

    expect(pageErrors, `page errors: ${pageErrors.join('\n')}`).toEqual([])
    expect(consoleErrors, `console errors: ${consoleErrors.join('\n')}`).toEqual([])
    expect(requestErrors, `same-origin request errors: ${requestErrors.join('\n')}`).toEqual([])
  },
})

async function prepareStorage(page, { firstVisit = false } = {}) {
  await page.addInitScript((isFirstVisit) => {
    if (sessionStorage.getItem('__e2e_storage_initialized')) return
    localStorage.clear()
    if (!isFirstVisit) localStorage.setItem('recoverysys-visited', '1')
    sessionStorage.setItem('__e2e_storage_initialized', '1')
  }, firstVisit)
}

async function openApp(page, options) {
  await prepareStorage(page, options)
  await page.goto('./')
  await expect(page.getByRole('tab', { name: 'DASHBOARD' })).toBeVisible()
}

async function configureRocket(page) {
  await page.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await page.locator('#mass').fill('2500')
  await page.locator('#impulse').fill('640')
  await page.locator('#burn').fill('1.8')
  await page.locator('#airframe-id').fill('3.9')
  await page.locator('#bay-length').fill('18')
  await page.locator('#cd').fill('0.5')
  await page.getByRole('tab', { name: 'DASHBOARD' }).click()
  await page.getByRole('button', { name: 'Main Chute' }).click()
  await page.getByRole('button', { name: /24" Compact Light/ }).click()
}

async function simulate(page) {
  await page.getByRole('tab', { name: 'SIMULATION' }).click()
  await page.getByRole('button', { name: /RUN_SIMULATION/ }).click()
  await expect(page.getByText('APOGEE_ALTITUDE')).toBeVisible()
}

async function configureDispersionProfile(page) {
  await page.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await page.locator('#wind').fill('10')
  await page.locator('#wind-dir').fill('270')
  await page.locator('#wind-surface-alt').fill('0')
  await page.locator('#wind-mid').fill('15')
  await page.locator('#wind-mid-dir').fill('280')
  await page.locator('#wind-mid-alt').fill('3000')
  await page.locator('#wind-aloft').fill('25')
  await page.locator('#wind-aloft-dir').fill('260')
  await page.locator('#wind-aloft-alt').fill('8000')
  await page.locator('#launch-lat').fill('35.3456')
  await page.locator('#launch-lon').fill('-117.8083')
  await page.getByRole('tab', { name: 'DASHBOARD' }).click()
}

async function addTransferPart(page) {
  await page.getByRole('button', { name: 'Shock Cord' }).click()
  await page.getByRole('button', { name: /Add Custom Part/ }).click()
  await page.getByLabel('Custom part name').fill('E2E Transfer Cord')
  await page.getByLabel('Material').selectOption('nylon')
  await page.getByLabel('Elongation (%)').fill('12')
  await page.getByLabel('Strength (lbs)').fill('1200')
  await page.getByLabel('Length (ft)').fill('20')
  await page.getByLabel('Weight (g)').fill('180')
  await page.getByLabel('Packed Height (in)').fill('2')
  await page.getByRole('button', { name: 'Add Part' }).click()
  const transferCard = page.getByRole('button', { name: /^E2E Transfer Cord —/ })
  await expect(transferCard).toBeVisible()
  await transferCard.click()
}

test('landing CTA opens the example configuration at the public launch URL', async ({
  guardedPage,
}) => {
  await prepareStorage(guardedPage)
  await guardedPage.goto('./landing/')
  await guardedPage.locator('a[href="../?demo=1"]').first().click()
  await expect(guardedPage).toHaveURL(/\/RecoverySys\/\?demo=1$/)
  await expect(guardedPage.getByRole('status')).toContainText('EXAMPLE')
  await expect(guardedPage.getByText('APOGEE_ALTITUDE')).toBeVisible()
})

test('custom .eng motor supports preview, confirm, clear, and reload round trip', async ({
  guardedPage,
}) => {
  await openApp(guardedPage)
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  const motorInput = guardedPage.locator('input[type="file"][accept=".eng"]')
  await motorInput.setInputFiles(motorFixture)
  await expect(guardedPage.getByText('K550W', { exact: true })).toBeVisible()
  await expect(guardedPage.getByText(/Ns total/)).toBeVisible()
  await guardedPage.getByRole('button', { name: 'Use This Motor' }).click()
  await expect(guardedPage.getByText('Custom Motor', { exact: false })).toBeVisible()
  await expect(guardedPage.getByTitle('Clear custom motor')).toBeVisible()

  await expect
    .poll(() =>
      guardedPage.evaluate(
        () => JSON.parse(localStorage.getItem('recoverysys-config') ?? 'null')?.customMotor ?? null
      )
    )
    .toMatchObject({ designation: 'K550W' })
  await guardedPage.reload()
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await expect(guardedPage.getByText('K550W', { exact: true })).toBeVisible()

  await guardedPage.getByTitle('Clear custom motor').click()
  await expect(guardedPage.getByRole('button', { name: /Import Custom Motor/ })).toBeVisible()
  await expect
    .poll(() =>
      guardedPage.evaluate(
        () => JSON.parse(localStorage.getItem('recoverysys-config') ?? 'null')?.customMotor ?? null
      )
    )
    .toBeNull()
  await guardedPage.reload()
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await expect(guardedPage.getByRole('button', { name: /Import Custom Motor/ })).toBeVisible()
})

test('JSON download imports a selected custom part into a fresh state', async ({
  browser,
  guardedPage,
}) => {
  await openApp(guardedPage)
  await configureRocket(guardedPage)
  await addTransferPart(guardedPage)
  await guardedPage.getByRole('tab', { name: 'EXPORT' }).click()

  const downloadPromise = guardedPage.waitForEvent('download')
  await guardedPage.getByRole('button', { name: /DOWNLOAD_JSON/ }).click()
  const download = await downloadPromise
  const downloadPath = await download.path()
  expect(downloadPath).toBeTruthy()

  const receiver = await browser.newContext()
  const receiverPage = await receiver.newPage()
  const pageErrors = []
  const consoleErrors = []
  await installDeterministicRouting(receiverPage)
  receiverPage.on('pageerror', (error) => pageErrors.push(error.message))
  receiverPage.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  await openApp(receiverPage)
  await receiverPage.getByRole('tab', { name: 'EXPORT' }).click()
  await receiverPage.getByRole('button', { name: /IMPORT_JSON/ }).click()
  await receiverPage.locator('input[type="file"][accept=".json"]').setInputFiles(downloadPath)
  await receiverPage.getByRole('tab', { name: 'DASHBOARD' }).click()
  await receiverPage.getByRole('button', { name: 'Shock Cord' }).click()
  await expect(receiverPage.getByRole('button', { name: /^E2E Transfer Cord —/ })).toBeVisible()
  await expect(
    receiverPage.getByRole('button', { name: /E2E Transfer Cord.*selected/ })
  ).toBeVisible()
  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
  await receiver.close()
})

test('Dispersion reports fresh, no-result, and stale states', async ({ guardedPage }) => {
  await openApp(guardedPage)
  await guardedPage.getByRole('tab', { name: 'DISPERSION' }).click()
  await expect(guardedPage.getByText('AWAITING_SIMULATION')).toBeVisible()
  await expect(guardedPage.getByText('NO_SIMULATION_DATA')).toBeVisible()

  await configureRocket(guardedPage)
  await configureDispersionProfile(guardedPage)
  await simulate(guardedPage)
  await guardedPage.getByRole('tab', { name: 'DISPERSION' }).click()
  const dispersionPanel = guardedPage.getByRole('tabpanel')
  await expect(dispersionPanel.getByText('DATA_LOADED')).toBeVisible()
  await expect(dispersionPanel.getByText('DISPERSION_MAP // LANDING_PREDICTION')).toBeVisible()
  await expect(dispersionPanel.getByText('Drogue vector')).toBeVisible()
  await expect(dispersionPanel.getByText('Main vector')).toBeVisible()
  await expect(dispersionPanel.getByText(/MC scatter \(500 pts\)/)).toBeVisible()
  const map = dispersionPanel.locator('.leaflet-container')
  await expect(map).toBeVisible()
  await expect.poll(() => map.locator('.leaflet-marker-icon').count()).toBeGreaterThanOrEqual(2)
  await expect.poll(() => map.locator('.leaflet-overlay-pane path').count()).toBeGreaterThan(0)
  const routing = getDeterministicRoutingState(guardedPage)
  await expect
    .poll(() => routing.fulfilledFixtures.some((url) => url.includes('unpkg.com/leaflet@1.9.4')))
    .toBe(true)
  await expect
    .poll(() => routing.fulfilledFixtures.some((url) => url.includes('tile.openstreetmap.org')))
    .toBe(true)

  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await expect(guardedPage.locator('#launch-lat')).toHaveValue('35.3456')
  await expect(guardedPage.locator('#launch-lon')).toHaveValue('-117.8083')
  await guardedPage.locator('#mass').fill('2600')
  await guardedPage.getByRole('tab', { name: 'DISPERSION' }).click()
  await expect(
    guardedPage.getByRole('tabpanel').getByText('RESULT_STALE // RERUN_REQUIRED').first()
  ).toBeVisible()
})

test('print action invokes the browser and checklist reflects current versus stale results', async ({
  guardedPage,
}) => {
  await openApp(guardedPage)
  await configureRocket(guardedPage)
  await simulate(guardedPage)
  await guardedPage.getByRole('tab', { name: 'EXPORT' }).click()
  await guardedPage.evaluate(() => {
    window.__e2ePrintCalls = 0
    window.print = () => {
      window.__e2ePrintCalls += 1
    }
  })
  await guardedPage.getByRole('button', { name: /PRINT_CHECKLIST/ }).click()
  await expect.poll(() => guardedPage.evaluate(() => window.__e2ePrintCalls)).toBe(1)

  await guardedPage.emulateMedia({ media: 'print' })
  const checklist = guardedPage.locator('.print-checklist')
  await expect(checklist).toBeVisible()
  await expect(checklist).toContainText('Apogee')
  await guardedPage.emulateMedia({ media: 'screen' })
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await guardedPage.locator('#mass').fill('2600')
  await guardedPage.emulateMedia({ media: 'print' })
  await expect(checklist).toBeVisible()
  await expect(checklist).toContainText('RESULT_STALE')
})
