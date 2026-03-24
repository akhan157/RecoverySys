# Changelog

All notable changes to RecoverySys are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.1.0.0] - 2026-03-24

### Added
- Inter font as body/UI font (previously system-ui only); loaded via `<link>` to avoid render-blocking CSS `@import`
- Dark mode FOUC prevention — blocking inline script in `<head>` reads `localStorage('recoverysys-theme')` and applies `data-theme="dark"` before first paint
- RecoverySys/DESIGN.md decisions log — 10 entries covering all major design decisions with date and rationale
- New CSS tokens: `--bg-right`, `--input-bg`, `--accent`, `--accent-text`, `--accent-tint`, `--accent-ring`, `--header-bg`, `--header-border`, `--radius`

### Changed
- **Slate palette redesign** — all CSS custom properties updated to the Slate palette: desaturated blue-grey tones replacing warm-grey; dark header `#1a1d23` replaces `#1a1a1a`
- **2-column desktop layout** — left column (Config Builder + Rocket Specs) / right column (Parts Browser + Sim Panel) with distinct background tones
- Category pills updated to use `--accent` token for active state
- Chevron icon (10×10px SVG) replaces `▶` text glyph in manufacturer group headers
- Dark mode toggle touch target increased to 32×32px
- RecoverySys/DESIGN.md synced to Slate palette (was warm-grey stale values from pre-redesign)
- TODOS.md rewritten — phantom FastAPI/Supabase backend items replaced with accurate frontend v2 items (wind model P2, thrust-curve apogee P1, parts catalog tooling P3)

### Fixed
- `--text-tertiary` WCAG AA compliance: `#8c94a3` (3.05:1) → `#636c7e` (5.28:1 on white) in light mode; `#5a6070` (2.79:1) → `#7b8496` (4.66:1 on `#171a1f`) in dark mode
- `--chart-label` and `--chart-marker` WCAG AA compliance: same fix applied to chart axis and event-marker labels
- PartsBrowser `max-height` catalog truncation: `1000px` → `9999px` (Rocketman has 66 parts ≈ 1650px; old value clipped catalog)
- MfrGroup stale open state on category switch: `key={mfr}` → `key={activeCategory + '-' + mfr}` (manufacturer names appear in multiple categories)
- PartsBrowser `onMouseLeave` stale closure: reads `e.currentTarget.getAttribute('aria-pressed')` instead of captured `isSelected` variable to prevent stuck hover styles after part selection
- ConfigSlot empty-state border changed from `1px dashed #ccc` to `1px dashed var(--border-default)` for dark mode compatibility
- RocketSpecs number inputs updated to use `var(--input-bg)` and `var(--border-default)` CSS tokens (was hardcoded `#fff` / `#ddd`)

## [1.0.0.0] - 2026-03-24

### Added
- Complete recovery bay configuration tool for high-power rocketry (HPR)
- Parts Browser with 189 parachutes and recovery components sourced from the OpenRocket database (b2 Rocketry, Fruity Chutes, Rocketman, Top Flight, SkyAngle, and more)
- Config Builder with six slot categories: main chute, drogue chute, shock cord, chute protector, quick links, and chute-mounted device
- Sim Panel with ISA atmospheric model, apogee simulation, descent rate calculation, and landing speed estimate
- Export .ork — generates OpenRocket-compatible `.ork` ZIP files with correct bodytube radius, chute diameters, deploy altitudes, and XML character escaping
- Share Link — encodes full config + rocket specs into a URL `?c=` param; survives roundtrip through Unicode and emoji part names; stays under 8 000 chars
- Save/restore session via localStorage with visible state transitions (idle → saving → saved → idle)
- Restored-session toast on mount when a prior session is found
- Collapsible Parts Browser panel with preference persisted to localStorage
- Compatibility engine — validates packed diameter vs inner diameter, drogue-without-main, and missing airframe OD; surfaces errors as a red dot on the mobile Config tab and CompatDot tooltips in the desktop sidebar
- Mobile tab bar with Parts / Config / Sim tabs and error badge
- DESIGN.md — full design system: color tokens, typography, spacing scale, interaction states, CompatDot system, export and session state machines
- Vitest test suite — 56 tests covering safeTimeout lifecycle, export state machine, share-link codec (Unicode, malformed input, URL length), ork XML escaping, JSZip blob generation, restored-session toast, export button guard, and mobile error badge
- `safeTimeout` utility — timers are tracked in a ref and cleaned up on unmount, so background state updates never fire after the component is gone

### Changed
- All timer callbacks in `App.jsx` now use `safeTimeout`, eliminating a class of unmount-after-timer race conditions
- Export button disabled when `airframe_od_in` is blank (regression: was silently exporting with `|| 4` fallback)
- `×` remove buttons on config slots now have 44×44 px touch targets and `aria-label="Remove {name}"`
- `--text-tertiary` color token raised from `#888` (3.5:1) to `#767676` (4.5:1) to pass WCAG AA contrast

### Fixed
- Export state machine was stuck in `done` state permanently; now resets to `idle` after 3 s via `safeTimeout`
- Part action buttons missing `aria-label` and `aria-pressed` attributes
- SimPanel not passed to mobile tab view when simulation fails
- Deploy-altitude-exceeds-apogee edge case was silently accepted; now shows an error
- Share link XSS guard — decoded payload is now validated before being written to state
- Toast notification IDs are now stable across renders (no jitter)
