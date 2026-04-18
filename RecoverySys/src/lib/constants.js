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
