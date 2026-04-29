import React, { useState, useRef, useEffect } from 'react'

const THRUSTCURVE_URL = 'https://www.thrustcurve.org/api/v1/search.json'

// ThrustCurve.org commercial motor search. Debounced, AbortController-guarded
// against stale results. Selection writes motor_total_impulse_ns + burn_time_s
// back into specs — that's all the downstream scalar sim path needs.
export default function MotorSearch({ onSetSpec }) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [selected, setSelected] = useState(null)
  const [open,     setOpen]     = useState(false)
  const debounceRef  = useRef(null)
  const abortRef     = useRef(null)   // AbortController for in-flight fetch
  const containerRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Cancel any pending debounce + in-flight fetch on unmount
  useEffect(() => () => { clearTimeout(debounceRef.current); abortRef.current?.abort() }, [])

  const handleInput = (q) => {
    setQuery(q)
    clearTimeout(debounceRef.current)
    // Cancel any in-flight request immediately — prevents stale results overwriting fresh ones
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
        setResults(Array.isArray(data?.results) ? data.results : [])
        setOpen(true)
      } catch (err) {
        if (err.name === 'AbortError') return   // stale request — silently drop
        setError('ThrustCurve unavailable — enter values manually')
        setResults([])
        setOpen(false)
      } finally {
        // Only clear the spinner if this request was NOT aborted.
        // If aborted, a newer request is already in flight and manages its own loading state.
        if (!controller.signal.aborted) setLoading(false)
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
              {selected.manufacturerAbbrev} — <span className="mono">{Math.round(selected.totImpulseNs)} Ns{selected.burnTimeS != null ? ` / ${Number(selected.burnTimeS).toFixed(1)}s` : ''}</span>
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
                {m.manufacturerAbbrev} — <span className="mono">{Math.round(m.totImpulseNs)} Ns{m.burnTimeS != null ? ` / ${Number(m.burnTimeS).toFixed(1)}s` : ''}</span>
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
