# V1 field trial and remaining release evidence

Product purpose: help an experienced high-power rocketeer create a current,
reviewable, traceable recovery plan. Import review and budgeting support
that workflow; neither establishes physical fit or launch readiness.

Ask the user's rocketeer contacts to try their own vehicle in the published V1.
Target 10–15 observed workflows. Record anonymized participant ID, app/model/
catalog version, operating system, OpenRocket format, file hash (only with
permission), task, setup time with/without import, suggested fields accepted or
corrected, any mass or stage ambiguity, misleading packing assumptions,
price/stock usefulness, and whether they would use import for their next plan.
Do not upload source files or personal details automatically.

Use a simple sequence: create or import a plan; review stage/config and geometry;
select recovery parts; review packing-screen limitations; check unknown/stale
supplier data; run, edit and rerun; export/save and reopen; explain remaining
uncertainty to a peer. Observe without coaching first, then interview the user.

Record actual outcomes against the exchange design criteria: ≥90% useful
previews within supported versions; no unnoticed mass double-counting; ≥80%
field acceptance; ≥50% setup-time reduction or 3–5 minutes; ≥70% next-plan
preference. Public parser fixtures establish regression coverage only. Related
design revisions must not be counted as independent vehicles or user trials.

Before a release claim, record a Windows portable launch and hash on Windows,
a universal-build launch on a real Mac, and the supported Node/CI checks.
These require actual hosts or CI runs; local Linux tests cannot substitute.
Model changes (M7) and a Python-engine decision (M8) remain evidence-led tracks,
separate from commercial information and import work. Keep the
browser JavaScript engine authoritative unless a separate qualified decision
changes it.
