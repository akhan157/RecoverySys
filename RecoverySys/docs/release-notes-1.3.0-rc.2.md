# RecoverySys 1.3.0-rc.2 — qualification candidate

Working candidate prepared 2026-11-05. Publication and platform hashes must be
recorded after remote builds; this document is not a stable-release declaration.

Links and swivels now receive compatibility findings for the same snatch loads
shown in the load-path view; the swivel also receives opening-shock findings.
For example, a 400 lb swivel at a 0.88× main-snatch margin now raises an error.
These are new warnings for existing plans, using existing screening thresholds
and unchanged physics. Unknown ratings remain not evaluated.

Compatibility findings are now derived synchronously from current inputs. A
300 ms debounce could previously let a fast run/export omit warnings.

Both print modes include model/input identity, result currentness, evidence
posture and unresolved mission-envelope checks. Config JSON/share/save/reload
transfer inputs; receivers must rerun simulation before showing current
estimates. Flight/candidate evidence preserves its original prediction identity
and remains unreviewed evidence rather than accepted corpus material.

Transient notifications stay visible on screen and are excluded from both
printed artifacts.

The supported development majors are Node 22, 24 and 26, with a matching CI
matrix. OpenRocket XML structure is traversed once and test concurrency is
bounded. Release versions are checked across package/web/Tauri/Cargo identities.
The fast-uri dependency is patched; the dated audit reports zero advisories.

The corpus contains 21 review-only cases. Seven new atmosphere, descent,
ascent, wind and seeded-dispersion cases add comparison/invariant coverage;
they do not establish flight accuracy. Primary manufacturer/source research is
recorded, with six catalog source records and fourteen proposed differences
kept separate from production engineering values. The bulk manufacturer feed was rate-limited during research.

Windows/macOS manual workflows, 10–15 observed rocketeer trials, independent
comparison acceptance and full per-part source decisions remain open. The
browser JavaScript model remains authoritative and the Python engine remains
research-only. See [release gates](release-gates-1.3.0.md) and
[qualification](release-qualification-2026-11-05.md).
