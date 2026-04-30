import React from 'react'
import ConfigSlot from './ConfigSlot.jsx'
import RocketSpecs from './RocketSpecs.jsx'
import WarningBox from './WarningBox.jsx'
import SectionLabel from './primitives/SectionLabel.jsx'
import Button from './primitives/Button.jsx'
import { SAVE_STATES, SHARE_STATES } from '../lib/constants.js'

export default function ConfigBuilder({
  categories, config, specs, warnings,
  saveState, shareState,
  onRemovePart, onSetSpec, onSave, onShare, onSelectCategory,
  customMotor, onSetCustomMotor, onClearCustomMotor, onToast,
}) {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Recovery Configuration */}
      <div>
        <div className="section-label" style={{ marginBottom: '10px' }}>Recovery Configuration</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {categories.map(cat => (
            <div key={cat.id}>
              <SectionLabel style={{ marginBottom: '4px', letterSpacing: '0.04em' }}>
                {cat.label}
              </SectionLabel>
              <ConfigSlot
                category={cat.id}
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
      <RocketSpecs
        specs={specs}
        onSetSpec={onSetSpec}
        customMotor={customMotor}
        onSetCustomMotor={onSetCustomMotor}
        onClearCustomMotor={onClearCustomMotor}
        onToast={onToast}
      />

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '0 -16px' }} />

      {/* Actions */}
      <div>
        <div className="section-label" style={{ marginBottom: '10px' }}>Actions</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            onClick={onSave}
            loading={saveState === SAVE_STATES.SAVING}
          >
            {saveState === SAVE_STATES.SAVING ? 'Saving…' : saveState === SAVE_STATES.SAVED ? 'Saved ✓' : 'Save Config'}
          </Button>

          <Button variant="secondary" onClick={onShare}>
            {shareState === SHARE_STATES.COPIED ? 'Copied!' : 'Copy Share Link'}
          </Button>
        </div>
      </div>
    </div>
  )
}
