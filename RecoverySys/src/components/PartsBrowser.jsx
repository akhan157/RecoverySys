import React, { useState, useEffect } from 'react'
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
    case 'deployment_bag':
      return `fits ≤${part.specs.max_chute_diam_in}" chute  ${part.specs.packed_height_in}" packed  ${part.specs.weight_g}g`
    case 'swivel':
      return `${part.specs.rated_lbs} lbs WLL  ${part.specs.size_in}" size  ${part.specs.weight_g}g`
    default:
      return ''
  }
}

function MfrGroup({ mfr, parts, config, onSelectPart, defaultOpen, hasSelected }) {
  const [open, setOpen] = useState(defaultOpen || hasSelected)

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

      {/* Parts grid — collapsed via max-height; 9999px avoids catalog truncation */}
      <div style={{
        overflow: 'hidden',
        maxHeight: open ? '9999px' : '0',
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
                  if (e.currentTarget.getAttribute('aria-pressed') !== 'true') {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.boxShadow = '0 2px 8px var(--accent-ring)'
                  }
                }}
                onMouseLeave={e => {
                  if (e.currentTarget.getAttribute('aria-pressed') !== 'true') {
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

// Custom parts group — same layout as MfrGroup but cards have a delete button
function CustomGroup({ parts, config, onSelectPart, onDelete }) {
  const [open, setOpen] = useState(true)

  return (
    <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span className="section-label" style={{ color: 'var(--accent)' }}>CUSTOM</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ color: 'var(--text-tertiary)', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms ease', flexShrink: 0 }}>
          <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div style={{ overflow: 'hidden', maxHeight: open ? '9999px' : '0', transition: 'max-height 200ms ease' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '4px 12px 12px' }}>
          {parts.map(part => {
            const isSelected = config[part.category]?.id === part.id
            return (
              <div
                key={part.id}
                style={{ position: 'relative' }}
              >
                <button
                  onClick={() => onSelectPart(part)}
                  aria-pressed={isSelected}
                  style={{
                    width: '100%',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    padding: '8px 24px 8px 10px',
                    background: isSelected ? 'var(--ok-bg)' : 'var(--bg-panel)',
                    border: `1px solid ${isSelected ? 'var(--ok-fg)' : 'var(--accent)'}`,
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer', textAlign: 'left', gap: '3px',
                    transition: 'transform 150ms ease, box-shadow 150ms ease',
                  }}
                  onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 2px 8px var(--accent-ring)' } }}
                  onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' } }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>{part.name}</div>
                  <div className="mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, lineHeight: 1.2 }}>{partSpecLine(part)}</div>
                </button>
                {/* Delete button — positioned over card, stops propagation */}
                <button
                  onClick={() => onDelete(part.id)}
                  title="Delete custom part"
                  style={{
                    position: 'absolute', top: '4px', right: '4px',
                    width: '16px', height: '16px',
                    background: 'var(--bg-right)', border: '1px solid var(--border-default)',
                    borderRadius: '3px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: 1,
                    padding: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--error-fg)'; e.currentTarget.style.color = 'var(--error-fg)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const EMPTY_FORM = { name: '', diameter_in: '', cd: '', packed_diam_in: '', packed_length_in: '', weight_g: '' }

function CustomChuteForm({ category, onAdd, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = () => {
    const { name, diameter_in, cd, packed_diam_in, packed_length_in, weight_g } = form
    if (!name.trim()) { setError('Name is required'); return }
    const d = parseFloat(diameter_in), c = parseFloat(cd)
    const pd = parseFloat(packed_diam_in), pl = parseFloat(packed_length_in), w = parseFloat(weight_g)
    if (!d || d <= 0) { setError('Diameter must be > 0'); return }
    if (!c || c <= 0) { setError('Cd must be > 0'); return }
    if (!pd || pd <= 0) { setError('Packed diameter must be > 0'); return }
    if (!pl || pl <= 0) { setError('Packed length must be > 0'); return }
    if (!w || w <= 0) { setError('Weight must be > 0'); return }
    onAdd({
      id: `custom-${crypto.randomUUID()}`,
      category,
      manufacturer: 'Custom',
      name: name.trim(),
      specs: { diameter_in: d, cd: c, packed_diam_in: pd, packed_length_in: pl, weight_g: w },
    })
    setForm(EMPTY_FORM)
    setError('')
  }

  const inputStyle = {
    width: '100%', height: '28px', padding: '0 6px',
    border: '1px solid var(--border-default)', borderRadius: 'var(--radius)',
    background: 'var(--input-bg)', color: 'var(--text-primary)',
    fontSize: '12px', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = { fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '3px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }

  return (
    <div style={{ margin: '8px 12px 12px', padding: '12px', background: 'var(--bg-panel)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        New Custom Chute
      </div>

      {/* Name */}
      <div style={{ marginBottom: '8px' }}>
        <label style={labelStyle}>Name</label>
        <input
          style={inputStyle}
          placeholder={'e.g. My 54" Toroidal'}
          value={form.name}
          onChange={e => set('name', e.target.value)}
          onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none' }}
        />
      </div>

      {/* Diameter + Cd */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
        <div>
          <label style={labelStyle}>Diameter (in)</label>
          <input type="number" min="1" step="1" style={inputStyle} placeholder="e.g. 54"
            value={form.diameter_in} onChange={e => set('diameter_in', e.target.value)}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none' }} />
        </div>
        <div>
          <label style={labelStyle}>Drag Coeff (Cd)</label>
          <input type="number" min="0.1" step="0.01" style={inputStyle} placeholder="e.g. 1.5"
            value={form.cd} onChange={e => set('cd', e.target.value)}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none' }} />
        </div>
      </div>

      {/* Packed diam + Packed length */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
        <div>
          <label style={labelStyle}>Packed Diam (in)</label>
          <input type="number" min="0.1" step="0.1" style={inputStyle} placeholder="e.g. 4.5"
            value={form.packed_diam_in} onChange={e => set('packed_diam_in', e.target.value)}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none' }} />
        </div>
        <div>
          <label style={labelStyle}>Packed Length (in)</label>
          <input type="number" min="0.1" step="0.1" style={inputStyle} placeholder="e.g. 8"
            value={form.packed_length_in} onChange={e => set('packed_length_in', e.target.value)}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none' }} />
        </div>
      </div>

      {/* Weight */}
      <div style={{ marginBottom: '10px' }}>
        <label style={labelStyle}>Weight (g)</label>
        <input type="number" min="1" step="1" style={{ ...inputStyle, width: '50%' }} placeholder="e.g. 300"
          value={form.weight_g} onChange={e => set('weight_g', e.target.value)}
          onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none' }} />
      </div>

      {error && (
        <div style={{ fontSize: '11px', color: 'var(--error-fg)', marginBottom: '8px' }}>{error}</div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={handleSubmit}
          style={{
            height: '28px', padding: '0 14px',
            background: 'var(--cta-bg)', color: 'var(--cta-fg)',
            border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
            fontSize: '12px', fontWeight: 500,
          }}
        >
          Add Chute
        </button>
        <button
          onClick={onCancel}
          style={{
            height: '28px', padding: '0 12px',
            background: 'transparent', color: 'var(--text-secondary)',
            border: '1px solid var(--border-default)', borderRadius: 'var(--radius)',
            cursor: 'pointer', fontSize: '12px',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function PartsBrowser({ parts, categories, activeCategory, config, warnings, customParts = [], onSelectCategory, onSelectPart, onAddCustomPart, onDeleteCustomPart }) {
  const [showForm, setShowForm] = useState(false)

  // Close the add form when switching categories
  useEffect(() => { setShowForm(false) }, [activeCategory])

  const isChute = activeCategory === 'main_chute' || activeCategory === 'drogue_chute'
  const categoryCustomParts = customParts.filter(p => p.category === activeCategory)

  // Exclude custom parts from the catalog list (they appear in the Custom group instead)
  const catalogParts = parts.filter(p => p.category === activeCategory && !customParts.some(cp => cp.id === p.id))

  // Group catalog parts by manufacturer
  const byMfr = {}
  catalogParts.forEach(p => {
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
                  padding: '5px 12px',
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

      {/* Custom parts group + add form (chute categories only) */}
      {isChute && (
        <>
          {categoryCustomParts.length > 0 && (
            <CustomGroup
              parts={categoryCustomParts}
              config={config}
              onSelectPart={onSelectPart}
              onDelete={onDeleteCustomPart}
            />
          )}

          {!showForm ? (
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setShowForm(true)}
                style={{
                  height: '28px', padding: '0 12px',
                  background: 'transparent',
                  color: 'var(--accent)',
                  border: '1px dashed var(--accent)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-tint)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                + Add Custom Chute
              </button>
            </div>
          ) : (
            <CustomChuteForm
              category={activeCategory}
              onAdd={(part) => { onAddCustomPart(part); setShowForm(false) }}
              onCancel={() => setShowForm(false)}
            />
          )}
        </>
      )}

      {/* Catalog parts — collapsible manufacturer groups */}
      <div>
        {Object.entries(byMfr).map(([mfr, mfrParts], i) => (
          <MfrGroup
            key={activeCategory + '-' + mfr}
            mfr={mfr}
            parts={mfrParts}
            config={config}
            onSelectPart={onSelectPart}
            defaultOpen={i === 0}
            hasSelected={mfrParts.some(p => config[p.category]?.id === p.id)}
          />
        ))}
      </div>
    </div>
  )
}
