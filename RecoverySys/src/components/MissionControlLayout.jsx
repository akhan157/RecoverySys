import React, { useState, useMemo } from 'react'
import { CATEGORIES, CATEGORY_BY_ID } from '../data/parts.js'
import { partSpecLine } from '../lib/format.js'
import PartsBrowser from './PartsBrowser.jsx'
import ConfigBuilder from './ConfigBuilder.jsx'
import SuggestPanel from './SuggestPanel.jsx'
import DispersionMap from './DispersionMap.jsx'
import FlightChart from './FlightChart.jsx'
import './MissionControlLayout.css'

const TABS = [
  { id: 'DASHBOARD',  icon: '⊞', label: 'DASHBOARD' },
  { id: 'SIMULATION', icon: '⊕', label: 'SIMULATION' },
  { id: 'DISPERSION', icon: '◎', label: 'DISPERSION' },
  { id: 'SPECS',      icon: '≡', label: 'ROCKET_SPECS' },
  { id: 'EXPORT',     icon: '☰', label: 'EXPORT' },
]

// ── Main Component ───────────────────────────────────────────────────────

export default function MissionControlLayout({
  state, allParts, customParts,
  selectPart, removePart, setSpec, setCategory, runSim,
  saveConfig, copyShareLink, addCustomPart, deleteCustomPart,
  setCustomMotor, clearCustomMotor, addToast,
  darkMode, setDarkMode,
}) {
  const [activeTab, setActiveTab] = useState('DASHBOARD')

  const filledSlots = useMemo(() =>
    CATEGORIES.filter(c => state.config[c.id] != null).length,
    [state.config]
  )

  const totalMass = useMemo(() => {
    let mass = 0
    CATEGORIES.forEach(c => {
      const part = state.config[c.id]
      if (part?.specs?.weight_g) mass += part.specs.weight_g
    })
    return mass
  }, [state.config])

  const hasWarnings = state.warnings.length > 0
  const hasErrors = state.warnings.some(w => w.level === 'error')

  // Mirror runSimulation's preconditions exactly — inputs are strings from <input>,
  // so '0' and '-5' are truthy. parseFloat(...) > 0 matches what simulation.js rejects.
  const canRun = (
    parseFloat(state.specs.rocket_mass_g) > 0 &&
    parseFloat(state.specs.motor_total_impulse_ns) > 0 &&
    !!(state.config.main_chute || state.config.drogue_chute)
  )

  return (
    <div className="mc">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="mc-header">
        <span className="mc-header__brand">RECOVERYSYS_V1.1</span>
        <nav className="mc-header__tabs" aria-label="Main navigation">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`mc-header__tab ${activeTab === tab.id ? 'mc-header__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.id}
            </button>
          ))}
        </nav>
        <div className="mc-header__right">
          <button className="mc-header__icon-btn" onClick={() => setDarkMode(d => !d)} title="Toggle theme" aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
            {darkMode ? '☀' : '☾'}
          </button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="mc-body">
        {/* ── Main Content Area ─────────────────────────────────────────── */}
        <main className="mc-main" role="main">
          {activeTab === 'DASHBOARD' && (
            <DashboardTab
              state={state}
              allParts={allParts}
              customParts={customParts}
              filledSlots={filledSlots}
              totalMass={totalMass}
              hasWarnings={hasWarnings}
              hasErrors={hasErrors}
              canRun={canRun}
              selectPart={selectPart}
              removePart={removePart}
              setCategory={setCategory}
              runSim={runSim}
              addCustomPart={addCustomPart}
              deleteCustomPart={deleteCustomPart}
            />
          )}
          {activeTab === 'SIMULATION' && (
            <SimulationTab
              state={state}
              allParts={allParts}
              selectPart={selectPart}
              runSim={runSim}
              canRun={canRun}
            />
          )}
          {activeTab === 'DISPERSION' && (
            <DispersionTab
              state={state}
            />
          )}
          {activeTab === 'SPECS' && (
            <SpecsTab
              state={state}
              setSpec={setSpec}
              removePart={removePart}
              setCategory={setCategory}
              saveConfig={saveConfig}
              copyShareLink={copyShareLink}
              setCustomMotor={setCustomMotor}
              clearCustomMotor={clearCustomMotor}
              addToast={addToast}
            />
          )}
          {activeTab === 'EXPORT' && (
            <ExportTab
              state={state}
              saveConfig={saveConfig}
              copyShareLink={copyShareLink}
            />
          )}
        </main>
      </div>

      {/* ── Status Bar ──────────────────────────────────────────────────── */}
      <div className="mc-statusbar">
        <button
          className="mc-statusbar__run"
          onClick={runSim}
          disabled={!canRun}
        >
          {state.simRunning ? '⟳ RUNNING...' : '▶ RUN_SIM'}
        </button>
        <div className="mc-statusbar__item">
          MOTOR: {parseFloat(state.specs.motor_total_impulse_ns) > 0 ? `${state.specs.motor_total_impulse_ns}Ns` : 'NOT_SET'}
        </div>
        <div className="mc-statusbar__item">
          DESCENT_RATE: {state.simulation?.main_fps != null ? `${state.simulation.main_fps.toFixed(1)} FT/S` : '—'}
        </div>
        <div className="mc-statusbar__item">
          DRIFT: {state.simulation?.drift_ft != null ? `${state.simulation.drift_ft.toFixed(0)} FT` : '—'}
        </div>
        {state.simulation?.shock_load && (
          <div className="mc-statusbar__item">
            SHOCK_LOAD: {state.simulation.shock_load.peak_load_lbs.toFixed(0)} LBS
          </div>
        )}
        <div className="mc-statusbar__right">
          <span>SLOTS: {filledSlots}/08</span>
          {hasErrors ? (
            <span className="mc-statusbar__badge mc-statusbar__badge--warn">
              {state.warnings.length} WARNING{state.warnings.length !== 1 ? 'S' : ''}
            </span>
          ) : (
            <span className="mc-statusbar__badge">NOMINAL</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD TAB
// ═══════════════════════════════════════════════════════════════════════════

function DashboardTab({
  state, allParts, customParts, filledSlots, totalMass,
  hasWarnings, hasErrors, canRun,
  selectPart, removePart, setCategory, runSim,
  addCustomPart, deleteCustomPart,
}) {
  return (
    <div className="mc-dashboard">
      {/* ── Parts Catalog (left) ─────────────────────────────────────── */}
      <div className="mc-parts-panel">
        <div className="mc-panel-header">PARTS_CATALOG_EXPLORER</div>
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
        <div className="mc-panel-header">
          BAY_SCHEMATIC_REALTIME_RENDER
          <span className="mc-panel-header__right">LAYER: 01_INTERNAL &nbsp; SCALE: 1:10</span>
        </div>
        <div className="mc-bay-grid">
          {CATEGORIES.map((cat, i) => {
            const part = state.config[cat.id]
            const isEmpty = !part
            const isActive = state.activeCategory === cat.id
            return (
              <div
                key={cat.id}
                className={`mc-slot ${isEmpty ? 'mc-slot--empty' : ''} ${isActive ? 'mc-slot--active' : ''}`}
                onClick={() => setCategory(cat.id)}
              >
                <div className="mc-slot__badge">{String(i + 1).padStart(2, '0')}</div>
                {part && (
                  <button
                    className="mc-slot__remove"
                    onClick={(e) => { e.stopPropagation(); removePart(cat.id) }}
                    title="Remove"
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
        <div className="mc-panel-header">CONFIG_SUMMARY</div>
        <div className="mc-summary">
          {/* Total Mass */}
          <div className="mc-metric">
            <div className="mc-metric__label">TOTAL_MASS</div>
            <div className="mc-metric__value">
              {(totalMass / 1000).toFixed(2)}<span className="mc-metric__unit">KG</span>
            </div>
            <div className="mc-progress">
              <div className="mc-progress__fill" style={{ width: `${Math.min(100, (totalMass / 5000) * 100)}%` }} />
            </div>
            <div className="mc-progress__labels">
              <span>0.0KG</span><span>MAX 5.0KG</span>
            </div>
          </div>

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

// ═══════════════════════════════════════════════════════════════════════════
// SIMULATION TAB — flight chart, metrics, shock load, compat, suggest, inventory
// ═══════════════════════════════════════════════════════════════════════════

function SimulationTab({ state, allParts, selectPart, runSim, canRun }) {
  const sim = state.simulation
  const shock = sim?.shock_load

  return (
    <div className="mc-sim">
      {/* ── Top: Chart + Data ────────────────────────────────────────── */}
      <div className="mc-sim__top">
        {/* Flight Chart */}
        <div className="mc-sim__chart">
          <div className="mc-panel-header">
            FLIGHT_PROFILE // DESCENT_PHASE_V4.2
            <span className="mc-panel-header__right">
              {sim ? `REF_ID: STR-SIM-${String(Math.abs((sim.apogee_ft || 0) * 7 + (sim.drift_ft || 0)) % 9999).padStart(4, '0')}` : 'AWAITING_DATA'}
            </span>
          </div>
          <div className="mc-sim__chart-area">
            <FlightChart simulation={sim} />
          </div>
          {!sim && (
            <div style={{ padding: '0 16px 16px', textAlign: 'center' }}>
              <button className="mc-run-btn" onClick={runSim} disabled={!canRun}>
                {state.simRunning ? 'RUNNING...' : 'RUN_SIMULATION →'}
              </button>
            </div>
          )}
        </div>

        {/* Simulation Data */}
        <div className="mc-sim__data">
          <div className="mc-panel-header">SIMULATION_DATA</div>
          <div className="mc-sim__data-grid">
            <MetricCard label="APOGEE_ALTITUDE" value={sim ? sim.apogee_ft.toLocaleString() : '—'} unit="ft" />
            <MetricCard label="MAIN_DESCENT" value={sim?.main_fps != null ? sim.main_fps.toFixed(1) : '—'} unit="ft/s"
              warn={sim?.main_fps != null && sim.main_fps > 15} />
            <MetricCard label="DESCENT_TIME" value={sim?.total_time_s != null ? Math.round(sim.total_time_s) : '—'} unit="sec" />
            <MetricCard label="DRIFT_DISTANCE" value={sim ? sim.drift_ft.toLocaleString() : '—'} unit="ft" />
            {sim?.drogue_fps && (
              <MetricCard label="DROGUE_DESCENT" value={sim.drogue_fps.toFixed(1)} unit="ft/s" />
            )}

            {/* Shock Cord Load */}
            {shock && (
              <>
                <MetricCard label="PEAK_LOAD" value={shock.peak_load_lbs.toFixed(0)} unit="lbs" />
                <MetricCard label="SAFETY_FACTOR"
                  value={shock.safety_factor.toFixed(1) + '×'}
                  unit=""
                  status={shock.sf_status === 'pass' ? 'ok' : shock.sf_status === 'warn' ? 'marginal' : 'fail'}
                  statusLabel={shock.sf_status === 'pass' ? 'OK' : shock.sf_status === 'warn' ? 'MARGINAL' : 'FAIL'}
                />
                <MetricCard label="STRAIN_ENERGY" value={shock.strain_energy_J.toFixed(1)} unit="J" />
              </>
            )}

            {/* Sync status */}
            <div className="mc-sim__data-card">
              <div className="mc-metric__label">REALTIME_SYNC</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mc-green)', display: 'inline-block' }} />
                <span style={{ fontSize: 10, color: 'var(--mc-text-dim)' }}>ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom: Compat + Suggest + Inventory ─────────────────────── */}
      <div className="mc-sim__bottom">
        {/* Compatibility Analysis + Suggest */}
        <div className="mc-sim__compat">
          <div className="mc-panel-header">COMPATIBILITY_ANALYSIS</div>
          {state.warnings.length === 0 ? (
            <div className="mc-alert mc-alert--ok">
              <div className="mc-alert__title">✓ ALL_SYSTEMS_NOMINAL</div>
              <div className="mc-alert__body">No compatibility issues detected.</div>
            </div>
          ) : (
            state.warnings.map((w, i) => (
              <div key={i} className={`mc-alert ${w.level === 'error' ? 'mc-alert--critical' : 'mc-alert--warn'}`}>
                <div className="mc-alert__title">
                  ⚠ {w.level === 'error' ? 'CRITICAL_ALERT' : 'NOMINAL_VARIANCE'}
                </div>
                <div className="mc-alert__body">{w.message}</div>
              </div>
            ))
          )}
          <SuggestPanel
            parts={allParts}
            specs={state.specs}
            config={state.config}
            onSelectPart={selectPart}
          />
        </div>

        {/* Parts Inventory */}
        <div className="mc-sim__inventory">
          <div className="mc-panel-header">
            PART_SPECIFICATIONS // ACTIVE_INVENTORY
            <span className="mc-panel-header__right">
              {CATEGORIES.filter(c => state.config[c.id]).length}_COMPONENTS_LOADED
            </span>
          </div>
          <div className="mc-inv-grid">
            {CATEGORIES.map(cat => {
              const part = state.config[cat.id]
              if (!part) return null
              return (
                <div key={cat.id} className="mc-inv-item">
                  <div className="mc-inv-item__icon">{cat.icon}</div>
                  <div>
                    <div className="mc-inv-item__name">{part.name}</div>
                    <div className="mc-inv-item__mfr">{part.manufacturer?.toUpperCase() || 'GENERIC'}</div>
                  </div>
                  <div className="mc-inv-item__mass">
                    {part.specs?.weight_g ? `${(part.specs.weight_g / 1000).toFixed(3)}kg` : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// DISPERSION TAB — full-page dispersion map
// ═══════════════════════════════════════════════════════════════════════════

function DispersionTab({ state }) {
  return (
    <div className="mc-dispersion">
      <div className="mc-panel-header">
        DISPERSION_MAP // LANDING_PREDICTION
        <span className="mc-panel-header__right">
          {state.simulation ? 'DATA_LOADED' : 'AWAITING_SIMULATION'}
        </span>
      </div>
      <div className="mc-dispersion__content">
        <DispersionMap
          simulation={state.simulation}
          specs={state.specs}
          forceOpen={true}
        />
        {!state.simulation && (
          <div className="mc-dispersion__empty">
            <div className="mc-metric__label" style={{ marginBottom: 8 }}>NO_SIMULATION_DATA</div>
            <div style={{ fontSize: 11, color: 'var(--mc-text-dim)', lineHeight: 1.6 }}>
              Run a simulation from the DASHBOARD or SIMULATION tab to generate
              dispersion data. The map will show predicted landing zones with
              drift vectors and uncertainty circles.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SPECS TAB — rocket specs form + config slots + warnings
// ═══════════════════════════════════════════════════════════════════════════

function SpecsTab({ state, setSpec, removePart, setCategory, saveConfig, copyShareLink, setCustomMotor, clearCustomMotor, addToast }) {
  return (
    <div className="mc-specs-panel">
      <div className="mc-panel-header">ROCKET_SPECIFICATIONS // MISSION_PARAMETERS</div>
      <div className="mc-specs-content">
        <ConfigBuilder
          categories={CATEGORIES}
          config={state.config}
          specs={state.specs}
          warnings={state.warnings}
          saveState={state.saveState}
          shareState={state.shareState}
          onRemovePart={removePart}
          onSetSpec={setSpec}
          onSave={saveConfig}
          onShare={copyShareLink}
          onSelectCategory={setCategory}
          customMotor={state.customMotor}
          onSetCustomMotor={setCustomMotor}
          onClearCustomMotor={clearCustomMotor}
          onToast={addToast}
        />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT TAB — save + share
// ═══════════════════════════════════════════════════════════════════════════

function ExportTab({ state, saveConfig, copyShareLink }) {
  return (
    <div className="mc-export">
      <div className="mc-panel-header" style={{ borderBottom: '1px solid var(--mc-border)' }}>
        EXPORT // SHARE_CONFIGURATION
      </div>
      <div className="mc-export__content">
        <div className="mc-export__section">
          <div className="mc-metric__label">SAVE_TO_BROWSER</div>
          <div style={{ fontSize: 10, color: 'var(--mc-text-dim)', margin: '6px 0 12px', lineHeight: 1.6 }}>
            Stores your current configuration in the browser's local storage.
            Your config will persist across sessions on this device.
          </div>
          <button className="mc-run-btn" onClick={saveConfig}>
            {state.saveState === 'saving' ? 'SAVING...' : state.saveState === 'saved' ? '✓ SAVED' : 'SAVE_CONFIG →'}
          </button>
        </div>
        <div className="mc-export__section">
          <div className="mc-metric__label">SHARE_LINK</div>
          <div style={{ fontSize: 10, color: 'var(--mc-text-dim)', margin: '6px 0 12px', lineHeight: 1.6 }}>
            Creates a URL encoding your entire configuration. Anyone who opens
            it will see your exact recovery bay setup. No account required.
          </div>
          <button className="mc-run-btn" onClick={copyShareLink}>
            {state.shareState === 'copied' ? '✓ COPIED_TO_CLIPBOARD' : 'COPY_SHARE_LINK →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED: MetricCard
// ═══════════════════════════════════════════════════════════════════════════

function MetricCard({ label, value, unit, warn, status, statusLabel }) {
  return (
    <div className="mc-sim__data-card">
      <div className="mc-metric__label">{label}</div>
      <div className="mc-metric__value" style={{ fontSize: 22 }}>
        {value}
        {unit && <span className="mc-metric__unit">{unit}</span>}
        {statusLabel && (
          <span style={{
            fontSize: 10,
            marginLeft: 8,
            padding: '1px 6px',
            border: `1px solid ${status === 'ok' ? 'var(--mc-green)' : status === 'marginal' ? 'var(--mc-amber)' : 'var(--mc-red)'}`,
            color: status === 'ok' ? 'var(--mc-green)' : status === 'marginal' ? 'var(--mc-amber)' : 'var(--mc-red)',
            verticalAlign: 'middle',
          }}>
            {statusLabel}
          </span>
        )}
      </div>
      {warn && (
        <div style={{ fontSize: 9, color: 'var(--mc-amber)', marginTop: 2, letterSpacing: '0.04em' }}>
          ABOVE_NOMINAL_THRESHOLD
        </div>
      )}
    </div>
  )
}
