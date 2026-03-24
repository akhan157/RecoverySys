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
| UI labels, body, navigation | `system-ui, -apple-system, sans-serif` | 13px | 400/500 | `#222` | |
| Numeric values (metrics, specs, inputs) | `JetBrains Mono, ui-monospace, monospace` | 13px | 600 | `#1a1a1a` | ALL flight data in monospace |
| Section headers / category labels | `system-ui` | 9px | 700 | `#888` | ALL CAPS, letter-spacing: 0.8px |
| Warning / error messages | `system-ui` | 11px | 400 | `#555` | |

**Rule:** Any number that means something physically (altitude, speed, force, grams) uses monospace. UI chrome (labels, buttons) uses system-ui.

---

## Color System

See `DESIGN.md` (repo root) for the full token reference including dark mode variants.

### Light Mode Tokens

| Token | Hex | Use |
|-------|-----|-----|
| `--bg-app` | `#f5f5f5` | App background |
| `--bg-panel` | `#ffffff` | Panel background (sidebar, main, sim panel) |
| `--bg-hover` | `#f7f7f7` | Row hover |
| `--text-primary` | `#1a1a1a` | Primary text, filled values |
| `--text-secondary` | `#555` | Secondary text, descriptions |
| `--text-tertiary` | `#767676` | Labels, category headers, meta — WCAG AA (4.5:1 on white) |
| `--text-placeholder` | `#bbb` | Empty state italic text |
| `--border-default` | `#ddd` | Panel borders, dividers |
| `--border-subtle` | `#eee` | Row separators |
| `--ok-fg / --ok-bg` | `#2a7a2a / #e8f4e8` | Green: compatible |
| `--warn-fg / --warn-bg / --warn-border` | `#d48800 / #fff8e1 / #ffe082` | Amber: warning |
| `--error-fg / --error-bg` | `#c0392b / #fdecea` | Red: error |
| `--cta-bg / --cta-fg` | `#1a1a1a / #ffffff` | Primary CTA button |
| `--neutral-dot` | `#ccc` | Grey: compat not yet evaluated |

### Dark Mode Tokens (added 2026-03-24)

Applied via `[data-theme="dark"]` on `<html>`. Toggle stored in `localStorage('theme')`.

| Token | Dark Value |
|-------|------------|
| `--bg-app` | `#0f0f0f` |
| `--bg-panel` | `#161616` |
| `--bg-hover` | `#1e1e1e` |
| `--text-primary` | `#e8e8e8` |
| `--text-secondary` | `#aaaaaa` |
| `--text-placeholder` | `#444444` |
| `--border-default` | `#2a2a2a` |
| `--border-subtle` | `#222222` |
| `--ok-fg / --ok-bg` | `#4caf50 / #0d2b0d` |
| `--warn-fg / --warn-bg` | `#ffb74d / #2b1f00` |
| `--error-fg / --error-bg` | `#ef5350 / #2b0a0a` |
| `--cta-bg / --cta-fg` | `#e8e8e8 / #0f0f0f` (**inverted**) |
| `--neutral-dot` | `#444444` |

**Rule:** The primary CTA is `#1a1a1a` (dark), not blue. Dark says "instrument." In dark mode it inverts to `#e8e8e8` — always the highest-contrast element.

---

## Borders + Corners

| Element | Border-radius | Border |
|---------|--------------|--------|
| Panels | 0 | `1px solid var(--border-default)` |
| Config slots (filled) | 0 | `1px solid var(--border-default)`, `border-left: 3px solid var(--ok-fg\|--warn-fg\|--error-fg)` |
| Config slots (empty) | 0 | `1px dashed #ccc` |
| Buttons (primary) | 4px | `none` |
| Buttons (secondary) | 4px | `1px solid #ccc` |
| Inputs | 0 | `1px solid #ccc` — `1px solid #1a1a1a` on focus |
| Tooltips | 4px | `1px solid #ddd` |
| Toasts | 4px | `none` |

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
- Light: background `#fafafa`, border `1px solid #eee`, path `#1a1a1a`
- Dark: background `#111`, border `1px solid #222`, path `#e8e8e8`
- Font: monospace 10px — `#888` light / `#555` dark
- Y-axis: altitude in ft (0 at bottom, apogee at top), labeled every 1000ft
- X-axis: time in seconds, labeled every 5s
- Event markers: vertical dashed lines at apogee (t=0), drogue deploy, main deploy (500ft), landing
- Chart path: `stroke: #1a1a1a`, `stroke-width: 2`, `fill: none`
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
