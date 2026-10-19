# Deferred 2D/3D size-view experiment

**Status — 2026-10-19:** removed from the V1 dashboard after user review.
The empty-bay/size-reference comparison offered too little practical value.
Source and experimental tests are archived in `experiments/bay-view/` (outside the active test suite) for reconsideration; the prototype and
its measurement-entry fields are not exposed in the application, and Three.js
is not loaded by the production UI. A future attempt needs a demonstrated user
task, reliable geometry/packing data and an interactive prototype review before
production integration.

The deferred prototype shows an empty bay beside one selected part reference. It does
not automatically arrange parts inside the bay, add their lengths or volumes,
predict remaining capacity, or determine physical fit. Both views use the same
inch-based scale. The 3D view supports orbit, zoom, pan and reset; the part list
provides keyboard selection. WebGL failure leaves the 2D view usable.

Rigid categories (links, swivels and chute-mounted devices) require explicit
`body_length_in`, `body_width_in`, and `body_depth_in`. They are drawn as bounding
boxes, never flexible cylinders. Stock diameter is not body geometry. Holes,
bends, fastening access and connection clearances remain unknown; a box does
not reconstruct the actual hardware shape.

Flexible categories may show a dashed nominal packed-size reference from
`packed_diam_in` and `packed_length_in`/`packed_height_in`. This does not establish
occupied space. No compression percentage or packing variation is invented.
Optional `packed_diam_min_in`, `packed_diam_max_in`, `packed_length_min_in`, and
`packed_length_max_in` record user-supplied dimension ranges. All four must be
positive and ordered to render a range. Independent dimension extremes are not
specific tested arrangements or probability intervals. These experimental entry fields are hidden; existing custom-part data and
transfer preserve recorded values.

Missing dimensions remain explicit. No flat protector size, deployed chute
size or cord width is substituted for a packed dimension. Wrapping, containment,
folding, voids, nesting, cord routing and deployment clearance require actual
assembly information. A complete physical packing trial remains necessary.

The older nominal-height compatibility screen retains its numeric model and
thresholds. Its wording now identifies the fixed 70% allowance as an assumption,
not measured efficiency, and avoids claiming that it predicts closure. The
dashboard shows actual occupied space as unknown instead of a fill gauge.

A future assembly workspace needs sourced rigid geometry, measured packing
states, wrapping/containment relationships, user positioning/orientation, and
physical-trial evidence. This implementation does not claim that solver exists.

Use [packing-trial-template.md](packing-trial-template.md) to record correlated
packing states, wrapping/containment and the complete physical assembly.
