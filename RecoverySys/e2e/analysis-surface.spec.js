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

async function prepareStorage(page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('__e2e_storage_initialized')) return
    localStorage.clear()
    localStorage.setItem('recoverysys-visited', '1')
    sessionStorage.setItem('__e2e_storage_initialized', '1')
  })
}

async function openApp(page) {
  await prepareStorage(page)
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

// The standard e2e config (24" main only, no drogue) deterministically yields
// a main-descent-rate error whose review action targets config.main_chute.
test('Analysis first viewport identifies the highest-priority item and opens it', async ({
  guardedPage,
}) => {
  await openApp(guardedPage)
  await configureRocket(guardedPage)
  await simulate(guardedPage)
  await guardedPage.getByRole('tab', { name: 'ANALYSIS' }).click()
  const panel = guardedPage.getByRole('tabpanel')

  await expect(panel.getByText('REVIEW FIRST')).toBeVisible()
  await expect(panel.getByText(/CAUSE → CONSEQUENCE REVIEW/)).toBeVisible()
  // Review summary counts are labelled text (not color-only); the exact count
  // depends on the configured plan, so assert presence of a non-zero value.
  const errorCount = panel.locator('.analysis-review-summary [aria-label^="Errors:"]')
  await expect(errorCount).toBeVisible()
  await expect(errorCount).not.toHaveText('0')
  await expect(panel.getByText('HIGHEST-PRIORITY ACTION')).toBeVisible()
  await expect(panel.locator('[role="status"]')).toContainText(
    /Correct the affected input or replace the referenced part before flight/
  )

  // Tested model response stays per-output; no global influence ranking.
  await expect(panel.getByText('TESTED MODEL RESPONSE // ONE-AT-A-TIME')).toBeVisible()
  await expect(panel.getByText('INFLUENTIAL_INPUTS')).not.toBeVisible()
  await expect(panel.getByText(/not measured confidence intervals/i)).toBeVisible()

  // Keyboard-only row selection opens the detail inspector.
  const rowButton = panel.getByRole('button', {
    name: /Review main_chute affecting/,
  }).first()
  await rowButton.focus()
  await guardedPage.keyboard.press('Enter')
  await expect(panel.getByRole('heading', { name: 'main_chute' })).toBeVisible()
  await expect(panel.getByText(/exceeds \d+ fps/).first()).toBeVisible()
})

test('review action opens the owning surface, focuses the target, and returns to Analysis', async ({
  guardedPage,
}) => {
  await openApp(guardedPage)
  await configureRocket(guardedPage)
  await simulate(guardedPage)
  await guardedPage.getByRole('tab', { name: 'ANALYSIS' }).click()
  const analysisPanel = guardedPage.getByRole('tabpanel')

  // The row carries the direct review action (not the summary duplicate).
  const row = analysisPanel.locator('.analysis-causality-row').first()
  await row
    .getByRole('button', {
      name: /Correct the affected input or replace the referenced part before flight/,
    })
    .click()

  const dashboardPanel = guardedPage.getByRole('tabpanel')
  await expect(dashboardPanel).toHaveAttribute('id', 'mc-panel-dashboard')
  // Destination focuses the affected hardware slot and shows the return path.
  await expect(guardedPage.locator('[data-slot="main_chute"]')).toBeFocused()
  await expect(guardedPage.getByRole('button', { name: 'Return to Analysis' })).toBeVisible()

  await guardedPage.getByRole('button', { name: 'Return to Analysis' }).click()
  await expect(guardedPage.getByRole('tabpanel')).toHaveAttribute('id', 'mc-panel-analysis')
  await expect(guardedPage.getByRole('tab', { name: 'ANALYSIS' })).toBeFocused()
})

test('changing an input makes Analysis stale; rerunning restores the updated board', async ({
  guardedPage,
}) => {
  await openApp(guardedPage)
  await configureRocket(guardedPage)
  await simulate(guardedPage)
  await guardedPage.getByRole('tab', { name: 'ANALYSIS' }).click()
  const panel = guardedPage.getByRole('tabpanel')
  const estimatesBefore = await panel.locator('.mc-analysis__estimates').textContent()

  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await guardedPage.locator('#mass').fill('2600')
  await guardedPage.getByRole('tab', { name: 'ANALYSIS' }).click()
  const stalePanel = guardedPage.getByRole('tabpanel')
  await expect(stalePanel.getByText('Stale').first()).toBeVisible()
  await expect(stalePanel.getByText(/no longer matches the active inputs/i)).toBeVisible()
  await expect(stalePanel.getByRole('button', { name: 'Rerun simulation' })).toBeVisible()
  await expect(stalePanel.getByText(/CAUSE → CONSEQUENCE REVIEW/)).not.toBeVisible()

  // The strip's rerun action lands on Simulation with the run control focused.
  await stalePanel.getByRole('button', { name: 'Rerun simulation' }).click()
  await expect(guardedPage.getByRole('tabpanel')).toHaveAttribute('id', 'mc-panel-simulation')
  await expect(guardedPage.getByRole('button', { name: /RUN_SIMULATION/ })).toBeFocused()
  await guardedPage.getByRole('button', { name: /RUN_SIMULATION/ }).click()
  await expect(guardedPage.getByText('APOGEE_ALTITUDE')).toBeVisible()

  await guardedPage.getByRole('tab', { name: 'ANALYSIS' }).click()
  const rerunPanel = guardedPage.getByRole('tabpanel')
  await expect(rerunPanel.getByText(/CAUSE → CONSEQUENCE REVIEW/)).toBeVisible()
  await expect(rerunPanel.getByRole('button', { name: 'Rerun simulation' })).not.toBeVisible()
  const estimatesAfter = await rerunPanel.locator('.mc-analysis__estimates').textContent()
  expect(estimatesAfter).not.toBe(estimatesBefore)
})

test('no-result Analysis offers a run action and keeps the board empty', async ({
  guardedPage,
}) => {
  await openApp(guardedPage)
  await guardedPage.getByRole('tab', { name: 'ANALYSIS' }).click()
  const panel = guardedPage.getByRole('tabpanel')
  await expect(panel.getByText('Not run').first()).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Run simulation' })).toBeVisible()
  await expect(panel.getByText(/CAUSE → CONSEQUENCE REVIEW/)).not.toBeVisible()

  await panel.getByRole('button', { name: 'Run simulation' }).click()
  await expect(guardedPage.getByRole('tabpanel')).toHaveAttribute('id', 'mc-panel-simulation')
})

test('Analysis stays keyboard-usable with reduced motion and no clipped primary actions', async ({
  guardedPage,
}) => {
  await guardedPage.emulateMedia({ reducedMotion: 'reduce' })
  await openApp(guardedPage)
  await configureRocket(guardedPage)
  await simulate(guardedPage)
  await guardedPage.getByRole('tab', { name: 'ANALYSIS' }).click()
  const panel = guardedPage.getByRole('tabpanel')

  await expect(panel.getByText('REVIEW FIRST')).toBeVisible()
  // The highest-priority action is reachable without horizontal clipping on
  // the constrained desktop and Pixel 5 viewports (both projects run this
  // spec); the surface scrolls vertically by design.
  const priorityAction = panel.getByText('HIGHEST-PRIORITY ACTION')
  await priorityAction.scrollIntoViewIfNeeded()
  await expect(priorityAction).toBeVisible()

  const rowButton = panel.getByRole('button', {
    name: /Review main_chute affecting/,
  }).first()
  await rowButton.focus()
  await guardedPage.keyboard.press('Enter')
  await expect(panel.getByRole('heading', { name: 'main_chute' })).toBeVisible()
})
