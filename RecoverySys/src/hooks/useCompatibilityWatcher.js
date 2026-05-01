import { useEffect, useRef } from 'react'
import { checkCompatibility } from '../lib/compatibility.js'

/**
 * Debounced compatibility re-evaluation. Watches config + specs; whenever
 * either changes, schedules a fresh checkCompatibility call after `delayMs`
 * (default 300) and dispatches the resulting warnings via SET_WARNINGS.
 *
 * The 300ms debounce gives a typing user breathing room — without it, every
 * keystroke fires the full rule sweep through compatibility.js's ~50 branches.
 *
 * Cleanup clears the pending timer on unmount AND on dep change, so a
 * rapid-fire edit always cancels the previous evaluation before queueing
 * the next one.
 */
export default function useCompatibilityWatcher({ config, specs, dispatch, delayMs = 300 }) {
  const debounceRef = useRef(null)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const warnings = checkCompatibility({ config, specs })
      dispatch({ type: 'SET_WARNINGS', warnings })
    }, delayMs)
    return () => clearTimeout(debounceRef.current)
  }, [config, specs, dispatch, delayMs])
}
