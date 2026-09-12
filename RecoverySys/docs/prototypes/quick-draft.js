import { PARTS, EMPTY_CONFIG } from '../../src/data/parts.js'
import { computeDescentRate } from '../../src/lib/simulation.js'
import { computePackingVolume } from '../../src/lib/compatibility.js'

const KEY = 'recoverysys-prototype-quick-draft-v1'
const catalog = PARTS.filter((p) => p.category === 'main_chute')
const byId = new Map(catalog.map((p) => [p.id, p]))
const $ = (id) => document.getElementById(id)
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  )
const positive = (value) =>
  value !== '' && Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null
let state = { selected: null, mass: '', origin: 'estimated', target: '', diameter: '', length: '' }
let previous = null
let baseline = null
try {
  const stored = JSON.parse(localStorage.getItem(KEY) || 'null')
  if (stored && typeof stored === 'object') {
    for (const key of ['mass', 'target', 'diameter', 'length'])
      if (typeof stored[key] === 'string') state[key] = stored[key]
    if (byId.has(stored.selected)) state.selected = stored.selected
    if (['estimated', 'measured', 'unknown'].includes(stored.origin)) state.origin = stored.origin
  }
} catch {
  $('save-state').textContent = 'Could not restore prototype storage'
}
for (const key of ['mass', 'origin', 'target', 'diameter', 'length']) $(key).value = state[key]

function estimate(part = byId.get(state.selected)) {
  const base = positive(state.mass)
  const weight = part?.specs.weight_g
  if (
    !part ||
    !base ||
    !Number.isFinite(weight) ||
    weight < 0 ||
    !positive(part.specs.cd) ||
    !positive(part.specs.diameter_in)
  )
    return null
  const total = base + weight / 1000
  const fps = computeDescentRate(part.specs, total, 0)
  return Number.isFinite(fps) && fps > 0 ? { fps, total } : null
}
function fingerprint() {
  return JSON.stringify(state)
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    $('save-state').textContent = 'Draft saved locally · prototype only'
  } catch {
    $('save-state').textContent = 'Not saved: storage unavailable. Export your draft.'
  }
}
function announce(message) {
  $('announcement').textContent = message
}
function renderCatalog() {
  const query = $('search').value.trim().toLowerCase()
  const order = $('sort').value
  const target = positive(state.target)
  let parts = catalog.filter((p) =>
    `${p.name} ${p.manufacturer} ${p.specs.diameter_in}`.toLowerCase().includes(query)
  )
  if (order === 'size') parts.sort((a, b) => a.specs.diameter_in - b.specs.diameter_in)
  if (order === 'rate' && target && positive(state.mass)) {
    const distances = new Map(
      parts.map((part) => {
        const result = estimate(part)
        return [part.id, result ? Math.abs(result.fps - target) : Infinity]
      })
    )
    parts.sort((a, b) => distances.get(a.id) - distances.get(b.id))
  }
  $('sort-note').textContent =
    order === 'rate'
      ? target && positive(state.mass)
        ? 'Rate ranking only, not a fit or suitability recommendation.'
        : 'Enter positive mass and target to rank by rate. Showing catalog order.'
      : ''
  $('count').textContent = `${parts.length} of ${catalog.length} catalog chutes · data unverified`
  const scroll = $('parts').scrollTop
  const focused = document.activeElement?.dataset?.pick
  $('parts').innerHTML =
    parts
      .map((p) => {
        const selected = p.id === state.selected
        const result = estimate(p)
        return `<article class="part ${selected ? 'selected' : ''}" data-part="${escape(p.id)}"><strong>${escape(p.name)}</strong><p class="muted">${escape(p.manufacturer)} · ${p.specs.diameter_in} in canopy · Cd ${p.specs.cd} · ${p.specs.weight_g ?? 'Unknown'} g</p><div class="row-actions"><span>${result ? `${result.fps.toFixed(1)} ft/s estimate` : 'Add mass for estimate'}</span><button data-pick="${escape(p.id)}" aria-pressed="${selected}">${selected ? 'Selected' : state.selected ? 'Use instead' : 'Add to draft'}</button></div></article>`
      })
      .join('') || '<p>No matching chutes. Change or clear your search.</p>'
  $('parts').scrollTop = scroll
  if (focused)
    [...$('parts').querySelectorAll('button')]
      .find((b) => b.dataset.pick === focused)
      ?.focus({ preventScroll: true })
}
function renderDraft() {
  const part = byId.get(state.selected)
  $('selection').classList.toggle('empty', !part)
  $('selection').innerHTML = part
    ? `<p class="label">Selected main chute · one recovery group</p><h3>${escape(part.name)}</h3><p>${escape(part.manufacturer)}</p><p class="muted">${part.specs.weight_g ?? 'Unknown'} g · ${part.specs.diameter_in} in canopy · Cd ${part.specs.cd}</p><p class="muted">Packed diameter: ${part.specs.packed_diam_in ?? 'unknown'} in · packed length: ${part.specs.packed_length_in ?? 'unknown'} in</p><p class="muted">Catalog data unverified. Stored dimensions are not proof of physical fit.</p><button id="remove">Remove chute</button>`
    : '<h3>Start with a chute.</h3><p>Select any candidate from the catalog. You do not need mass or bay dimensions to start a draft.</p><p class="muted">No hardware selected. No recovery outcome assessed.</p>'
  $('remove')?.addEventListener('click', () => choose(null))
  $('undo').disabled = !previous
}
function renderFeedback() {
  const part = byId.get(state.selected)
  const result = estimate()
  const target = positive(state.target)
  let descent = result
    ? `<div class="value">${result.fps.toFixed(1)} <span>ft/s</span></div><p class="muted">At sea-level standard density · ${result.total.toFixed(3)} kg including this chute.</p><p class="muted">Base mass source: ${escape(state.origin)}; chute mass/Cd: unverified catalog.</p>`
    : `<p>${!part ? 'Select a main chute to begin.' : !positive(state.mass) ? 'Enter a positive recovery mass to estimate descent.' : 'This part lacks usable mass, diameter or Cd data.'}</p>`
  if (state.target && !target)
    descent += '<p class="notice bad">Target must be a positive number.</p>'
  else if (result && target)
    descent += `<p class="notice ${result.fps > target ? 'warning' : 'neutral'}">${result.fps > target ? 'Above' : 'At or below'} your ${target} ft/s target. This is not a safety verdict.</p>`
  let packing = '<p>Enter positive inner diameter and available length for packing screening.</p>'
  const diameter = positive(state.diameter),
    length = positive(state.length)
  if (!part) packing = '<p>Select a chute before checking its allocated space.</p>'
  else if (diameter && length) {
    if (!positive(part.specs.packed_diam_in) || !positive(part.specs.packed_length_in))
      packing =
        '<p class="notice">Packing dimensions missing from this catalog item. Fit is unknown.</p>'
    else {
      const p = computePackingVolume({
        config: { ...EMPTY_CONFIG, main_chute: part },
        specs: { airframe_id_in: String(diameter), bay_length_in: String(length) },
      })
      const radial =
        p.radial_ratio > 1
          ? 'Packed diameter exceeds the bay ID.'
          : p.jamming_risk
            ? 'Tight radial clearance: inspect packing and extraction.'
            : 'Packed diameter is below the bay ID; extraction still unverified.'
      packing = `<p class="notice ${p.radial_ratio > 1 || p.fraction > 1 ? 'bad' : p.jamming_risk ? 'warning' : 'neutral'}">${radial}</p><p><b>${(p.fraction * 100).toFixed(0)}%</b> of modeled effective space used by this chute.</p><p class="muted">${p.fraction > 1 ? 'Exceeds the model’s effective space allowance.' : 'Within the model’s space allowance, not proof of deployability.'} Uses 70% effective volume. Other hardware is excluded.</p>`
    }
  }
  $('results').innerHTML =
    `<div class="metric"><div class="label">Current terminal descent estimate</div>${descent}</div><div class="metric"><h3>Packing screening</h3>${packing}</div>`
  $('capture').disabled = !result
  $('comparison').innerHTML = !baseline
    ? '<p class="muted">Keep an estimate, then swap a part to compare. This is a session-only baseline, not a flight simulation.</p>'
    : `<h3>Previous estimate</h3><p>${escape(baseline.name)} · ${baseline.fps.toFixed(1)} ft/s · ${baseline.total.toFixed(3)} kg</p><p class="notice ${baseline.key !== fingerprint() ? 'warning' : 'neutral'}">${baseline.key !== fingerprint() ? 'Draft changed. This baseline belongs to earlier inputs; it has not been overwritten.' : 'Baseline matches current draft inputs.'}</p>${result ? `<p>Current minus baseline: <b>${(result.fps - baseline.fps).toFixed(1)} ft/s</b></p>` : '<p>Current estimate unavailable until required inputs are valid.</p>'}<button id="clear-baseline">Clear baseline</button>`
  $('clear-baseline')?.addEventListener('click', () => {
    baseline = null
    renderFeedback()
  })
}
function choose(id) {
  if (id === state.selected) return
  previous = { selected: state.selected }
  state.selected = id
  persist()
  renderDraft()
  renderFeedback()
  renderCatalog()
  announce(
    id
      ? `${byId.get(id).name} selected. Quick estimates updated; inspect assumptions and packing.`
      : 'Chute removed. Estimates unavailable.'
  )
}
$('parts').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-pick]')
  if (b) choose(b.dataset.pick)
})
$('search').addEventListener('input', renderCatalog)
$('sort').addEventListener('change', renderCatalog)
for (const key of ['mass', 'origin', 'target', 'diameter', 'length'])
  $(key).addEventListener(key === 'origin' ? 'change' : 'input', () => {
    state[key] = $(key).value
    persist()
    renderFeedback()
    renderCatalog()
  })
$('undo').addEventListener('click', () => {
  if (!previous) return
  state.selected = previous.selected
  previous = null
  persist()
  renderDraft()
  renderFeedback()
  renderCatalog()
  announce('Previous chute selection restored. Input edits retained.')
})
$('capture').addEventListener('click', () => {
  const result = estimate()
  if (!result) return
  baseline = { ...result, key: fingerprint(), name: byId.get(state.selected).name }
  renderFeedback()
  announce('Estimate kept for this session. Swap a chute to compare.')
})
$('export').addEventListener('click', () => {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          type: 'recoverysys-quick-draft-prototype',
          version: 1,
          ...state,
          component: byId.get(state.selected) ?? null,
          scope:
            'Main-chute exploration only; not compatible with production configuration import.',
        },
        null,
        2
      ),
    ],
    { type: 'application/json' }
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'recoverysys-quick-draft.json'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  announce('Prototype draft export requested. This is not a production configuration file.')
})
renderDraft()
renderFeedback()
renderCatalog()
