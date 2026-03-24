# Testing

## Philosophy

100% test coverage is the key to great vibe coding. Tests let you move fast, trust your instincts, and ship with confidence — without them, vibe coding is just yolo coding. With tests, it's a superpower.

## Framework

**Vitest v4** + **@testing-library/react** + **jsdom**

## Running Tests

```bash
cd RecoverySys
npm test          # run once
npm run test:watch  # watch mode
```

## Test Layers

| Layer | What | Where | When |
|-------|------|-------|------|
| Unit | Pure functions (simulation math, compatibility rules) | `src/test/*.test.js` | Every commit |
| Component | React components | `src/test/*.test.jsx` | When UI components change |

## Conventions

- Files: `src/test/<module>.test.js` (or `.test.jsx` for components)
- Assertions: `expect(x).toBe(y)` — always assert the real value, never just `toBeDefined()`
- Mocking: mock all external dependencies (localStorage, etc.)
- Regression test attribution:
  ```js
  // Regression: ISSUE-NNN — what broke
  // Found by /qa on YYYY-MM-DD
  ```

## Test Expectations

- 100% test coverage is the goal
- When writing new functions → write a corresponding test
- When fixing a bug → write a regression test
- When adding error handling → write a test that triggers the error
- When adding an if/else → write tests for BOTH paths
- Never commit code that makes existing tests fail
