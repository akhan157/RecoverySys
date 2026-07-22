import './DemoBanner.css'
import { useEffect, useRef, useState } from 'react'

// Shown at the top of the app when ?demo=1 is in the URL. Tells the user the
// config is a sample so they don't think it's their own work, and offers a
// one-click reset. Sticks above the MC header.
export default function DemoBanner({ onExit, hasSavedConfig = false }) {
  const [confirming, setConfirming] = useState(false)
  const cancelRef = useRef(null)

  useEffect(() => {
    if (!confirming) return undefined
    cancelRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setConfirming(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirming])

  const startFresh = () => {
    if (hasSavedConfig) setConfirming(true)
    else onExit()
  }

  return (
    <div className="demo-banner" role="status">
      <div className="demo-banner__inner">
        <span className="demo-banner__tag">EXAMPLE</span>
        <span className="demo-banner__msg">
          You're viewing a sample L3 recovery configuration at FAR Mojave. Explore the tabs to see
          how it works.
        </span>
        <button type="button" className="demo-banner__btn" onClick={startFresh}>
          Start Fresh
        </button>
      </div>
      {confirming && (
        <div className="demo-banner__dialog-backdrop" role="presentation">
          <section
            className="demo-banner__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="start-fresh-title"
            aria-describedby="start-fresh-description"
          >
            <h2 id="start-fresh-title">Start with a blank configuration?</h2>
            <p id="start-fresh-description">
              This is the current example configuration. Your saved configuration is separate and
              will be permanently deleted if you continue. Cancel to keep your saved configuration.
            </p>
            <div className="demo-banner__dialog-actions">
              <button
                ref={cancelRef}
                type="button"
                className="demo-banner__btn"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="demo-banner__btn demo-banner__btn--danger"
                onClick={onExit}
              >
                Delete saved configuration and start fresh
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
