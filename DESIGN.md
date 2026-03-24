# RecoverySys Design System

> **Audience:** Expert high-power rocketry (HPR) hobbyists and engineers.
> **Aesthetic:** Dense, technical, professional. Not consumer-grade. Minimal chrome, maximum data.
> **Principle:** Every UI element earns its pixels or gets cut.

---

## Color Tokens

All colors are defined as CSS custom properties in `src/index.css`. The current palette is **Slate** (introduced v1 redesign, 2026-03-24).

| Token | Value | Use |
|-------|-------|-----|
| `--bg-app` | `#f4f5f7` | App background (panels sit on this) |
| `--bg-panel` | `#ffffff` | Panel / left-column backgrounds |
| `--bg-right` | `#edf0f3` | Right column background (parts + sim) |
| `--bg-hover` | `#edf0f3` | Hover state for interactive rows |
| `--input-bg` | `#f4f5f7` | Number inputs |
| `--text-primary` | `#1a1d23` | Main content text |
| `--text-secondary` | `#4a5260` | Descriptive / supporting text |
| `--text-tertiary` | `#8c94a3` | Labels, units, placeholders |
| `--text-placeholder` | `#c8cdd8` | Empty slot placeholder text |
| `--border-default` | `#dde1e9` | Panel dividers, input borders |
| `--border-subtle` | `#eaecf0` | Row dividers, light separators |
| `--accent` | `#374151` | Active pill bg, focus border, hover border |
| `--accent-text` | `#ffffff` | Text on accent background |
| `--accent-tint` | `#f1f2f4` | Subtle accent tint |
| `--accent-ring` | `rgba(55,65,81,0.12)` | Focus box-shadow, card hover shadow |
| `--header-bg` | `#1a1d23` | App header background |
| `--header-border` | `#2d3240` | App header bottom border |
| `--ok-fg / --ok-bg` | `#1a7f37 / #dafbe1` | Compatible / selected state |
| `--warn-fg / --warn-bg / --warn-border` | `#d48800 / #fff8e1 / #ffe082` | Warning state |
| `--error-fg / --error-bg` | `#c0392b / #fdecea` | Error / incompatible state |
| `--cta-bg / --cta-fg` | `#1a1d23 / #ffffff` | Primary action buttons |
| `--neutral-dot` | `#c8cdd8` | CompatDot when slot is empty |
| `--radius` | `6px` | Standard border radius for buttons, cards |

**Do not use raw hex values for semantic states** — always use the token. This ensures ok/warn/error states remain consistent if the palette changes.

**Contrast note:** `--text-tertiary` (#8c94a3) on `--bg-panel` (#ffffff) = 3.2:1 — meets WCAG AA for large/bold text (section labels are uppercase 10px/600 weight). Use `--text-secondary` (#4a5260 = 6.8:1) for body/descriptive text.

---

## Dark Mode Tokens

Dark mode is implemented via a `[data-theme="dark"]` attribute on `<html>`. All semantic tokens are redefined; no component code changes needed.

| Token | Light | Dark | Notes |
|-------|-------|------|-------|
| `--bg-app` | `#f4f5f7` | `#0f1014` | Near-black, not pure black |
| `--bg-panel` | `#ffffff` | `#171a1f` | Panel backgrounds |
| `--bg-right` | `#edf0f3` | `#13161b` | Right column |
| `--bg-hover` | `#edf0f3` | `#1e2128` | Row hover |
| `--input-bg` | `#f4f5f7` | `#13161b` | Number inputs |
| `--text-primary` | `#1a1d23` | `#e8eaf0` | Main content text |
| `--text-secondary` | `#4a5260` | `#9aa0b0` | Supporting text |
| `--text-tertiary` | `#8c94a3` | `#5a6070` | Labels, units |
| `--text-placeholder` | `#c8cdd8` | `#353b48` | Empty slot text |
| `--border-default` | `#dde1e9` | `#272c38` | Panel dividers, input borders |
| `--border-subtle` | `#eaecf0` | `#1e2230` | Row dividers |
| `--accent` | `#374151` | `#c9cdd8` | Active pills, focus border — inverted on dark |
| `--accent-text` | `#ffffff` | `#1a1d23` | Text on accent bg |
| `--accent-ring` | `rgba(55,65,81,0.12)` | `rgba(200,205,216,0.10)` | Shadow |
| `--header-bg` | `#1a1d23` | `#0d0f13` | Header |
| `--ok-fg` | `#1a7f37` | `#4caf50` | Brighter green on dark |
| `--ok-bg` | `#dafbe1` | `#0d2b0d` | Green tint background |
| `--warn-fg` | `#d48800` | `#ffb74d` | Warmer amber on dark |
| `--warn-bg` | `#fff8e1` | `#2b1f00` | Amber tint background |
| `--error-fg` | `#c0392b` | `#ef5350` | Lighter red on dark |
| `--error-bg` | `#fdecea` | `#2d0a0a` | Red tint background |
| `--cta-bg` | `#1a1d23` | `#e8eaf0` | **Inverted** — light button on dark |
| `--cta-fg` | `#ffffff` | `#1a1d23` | **Inverted** — dark text on light button |
| `--neutral-dot` | `#c8cdd8` | `#353b48` | Grey CompatDot |

**CTA inversion rule:** The primary CTA is always the highest-contrast element. In light mode that's dark on light. In dark mode it flips to light on dark. This preserves the instrument feel — the action button is always visually dominant.

**Dark mode toggle:** Stored in `localStorage` under key `'recoverysys-theme'` (`'dark'` or `'light'`). A blocking inline script in `<head>` applies `data-theme="dark"` before first paint to prevent flash. The React `useState` initializer reads the same key; a `useEffect` writes back on toggle. Toggle button in the app header (☾/☀ icon, 32×32px tap target).

---

## Typography

| Context | Font | Size | Weight | Class/token |
|---------|------|------|--------|-------------|
| Base body | Inter, system-ui, -apple-system, sans-serif | 13px | 400 | (default) |
| Part names, slot names | inherit | 12–13px | 500 | inline style |
| Spec data, measurements | JetBrains Mono | 10–13px | 600 | `.mono` |
| Section labels | inherit | 10px | 600 | `.section-label` |
| Metric card values | JetBrains Mono | 15px | 400 | inline style |
| Unit suffixes | inherit | 11px | 400 | `--text-tertiary` |

**Section labels** (`10px / uppercase / 0.06em letter-spacing / --text-tertiary / weight 600`) serve as structural dividers. Deliberately small — they orient, not compete.

**Font loading:** Inter loaded via `<link>` in `index.html` (non-blocking). JetBrains Mono loaded in the same link tag. No `@import` in CSS.

---

## Spacing Scale

Use these values. Ad-hoc values between these are a smell.

| Token | Value | Use |
|-------|-------|-----|
| 4px | gap-4 | Tight inline gaps (label↔input) |
| 6px | gap-6 | Between list items, small gaps |
| 8px | gap-8 | Between section label and content |
| 12px | gap-12 | Standard intra-section spacing |
| 16px | gap-16 | Panel padding, standard section spacing |
| 24px | gap-24 | Between major sections in Config panel |

---

## Border Radius Convention

| Element type | Radius | Rationale |
|-------------|--------|-----------|
| Inputs (`<input>`) | 0 | "Raw data" — sharp edges signal precision |
| Config slots (filled/empty) | 0 | Same family as inputs |
| Buttons (CTA, secondary) | 4px | Slightly softened — interactive affordance |
| Warning / error boxes | 4px | Container, not data |
| Toasts | 4px | Notification UI |
| Tooltip (CompatDot) | 4px | Popup UI |

**Rule:** Data-entry elements = sharp (0). Action/notification elements = softened (4px).

---

## Layout

### Desktop (≥ 768px / `md:` Tailwind breakpoint)
2-column layout (redesigned v1):
```
┌───────────────────────┬────────────────────────┐
│ Left col (50%)        │ Right col (flex: 1)    │
│ bg: --bg-panel        │ bg: --bg-right         │
│                       │                        │
│  ConfigBuilder        │  PartsBrowser          │
│  (slots + specs)      │  (pill tabs +          │
│                       │   MfrGroup accordion)  │
│                       │                        │
│                       │  ───── divider ─────   │
│                       │                        │
│                       │  SimPanel              │
│                       │  (chart + results)     │
└───────────────────────┴────────────────────────┘
```
- Panel dividers: `1px solid var(--border-default)`
- Header: 52px, `--header-bg` (#1a1d23), always visible
- Right column scrolls as a unit (PartsBrowser + SimPanel together)

### Mobile (< 768px)
Tabbed layout — single visible panel at a time:
- Tab bar: 44px, bottom-fixed, 3 tabs: Parts · Config · Simulation
- Active tab: `2px solid --text-primary` top border, 600 weight
- **Config tab badge:** Show a red dot (8px, `--error-fg`) on the Config tab label when `warnings.some(w => w.level === 'error')`. This ensures users on the Parts tab are notified of compatibility errors without switching tabs.

---

## Information Hierarchy — Config Panel

The Config panel has two tiers of importance:

**Primary (core task):** Recovery Configuration
- This is what the user came to do
- Main Chute is the only **required** slot (simulation cannot run without it)
- Mark with `— required` in the placeholder text: `"No main chute selected — required"`

**Secondary (improves accuracy):** Rocket Specs
- Optional inputs that increase simulation precision from ±30% to ±10–15%
- The section label should indicate this: `"ROCKET SPECS — optional, improves sim accuracy"`

**Tertiary:** Actions (Save, Share, Export)
- Support functions, not core workflow

---

## Interaction States

### Config Slots
| State | Visual |
|-------|--------|
| Empty (optional) | Dashed `#ccc` border, italic `--text-placeholder` text, 56px height |
| Empty (required) | Same + `— required` suffix in placeholder |
| Filled (ok) | Solid `--border-default` border, `3px left accent --ok-fg`, `--bg-panel` |
| Filled (warn) | Solid border, `3px left accent --warn-fg` |
| Filled (error) | Solid border, `3px left accent --error-fg` |

### Buttons
| State | CTA button | Secondary button |
|-------|-----------|-----------------|
| Default | `--cta-bg` bg, `--cta-fg` text | Transparent bg, `1px solid #ccc` |
| Hover | (unchanged — no hover state defined) | (unchanged) |
| Disabled | `#999` bg, `cursor: default` | — |
| Loading | Spinner + "…" label | Spinner + "…" label |
| Success | Text changes: "Saved ✓" / "Copied!" | — |

**Focus ring (implemented):** `button:focus-visible { outline: 2px solid var(--cta-bg); outline-offset: 2px }` — defined in `src/index.css`.

### Touch Targets
Minimum touch target: **44×44px** (iOS HIG / WCAG 2.5.5 AAA).

| Element | Current size | Status |
|---------|-------------|--------|
| Mobile tab buttons | 44px height, flex: 1 | ✅ |
| CTA buttons | 36px height | ⚠️ acceptable at desktop, small for mobile |
| Secondary buttons | 32px height | ⚠️ below minimum for mobile |
| ConfigSlot `×` remove button | 44×44px | ✅ fixed — `min-width: 44px; min-height: 44px` |

---

## CompatDot Status System

8px circle, no border. Pulse animation (300ms) on status change.

| Status | Color | Meaning |
|--------|-------|---------|
| `neutral` | `--neutral-dot` (#ccc) | Slot empty / unchecked |
| `ok` | `--ok-fg` (#2a7a2a) | Compatible |
| `warn` | `--warn-fg` (#d48800) | Compatible with caution |
| `error` | `--error-fg` (#c0392b) | Incompatible / rule violation |

**Tooltip (on hover, 200ms delay):** Pass the first warning message for the category to the `tooltip` prop. Only show tooltip when status is `warn` or `error`. Example: `"Shock cord strength (150 lbs) is below recommended for main chute weight."` This lets the user understand issues without leaving the Parts tab.

Implementation: In `PartsBrowser`, derive the tooltip from `warnings.filter(w => w.category === cat.id)[0]?.message` and pass to `<CompatDot status={status} tooltip={firstWarning} />`.

---

## Manufacturer Group Component (Parts Browser)

The Parts Browser displays parts grouped by manufacturer, with each group collapsible via a disclosure chevron. This replaces the flat 189-part list.

### Group Header

- Height: 34px, padding: `7px 10px`
- Layout: `flex, align-items: center, gap: 8px`
- Elements (left to right): chevron icon · manufacturer name · part count · compat dot summary
- **Chevron:** 10×10px SVG, `--text-tertiary` color, rotates 90° when open (`transform: rotate(90deg)`, 200ms ease)
- **Manufacturer name:** 12px / 600 / `--text-primary`
- **Part count:** JetBrains Mono, 10px, `--text-tertiary`
- **Compat dot summary:** Show the worst-case dot(s) for parts in this group. If any part has `error`, show a red dot. If any has `warn` (and no error), show an amber dot. If all are `ok`, show a green dot. If none are evaluated yet, show a grey dot.
- Hover: `--bg-hover` background

**Why worst-case status on the group header?** Expert users know their preferred manufacturers. Showing compatibility status at the group level lets them skip entire manufacturers without expanding — e.g., if b2 Rocketry shows a red dot, they know none of those parts will work for the current config.

### Expanded State

- Parts list rendered below the header, no additional indent container
- Part rows: `padding-left: 28px` (extra 18px vs group header) to create visual hierarchy
- Part rows have the same structure as current: compat dot · part info · Add/Remove button
- Animation: `max-height` transition, 200ms ease-out (short duration — accordions should feel snappy)

### Empty Group State

If a manufacturer has zero parts matching the current search filter, hide the group entirely (do not show an empty expanded group).

### Search Interaction

When the search input has text, expand all matching groups automatically and collapse all non-matching groups. The chevron state follows the filter — clearing the search restores previous open/closed state.

---

## Animation Timing

All transitions use CSS custom properties so they can be scaled globally.

| Name | Duration | Easing | Use |
|------|----------|--------|-----|
| `micro` | 50–100ms | ease | Hover backgrounds, focus border-color |
| `short` | 150–250ms | ease-out (enter) / ease-in (exit) | Accordion expand/collapse, CompatDot pulse, toast entrance |
| `medium` | 300–400ms | ease-in-out | Slot fill/empty transition, chart crossfade on re-run |
| `long` | 700–900ms | ease-out | Flight chart first-render draw (`strokeDashoffset`) |

**Easing rule:** Entering elements → `ease-out` (fast start, gentle stop). Exiting elements → `ease-in` (gentle start, fast end). Moving elements → `ease-in-out`.

**Dark mode transition:** The theme toggle fades all color tokens with a single `transition: background 200ms ease, color 200ms ease` on `body`. This means the whole app crossfades when switching themes — no jarring flash.

---

## Empty States

| Panel | State | Visual |
|-------|-------|--------|
| Parts Browser (no search results) | Zero matches for search query | Centered text: `"No parts match «{query}»"`, 12px / `--text-tertiary`, italic. No icon. |
| Config slot (optional) | No part selected | Dashed `1px #ccc` border, 56px height, italic `--text-placeholder` text |
| Config slot (required — main chute) | No part selected | Same + `"— required"` suffix in placeholder |
| Sim Panel (no simulation run) | Before first run | Flight chart shows axes but no path. CTA: `"Run Simulation →"` centered in chart area, 12px / `--text-placeholder`. |
| Sim Panel (simulation failed) | Error state | Error box below CTA: red border, 11px error message, no metrics shown |

**Rule:** Empty states in RecoverySys are silent. No illustrations, no onboarding copy, no "get started" CTAs beyond what's already in the UI. The expert audience finds celebratory empty states condescending.

---

## Session State

- **Saved config exists:** Show toast on load — `"Restored your last session."` (level: `ok`, 3s auto-dismiss)
- **No saved config:** Silent empty state — no onboarding hint needed for expert audience

## Export State

The Export button in the Sim Panel follows the same state machine pattern as Save:

| State | Button label |
|-------|-------------|
| `idle` | `Export .ork` |
| `exporting` | Spinner + `Exporting…` |
| `done` | `Exported ✓` (3s, then reset to idle) |

---

## Flight Chart

SVG, 340×240px with `viewBox="0 0 340 240" width="100%"` for responsive scaling. Chart colors via `--chart-*` CSS tokens so the SVG responds to `[data-theme="dark"]` without JS.

**Rule: maximum contrast on the flight path.** The altitude line is the most important element. Always maximum contrast — `var(--chart-path)` which is `#1a1d23` on light and `#ffffff` on dark. Never let it blend into the background.

| Token | Light | Dark |
|-------|-------|------|
| `--chart-bg` | `#ffffff` | `#0f1014` |
| `--chart-border` | `#dde1e9` | `#272c38` |
| `--chart-grid` | `#edf0f3` | `#1a1d23` |
| `--chart-axis` | `#c8cdd8` | `#353b48` |
| `--chart-path` | `#1a1d23` | `#ffffff` |
| `--chart-marker` | `#8c94a3` | `#5a6070` |
| `--chart-label` | `#8c94a3` | `#5a6070` |

| Element | Spec |
|---------|------|
| Background | `var(--chart-bg)`, border `1px solid var(--chart-border)` |
| Grid lines | `var(--chart-grid)`, 0.5px, horizontal + vertical |
| Axis lines | `var(--chart-axis)`, 1px, x-axis + y-axis baselines |
| **Flight path** | **`var(--chart-path)`, 2px, no fill — always maximum contrast** |
| Event markers | Dashed `var(--chart-marker)`, 3px/3px dash pattern |
| Event labels | JetBrains Mono, 8px, `var(--chart-marker)` |
| Axis labels | JetBrains Mono, 8px, `var(--chart-label)` |
| Empty state CTA | system-ui, 12px, `var(--chart-label)`, centered |

Animation: first render draws left-to-right (800ms ease-out via `strokeDashoffset`). Re-runs crossfade (200ms).

---

## Toast System

- Position: `fixed bottom-right`, 20px margin
- Stack direction: bottom-up
- Auto-dismiss: 3000ms
- Dismiss on click

| Level | Background | Use |
|-------|-----------|-----|
| `ok` | `--cta-bg` (#1a1a1a) | Success feedback (saved, shared, restored) |
| `error` | `#c0392b` | Failure feedback (save failed, export failed) |

Animation: slide-up + fade-in (200ms, `toast-in` keyframe).

---

## What Is NOT in Scope (Design Decisions Deferred)

| Decision | Rationale |
|----------|-----------|
| Icon library | Text + monospace is sufficient; icons would feel consumer-grade |
| "Guided setup" wizard | Expert audience; step-by-step wizard would patronize users |
| Brand logo/icon | "RECOVERYSYS" wordmark in the header is sufficient for a technical tool |
| Scroll-driven animations | The three existing animation tiers (chart draw, compat dot, toast) cover all cases |

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-22 | Initial design system created | `/plan-design-review` — Industrial/Utilitarian aesthetic, engineering instrument direction |
| 2026-03-24 | Dark mode tokens added | User demand confirmed; full CSS custom property inversion, no component changes |
| 2026-03-24 | Manufacturer-grouped Parts Browser | 189-part flat list replaced with collapsible manufacturer accordion — less clutter, worst-case compat status visible on group header |
| 2026-03-24 | Animation timing table formalized | Micro/short/medium/long tiers documented with easing rules |
| 2026-03-24 | Empty states documented | Silent empty states for all panels — no onboarding copy for expert audience |
| 2026-03-24 | Slate palette redesign shipped | New slate/neutral palette replacing warm grey; 2-col desktop layout; responsive chart; pill category tabs; MetricCard results grid; Inter font |
