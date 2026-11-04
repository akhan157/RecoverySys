# Recovery-chain lanes — orchestrator review (2026-11-04)

Reviewer: `claude-opus-5-5` (different family from the DeepSeek author).

## recovery-mass-rollup

- Finding (consumer coverage): the new warning used slot `recovery_mass`,
  which Analysis, causality labels and the brief's unresolved-check path did
  not know. Analysis showed a raw slot name; the brief linked to the
  non-existent `config.recovery_mass`. Fixed in `d507910`; regression test
  covers each consumer and fails on the author version.
- Finding: warning message printed raw float totals. Rounded in `d507910`.
- Finding (UI): odd-count fact grids left an empty bordered cell at phone
  width. Fixed in `414a0ee`, verified in Chromium at 375 px.

## deployment-sequence

- Finding (correctness): with no burn time the simulation estimates apogee
  heuristically and leaves `apogee_t_s` at a 0 placeholder. The sequence showed
  apogee at 0 s and deploy/landing elapsed times short by the whole ascent.
  Fixed in `b2f519e`: elapsed times withheld, `time_after_apogee_s` shown as
  "Apogee + N s"; regression assertions fail on the author version.
- Polish `d5772fd`: untimed apogee label, conditional liftoff-time note.
- Noted, not changed: single-deploy plans are modeled with a 100 ft/s
  stand-in until the main deploy altitude, unlike a typical apogee main
  deployment. Disclosed in the sequence limitations; physics unchanged.

## load-path-margins

- Finding (consistency): every margin used STRENGTH_MARGIN (warn < 1.5x),
  while `rule_openingShock` uses OPENING_SHOCK_RATIO (warn when force/rating >
  0.7, i.e. margin < 1.43x). Margins in 1.43–1.5x read "marginal" in the view
  with no warning. Fixed in `f91cfc8`; parity tests fail on the author version.
- Refactor checked: `buildCompatibilityContext`, `computeEjectionSnatchLoad`
  and `computeOpeningShockForContext` reproduce the prior rule guards exactly.

## Open owner decision

The view shows checks no rule makes today: links and swivel against the
elongation-amplified snatch and main snatch proxy, and the swivel against
opening shock. Author fixture (2.5 kg, dual deploy, 400 lb swivel): swivel at
0.88x the main snatch proxy, with no warning raised. Options: (a) keep
view-only; (b) add series-chain rules (changes warning output for existing
plans). Recommendation: (b) in its own lane, after the owner accepts the
warning-output change.
