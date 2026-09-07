## SECTION 1 — Deep Audit of Current Interface

Ground truth: `RecoverySys/src/components/MissionControlLayout.{jsx,css}`, `tabs/*.jsx`, `FlightChart.jsx`, `DispersionMap.jsx`, `primitives/StatusChip.jsx`, `MetricCard.jsx`, `index.css:6-94`. Live theme is MC dark-only (`--mc-*` in `MissionControlLayout.css:4-67` remaps all `--bg-*/--text-*` tokens); `DESIGN.md` Slate light/dark tokens are dead spec inside `.mc`. Base font is JetBrains Mono everywhere (`MissionControlLayout.css:58`).

### 1.1 Global IA / shell

1. **8 equal-weight tabs, zero task flow.** `TABS` in `MissionControlLayout.jsx:19-28`: DASHBOARD SPECS SIMULATION ANALYSIS DISPERSION COMPARE FLIGHT_LOG EXPORT. Active = thin underline (`mc-header__tab--active`). Evidence: COMPARE empty state is a centered island in 75% void; user cannot predict A-vs-B structure. Fix: 4-stage primary flow `CONFIGURE → SIMULATE → ANALYZE → SHARE` + secondary `COMPARE / LOG` in overflow. Active tab: 2px top bar + 12% surface lift, not underline.
2. **Three competing headers.** Demo banner + `mc-header` nav + per-tab `mc-panel-header` (`PARTS_CATALOG // ...`, `DISPERSION_MAP // LANDING_PREDICTION` duplicated as H2 + sub-H2). Fix: single breadcrumb rail `MISSION / <TAB> / REF_ID: STR-SIM-3879`. Delete `//` echo headers.
3. **Header actions fight.** `★ GUIDED_REVIEW` amber ghost + demo `START_FRESH` + tab row all same luminance. `GUIDED_REVIEW` is a mode, not a tab — move to `?` icon-button right rail. Free ~180px header width.
4. **No persistent system status.** `resultFresh`, `hasErrors`, `filledSlots` computed (`MissionControlLayout.jsx:64-80`) but only rendered inside each tab's `ConfidenceStatus`. Stale sim looks identical until you open SIMULATION. Fix: sticky status strip under header: `● FRESH/STALE · 0 ERR 3 WARN · 5/8 BAYS · APOGEE 9,701 FT`. 28px, mono 10px.
5. **Keyboard/a11y gap.** `role=tablist` with `tabIndex={-1}` roving (`MissionControlLayout.jsx:124`) but no arrow-key handler — violates APG tabs pattern. No skip-link to `#mc-main`. Fix: add `onKeyDown` Left/Right/Home/End; add skip link.
6. **Print path is hidden state.** `printMode` + `window.print()` timeout (`:56-63`) with `.print-checklist{display:none}` — untestable, breaks if print dialog cancels. Keep, but extract to explicit route, not timeout hack.

### 1.2 Contrast (measured against live `--mc-*`, not DESIGN.md)

| Pair | Ratio | Verdict |
|---|---|---|
| `--mc-text-dim #888` on `#111` | ~5.9:1 | AA pass, but used at 9–10px caps → fails field-glare legibility |
| `--mc-text-faint #555` on `#111` (`--text-tertiary` remap) | ~2.8:1 | **FAIL.** Used for spec lines `96" Ø Cd 2.2…`, axis labels, `CATALOG DATA · UNVERIFIED`, placeholders |
| `--mc-amber #f5a623` on `#111` | ~8.5:1 | pass, but `warn-bg rgba(245,166,35,.08)` → text-on-tint ~2.1:1 when card bg lifts |
| `--mc-green #4caf50` on `#111` | ~6.8:1 | pass |
| `--mc-red #e74c3c` on `#111` | ~4.9:1 | pass normal, fail 9px micro-labels |
| Faint pink MC scatter on Leaflet light tiles (Dispersion) | ~1.4:1 | **FAIL**, invisible in sunlight |

Action: kill `#555` for any text. Floor for micro-labels: `#9aa0a6` (7:1 on `#111`). Scatter: `#ff5252` 2.5px + white 0.5px halo; never pink-on-grey.

### 1.3 Density vs scannability (launch-site constraint: gloves, sun, 1m viewing)

- Dashboard 3-col (`~20/55/20%`): left catalog overloaded (15+ cards, 3-line 10px specs, 2-col product grid), center half-empty below `SuggestPanel`, right rail airy with 24–28px hero numbers. Imbalance forces horizontal eye travel with no anchor.
- ALL-CAPS + tracking everywhere (`letter-spacing .06em`, 10px labels) reduces word-shape recognition ~15%. Reserve caps for eyebrows only; values in mixed case or tabular-nums.
- Right-rail hero numbers (`414.2 IN³`, `9,701 FT`, `13.7 FT/S`) dominate while `INSUFFICIENT CONFIDENCE` is smaller above them — magnitude wins over meaning. Invert: posture banner first, 14px bold, full-bleed; numbers second.
- Touch: CTA 36px, secondary 32px, slot `×` fixed 44px. Field rule: every actionable element ≥44px. Bump CTA/secondary to 44px on `<640px`.

### 1.4 Per-tab / per-primitive

**DashboardTab (`DashboardTab.jsx:28-212`) + Bay Schematic (`.mc-bay-grid`, `.mc-slot`).**
Flaw: brightest element is selected-card white border, not CTA or warning. 8 bay cards identical weight — MAIN (flight-critical) = SWIVEL (accessory). `NO_COMPONENT_LOADED` grey-on-dark unreadable. `SuggestPanel` buried below fold behind `.mc-suggest-wrap` 1px divider.
Fix: tier bays — Tier-1 (MAIN/DROGUE/SHOCK) 1.25× height, white 1px border; Tier-2 remainder 0.5 opacity until Tier-1 filled. Empty Tier-1: dashed amber border + `REQUIRED` chip (not grey italic). Move `SuggestPanel` inline into empty Tier-1 card as `SUGGESTED → [part] [ADD]`.

**SpecsTab / RocketSpecs (`SpecsTab.jsx`, `ConfigBuilder.jsx`, `specs/SpecInput.jsx`).**
Flaw: 2-col card grid pairs unrelated slots (MAIN/DROGUE ok, then SHOCK/PROTECTOR, DEPLOY/QUICK…); 8 components, minimal gaps, orange-vs-green border as *only* status cue. `COMPATIBILITY_REVIEW` detached below fold from its 3 inputs. Warning cards ×3 identical: orange bar + paragraph + 3-col meta + `REVIEW_AFFECTED_AREA` + `ACKNOWLEDGE_REVIEW` same style ×3.
Fix: single-column form, 12px gaps, sticky section nav. Inline warnings under offending input (not detached panel). Collapse ACK into checkbox; one primary `REVIEW` per card, not two equal buttons.

**SimulationTab (`SimulationTab.jsx:6-138`) + FlightChart (`FlightChart.jsx`, 400×260, `PAD{28,16,36,56}`).**
Good: white path on dark grid, hatched area fill, adaptive x-ticks (`≤60→5s, ≤120→10s, ≤300→20s`).
Flaws: (a) descent tail clipped at chart bottom — landing invisible; (b) `SCALE: 1:120` undefined; Y `1k–12k` no unit on axis, X `0–240s` cramped `BURN/APOG/MAIN/LDG` markers overlapping; (c) right rail `APOGEE 9,701 / MAIN 13.7 / TIME 212 / DRIFT 5,965` then `DROGUE_DESCENT` truncated at fold — overflow; (d) `MainSnatchSummary` equal-weights `Approach 52.32 ft/s`, `Extension 0.65m`, `SCREENED`, `MARGIN 2.07` — criticality unclear; `968.48 lbs` 2-decimal false precision; (e) `Show method, evidence & limitations` collapsed — safety context hidden; (f) `REF_ID / CURRENT_RESULT / SCREENING_ONLY` micro-labels compete.
Fix: `PAD.bottom 36→44`, `yDomain = nice1000(maxAlt*1.08)` so landing marker visible. Event markers: staggered two-row labels with leader lines, never inline-overlap. Rail: 2×2 grid, no scroll; drogue card always visible. Snatch: one headline `SNATCH 968 lbs — MARGINAL (2.07×)` + `<details>LIMITATIONS</details>` open by default when status≠ok. Round lbs to integer. Move `REF_ID` to footer 9px.

**AnalysisTab (`AnalysisTab.jsx:34-524`) — Causality Board (`.mc-causality-row`).**
Biggest flaw: safety-critical board renders *last*, after sensitivity table + RK4 summary, as `DRIVER: → OUTCOME: → FINDING: → [Review...]` rows with 3px left border only. Row 3 is cut off at viewport in audit screenshot. Sensitivity table (4 rows: mass ±10%, Cd ±20%, deploy ±200ft, wind ±25%) visually outweighs the `SF 2.7× below minimum` and `drift 5,965 ft` findings.
Fix: reorder — Posture → Causality (fail-first sorted: error, warn, nominal-collapsed) → Sensitivity → Method. Row structure: `[SEV chip] DRIVER → OUTCOME` on line 1, `FINDING` 13px white on line 2, action right-aligned `OPEN IN BAY →`. Nominal rows collapsed to count `4 NOMINAL ✓ (expand)`.

**DispersionTab (`DispersionTab.jsx`) + DispersionMap.**
Flaws: Leaflet tiles mismatched light/dark (loading seam), grey wash kills terrain, pink scatter invisible, orange 95% ellipse dominates nominal drift line (hierarchy inverted), stats strip `Drift 5,963ft Direction E(85°) Drogue 5,147ft/161s Main 819ft/51s Ellipse 1038×731m` mixes ft/km/m in one 10px line, zoom control white-on-dark clash, no legend/north/scale.
Fix: dark CARTO basemap pinned (no auto light tiles), scatter `#ff5252` + halo, nominal path 3px white, ellipse 1.5px amber dashed *no fill*. Stats: 4 fixed cards with consistent units (ft + m sub). Add inline legend `■ Drogue ■ Main · scatter ⬭ 95%` + scale bar + north arrow. Header: kill duplicate `DISPERSION_MAP // LANDING_PREDICTION` + `Dispersion Map (Monte Carlo)` — one H2.

**CompareTab (`CompareTab.jsx:33-139`).**
Flaw: pre-snapshot is centered paragraph + full-width ghost button in 75% void; post-snapshot uses inline `cellStyle/headerStyle` objects (not CSS classes) with amber = "changed" (collides with warn amber). No delta column.
Fix: pre-snapshot shows ghost A/B skeleton table (3 dim rows) so future state is predictable. Post: columns `A | B | Δ` with `Δ` in white bold + `▲/▼`, changed cells get `background rgba(245,166,35,.12)` not just amber text. Move inline styles into `MissionControlLayout.css`.

**FlightLogTab (`FlightLogTab.jsx:11-463`).**
Flaw: `NewEntryForm` 10-field vertical stack (`DATE/LOCATION/APOGEE/RATE/LAT/LON/OUTCOME/SOURCE/INSTRUMENT/NOTES`) with inline `display:flex gap:10` styles; outcome as 4 equal buttons (Nominal/Minor/Failure/Loss) — destructive options same weight as nominal; lat/lon free text, no validation hint.
Fix: 2-col grid (date+location / apogee+rate / lat+lon), outcome as segmented control with Loss/Failure in red outline, lat/lon `inputmode=decimal` + inline `±90/±180` hint. Delta `actual−predicted` shown green/red at log-entry render (`LogEntry delta()` already computes — surface it larger).

**ExportTab (`ExportTab.jsx:78-197`).**
Flaw: 5 stacked sections (Brief / Save / Share / JSON / Checklist) equal weight; `PRINT_RECOVERY_BRIEF` primary buried first in scroll; import uses hidden `fileRef` + reset hack.
Fix: order by field need: `1 PRINT_CHECKLIST (44px solid) 2 SHARE_LINK 3 JSON 4 SAVE`. Checklist button full-width high-contrast; rest ghost. Keep import reset, add `accept=".json,application/json"`.

**Primitives.**
- `StatusChip.jsx:21-38`: inline-style chip, 10px, 1px colored border, no bg — washes on tinted cards. Fix: add `background: color + '1A'` (10% tint), bump to 11px/600, `border-radius:3px`. Single source via `statusColor()`.
- `MetricCard.jsx:6-25`: hardcoded `fontSize:9` amber `ABOVE_NOMINAL_THRESHOLD` label, `value--compact 22px`. Fix: label prop instead of hardcoded string; value `font-variant-numeric: tabular-nums`.
- `CompatDot` 8px + 200ms tooltip delay: too small for touch, too slow for scan. Fix: 10px dot, 12px hit area, tooltip `delay 0` on focus/click (not hover-only).
- `FlightChart` long draw `700–900ms strokeDashoffset`: Gordon — respect `prefers-reduced-motion` (already in `.mc` media query, extend to chart path).

---

## SECTION 2 — Next-Gen Frontend Blueprint (worker-ready)

### 2.1 Visual identity

**Palette — `midnight instrument` (all tokens, no raw hex in components):**
```css
:root{
  --ink-0:#07090c; --ink-1:#0c0f14; --ink-2:#12161d; --ink-3:#1a2029;
  --line-0:#232b36; --line-1:#313b48;
  --txt-0:#f2f5f8; --txt-1:#b8c0cc; --txt-2:#9aa4b2;
  --grn:#3ddc84; --amb:#ffb224; --red:#ff5c5c; --cyn:#56ccf2; --vio:#b388ff;
  --txt-2-on-ink1-ratio:7.0; /* floor, never use #555 again */
}
```
Semantic: `--ok=var(--grn); --warn=var(--amb); --err=var(--red); --info=var(--cyn)`. Status bg = color at 12% alpha (`color-mix(in srgb, var(--grn) 12%, transparent)`). Map accent `cyn`, never pink.

**Typography:**
- Display/values: `JetBrains Mono` 600/700, `font-variant-numeric: tabular-nums; font-feature-settings:"tnum"`.
- Labels/paragraphs: `Inter` 400/500/600. Mono-only-everything is the current scannability bug — split: Inter for words, Mono for numbers/codes.
- Scale: `eyebrow 10/600/.12em Inter caps · label 11/500 · body 12.5/400 · value 22/600 mono · hero 30/700 mono`. Never 9px text.
- Scale rule: values ≥18px mono; labels ≤11px Inter caps grey; prose 12.5px Inter.

**Structural framing + CRT/HUD:**
- App bg `ink-0`; panels `ink-1` 1px `line-0`, `border-radius:8px`; Tier-1 panels 1px `line-1` + `box-shadow: 0 0 0 1px rgba(255,255,255,.02) inset`.
- Corner ticks on live surfaces (chart, map, bay): 8px `L` brackets via `::before/::after`, `border:1.5px solid var(--line-1)`. Signals "optical instrument", costs 0 layout.
- Scanlines: single reusable overlay, pointer-events none, opacity .5, respects reduced-motion:
```css
.hud-scan{position:relative;overflow:hidden}
.hud-scan::after{content:"";position:absolute;inset:0;pointer-events:none;
 background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 3px);
 mix-blend-mode:overlay}
.hud-vignette::before{content:"";position:absolute;inset:0;pointer-events:none;
 background:radial-gradient(120% 90% at 50% 40%,transparent 60%,rgba(0,0,0,.45) 100%)}
```
- Grain: keep existing `.mc::after` noise, reduce to 3% opacity (current washes text).
- Density: 4px base grid. Panel padding 14px. Card gap 10px. Section gap 20px. Field rows 44px min-height.

### 2.2 Master Layout Architecture

```
┌──────────────────────────────────────────────────────────┐
│ STATUS_STRIP 28px: ●FRESH 0E/3W 5/8BAYS APO 9,701 REF 3879│
├──────────┬──────────────────────────────┬────────────────┤
│ RAIL 240 │ STAGE (fluid)                │ TELEMETRY 300  │
│ inputs / │ bay viz top / chart+map      │ hero nums /    │
│ bay list │ causality bottom             │ posture / warn │
├──────────┴──────────────────────────────┴────────────────┤
│ TIMELINE 56px: BURN—APOG—DROGUE—MAIN—LDG scrubber         │
└──────────────────────────────────────────────────────────┘
```
- Left RAIL (inputs): parts search + Tier-1 slots + specs. Never scrolls away from Tier-1.
- Center STAGE (visualization): tab-dependent — Dashboard=Bay Visualizer, Simulation=Flight Profile HUD, Dispersion=Map HUD, Analysis=Causality Matrix. One live surface at a time, full-bleed.
- Right TELEMETRY (feeds): posture card + 4 hero metrics + warning feed. Sticky, independent scroll.
- Bottom TIMELINE: flight-phase scrubber (BURN/APOG/DROGUE/MAIN/LDG) synced to chart + map. New — gives temporal anchor missing today.
- Breakpoints: `>1200` 3-col; `768–1200` rail collapses to icons, telemetry under stage; `<768` single column with bottom tab bar (keep existing 44px pattern), telemetry cards horizontal snap-scroll.

### 2.3 Component specs (exact structure)

**A. Bay Visualizer** (`components/bay/BayVisualizer.jsx` + `BayBay.jsx`):
```jsx
<section class="bay hud-scan" aria-label="Recovery bay">
  <header class="bay__head"><span class="eyebrow">BAY_SCHEMATIC</span><span class="bay__vol mono">414.2 IN³ · 68%</span></header>
  <div class="bay__tube"> {/* vertical rocket tube, Tier-1 top */}
    <BaySlot tier={1} id="main_chute" status="ok" name="96in Iris Ultra" spec="96in Ø · Cd2.2 · 709g" action="×" />
    <BaySlot tier={1} id="drogue_chute" … />
    <BaySlot tier={1} id="shock_cord" status="warn" … />
    <BaySlot tier={2} … /> {/* dimmed until tier-1 filled */}
  </div>
  <div class="bay__gauge"><i style={{width:'68%'}} class={ok|warn|fail}/></div>
</section>
```
CSS: `.bay__tube{border:1px solid var(--line-0); border-radius:8px; background:linear-gradient(180deg,#0e1218,#0a0d11)}` `.bayslot[tier=1]{min-height:64px;border-left:3px solid var(--ok|warn|err)}` `.bayslot[tier=2]{opacity:.55} .bayslot--empty[tier=1]{border:1px dashed var(--amb)}`.

**B. Telemetry Cards** (`components/telemetry/TeleCard.jsx`):
```jsx
<article class="tele" data-status="warn">
  <span class="eyebrow">APOGEE</span>
  <strong class="tele__val mono">9,701<span class="tele__unit">ft</span><StatusChip status="warn" label="MARGINAL"/></strong>
  <span class="tele__sub">PRED ±8% · N=500 MC</span>
</article>
```
CSS: `.tele{background:var(--ink-1);border:1px solid var(--line-0);border-radius:8px;padding:10px 12px}` `.tele[data-status=warn]{border-top:2px solid var(--amb)}` `.tele__val{font:700 22px mono; font-variant-numeric:tabular-nums}` `.tele__unit{font:500 11px Inter;color:var(--txt-2);margin-left:4px}`. Grid: `grid-template-columns:repeat(2,1fr);gap:10px` — never a scrolling rail.

**C. Live Flight Profile HUD** (`components/hud/FlightHud.jsx` wraps `FlightChart`):
```jsx
<section class="hud hud-scan hud-vignette" aria-label="Flight profile">
  <header class="hud__bar"><span class="eyebrow">FLIGHT_PROFILE // ALT_vs_TIME</span><span class="mono">REF 3879 · RK4 · FRESH</span></header>
  <FlightChart /> {/* PAD{top:28,right:16,bottom:44,left:56}, yMax=nice1000(max*1.08) */}
  <footer class="hud__phases">BURN 0–3s · APOG 18s · DROGUE 161s · MAIN 51s · LDG 212s</footer>
</section>
```
Chart deltas: staggered phase labels (two rows + leader lines), landing diamond marker always in-domain, integer lbs, `details[open]` limitations when snatch≠ok.

**D. Causality Matrix** (`components/analysis/CausalityMatrix.jsx`):
```jsx
<section class="causal" aria-label="Causality review">
  <header class="eyebrow">CAUSALITY // DRIVER → OUTCOME</header>
  <ol>
    <li class="causal__row" data-sev="error">
      <StatusChip status="error" label="BLOCKED"/>
      <p><strong>1in Tubular Nylon @30G</strong> → Ejection + Snatch</p>
      <p class="causal__finding">SF 2.7× below minimum 4.0 (nylon)</p>
      <button>OPEN IN BAY →</button>
    </li>
    …warn… …nominal collapsed…
  </ol>
</section>
```
CSS: `.causal__row{display:grid;grid-template-columns:auto 1fr auto;gap:8px;padding:10px 12px;border:1px solid var(--line-0);border-left:3px solid var(--err|amb|line-1);border-radius:6px}`. Sort: error→warn→nominal; nominal collapsed to `N NOMINAL ✓ (expand)`.

### 2.4 Step-by-step implementation (worker order)

1. **Tokens first.** Replace `:root` + `[data-theme=dark]` + `.mc{--mc-*}` triple with single §2.1 `:root`. Delete `DESIGN.md` Slate table or mark superseded. Files: `src/index.css`, `MissionControlLayout.css:4-67`.
2. **Type split.** Add Inter to `index.html` link tag; set `body{font-family:Inter…}` + `.mono{font-family:JetBrains Mono…; font-variant-numeric:tabular-nums}`. Audit: every number gets `.mono`; every sentence loses caps.
3. **Status strip.** New `components/StatusStrip.jsx` reading existing `resultFresh/hasErrors/filledSlots/packingVolume` props from `MissionControlLayout.jsx:64-80`. 28px, sticky under header.
4. **Grid shell.** Replace `.mc-dashboard` 3-col percentages with §2.2 `rail/stage/telemetry` grid + timeline footer. Add `.hud-scan/.hud-vignette` utilities once.
5. **Components in order:** `TeleCard` (replaces `MetricCard` + inline `cellStyle` in `CompareTab/FlightLogTab`) → `BayVisualizer` (replaces `.mc-bay-grid/.mc-slot`) → `FlightHud` (wrap `FlightChart`, fix PAD/yMax/labels) → `CausalityMatrix` (replaces `.mc-causality-row`, reorder AnalysisTab to Posture→Causality→Sensitivity).
6. **Map fix.** Pin dark basemap, restyle scatter/ellipse/path per §1.4-Dispersion, add legend/scale/north, unit-normalize stats strip.
7. **Empty-state skeletons.** Compare pre-snapshot ghost table; Dispersion `NO_SIMULATION` HUD placeholder (axes + `RUN SIMULATION →` centered, per existing empty-state rule).
8. **Touch + motion pass.** All buttons ≥44px on mobile; extend `prefers-reduced-motion` to chart draw + dot pulse + toast.
9. **Delete dead:** `//` echo headers, `REF_ID/CURRENT_RESULT/SCREENING_ONLY` micro-labels (one footer), duplicate `REVIEW_AFFECTED_AREA/ACK` double-buttons, inline style objects in `CompareTab/FlightLogTab` → CSS classes.
10. **Verify:** `npx vitest run` + Playwright tab screenshots at 1440 + 390px; contrast spot-check `#9aa4b2`-on-`#0c0f14` ≥7:1; keyboard arrow-nav through tabs; print checklist from Export.

Risk: token replacement touches every component — do it as one atomic commit before component work, not interleaved.
