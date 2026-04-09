import React from 'react'
import FlightChart from './FlightChart.jsx'

function MetricCard({ label, value, unit, animClass }) {
  return (
    <div
      className={animClass}
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius)',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}
    >
      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span>
        <span className="mono" style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
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

export default function SimPanel({ simulation, simFailed, simRunning, config, specs, onRun }) {
  const ready = canRun(specs, config)

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Chart */}
      <div>
        <div className="section-label" style={{ marginBottom: '8px' }}>Flight Profile</div>
        <FlightChart simulation={simulation} />
      </div>

      {/* Run button */}
      <button
        onClick={onRun}
        disabled={!ready || simRunning}
        style={{
          height: '36px',
          width: '100%',
          background: ready && !simRunning ? 'var(--cta-bg)' : 'var(--border-default)',
          color: ready && !simRunning ? 'var(--cta-fg)' : 'var(--text-tertiary)',
          border: 'none',
          borderRadius: 'var(--radius)',
          cursor: ready && !simRunning ? 'pointer' : 'default',
          fontSize: '13px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'transform 150ms ease, opacity 150ms ease',
        }}
        onMouseEnter={e => { if (ready && !simRunning) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.opacity = '0.9' } }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.opacity = '' }}
        onMouseDown={e => { if (ready && !simRunning) e.currentTarget.style.transform = 'translateY(0)' }}
      >
        {simRunning ? (
          <>
            <span className="spinner" style={{ borderColor: 'transparent', borderTopColor: 'var(--cta-fg)' }} /> Calculating…
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
        <p style={{ fontSize: '11px', color: 'var(--error-fg)', marginTop: '-8px', lineHeight: 1.4 }}>
          ⚠ Main deploy altitude exceeds estimated apogee — lower the deploy altitude or increase motor impulse.
        </p>
      )}

      {/* Results — 4-col grid with fade-up stagger */}
      {simulation && (
        <div>
          <div className="section-label" style={{ marginBottom: '10px' }}>Results</div>

          {/* Apogee / deploy sanity warnings */}
          {/* Note: deploy_ft >= apogee_ft is impossible here — runSimulation returns null
              in that case, so {simulation && ...} guard prevents this block from rendering.
              The simFailed banner above handles that case. */}
          {(simulation.apogee_ft - simulation.deploy_ft) < 500 && (
            <div style={{ marginBottom: '8px', padding: '8px 10px', background: 'var(--warn-bg)', border: '1px solid var(--warn-border)', borderRadius: 'var(--radius)', fontSize: '12px', color: 'var(--warn-fg)', lineHeight: 1.4 }}>
              ⚠ Only {(simulation.apogee_ft - simulation.deploy_ft).toLocaleString()} ft of drogue phase — very little separation before main deploy
            </div>
          )}
          {simulation.phase1_time_s < 5 && (
            <div style={{ marginBottom: '8px', padding: '8px 10px', background: 'var(--warn-bg)', border: '1px solid var(--warn-border)', borderRadius: 'var(--radius)', fontSize: '12px', color: 'var(--warn-fg)', lineHeight: 1.4 }}>
              ⚠ Drogue phase is only {simulation.phase1_time_s}s — consider a lower main deploy altitude
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <MetricCard
              animClass="fade-up fade-up-1"
              label={simulation.apogee_method === 'heuristic' ? 'Apogee ±30%' : 'Apogee ±15%'}
              value={simulation.apogee_ft.toLocaleString()}
              unit="ft"
            />
            <MetricCard
              animClass="fade-up fade-up-2"
              label="Main descent"
              value={simulation.main_fps}
              unit="fps"
            />
            <MetricCard
              animClass="fade-up fade-up-3"
              label="Descent time"
              value={simulation.total_time_s ?? simulation.phase1_time_s}
              unit="s"
            />
            <MetricCard
              animClass="fade-up fade-up-4"
              label="Drift"
              value={simulation.drift_ft.toLocaleString()}
              unit="ft"
            />
          </div>
          {config.drogue_chute != null && (
            <div style={{ marginTop: '6px' }}>
              <MetricCard
                animClass="fade-up"
                label="Drogue descent"
                value={simulation.drogue_fps}
                unit="fps"
              />
            </div>
          )}

          {/* Shock cord load analysis */}
          {simulation.shock_load && (
            <div style={{ marginTop: '14px' }}>
              <div className="section-label" style={{ marginBottom: '8px' }}>Shock Cord Load</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <MetricCard
                  animClass="fade-up"
                  label="Peak load"
                  value={simulation.shock_load.peak_load_lbs.toLocaleString()}
                  unit="lbs"
                />
                <div
                  className="fade-up"
                  style={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius)',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Safety Factor
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="mono" style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                      {simulation.shock_load.safety_factor}×
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '3px',
                      background: simulation.shock_load.sf_status === 'pass' ? 'var(--ok-bg, #1a3a1a)' : simulation.shock_load.sf_status === 'warn' ? 'var(--warn-bg)' : 'var(--error-bg)',
                      color: simulation.shock_load.sf_status === 'pass' ? 'var(--ok-fg, #4ade80)' : simulation.shock_load.sf_status === 'warn' ? 'var(--warn-fg)' : 'var(--error-fg)',
                    }}>
                      {simulation.shock_load.sf_status === 'pass' ? 'OK' : simulation.shock_load.sf_status === 'warn' ? 'LOW' : 'FAIL'}
                    </span>
                  </span>
                </div>
              </div>
              <div style={{ marginTop: '6px' }}>
                <MetricCard
                  animClass="fade-up"
                  label="Strain energy absorbed"
                  value={simulation.shock_load.strain_energy_J}
                  unit="J"
                />
              </div>
              <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '6px', lineHeight: 1.5 }}>
                {simulation.shock_load.material === 'kevlar'
                  ? `Kevlar threshold: ≥${simulation.shock_load.sf_thresholds.pass}× (low elongation = high snatch force)`
                  : `Nylon threshold: ≥${simulation.shock_load.sf_thresholds.pass}×`
                }
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
