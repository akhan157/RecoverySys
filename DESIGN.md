# RecoverySys Design System

> **Audience:** Expert high-power rocketry (HPR) hobbyists and engineers.
> **Aesthetic:** Dense, technical, professional. Not consumer-grade. Minimal chrome, maximum data.
> **Principle:** Every UI element earns its pixels or gets cut.

---

## Color Tokens

All colors are defined as CSS custom properties in `src/index.css`.

| Token | Value | Use |
|-------|-------|-----|
| `--bg-app` | `#f5f5f5` | App background (panels sit on this) |
| `--bg-panel` | `#ffffff` | Panel backgrounds |
| `--bg-hover` | `#f7f7f7` | Hover state for interactive rows |
| `--text-primary` | `#1a1a1a` | Main content text |
| `--text-secondary` | `#555` | Descriptive / supporting text |
| `--text-tertiary` | `#767676` | Labels, units, placeholders — WCAG AA (4.5:1 on white) |
| `--text-placeholder` | `#bbb` | Italic placeholder text in empty slots |
| `--border-default` | `#ddd` | Panel dividers, input borders |
| `--border-subtle` | `#eee` | Row dividers, light separators |
| `--ok-fg / --ok-bg` | `#2a7a2a / #e8f4e8` | Compatible / selected state |
| `--warn-fg / --warn-bg / --warn-border` | `#d48800 / #fff8e1 / #ffe082` | Warning state |
| `--error-fg / --error-bg` | `#c0392b / #fdecea` | Error / incompatible state |
| `--cta-bg / --cta-fg` | `#1a1a1a / #ffffff` | Primary action (buttons, header) |
| `--neutral-dot` | `#ccc` | CompatDot when slot is empty |

**Do not use raw hex values for semantic states** — always use the token. This ensures ok/warn/error states remain consistent if the palette changes.

**Contrast note:** `--text-tertiary` (#767676 on #fff) = 4.5:1. Meets WCAG AA for normal text. `--text-secondary` (#555) = 7.4:1 (AAA). Use `--text-tertiary` for labels, units, and structural text; `--text-secondary` for descriptive body text.

---

## Typography

| Context | Font | Size | Weight | Class/token |
|---------|------|------|--------|-------------|
| Base body | system-ui, -apple-system, sans-serif | 13px | 400 | (default) |
| Part names, slot names | inherit | 13px | 500 | inline style |
| Spec data, measurements | JetBrains Mono | 11–13px | 600 | `.mono` |
| Section labels | inherit | 9px | 700 | `.section-label` |
| Unit suffixes | inherit | 11px | 400 | `--text-tertiary` |

**Section labels** (`9px / uppercase / 0.8px letter-spacing / --text-tertiary`) serve as structural dividers, not headings. They're deliberately small — they orient, not compete.

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
3-panel horizontal layout:
```
┌─────────────┬────────────────────┬──────────────┐
│ Parts       │ Config Builder     │ Sim Panel    │
│ Browser     │                    │              │
│ 280px       │ flex: 1            │ 380px fixed  │
│ (collapsible│                    │              │
│  to 24px)  │                    │              │
└─────────────┴────────────────────┴──────────────┘
```
- Panel dividers: `1px solid var(--border-default)`
- Header: 40px, `--cta-bg`, always visible

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

**TODO (accessibility):** CTA and secondary buttons have no visible focus ring. Add `outline: 2px solid var(--cta-bg); outline-offset: 2px` on `:focus-visible` for CTA buttons, and `outline: 2px solid #1a1a1a; outline-offset: 2px` for secondary buttons.

### Touch Targets
Minimum touch target: **44×44px** (iOS HIG / WCAG 2.5.5 AAA).

| Element | Current size | Status |
|---------|-------------|--------|
| Mobile tab buttons | 44px height, flex: 1 | ✅ |
| CTA buttons | 36px height | ⚠️ acceptable at desktop, small for mobile |
| Secondary buttons | 32px height | ⚠️ below minimum for mobile |
| ConfigSlot `×` remove button | ~26px | ❌ too small — fix to `min-width: 44px; min-height: 44px` |

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

SVG, 340×240px, fixed dimensions. Background `#fafafa`, border `1px solid #eee`.

| Element | Style |
|---------|-------|
| Grid lines | `#eee`, 1px |
| Axis lines | `#ccc`, 1px |
| Axis labels | JetBrains Mono, 10px, `#888` |
| Flight path | `#1a1a1a`, 2px, no fill |
| Event markers | Dashed `#aaa`, 3px/3px pattern |
| Event labels | JetBrains Mono, 8px, `#aaa` |
| Empty state CTA | system-ui, 12px, `#bbb`, centered |

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
| Dark mode | No demand signal; would require full token duplication |
| Icon library | Text + monospace is sufficient; icons would feel consumer-grade |
| Animation system beyond existing | Pulse dot + chart draw + toast slide-in covers all cases |
| "Guided setup" wizard | Expert audience; step-by-step wizard would patronize users |
| Brand logo/icon | "RECOVERYSYS" wordmark in the header is sufficient for a technical tool |
