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

// Custom parts group — same layout as MfrGroup but cards have edit + delete buttons
function CustomGroup({ parts, config, onSelectPart, onDelete, onEdit }) {
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
                {/* Edit + Delete buttons — positioned over card */}
                <div style={{ position: 'absolute', top: '4px', right: '4px', display: 'flex', gap: '2px' }}>
                  <button
                    type="button"
                    className="parts-card__delete"
                    onClick={e => { e.stopPropagation(); onEdit(part) }}
                    title="Edit custom part"
                    aria-label={`Edit ${part.name}`}
                    style={{ fontSize: '11px' }}
                  >
                    ✎
                  </button>
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
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Per-category field schemas for custom part creation ──────────────────────
const CHUTE_FIELDS = [
  { key: 'diameter_in', label: 'Diameter (in)', type: 'number', required: true, min: 6, max: 200, step: 1 },
  { key: 'cd', label: 'Drag Coeff (Cd)', type: 'number', required: true, min: 0.3, max: 2.5, step: 0.01 },
  { key: 'packed_diam_in', label: 'Packed Diam (in)', type: 'number', required: true, min: 0.5, max: 20, step: 0.1 },
  { key: 'packed_length_in', label: 'Packed Length (in)', type: 'number', required: true, min: 0.5, max: 30, step: 0.1 },
  { key: 'weight_g', label: 'Weight (g)', type: 'number', required: true, min: 1, max: 5000, step: 1 },
  { key: 'shape', label: 'Shape', type: 'select', options: ['', 'elliptical', 'flat', 'toroidal', 'cruciform'], required: false },
  { key: 'material', label: 'Material', type: 'select', options: ['', 'nylon', 'ripstop nylon', 'silicone-coated nylon'], required: false },
]

const CATEGORY_FIELD_SCHEMAS = {
  main_chute: CHUTE_FIELDS,
  drogue_chute: CHUTE_FIELDS,
  shock_cord: [
    { key: 'material', label: 'Material', type: 'select', options: ['nylon', 'kevlar'], required: true },
    { key: 'elongation_pct', label: 'Elongation (%)', type: 'number', required: true, min: 1, max: 50, step: 1 },
    { key: 'strength_lbs', label: 'Strength (lbs)', type: 'number', required: true, min: 50, max: 20000, step: 1 },
    { key: 'length_ft', label: 'Length (ft)', type: 'number', required: true, min: 1, max: 100, step: 1 },
    { key: 'weight_g', label: 'Weight (g)', type: 'number', required: true, min: 1, max: 5000, step: 1 },
    { key: 'packed_height_in', label: 'Packed Height (in)', type: 'number', required: true, min: 0.1, max: 20, step: 0.1 },
  ],
  chute_protector: [
    { key: 'size_in', label: 'Size (in)', type: 'number', required: true, min: 1, step: 1 },
    { key: 'max_chute_diam_in', label: 'Max Chute Diam (in)', type: 'number', required: true, min: 1, step: 1 },
    { key: 'weight_g', label: 'Weight (g)', type: 'number', required: true, min: 1, step: 1 },
    { key: 'packed_height_in', label: 'Packed Height (in)', type: 'number', required: true, min: 0.1, step: 0.1 },
  ],
  deployment_bag: [
    { key: 'max_chute_diam_in', label: 'Max Chute Diam (in)', type: 'number', required: true, min: 1, step: 1 },
    { key: 'packed_height_in', label: 'Packed Height (in)', type: 'number', required: true, min: 0.1, step: 0.1 },
    { key: 'weight_g', label: 'Weight (g)', type: 'number', required: true, min: 1, step: 1 },
  ],
  quick_links: [
    { key: 'strength_lbs', label: 'Strength (lbs)', type: 'number', required: true, min: 1, step: 1 },
    { key: 'size_in', label: 'Size (in)', type: 'number', required: true, min: 0.01, step: 0.01 },
    { key: 'weight_g', label: 'Weight (g)', type: 'number', required: true, min: 1, step: 1 },
  ],
  swivel: [
    { key: 'rated_lbs', label: 'Rated Load (lbs)', type: 'number', required: true, min: 1, step: 1 },
    { key: 'size_in', label: 'Size (in)', type: 'number', required: true, min: 0.01, step: 0.01 },
    { key: 'weight_g', label: 'Weight (g)', type: 'number', required: true, min: 1, step: 1 },
    { key: 'packed_height_in', label: 'Packed Height (in)', type: 'number', required: true, min: 0.1, step: 0.1 },
  ],
  chute_device: [
    { key: 'weight_g', label: 'Weight (g)', type: 'number', required: true, min: 1, step: 1 },
    { key: 'deploy_alt_min_ft', label: 'Min Deploy Alt (ft)', type: 'number', required: false, min: 0, step: 1 },
    { key: 'deploy_alt_max_ft', label: 'Max Deploy Alt (ft)', type: 'number', required: false, min: 0, step: 1 },
  ],
}

export { CATEGORY_FIELD_SCHEMAS }

function CustomPartForm({ category, categoryLabel, onAdd, onEdit, onCancel, editingPart }) {
  const schema = CATEGORY_FIELD_SCHEMAS[category] || []
  const isEdit = !!editingPart

  const buildEmpty = () => {
    const obj = { name: '' }
    for (const f of schema) obj[f.key] = f.type === 'select' ? (f.required ? f.options[0] : '') : ''
    return obj
  }

  const buildFromPart = (part) => {
    const obj = { name: part.name }
    for (const f of schema) obj[f.key] = part.specs[f.key] != null ? String(part.specs[f.key]) : ''
    return obj
  }

  const [form, setForm] = useState(() => isEdit ? buildFromPart(editingPart) : buildEmpty())
  const [error, setError] = useState('')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    const specs = {}
    for (const f of schema) {
      if (f.type === 'select') {
        if (f.required && !form[f.key]) { setError(`${f.label} is required`); return }
        if (form[f.key]) specs[f.key] = form[f.key]
      } else {
        const v = parseFloat(form[f.key])
        if (f.required) {
          if (!isFinite(v) || v < (f.min ?? 0)) { setError(`${f.label} must be ≥ ${f.min ?? 0}`); return }
          if (f.max != null && v > f.max) { setError(`${f.label} must be ≤ ${f.max}`); return }
          specs[f.key] = v
        } else if (form[f.key] !== '') {
          if (!isFinite(v) || (f.min != null && v < f.min)) { setError(`${f.label} must be ≥ ${f.min}`); return }
          if (f.max != null && v > f.max) { setError(`${f.label} must be ≤ ${f.max}`); return }
          specs[f.key] = v
        }
      }
    }
    if (isEdit) {
      onEdit({ ...editingPart, name: form.name.trim(), specs })
    } else {
      onAdd({
        id: `custom-${crypto.randomUUID()}`,
        category,
        manufacturer: 'Custom',
        name: form.name.trim(),
        specs,
      })
    }
    setForm(buildEmpty())
    setError('')
  }

  const inputStyle = {
    width: '100%', height: '28px', padding: '0 6px',
    border: '1px solid var(--border-default)', borderRadius: 'var(--radius)',
    background: 'var(--input-bg)', color: 'var(--text-primary)',
    fontSize: '12px', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = { fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '3px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }
  const focusHandlers = {
    onFocus: e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-ring)' },
    onBlur: e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none' },
  }

  // Pair fields into rows of 2 for compact layout
  const rows = []
  for (let i = 0; i < schema.length; i += 2) {
    rows.push(schema.slice(i, i + 2))
  }

  return (
    <div style={{ margin: '8px 12px 12px', padding: '12px', background: 'var(--bg-panel)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {isEdit ? `Edit ${categoryLabel}` : `New Custom ${categoryLabel}`}
      </div>

      {/* Name */}
      <div style={{ marginBottom: '8px' }}>
        <label style={labelStyle}>Name</label>
        <input
          style={inputStyle}
          placeholder="e.g. My Custom Part"
          aria-label="Custom part name"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          {...focusHandlers}
        />
      </div>

      {/* Dynamic fields in 2-column grid */}
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: row.length === 1 ? '1fr' : '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
          {row.map(field => (
            <div key={field.key}>
              <label style={labelStyle}>{field.label}{!field.required && ' (opt)'}</label>
              {field.type === 'select' ? (
                <select
                  style={inputStyle}
                  value={form[field.key]}
                  onChange={e => set(field.key, e.target.value)}
                  aria-label={field.label}
                  {...focusHandlers}
                >
                  {field.options.map(opt => (
                    <option key={opt} value={opt}>{opt || '—'}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  min={field.min}
                  step={field.step}
                  style={inputStyle}
                  value={form[field.key]}
                  onChange={e => set(field.key, e.target.value)}
                  aria-label={field.label}
                  {...focusHandlers}
                />
              )}
            </div>
          ))}
        </div>
      ))}

      {error && (
        <div style={{ fontSize: '11px', color: 'var(--error-fg)', marginBottom: '8px' }}>{error}</div>
      )}

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
          {isEdit ? 'Save Changes' : 'Add Part'}
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

export default function PartsBrowser({ parts, categories, activeCategory, config, warnings, customParts = [], onSelectCategory, onSelectPart, onAddCustomPart, onDeleteCustomPart, onEditCustomPart }) {
  const [showForm, setShowForm] = useState(false)
  const [editingPart, setEditingPart] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Close the form, clear edit state, and clear search when switching categories
  useEffect(() => { setShowForm(false); setEditingPart(null); setSearchQuery('') }, [activeCategory])

  const activeCategoryLabel = categories.find(c => c.id === activeCategory)?.label || 'Part'

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

  const query = searchQuery.trim().toLowerCase()

  const { categoryCustomParts, byMfr, flatFiltered } = useMemo(() => {
    const categoryCustomParts = customParts.filter(p => p.category === activeCategory)
    const byMfr = {}
    const flatFiltered = []
    for (const p of parts) {
      if (p.category !== activeCategory) continue
      if (customIds.has(p.id)) continue
      if (query) {
        const match = p.name.toLowerCase().includes(query) || p.manufacturer.toLowerCase().includes(query)
        if (match) flatFiltered.push(p)
      } else {
        if (!byMfr[p.manufacturer]) byMfr[p.manufacturer] = []
        byMfr[p.manufacturer].push(p)
      }
    }
    // Also filter custom parts when searching
    const filteredCustom = query
      ? categoryCustomParts.filter(p => p.name.toLowerCase().includes(query) || (p.manufacturer || '').toLowerCase().includes(query))
      : categoryCustomParts
    return { categoryCustomParts: filteredCustom, byMfr, flatFiltered }
  }, [parts, activeCategory, customParts, customIds, query])

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
                  background: isActive ? 'var(--accent)' : 'var(--bg-panel)',
                  color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
                  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border-default)'}`,
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {cat.label}
                {selected && <CompatDot status={status} tooltip={tooltip} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Search input */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search parts..."
          aria-label="Search parts"
          className="parts-search-input"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="parts-search-clear"
            aria-label="Clear search"
          >&times;</button>
        )}
      </div>

      {/* Custom parts group + add/edit form (all categories) */}
      <>
        {categoryCustomParts.length > 0 && (
          <CustomGroup
            parts={categoryCustomParts}
            config={config}
            onSelectPart={onSelectPart}
            onDelete={onDeleteCustomPart}
            onEdit={(part) => { setEditingPart(part); setShowForm(true) }}
          />
        )}

        {!showForm ? (
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <button
              className="parts-add-custom"
              onClick={() => { setEditingPart(null); setShowForm(true) }}
            >
              + Add Custom Part
            </button>
          </div>
        ) : (
          <CustomPartForm
            key={editingPart?.id ?? 'new'}
            category={activeCategory}
            categoryLabel={activeCategoryLabel}
            editingPart={editingPart}
            onAdd={(part) => { onAddCustomPart(part); setShowForm(false); setEditingPart(null) }}
            onEdit={(part) => { onEditCustomPart(part); setShowForm(false); setEditingPart(null) }}
            onCancel={() => { setShowForm(false); setEditingPart(null) }}
          />
        )}
      </>

      {/* Catalog parts */}
      <div>
        {query ? (
          /* Search active: flat 2-column grid, no manufacturer grouping */
          flatFiltered.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '8px 12px' }}>
              {flatFiltered.map(part => {
                const isSelected = config[part.category]?.id === part.id
                return (
                  <button
                    key={part.id}
                    className="parts-card"
                    aria-pressed={isSelected}
                    onClick={() => onSelectPart(part)}
                    style={isSelected ? { background: 'var(--ok-bg)', borderColor: 'var(--ok-fg)' } : undefined}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 500, lineHeight: 1.3 }}>{part.name}</div>
                    <div className="mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      {partSpecLine(part)}
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '2px', fontStyle: 'italic' }}>
                      {part.manufacturer}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: '16px 12px', fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
              No parts match "{searchQuery}"
            </div>
          )
        ) : (
          /* Normal: collapsible manufacturer groups */
          Object.entries(byMfr).map(([mfr, mfrParts], i) => (
            <MfrGroup
              key={activeCategory + '-' + mfr}
              mfr={mfr}
              parts={mfrParts}
              config={config}
              onSelectPart={onSelectPart}
              defaultOpen={i === 0}
              hasSelected={mfrParts.some(p => config[p.category]?.id === p.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
