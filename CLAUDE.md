# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: RecoverySys

Recovery bay configuration tool for high-power rocketry (HPR). React 18 + Vite SPA. No backend — pure localStorage + URL-encoded share links.

**Version:** 1.2.0.x (see `RecoverySys/VERSION`)

### Key locations

| Path | What |
|------|------|
| `RecoverySys/src/App.jsx` | Root component — state machine, safeTimeout, share link, session restore |
| `RecoverySys/src/lib/simulation.js` | ISA atmospheric model, apogee integration (scalar + thrust curve), descent + drift, Monte Carlo dispersion |
| `RecoverySys/src/lib/engParser.js` | RASP .eng motor file parser (OpenMotor / ThrustCurve / OpenRocket compatible) |
| `RecoverySys/src/lib/compatibility.js` | Compat rules engine — packing, volume, drogue-without-main |
| `RecoverySys/src/lib/format.js` | Shared category-aware part spec formatter |
| `RecoverySys/src/lib/schema.js` | Single source of truth for SPECS shape — `getDefaultSpecs`, `parseSpec` (clamping coercion), `SPEC_KEYS` |
| `RecoverySys/src/lib/migrations.js` | Versioned-payload migrations for localStorage + share links |
| `RecoverySys/src/lib/constants.js` | Frozen state-machine constants + `PHYSICS` block + `VERSION` |
| `RecoverySys/src/data/parts.js` | 233-part catalog (chutes, shock cord, hardware) |
| `RecoverySys/src/components/` | MissionControlLayout (root), PartsBrowser, FlightChart, DispersionMap, CompatDot |
| `RecoverySys/src/test/` | Vitest test suite |
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

- **State:** Single `useReducer` in `App.jsx`, manually persisted to `localStorage` on save (auto-persist is on the rebuild list)
- **safeTimeout:** `useRef` accumulates timer IDs; `useEffect` cleanup prevents stale setState after unmount
- **Share links:** `btoa(encodeURIComponent(JSON.stringify(payload)))` → `?c=` URL param. Payloads include `schemaVersion` for forward/backward compatibility
- **Schema:** `lib/schema.js` is the single source of truth for spec field shape, defaults, units, and clamp ranges. Consumers read user-supplied numeric specs via `parseSpec(key, raw)` so coercion + clamping happens in one place
- **Migrations:** `lib/migrations.js` registers ordered migrators keyed by `from` version. `runMigrations(payload)` walks the chain on every load; share links from a future schema are rejected rather than silently corrupted
- **Parts catalog:** Static JS array in `parts.js`; no backend DB. Catalog lookups match on `(id, category)` because the catalog has historical id collisions between `main_chute` and `drogue_chute` variants
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

## Design System

Always read `DESIGN.md` (project root) before any UI / visual change. It is the
single source of truth for color tokens, typography, spacing, motion timing,
border-radius, and component primitives. `RecoverySys/DESIGN.md` is the
implementation-side companion — token values, component specs, mobile layout,
anti-patterns. When the two disagree, root wins.

UI work rules:
- Use primitives from `components/primitives/` (or extract one when a pattern
  recurs) — never reinvent buttons, inputs, status chips inline.
- No inline `style={{}}` for color, font family, padding, or border-radius.
  Those flow from CSS custom properties via classNames.
- Status → color mapping comes from `lib/statusColor.js`, not inline ternaries.
- When breaking a documented rule for a genuine reason, add a Decisions Log entry
  in DESIGN.md so future readers know it was deliberate.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
