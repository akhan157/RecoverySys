import ConfigSlot from './ConfigSlot.jsx'
import RocketSpecs from './RocketSpecs.jsx'
import WarningBox from './WarningBox.jsx'
import SectionLabel from './primitives/SectionLabel.jsx'
import Button from './primitives/Button.jsx'
import { SAVE_STATES, SHARE_STATES } from '../lib/constants.js'

export default function ConfigBuilder({
  categories,
  config,
  specs,
  warnings,
  saveState,
  shareState,
  onRemovePart,
  onSetSpec,
  onSave,
  onShare,
  onSelectCategory,
  customMotor,
  onSetCustomMotor,
  onClearCustomMotor,
  onToast,
  onNavigate,
}) {
  return (
    <div className="specs-builder">
      {warnings.length > 0 && (
        <details className="specs-builder__disclosure specs-builder__warnings">
          <summary>
            {warnings.length} compatibility finding{warnings.length === 1 ? '' : 's'}
            <span>
              {
                warnings.filter((warning) => warning.level === 'error' || warning.state === 'error')
                  .length
              }{' '}
              errors
            </span>
          </summary>
          <WarningBox warnings={warnings} onNavigate={onNavigate} />
        </details>
      )}
      <RocketSpecs
        specs={specs}
        onSetSpec={onSetSpec}
        customMotor={customMotor}
        onSetCustomMotor={onSetCustomMotor}
        onClearCustomMotor={onClearCustomMotor}
        onToast={onToast}
      />

      <div className="specs-builder__actions">
        <div className="section-label" style={{ marginBottom: '10px' }}>
          Actions
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={onSave} loading={saveState === SAVE_STATES.SAVING}>
            {saveState === SAVE_STATES.SAVING
              ? 'Saving…'
              : saveState === SAVE_STATES.SAVED
                ? 'Saved ✓'
                : 'Save Config'}
          </Button>

          <Button variant="secondary" onClick={onShare}>
            {shareState === SHARE_STATES.COPIED ? 'Copied!' : 'Copy Share Link'}
          </Button>
        </div>
      </div>
      <details className="specs-builder__disclosure">
        <summary>
          Selected hardware
          <span>
            {categories.filter((category) => config[category.id]).length} / {categories.length}{' '}
            selected
          </span>
        </summary>
        <div>
          <div className="section-label" style={{ marginBottom: '10px' }}>
            Recovery Configuration
          </div>
          <div className="specs-builder__hardware-grid">
            {categories.map((cat) => (
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
      </details>
    </div>
  )
}
