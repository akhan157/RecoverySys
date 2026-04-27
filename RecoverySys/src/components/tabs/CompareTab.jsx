import React, { useState, useMemo } from 'react'
import { CATEGORIES } from '../../data/parts.js'
import { partSpecLine } from '../../lib/format.js'
import { runSimulation } from '../../lib/simulation.js'

/**
 * Config comparison tab. Save a snapshot of the current config ("A"),
 * then modify parts/specs — the tab shows A vs current ("B") side-by-side.
 */
export default function CompareTab({ state }) {
  const [snapshot, setSnapshot] = useState(null)

  const saveSnapshot = () => {
    setSnapshot({
      config: JSON.parse(JSON.stringify(state.config)),
      specs: { ...state.specs },
      customMotor: state.customMotor ? JSON.parse(JSON.stringify(state.customMotor)) : null,
      savedAt: new Date().toLocaleTimeString(),
    })
  }

  const clearSnapshot = () => setSnapshot(null)

  // Run sim for the snapshot config
  const snapshotSim = useMemo(() => {
    if (!snapshot) return null
    return runSimulation({ specs: snapshot.specs, config: snapshot.config, customMotor: snapshot.customMotor })
  }, [snapshot])

  const currentSim = state.simulation

  if (!snapshot) {
    return (
      <div className="mc-export">
        <h2 className="mc-panel-header" style={{ borderBottom: '1px solid var(--mc-border)' }}>
          COMPARE // A/B_CONFIGURATION
        </h2>
        <div className="mc-export__content">
          <div className="mc-export__section">
            <div className="mc-metric__label">SNAPSHOT_CONFIG</div>
            <div style={{ fontSize: 10, color: 'var(--mc-text-dim)', margin: '6px 0 12px', lineHeight: 1.6 }}>
              Save your current configuration as "Config A". Then change parts or specs —
              this tab will show A vs B side-by-side so you can compare descent rates,
              drift, warnings, and part choices.
            </div>
            <button className="mc-run-btn" onClick={saveSnapshot}>
              SAVE_AS_CONFIG_A &rarr;
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Build comparison rows
  const partRows = CATEGORIES.map(cat => {
    const a = snapshot.config[cat.id]
    const b = state.config[cat.id]
    const changed = a?.id !== b?.id
    return { label: cat.label, a, b, changed }
  })

  const specRows = [
    { label: 'Mass', key: 'rocket_mass_g', unit: 'g' },
    { label: 'Motor Impulse', key: 'motor_total_impulse_ns', unit: 'Ns' },
    { label: 'Burn Time', key: 'burn_time_s', unit: 's' },
    { label: 'Airframe ID', key: 'airframe_id_in', unit: 'in' },
    { label: 'Drag Cd', key: 'drag_cd', unit: '' },
    { label: 'Deploy Alt', key: 'main_deploy_alt_ft', unit: 'ft' },
  ].map(({ label, key, unit }) => {
    const a = snapshot.specs[key]
    const b = state.specs[key]
    const changed = a !== b
    return { label, a: a ? `${a} ${unit}` : '—', b: b ? `${b} ${unit}` : '—', changed }
  })

  const simRows = [
    { label: 'Apogee', a: snapshotSim?.apogee_ft, b: currentSim?.apogee_ft, unit: 'ft', fmt: v => v?.toLocaleString() },
    { label: 'Drogue Rate', a: snapshotSim?.drogue_fps, b: currentSim?.drogue_fps, unit: 'fps', fmt: v => v?.toFixed?.(0) },
    { label: 'Main Rate', a: snapshotSim?.main_fps, b: currentSim?.main_fps, unit: 'fps', fmt: v => v?.toFixed?.(1) },
    { label: 'Drift', a: snapshotSim?.drift_ft, b: currentSim?.drift_ft, unit: 'ft', fmt: v => v?.toLocaleString() },
    { label: 'Total Time', a: snapshotSim?.total_time_s, b: currentSim?.total_time_s, unit: 's', fmt: v => v?.toFixed?.(0) },
    { label: 'Landing KE', a: snapshotSim?.landing_ke_ftlbf, b: currentSim?.landing_ke_ftlbf, unit: 'ft-lbf', fmt: v => v?.toFixed?.(0) },
  ]

  const cellStyle = { padding: '4px 8px', fontSize: 11, borderBottom: '1px solid var(--mc-border)' }
  const changedStyle = { ...cellStyle, color: 'var(--mc-amber)' }
  const headerStyle = { ...cellStyle, fontSize: 10, fontWeight: 600, color: 'var(--mc-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }

  return (
    <div className="mc-export">
      <h2 className="mc-panel-header" style={{ borderBottom: '1px solid var(--mc-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>COMPARE // A vs B</span>
        <button className="mc-run-btn" style={{ fontSize: 9, padding: '2px 8px' }} onClick={clearSnapshot}>CLEAR</button>
      </h2>
      <div style={{ padding: '12px', overflowY: 'auto', flex: 1 }}>
        <div style={{ fontSize: 10, color: 'var(--mc-text-dim)', marginBottom: 8 }}>
          Config A saved at {snapshot.savedAt}. Current config is B. Changed values shown in amber.
        </div>

        {/* Parts comparison */}
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--mc-text-dim)', margin: '12px 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Components</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={headerStyle}>Slot</th>
              <th style={headerStyle}>Config A</th>
              <th style={headerStyle}>Config B</th>
            </tr>
          </thead>
          <tbody>
            {partRows.map(row => (
              <tr key={row.label}>
                <td style={cellStyle}>{row.label}</td>
                <td style={cellStyle}>{row.a?.name || '—'}</td>
                <td style={row.changed ? changedStyle : cellStyle}>{row.b?.name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Specs comparison */}
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--mc-text-dim)', margin: '16px 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Specs</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={headerStyle}>Field</th>
              <th style={headerStyle}>Config A</th>
              <th style={headerStyle}>Config B</th>
            </tr>
          </thead>
          <tbody>
            {specRows.map(row => (
              <tr key={row.label}>
                <td style={cellStyle}>{row.label}</td>
                <td style={cellStyle}>{row.a}</td>
                <td style={row.changed ? changedStyle : cellStyle}>{row.b}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Simulation comparison */}
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--mc-text-dim)', margin: '16px 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Simulation Results</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={headerStyle}>Metric</th>
              <th style={headerStyle}>Config A</th>
              <th style={headerStyle}>Config B</th>
              <th style={headerStyle}>Delta</th>
            </tr>
          </thead>
          <tbody>
            {simRows.map(row => {
              const aVal = row.a
              const bVal = row.b
              const aStr = aVal != null ? `${row.fmt(aVal)} ${row.unit}` : '—'
              const bStr = bVal != null ? `${row.fmt(bVal)} ${row.unit}` : '—'
              let delta = '—'
              let deltaColor = 'var(--mc-text-dim)'
              if (aVal != null && bVal != null) {
                const diff = bVal - aVal
                if (Math.abs(diff) > 0.1) {
                  delta = `${diff > 0 ? '+' : ''}${row.fmt(diff)} ${row.unit}`
                  deltaColor = 'var(--mc-amber)'
                } else {
                  delta = '0'
                }
              }
              return (
                <tr key={row.label}>
                  <td style={cellStyle}>{row.label}</td>
                  <td style={cellStyle}>{aStr}</td>
                  <td style={aVal !== bVal ? changedStyle : cellStyle}>{bStr}</td>
                  <td style={{ ...cellStyle, color: deltaColor }}>{delta}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div style={{ marginTop: 16 }}>
          <button className="mc-run-btn" onClick={saveSnapshot}>
            RE-SAVE_CONFIG_A &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}
