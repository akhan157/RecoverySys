import { useState, useEffect } from 'react'
import Input from '../primitives/Input.jsx'
import {
  createFlightEntry,
  loadFlightLog,
  saveFlightLog,
  exportFlightRecords,
  importFlightRecords,
} from '../../lib/flightEvidence.js'

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
    observation_source: 'manual',
    instrumentation: '',
    missing_data: [],
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = () => {
    const entry = createFlightEntry(form, { simulation, specs, resultFresh: Boolean(simulation) })
    onSave(entry)
    setForm((f) => ({
      ...f,
      actual_apogee_ft: '',
      actual_main_fps: '',
      actual_landing_lat: '',
      actual_landing_lon: '',
      notes: '',
      outcome: 'nominal',
    }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label
            htmlFor="flight-date"
            className="section-label"
            style={{ marginBottom: 3, display: 'block' }}
          >
            Date
          </label>
          <Input
            id="flight-date"
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="flight-location"
            className="section-label"
            style={{ marginBottom: 3, display: 'block' }}
          >
            Location
          </label>
          <Input
            id="flight-location"
            placeholder="e.g. FAR Mojave"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            mono={false}
          />
        </div>
        <div>
          <label
            htmlFor="flight-apogee"
            className="section-label"
            style={{ marginBottom: 3, display: 'block' }}
          >
            Actual Apogee (ft)
          </label>
          <Input
            id="flight-apogee"
            type="number"
            placeholder={simulation ? `predicted: ${simulation.apogee_ft}` : ''}
            value={form.actual_apogee_ft}
            onChange={(e) => set('actual_apogee_ft', e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="flight-main-rate"
            className="section-label"
            style={{ marginBottom: 3, display: 'block' }}
          >
            Actual Main Rate (fps)
          </label>
          <Input
            id="flight-main-rate"
            type="number"
            placeholder={simulation?.main_fps ? `predicted: ${simulation.main_fps}` : ''}
            value={form.actual_main_fps}
            onChange={(e) => set('actual_main_fps', e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="flight-lat"
            className="section-label"
            style={{ marginBottom: 3, display: 'block' }}
          >
            Landing Lat
          </label>
          <Input
            id="flight-lat"
            type="number"
            placeholder="decimal degrees"
            value={form.actual_landing_lat}
            onChange={(e) => set('actual_landing_lat', e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="flight-lon"
            className="section-label"
            style={{ marginBottom: 3, display: 'block' }}
          >
            Landing Lon
          </label>
          <Input
            id="flight-lon"
            type="number"
            placeholder="decimal degrees"
            value={form.actual_landing_lon}
            onChange={(e) => set('actual_landing_lon', e.target.value)}
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="flight-outcome"
          className="section-label"
          style={{ marginBottom: 3, display: 'block' }}
        >
          Outcome
        </label>
        <select
          id="flight-outcome"
          className="parts-search-input"
          style={{ width: '100%' }}
          value={form.outcome}
          onChange={(e) => set('outcome', e.target.value)}
        >
          <option value="nominal">Nominal</option>
          <option value="minor_issue">Minor Issue</option>
          <option value="failure">Failure</option>
          <option value="loss">Loss of Vehicle</option>
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label
            htmlFor="flight-observation-source"
            className="section-label"
            style={{ marginBottom: 3, display: 'block' }}
          >
            Observation Source
          </label>
          <select
            id="flight-observation-source"
            className="parts-search-input"
            style={{ width: '100%' }}
            value={form.observation_source}
            onChange={(e) => set('observation_source', e.target.value)}
          >
            <option value="manual">Manual</option>
            <option value="altimeter">Altimeter</option>
            <option value="tracker">Tracker</option>
            <option value="video">Video</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="flight-instrumentation"
            className="section-label"
            style={{ marginBottom: 3, display: 'block' }}
          >
            Instrumentation
          </label>
          <Input
            id="flight-instrumentation"
            placeholder="e.g. Raven, GPS"
            value={form.instrumentation}
            onChange={(e) => set('instrumentation', e.target.value)}
            mono={false}
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="flight-missing-data"
          className="section-label"
          style={{ marginBottom: 3, display: 'block' }}
        >
          Missing Data (optional)
        </label>
        <Input
          id="flight-missing-data"
          placeholder="e.g. landing coordinates"
          value={form.missing_data.join(', ')}
          onChange={(e) =>
            set(
              'missing_data',
              e.target.value
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean)
            )
          }
          mono={false}
        />
      </div>
      <div>
        <label
          htmlFor="flight-notes"
          className="section-label"
          style={{ marginBottom: 3, display: 'block' }}
        >
          Notes
        </label>
        <textarea
          id="flight-notes"
          className="parts-search-input"
          style={{ width: '100%', height: 60, resize: 'vertical' }}
          placeholder="Post-flight observations, issues, cord condition, chute state..."
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>
      <button className="mc-run-btn" onClick={handleSave}>
        LOG_FLIGHT &rarr;
      </button>
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
    const diff = ((a - p) / p) * 100
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--mc-text)' }}>
            {entry.date}
          </span>
          {entry.location && (
            <span style={{ fontSize: 11, color: 'var(--mc-text-dim)', marginLeft: 8 }}>
              {entry.location}
            </span>
          )}
          <span
            style={{
              fontSize: 10,
              color: outcomeColor[entry.outcome] || 'var(--mc-text-dim)',
              marginLeft: 8,
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            {entry.outcome.replace('_', ' ')}
          </span>
        </div>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--mc-text-dim)',
            cursor: 'pointer',
            fontSize: 11,
            minWidth: 44,
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => onDelete(entry.id)}
          title="Delete entry"
        >
          &times;
        </button>
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
                <td style={{ ...cellStyle, color: 'var(--mc-amber)' }}>
                  {delta(entry.actual_apogee_ft, pred.apogee_ft)}
                </td>
              </tr>
            )}
            {entry.actual_main_fps && pred.main_fps && (
              <tr>
                <td style={cellStyle}>Main Rate</td>
                <td style={cellStyle}>{pred.main_fps} fps</td>
                <td style={cellStyle}>{entry.actual_main_fps} fps</td>
                <td style={{ ...cellStyle, color: 'var(--mc-amber)' }}>
                  {delta(entry.actual_main_fps, pred.main_fps)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {entry.notes && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--mc-text-dim)',
            lineHeight: 1.4,
            whiteSpace: 'pre-wrap',
          }}
        >
          {entry.notes}
        </div>
      )}
    </div>
  )
}

export default function FlightLogTab({ state, resultFresh }) {
  const usableSimulation = resultFresh ? state.simulation : null
  const [entries, setEntries] = useState(loadFlightLog)

  useEffect(() => {
    saveFlightLog(entries)
  }, [entries])

  const addEntry = (entry) => setEntries((prev) => [entry, ...prev])
  const deleteEntry = (id) => setEntries((prev) => prev.filter((e) => e.id !== id))
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([exportFlightRecords(entries)], { type: 'application/json' })
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'recoverysys-flight-records.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }
  const importRecords = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        setEntries((prev) => [...importFlightRecords(reader.result), ...prev])
      } catch {
        /* reject invalid JSON */
      }
      event.target.value = ''
    }
    reader.readAsText(file)
  }

  return (
    <div className="mc-export">
      <h2 className="mc-panel-header">FLIGHT_LOG</h2>
      <div style={{ padding: '12px', overflowY: 'auto', flex: 1 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--mc-text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 8,
          }}
        >
          New Entry
        </div>
        {state.simulation && !resultFresh && (
          <div className="mc-validation mc-validation--warn" style={{ marginBottom: 10 }}>
            RESULT_STALE — rerun simulation before logging predicted values
          </div>
        )}
        <NewEntryForm simulation={usableSimulation} specs={state.specs} onSave={addEntry} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="mc-run-btn" type="button" onClick={download}>
            EXPORT_RECORDS
          </button>
          <label className="mc-run-btn">
            IMPORT_RECORDS
            <input
              type="file"
              accept="application/json"
              onChange={importRecords}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {entries.length > 0 && (
          <>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--mc-text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                margin: '20px 0 8px',
              }}
            >
              History ({entries.length} flight{entries.length !== 1 ? 's' : ''})
            </div>
            {entries.map((entry) => (
              <LogEntry key={entry.id} entry={entry} onDelete={deleteEntry} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
