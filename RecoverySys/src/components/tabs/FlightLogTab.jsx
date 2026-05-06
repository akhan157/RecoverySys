import React, { useState, useEffect } from 'react'
import Input from '../primitives/Input.jsx'

const STORAGE_KEY = 'recoverysys-flight-log'

function loadLog() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch { return [] }
}

function saveLog(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

function NewEntryForm({ simulation, specs, onSave }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    location: '',
    actual_apogee_ft: '',
    actual_main_fps: '',
    actual_landing_lat: '',
    actual_landing_lon: '',
    outcome: 'nominal',
    notes: '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    const entry = {
      id: Date.now(),
      ...form,
      predicted: simulation ? {
        apogee_ft: simulation.apogee_ft,
        main_fps: simulation.main_fps,
        drogue_fps: simulation.drogue_fps,
        drift_ft: simulation.drift_ft,
        landing_ke_ftlbf: simulation.landing_ke_ftlbf,
      } : null,
      specs_snapshot: {
        rocket_mass_g: specs.rocket_mass_g,
        motor_total_impulse_ns: specs.motor_total_impulse_ns,
      },
    }
    onSave(entry)
    setForm(f => ({ ...f, actual_apogee_ft: '', actual_main_fps: '', actual_landing_lat: '', actual_landing_lon: '', notes: '', outcome: 'nominal' }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label className="section-label" style={{ marginBottom: 3, display: 'block' }}>Date</label>
          <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div>
          <label className="section-label" style={{ marginBottom: 3, display: 'block' }}>Location</label>
          <Input placeholder="e.g. FAR Mojave" value={form.location} onChange={e => set('location', e.target.value)} mono={false} />
        </div>
        <div>
          <label className="section-label" style={{ marginBottom: 3, display: 'block' }}>Actual Apogee (ft)</label>
          <Input type="number" placeholder={simulation ? `predicted: ${simulation.apogee_ft}` : ''} value={form.actual_apogee_ft} onChange={e => set('actual_apogee_ft', e.target.value)} />
        </div>
        <div>
          <label className="section-label" style={{ marginBottom: 3, display: 'block' }}>Actual Main Rate (fps)</label>
          <Input type="number" placeholder={simulation?.main_fps ? `predicted: ${simulation.main_fps}` : ''} value={form.actual_main_fps} onChange={e => set('actual_main_fps', e.target.value)} />
        </div>
        <div>
          <label className="section-label" style={{ marginBottom: 3, display: 'block' }}>Landing Lat</label>
          <Input type="number" placeholder="decimal degrees" value={form.actual_landing_lat} onChange={e => set('actual_landing_lat', e.target.value)} />
        </div>
        <div>
          <label className="section-label" style={{ marginBottom: 3, display: 'block' }}>Landing Lon</label>
          <Input type="number" placeholder="decimal degrees" value={form.actual_landing_lon} onChange={e => set('actual_landing_lon', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="section-label" style={{ marginBottom: 3, display: 'block' }}>Outcome</label>
        <select
          className="parts-search-input"
          style={{ width: '100%' }}
          value={form.outcome}
          onChange={e => set('outcome', e.target.value)}
        >
          <option value="nominal">Nominal</option>
          <option value="minor_issue">Minor Issue</option>
          <option value="failure">Failure</option>
          <option value="loss">Loss of Vehicle</option>
        </select>
      </div>
      <div>
        <label className="section-label" style={{ marginBottom: 3, display: 'block' }}>Notes</label>
        <textarea
          className="parts-search-input"
          style={{ width: '100%', height: 60, resize: 'vertical' }}
          placeholder="Post-flight observations, issues, cord condition, chute state..."
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
        />
      </div>
      <button className="mc-run-btn" onClick={handleSave}>LOG_FLIGHT &rarr;</button>
    </div>
  )
}

function LogEntry({ entry, onDelete }) {
  const pred = entry.predicted
  const cellStyle = { padding: '3px 6px', fontSize: 10, borderBottom: '1px solid var(--mc-border)' }

  const delta = (actual, predicted) => {
    const a = parseFloat(actual)
    const p = predicted
    if (!isFinite(a) || p == null) return null
    const diff = (a - p) / p * 100
    return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`
  }

  const outcomeColor = {
    nominal: 'var(--mc-green)',
    minor_issue: 'var(--mc-amber)',
    failure: 'var(--mc-red)',
    loss: 'var(--mc-red)',
  }

  return (
    <div style={{ borderBottom: '1px solid var(--mc-border)', padding: '10px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--mc-text)' }}>{entry.date}</span>
          {entry.location && <span style={{ fontSize: 11, color: 'var(--mc-text-dim)', marginLeft: 8 }}>{entry.location}</span>}
          <span style={{ fontSize: 10, color: outcomeColor[entry.outcome] || 'var(--mc-text-dim)', marginLeft: 8, fontWeight: 600, textTransform: 'uppercase' }}>
            {entry.outcome.replace('_', ' ')}
          </span>
        </div>
        <button
          style={{ background: 'none', border: 'none', color: 'var(--mc-text-dim)', cursor: 'pointer', fontSize: 11, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => onDelete(entry.id)}
          title="Delete entry"
        >&times;</button>
      </div>

      {pred && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
          <thead>
            <tr>
              <th style={{ ...cellStyle, fontWeight: 600 }}>Metric</th>
              <th style={{ ...cellStyle, fontWeight: 600 }}>Predicted</th>
              <th style={{ ...cellStyle, fontWeight: 600 }}>Actual</th>
              <th style={{ ...cellStyle, fontWeight: 600 }}>Error</th>
            </tr>
          </thead>
          <tbody>
            {entry.actual_apogee_ft && (
              <tr>
                <td style={cellStyle}>Apogee</td>
                <td style={cellStyle}>{pred.apogee_ft} ft</td>
                <td style={cellStyle}>{entry.actual_apogee_ft} ft</td>
                <td style={{ ...cellStyle, color: 'var(--mc-amber)' }}>{delta(entry.actual_apogee_ft, pred.apogee_ft)}</td>
              </tr>
            )}
            {entry.actual_main_fps && pred.main_fps && (
              <tr>
                <td style={cellStyle}>Main Rate</td>
                <td style={cellStyle}>{pred.main_fps} fps</td>
                <td style={cellStyle}>{entry.actual_main_fps} fps</td>
                <td style={{ ...cellStyle, color: 'var(--mc-amber)' }}>{delta(entry.actual_main_fps, pred.main_fps)}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {entry.notes && (
        <div style={{ fontSize: 11, color: 'var(--mc-text-dim)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
          {entry.notes}
        </div>
      )}
    </div>
  )
}

export default function FlightLogTab({ state }) {
  const [entries, setEntries] = useState(loadLog)

  useEffect(() => { saveLog(entries) }, [entries])

  const addEntry = (entry) => setEntries(prev => [entry, ...prev])
  const deleteEntry = (id) => setEntries(prev => prev.filter(e => e.id !== id))

  return (
    <div className="mc-export">
      <h2 className="mc-panel-header">FLIGHT_LOG</h2>
      <div style={{ padding: '12px', overflowY: 'auto', flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--mc-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          New Entry
        </div>
        <NewEntryForm simulation={state.simulation} specs={state.specs} onSave={addEntry} />

        {entries.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--mc-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '20px 0 8px' }}>
              History ({entries.length} flight{entries.length !== 1 ? 's' : ''})
            </div>
            {entries.map(entry => (
              <LogEntry key={entry.id} entry={entry} onDelete={deleteEntry} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
