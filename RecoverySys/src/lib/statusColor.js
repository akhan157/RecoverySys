// Shared status → color mapping. Pass 1 + Pass 2 reviews found the same
// status-to-color logic re-implemented inline in 5+ places — CompatDot has
// its own STATUS_COLOR object, MetricCard has a chipColor ternary,
// MissionControlLayout has the SF chip ternary, FlightLogTab has an
// outcomeColor object. Routing every consumer through this file means
// (a) consumers stay in sync (b) a future palette change is a one-file edit
// (c) the design system mandate from DESIGN.md "UI Primitives" section
// has a real implementation rule, not just words.
//
// Two naming families show up in the codebase:
//   1. WARN_LEVELS family — 'ok' | 'warn' | 'error' | 'neutral'
//      (compatibility.js, CompatDot, slot status — the canonical alphabet)
//   2. Sim-result family — 'ok' | 'marginal' | 'fail'
//      (MetricCard chips — physics result language: "close to limit" / "exceeded")
// statusColor() accepts both and returns the same token, so callers don't
// need to remember which spelling goes where.

import { WARN_LEVELS } from './constants.js'

const COLOR_TOKENS = Object.freeze({
  ok:      'var(--ok-fg)',
  warn:    'var(--warn-fg)',
  error:   'var(--error-fg)',
  neutral: 'var(--neutral-dot)',
})

// Sim-result aliases normalize to the canonical alphabet.
const STATUS_ALIAS = Object.freeze({
  ok:       'ok',
  marginal: 'warn',
  warn:     'warn',
  fail:     'error',
  error:    'error',
  neutral:  'neutral',
})

/**
 * Resolve a status keyword to its CSS custom property reference.
 * Unknown statuses fall back to the neutral token rather than throwing
 * — silent degradation is preferable to a runtime error in a status chip.
 */
export function statusColor(status) {
  const canonical = STATUS_ALIAS[status] ?? 'neutral'
  return COLOR_TOKENS[canonical]
}

/**
 * Aggregate a list of compatibility warnings down to a single status keyword.
 * Worst-case wins: any error → 'error'; any warn (no error) → 'warn'; else 'ok'.
 * Returns 'ok' for an empty list since "no warnings" means the slot/group is fine.
 */
export function statusFromWarnings(warnings = []) {
  if (warnings.some(w => w.level === WARN_LEVELS.ERROR)) return 'error'
  if (warnings.some(w => w.level === WARN_LEVELS.WARN))  return 'warn'
  return 'ok'
}
