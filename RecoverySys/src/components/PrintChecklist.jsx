import React from 'react'
import { CATEGORIES } from '../data/parts.js'
import { partSpecLine } from '../lib/format.js'
import { WARN_LEVELS } from '../lib/constants.js'

// Physical packing order (bottom of bay → top). Only selected parts are shown.
const PACKING_ORDER = [
  'shock_cord',
  'quick_links',
  'swivel',
  'chute_device',
  'deployment_bag',
  'main_chute',
  'chute_protector',
  'drogue_chute',
]

const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]))

export default function PrintChecklist({ specs, config, simulation, warnings = [] }) {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const selectedParts = CATEGORIES.filter(c => config[c.id])
  const packingSteps = PACKING_ORDER.filter(slot => config[slot])

  return (
    <div className="print-checklist">
      <h1>RecoverySys Recovery Checklist</h1>
      <p className="print-subtitle">Generated {date}</p>

      {/* ── Rocket Specs ──────────────────────────────────────── */}
      <section>
        <h2>Rocket Specifications</h2>
        <table>
          <tbody>
            <tr><th>Mass</th><td>{specs.rocket_mass_g || '—'} g</td></tr>
            <tr><th>Motor Impulse</th><td>{specs.motor_total_impulse_ns || '—'} Ns</td></tr>
            <tr><th>Burn Time</th><td>{specs.burn_time_s || '—'} s</td></tr>
            <tr><th>Airframe ID</th><td>{specs.airframe_id_in || '—'} in</td></tr>
            <tr><th>Bay Length</th><td>{specs.bay_length_in || '—'} in</td></tr>
            <tr><th>Drag Coeff</th><td>{specs.drag_cd || '0.50'}</td></tr>
            <tr><th>Main Deploy Alt</th><td>{specs.main_deploy_alt_ft || '500'} ft</td></tr>
            <tr><th>Ejection G-Factor</th><td>{specs.ejection_g_factor || 'auto'}</td></tr>
            {specs.wind_speed_mph && <tr><th>Surface Wind</th><td>{specs.wind_speed_mph} mph from {specs.wind_direction_deg || 0}&deg;</td></tr>}
            {specs.launch_lat && <tr><th>Launch Site</th><td>{specs.launch_lat}, {specs.launch_lon}</td></tr>}
          </tbody>
        </table>
      </section>

      {/* ── Selected Components ────────────────────────────────── */}
      <section>
        <h2>Selected Components</h2>
        {selectedParts.length === 0 ? (
          <p>No parts selected</p>
        ) : (
          <table>
            <thead>
              <tr><th>Slot</th><th>Part</th><th>Key Specs</th></tr>
            </thead>
            <tbody>
              {selectedParts.map(cat => {
                const part = config[cat.id]
                return (
                  <tr key={cat.id}>
                    <td>{cat.label}</td>
                    <td>{part.name}</td>
                    <td>{partSpecLine(part, 'detailed')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Compatibility Warnings ─────────────────────────────── */}
      <section>
        <h2>Compatibility Warnings</h2>
        {warnings.length === 0 ? (
          <p>All systems nominal</p>
        ) : (
          <ul>
            {warnings.map((w, i) => (
              <li key={i} className={w.level === WARN_LEVELS.ERROR ? 'print-warning' : ''}>
                <strong>{CATEGORY_LABELS[w.slot] || w.slot}:</strong> {w.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Simulation Results ─────────────────────────────────── */}
      <section>
        <h2>Simulation Results</h2>
        {simulation ? (
          <table>
            <tbody>
              <tr><th>Apogee</th><td>{simulation.apogee_ft.toLocaleString()} ft ({simulation.apogee_method})</td></tr>
              <tr><th>Apogee Time</th><td>{simulation.apogee_t_s} s</td></tr>
              {simulation.burnout_t_s != null && <tr><th>Burnout</th><td>{simulation.burnout_t_s} s</td></tr>}
              <tr><th>Drogue Descent</th><td>{simulation.drogue_fps} fps</td></tr>
              {simulation.main_fps != null && <tr><th>Main Descent</th><td>{simulation.main_fps} fps</td></tr>}
              <tr><th>Phase 1 (Drogue)</th><td>{simulation.phase1_time_s} s</td></tr>
              {simulation.phase2_time_s != null && <tr><th>Phase 2 (Main)</th><td>{simulation.phase2_time_s} s</td></tr>}
              {simulation.total_time_s != null && <tr><th>Total Descent</th><td>{simulation.total_time_s} s</td></tr>}
              <tr><th>Drift</th><td>{simulation.drift_ft.toLocaleString()} ft</td></tr>
              {simulation.landing_ke_ftlbf != null && <tr><th>Landing KE</th><td>{simulation.landing_ke_ftlbf} ft-lbf</td></tr>}
              {simulation.shock_load && (
                <>
                  <tr><th>Shock Load</th><td>{simulation.shock_load.peak_load_lbs} lbs (SF {simulation.shock_load.safety_factor})</td></tr>
                  <tr><th>Strain Energy</th><td>{simulation.shock_load.strain_energy_J} J</td></tr>
                </>
              )}
            </tbody>
          </table>
        ) : (
          <p>No simulation run — click RUN_SIM first</p>
        )}
      </section>

      {/* ── Packing Order ─────────────────────────────────────── */}
      <section>
        <h2>Packing Order (bottom of bay to top)</h2>
        {packingSteps.length === 0 ? (
          <p>No parts selected</p>
        ) : (
          <ol>
            {packingSteps.map((slot, i) => {
              const part = config[slot]
              return (
                <li key={slot} className="print-check-item">
                  <span style={{ fontFamily: 'monospace' }}>[ ]</span>{' '}
                  <strong>{CATEGORY_LABELS[slot]}:</strong> {part.name} — {partSpecLine(part)}
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <footer style={{ marginTop: 24, borderTop: '1pt solid #999', paddingTop: 8, fontSize: '9pt', color: '#666' }}>
        RecoverySys v1.2 — recoverysys.app — Simulation constraints documented in source
      </footer>
    </div>
  )
}
