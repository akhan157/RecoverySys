import React from 'react'
import { CATEGORIES } from '../../data/parts.js'
import { partSpecLine } from '../../lib/format.js'
import PartsBrowser from '../PartsBrowser.jsx'
import SuggestPanel from '../SuggestPanel.jsx'

export default function DashboardTab({
  state, allParts, customParts, filledSlots, totalMass,
  hasWarnings, hasErrors, canRun,
  selectPart, removePart, setCategory, runSim,
  addCustomPart, deleteCustomPart,
}) {
  return (
    <div className="mc-dashboard">
      {/* ── Parts Catalog (left) ─────────────────────────────────────── */}
      <div className="mc-parts-panel">
        <h2 className="mc-panel-header">PARTS_CATALOG_EXPLORER</h2>
        <div className="mc-parts-scroll">
          <PartsBrowser
            parts={allParts}
            categories={CATEGORIES}
            activeCategory={state.activeCategory}
            config={state.config}
            warnings={state.warnings}
            customParts={customParts}
            onSelectCategory={setCategory}
            onSelectPart={selectPart}
            onAddCustomPart={addCustomPart}
            onDeleteCustomPart={deleteCustomPart}
          />
        </div>
      </div>

      {/* ── Bay Schematic (center) ───────────────────────────────────── */}
      <div className="mc-schematic">
        <h2 className="mc-panel-header">
          BAY_SCHEMATIC_REALTIME_RENDER
          <span className="mc-panel-header__right">LAYER: 01_INTERNAL &nbsp; SCALE: 1:10</span>
        </h2>
        <div className="mc-bay-grid">
          {CATEGORIES.map((cat, i) => {
            const part = state.config[cat.id]
            const isEmpty = !part
            const isActive = state.activeCategory === cat.id
            return (
              <div
                key={cat.id}
                className={`mc-slot ${isEmpty ? 'mc-slot--empty' : ''} ${isActive ? 'mc-slot--active' : ''}`}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                aria-label={`Select ${cat.code} slot${part ? `, currently ${part.name}` : ', empty'}`}
                onClick={() => setCategory(cat.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setCategory(cat.id)
                  }
                }}
              >
                <div className="mc-slot__badge">{String(i + 1).padStart(2, '0')}</div>
                {part && (
                  <button
                    className="mc-slot__remove"
                    onClick={(e) => { e.stopPropagation(); removePart(cat.id) }}
                    title="Remove"
                    aria-label={`Remove ${part.name}`}
                  >×</button>
                )}
                <div className="mc-slot__label">{cat.code}</div>
                <div className="mc-slot__name">
                  {part ? part.name : 'NO_COMPONENT_LOADED'}
                </div>
                {part && (
                  <div className="mc-slot__specs">{partSpecLine(part)}</div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Suggest Parts (below bay schematic) ────────────────────── */}
        <div className="mc-suggest-wrap">
          <SuggestPanel
            parts={allParts}
            specs={state.specs}
            config={state.config}
            onSelectPart={selectPart}
          />
        </div>
      </div>

      {/* ── Config Summary (right) ───────────────────────────────────── */}
      <div className="mc-config-summary">
        <h2 className="mc-panel-header">CONFIG_SUMMARY</h2>
        <div className="mc-summary">
          {/* Total Mass — gauge range scales to L3 (≥10 kg) if rocket is that big */}
          {(() => {
            // Bucket the scale so the label stays stable while the user edits parts:
            // 5 kg (H/I-class default) → 10 kg (J/K) → 20 kg (L3) → 40 kg (L3 heavy)
            const gaugeMax_g =
              totalMass <= 5000  ? 5000  :
              totalMass <= 10000 ? 10000 :
              totalMass <= 20000 ? 20000 : 40000
            const gaugeMax_kg = (gaugeMax_g / 1000).toFixed(1)
            return (
              <div className="mc-metric">
                <div className="mc-metric__label">TOTAL_MASS</div>
                <div className="mc-metric__value">
                  {(totalMass / 1000).toFixed(2)}<span className="mc-metric__unit">KG</span>
                </div>
                <div className="mc-progress">
                  <div
                    className="mc-progress__fill"
                    style={{ width: `${Math.min(100, (totalMass / gaugeMax_g) * 100)}%` }}
                  />
                </div>
                <div className="mc-progress__labels">
                  <span>0.0KG</span><span>MAX {gaugeMax_kg}KG</span>
                </div>
              </div>
            )
          })()}

          {/* Sim results in summary */}
          {state.simulation && (
            <>
              <div className="mc-metric">
                <div className="mc-metric__label">APOGEE_ALTITUDE</div>
                <div className="mc-metric__value">
                  {state.simulation.apogee_ft.toLocaleString()}<span className="mc-metric__unit">FT</span>
                </div>
                <div className="mc-metric__sub">{state.simulation.apogee_method?.toUpperCase() || 'CALCULATED'}</div>
              </div>
              <div className="mc-metric">
                <div className="mc-metric__label">DESCENT_RATE</div>
                <div className="mc-metric__value">
                  {state.simulation.main_fps != null
                    ? state.simulation.main_fps.toFixed(1)
                    : '—'}
                  <span className="mc-metric__unit">FT/S</span>
                </div>
                <div className="mc-metric__sub">
                  {state.simulation.main_fps == null
                    ? 'DROGUE_ONLY'
                    : state.simulation.main_fps > 15 ? 'ABOVE_NOMINAL' : 'WITHIN_LIMITS'}
                </div>
              </div>
            </>
          )}

          {/* Slots count */}
          <div className="mc-slots-grid">
            <div className="mc-slots-grid__item">
              <div className="mc-slots-grid__value">{String(filledSlots).padStart(2, '0')}/08</div>
              <div className="mc-slots-grid__label">SLOTS</div>
            </div>
            <div className="mc-slots-grid__item">
              <div className="mc-slots-grid__value">{filledSlots}</div>
              <div className="mc-slots-grid__label">COMPONENTS</div>
            </div>
          </div>

          {/* Validation badge */}
          {hasErrors ? (
            <div className="mc-validation mc-validation--error">
              ⚠ {state.warnings.length} WARNING{state.warnings.length !== 1 ? 'S' : ''}_DETECTED
            </div>
          ) : hasWarnings ? (
            <div className="mc-validation mc-validation--warn">
              ⚠ {state.warnings.length} NOTICE{state.warnings.length !== 1 ? 'S' : ''}
            </div>
          ) : (
            <div className="mc-validation">✓ VALIDATION_PASSED</div>
          )}

          {/* Run Sim */}
          <button className="mc-run-btn" onClick={runSim} disabled={!canRun}>
            {state.simRunning ? 'RUNNING_SIMULATION...' : 'RUN_SIMULATION →'}
          </button>
        </div>
      </div>
    </div>
  )
}
