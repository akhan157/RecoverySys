import { useMemo, useState } from 'react'
import { computeDescentRate } from '../../lib/simulation.js'
import { computePackingVolume } from '../../lib/compatibility.js'
import { normalizeCalculationInputs } from '../../lib/schema.js'
import { WARN_LEVELS } from '../../lib/constants.js'
import { partSpecLine } from '../../lib/format.js'
import SpecInput from '../specs/SpecInput.jsx'

const positive = (value) => {
  if (value === '' || value == null) return null
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

// Production quick-draft workspace: main-chute-first exploration wired to the
// shared plan state. Uses the same mass convention as SuggestPanel (specs mass
// is the total descending mass) and the same packing model as the dashboard.
export default function QuickDraftTab({
  state,
  allParts,
  selectPart,
  removePart,
  setSpec,
  resultFresh,
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('catalog')
  const [target, setTarget] = useState('')
  const [baseline, setBaseline] = useState(null)
  const [previousId, setPreviousId] = useState(null)
  const [canUndo, setCanUndo] = useState(false)
  const { specs, config, simulation } = state
  const mainChutes = useMemo(() => allParts.filter((p) => p.category === 'main_chute'), [allParts])
  const { mass_kg } = normalizeCalculationInputs(specs)
  const targetFps = positive(target)

  const estimateFor = (part) => {
    if (!part || !mass_kg) return null
    const fps = computeDescentRate(part.specs, mass_kg, 0)
    return fps > 0 ? fps : null
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const parts = mainChutes.filter((p) =>
      `${p.name} ${p.manufacturer} ${p.specs.diameter_in}`.toLowerCase().includes(q)
    )
    if (sort === 'size') return [...parts].sort((a, b) => a.specs.diameter_in - b.specs.diameter_in)
    if (sort === 'rate' && targetFps && mass_kg) {
      return [...parts].sort(
        (a, b) =>
          (estimateFor(a) == null ? Infinity : Math.abs(estimateFor(a) - targetFps)) -
          (estimateFor(b) == null ? Infinity : Math.abs(estimateFor(b) - targetFps))
      )
    }
    return parts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainChutes, query, sort, targetFps, mass_kg, specs])

  const selected = config.main_chute ?? null
  const currentFps = estimateFor(selected)
  const packing = useMemo(() => computePackingVolume({ config, specs }), [config, specs])

  const choose = (part) => {
    if (!part || part.id === selected?.id) return
    setPreviousId(selected?.id ?? null)
    setCanUndo(true)
    selectPart(part)
  }
  const remove = () => {
    setPreviousId(selected?.id ?? null)
    setCanUndo(true)
    removePart('main_chute')
  }
  const undo = () => {
    setCanUndo(false)
    if (previousId == null) {
      if (selected) removePart('main_chute')
      return
    }
    const part = allParts.find((p) => p.id === previousId)
    if (part) selectPart(part)
    else if (selected) removePart('main_chute')
  }
  return (
    <div className="mc-dashboard">
      {/* ── Catalog (left) ─────────────────────────────────────────── */}
      <div className="mc-parts-panel">
        <h2 className="mc-panel-header">DRAFT_PARTS · MAIN_CHUTE</h2>
        <div className="mc-parts-scroll mc-draft-catalog">
          <input
            aria-label="Search main chutes"
            placeholder="Search name, maker, size"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label>
            Order
            <select aria-label="Order parts" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="catalog">Catalog order</option>
              <option value="size">Canopy diameter</option>
              <option value="rate">Closest to target rate</option>
            </select>
          </label>
          <p>
            {visible.length} of {mainChutes.length} catalog chutes · catalog data unverified
          </p>
          {visible.map((p) => {
            const isSelected = p.id === selected?.id
            const fps = estimateFor(p)
            return (
              <div key={p.id} className={`mc-slot ${isSelected ? 'mc-slot--active' : ''}`}>
                <div className="mc-slot__label">{p.manufacturer}</div>
                <div className="mc-slot__name">{p.name}</div>
                <div className="mc-slot__specs">{partSpecLine(p)}</div>
                <div className="mc-slot__specs">
                  {fps != null ? `${fps.toFixed(1)} ft/s estimate` : 'Add mass for estimate'}
                </div>
                <button
                  type="button"
                  onClick={() => choose(p)}
                  aria-pressed={isSelected}
                  disabled={isSelected}
                >
                  {isSelected ? 'Selected' : selected ? 'Use instead' : 'Add to draft'}
                </button>
              </div>
            )
          })}
          {visible.length === 0 && <p>No matching chutes. Change or clear your search.</p>}
        </div>
      </div>

      {/* ── Draft (center) ─────────────────────────────────────────── */}
      <div className="mc-schematic">
        <h2 className="mc-panel-header">
          QUICK_DRAFT
          <span className="mc-panel-header__right">
            <button type="button" onClick={undo} disabled={!canUndo}>
              Undo swap
            </button>
          </span>
        </h2>
        {selected ? (
          <div className="mc-slot">
            <div className="mc-slot__label">MAIN_CHUTE · SELECTED</div>
            <div className="mc-slot__name">{selected.name}</div>
            <div className="mc-slot__specs">{partSpecLine(selected)}</div>
            <button type="button" onClick={remove}>
              Remove chute
            </button>
          </div>
        ) : (
          <div className="mc-slot mc-slot--empty">
            <div className="mc-slot__name">No main chute selected</div>
            <div className="mc-slot__specs">
              Pick any candidate to begin. No mass needed to start.
            </div>
          </div>
        )}
        <SpecInput
          id="draft-mass"
          label="Rocket mass — total descending mass"
          value={specs.rocket_mass_g ?? ''}
          unit="g"
          placeholder="e.g. 3000"
          onChange={(v) => setSpec('rocket_mass_g', v)}
          help="Total descending mass used for the descent estimate, same convention as part suggestions."
        />
        <SpecInput
          id="draft-target"
          label="Optional descent target"
          value={target}
          unit="ft/s"
          placeholder="No target set"
          onChange={setTarget}
        />
        <SpecInput
          id="draft-airframe-id"
          label="Airframe ID"
          value={specs.airframe_id_in ?? ''}
          unit="in"
          placeholder="Unknown"
          onChange={(v) => setSpec('airframe_id_in', v)}
        />
        <SpecInput
          id="draft-bay-length"
          label="Bay length"
          value={specs.bay_length_in ?? ''}
          unit="in"
          placeholder="Unknown"
          onChange={(v) => setSpec('bay_length_in', v)}
        />
      </div>

      {/* ── Feedback (right) ───────────────────────────────────────── */}
      <div className="mc-config-summary">
        <h2 className="mc-panel-header">DRAFT_FEEDBACK</h2>
        <div className="mc-summary">
          {state.warnings.length > 0 && (
            <div
              className={`mc-validation ${
                state.warnings.some((w) => w.level === WARN_LEVELS.ERROR)
                  ? 'mc-validation--error'
                  : 'mc-validation--warn'
              }`}
            >
              ⚠ {state.warnings.length} WARNING{state.warnings.length !== 1 ? 'S' : ''}_DETECTED
            </div>
          )}
          {!selected && <p>Select a main chute to begin.</p>}
          {selected && !mass_kg && <p>Enter a positive rocket mass to estimate descent.</p>}
          {selected && mass_kg && currentFps != null && (
            <div className="mc-metric">
              <div className="mc-metric__label">TERMINAL_DESCENT · SEA LEVEL</div>
              <div className="mc-metric__value">{currentFps.toFixed(1)} ft/s</div>
              {targetFps != null && (
                <p>
                  {currentFps > targetFps ? 'Above' : 'At or below'} your target. Not a safety
                  verdict.
                </p>
              )}
            </div>
          )}
          {packing.bay_known && packing.fraction != null && (
            <div className="mc-metric">
              <div className="mc-metric__label">PACKING_SCREENING</div>
              <div className="mc-metric__value">{(packing.fraction * 100).toFixed(0)}%</div>
              <p>
                {packing.fraction > 1
                  ? 'Exceeds modeled effective space.'
                  : 'Within modeled space allowance, not proof of deployability.'}
              </p>
            </div>
          )}
          {simulation && !resultFresh && (
            <p>Working inputs changed. Previous simulation result is stale until rerun.</p>
          )}
          <button
            type="button"
            disabled={currentFps == null}
            onClick={() =>
              setBaseline(
                selected ? { id: selected.id, name: selected.name, fps: currentFps } : null
              )
            }
          >
            Keep estimate for comparison
          </button>
          {baseline && (
            <p>
              Baseline: {baseline.name} · {baseline.fps.toFixed(1)} ft/s
              {baseline.id !== selected?.id && ' (earlier selection — draft changed)'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
