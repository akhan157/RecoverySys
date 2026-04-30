# Changelog

All notable changes to RecoverySys are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- **`lib/schema.js`** — single source of truth for the SPECS object shape. Exports `SPECS_SCHEMA` (per-field type, unit, default, label, min/max), `getDefaultSpecs()`, `SPEC_KEYS`, `coerceSpec()`, and `parseSpec()` (coerce + clamp to schema range). Future field changes are a one-file edit instead of a six-file scavenger hunt.
- **`lib/migrations.js`** — versioned payload migrations. `runMigrations(payload)` walks ordered migrators keyed by `from` version; share links from a newer schema are rejected via `isPayloadFromFuture()` rather than silently corrupting fields.
- **Schema-versioned persisted payloads** — both localStorage CONFIG and share links now include `schemaVersion` so future schema changes are detectable on load.
- **`PHYSICS` constants block** in `lib/constants.js` — single source of truth for `G`, `LBS_PER_N`, `FT_PER_M`, `M_PER_FT`, `IN_TO_M`, `MPH_TO_FPS`, `J_TO_FTLBF`. Plus `VERSION`/`VERSION_DISPLAY` exports.
- **Custom motor `.eng` import** — HPR builders using OpenMotor (or any RASP `.eng` source: ThrustCurve.org downloads, OpenRocket exports) can now import their motor's thrust curve directly. New "+ Import Custom Motor (.eng)" button in the SPECS tab opens a file picker, parses the header and thrust samples, and shows a preview card with designation, diameter×length, propellant/total mass, total impulse, burn time, peak thrust, and a mini sparkline of the curve shape. Confirming injects the motor into state and auto-populates the Motor Impulse / Burn Time scalar fields.
- **Thrust curve integration in `integrateAscent`** — when a custom motor is active, the powered-phase integrator interpolates thrust at each timestep (50 ms) instead of using a constant average. Apogee accuracy improves from ±10-15% (scalar) to ±3-5% (curve). New `apogee_method: 'integrated-curve'` surfaces in the dashboard.
- **`parseEng(text)`** — new pure function in `src/lib/engParser.js` that parses RASP `.eng` files: normalizes line endings (CRLF/CR/LF), strips comments, validates the 7-field header, enforces chronological + terminal-zero curve, computes trapezoidal total impulse, burn time (last non-zero sample), and peak thrust. Rejects malformed input with specific error messages. 20 unit tests.
- **`interpolateThrust(t, curve)`** — new export from `simulation.js`: linear interpolation between thrust samples, returns 0 past burnout, null/empty curve safe.
- **Custom motor persistence** — `customMotor` survives localStorage save/load and round-trips through share links (base64 payload grows ~2-5 KB per curve, still well under practical URL limits).

### Changed
- `runSimulation({ specs, config })` now accepts an optional `customMotor` parameter. Backwards compatible — omitting the param keeps the scalar `integrated` path.
- `integrateAscent` signature extended with optional `curve` and `propMass_kg_override` parameters. When `propMass_kg_override` is provided (from an imported motor's measured propellant mass), it's used instead of the Isp heuristic.
- **`ejection_g_factor` handling unified across `compatibility.js`, `simulation.js`, and `SuggestPanel.jsx`** via `parseSpec`. Previously the three files disagreed on what to do with negative input — sim clamped `-50` to 1, compatibility fell back to 20G, SuggestPanel used `-50` directly. All three now route through `parseSpec` which returns `null` for ≤0, letting consumers fall through to the same auto-default (20G for <10kg, 30G for ≥10kg).
- **Catalog lookups now match on `(id, category)`** in `App.jsx` and `lib/shareLink.js` — prevents the 20 historical ID collisions between `main_chute` and `drogue_chute` variants from silently rehydrating the wrong part on share-link decode.
- **UI brand badge** reads `VERSION_DISPLAY` from `constants.js` instead of a hardcoded `RECOVERYSYS_V1.1` literal.

### Fixed
- **Landing page scroll** — removed `html, body { height: 100% }` from `landing/assets/colors_and_type.css` that was making body a fixed-height scroll container competing with Lenis's window scroller. Wheel events were captured but the page never moved.
- **`engParser` now strips `;` inline comments anywhere on a line** (per the RASP spec — previously only handled full-line comments).
- **Leaflet CSS** loaded from CDN now has SRI integrity attribute + `crossorigin=anonymous` to fail closed if the CDN is compromised.
- **`MissionControlLayout` status bar** now shows the WARNING badge when `hasWarnings && !hasErrors` (previously fell through to NOMINAL — silent error suppression).
- **Tooltip on `CompatDot`** uses `whiteSpace: 'pre-line'` so multi-warning messages joined by `\n` render on separate lines instead of collapsing to spaces.
- **`MotorSearch`** validates `data.results` is an array before `setResults` (was `data.results ?? []`).
- **`PrintChecklist`** uses `WARN_LEVELS.ERROR` constant instead of magic string literal `'error'`.

### Removed
- **`lib/engineApi.js`** — 229-line module deleted. Had zero callers in `src/` (was a future-Python-engine integration that was never wired up). Reading an attacker-controllable URL from `localStorage('recoverysys-engine-url')` and POSTing config data to it was a real exfiltration vector with no rent-paying use.
- **`flight_computer` and `battery` cases in `format.js`** — neither category exists in the parts catalog.

### Security
- Share-link decoder now rejects payloads from a newer `schemaVersion` rather than silently dropping fields the receiver doesn't understand.

## [1.2.0.0] - 2026-04-09

### Added
- **ThrustCurve motor search** — live search field in Rocket Specs queries ThrustCurve.org API; selecting a motor auto-fills total impulse and burn time; AbortController prevents stale results from overwriting fresh ones
- **Suggest Parts panel** — collapsible panel above SimPanel ranks main chutes, drogue chutes, and shock cords against user-specified target descent rates; "Use" button applies the part in one click
- **Dispersion Map** — Leaflet-powered interactive map shows predicted landing zone given wind speed/direction and launch coordinates; drift distance, compass bearing, and ±20% uncertainty circle displayed
- **Shock cord load analysis** — `computeShockLoad()` calculates peak ejection force, safety factor (material-tiered: nylon ≥4×, Kevlar ≥8×), and strain energy absorbed; displayed in SimPanel after each simulation run
- **Wind direction and launch coordinates** in Rocket Specs — `wind_direction_deg` (meteorological convention), `launch_lat`, `launch_lon`; enable the dispersion map landing prediction
- `computeDrift()` exported from `simulation.js` — Great Circle landing coordinate prediction from apogee, descent rates, and wind vector

### Changed
- `computeDescentRate()` density-corrects at actual deployment altitude (main at deploy\_ft, drogue at mid-phase average) — descent rates at high-altitude sites are now faster and more accurate
- Deployment bag and swivel packed heights now count toward bay volume utilization
- Tiered harness length minimums added to compatibility engine (5 ft L1, 10 ft L2, 15 ft L3)
- `bearing_deg` in `computeDrift` is `null` when wind direction is unspecified — prevents the map from defaulting to a misleading due-north bearing

### Fixed
- `airframe_od_in` → `airframe_id_in` field rename migrated automatically on load — returning users' saved configs and share links work without re-entry
- `computeShockLoad` now returns `null` for zero or negative G-factor inputs (safety-critical guard against silent PASS rating)
- MotorSearch `clear()` now aborts any in-flight ThrustCurve request — prevents stale API responses from reopening the dropdown after clear
- MotorSearch validates ThrustCurve API fields (`totImpulseNs`, `burnTimeS`) before writing to state — corrupted API records no longer silently set spec fields to `NaN`
- Leaflet map calls `invalidateSize()` when overlays update — tiles now render correctly when launch coordinates are entered after the map panel is first opened
- Dispersion stats bar hides the Main phase row when no main chute drift is computed (was showing "0 ft / 0s" misleadingly)
- MotorSearch debounce timer and in-flight fetch now cancelled on component unmount — prevents `setState` calls on unmounted component

## [1.1.1.0] - 2026-03-25

### Added
- Custom parachute builder — add, select, and delete custom chutes (name, diameter, Cd, packed dims, weight) stored in `localStorage` under `recoverysys-custom-parts`; appear in a dedicated CUSTOM group above catalog entries in the PartsBrowser
- Deployment bag and swivel parts catalog entries (21 new parts); deployment bag packing check and swivel ejection-load check in compatibility engine
- Ejection G-factor input in RocketSpecs — overrides the auto-default (20G L1/L2, 30G L3); applied to shock cord, quick link, and swivel load checks
- Bay obstruction input in RocketSpecs — reserves inches for hardpoints and electronics sleds; deducted from usable bay before volume check
- Descent rate warning tier — warn at 15–20 fps ("consider a larger chute") in addition to the existing error at >20 fps
- Drogue descent rate check — warn if drogue is slower than 30 fps (excessive drift) or faster than 150 fps (high ejection shock)
- Numerical ascent integration in `simulation.js` — `integrateAscent()` provides ±10–15% apogee accuracy when burn time is supplied (vs ±30% heuristic); full ascent trajectory for chart rendering
- BURN/APOG/MAIN/LDG flight event markers on FlightChart
- ISA density-corrected descent rates — `computeDescentRate()` now accounts for actual deployment altitude rather than sea-level density
- Chute-mounted device altitude range check (e.g., Jolly Logic Chute Release max programmable altitude)
- Tiered bridle/harness length minimums — 5 ft L1, 10 ft L2, 15 ft L3
- Kevlar inelasticity advisory for L3 rockets — warn when Kevlar harness is rated less than 2× calculated minimum
- SimPanel MetricCard grid — apogee, drogue descent, main descent, drift, and total flight time displayed as cards with animation
- Post-sim sanity warnings — high-drift alert (>3000 ft), subsonic burnout note, and velocity context in SimPanel

### Changed
- Parts browser redesigned — manufacturer-grouped collapsible sections with `aria-pressed` selection state; CUSTOM group always shown first when custom parts exist
- `RocketSpecs` expanded with ejection G-factor and bay obstruction fields
- Share link decoder now searches `allParts` (custom + catalog) instead of `PARTS` only — custom parts on the same device resolve correctly; separate toast for custom parts that cannot be shared vs. catalog parts that are missing
- Mobile PartsBrowser was missing `parts={allParts}`, `customParts`, `onAddCustomPart`, and `onDeleteCustomPart` props — custom chutes are now visible on mobile

### Fixed
- Custom part IDs switched from `Date.now()` to `crypto.randomUUID()` — prevents silent collision if two parts are created in the same millisecond
- Negative bay obstruction input was accepted and silently inflated usable bay length; now clamped to `Math.max(0, ...)`
- Ejection G-factor values below 5G (e.g., a typo of `0.1` instead `10`) now floored at 5G — prevents all hardware load checks from returning near-zero required strength
- Main deploy altitude fallback changed from 0 ft to 500 ft when field is blank — prevents optimistic (sea-level) descent rate calculation in compatibility check
- Bay utilization percentage no longer produces `Infinity%` when usable bay is zero
- Short-burn ascent timeline (single-entry array) no longer drops the apogee point when spliced with the descent timeline
- `localStorage` reads and writes for theme and custom parts wrapped in `try/catch` — prevents mount crash in Safari private mode and quota-exceeded environments
- Descent rate hard-error threshold restored to 20 fps (was incorrectly raised to 25 fps in v1.1.0.0)

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
