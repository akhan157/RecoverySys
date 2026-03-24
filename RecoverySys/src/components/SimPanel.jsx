import React from 'react'
import FlightChart from './FlightChart.jsx'

function MetricRow({ label, value, unit }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{label}</span>
      <span>
        <span className="mono" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
          {value ?? '—'}
        </span>
        {unit && value != null && (
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: '3px' }}>{unit}</span>
        )}
      </span>
    </div>
  )
}

function canRun(specs, config) {
  return (
    parseFloat(specs.rocket_mass_g) > 0 &&
    parseFloat(specs.motor_total_impulse_ns) > 0 &&
    config.main_chute != null
  )
}

export default function SimPanel({ simulation, simFailed, simRunning, exportState, config, specs, onRun, onExport }) {
  const ready = canRun(specs, config)

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Chart */}
      <div>
        <div className="section-label" style={{ marginBottom: '8px' }}>Flight Profile</div>
        <div style={{ overflowX: 'auto' }}>
          <FlightChart simulation={simulation} />
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={onRun}
        disabled={!ready || simRunning}
        style={{
          height: '36px',
          width: '100%',
          background: ready && !simRunning ? 'var(--cta-bg)' : '#999',
          color: 'var(--cta-fg)',
          border: 'none',
          borderRadius: '4px',
          cursor: ready && !simRunning ? 'pointer' : 'default',
          fontSize: '13px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        {simRunning ? (
          <>
            <span className="spinner" /> Calculating…
          </>
        ) : (
          'Run Simulation →'
        )}
      </button>

      {!ready && !simRunning && (
        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '-8px' }}>
          Requires: rocket mass, motor impulse, and a main chute.
        </p>
      )}

      {/* Degenerate sim error */}
      {simFailed && !simRunning && (
        <p style={{ fontSize: '11px', color: '#c0392b', marginTop: '-8px', lineHeight: 1.4 }}>
          ⚠ Main deploy altitude exceeds estimated apogee — lower the deploy altitude or increase motor impulse.
        </p>
      )}

      {/* Results */}
      {simulation && (
        <div>
          <div className="section-label" style={{ marginBottom: '8px' }}>Results</div>
          <MetricRow
            label={simulation.apogee_method === 'heuristic' ? 'Apogee (±30%)' : 'Apogee (±10–15%)'}
            value={simulation.apogee_ft.toLocaleString()}
            unit="ft"
          />
          <MetricRow label="Drogue descent" value={simulation.drogue_fps} unit="fps" />
          <MetricRow label="Main descent" value={simulation.main_fps} unit="fps" />
          <MetricRow label="Descent time" value={simulation.total_time_s ?? simulation.phase1_time_s} unit="s" />
          <MetricRow label="Drift" value={simulation.drift_ft.toLocaleString()} unit="ft" />
        </div>
      )}

      {/* Export */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
        <div className="section-label" style={{ marginBottom: '8px' }}>Export</div>
        <button
          onClick={onExport}
          disabled={exportState === 'exporting' || (!config.main_chute && !config.drogue_chute) || !parseFloat(specs.airframe_od_in)}
          style={{
            height: '32px',
            padding: '0 14px',
            background: 'transparent',
            color: 'var(--text-primary)',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: exportState === 'exporting' ? 'default' : 'pointer',
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {exportState === 'exporting' ? (
            <>
              <span className="spinner" style={{ borderTopColor: '#1a1a1a', borderColor: '#ccc' }} />
              Exporting…
            </>
          ) : exportState === 'done' ? 'Exported ✓' : 'Export .ork'}
        </button>
        {!parseFloat(specs.airframe_od_in) && (
          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
            Enter Airframe OD in Rocket Specs to enable export.
          </p>
        )}
      </div>
    </div>
  )
}
