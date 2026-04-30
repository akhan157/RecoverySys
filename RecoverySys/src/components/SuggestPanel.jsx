import React, { useState, useMemo } from 'react'
import { computeDescentRate } from '../lib/simulation.js'
import { PHYSICS } from '../lib/constants.js'

const G_ACCEL   = PHYSICS.G
const LBS_PER_N = PHYSICS.LBS_PER_N

// ── helpers ──────────────────────────────────────────────────────────────────

function scored(parts, category, scoreFn) {
  return parts
    .filter(p => p.category === category)
    .map(p => ({ part: p, score: scoreFn(p) }))
    .filter(p => p.score !== null)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
}

function fpsLabel(fps) {
  return fps > 0 ? `${fps.toFixed(1)} fps` : '—'
}

// ── suggestion row ───────────────────────────────────────────────────────────

function SuggestRow({ part, detail, isSelected, onSelect }) {
  return (
    <div
      onClick={() => !isSelected && onSelect(part)}
      // data-selected lets onMouseLeave read the CURRENT selection state rather than
      // closing over a stale `isSelected` value from the render before the click.
      data-selected={isSelected ? 'true' : 'false'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 10px',
        borderBottom: '1px solid var(--border-subtle)',
        cursor: isSelected ? 'default' : 'pointer',
        background: isSelected ? 'var(--ok-bg, rgba(74,222,128,0.06))' : 'none',
        transition: 'background 120ms',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-right)' }}
      onMouseLeave={e => {
        const sel = e.currentTarget.dataset.selected === 'true'
        e.currentTarget.style.background = sel ? 'var(--ok-bg, rgba(74,222,128,0.06))' : 'none'
      }}
    >
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {isSelected && <span style={{ color: 'var(--ok-fg, #4ade80)', marginRight: '4px' }}>✓</span>}
          {part.name}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{detail}</div>
      </div>
      {!isSelected && (
        <button
          onClick={e => { e.stopPropagation(); onSelect(part) }}
          style={{
            flexShrink: 0,
            height: '24px', padding: '0 10px',
            background: 'var(--cta-bg)', color: 'var(--cta-fg)',
            border: 'none', borderRadius: 'var(--radius)',
            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Use
        </button>
      )}
    </div>
  )
}

// ── section header ────────────────────────────────────────────────────────────

function SuggestSection({ label, children }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div className="section-label" style={{
        padding: '6px 10px', borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-right)',
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function SuggestPanel({ parts, specs, config, onSelectPart }) {
  const [open, setOpen]         = useState(false)
  const [mainFps,  setMainFps]  = useState('15')
  const [drogueFps, setDrogueFps] = useState('80')

  const mass_kg     = (parseFloat(specs.rocket_mass_g) || 0) / 1000
  const deploy_ft   = parseFloat(specs.main_deploy_alt_ft) || 500
  const g_factor    = parseFloat(specs.ejection_g_factor) || (mass_kg >= 10 ? 30 : 20)
  const targetMain  = parseFloat(mainFps)  || 15
  const targetDrogue = parseFloat(drogueFps) || 80

  const suggestions = useMemo(() => {
    if (!mass_kg) return null

    // Main chute: sort by |actual_fps - target|
    const mainChutes = scored(parts, 'main_chute', p => {
      const fps = computeDescentRate(p.specs, mass_kg, deploy_ft)
      return fps > 0 ? Math.abs(fps - targetMain) : null
    }).map(({ part }) => {
      const fps = computeDescentRate(part.specs, mass_kg, deploy_ft)
      return { part, detail: `${fpsLabel(fps)} main descent · ${part.specs.diameter_in}" Ø Cd ${part.specs.cd}` }
    })

    // Drogue chute: sort by |actual_fps - target|
    const drogueChutes = scored(parts, 'drogue_chute', p => {
      const fps = computeDescentRate(p.specs, mass_kg)
      return fps > 0 ? Math.abs(fps - targetDrogue) : null
    }).map(({ part }) => {
      const fps = computeDescentRate(part.specs, mass_kg)
      return { part, detail: `${fpsLabel(fps)} drogue descent · ${part.specs.diameter_in}" Ø Cd ${part.specs.cd}` }
    })

    // Shock cord: minimum rated strength ≥ ejection load; sort by safety factor desc
    const required_lbs = mass_kg > 0 ? (mass_kg * G_ACCEL * g_factor) * LBS_PER_N : 0
    const shockCords = scored(parts, 'shock_cord', p => {
      if (!p.specs.strength_lbs || p.specs.strength_lbs < required_lbs) return null
      return -(p.specs.strength_lbs / required_lbs) // negate so best SF sorts first
    }).map(({ part }) => {
      const sf = required_lbs > 0 ? (part.specs.strength_lbs / required_lbs).toFixed(1) : '—'
      return { part, detail: `${part.specs.strength_lbs} lbs · ${part.specs.length_ft}ft · ${part.specs.material} · SF ${sf}×` }
    })

    return { mainChutes, drogueChutes, shockCords }
  }, [parts, mass_kg, deploy_ft, g_factor, targetMain, targetDrogue])

  const inputStyle = {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontWeight: 600, fontSize: '13px',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-default)',
    borderRadius: 0,
    padding: '4px 6px',
    width: '72px',
    outline: 'none',
    background: 'var(--input-bg)',
  }

  return (
    <div style={{ borderTop: '1px solid var(--border-default)' }}>

      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-primary)',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '-0.01em' }}>
          Suggest Parts
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', transition: 'transform 200ms',
          transform: open ? 'rotate(180deg)' : 'none' }}>
          ▾
        </span>
      </button>

      {open && (
        <div>
          {/* Target inputs */}
          <div style={{
            display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap',
            padding: '0 14px 12px',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
              <span>Main target</span>
              <input
                type="number" min="1" max="40" step="1"
                value={mainFps}
                onChange={e => setMainFps(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = '' }}
              />
              <span>fps</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
              <span>Drogue target</span>
              <input
                type="number" min="1" max="300" step="5"
                value={drogueFps}
                onChange={e => setDrogueFps(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = '' }}
              />
              <span>fps</span>
            </div>
          </div>

          {!mass_kg ? (
            <div style={{ padding: '16px 14px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Enter Rocket Mass in Rocket Specs to get suggestions.
            </div>
          ) : !suggestions ? null : (
            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>

              {suggestions.mainChutes.length > 0 && (
                <SuggestSection label={`Main Chute — target ${targetMain} fps`}>
                  {suggestions.mainChutes.map(({ part, detail }) => (
                    <SuggestRow
                      key={part.id} part={part} detail={detail}
                      isSelected={config.main_chute?.id === part.id}
                      onSelect={onSelectPart}
                    />
                  ))}
                </SuggestSection>
              )}

              {suggestions.drogueChutes.length > 0 && (
                <SuggestSection label={`Drogue Chute — target ${targetDrogue} fps`}>
                  {suggestions.drogueChutes.map(({ part, detail }) => (
                    <SuggestRow
                      key={part.id} part={part} detail={detail}
                      isSelected={config.drogue_chute?.id === part.id}
                      onSelect={onSelectPart}
                    />
                  ))}
                </SuggestSection>
              )}

              {suggestions.shockCords.length > 0 && (
                <SuggestSection label={`Shock Cord — ≥${Math.ceil((mass_kg * G_ACCEL * g_factor) * LBS_PER_N)} lbs min at ${g_factor}G`}>
                  {suggestions.shockCords.map(({ part, detail }) => (
                    <SuggestRow
                      key={part.id} part={part} detail={detail}
                      isSelected={config.shock_cord?.id === part.id}
                      onSelect={onSelectPart}
                    />
                  ))}
                </SuggestSection>
              )}

              {suggestions.mainChutes.length === 0 && suggestions.drogueChutes.length === 0 && suggestions.shockCords.length === 0 && (
                <div style={{ padding: '16px 14px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  No matching parts found for these constraints.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
