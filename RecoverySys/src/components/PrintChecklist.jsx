import { CATEGORIES } from '../data/parts.js'
import { partSpecLine } from '../lib/format.js'
import { WARN_LEVELS } from '../lib/constants.js'
import { RESULT_STATUS_DETAILS } from '../lib/assessment.js'
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

const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]))

export default function PrintChecklist({
  specs,
  config,
  simulation,
  resultFresh,
  warnings = [],
  recoveryBrief,
  printMode = 'brief',
}) {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const selectedParts = CATEGORIES.filter((c) => config[c.id])
  const packingSteps = PACKING_ORDER.filter((slot) => config[slot])
  const resultStatus =
    recoveryBrief?.status ?? (simulation ? (resultFresh ? 'current' : 'stale') : 'not-run')
  const resultDetails = RESULT_STATUS_DETAILS[resultStatus]

  return (
    <div className={`print-checklist print-checklist--${printMode}`}>
      <h1>
        {printMode === 'brief' ? 'RecoverySys Recovery Brief' : 'RecoverySys Recovery Checklist'}
      </h1>
      <p className="print-subtitle">Generated {date}</p>
      <section className="print-brief-status print-artifact--brief">
        <h2>Recovery brief status</h2>
        <p>
          {resultDetails
            ? `${resultStatus === 'current' ? 'CURRENT_RESULT' : resultStatus === 'stale' ? 'STALE_RESULT' : 'NO_CURRENT_RESULT'} — ${
                resultStatus === 'current'
                  ? 'estimates reflect the current inputs.'
                  : resultDetails.remediation
              }`
            : 'NO_CURRENT_RESULT — no simulation estimates are available.'}
        </p>
        <p>
          Evidence posture: {recoveryBrief?.confidence?.label || 'Insufficient confidence'}. This is
          a planning estimate, not a safety approval or certification.
        </p>
        <p>{recoveryBrief?.authorization}</p>
      </section>
      <section className="print-artifact--brief">
        <h2>Mission envelope and unresolved checks</h2>
        <p>Envelope status: {recoveryBrief?.missionEnvelope?.status || 'not evaluated'}</p>
        <ul>
          {(recoveryBrief?.unresolvedChecks || []).map((check, index) => (
            <li key={`${check.code}-${index}`}>
              {check.message}
              {check.remediation ? ` Review: ${check.remediation}` : ''}
            </li>
          ))}
        </ul>
        {(recoveryBrief?.unresolvedChecks || []).length === 0 && (
          <p>No unresolved checks recorded.</p>
        )}
      </section>
      <section className="print-artifact--brief">
        <h2>Evidence and model provenance</h2>
        <p>{recoveryBrief?.confidence?.evidenceNote}</p>
        <p>
          Model: {recoveryBrief?.provenance?.modelId || 'Not available'} · Version:{' '}
          {recoveryBrief?.provenance?.modelVersion || 'Not available'} · Assumptions:{' '}
          {recoveryBrief?.provenance?.assumptionsVersion || 'Not available'}
        </p>
      </section>
      <section className="print-artifact--brief">
        <h2>Selected hardware</h2>
        {recoveryBrief?.selectedHardware?.length ? (
          <ul>
            {recoveryBrief.selectedHardware.map((part) => (
              <li key={part.slot}>
                <strong>{part.slot}:</strong> {part.name}
              </li>
            ))}
          </ul>
        ) : (
          <p>No hardware selected.</p>
        )}
      </section>

      {/* ── Rocket Specs ──────────────────────────────────────── */}
      <section className="print-artifact--checklist">
        <h2>Rocket Specifications</h2>
        <table>
          <tbody>
            <tr>
              <th>Mass</th>
              <td>{specs.rocket_mass_g || '—'} g</td>
            </tr>
            <tr>
              <th>Motor Impulse</th>
              <td>{specs.motor_total_impulse_ns || '—'} Ns</td>
            </tr>
            <tr>
              <th>Burn Time</th>
              <td>{specs.burn_time_s || '—'} s</td>
            </tr>
            <tr>
              <th>Airframe ID</th>
              <td>{specs.airframe_id_in || '—'} in</td>
            </tr>
            <tr>
              <th>Bay Length</th>
              <td>{specs.bay_length_in || '—'} in</td>
            </tr>
            <tr>
              <th>Drag Coeff</th>
              <td>{specs.drag_cd || '0.50'}</td>
            </tr>
            <tr>
              <th>Main Deploy Alt</th>
              <td>{specs.main_deploy_alt_ft || '500'} ft</td>
            </tr>
            <tr>
              <th>Ejection G-Factor</th>
              <td>{specs.ejection_g_factor || 'auto'}</td>
            </tr>
            {specs.wind_speed_mph && (
              <tr>
                <th>Surface Wind</th>
                <td>
                  {specs.wind_speed_mph} mph from {specs.wind_direction_deg || 0}&deg;
                </td>
              </tr>
            )}
            {specs.launch_lat && (
              <tr>
                <th>Launch Site</th>
                <td>
                  {specs.launch_lat}, {specs.launch_lon}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* ── Selected Components ────────────────────────────────── */}
      <section className="print-artifact--checklist">
        <h2>Selected Components</h2>
        {selectedParts.length === 0 ? (
          <p>No parts selected</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Slot</th>
                <th>Part</th>
                <th>Key Specs</th>
              </tr>
            </thead>
            <tbody>
              {selectedParts.map((cat) => {
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
      <section className="print-artifact--checklist">
        <h2>Compatibility Warnings</h2>
        {warnings.length === 0 ? (
          <p>
            No compatibility warnings recorded. Absence of recorded warnings is not a clearance;
            review findings, evidence, and the mission envelope separately.
          </p>
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
      <section className="print-artifact--checklist">
        <h2>Simulation Results</h2>
        {simulation && resultFresh ? (
          <table>
            <tbody>
              <tr>
                <th>Apogee</th>
                <td>
                  {simulation.apogee_ft.toLocaleString()} ft ({simulation.apogee_method})
                </td>
              </tr>
              <tr>
                <th>Apogee Time</th>
                <td>{simulation.apogee_t_s} s</td>
              </tr>
              {simulation.burnout_t_s != null && (
                <tr>
                  <th>Burnout</th>
                  <td>{simulation.burnout_t_s} s</td>
                </tr>
              )}
              <tr>
                <th>Drogue Descent</th>
                <td>{simulation.drogue_fps} fps</td>
              </tr>
              {simulation.main_fps != null && (
                <tr>
                  <th>Main Descent</th>
                  <td>{simulation.main_fps} fps</td>
                </tr>
              )}
              <tr>
                <th>Phase 1 (Drogue)</th>
                <td>{simulation.phase1_time_s} s</td>
              </tr>
              {simulation.phase2_time_s != null && (
                <tr>
                  <th>Phase 2 (Main)</th>
                  <td>{simulation.phase2_time_s} s</td>
                </tr>
              )}
              {simulation.total_time_s != null && (
                <tr>
                  <th>Total Descent</th>
                  <td>{simulation.total_time_s} s</td>
                </tr>
              )}
              <tr>
                <th>Drift</th>
                <td>{simulation.drift_ft.toLocaleString()} ft</td>
              </tr>
              {simulation.landing_ke_ftlbf != null && (
                <tr>
                  <th>Landing KE</th>
                  <td>{simulation.landing_ke_ftlbf} ft-lbf</td>
                </tr>
              )}
              {simulation.shock_load && (
                <>
                  <tr>
                    <th>Legacy Static Ejection</th>
                    <td>
                      {simulation.shock_load.peak_load_lbs} lbs (SF{' '}
                      {simulation.shock_load.safety_factor})
                    </td>
                  </tr>
                </>
              )}
              <tr>
                <th>Estimated main-deployment snatch</th>
                <td>
                  {simulation.main_snatch &&
                  !['not_evaluated', 'unavailable'].includes(
                    String(simulation.main_snatch.status || '')
                      .toLowerCase()
                      .replace(/[- ]/g, '_')
                  )
                    ? `${simulation.main_snatch.peak_force_proxy_lbs ?? '—'} lbs — linear-elastic screening proxy`
                    : 'NOT EVALUATED'}
                </td>
              </tr>
              {simulation.main_snatch && (
                <>
                  <tr>
                    <th>Snatch screening status</th>
                    <td>{screeningStatusLabel(simulation.main_snatch.status)}</td>
                  </tr>
                  <tr>
                    <th>Rating margin</th>
                    <td>{simulation.main_snatch.rating_margin ?? '—'}</td>
                  </tr>
                  <tr>
                    <th>Approach velocity</th>
                    <td>{simulation.main_snatch.approach_velocity_fps ?? '—'} ft/s</td>
                  </tr>
                  <tr>
                    <th>Predicted extension</th>
                    <td>{simulation.main_snatch.predicted_extension_m ?? '—'} m</td>
                  </tr>
                  <tr>
                    <th>Snatch source / data quality</th>
                    <td>
                      {simulation.main_snatch.approach_velocity_source || 'Core screening model'} /{' '}
                      {simulation.main_snatch.data_quality || 'Not specified'}
                    </td>
                  </tr>
                  {['not_evaluated', 'unavailable'].includes(
                    String(simulation.main_snatch.status || '')
                      .toLowerCase()
                      .replace(/[- ]/g, '_')
                  ) && (
                    <tr>
                      <th>Snatch unavailable reason</th>
                      <td>{simulation.main_snatch.reason || 'No reason supplied.'}</td>
                    </tr>
                  )}
                  <tr>
                    <th>Snatch limitations</th>
                    <td>
                      {Array.isArray(simulation.main_snatch.limitations)
                        ? simulation.main_snatch.limitations.join(' ')
                        : simulation.main_snatch.limitations ||
                          simulation.main_snatch.reason ||
                          'See core screening model documentation.'}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        ) : (
          <p>
            {resultDetails
              ? `${resultDetails.reasonCode} — ${resultDetails.remediation}`
              : 'NO_CURRENT_RESULT — no simulation estimates are available.'}
          </p>
        )}
      </section>

      {/* ── Packing Order ─────────────────────────────────────── */}
      <section className="print-artifact--checklist">
        <h2>Packing Order (bottom of bay to top)</h2>
        {packingSteps.length === 0 ? (
          <p>No parts selected</p>
        ) : (
          <ol>
            {packingSteps.map((slot) => {
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

      <footer
        style={{
          marginTop: 24,
          borderTop: '1pt solid #999',
          paddingTop: 8,
          fontSize: '9pt',
          color: '#666',
        }}
      >
        RecoverySys v1.2 — recoverysys.app — Simulation constraints documented in source
      </footer>
    </div>
  )
}

function screeningStatusLabel(status) {
  const normalized = String(status || 'not evaluated')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
  if (normalized === 'screened' || normalized === 'evaluated') return 'SCREENED'
  if (normalized === 'marginal') return 'MARGINAL'
  if (normalized === 'exceeds rating') return 'EXCEEDS RATING'
  if (normalized === 'not evaluated' || normalized === 'unavailable') return 'NOT EVALUATED'
  return normalized.toUpperCase()
}
