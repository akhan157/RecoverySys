# Parent catalog review — 2026-11-07

Reviewed author commit `e89099e6137e8d7e9ac75eee06bf5666af33b552`.
Author: OpenCode Go DeepSeek V4.1 Flash variant max. Parent: Codex gpt-6.1-sol.
No author self-acceptance. Accepted scope is a research/recommendation packet;
no production engineering field is changed or promoted as manufacturer-verified.

Parent ran the packet validator in the author tree and integrated tree (1,647
assertions, zero failures). The nine mutation tests passed in the author tree.
These are coverage/integrity checks, not proof of manufacturer accuracy.

Parent dispositions for the 35 historical proposal rows:

- 21 retain-current rounded equivalents (including the two earlier CFC-30-N
  rows). No new numeric values adopted.
- Three reject-substitution rows for IFC-36-SL: the SUL source describes a
  different variant, so its specifications must not overwrite the SL record.
- Three retain-current pending source-unit clarification rows (CFC-30-S in two
  categories, CFC-36-S). Author claims of a catalog-wide precision convention
  and measured ± uncertainty were not accepted. Parent corrected the reason
  text and flagged the older author summary. Their machine disposition remains
  an author recommendation; this parent record governs the pending status.
- Six prior IFC-30-SL identity holds remain holds. The author's label
  already-resolved means an earlier disposition exists, not that identity is
  established or the source question is closed.
- One CFC-18-N source conflict hold: its own page gives incompatible ounce/gram
  values; no replacement is justified.
- One IFC-96-S proposed mass correction awaits explicit human review action.

The parent independently consulted the manufacturer's indexed product page:
https://shop.fruitychutes.com/collections/iris-ultra-compact-chutes/products/iris-ultra-compact-parachute-96inch-50lbs-20fps-28lbs-15fps
It identifies IFC-96-S, 96-inch compact Spectra-line canopy, 4.9 x 4.8-inch
packing and mass 16.3 oz, consistent with the archived exact-family capture.
16.3 x 28.349523125 = 462.0972269375 g; a 462 g integer value is appropriate
for that source precision. Current catalog weight_g is 46. The named
`ifc-096-s-weight.patch` is an unapplied, reversible one-field proposal;
`git apply --check` passed against the current production file.

The local catalog contract explicitly says Require human approval and no
catalog update without an explicit review action. The owner authorized this
review and the prior push; no field-specific approval of the newly discovered
mass correction is recorded. Production application and archived rc.2 downloads
remain unchanged pending that decision. No physics or threshold rework is
needed for this proposed correction; hardware mass is informational and does
not automatically change the user-entered simulation mass.

Raw source captures remain outside git at
`../RecoverySys-artifacts/catalog-review-2026-11-07/` relative to repo root.
Reader-proxy captures carry target-error warnings and are not direct HTTP-200
captures. Hashes establish their bytes, not live freshness or source correctness.
The validator currently checks the original parts-file input hash. After any
approved catalog change it should be run against its pinned historical input;
do not relax that provenance check merely to pass against new catalog bytes.

Remaining: explicit mass decision; source/unit and variant holds; optional
36-inch Light naming/mapping review; actual manual platform/user workflows;
draft release publication and stable qualification. Historical gate register
stays open. Accuracy research remains deferred by owner, not marked passed.
