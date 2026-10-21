import './DemoBanner.css'

// Shown at the top of the app when ?demo=1 is in the URL. Tells the user the
// config is a sample so they don't think it's their own work, and offers a
// one-click reset. Sticks above the MC header.
export default function DemoBanner({ onExit }) {
  return (
    <div className="demo-banner" role="status">
      <div className="demo-banner__inner">
        <span className="demo-banner__tag">DEMO</span>
        <span className="demo-banner__msg">
          Sample L3 recovery plan · FAR Mojave.
          <span className="demo-banner__help">
            {' '}
            Explore the tabs, or start fresh with your own inputs.
          </span>
        </span>
        <button type="button" className="demo-banner__btn" onClick={onExit}>
          ✕ START_FRESH
        </button>
      </div>
    </div>
  )
}
