# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: RecoverySys

Recovery bay configuration tool for high-power rocketry (HPR). React 18 + Vite SPA. No backend — pure localStorage + URL-encoded share links.

**Version:** 1.1.0.0 (see `RecoverySys/VERSION`)

### Key locations

| Path | What |
|------|------|
| `RecoverySys/src/App.jsx` | Root component — state machine, safeTimeout, share link, session restore |
| `RecoverySys/src/lib/ork.js` | OpenRocket `.ork` export (JSZip + XML generation) |
| `RecoverySys/src/lib/simulation.js` | ISA atmospheric model, apogee heuristic, descent/drift calc |
| `RecoverySys/src/lib/compatibility.js` | Compat rules engine — packing, volume, drogue-without-main |
| `RecoverySys/src/data/parts.js` | 189-part catalog (chutes, altimeters, misc recovery) |
| `RecoverySys/src/components/` | ConfigSlot, PartsBrowser, SimPanel, FlightChart, CompatDot |
| `RecoverySys/src/test/` | Vitest test suite (56 tests) |
| `RecoverySys/DESIGN.md` | Design system — color tokens, typography, spacing, interaction states |
| `RecoverySys/TODOS.md` | Deferred v2 work items |
| `DESIGN.md` | Full design system reference (authoritative) |
| `TESTING.md` | Test conventions and philosophy |

### Build & run

```bash
cd RecoverySys
npm install
npm run dev        # start dev server at localhost:5173
npm run build      # production build → dist/
npm test           # run tests once
npm run test:watch # watch mode
```

### Architecture

- **State:** Single `useReducer` in `App.jsx`, persisted to `localStorage` on every change
- **safeTimeout:** `useRef` accumulates timer IDs; `useEffect` cleanup prevents stale setState after unmount
- **Share links:** `btoa(encodeURIComponent(JSON.stringify(config)))` → `?c=` URL param
- **Parts catalog:** Static JS array in `parts.js`; no backend DB
- **Testing:** Vitest v3 + @testing-library/react + jsdom; fake timers + `flushPromises` pattern for async component tests

## gstack

For all web browsing, use the `/browse` skill from gstack. Never use `mcp__claude-in-chrome__*` tools directly.

Available gstack skills:
- `/office-hours` — async Q&A and advisory sessions
- `/plan-ceo-review` — prepare plan for CEO review
- `/plan-eng-review` — prepare plan for engineering review
- `/plan-design-review` — prepare plan for design review
- `/design-consultation` — get design feedback
- `/review` — code review
- `/ship` — ship a change
- `/land-and-deploy` — land and deploy a change
- `/canary` — canary deployment
- `/benchmark` — run benchmarks
- `/browse` — web browsing (use this for ALL web browsing)
- `/qa` — QA testing
- `/qa-only` — QA only (no shipping)
- `/design-review` — design review
- `/setup-browser-cookies` — configure browser cookies
- `/setup-deploy` — configure deployment
- `/retro` — retrospective
- `/investigate` — investigate an issue
- `/document-release` — document a release
- `/codex` — codex tasks
- `/careful` — careful/cautious mode
- `/freeze` — freeze deployments
- `/guard` — guard mode
- `/unfreeze` — unfreeze deployments
- `/gstack-upgrade` — upgrade gstack

If gstack skills aren't working, run `cd .claude/skills/gstack && ./setup` to build the binary and register skills.
