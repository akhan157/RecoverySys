# Changelog

All notable changes to RecoverySys are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
