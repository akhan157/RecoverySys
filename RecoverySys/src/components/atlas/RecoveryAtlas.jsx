import { useState } from 'react'
import './RecoveryAtlas.css'
import { CATEGORIES } from '../../data/parts.js'
import { WARN_LEVELS } from '../../lib/constants.js'
import { partSpecLine } from '../../lib/format.js'
import { slotStatus } from '../../lib/compatibility.js'

const EVENTS = [
  { id: 'ignition', label: 'IGNITION' },
  { id: 'burnout', label: 'BURNOUT' },
  { id: 'apogee', label: 'APOGEE' },
  { id: 'drogue', label: 'DROGUE' },
  { id: 'main', label: 'MAIN' },
  { id: 'touchdown', label: 'TOUCHDOWN' },
]

function fmtValue(value, unit) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—'
  return `${Number(value).toLocaleString()} ${unit}`
}

function railTime(times, id) {
  const v = times[id]
  return v === null || v === undefined ? '—' : `${v}s`
}

export default function RecoveryAtlas({
  state,
  _allParts = [],
  _onSetSpec,
  _selectPart,
  removePart,
  runSim,
  canRun = false,
  resultFresh = false,
  onExit,
  uiMode = 'atlas',
  onToggleUiMode,
}) {
  const { config = {}, simulation = null, warnings = [], activeCategory } = state ?? {}
  const [selectedSlot, setSelectedSlot] = useState(activeCategory ?? CATEGORIES[0]?.id)
  const [activePhase, setActivePhase] = useState(null)

  const cat = CATEGORIES.find((c) => c.id === selectedSlot)
  const part = config[selectedSlot]
  const findings = warnings.filter((w) => w.slot === selectedSlot)
  const filledCount = CATEGORIES.filter((c) => config[c.id]).length

  const badge = !simulation
    ? { cls: 'atlas-badge--none', text: 'No simulation' }
    : resultFresh
      ? { cls: 'atlas-badge--current', text: 'Current' }
      : { cls: 'atlas-badge--stale', text: 'Outdated · config changed' }

  const statusKey = (catId) => {
    if (!config[catId]) return 'empty'
    const status = slotStatus(catId, warnings)
    return status === 'error' ? 'warn' : status
  }

  const times = {
    ignition: 0,
    burnout: simulation?.burnout_t_s ?? null,
    apogee: simulation?.apogee_t_s ?? null,
    drogue: simulation?.apogee_t_s ?? null,
    main:
      simulation?.apogee_t_s != null && simulation?.phase1_time_s != null
        ? simulation.apogee_t_s + simulation.phase1_time_s
        : null,
    touchdown:
      simulation?.apogee_t_s != null && simulation?.total_time_s != null
        ? simulation.apogee_t_s + simulation.total_time_s
        : null,
  }

  return (
    <div data-design="atlas" className="atlas-root">
      <header className="atlas-header">
        <div className="atlas-header__title">
          <span className="atlas-header__brand">RecoverySys</span>
          <span className="atlas-header__sub">Recovery Atlas</span>
        </div>
        <div className="atlas-header__actions">
          <div className="mc-ui-mode-toggle" role="group" aria-label="UI Mode Selection">
            <button
              type="button"
              className={`mc-ui-mode-btn ${uiMode === 'classic' ? 'mc-ui-mode-btn--active' : ''}`}
              onClick={() => (onToggleUiMode ? onToggleUiMode('classic') : onExit?.())}
              aria-pressed={uiMode === 'classic'}
            >
              CLASSIC
            </button>
            <button
              type="button"
              className={`mc-ui-mode-btn ${uiMode === 'flightline' ? 'mc-ui-mode-btn--active' : ''}`}
              onClick={() => (onToggleUiMode ? onToggleUiMode('flightline') : onExit?.())}
              aria-pressed={uiMode === 'flightline'}
            >
              FLIGHTLINE
            </button>
            <button
              type="button"
              className={`mc-ui-mode-btn ${uiMode === 'atlas' ? 'mc-ui-mode-btn--active' : ''}`}
              onClick={() => onToggleUiMode && onToggleUiMode('atlas')}
              aria-pressed={uiMode === 'atlas'}
            >
              ATLAS
            </button>
          </div>
          <span className={`atlas-badge ${badge.cls}`}>{badge.text}</span>
          <button
            type="button"
            className="atlas-btn atlas-btn--primary"
            disabled={!canRun}
            onClick={() => runSim?.()}
          >
            Run Simulation
          </button>
          <button type="button" className="atlas-btn" onClick={() => onExit?.()}>
            Exit
          </button>
        </div>
      </header>

      <div className="atlas-body">
        <nav className="atlas-nav">
          <div className="atlas-panel-header">
            <span>Recovery Bay</span>
            <span>
              {filledCount}/{CATEGORIES.length}
            </span>
          </div>
          <div className="atlas-tree">
            {CATEGORIES.map((item) => {
              const slotPart = config[item.id]
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`atlas-tree-item${selectedSlot === item.id ? ' atlas-tree-item--active' : ''}`}
                  onClick={() => setSelectedSlot(item.id)}
                >
                  <span>
                    <span className="atlas-tree-item__label">
                      {item.icon} {item.label}
                    </span>
                    <span className="atlas-tree-item__name">
                      {slotPart ? slotPart.name : item.placeholder}
                    </span>
                  </span>
                  <span
                    className={`atlas-tree-item__dot atlas-tree-item__dot--${statusKey(item.id)}`}
                    aria-hidden="true"
                  />
                </button>
              )
            })}
          </div>
        </nav>

        <main className="atlas-canvas">
          <section className="atlas-drawing-card">
            <div className="atlas-panel-header">Vehicle Section</div>
            <div className="atlas-tube-viz">
              {CATEGORIES.map((item) => {
                const slotPart = config[item.id]
                const hasWarning = warnings.some((w) => w.slot === item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={[
                      'atlas-tube-slot',
                      selectedSlot === item.id ? 'atlas-tube-slot--selected' : '',
                      hasWarning ? 'atlas-tube-slot--warn' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedSlot(item.id)}
                  >
                    <span>
                      <strong>
                        {item.icon} {item.label}
                      </strong>
                      <small>{slotPart ? slotPart.name : item.placeholder}</small>
                    </span>
                    {slotPart && <span>{partSpecLine(slotPart)}</span>}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="atlas-drawing-card">
            <div className="atlas-panel-header">Flight Telemetry</div>
            <dl className="atlas-spec-row">
              <dt>Apogee</dt>
              <dd>{fmtValue(simulation?.apogee_ft, 'ft')}</dd>
            </dl>
            <dl className="atlas-spec-row">
              <dt>Main Descent</dt>
              <dd>{fmtValue(simulation?.main_fps ?? simulation?.drogue_fps, 'fps')}</dd>
            </dl>
            <dl className="atlas-spec-row">
              <dt>Drift</dt>
              <dd>{fmtValue(simulation?.drift_ft, 'ft')}</dd>
            </dl>
            <dl className="atlas-spec-row">
              <dt>Landing KE</dt>
              <dd>{fmtValue(simulation?.landing_ke_ftlbf, 'ft·lbf')}</dd>
            </dl>
          </section>
        </main>

        <aside className="atlas-inspector">
          <div className="atlas-panel-header">Inspector</div>
          <div className="atlas-inspector__content">
            <dl className="atlas-spec-row">
              <dt>Slot</dt>
              <dd>{cat ? `${cat.icon} ${cat.label}` : selectedSlot}</dd>
            </dl>
            {part ? (
              <>
                <dl className="atlas-spec-row">
                  <dt>Item</dt>
                  <dd>{part.name}</dd>
                </dl>
                <dl className="atlas-spec-row">
                  <dt>Manufacturer</dt>
                  <dd>{part.manufacturer}</dd>
                </dl>
                <dl className="atlas-spec-row">
                  <dt>Specs</dt>
                  <dd>{partSpecLine(part)}</dd>
                </dl>
                {findings.map((f, i) => (
                  <div key={`${f.slot}-${i}`} className="atlas-finding-card">
                    <strong>{f.level === WARN_LEVELS.ERROR ? 'ERROR' : 'WARNING'}</strong> —{' '}
                    {f.message}
                  </div>
                ))}
                <button
                  type="button"
                  className="atlas-btn"
                  onClick={() => removePart(selectedSlot)}
                >
                  Remove part
                </button>
              </>
            ) : (
              <div className="atlas-finding-card">{cat?.placeholder ?? 'No part selected'}</div>
            )}
          </div>
        </aside>
      </div>

      <section className="atlas-event-rail">
        <div className="atlas-panel-header">
          <span>Mission Timeline</span>
          <span>{simulation ? 'Simulated' : '—'}</span>
        </div>
        <div className="atlas-rail-track">
          <div className="atlas-rail-line" aria-hidden="true" />
          {EVENTS.map((ev) => (
            <button
              key={ev.id}
              type="button"
              className={`atlas-rail-node${activePhase === ev.id ? ' atlas-rail-node--active' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setActivePhase(activePhase === ev.id ? null : ev.id)}
            >
              <span className="atlas-rail-label">{ev.label}</span>
              <span className="atlas-rail-dot" aria-hidden="true" />
              <span className="atlas-rail-time">{railTime(times, ev.id)}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
