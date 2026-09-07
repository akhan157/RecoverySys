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

async function openApp(page, options = {}) {
  await prepareStorage(page, options)
  const query = new URLSearchParams()
  if (options.demo) query.set('demo', '1')
  if (options.fresh) query.set('fresh', '1')
  const search = query.toString() ? `?${query.toString()}` : ''
  await page.goto(`./${search}`)
  await expect(page.getByRole('tab', { name: 'DASHBOARD' })).toBeVisible()
}

test('guided wizard opens, steps through 6-phase configuration, and completes to dashboard', async ({
  guardedPage,
}) => {
  await openApp(guardedPage, { demo: true })

  // Toggle Guided Wizard
  const guidedBtn = guardedPage.getByRole('button', { name: /guided review/i })
  await expect(guidedBtn).toBeVisible()
  await guidedBtn.click()

  // Step 1: Start & Scope
  await expect(guardedPage.getByText('GUIDED FIRST-PLAN // WIZARD')).toBeVisible()
  await expect(guardedPage.getByText('STEP 01 OF 06 — START & SCOPE')).toBeVisible()

  // Step 2: Rocket & Motor
  await guardedPage.getByRole('button', { name: /CONTINUE/i }).click()
  await expect(guardedPage.getByText('STEP 02 OF 06 — ROCKET & MOTOR')).toBeVisible()

  // Step 3: Recovery Hardware
  await guardedPage.getByRole('button', { name: 'NEXT →' }).click({ force: true })
  await expect(guardedPage.getByText('STEP 03 OF 06 — RECOVERY HARDWARE')).toBeVisible()

  // Step 4: Deploy & Weather
  await guardedPage.getByRole('button', { name: 'NEXT →' }).click({ force: true })
  await expect(guardedPage.getByText('STEP 04 OF 06 — DEPLOY & WEATHER')).toBeVisible()

  // Step 5: Simulate & Review
  await guardedPage.getByRole('button', { name: 'NEXT →' }).click({ force: true })
  await expect(guardedPage.getByText('STEP 05 OF 06 — SIMULATE & REVIEW')).toBeVisible()

  // Step 6: Recovery Brief
  await guardedPage.getByRole('button', { name: 'NEXT →' }).click({ force: true })
  await expect(guardedPage.getByText('STEP 06 OF 06 — RECOVERY BRIEF')).toBeVisible()

  // Return to Dashboard
  await guardedPage.getByRole('button', { name: /OPEN_IN_MISSION_CONTROL/i }).click({ force: true })
  await expect(guardedPage.getByRole('tab', { name: 'DASHBOARD' })).toBeVisible()
})

test('analysis tab displays causality board and result status', async ({ guardedPage }) => {
  await openApp(guardedPage, { demo: true })

  // Navigate to Analysis tab
  await guardedPage.evaluate(() => document.getElementById('mc-tab-analysis')?.click())

  // Verify ResultStatus is present
  await expect(guardedPage.getByText('ESTIMATE / EVIDENCE POSTURE')).toBeVisible()

  // Verify Causality Board is present
  await expect(guardedPage.getByText(/CAUSALITY_REVIEW/)).toBeVisible()
  await expect(guardedPage.getByText('DRIVER:').first()).toBeVisible()
  await expect(guardedPage.getByText('AFFECTED OUTCOME:').first()).toBeVisible()
})

test('export tab offers distinct recovery brief and checklist print actions', async ({
  guardedPage,
}) => {
  await openApp(guardedPage, { demo: true })

  // Navigate to Export tab
  await guardedPage.evaluate(() => document.getElementById('mc-tab-export')?.click())

  // Check both print buttons
  await expect(guardedPage.getByRole('button', { name: /PRINT_RECOVERY_BRIEF/i })).toBeVisible()
  await expect(guardedPage.getByRole('button', { name: /PRINT_CHECKLIST/i })).toBeVisible()

  // Check that the static packing sequence disclaimer exists in the print DOM
  const disclaimer = guardedPage.locator('.print-packing-disclaimer')
  await expect(disclaimer).toContainText('static planning sequence')
})
