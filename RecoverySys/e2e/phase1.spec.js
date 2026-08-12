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
  await page.getByRole('tab', { name: 'DASHBOARD' }).click()
  await expect(page.locator('.s-header')).toHaveCount(0)
}

async function openGuidedReview(page) {
  await prepareStorage(page)
  await page.goto('./')
  await page.getByRole('tab', { name: 'GUIDED_REVIEW' }).click()
  await expect(
    page.getByRole('heading', { name: /set the scope of your first plan/i })
  ).toBeVisible()
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
  await expect(page.getByText(/RESULT_STALE/)).toHaveCount(0)
}

test('mount removes the production skeleton and preserves live tab navigation', async ({
  guardedPage,
}) => {
  await openApp(guardedPage)

  const panels = [
    ['ROCKET_SPECS', 'ROCKET_SPECS'],
    ['SIMULATION', 'FLIGHT_PROFILE // ALT_vs_TIME'],
    ['ANALYSIS', 'NO_CURRENT_RESULT'],
    ['DISPERSION', 'NO_CURRENT_RESULT'],
    ['RECOVERY_BRIEF', 'Recovery Brief'],
    ['EXPORT', 'EXPORT // SHARE_CONFIGURATION'],
    ['FLIGHT_LOG', 'FLIGHT_LOG'],
    ['DASHBOARD', 'BAY_SCHEMATIC'],
  ]
  for (const [tab, panel] of panels) {
    await guardedPage.getByRole('tab', { name: tab }).click()
    await expect(
      guardedPage.getByRole('tabpanel').getByText(panel, { exact: false }).first()
    ).toBeVisible()
  }
})

test('confidence posture is visible without implying validation or approval', async ({
  guardedPage,
}) => {
  await openApp(guardedPage)
  const posture = guardedPage.getByLabel('Insufficient confidence').first()
  await expect(posture).toContainText('Insufficient confidence')
  await expect(posture).toContainText('No current simulation result is available yet')
  await expect(posture).toContainText(/safety approval.*certification/i)
  await expect(posture).not.toContainText('Supported')
})

test('guided first-plan branches preserve state, reject invalid imports, and support keyboard steps', async ({
  guardedPage,
}) => {
  await openGuidedReview(guardedPage)
  await expect(guardedPage.getByRole('button', { name: /resume this plan/i })).toBeDisabled()

  await guardedPage.getByRole('button', { name: /start a new plan/i }).click()
  await expect(guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  await guardedPage.getByRole('tab', { name: 'GUIDED_REVIEW' }).click()

  await guardedPage.getByRole('button', { name: /import a plan/i }).click()
  await expect(guardedPage.getByText('EXPORT // SHARE_CONFIGURATION')).toBeVisible()
  const invalidDialog = guardedPage.waitForEvent('dialog')
  await guardedPage.locator('input[type="file"][accept=".json"]').setInputFiles({
    name: 'invalid-guided-plan.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{not valid json'),
  })
  const dialog = await invalidDialog
  expect(dialog.message()).toContain('Failed to parse config file')
  await dialog.dismiss()

  await guardedPage.getByRole('tab', { name: 'GUIDED_REVIEW' }).click()
  await expect(
    guardedPage.getByRole('heading', { name: /set the scope of your first plan/i })
  ).toBeVisible()
  await expect(guardedPage.getByRole('button', { name: /resume this plan/i })).toBeDisabled()

  await guardedPage.evaluate(() => {
    localStorage.setItem(
      'recoverysys-config',
      JSON.stringify({
        config: { main_chute: { id: 'cl-24-n' } },
        specs: { rocket_mass_g: '2500', motor_total_impulse_ns: '640' },
      })
    )
  })
  await guardedPage.reload()
  await guardedPage.getByRole('tab', { name: 'GUIDED_REVIEW' }).click()
  await expect(guardedPage.getByRole('button', { name: /resume this plan/i })).toBeEnabled()
  await guardedPage.getByRole('button', { name: /resume this plan/i }).click()
  await expect(guardedPage.getByRole('tab', { name: 'DASHBOARD' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  await guardedPage.getByRole('tab', { name: 'GUIDED_REVIEW' }).click()

  const resultsStep = guardedPage.getByRole('button', { name: 'RESULTS' })
  await resultsStep.focus()
  await guardedPage.keyboard.press('Enter')
  await expect(guardedPage.getByRole('heading', { name: /review results by scope/i })).toBeVisible()
  const methodStep = guardedPage.getByRole('button', { name: 'METHOD & ASSUMPTIONS' })
  await methodStep.focus()
  await guardedPage.keyboard.press('Enter')
  await expect(guardedPage.getByRole('heading', { name: /method & assumptions/i })).toBeVisible()
})

test('guided results preserve insufficient evidence posture and stale currentness', async ({
  guardedPage,
}) => {
  await prepareStorage(guardedPage)
  await guardedPage.goto('./?demo=1')
  await guardedPage.getByRole('tab', { name: 'GUIDED_REVIEW' }).click()
  await guardedPage.getByRole('button', { name: 'RESULTS' }).click()
  const guided = guardedPage.locator('.guided-review')
  await expect(guided.getByText('CURRENT RESULT')).toBeVisible()
  await expect(guided.getByText('Insufficient confidence.', { exact: true })).toBeVisible()
  await expect(guided.getByText(/no accepted comparison or flight evidence/i)).toBeVisible()
  await expect(guided.getByText(/safety, approval, certification/i)).toBeVisible()

  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await guardedPage.locator('#mass').fill('12000')
  await guardedPage.getByRole('tab', { name: 'GUIDED_REVIEW' }).click()
  await guardedPage.getByRole('button', { name: 'RESULTS' }).click()
  await expect(guided.getByText('STALE RESULT')).toBeVisible()
  await expect(guided.getByText(/no accepted comparison or flight evidence/i)).toBeVisible()
})

test('analysis shows deterministic sensitivity ranges and uncertainty boundary', async ({
  guardedPage,
}) => {
  await openApp(guardedPage)
  await configureRocket(guardedPage)
  await simulate(guardedPage)
  await guardedPage.getByRole('tab', { name: 'ANALYSIS' }).click()
  const panel = guardedPage.getByRole('tabpanel')
  await expect(panel.getByText('TESTED MODEL RESPONSE // ONE-AT-A-TIME')).toBeVisible()
  await expect(panel.getByText('INFLUENTIAL_INPUTS')).not.toBeVisible()
  await expect(panel.getByText(/not measured confidence intervals/i)).toBeVisible()
})

test('hardware review exposes unverified provenance and actionable warning metadata', async ({
  guardedPage,
}) => {
  await openApp(guardedPage)
  await configureRocket(guardedPage)
  await expect(guardedPage.getByText(/CATALOG DATA · UNVERIFIED/).first()).toBeVisible()
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await expect(guardedPage.getByText(/COMPATIBILITY_REVIEW/)).toBeVisible()
  await expect(guardedPage.getByText(/Acknowledgement records review only/)).toBeVisible()
})

test('explicit demo and first-visit bootstrap show a sample and can start fresh', async ({
  guardedPage,
}) => {
  await prepareStorage(guardedPage, { firstVisit: true })
  await guardedPage.goto('./?demo=1')
  await expect(guardedPage.getByRole('status')).toContainText('DEMO')
  await guardedPage.getByRole('tab', { name: 'DASHBOARD' }).click()
  await expect(guardedPage.getByText('APOGEE_ALTITUDE')).toBeVisible()
  await guardedPage.getByRole('button', { name: /START_FRESH/ }).click()
  await guardedPage.getByRole('tab', { name: 'DASHBOARD' }).click()
  await guardedPage.reload()
  await expect(guardedPage.getByRole('status')).toHaveCount(0)
  await guardedPage.getByRole('tab', { name: 'DASHBOARD' }).click()
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
  await expect(guardedPage.getByText(/RESULT_STALE/).first()).toBeVisible()
  await guardedPage.getByRole('button', { name: /RUN_SIMULATION/ }).click()
  await expect(guardedPage.getByText(/RESULT_STALE/)).toHaveCount(0)
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
  await expect(guardedPage.getByText(/RESULT_STALE/)).toHaveCount(0)
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
