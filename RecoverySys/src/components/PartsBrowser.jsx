import React, { useState } from 'react'
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

function MfrGroup({ mfr, parts, config, onSelectPart, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      {/* Manufacturer header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span className="section-label">{mfr}</span>
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{
            color: 'var(--text-tertiary)',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease',
            flexShrink: 0,
          }}
        >
          <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Parts grid — collapsed via max-height */}
      <div style={{
        overflow: 'hidden',
        maxHeight: open ? '1000px' : '0',
        transition: 'max-height 200ms ease',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          padding: '4px 12px 12px',
        }}>
          {parts.map(part => {
            const isSelected = config[part.category]?.id === part.id
            return (
              <button
                key={part.id}
                onClick={() => onSelectPart(part)}
                aria-label={`${part.name} — ${partSpecLine(part)}${isSelected ? ' (selected)' : ''}`}
                aria-pressed={isSelected}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: '8px 10px',
                  background: isSelected ? 'var(--ok-bg)' : 'var(--bg-panel)',
                  border: `1px solid ${isSelected ? 'var(--ok-fg)' : 'var(--border-default)'}`,
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  gap: '3px',
                  transition: 'transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease',
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.boxShadow = '0 2px 8px var(--accent-ring)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.transform = ''
                    e.currentTarget.style.borderColor = 'var(--border-default)'
                    e.currentTarget.style.boxShadow = ''
                  }
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {part.name}
                </div>
                <div className="mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, lineHeight: 1.2 }}>
                  {partSpecLine(part)}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
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
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Category tabs — pill style */}
      <div style={{
        borderBottom: '1px solid var(--border-default)',
        padding: '10px 12px 0',
        background: 'var(--bg-right)',
      }}>
        <div className="section-label" style={{ marginBottom: '8px' }}>Parts</div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          paddingBottom: '10px',
        }}>
          {categories.map(cat => {
            const isActive = cat.id === activeCategory
            const selected = config[cat.id]
            const status   = selected ? slotStatus(cat.id, warnings) : 'neutral'
            const tooltip  = (status === 'warn' || status === 'error')
              ? warnings.find(w => w.slot === cat.id)?.message
              : undefined
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                title={tooltip}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  background: isActive ? 'var(--accent)' : 'var(--bg-panel)',
                  color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
                  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border-default)'}`,
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 150ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat.label}
                {selected && <CompatDot status={status} tooltip={tooltip} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Parts list — collapsible manufacturer groups */}
      <div style={{ overflowY: 'auto' }}>
        {Object.entries(byMfr).map(([mfr, mfrParts], i) => (
          <MfrGroup
            key={mfr}
            mfr={mfr}
            parts={mfrParts}
            config={config}
            onSelectPart={onSelectPart}
            defaultOpen={i === 0}
          />
        ))}
      </div>
    </div>
  )
}
