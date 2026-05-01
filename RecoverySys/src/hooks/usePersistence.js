import { useEffect, useRef } from 'react'
import { saveConfigToStorage } from '../lib/storage.js'

/**
 * Auto-persist config + specs + customMotor to localStorage on every change,
 * debounced 300ms so a typing user doesn't fire a write per keystroke.
 *
 * Pass 2's data-migration review found that CLAUDE.md claimed config was
 * "persisted on every change" but in practice only the SAVE button wrote
 * — close-the-tab lost any unsaved edits. This hook closes that gap.
 *
 * The existing manual-save flow (saveConfig callback dispatched on the
 * SAVE button click) keeps working alongside this. Auto-save is invisible;
 * the explicit button still toasts "Saved ✓" so the existing UX contract
 * holds. A future commit can replace the SAVE button with an "Export
 * config (.json)" download and let auto-save be the only persistence path.
 *
 * Skips the very first render to avoid writing the initial buildInitialState
 * value back to storage as a no-op (the value just came FROM storage).
 */
export default function usePersistence({ config, specs, customMotor, delayMs = 300 }) {
  const debounceRef  = useRef(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveConfigToStorage({ config, specs, customMotor })
    }, delayMs)
    return () => clearTimeout(debounceRef.current)
  }, [config, specs, customMotor, delayMs])
}
