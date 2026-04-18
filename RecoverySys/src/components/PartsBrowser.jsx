import React, { useState, useEffect, useMemo } from 'react'
import { slotStatus } from '../lib/compatibility.js'
import { partSpecLine } from '../lib/format.js'
import CompatDot from './CompatDot.jsx'
import './PartsBrowser.css'

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
                className="parts-card"
                onClick={() => onSelectPart(part)}
                aria-label={`${part.name} — ${partSpecLine(part)}${isSelected ? ' (selected)' : ''}`}
                aria-pressed={isSelected}
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
                  className="parts-card parts-card--custom"
                  onClick={() => onSelectPart(part)}
                  aria-label={`${part.name} — ${partSpecLine(part) || 'custom'}${isSelected ? ' (selected)' : ''}`}
                  aria-pressed={isSelected}
                >
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>{part.name}</div>
                  <div className="mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, lineHeight: 1.2 }}>{partSpecLine(part)}</div>
                </button>
                {/* Delete button — positioned over card, stops propagation */}
                <button
                  type="button"
                  className="parts-card__delete"
                  onClick={e => { e.stopPropagation(); onDelete(part.id) }}
                  title="Delete custom part"
                  aria-label={`Delete ${part.name}`}
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
    // isFinite() rejects Infinity, -Infinity, and NaN (e.g. "1e308" parses to Infinity)
    if (!isFinite(d) || d <= 0) { setError('Diameter must be a finite number > 0'); return }
    if (!isFinite(c) || c <= 0) { setError('Cd must be a finite number > 0'); return }
    if (!isFinite(pd) || pd <= 0) { setError('Packed diameter must be a finite number > 0'); return }
    if (!isFinite(pl) || pl <= 0) { setError('Packed length must be a finite number > 0'); return }
    if (!isFinite(w) || w <= 0) { setError('Weight must be a finite number > 0'); return }
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

  // Pre-group warnings by slot once so we avoid an O(categories × warnings) scan on every render.
  const warningsBySlot = useMemo(() => {
    const map = {}
    for (const w of warnings) {
      if (!map[w.slot]) map[w.slot] = []
      map[w.slot].push(w)
    }
    return map
  }, [warnings])

  // Custom-part ID set for O(1) exclusion from the catalog list.
  const customIds = useMemo(() => new Set(customParts.map(p => p.id)), [customParts])

  const { categoryCustomParts, byMfr } = useMemo(() => {
    const categoryCustomParts = customParts.filter(p => p.category === activeCategory)
    const byMfr = {}
    for (const p of parts) {
      if (p.category !== activeCategory) continue
      if (customIds.has(p.id)) continue     // shown in Custom group instead
      if (!byMfr[p.manufacturer]) byMfr[p.manufacturer] = []
      byMfr[p.manufacturer].push(p)
    }
    return { categoryCustomParts, byMfr }
  }, [parts, activeCategory, customParts, customIds])

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
            const slotWarnings = warningsBySlot[cat.id] ?? []
            const tooltip  = (status === 'warn' || status === 'error') && slotWarnings.length > 0
              ? slotWarnings.map(w => w.message).join('\n')
              : undefined
            return (
              <button
                key={cat.id}
                className="parts-category-chip"
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
                className="parts-add-custom"
                onClick={() => setShowForm(true)}
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
