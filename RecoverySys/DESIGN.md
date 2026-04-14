# DESIGN.md — RecoverySys

Established by /plan-design-review on 2026-03-22.
All UI decisions calibrate against this file.

## Aesthetic: Engineering Instrument

RecoverySys looks like an instrument panel, not a SaaS app.
The design language is borrowed from: oscilloscopes, MATLAB, terminal tools, engineering reference cards.
It does NOT look like: Notion, Linear, Stripe, or any modern "clean" SaaS.

The goal is that an L3 rocketeer opens RecoverySys and immediately trusts it because it looks like something an engineer built, not something a marketing team approved.

---

## Typography

| Use | Font | Size | Weight | Color | Notes |
|-----|------|------|--------|-------|-------|
| UI labels, body, navigation | `Inter, system-ui, -apple-system, sans-serif` | 13px | 400/500 | `var(--text-primary)` | Inter added Slate redesign 2026-03-24 |
| Numeric values (metrics, specs, inputs) | `JetBrains Mono, ui-monospace, monospace` | 13px | 600 | `var(--text-primary)` | ALL flight data in monospace |
| Section headers / category labels | `Inter, system-ui` | 10px | 600 | `var(--text-tertiary)` | ALL CAPS, letter-spacing: 0.06em; WCAG AA 5.28:1 |
| Warning / error messages | `Inter, system-ui` | 11px | 400 | `var(--text-secondary)` | |

**Rule:** Any number that means something physically (altitude, speed, force, grams) uses monospace. UI chrome (labels, buttons) uses Inter/system-ui.

---

## Color System

See `DESIGN.md` (repo root) for the full token reference including dark mode variants.

### Light Mode Tokens (Slate palette — updated 2026-03-24)

| Token | Hex | Use |
|-------|-----|-----|
| `--bg-app` | `#f4f5f7` | App background |
| `--bg-panel` | `#ffffff` | Left-column panel backgrounds |
| `--bg-right` | `#edf0f3` | Right column (parts browser + sim panel) |
| `--bg-hover` | `#edf0f3` | Row hover |
| `--input-bg` | `#f4f5f7` | Number inputs |
| `--text-primary` | `#1a1d23` | Primary text, filled values |
| `--text-secondary` | `#4a5260` | Secondary text, descriptions (6.8:1 on white) |
| `--text-tertiary` | `#636c7e` | Labels, section headers — WCAG AA (5.28:1 on white) |
| `--text-placeholder` | `#c8cdd8` | Empty state italic text |
| `--border-default` | `#dde1e9` | Panel borders, dividers |
| `--border-subtle` | `#eaecf0` | Row separators |
| `--accent` | `#374151` | Active pill bg, focus/hover border |
| `--accent-text` | `#ffffff` | Text on accent background |
| `--accent-ring` | `rgba(55,65,81,0.12)` | Focus box-shadow, card hover shadow |
| `--header-bg` | `#1a1d23` | App header background |
| `--ok-fg / --ok-bg` | `#1a7f37 / #dafbe1` | Green: compatible |
| `--warn-fg / --warn-bg / --warn-border` | `#d48800 / #fff8e1 / #ffe082` | Amber: warning |
| `--error-fg / --error-bg` | `#c0392b / #fdecea` | Red: error |
| `--cta-bg / --cta-fg` | `#1a1d23 / #ffffff` | Primary CTA button |
| `--neutral-dot` | `#c8cdd8` | Grey: compat not yet evaluated |

### Dark Mode Tokens (Slate dark — updated 2026-03-24)

Applied via `[data-theme="dark"]` on `<html>`. Toggle stored in `localStorage('recoverysys-theme')`.

| Token | Dark Value | Contrast on panel |
|-------|------------|-------------------|
| `--bg-app` | `#0f1014` | — |
| `--bg-panel` | `#171a1f` | — |
| `--bg-right` | `#13161b` | — |
| `--bg-hover` | `#1e2128` | — |
| `--input-bg` | `#13161b` | — |
| `--text-primary` | `#e8eaf0` | high |
| `--text-secondary` | `#9aa0b0` | 6.84:1 |
| `--text-tertiary` | `#7b8496` | 4.66:1 (WCAG AA) |
| `--text-placeholder` | `#353b48` | — |
| `--border-default` | `#272c38` | — |
| `--border-subtle` | `#1e2230` | — |
| `--accent` | `#c9cdd8` | inverted on dark |
| `--accent-text` | `#1a1d23` | — |
| `--header-bg` | `#0d0f13` | — |
| `--ok-fg / --ok-bg` | `#4caf50 / #0d2b0d` | — |
| `--warn-fg / --warn-bg` | `#ffb74d / #2b1f00` | — |
| `--error-fg / --error-bg` | `#ef5350 / #2d0a0a` | — |
| `--cta-bg / --cta-fg` | `#e8eaf0 / #1a1d23` (**inverted**) | — |
| `--neutral-dot` | `#353b48` | — |

**Rule:** The primary CTA is `#1a1d23` (slate-dark), not blue. Dark says "instrument." In dark mode it inverts to `#e8eaf0` — always the highest-contrast element.

---

## Borders + Corners

| Element | Border-radius | Border |
|---------|--------------|--------|
| Panels | 0 | `1px solid var(--border-default)` |
| Config slots (filled) | 0 | `1px solid var(--border-default)`, `border-left: 3px solid var(--ok-fg\|--warn-fg\|--error-fg)` |
| Config slots (empty) | 0 | `1px dashed var(--border-default)` |
| Buttons (primary) | `var(--radius)` | `none` |
| Buttons (secondary) | `var(--radius)` | `1px solid var(--border-default)` |
| Inputs | 0 | `1px solid var(--border-default)` — `1px solid var(--accent)` on focus |
| Tooltips | `var(--radius)` | `1px solid var(--border-default)` |
| Toasts | `var(--radius)` | `none` |

**Rule:** Panels and slots have no border-radius. Buttons have 4px (the minimum concession to usability). No soft shadows on structural elements — shadows only on overlays (tooltips, toasts, dropdowns).

---

## Spacing Scale (Tailwind reference)

| Context | Value | Tailwind |
|---------|-------|----------|
| Panel padding | 16px | `p-4` |
| Section padding within panel | 12px | `p-3` |
| Row height (parts browser) | 36px | `h-9` |
| Slot height (config builder) | 56px | `h-14` |
| Gap between major sections | 24px | `gap-6` |
| Divider margin (top+bottom) | 8px each | `my-2` |
| Label to content gap | 4px | `gap-1` |

---

## Component Specs

### Compatibility Dot
- Size: 8×8px, `border-radius: 50%`
- States: `--ok-fg`, `--warn-fg`, `--error-fg`, `--neutral-dot`
- On state change: `scale(1) → scale(1.4) → scale(1)`, 300ms, ease-in-out
- Tooltip on hover (200ms delay): specific rule message, max-width 240px, right-aligned to dot
- No tooltip for grey (not-yet-evaluated) dots

### Config Slot
- Empty: dashed `1px #ccc` border, `height: 56px`, italic grey placeholder text
- Filled (ok): solid border + 3px left accent `--ok-fg`, part name in 13px/500, spec in 11px `#666`
- Filled (warn): 3px left accent `--warn-fg`
- Filled (error): 3px left accent `--error-fg`

### Warning Box
- Background: `--warn-bg`, border: `1px solid --warn-border`, border-radius: 4px, padding: 12px
- Header: "N Compatibility Warnings" in 12px/700 `--warn-fg`
- Items: 11px `#555`, `⚠` prefix, display: flex, gap: 6px
- Error box same but `--error-bg` / `--error-fg`
- Mixed: use worst-case color (any ERROR → red box)
- Absent when no warnings: do NOT show "All systems go" — just hide the box

### Manufacturer Group Header (Parts Browser)
- Height: 34px, padding: `7px 10px`, `display: flex, align-items: center, gap: 8px`
- Elements: chevron (10×10px SVG, rotates 90° when open, 200ms ease) · manufacturer name (12px/600/`--text-primary`) · part count (mono 10px `--text-tertiary`) · worst-case compat dot(s)
- Worst-case dot rule: show `error` dot if any part errors; else `warn` if any warn; else `ok` if evaluated; else `neutral`
- Accordion animation: `max-height` transition, 200ms ease-out
- Search: auto-expand matching groups, collapse non-matching groups

### Flight Profile Chart (SVG)
Use `--chart-*` CSS tokens so the SVG responds to `[data-theme="dark"]` automatically.

**Critical:** The flight path (`--chart-path`) must always be maximum contrast — `#1a1a1a` on light, `#ffffff` on dark. Never let it blend into the background.

| Token | Light | Dark |
|-------|-------|------|
| `--chart-bg` | `#fafafa` | `#111111` |
| `--chart-border` | `#eee` | `#222222` |
| `--chart-grid` | `#e8e8e8` | `#252525` |
| `--chart-axis` | `#bbbbbb` | `#555555` |
| `--chart-path` | `#1a1a1a` | `#ffffff` |
| `--chart-marker` | `#aaaaaa` | `#777777` |
| `--chart-label` | `#888888` | `#aaaaaa` |
- Y-axis: altitude in ft (0 at bottom, apogee at top), labeled every 1000ft
- X-axis: time in seconds, labeled every 5s
- Event markers: vertical dashed lines at apogee (t=0), drogue deploy, main deploy (500ft), landing
- Chart path: `stroke: var(--chart-path)`, `stroke-width: 2`, `fill: none`
- On first render: draws left-to-right via `stroke-dashoffset`, 800ms, ease-out
- On re-run (values change): crossfade from old path to new (200ms opacity transition)
- No-data state: axes visible but path absent; CTA "Run Simulation →" centered

---

## Interaction Patterns

| Interaction | Pattern |
|-------------|---------|
| Parts browser → select part | Click row → slot fills immediately (optimistic), compat re-evaluates |
| Remove part from slot | Click × button on filled slot → slot empties, compat re-evaluates |
| Numeric input change | Debounce 300ms → compat re-evaluates |
| Run Simulation | Button shows spinner + "Calculating…" (disabled) → results animate in |
| Save Config | Shows "Saving…" → "Saved ✓" for 2s |
| Copy share link | Button label changes to "Copied!" for 2s |
| Export .ork | Button shows "Exporting…" → "Exported ✓" for 3s → resets to idle |

---

## Anti-Patterns (What NOT to Do)

- ❌ Gradient backgrounds on any structural element
- ❌ Drop shadows on panels, cards, or buttons
- ❌ Rounded pill buttons (border-radius > 6px)
- ❌ Colorful icons (use text labels or plain monochrome SVG)
- ❌ Hero / marketing section inside the app shell
- ❌ "All systems go ✅" celebrations when there are no warnings
- ❌ Blue as the primary CTA color
- ❌ Card grid layout for any data that should be a list
- ❌ Smooth scroll or entrance animations on static content
- ❌ Tooltip on every single element (tooltip fatigue)

---

## Mobile Design (< 768px)

See the Responsive Design section in the full design spec (design-20260322 in gstack projects). Summary:
- Three panels → three tabs: "Parts", "Config", "Simulation"
- Tab bar: fixed bottom, 44px height, icon + label
- Each tab's content scrolls independently
- Compatibility dots visible on Parts tab
- Warning box appears as a sticky banner above the tab bar when warnings exist

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-22 | Initial design system — Engineering Instrument aesthetic | `/plan-design-review` — Industrial/Utilitarian direction; SaaS aesthetics would erode expert user trust |
| 2026-03-22 | JetBrains Mono for all numeric values | Monospace makes alignment and precision legible; differentiates physical quantities from UI chrome |
| 2026-03-22 | No border-radius on panels/slots | Panels are instruments, not cards. 0px radius signals structural, not interactive |
| 2026-03-22 | CTA button #1a1a1a (slate-dark), not blue | Expert users distrust software that uses consumer-app conventions (blue CTA = email marketing) |
| 2026-03-24 | Dark mode via `[data-theme="dark"]` on `<html>` | CSS custom property inversion; zero component changes; blocking inline script prevents FOUC |
| 2026-03-24 | Manufacturer-grouped Parts Browser accordion | 189-part flat list replaced with collapsible manufacturer groups; worst-case compat status on group header reduces cognitive load |
| 2026-03-24 | Slate palette (v1.1.0.0) replaces warm-grey | Slate is more "instrument panel" than warm grey; `--header-bg: #1a1d23` creates clear visual hierarchy header→panel→content |
| 2026-03-24 | Inter added as body font alongside JetBrains Mono | Inter at 13px is more legible than system-ui at small sizes; loaded via `<link>` (not CSS @import) to avoid render-blocking |
| 2026-03-24 | --text-tertiary darkened for WCAG AA | `#8c94a3` (3.05:1) fails AA for 10px section labels; `#636c7e` (5.28:1) passes; same fix applied to --chart-label and --chart-marker |
| 2026-03-24 | MfrGroup `key={activeCategory + '-' + mfr}` | Manufacturer names appear in multiple categories; mfr-only key reuses stale open state on category switch |
