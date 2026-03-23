import React from 'react'
import { PARTS } from '../data/parts.js'
import { slotStatus } from '../lib/compatibility.js'
import CompatDot from './CompatDot.jsx'

function partSpecLine(part) {
  switch (part.category) {
    case 'main_chute':
    case 'drogue_chute':
      return `${part.specs.diameter_in}" Ø  Cd ${part.specs.cd}  ${part.specs.weight_g}g`
    case 'flight_computer':
      return `${part.specs.min_voltage}–${part.specs.max_voltage}V  ${part.specs.weight_g}g`
    case 'battery':
      return `${part.specs.voltage}V  ${part.specs.capacity_mah}mAh  ${part.specs.weight_g}g`
    case 'shock_cord':
      return `${part.specs.strength_lbs} lbs  ${part.specs.length_ft}ft  ${part.specs.weight_g}g`
    default:
      return ''
  }
}

export default function PartsBrowser({ parts, categories, activeCategory, config, warnings, onSelectCategory, onSelectPart }) {
  const filtered = parts.filter(p => p.category === activeCategory)

  // Group by manufacturer
  const byMfr = {}
  filtered.forEach(p => {
    if (!byMfr[p.manufacturer]) byMfr[p.manufacturer] = []
    byMfr[p.manufacturer].push(p)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Category tabs */}
      <div style={{ borderBottom: '1px solid var(--border-default)', padding: '8px 0 0' }}>
        <div className="section-label" style={{ padding: '0 16px 6px' }}>Category</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {categories.map(cat => {
            const isActive = cat.id === activeCategory
            const selected = config[cat.id]
            const status   = selected ? slotStatus(cat.id, warnings) : 'neutral'
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 16px',
                  background: isActive ? 'var(--bg-hover)' : 'transparent',
                  border: 'none',
                  borderLeft: isActive ? '3px solid var(--text-primary)' : '3px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  width: '100%',
                }}
              >
                <span>{cat.label}</span>
                <CompatDot status={status} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Parts list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {Object.entries(byMfr).map(([mfr, mfrParts]) => (
          <div key={mfr}>
            <div className="section-label" style={{ padding: '10px 16px 4px' }}>{mfr}</div>
            {mfrParts.map(part => {
              const isSelected = config[part.category]?.id === part.id
              return (
                <button
                  key={part.id}
                  onClick={() => onSelectPart(part)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '0 16px',
                    height: '36px',
                    width: '100%',
                    background: isSelected ? 'var(--ok-bg)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    gap: '1px',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {part.name}
                  </div>
                  <div className="mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    {partSpecLine(part)}
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
