/**
 * State-machine constants — frozen so typos become runtime errors instead of silent no-ops.
 * Values match the string literals used historically so existing tests still pass.
 */

// UI state for the Save Config button ('idle' → 'saving' → 'saved' → 'idle')
export const SAVE_STATES = Object.freeze({
  IDLE:   'idle',
  SAVING: 'saving',
  SAVED:  'saved',
})

// UI state for the Copy Share Link button ('idle' → 'copied' → 'idle')
export const SHARE_STATES = Object.freeze({
  IDLE:   'idle',
  COPIED: 'copied',
})

// Compatibility-check severity — emitted by lib/compatibility.js and
// consumed by WarningBox, SimulationTab, PartsBrowser, ToastContainer.
export const WARN_LEVELS = Object.freeze({
  ERROR: 'error',
  WARN:  'warn',
})

// Toast levels — used by ToastContainer and App.addToast.
// 'ok' is distinct from WARN_LEVELS (warning-box rules only emit ERROR/WARN);
// toasts also use it for the "session restored" success confirmation.
export const TOAST_LEVELS = Object.freeze({
  OK:    'ok',
  WARN:  'warn',
  ERROR: 'error',
})

// Timing for the Save Config / Copy Share Link button state transitions.
// Tuned so the flash is perceptible but the reset doesn't feel laggy.
export const SAVE_FLASH_MS  = 400    // idle → saving → saved (flash duration)
export const SAVE_RESET_MS  = 2400   // saved → idle  (how long the green checkmark lingers)
export const SHARE_RESET_MS = 2000   // copied → idle (how long "Copied!" shows)

// Physical constants — single source of truth so simulation, compatibility,
// and SuggestPanel stay numerically identical. Previously G_ACCEL was
// declared as 9.80665 in compatibility.js and 9.81 in SuggestPanel.jsx;
// the rounding difference produced subtly different shock-cord SF math.
export const PHYSICS = Object.freeze({
  G:           9.80665,   // m/s²  standard gravity
  LBS_PER_N:   0.224809,  // pound-force per Newton
  FT_PER_M:    3.28084,
  M_PER_FT:    0.3048,
  IN_TO_M:     0.0254,
  MPH_TO_FPS:  5280 / 3600,
  J_TO_FTLBF:  0.737562,
})

// Build/version metadata. Single string owned here so the UI brand badge,
// CHANGELOG, and any future telemetry share one truth.
export const VERSION         = '1.2.0.0'
export const VERSION_DISPLAY = 'V1.2'
