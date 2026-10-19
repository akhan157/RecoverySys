# OpenRocket import fixtures

`manifest.json` records source repositories, pinned revisions and SHA-256 hashes.
Upstream OpenRocket examples (including legacy formats) retain their upstream
attribution; the original example authors are recorded inside their files.
The Bryant file retains its original manifest source record.

The 25 `corpus-real-*` files were sourced from three public design/tool projects.
They retain their source licenses, copied under `licenses/`. The fixtures are
regression test inputs, not application catalog assets or validated rockets.
Twenty-three share the L2 rocket-platform lineage; do not interpret them as 25
independent rocket designs or observed users. One candidate without useful
reviewable configuration/geometry was excluded and recorded in the manifest.
The 2026-08-17 survey remains historical; `expandedCorpus` records the new work.

Run the parser suite from the application root:

```sh
npm test -- src/test/openRocketExchange.test.js
```

The suite verifies source hashes, supported format identity, reviewable stage /
configuration / geometry candidates and external-reference result posture.
Human review of mass ambiguity, corrections and user preference is still needed.
