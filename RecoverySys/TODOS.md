# RecoverySys outstanding work

Updated 2026-10-19. The authoritative current gate list is `docs/next-steps.md`.

- Qualify the release candidate through remote CI and actual Windows/macOS workflows.
- Observe 10–15 rocketeer workflows; collect independent review and real-flight evidence.
- Review physics assumptions against independent references before changing model authority. The current linear-elastic snatch screen already exists; the historical proposal to merely replace a static formula is superseded. Damping, actual cord properties and deployment transients require evidence.
- Review staged manufacturer engineering differences, source units and packing assumptions. Commercial refreshes cannot apply them.
- Expand exact supplier mappings; preserve unknown data for ambiguous variants.
- Consider a catalog editor after the source-review workflow has been exercised.
- Keep Python-engine work and 2D/3D visualization deferred pending a justified use case and qualification plan.

Historical notes are archived in `docs/history/todos-2026-07-17.md`.

Cosmetic follow-up: the initial loading skeleton retains the legacy `RECOVERYSYS_V1.2` brand and the landing page retains its historical build marker. Loaded application and packaged version fields report the candidate version correctly.
