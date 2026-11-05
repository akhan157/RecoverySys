# Testing

## Framework

- **Vitest 4** + **@testing-library/react** + **jsdom** for unit and component tests (`src/test/`)
- **Playwright** for production-artifact browser workflows (`RecoverySys/e2e/`)

## Running tests

```bash
cd RecoverySys
npm test              # unit + component, once
npm run test:watch    # unit + component, watch mode
npx playwright install chromium
npm run e2e           # builds and runs browser workflows (desktop + Pixel 5)
```

`npm run check` runs formatting, catalog/corpus validation, lint, unit tests, the
production build, and `verify:build` (version label, referenced assets, landing
and favicon). `npm run e2e` rebuilds first; `E2E_ARTIFACT_ONLY=1` reuses an
already-built `dist/` (CI uses that mode to test the exact deployed artifact).

`npm run verify:pages` checks a published build: version brand, all ten
pre-hydration tabs, asset availability, and current landing CTA/footer bundle.
It defaults to the public Pages URL; set `PAGES_URL` to verify a local preview.
The Pages workflow runs it after deployment.

## Test layers

| Layer | What | Where | When |
|-------|------|-------|------|
| Unit | Pure functions (simulation math, compatibility, payload boundaries) | `src/test/*.test.js` | Every commit |
| Component | React components and hooks | `src/test/*.test.jsx` | When UI or hooks change |
| E2E | Production desktop/mobile workflows, storage, transfer, print, maps | `e2e/*.spec.js` | Before release; `npm run check` plus `npm run e2e` |

## Conventions

- Files: `src/test/<module>.test.js` (or `.test.jsx` for components)
- Assertions: `expect(x).toBe(y)` — always assert the real value, never just `toBeDefined()`
- Mocking: mock external dependencies (localStorage, network) explicitly
- Regression test attribution:
  ```js
  // Regression: ISSUE-NNN — what broke
  // Found by /qa on YYYY-MM-DD
  ```

## Test expectations

- Cover behavior, boundaries, invariants, transitions, and error paths; coverage
  percentage is not a release gate.
- When writing new functions → add a corresponding test.
- When fixing a bug → add a regression test that fails before the fix.
- When adding error handling → add a test that triggers the error.
- When adding an if/else → add tests for both paths.
- Never commit code that makes existing tests fail.

## 1.3 qualification matrix (2026-11-05)

Supported majors are Node 22, 24 and 26. CI runs the full check independently
on all three; browser and portable jobs use Node 22. Vitest uses two workers
because XML corpus/component suites are memory-heavy; fixture timeouts remain
unchanged. A passing latest patch run does not imply every older patch has been
individually exercised.

`e2e/full-parity.spec.js` includes a fresh-context matrix for JSON, share-link and
saved-reload transfers, regenerated estimates, findings, both print modes,
model/input identity, stale withholding and candidate evidence. The full suite
also covers custom motors/parts, OpenRocket source identity, invalid payloads,
Flight Log deduplication and preserved corrupt storage. These automated Linux
browser workflows do not close manual Windows/macOS or observed-user gates.
