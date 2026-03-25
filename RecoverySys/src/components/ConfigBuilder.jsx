import React from 'react'
import ConfigSlot from './ConfigSlot.jsx'
import RocketSpecs from './RocketSpecs.jsx'
import WarningBox from './WarningBox.jsx'

export default function ConfigBuilder({
  categories, config, specs, warnings,
  saveState, shareState,
  onRemovePart, onSetSpec, onSave, onShare, onSelectCategory,
}) {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Recovery Configuration */}
      <div>
        <div className="section-label" style={{ marginBottom: '10px' }}>Recovery Configuration</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {categories.map(cat => (
            <div key={cat.id}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {cat.label}
              </div>
              <ConfigSlot
                category={cat.id}
                label={cat.label}
                placeholder={cat.placeholder}
                part={config[cat.id]}
                warnings={warnings}
                onRemove={onRemovePart}
                onClickEmpty={() => onSelectCategory(cat.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Compatibility warnings */}
      {warnings.length > 0 && (
        <WarningBox warnings={warnings} />
      )}

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '0 -16px' }} />

      {/* Rocket Specs */}
      <RocketSpecs specs={specs} onSetSpec={onSetSpec} />

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '0 -16px' }} />

      {/* Actions */}
      <div>
        <div className="section-label" style={{ marginBottom: '10px' }}>Actions</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={onSave}
            disabled={saveState === 'saving'}
            style={{
              height: '32px',
              padding: '0 16px',
              background: 'var(--cta-bg)',
              color: 'var(--cta-fg)',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: saveState === 'saving' ? 'default' : 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              opacity: saveState === 'saving' ? 0.7 : 1,
              transition: 'transform 150ms ease, opacity 150ms ease',
            }}
            onMouseEnter={e => { if (saveState !== 'saving') { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.opacity = '0.9' } }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.opacity = '' }}
            onMouseDown={e => { if (saveState !== 'saving') e.currentTarget.style.transform = 'translateY(0)' }}
          >
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : 'Save Config'}
          </button>

          <button
            onClick={onShare}
            style={{
              height: '32px',
              padding: '0 16px',
              background: 'transparent',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'transform 150ms ease, border-color 200ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--border-default)' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'translateY(0)' }}
          >
            {shareState === 'copied' ? 'Copied!' : 'Copy Share Link'}
          </button>
        </div>
      </div>
    </div>
  )
}
