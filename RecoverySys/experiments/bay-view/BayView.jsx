import { lazy, Suspense, useMemo, useState } from 'react'
import { buildBayGeometry } from './bayGeometry.js'
import './BayView.css'

const BayView3D = lazy(() => import('./BayView3D.jsx'))

export default function BayView({ config, specs, activeCategory, onSelectCategory }) {
  const [mode, setMode] = useState('2D')
  const geometry = useMemo(
    () => buildBayGeometry(config, specs, activeCategory),
    [config, specs, activeCategory]
  )
  const { diameter, length, parts, extent, reference } = geometry
  const scale = 265 / extent
  const center = 170 - (geometry.separation * scale) / 2
  const referenceCenter = 170 + (geometry.separation * scale) / 2
  return (
    <section className="bay-view" aria-label="Recovery bay dimensional view">
      <div className="bay-view__toolbar">
        <strong>RECOVERY BAY</strong>
        <div role="group" aria-label="Bay view mode">
          {['2D', '3D'].map((view) => (
            <button
              key={view}
              type="button"
              aria-pressed={mode === view}
              onClick={() => setMode(view)}
            >
              {view}
            </button>
          ))}
        </div>
      </div>
      <p className="bay-view__note">
        Individual size references · inches · no packing arrangement predicted.
      </p>
      {!diameter || !length ? (
        <p role="status">Enter airframe inner diameter and bay length in Specs to show the bay.</p>
      ) : mode === '3D' ? (
        <Suspense fallback={<p role="status">Loading 3D view…</p>}>
          <BayView3D
            geometry={geometry}
            activeCategory={activeCategory}
            onSelectCategory={onSelectCategory}
          />
        </Suspense>
      ) : (
        <svg
          className="bay-view__drawing"
          viewBox="0 0 340 330"
          role="img"
          aria-label={`To-scale empty bay reference, ${diameter} inches inner diameter by ${length} inches long`}
        >
          <defs>
            <pattern id="bay-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" opacity=".12" />
            </pattern>
          </defs>
          <rect width="340" height="330" fill="url(#bay-grid)" />
          <rect
            data-empty-bay="true"
            x={center - (diameter * scale) / 2}
            y={295 - length * scale}
            width={diameter * scale}
            height={length * scale}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          {reference && (
            <g>
              <rect
                data-part-reference="true"
                x={referenceCenter - (reference.width * scale) / 2}
                y={295 - reference.length * scale}
                width={reference.width * scale}
                height={reference.length * scale}
                fill={reference.color}
                fillOpacity=".12"
                stroke={reference.color}
                strokeWidth="2"
                strokeDasharray={reference.rigid ? undefined : '5 4'}
              >
                <title>
                  {reference.name}:{' '}
                  {reference.rigid
                    ? 'Rigid bounding box; exact shape unknown'
                    : 'Flexible packed-size reference; actual packing varies'}
                </title>
              </rect>
              {reference.range && (
                <rect
                  x={referenceCenter - (reference.range.widthMin * scale) / 2}
                  y={295 - reference.range.lengthMin * scale}
                  width={reference.range.widthMin * scale}
                  height={reference.range.lengthMin * scale}
                  fill="none"
                  stroke={reference.color}
                  strokeDasharray="2 4"
                />
              )}
            </g>
          )}
          <text x="12" y="18" fill="currentColor" fontSize="11">
            EMPTY BAY + SELECTED PART · SAME SCALE
          </text>
          <text x="12" y="318" fill="currentColor" fontSize="12">
            ID {diameter} in × L {length} in
          </text>
        </svg>
      )}
      <p className="bay-view__warning">
        Physical fit is unknown. Parts are shown separately from the empty bay. No combined space or
        remaining capacity is calculated by this view.
      </p>
      {geometry.selected && !reference && (
        <p role="status">
          {geometry.selected.name}: shape dimensions unavailable.{' '}
          {geometry.selected.rigid
            ? 'Rigid hardware needs body length, width and depth; stock size is insufficient.'
            : 'A packed-size reference or complete recorded range is needed.'}
        </p>
      )}
      {geometry.selected?.invalidRange && (
        <p role="status">Packed range is incomplete or reversed; it is not drawn as a range.</p>
      )}
      {reference && (
        <p className="bay-view__note">
          {reference.rigid
            ? 'Rigid bounding box only; holes, bends and connection clearance are unknown.'
            : reference.range
              ? 'Dashed bounds combine recorded dimension extremes; they are not specific tested arrangements, a probability interval or a compression limit.'
              : 'Dashed nominal size only. Packing variation has not been measured; no compression allowance is assumed.'}
        </p>
      )}
      {parts.length === 0 && <p>Select a part to inspect its size reference.</p>}
      <ul className="bay-view__legend">
        {parts.map((part) => (
          <li key={part.category}>
            <button
              type="button"
              aria-pressed={activeCategory === part.category}
              onClick={() => onSelectCategory(part.category)}
            >
              <span aria-hidden="true" style={{ background: part.color }} />
              <span>
                {part.name}
                <small>
                  {part.rigid ? 'Rigid hardware' : 'Flexible item'} ·{' '}
                  {part.range
                    ? `${part.range.widthMin}–${part.range.widthMax} in Ø × ${part.range.lengthMin}–${part.range.lengthMax} in L (recorded range)`
                    : part.complete
                      ? `${part.width} in W × ${part.length} in L${part.rigid ? ` × ${part.depth} in D (bounding box)` : ' (nominal packed size)'}`
                      : `Not drawn — missing ${part.missing.join(' and ')}`}{' '}
                  · {part.provenance}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="bay-view__note">
        Folding, voids, rigid shapes, wrapping, nesting and cord routing change actual occupied
        space. Record a physical packing trial for the complete assembly; catalog dimensions cannot
        establish fit.
      </p>
    </section>
  )
}
