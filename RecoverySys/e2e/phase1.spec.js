import { test as base, expect } from '@playwright/test'
import { installDeterministicRouting } from './support/deterministicRouting.js'

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
  await expect(page.locator('.s-header')).toHaveCount(0)
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
  await expect(page.getByText('RESULT_STALE // RERUN_REQUIRED')).toHaveCount(0)
}

test('mount removes the production skeleton and preserves live tab navigation', async ({
  guardedPage,
}) => {
  await openApp(guardedPage)

  const panels = [
    ['ROCKET_SPECS', 'ROCKET_SPECS'],
    ['SIMULATION', 'FLIGHT_PROFILE // ALT_vs_TIME'],
    ['ANALYSIS', 'NO_SIMULATION_DATA'],
    ['DISPERSION', 'NO_SIMULATION_DATA'],
    ['EXPORT', 'EXPORT // SHARE_CONFIGURATION'],
    ['FLIGHT_LOG', 'FLIGHT_LOG'],
    ['DASHBOARD', 'BAY_SCHEMATIC'],
  ]
  for (const [tab, panel] of panels) {
    await guardedPage.getByRole('tab', { name: tab }).click()
    await expect(guardedPage.getByRole('tabpanel').getByText(panel, { exact: false })).toBeVisible()
  }
})

test('explicit demo and first-visit bootstrap show a sample and can start fresh', async ({
  guardedPage,
}) => {
  await prepareStorage(guardedPage, { firstVisit: true })
  await guardedPage.goto('./?demo=1')
  await expect(guardedPage.getByRole('status')).toContainText('DEMO')
  await expect(guardedPage.getByText('APOGEE_ALTITUDE')).toBeVisible()
  await guardedPage.getByRole('button', { name: /START_FRESH/ }).click()
  await expect(guardedPage.getByRole('status')).toHaveCount(0)

  await guardedPage.reload()
  await expect(guardedPage.getByRole('status')).toHaveCount(0)
  await expect(guardedPage.getByText('NO_COMPONENT_LOADED').first()).toBeVisible()
})

test('first visit without saved state bootstraps demo mode', async ({ guardedPage }) => {
  await openApp(guardedPage, { firstVisit: true })
  await expect(guardedPage.getByRole('status')).toContainText('DEMO')
  await expect(guardedPage.getByText('APOGEE_ALTITUDE')).toBeVisible()
})

test('configuration simulates, becomes stale after input change, and reruns', async ({
  guardedPage,
}) => {
  await openApp(guardedPage)
  await configureRocket(guardedPage)
  await simulate(guardedPage)

  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await guardedPage.locator('#mass').fill('2600')
  await guardedPage.getByRole('tab', { name: 'SIMULATION' }).click()
  await expect(guardedPage.getByText('RESULT_STALE // RERUN_REQUIRED')).toBeVisible()
  await guardedPage.getByRole('button', { name: /RUN_SIMULATION/ }).click()
  await expect(guardedPage.getByText('RESULT_STALE // RERUN_REQUIRED')).toHaveCount(0)
})

test('Compare preserves Config A while editing B in Specs and recovers after rerun', async ({
  guardedPage,
}) => {
  await openApp(guardedPage)
  await configureRocket(guardedPage)

  await guardedPage.getByRole('tab', { name: 'COMPARE' }).click()
  await guardedPage.getByRole('button', { name: /SAVE_AS_CONFIG_A/ }).click()
  await expect(guardedPage.getByRole('alert')).toContainText('No current-B simulation available')

  await simulate(guardedPage)
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await guardedPage.locator('#mass').fill('2600')
  await guardedPage.getByRole('tab', { name: 'COMPARE' }).click()
  await expect(guardedPage.getByText('Config A saved at')).toBeVisible()
  await expect(guardedPage.getByRole('alert')).toContainText('Current-B simulation is stale')
  await guardedPage.getByRole('tab', { name: 'SIMULATION' }).click()
  await guardedPage.getByRole('button', { name: /RUN_SIMULATION/ }).click()
  await expect(guardedPage.getByText('RESULT_STALE // RERUN_REQUIRED')).toHaveCount(0)
  await guardedPage.getByRole('tab', { name: 'COMPARE' }).click()
  await expect(guardedPage.getByRole('alert')).toHaveCount(0)
  await expect(guardedPage.getByText('Config A saved at')).toBeVisible()
})

test('saved configuration persists and share link loads in a fresh receiver context', async ({
  browser,
  guardedPage,
}) => {
  await openApp(guardedPage)
  await configureRocket(guardedPage)
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await guardedPage.getByRole('button', { name: /Save Config/ }).click()
  await expect(guardedPage.getByRole('button', { name: /Saved/ })).toBeVisible()
  await guardedPage.reload()
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await expect(guardedPage.locator('#mass')).toHaveValue('2500')

  await guardedPage.getByRole('button', { name: /Copy Share Link/ }).click()
  await expect
    .poll(() => guardedPage.evaluate(() => navigator.clipboard.readText()))
    .toContain('/RecoverySys/?c=')
  const shareUrl = await guardedPage.evaluate(() => navigator.clipboard.readText())
  expect(shareUrl).toContain('/RecoverySys/?c=')

  const receiver = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
  const receiverPage = await receiver.newPage()
  const receiverRouting = await installDeterministicRouting(receiverPage)
  const receiverErrors = []
  receiverPage.on('pageerror', (error) => receiverErrors.push(error.message))
  receiverPage.on('console', (message) => {
    if (message.type() === 'error') receiverErrors.push(message.text())
  })
  await receiverPage.goto(shareUrl)
  await expect(receiverPage.getByRole('tab', { name: 'ROCKET_SPECS' })).toBeVisible()
  await receiverPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await expect(receiverPage.locator('#mass')).toHaveValue('2500')
  await receiverPage.goto('https://example.com/share-receiver-probe').catch(() => {})
  await expect
    .poll(() => receiverRouting.blockedThirdPartyRequests)
    .toContain('https://example.com/share-receiver-probe')
  expect(receiverErrors).toEqual([])
  await receiver.close()
})

test('JSON import rejects invalid input without changing the app', async ({ guardedPage }) => {
  await openApp(guardedPage)
  await guardedPage.getByRole('tab', { name: 'EXPORT' }).click()
  const dialogPromise = guardedPage.waitForEvent('dialog')
  await guardedPage.locator('input[type="file"]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{not valid json'),
  })
  const dialog = await dialogPromise
  expect(dialog.message()).toContain('Failed to parse config file')
  await dialog.dismiss()
  await expect(guardedPage.getByText('EXPORT // SHARE_CONFIGURATION')).toBeVisible()
})

test('flight log entry persists across reload', async ({ guardedPage }) => {
  await openApp(guardedPage)
  await guardedPage.getByRole('tab', { name: 'FLIGHT_LOG' }).click()
  await guardedPage.getByLabel('Location').fill('FAR Mojave')
  await guardedPage.getByLabel('Notes').fill('Baseline flight-log entry')
  await guardedPage.getByRole('button', { name: /LOG_FLIGHT/ }).click()
  await expect(guardedPage.getByText('Baseline flight-log entry')).toBeVisible()
  await guardedPage.reload()
  await guardedPage.getByRole('tab', { name: 'FLIGHT_LOG' }).click()
  await expect(guardedPage.getByText('Baseline flight-log entry')).toBeVisible()
})
