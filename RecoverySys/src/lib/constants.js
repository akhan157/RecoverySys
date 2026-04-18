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
