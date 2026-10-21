import { CATEGORIES } from '../../data/parts.js'
import ConfigBuilder from '../ConfigBuilder.jsx'
import ReviewReturnBar from '../analysis/ReviewReturnBar.jsx'
import { useReviewDestinationFocus } from '../../hooks/useReviewDestinationFocus.js'

// Review target path -> spec input element id. These are the canonical spec
// destinations authored in lib/analysisReview.js SLOT_DESTINATIONS.
const SPECS_TARGET_SELECTORS = Object.freeze({
  'specs.rocket_mass_g': '#mass',
  'specs.motor_total_impulse_ns': '#impulse',
  'specs.drag_cd': '#cd',
  'specs.main_deploy_alt_ft': '#deploy',
  'specs.wind_speed_mph': '#wind',
  'specs.burn_time_s': '#burn',
  'specs.airframe_id_in': '#airframe-id',
  'specs.bay_length_in': '#bay-length',
  'specs.bay_obstruction_vol_in3': '#bay-obstruction',
  'specs.ejection_g_factor': '#g-factor',
  'specs.wind_direction_deg': '#wind-dir',
  'specs.wind_surface_alt_ft': '#wind-surface-alt',
  'specs.wind_mid_speed_mph': '#wind-mid',
  'specs.wind_mid_direction_deg': '#wind-mid-dir',
  'specs.wind_mid_alt_ft': '#wind-mid-alt',
  'specs.wind_aloft_speed_mph': '#wind-aloft',
  'specs.wind_aloft_direction_deg': '#wind-aloft-dir',
  'specs.wind_aloft_alt_ft': '#wind-aloft-alt',
  'specs.launch_lat': '#launch-lat',
  'specs.launch_lon': '#launch-lon',
})

export default function SpecsTab({
  state,
  setSpec,
  removePart,
  setCategory,
  saveConfig,
  copyShareLink,
  setCustomMotor,
  clearCustomMotor,
  addToast,
  onNavigate,
  reviewOrigin = null,
  focusTarget = null,
  onFocusConsumed,
  onReturnToAnalysis,
}) {
  useReviewDestinationFocus({
    focusTarget,
    onConsumed: onFocusConsumed,
    resolve: (target) => {
      const selector = SPECS_TARGET_SELECTORS[target]
      const element = selector ? document.querySelector(selector) : null
      for (let ancestor = element?.parentElement; ancestor; ancestor = ancestor.parentElement) {
        if (ancestor.tagName === 'DETAILS') ancestor.open = true
      }
      return element
    },
  })

  return (
    <div className="mc-specs-panel">
      {reviewOrigin === 'ANALYSIS' && <ReviewReturnBar onReturn={onReturnToAnalysis} />}
      <h2 className="mc-panel-header">ROCKET_SPECS</h2>
      <div className="mc-specs-content">
        <ConfigBuilder
          categories={CATEGORIES}
          config={state.config}
          specs={state.specs}
          warnings={state.warnings}
          saveState={state.saveState}
          shareState={state.shareState}
          onRemovePart={removePart}
          onSetSpec={setSpec}
          onSave={saveConfig}
          onShare={copyShareLink}
          onSelectCategory={setCategory}
          customMotor={state.customMotor}
          onSetCustomMotor={setCustomMotor}
          onClearCustomMotor={clearCustomMotor}
          onToast={addToast}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  )
}
