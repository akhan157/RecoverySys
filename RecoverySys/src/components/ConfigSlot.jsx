import React from 'react'
import { slotStatus } from '../lib/compatibility.js'

const ACCENT = {
  ok:      'var(--ok-fg)',
  warn:    'var(--warn-fg)',
  error:   'var(--error-fg)',
  neutral: 'transparent',
}

function slotSpecLine(part) {
  if (!part) return ''
  switch (part.category) {
    case 'main_chute':
    case 'drogue_chute':
      return `${part.specs.diameter_in}" Ø  Cd ${part.specs.cd}  packed ${part.specs.packed_diam_in}"  ${part.specs.weight_g}g`
    case 'flight_computer':
      return `${part.specs.min_voltage}–${part.specs.max_voltage}V  max ${part.specs.accel_limit_g}G  ${part.specs.weight_g}g`
    case 'battery':
      return `${part.specs.voltage}V  ${part.specs.capacity_mah}mAh  ${part.specs.weight_g}g`
    case 'shock_cord':
      return `${part.specs.strength_lbs} lbs  ${part.specs.length_ft}ft  ${part.specs.weight_g}g`
    default:
      return ''
  }
}

export default function ConfigSlot({ category, label, placeholder, part, warnings, onRemove, onClickEmpty }) {
  const status = part ? slotStatus(category, warnings) : 'neutral'
  const accent = ACCENT[status]

  if (!part) {
    return (
      <button
        onClick={onClickEmpty}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '56px',
          width: '100%',
          padding: '0 12px',
          background: 'transparent',
          border: '1px dashed #ccc',
          borderRadius: 0,
          cursor: 'pointer',
          textAlign: 'left',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{ color: 'var(--text-placeholder)', fontStyle: 'italic', fontSize: '13px' }}>
          {placeholder}
        </span>
      </button>
    )
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: '56px',
      border: '1px solid var(--border-default)',
      borderLeft: `3px solid ${accent}`,
      padding: '0 12px',
      gap: '8px',
      background: 'var(--bg-panel)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {part.manufacturer} {part.name}
        </div>
        <div className="mono" style={{ fontSize: '11px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {slotSpecLine(part)}
        </div>
      </div>
      <button
        onClick={() => onRemove(category)}
        title="Remove"
        aria-label={`Remove ${part.name}`}
        style={{
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: 'var(--text-tertiary)',
          fontSize: '16px',
          lineHeight: 1,
          padding: 0,
          flexShrink: 0,
          minWidth: '44px',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 -12px 0 0',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--error-fg)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
      >
        ×
      </button>
    </div>
  )
}
