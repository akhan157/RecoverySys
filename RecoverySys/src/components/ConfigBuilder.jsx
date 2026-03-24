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
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Recovery Configuration */}
      <div>
        <div className="section-label" style={{ marginBottom: '8px' }}>Recovery Configuration</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {categories.map(cat => (
            <div key={cat.id}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '3px' }}>
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
        <div className="section-label" style={{ marginBottom: '8px' }}>Actions</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={onSave}
            disabled={saveState === 'saving'}
            style={{
              height: '32px',
              padding: '0 14px',
              background: 'var(--cta-bg)',
              color: 'var(--cta-fg)',
              border: 'none',
              borderRadius: '4px',
              cursor: saveState === 'saving' ? 'default' : 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              opacity: saveState === 'saving' ? 0.7 : 1,
            }}
          >
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : 'Save Config'}
          </button>

          <button
            onClick={onShare}
            style={{
              height: '32px',
              padding: '0 14px',
              background: 'transparent',
              color: 'var(--text-primary)',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {shareState === 'copied' ? 'Copied!' : 'Copy Share Link'}
          </button>
        </div>
      </div>
    </div>
  )
}
