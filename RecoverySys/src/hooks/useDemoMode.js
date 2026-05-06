import { useState, useEffect, useRef, useCallback } from 'react'
import { runSimulation } from '../lib/simulation.js'
import { SLOT_IDS } from '../data/parts.js'
import { SHARE_PARAM } from '../lib/shareLink.js'

/**
 * Demo mode bootstrap. Triggered by `?demo=1` (e.g. landing-page LAUNCH
 * button). On first render after a demo URL hits, this hook seeds
 * config + specs from a sample L3 dual-deploy configuration at FAR Mojave,
 * runs the simulation synchronously so chart + metrics are populated
 * in the same paint, and dispatches LOAD_SHARE + SET_SIM.
 *
 * If a `?c=` share link is also present, the share-link loader wins —
 * demo bootstrap is silently skipped.
 *
 * exitDemo() clears state + strips ?demo=1 from the URL so a refresh
 * doesn't re-trigger.
 *
 * Inputs:
 *   - allParts:      catalog merged with custom (read once at mount)
 *   - demoPartIds:   { [slot]: id } map of which catalog parts to seed
 *   - demoSpecs:     specs object to seed
 *   - dispatch:      reducer dispatcher
 *
 * Returns: { demoMode, exitDemo }
 */
export default function useDemoMode({ allParts, demoPartIds, demoSpecs, dispatch }) {
  const [demoMode, setDemoMode] = useState(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(location.search)
    if (params.get('demo') === '1') return true
    if (params.get(SHARE_PARAM)) return false
    try {
      const hasConfig  = !!localStorage.getItem('recoverysys-config')
      const hasVisited = !!localStorage.getItem('recoverysys-visited')
      return !hasConfig && !hasVisited
    } catch { return false }
  })
  const demoLoaded = useRef(false)

  useEffect(() => {
    if (demoLoaded.current) return        // StrictMode-safe single load
    if (!demoMode) return
    if (new URLSearchParams(location.search).get(SHARE_PARAM)) return  // share link wins
    demoLoaded.current = true

    const config = Object.fromEntries(
      SLOT_IDS.map(slot => [slot, allParts.find(p => p.id === demoPartIds[slot] && p.category === slot) ?? null])
    )
    // Run sim synchronously before dispatching so config + results land in
    // the same render batch. safeTimeout would be cleared by StrictMode's
    // unmount/remount cycle.
    const result = runSimulation({ specs: demoSpecs, config, customMotor: null })
    dispatch({
      type: 'LOAD_SHARE',
      config,
      specs: { ...demoSpecs },
      customMotor: null,
    })
    if (result) dispatch({ type: 'SET_SIM', simulation: result })
    // Mount-once + demoMode-edge: allParts read once is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode])

  const exitDemo = useCallback(() => {
    // Clear the saved config so the page reload starts with a blank slate.
    // We do this before navigating because dispatch(CLEAR_ALL) + usePersistence
    // would race against the reload and the demo config might win.
    try {
      localStorage.removeItem('recoverysys-config')
      localStorage.setItem('recoverysys-visited', '1')
    } catch { /* silent */ }
    // Hard-navigate to the clean URL (removes ?demo=1, triggers visible reload).
    // replaceState would silently mutate the URL bar with no perceived navigation.
    window.location.replace(window.location.pathname)
  }, [])

  return { demoMode, exitDemo }
}
