import React, { useState, useRef, useEffect } from 'react'

const THRUSTCURVE_URL = 'https://www.thrustcurve.org/api/v1/search.json'

function MotorSearch({ onSetSpec }) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [selected, setSelected] = useState(null)
  const [open,     setOpen]     = useState(false)
  const debounceRef             = useRef(null)
  const abortRef                = useRef(null)   // AbortController for in-flight fetch
  const containerRef            = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Cancel any pending debounce + in-flight fetch on unmount
  useEffect(() => {
    return () => { clearTimeout(debounceRef.current); abortRef.current?.abort() }
  }, [])

  const handleInput = (q) => {
    setQuery(q)
    clearTimeout(debounceRef.current)
    // Cancel any in-flight request immediately (prevents stale results overwriting fresh ones)
    abortRef.current?.abort()
    if (!q || q.trim().length < 2) { setResults([]); setOpen(false); setError(null); return }
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      setError(null)
      try {
        const url = `${THRUSTCURVE_URL}?commonName=${encodeURIComponent(q.trim())}&maxResults=15`
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setResults(data.results ?? [])
        setOpen(true)
      } catch (err) {
        if (err.name === 'AbortError') return   // stale request — silently drop
        setError('ThrustCurve unavailable — enter values manually')
        setResults([])
        setOpen(false)
      } finally {
        setLoading(false)
      }
    }, 350)
  }

  const select = (motor) => {
    // Guard: validate API fields before writing to specs (corrupted entries return NaN)
    const impulse = Number(motor.totImpulseNs)
    if (!isFinite(impulse) || impulse <= 0) {
      setError(`Motor "${motor.designation}" has invalid impulse data — enter manually`)
      return
    }
    setSelected(motor)
    setOpen(false)
    setQuery('')
    setResults([])
    onSetSpec('motor_total_impulse_ns', String(Math.round(impulse)))
    const burn = Number(motor.burnTimeS)
    if (isFinite(burn) && burn > 0) onSetSpec('burn_time_s', String(burn.toFixed(2)))
  }

  const clear = () => { abortRef.current?.abort(); setSelected(null); setQuery(''); setResults([]); setOpen(false); setError(null) }

  const inputStyle = {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontWeight: 600,
    fontSize: '13px',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-default)',
    borderRadius: 0,
    padding: '5px 7px',
    width: '100%',
    outline: 'none',
    background: 'var(--input-bg)',
    boxSizing: 'border-box',
  }

  return (
    <div ref={containerRef} style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
      <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
        Motor <span style={{ fontWeight: 400, opacity: 0.7 }}>(ThrustCurve search)</span>
      </label>

      {selected ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '5px 8px',
          background: 'var(--ok-bg, rgba(74,222,128,0.08))',
          border: '1px solid var(--ok-fg, #4ade80)',
          borderRadius: 'var(--radius)',
        }}>
          <span style={{ fontSize: '12px' }}>
            <span className="mono" style={{ color: 'var(--ok-fg, #4ade80)', fontWeight: 700 }}>{selected.designation}</span>
            <span style={{ color: 'var(--text-tertiary)', marginLeft: '8px' }}>
              {selected.manufacturerAbbrev} — {Math.round(selected.totImpulseNs)} Ns
              {selected.burnTimeS != null ? ` / ${selected.burnTimeS.toFixed(1)}s` : ''}
            </span>
          </span>
          <button
            onClick={clear}
            title="Clear motor selection"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '15px', padding: '0 2px', lineHeight: 1 }}
          >×</button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={query}
            placeholder="e.g. J350, K185, L1000…"
            onChange={e => handleInput(e.target.value)}
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = '' }}
          />
          {loading && (
            <span style={{
              position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
              width: '11px', height: '11px', borderRadius: '50%',
              border: '2px solid var(--border-default)',
              borderTopColor: 'var(--accent)',
              animation: 'spin 0.7s linear infinite',
              display: 'inline-block',
            }} />
          )}
        </div>
      )}

      {error && <span style={{ fontSize: '10px', color: 'var(--error-fg)', lineHeight: 1.3 }}>{error}</span>}

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% - 2px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-panel)',
          border: '1px solid var(--accent)',
          maxHeight: '200px', overflowY: 'auto',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}>
          {results.map((m, i) => (
            <button
              key={m.motorId ?? i}
              onMouseDown={e => { e.preventDefault(); select(m) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '7px 10px', background: 'none', border: 'none',
                borderBottom: i < results.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                cursor: 'pointer', color: 'var(--text-primary)', fontSize: '12px',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-right)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span className="mono" style={{ fontWeight: 700 }}>{m.designation}</span>
              <span style={{ color: 'var(--text-tertiary)', marginLeft: '8px' }}>
                {m.manufacturerAbbrev} — {Math.round(m.totImpulseNs)} Ns
                {m.burnTimeS != null ? ` / ${m.burnTimeS.toFixed(1)}s` : ''}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && !loading && results.length === 0 && query.trim().length >= 2 && (
        <div style={{
          position: 'absolute', top: 'calc(100% - 2px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-panel)', border: '1px solid var(--border-default)',
          padding: '8px 10px', fontSize: '12px', color: 'var(--text-tertiary)',
        }}>
          No available motors found for "{query}"
        </div>
      )}
    </div>
  )
}

function SpecInput({ label, id, value, unit, placeholder, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label htmlFor={id} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <input
          id={id}
          type="number"
          min="0"
          value={value ?? ''}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontWeight: 600,
            fontSize: '13px',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: 0,
            padding: '5px 7px',
            width: '100%',
            outline: 'none',
            background: 'var(--input-bg)',
            transition: 'border-color 0.18s ease',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = '' }}
        />
        {unit && (
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexShrink: 0 }}>{unit}</span>
        )}
      </div>
    </div>
  )
}

// Auto G-factor: 20G for L1/L2 (<10 kg), 30G for L3 (≥10 kg). Matches NAR/TRA guidelines.
function autoGFactor(mass_g) {
  const mass_kg = parseFloat(mass_g)
  if (!mass_kg || mass_kg <= 0) return 20
  return mass_kg >= 10000 ? 30 : 20
}

export default function RocketSpecs({ specs, onSetSpec }) {
  const gAuto    = autoGFactor(specs.rocket_mass_g)
  const gDisplay = specs.ejection_g_factor ? parseFloat(specs.ejection_g_factor) : gAuto
  const gIsLow   = gDisplay < 12   // below NAR minimum

  // Bay volume — computed from airframe ID + bay length; obstructions subtracted for usable
  const airframe_id     = parseFloat(specs.airframe_id_in)
  const bay_length      = parseFloat(specs.bay_length_in)
  const obstruction_vol = parseFloat(specs.bay_obstruction_vol_in3) || 0
  const bayVolume       = (airframe_id > 0 && bay_length > 0)
    ? Math.PI * Math.pow(airframe_id / 2, 2) * bay_length
    : null
  const usableVolume    = bayVolume != null ? Math.max(0, bayVolume - obstruction_vol) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="section-label">Rocket Specs — optional, improves sim accuracy</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <SpecInput
          id="mass"
          label="Rocket Mass"
          value={specs.rocket_mass_g}
          unit="g"
          placeholder="e.g. 2500"
          onChange={v => onSetSpec('rocket_mass_g', v)}
        />

        {/* Motor search spans full width */}
        <MotorSearch onSetSpec={onSetSpec} />

        <SpecInput
          id="impulse"
          label="Motor Impulse"
          value={specs.motor_total_impulse_ns}
          unit="Ns"
          placeholder="e.g. 640"
          onChange={v => onSetSpec('motor_total_impulse_ns', v)}
        />
        <SpecInput
          id="burn"
          label="Burn Time"
          value={specs.burn_time_s}
          unit="s"
          placeholder="e.g. 1.8"
          onChange={v => onSetSpec('burn_time_s', v)}
        />
        <SpecInput
          id="airframe-id"
          label="Airframe ID"
          value={specs.airframe_id_in}
          unit="in"
          placeholder="e.g. 3.9"
          onChange={v => onSetSpec('airframe_id_in', v)}
        />
        <SpecInput
          id="bay-length"
          label="Recovery Bay Length"
          value={specs.bay_length_in}
          unit="in"
          placeholder="e.g. 18"
          onChange={v => onSetSpec('bay_length_in', v)}
        />
        <SpecInput
          id="bay-obstruction"
          label="Obstruction Volume"
          value={specs.bay_obstruction_vol_in3}
          unit="in³"
          placeholder="0"
          onChange={v => onSetSpec('bay_obstruction_vol_in3', v)}
        />

        {/* Bay volume readout — computed from ID + length; always shown when both are filled */}
        {bayVolume != null && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '16px', alignItems: 'center',
            padding: '6px 10px', background: 'var(--bg-right)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius)', fontSize: '11px', color: 'var(--text-tertiary)' }}>
            <span>Bay <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{bayVolume.toFixed(1)} in³</strong></span>
            {obstruction_vol > 0 && <>
              <span style={{ color: 'var(--border-default)' }}>–</span>
              <span>Obstructions <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{obstruction_vol.toFixed(1)} in³</strong></span>
              <span style={{ color: 'var(--border-default)' }}>=</span>
              <span>Usable <strong style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{usableVolume.toFixed(1)} in³</strong></span>
            </>}
          </div>
        )}

        <SpecInput
          id="cd"
          label="Drag Coeff (Cd)"
          value={specs.drag_cd}
          unit=""
          placeholder="0.50"
          onChange={v => onSetSpec('drag_cd', v)}
        />
        <SpecInput
          id="wind"
          label="Wind Speed"
          value={specs.wind_speed_mph}
          unit="mph"
          placeholder="e.g. 10"
          onChange={v => onSetSpec('wind_speed_mph', v)}
        />
        <SpecInput
          id="wind-dir"
          label="Wind Direction"
          value={specs.wind_direction_deg}
          unit="°"
          placeholder="0=N 90=E"
          onChange={v => onSetSpec('wind_direction_deg', v)}
        />
        <SpecInput
          id="launch-lat"
          label="Launch Lat"
          value={specs.launch_lat}
          unit=""
          placeholder="e.g. 42.3601"
          onChange={v => onSetSpec('launch_lat', v)}
        />
        <SpecInput
          id="launch-lon"
          label="Launch Lon"
          value={specs.launch_lon}
          unit=""
          placeholder="e.g. -71.0589"
          onChange={v => onSetSpec('launch_lon', v)}
        />
        <SpecInput
          id="deploy"
          label="Main Deploy Alt"
          value={specs.main_deploy_alt_ft}
          unit="ft"
          placeholder="500"
          onChange={v => onSetSpec('main_deploy_alt_ft', v)}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label htmlFor="g-factor" style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
            Ejection G-Factor
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              id="g-factor"
              type="number"
              min="1"
              max="100"
              value={specs.ejection_g_factor}
              placeholder={`auto (${gAuto}G)`}
              onChange={e => onSetSpec('ejection_g_factor', e.target.value)}
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontWeight: 600,
                fontSize: '13px',
                color: gIsLow ? 'var(--error-fg)' : 'var(--text-primary)',
                border: `1px solid ${gIsLow ? 'var(--error-fg)' : 'var(--border-default)'}`,
                borderRadius: 0,
                padding: '5px 7px',
                width: '100%',
                outline: 'none',
                background: 'var(--input-bg)',
                transition: 'border-color 0.18s ease',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
              onBlur={e => { e.target.style.borderColor = gIsLow ? 'var(--error-fg)' : 'var(--border-default)'; e.target.style.boxShadow = '' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexShrink: 0 }}>G</span>
          </div>
          {gIsLow && (
            <span style={{ fontSize: '10px', color: 'var(--error-fg)', lineHeight: 1.3 }}>
              Below 12G NAR minimum
            </span>
          )}
        </div>
      </div>
      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
        {specs.burn_time_s
          ? `Apogee via powered+coast integration with ISA atmosphere (±10–15%). Cd ${specs.drag_cd || '0.50'}, Isp 195s.`
          : 'Enter burn time for ±10–15% apogee accuracy. Without it, fallback heuristic gives ±30%.'}
      </p>
      <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: 1.4, marginTop: '-4px' }}>
        Cd: blank = 0.50 (typical HPR). G-Factor: blank = auto (20G L1/L2, 30G L3 ≥10 kg). BP charges typically 20–30G; CO2/Tender Descender 8–12G. Airframe ID: inner diameter of your airframe tube (e.g. 3.9" for a 4" tube). Bay Length: axial length of your recovery bay. Obstruction Volume: volume of avionics sleds, bulkheads, or other hardware inside the bay — subtracted to get usable packing space.
      </p>
    </div>
  )
}
