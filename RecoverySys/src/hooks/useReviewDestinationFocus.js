import { useEffect, useRef } from 'react'

/**
 * Focus a destination element after a review action switches tabs.
 *
 * The Analysis review contract requires that activating a review link opens
 * the owning surface AND focuses the affected input or part. Each tab passes
 * a `resolve` that maps the review target path (e.g. 'specs.rocket_mass_g' or
 * 'config.main_chute') to the DOM element to focus; the parent clears the
 * request through `onConsumed` so the focus handoff happens exactly once.
 *
 * `resolve`/`onConsumed` are read through refs so callers can pass inline
 * closures without re-running the effect on every render.
 */
export function useReviewDestinationFocus({ focusTarget, onConsumed, resolve }) {
  const resolveRef = useRef(resolve)
  resolveRef.current = resolve
  const onConsumedRef = useRef(onConsumed)
  onConsumedRef.current = onConsumed

  useEffect(() => {
    if (!focusTarget) return
    const element = resolveRef.current?.(focusTarget)
    if (element && typeof element.focus === 'function') {
      element.focus()
      onConsumedRef.current?.()
    }
  }, [focusTarget])
}
