import { useMemo, useState } from 'react'
import './RecoveryAtlas.css'
import { CATEGORIES } from '../../data/parts.js'
import { WARN_LEVELS } from '../../lib/constants.js'
import { partSpecLine } from '../../lib/format.js'
import { slotStatus } from '../../lib/compatibility.js'
import { parseSpec } from '../../lib/schema.js'
import SpecInput from '../specs/SpecInput.jsx'

const EVENTS = [
  { id: 'ignition', label: 'IGNITION' },
  { id: 'burnout', label: 'BURNOUT' },
  { id: 'apogee', label: 'APOGEE' },
  { id: 'drogue', label: 'DROGUE' },
  { id: 'main', label: 'MAIN DEPLOY' },
  { id: 'touchdown', label: 'TOUCHDOWN' },
]

// Rocket-spec fields edited in the Inspector when the VEHICLE node is selected.
const SPEC_FIELDS = [
  {
    key: 'rocket_mass_g',
    label: 'Rocket Mass',
    unit: 'g',
    placeholder: 'e.g. 2500',
    help: 'Total liftoff weight including motor and recovery hardware',
  },
  {
    key: 'motor_total_impulse_ns',
    label: 'Motor Impulse',
    unit: 'Ns',
    placeholder: 'e.g. 640',
    help: 'Total impulse in Newton-seconds',
  },
  {
    key: 'burn_time_s',
    label: 'Burn Time',
    unit: 's',
    placeholder: 'e.g. 1.8',
    help: 'Motor burn duration in seconds',
  },
  {
    key: 'airframe_id_in',
    label: 'Airframe ID',
    unit: 'in',
    placeholder: 'e.g. 3.9',
    help: 'Inner diameter of the recovery bay tube',
  },
  {
    key: 'bay_length_in',
    label: 'Bay Length',
    unit: 'in',
    placeholder: 'e.g. 18',
    help: 'Axial length of the recovery bay',
  },
  {
    key: 'main_deploy_alt_ft',
    label: 'Main Deploy Alt',
    unit: 'ft',
    placeholder: '500',
    help: 'Altitude for main chute deployment',
  },
  {
    key: 'wind_speed_mph',
    label: 'Wind Speed',
    unit: 'mph',
    placeholder: 'e.g. 10',
    help: 'Surface wind speed',
  },
  {
    key: 'wind_direction_deg',
    label: 'Wind Dir',
    unit: '°',
    placeholder: '0=N 90=E',
    help: 'Direction wind blows FROM (meteorological)',
  },
]

function fmtValue(value, unit) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—'
  return `${Number(value).toLocaleString()} ${unit}`
}

function railTime(times, id) {
  const v = times[id]
  return v === null || v === undefined ? null : v
}

// Altitude at a given time from the simulation timeline (linear interp).
function altAtTime(timeline, t) {
  if (!timeline || timeline.length === 0 || t == null) return null
  if (t <= timeline[0].t) return timeline[0].alt
  for (let i = 1; i < timeline.length; i++) {
    if (t <= timeline[i].t) {
      const a = timeline[i - 1]
      const b = timeline[i]
      const frac = (t - a.t) / (b.t - a.t || 1)
      return Math.round(a.alt + frac * (b.alt - a.alt))
    }
  }
  return timeline[timeline.length - 1].alt
}

export default function RecoveryAtlas({
  state,
  allParts = [],
  onSetSpec,
  selectPart,
  removePart,
  runSim,
  canRun = false,
  resultFresh = false,
  onExit,
  uiMode = 'atlas',
  onToggleUiMode,
  saveConfig,
  copyShareLink,
}) {
  const { config = {}, simulation = null, warnings = [], activeCategory } = state ?? {}
  const specs = state?.specs ?? {}
  const [selectedId, setSelectedId] = useState(activeCategory ?? '__vehicle__')
  const [activePhase, setActivePhase] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const isVehicle = selectedId === '__vehicle__'
  const cat = CATEGORIES.find((c) => c.id === selectedId)
  const part = !isVehicle ? config[selectedId] : null
  const findings = isVehicle ? warnings : warnings.filter((w) => w.slot === selectedId)
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

  // ── Event times from the simulation result ────────────────────────────────
  const times = {
    ignition: simulation ? 0 : null,
    burnout: simulation?.burnout_t_s ?? null,
    apogee: simulation?.apogee_t_s ?? null,
    drogue: simulation?.apogee_t_s ?? null,
    main:
      simulation?.apogee_t_s != null && simulation?.phase1_time_s != null
        ? simulation.apogee_t_s + simulation.phase1_time_s
        : null,
    touchdown: simulation?.total_time_s != null ? simulation.total_time_s : null,
  }

  const activeEvent = EVENTS.find((e) => e.id === activePhase) ?? null
  const activeEventTime = activePhase ? railTime(times, activePhase) : null
  const activeEventAlt = activePhase ? altAtTime(simulation?.timeline, activeEventTime) : null

  // ── Bay schematic geometry (proportional, per Astra's spec) ───────────────
  const airframeId = parseSpec('airframe_id_in', specs.airframe_id_in) ?? 0
  const bayLength = parseSpec('bay_length_in', specs.bay_length_in) ?? 0
  const obstructionVol = parseSpec('bay_obstruction_vol_in3', specs.bay_obstruction_vol_in3) ?? 0
  const bayArea = airframeId > 0 ? Math.PI * Math.pow(airframeId / 2, 2) : 0
  const bayVolume = bayArea > 0 && bayLength > 0 ? bayArea * bayLength : 0
  const usableVolume = Math.max(0, bayVolume - obstructionVol)

  const slotBlocks = useMemo(() => {
    if (!isVehicle) return []
    return CATEGORIES.map((c) => {
      const p = config[c.id]
      const s = p?.specs ?? {}
      const axial = Number(s.packed_length_in ?? s.packed_height_in ?? 0)
      const radial = Number(s.packed_diam_in ?? 0)
      const heightFrac = bayLength > 0 && axial > 0 ? Math.min(1, axial / bayLength) : null
      const widthFrac = airframeId > 0 && radial > 0 ? Math.min(1, radial / airframeId) : null
      const warn = warnings.some((w) => w.slot === c.id)
      return { cat: c, part: p, heightFrac, widthFrac, warn, slotId: c.id }
    }).reverse() // packed bottom-up: first slots at bottom of tube
  }, [isVehicle, config, bayLength, airframeId, warnings])

  const stackHeightFrac =
    bayLength > 0
      ? Math.min(
          1,
          CATEGORIES.reduce((sum, c) => {
            const s = config[c.id]?.specs ?? {}
            return sum + Number(s.packed_length_in ?? s.packed_height_in ?? 0)
          }, 0) / bayLength
        )
      : null

  // ── Flight arc geometry ───────────────────────────────────────────────────
  const arc = useMemo(() => {
    const tl = simulation?.timeline
    if (!tl || tl.length < 2) return null
    const W = 460
    const H = 150
    const PAD = { l: 34, r: 10, t: 10, b: 18 }
    const tMax = tl[tl.length - 1].t || 1
    const altMax = Math.max(...tl.map((p) => p.alt)) * 1.08 || 1
    const x = (t) => PAD.l + (t / tMax) * (W - PAD.l - PAD.r)
    const y = (a) => H - PAD.b - (a / altMax) * (H - PAD.t - PAD.b)
    const path = tl
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.alt).toFixed(1)}`)
      .join(' ')
    const areaPath = `${path} L${x(tMax).toFixed(1)},${(H - PAD.b).toFixed(1)} L${x(tl[0].t).toFixed(1)},${(H - PAD.b).toFixed(1)} Z`
    return { W, H, x, y, path, areaPath, tMax, altMax, tl }
  }, [simulation])

  const arcMarkers = arc
    ? EVENTS.filter((e) => railTime(times, e.id) != null && e.id !== 'ignition').map((e) => {
        const t = railTime(times, e.id)
        const alt = altAtTime(simulation.timeline, t)
        return { ...e, t, alt, cx: arc.x(t), cy: arc.y(alt ?? 0) }
      })
    : []

  const catalogForSlot = (slotId) => allParts.filter((p) => p.category === slotId)
  const [pickerChoice, setPickerChoice] = useState('')

  const applyPicker = () => {
    if (!pickerChoice || !selectPart) return
    const chosen = allParts.find((p) => p.id === pickerChoice)
    if (chosen) {
      selectPart(selectedId, chosen)
      setPickerOpen(false)
      setPickerChoice('')
    }
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
          <button type="button" className="atlas-btn" onClick={() => saveConfig?.()}>
            Save
          </button>
          <button type="button" className="atlas-btn" onClick={() => copyShareLink?.()}>
            Share
          </button>
          <button type="button" className="atlas-btn" onClick={() => onExit?.()}>
            Exit
          </button>
        </div>
      </header>

      <div className="atlas-body">
        {/* ── Left Navigator ───────────────────────────────────────────────── */}
        <nav className="atlas-nav" aria-label="System navigator">
          <div className="atlas-panel-header">
            <span>System</span>
            <span>
              {filledCount}/{CATEGORIES.length}
            </span>
          </div>
          <div className="atlas-tree">
            <button
              type="button"
              className={`atlas-tree-item${isVehicle ? ' atlas-tree-item--active' : ''}`}
              onClick={() => setSelectedId('__vehicle__')}
            >
              <span>
                <span className="atlas-tree-item__label">⊕ Vehicle</span>
                <span className="atlas-tree-item__name">Rocket specs & environment</span>
              </span>
            </button>
            {CATEGORIES.map((item) => {
              const slotPart = config[item.id]
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`atlas-tree-item${selectedId === item.id ? ' atlas-tree-item--active' : ''}`}
                  onClick={() => {
                    setSelectedId(item.id)
                    setPickerOpen(false)
                  }}
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

        {/* ── Center Canvas ────────────────────────────────────────────────── */}
        <main className="atlas-canvas">
          <section className="atlas-drawing-card">
            <div className="atlas-panel-header">
              <span>Recovery Bay — Section View</span>
              <span className="atlas-panel-note">Schematic · not to scale</span>
            </div>
            {bayVolume <= 0 ? (
              <div className="atlas-empty-hint">
                Set Airframe ID and Bay Length in the Vehicle inspector to draw the bay.
              </div>
            ) : (
              <div className="atlas-tube-viz">
                {isVehicle ? (
                  <>
                    {slotBlocks.map((b) => (
                      <button
                        key={b.cat.id}
                        type="button"
                        className={[
                          'atlas-tube-slot',
                          b.part ? 'atlas-tube-slot--filled' : 'atlas-tube-slot--empty',
                          b.warn ? 'atlas-tube-slot--warn' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={{
                          minHeight: b.heightFrac
                            ? `${Math.max(18, b.heightFrac * 100)}px`
                            : '18px',
                          width: b.widthFrac ? `${Math.max(30, b.widthFrac * 100)}%` : '60%',
                          alignSelf: 'center',
                        }}
                        onClick={() => setSelectedId(b.slotId)}
                        aria-label={`Select ${b.cat.label}`}
                      >
                        <span className="atlas-tube-slot__name">
                          {b.cat.icon} {b.part ? b.part.name : b.cat.placeholder}
                        </span>
                        {b.part && b.widthFrac != null && (
                          <span className="atlas-tube-slot__clearance">
                            {Math.round(b.widthFrac * 100)}% ID
                          </span>
                        )}
                      </button>
                    ))}
                    <div
                      className="atlas-tube-gauge"
                      role="img"
                      aria-label={`Bay stack ${stackHeightFrac != null ? Math.round(stackHeightFrac * 100) : 0}% of bay length`}
                    >
                      <i
                        style={{ width: `${(stackHeightFrac ?? 0) * 100}%` }}
                        className={
                          (stackHeightFrac ?? 0) > 0.85
                            ? 'atlas-gauge-fill atlas-gauge-fill--warn'
                            : 'atlas-gauge-fill'
                        }
                      />
                      <span className="atlas-tube-gauge__label">
                        Stack {stackHeightFrac != null ? Math.round(stackHeightFrac * 100) : 0}% of{' '}
                        {bayLength}″ bay
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="atlas-empty-hint">
                    Select the Vehicle node to view the full bay section, or pick a slot in the
                    System navigator to inspect it here.
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="atlas-drawing-card">
            <div className="atlas-panel-header">
              <span>Flight Arc — Altitude vs Time</span>
              <span className="atlas-panel-note">
                {simulation
                  ? `Predicted · apogee ${fmtValue(simulation.apogee_ft, 'ft')}`
                  : 'No simulation'}
              </span>
            </div>
            {arc ? (
              <svg
                className="atlas-arc"
                viewBox={`0 0 ${arc.W} ${arc.H}`}
                role="img"
                aria-label="Predicted altitude versus time"
              >
                {[0.25, 0.5, 0.75].map((f) => (
                  <line
                    key={f}
                    x1={arc.PAD ?? 34}
                    x2={arc.W - 10}
                    y1={arc.H - 18 - f * (arc.H - 28)}
                    y2={arc.H - 18 - f * (arc.H - 28)}
                    className="atlas-arc-grid"
                  />
                ))}
                <path d={arc.areaPath} className="atlas-arc-area" />
                <path d={arc.path} className="atlas-arc-line" />
                {arcMarkers.map((m) => (
                  <g
                    key={m.id}
                    className={`atlas-arc-marker${activePhase === m.id ? ' atlas-arc-marker--active' : ''}`}
                  >
                    <line
                      x1={m.cx}
                      y1={m.cy}
                      x2={m.cx}
                      y2={arc.H - 18}
                      className="atlas-arc-drop"
                    />
                    <circle cx={m.cx} cy={m.cy} r={activePhase === m.id ? 5 : 3.5} />
                    <text x={m.cx} y={m.cy - 8} textAnchor="middle">
                      {m.label}
                    </text>
                  </g>
                ))}
                <text x={4} y={arc.H - 4} className="atlas-arc-axis">
                  0s
                </text>
                <text x={arc.W - 22} y={arc.H - 4} className="atlas-arc-axis">
                  {Math.round(arc.tMax)}s
                </text>
              </svg>
            ) : (
              <div className="atlas-empty-hint">
                Run a simulation to inspect the recovery sequence.
              </div>
            )}
          </section>
        </main>

        {/* ── Right Inspector ──────────────────────────────────────────────── */}
        <aside className="atlas-inspector" aria-label="Inspector">
          <div className="atlas-panel-header">
            <span>{isVehicle ? 'Vehicle Inspector' : `${cat?.label ?? 'Slot'} Inspector`}</span>
          </div>
          <div className="atlas-inspector__content">
            {isVehicle ? (
              <>
                <div className="atlas-inspector__hint">
                  Editable inputs. Blank fields fall back to documented defaults.
                </div>
                {SPEC_FIELDS.map((f) => (
                  <SpecInput
                    key={f.key}
                    id={`atlas-${f.key}`}
                    label={f.label}
                    value={specs[f.key] ?? ''}
                    unit={f.unit}
                    placeholder={f.placeholder}
                    help={f.help}
                    onChange={(v) => onSetSpec?.(f.key, v)}
                  />
                ))}
                <dl className="atlas-spec-row">
                  <dt>Bay Volume</dt>
                  <dd>{bayVolume > 0 ? `${bayVolume.toFixed(1)} in³` : '—'}</dd>
                </dl>
                <dl className="atlas-spec-row">
                  <dt>Usable (−obstructions)</dt>
                  <dd>{usableVolume > 0 ? `${usableVolume.toFixed(1)} in³` : '—'}</dd>
                </dl>
              </>
            ) : (
              <>
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
                  </>
                ) : (
                  <div className="atlas-inspector__hint">
                    {cat?.placeholder ?? 'No part selected'}
                  </div>
                )}

                {findings.length > 0 && (
                  <div className="atlas-findings">
                    {findings.map((f, i) => (
                      <div
                        key={`${f.slot}-${i}`}
                        className={`atlas-finding-card ${
                          f.level === WARN_LEVELS.ERROR
                            ? 'atlas-finding-card--error'
                            : 'atlas-finding-card--warn'
                        }`}
                      >
                        <strong>{f.level === WARN_LEVELS.ERROR ? 'ERROR' : 'WARNING'}</strong> —{' '}
                        {f.message}
                      </div>
                    ))}
                  </div>
                )}

                {/* Part picker — the core missing capability */}
                <div className="atlas-picker">
                  <button
                    type="button"
                    className="atlas-btn"
                    onClick={() => setPickerOpen(!pickerOpen)}
                    aria-expanded={pickerOpen}
                  >
                    {part ? 'Change Part ▾' : 'Select Part ▾'}
                  </button>
                  {pickerOpen && (
                    <div className="atlas-picker__panel">
                      <label className="atlas-picker__label" htmlFor="atlas-part-picker">
                        Catalog — {cat?.label}
                      </label>
                      <select
                        id="atlas-part-picker"
                        className="atlas-picker__select"
                        value={pickerChoice}
                        onChange={(e) => setPickerChoice(e.target.value)}
                        size={8}
                      >
                        <option value="" disabled>
                          Choose from {catalogForSlot(selectedId).length} catalog parts…
                        </option>
                        {catalogForSlot(selectedId).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {partSpecLine(p)}
                          </option>
                        ))}
                      </select>
                      <div className="atlas-picker__actions">
                        <button
                          type="button"
                          className="atlas-btn atlas-btn--primary"
                          disabled={!pickerChoice}
                          onClick={applyPicker}
                        >
                          Apply to Bay
                        </button>
                        <button
                          type="button"
                          className="atlas-btn"
                          onClick={() => setPickerOpen(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {part && (
                  <button
                    type="button"
                    className="atlas-btn"
                    onClick={() => removePart(selectedId)}
                  >
                    Remove from Bay
                  </button>
                )}
              </>
            )}
          </div>
        </aside>
      </div>

      {/* ── Bottom Event Rail ──────────────────────────────────────────────── */}
      <section className="atlas-event-rail" aria-label="Mission timeline">
        <div className="atlas-panel-header">
          <span>Mission Timeline</span>
          <span>{simulation ? 'Simulated phases — select an event' : '—'}</span>
        </div>
        {simulation ? (
          <>
            <div className="atlas-rail-track">
              <div className="atlas-rail-line" aria-hidden="true" />
              {EVENTS.map((ev) => {
                const t = railTime(times, ev.id)
                return (
                  <button
                    key={ev.id}
                    type="button"
                    className={`atlas-rail-node${activePhase === ev.id ? ' atlas-rail-node--active' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setActivePhase(activePhase === ev.id ? null : ev.id)}
                    disabled={t == null}
                  >
                    <span className="atlas-rail-label">{ev.label}</span>
                    <span className="atlas-rail-dot" aria-hidden="true" />
                    <span className="atlas-rail-time">{t != null ? `${t}s` : '—'}</span>
                  </button>
                )
              })}
            </div>
            {activeEvent && (
              <div className="atlas-event-detail" role="status">
                <strong>{activeEvent.label}</strong>
                <span>
                  T+{activeEventTime}s · altitude{' '}
                  {activeEventAlt != null ? `${activeEventAlt.toLocaleString()} ft` : '—'}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="atlas-empty-hint" style={{ padding: '12px 20px' }}>
            Run a simulation to inspect the recovery sequence.
          </div>
        )}
      </section>
    </div>
  )
}
