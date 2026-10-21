/* Scroll landing page CSS — injected via LPScrollStyles component */

const LPS_CSS = `
.lps-root {
  background: #0a0a0a;
  color: #e0e0e0;
  font-family: var(--lp-heading-font, 'JetBrains Mono', ui-monospace, monospace);
  min-height: 100vh;
  width: 100%;
  overflow: hidden;
  position: relative;
}
.lps-root a { color: inherit; text-decoration: none; }
.lps-green { color: #4caf50; }
.lps-amber-accent { color: #f5a623; }

/* ── PROGRESS RAIL ─────────────── */
.lps-rail {
  position: fixed;
  left: 22px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 40;
  display: flex; flex-direction: column; gap: 18px;
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}
.lps-rail-on { opacity: 1; pointer-events: auto; }
.lps-rail-item {
  display: flex; align-items: center; gap: 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; letter-spacing: 0.18em;
  color: #555; text-transform: uppercase;
  text-decoration: none;
  transition: color 0.25s ease;
}
.lps-rail-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #2a2a2a;
  box-shadow: 0 0 0 3px #0a0a0a;
  transition: background 0.25s ease, transform 0.25s ease;
}
.lps-rail-label {
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.lps-rail-item:hover { color: #c0c0c0; }
.lps-rail-item:hover .lps-rail-label { opacity: 1; transform: translateX(0); }
.lps-rail-item-on { color: #e0e0e0; }
.lps-rail-item-on .lps-rail-dot { background: #4caf50; transform: scale(1.3); }
.lps-rail-item-on .lps-rail-label { opacity: 1; transform: translateX(0); }
@media (max-width: 760px) { .lps-rail { display: none; } }
.lps-label {
  font-size: 10px; letter-spacing: 0.14em; color: #3a8f3a;
  text-transform: uppercase;
}

/* ── NAV ───────────────────────────── */
.lps-nav {
  position: fixed; top: 0; left: 0; right: 0;
  z-index: 100; height: 48px;
  background: rgba(10,10,10,0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid #1e1e1e;
  display: flex; align-items: center; padding: 0 24px; gap: 32px;
  font-size: 10px; letter-spacing: 0.1em;
}
.lps-brand {
  display: flex; align-items: center; gap: 8px;
  color: #fff; font-weight: 700; letter-spacing: 0.18em;
}
.lps-brand-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #4caf50; box-shadow: 0 0 8px #4caf50;
}
.lps-brand-v { color: #555; font-weight: 400; margin-left: 6px; }
.lps-nav-links { display: flex; gap: 22px; margin-left: auto; color: #888; }
.lps-nav-links a:hover { color: #4caf50; }
.lps-nav-right { display: flex; align-items: center; gap: 12px; }
.lps-nav-meta { color: #555; font-size: 9px; }

/* ── BUTTONS ───────────────────────── */
.lps-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 14px; border: 1px solid #333;
  font-family: inherit; font-size: 10px; letter-spacing: 0.12em;
  color: #e0e0e0; background: transparent; cursor: pointer;
  transition: all 0.15s;
}
.lps-btn:hover { border-color: #fff; background: #1a1a1a; }
.lps-btn--ghost { border-color: #2a2a2a; color: #888; }
.lps-btn--green {
  background: #4caf50; color: #000; border-color: #4caf50; font-weight: 700;
}
.lps-btn--green:hover { background: #5dd65d; border-color: #5dd65d; }
.lps-btn--lg { padding: 12px 22px; font-size: 11px; letter-spacing: 0.14em; }

/* ── HERO ──────────────────────────── */
.lps-hero { position: relative; height: 100vh; }
.lps-hero-pin {
  position: relative; width: 100vw; height: 100vh;
  overflow: hidden;
  will-change: transform;
  background:
    radial-gradient(circle at 50% 60%, rgba(76,175,80,0.08), transparent 55%),
    #050505;
}
.lps-hero-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(#0f1a0f 1px, transparent 1px),
    linear-gradient(90deg, #0f1a0f 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(circle at 50% 55%, #000 40%, transparent 75%);
  opacity: 0.4;
}
.lps-hero-stage {
  position: absolute; top: 50%; left: 50%;
  width: 620px; height: 620px;
  transform: translate(-50%, -50%);
  transform-origin: center center;
  will-change: transform;
  pointer-events: none;
}
.lps-hero-meta {
  position: absolute; top: 64px; left: 0; right: 0;
  display: flex; justify-content: space-around;
  font-size: 9px; letter-spacing: 0.2em; color: #3a8f3a;
  padding: 0 40px; will-change: transform, opacity;
}
.lps-hero-live { color: #4caf50; animation: lps-blink 1.6s infinite; }
@keyframes lps-blink { 50% { opacity: 0.3; } }
.lps-hero-copy {
  position: absolute; left: 56px; bottom: 80px;
  max-width: 720px; will-change: transform, opacity;
  z-index: 2;
}
.lps-hero-kicker {
  font-size: 10px; letter-spacing: 0.2em; color: #4caf50;
  margin-bottom: 22px;
}
.lps-hero-title {
  font-family: var(--lp-heading-font, 'JetBrains Mono', monospace);
  font-size: clamp(36px, 5.5vw, 72px);
  line-height: 1.0; font-weight: 700; color: #fff;
  letter-spacing: -0.03em; margin: 0;
}
.lps-hero-sub {
  font-family: 'Inter', sans-serif;
  font-size: 15px; line-height: 1.6; color: #9aa0b0;
  margin-top: 24px; max-width: 520px;
}
.lps-hero-ctas { display: flex; gap: 12px; margin-top: 32px; }
.lps-hero-dots {
  display: flex; gap: 28px; margin-top: 28px;
  font-size: 10px; letter-spacing: 0.12em; color: #555;
}
.lps-scroll-hint {
  position: absolute; bottom: 28px; right: 40px;
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; font-size: 9px; letter-spacing: 0.25em; color: #3a8f3a;
}
.lps-scroll-line {
  width: 1px; height: 40px; background: #1e2230; overflow: hidden;
}
.lps-scroll-line > div {
  width: 100%; height: 14px; background: #4caf50;
  animation: lps-scroll 1.8s ease-in-out infinite;
}
@keyframes lps-scroll {
  0% { transform: translateY(-40px); }
  100% { transform: translateY(40px); }
}

/* ── SECTION HEAD ──────────────────── */
.lps-section-head {
  display: flex; justify-content: space-between;
  padding: 14px 40px; font-size: 9px; letter-spacing: 0.18em;
  color: #3a8f3a; border-top: 1px solid #1e1e1e; border-bottom: 1px solid #1e1e1e;
  background: #070707;
}

/* ── MANIFESTO ─────────────────────── */
.lps-manifesto {
  padding: 180px 60px 180px;
  max-width: 1400px; margin: 0 auto;
  border-bottom: 1px solid #1a1a1a;
}
.lps-manifesto .lps-label { margin-bottom: 40px; }
.lps-words {
  font-family: var(--lp-heading-font, 'JetBrains Mono', monospace);
  font-size: clamp(28px, 3.6vw, 54px);
  line-height: 1.18; font-weight: 500;
  color: #fff; letter-spacing: -0.015em;
  max-width: 1180px;
  text-wrap: pretty;
}
.lps-word {
  display: inline-block; overflow: hidden; vertical-align: bottom;
}
.lps-word > span {
  display: inline-block; will-change: transform, opacity;
}
.lps-manifesto-sig {
  display: flex; justify-content: space-between; max-width: 1180px;
  margin-top: 80px; font-size: 10px; letter-spacing: 0.18em; color: #555;
}

/* ── STATS STRIP ───────────────────── */
.lps-stats {
  display: grid; grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid #1a1a1a; border-bottom: 1px solid #1a1a1a;
  background: #070707;
}
.lps-stat {
  padding: 48px 32px; border-right: 1px solid #1a1a1a;
}
.lps-stat:last-child { border-right: none; }
.lps-stat-num {
  font-family: var(--lp-heading-font, 'JetBrains Mono', monospace);
  font-size: 78px; font-weight: 700; color: #4caf50;
  letter-spacing: -0.04em; line-height: 1;
  font-variant-numeric: tabular-nums;
}
.lps-stat-unit {
  font-size: 10px; letter-spacing: 0.2em; color: #fff;
  margin-top: 10px;
}
.lps-stat-sub {
  font-size: 10px; color: #555; margin-top: 8px; letter-spacing: 0.06em;
  line-height: 1.5;
}

/* ── PARTS two-column catalog ─────── */
.lps-section-title {
  font-family: var(--lp-heading-font, 'JetBrains Mono', monospace);
  font-size: clamp(32px, 4vw, 56px); font-weight: 700; color: #fff;
  letter-spacing: -0.03em; line-height: 1.02; margin: 0;
}
.lps-section-sub {
  font-family: 'Inter', sans-serif; font-size: 15px; color: #9aa0b0;
  line-height: 1.6; margin-top: 18px; max-width: 520px;
}
.lps-parts-section {
  position: relative;
  background: #0a0a0a;
  border-bottom: 1px solid #1a1a1a;
  padding: 0 0 140px;
}
.lps-parts-section > .lps-section-head {
  margin-bottom: 100px;
}
.lps-parts-inner {
  padding: 0 60px;
  display: grid; grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: 72px; align-items: center;
  max-width: 1400px; margin: 0 auto;
}

/* LEFT */
.lps-parts-eyebrow {
  display: flex; align-items: center; gap: 14px;
  font-size: 10px; color: #aeb4bf; letter-spacing: 0.22em;
  margin-bottom: 36px;
}
.lps-eyebrow-bar {
  display: inline-block; width: 28px; height: 2px; background: #e0e0e0;
}
.lps-parts-hero {
  font-family: var(--lp-heading-font, 'JetBrains Mono', monospace);
  font-size: clamp(40px, 4.4vw, 64px);
  font-weight: 700; color: #fff;
  line-height: 1.02; letter-spacing: -0.03em;
  margin: 0 0 28px;
  display: flex; flex-direction: column;
}
.lps-parts-hero-l1, .lps-parts-hero-l2 { display: block; }
.lps-parts-copy {
  font-family: 'Inter', sans-serif;
  font-size: 14px; color: #9aa0b0; line-height: 1.7;
  max-width: 440px; margin: 0 0 48px;
}
.lps-parts-kv {
  border-top: 1px solid #1e1e1e;
  max-width: 520px;
}
.lps-parts-kv-row {
  display: grid; grid-template-columns: 130px 1fr;
  padding: 14px 0; border-bottom: 1px solid #1e1e1e;
  font-family: var(--lp-heading-font, 'JetBrains Mono', monospace);
  font-size: 11px; letter-spacing: 0.08em;
}
.lps-parts-kv-k { color: #666; }
.lps-parts-kv-v { color: #e0e0e0; }

/* RIGHT — framed list with corner brackets */
.lps-parts-right { position: relative; }
.lps-parts-frame {
  position: relative;
  padding: 26px 28px;
  border: 1px solid #1e1e1e;
  background: rgba(10,10,10,0.4);
}
.lps-parts-corner {
  position: absolute; width: 14px; height: 14px;
  border-color: #4caf50; pointer-events: none;
}
.lps-parts-corner--tl { top: -1px; left: -1px; border-top: 1.5px solid; border-left: 1.5px solid; }
.lps-parts-corner--tr { top: -1px; right: -1px; border-top: 1.5px solid; border-right: 1.5px solid; }
.lps-parts-corner--bl { bottom: -1px; left: -1px; border-bottom: 1.5px solid; border-left: 1.5px solid; }
.lps-parts-corner--br { bottom: -1px; right: -1px; border-bottom: 1.5px solid; border-right: 1.5px solid; }

.lps-parts-list {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column;
}
.lps-parts-row {
  display: grid;
  grid-template-columns: 18px 1fr 80px 72px;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  font-family: var(--lp-heading-font, 'JetBrains Mono', monospace);
  font-size: 13px; color: #d4d8e0;
  border-left: 2px solid transparent;
  font-variant-numeric: tabular-nums;
  transition: background-color 0.25s ease, border-color 0.25s ease;
}
.lps-parts-row.is-hl {
  background: rgba(76,175,80,0.09);
  border-left-color: #4caf50;
}
.lps-parts-row:hover {
  background: rgba(255,255,255,0.025);
}
.lps-parts-dot {
  width: 8px; height: 8px; border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(255,255,255,0.04);
}
.lps-parts-name { color: #e8ecf2; letter-spacing: 0.01em; }
.lps-parts-a, .lps-parts-b {
  text-align: right; color: #8a909c; font-size: 12px;
  letter-spacing: 0.04em;
}
.lps-parts-row.is-hl .lps-parts-name { color: #fff; }
.lps-parts-row.is-hl .lps-parts-a,
.lps-parts-row.is-hl .lps-parts-b { color: #c6e7c8; }


/* ── SIM ───────────────────────────── */
.lps-sim { background: #0a0a0a; }
.lps-sim-inner {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0;
  border-bottom: 1px solid #1a1a1a;
}
.lps-sim-copy {
  padding: 100px 60px 100px;
  border-right: 1px solid #1a1a1a;
}
.lps-big-num {
  font-family: var(--lp-heading-font, 'JetBrains Mono', monospace);
  font-size: 110px; line-height: 0.9; font-weight: 700;
  color: #4caf50; letter-spacing: -0.06em; margin-bottom: 20px;
}
.lps-sim-stats {
  display: grid; grid-template-columns: repeat(3, 1fr);
  margin-top: 40px; border-top: 1px solid #1e1e1e;
}
.lps-sim-stat {
  padding: 20px 16px;
  border-right: 1px solid #1e1e1e; border-bottom: 1px solid #1e1e1e;
}
.lps-sim-stat:nth-child(3n) { border-right: none; }
.lps-sim-stat-v {
  font-size: 28px; font-weight: 700; font-family: var(--lp-heading-font, 'JetBrains Mono', monospace);
  letter-spacing: -0.02em; margin-top: 8px;
}
.lps-sim-stat-u { font-size: 11px; color: #888; margin-left: 4px; font-weight: 400; }
.lps-sim-chart {
  padding: 40px 32px; background: #070707;
}
.lps-panel-head {
  display: flex; justify-content: space-between;
  font-size: 9px; color: #3a8f3a; letter-spacing: 0.18em;
  padding-bottom: 14px; margin-bottom: 10px;
  border-bottom: 1px solid #1e1e1e;
}

.lps-disp-pad-pulse {
  transform-origin: 0 0;
  animation: lps-pad-pulse 2.2s ease-out infinite;
}
@keyframes lps-pad-pulse {
  0%   { opacity: 0.5; transform: scale(0.6); }
  100% { opacity: 0; transform: scale(1.8); }
}

/* ── DISPERSION ────────────────────── */
.lps-disp { background: #080808; }
.lps-disp-inner {
  display: grid;
  grid-template-columns: minmax(360px, 1fr) minmax(420px, 1.35fr);
  gap: 48px;
  align-items: start;
  padding: 60px 60px 100px;
  border-bottom: 1px solid #1a1a1a;
}
.lps-disp-copy {
  display: flex; flex-direction: column; gap: 28px;
  padding: 0;
}
.lps-disp-copy .lps-section-title { margin: 0; }
.lps-disp-copy .lps-section-sub { margin: 0; max-width: 48ch; }
.lps-disp-chart {
  padding: 0; background: #080808;
  max-width: 720px;
  width: 100%;
  justify-self: start;
}
@media (max-width: 1040px) {
  .lps-disp-inner {
    grid-template-columns: 1fr;
    padding: 60px 40px 80px;
  }
}
.lps-disp-stats-strip {
  display: flex; flex-direction: column;
  gap: 0;
  padding: 0;
  margin: 12px 0 14px;
  border: 1px solid #1a1a1a;
  background: #050505;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; letter-spacing: 0.03em; color: #888;
}
.lps-disp-strip-title {
  color: #4a90e2; font-weight: 600;
  padding: 10px 16px 8px;
  border-bottom: 1px solid #141414;
  font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
}
.lps-disp-stat-row {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 8px 16px;
  border-bottom: 1px solid #121212;
  gap: 12px;
}
.lps-disp-stat-row:last-child { border-bottom: none; }
.lps-disp-stat-k { color: #666; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; }
.lps-disp-stat-v { color: #fff; font-variant-numeric: tabular-nums; font-weight: 600; }
.lps-disp-stats-strip b { color: #fff; font-weight: 600; font-variant-numeric: tabular-nums; }
.lps-disp-stats-strip .lps-dim { color: #555; }
.lps-disp-stats-strip .lps-amber { color: #e07b2d; }
.lps-disp-stats-strip .lps-red { color: #d24f3a; }
.lps-disp-strip-title {
  color: #4a90e2; font-weight: 600;
  margin-right: 8px;
}
.lps-disp-svg { display: block; }
.lps-disp-vec-drogue,
.lps-disp-vec-main {
  stroke-linecap: round;
}
.lps-disp-ell95 {
  animation: lps-ell-pulse 4s ease-in-out infinite;
  will-change: opacity;
}
@keyframes lps-ell-pulse {
  0%, 100% { opacity: 0.9; }
  50%      { opacity: 0.6; }
}
.lps-disp-stats {
  margin-top: 36px; max-width: 380px;
}
.lps-kv {
  display: flex; justify-content: space-between;
  padding: 10px 0; border-bottom: 1px dashed #1e2230;
  font-size: 11px; letter-spacing: 0.08em;
}
.lps-kv > span:first-child { color: #888; }
.lps-kv > span:last-child { color: #fff; font-weight: 700; }

/* ── VALIDATION ────────────────────── */
.lps-validation { background: #0a0a0a; }
.lps-val-inner {
  display: grid; grid-template-columns: 1fr 1fr; gap: 40px;
  padding: 100px 60px; border-bottom: 1px solid #1a1a1a;
}
.lps-val-rows { display: flex; flex-direction: column; gap: 12px; }
.lps-val-row {
  padding: 18px 22px;
}
.lps-val-t {
  font-family: var(--lp-heading-font, 'JetBrains Mono', monospace);
  font-size: 12px; font-weight: 700; letter-spacing: 0.04em;
}
.lps-val-b {
  font-family: 'Inter', sans-serif;
  font-size: 12px; color: #888; margin-top: 8px; line-height: 1.55;
}

/* ── EXPORTS ───────────────────────── */
.lps-exports { background: #080808; }
.lps-exp-head {
  padding: 100px 60px 60px; border-bottom: 1px solid #1a1a1a;
}
.lps-exp-grid {
  display: grid; grid-template-columns: repeat(5, 1fr);
  border-bottom: 1px solid #1a1a1a;
}
.lps-exp-card {
  padding: 48px 28px 56px; border-right: 1px solid #1a1a1a;
  transition: background 0.2s;
}
.lps-exp-card:last-child { border-right: none; }
.lps-exp-card:hover { background: #0d0d0d; }
.lps-exp-ext {
  font-family: var(--lp-heading-font, 'JetBrains Mono', monospace);
  font-size: 40px; font-weight: 700; color: #4caf50;
  letter-spacing: -0.02em; margin-bottom: 24px;
}
.lps-exp-title {
  font-size: 16px; color: #fff; font-weight: 700; letter-spacing: -0.01em;
}
.lps-exp-body {
  font-family: 'Inter', sans-serif; font-size: 12px;
  color: #888; line-height: 1.55; margin-top: 10px;
}

/* ── CERT ──────────────────────────── */
.lps-cert { background: #0a0a0a; border-bottom: 1px solid #1a1a1a; }
.lps-cert-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
}
.lps-cert-card {
  padding: 60px 40px; border-right: 1px solid #1a1a1a;
}
.lps-cert-card:last-child { border-right: none; }
.lps-cert-level {
  font-family: var(--lp-heading-font, 'JetBrains Mono', monospace);
  font-size: 120px; font-weight: 700; letter-spacing: -0.04em;
  line-height: 0.9; margin-bottom: 20px;
}

/* ── CTA ───────────────────────────── */
.lps-cta {
  padding: 180px 60px; text-align: center;
  background: radial-gradient(circle at 50% 0%, rgba(76,175,80,0.08), transparent 55%), #050505;
  border-bottom: 1px solid #1a1a1a;
}
.lps-cta .lps-label { margin-bottom: 28px; }
.lps-cta-title {
  font-family: var(--lp-heading-font, 'JetBrains Mono', monospace);
  font-size: clamp(54px, 8vw, 120px);
  font-weight: 700; color: #fff; letter-spacing: -0.045em;
  line-height: 0.95; margin: 0;
}
.lps-cta-sub {
  font-family: var(--lp-heading-font, 'JetBrains Mono', monospace);
  font-size: clamp(16px, 1.5vw, 20px); color: #9aa0b0;
  margin: 30px auto 0; max-width: 640px; line-height: 1.55;
}
.lps-cta-row {
  display: flex; gap: 14px; justify-content: center; margin-top: 44px;
}
.lps-cta-stats {
  display: grid; grid-template-columns: repeat(4, 1fr);
  max-width: 720px; margin: 80px auto 0; gap: 0;
  border-top: 1px solid #1a1a1a; border-bottom: 1px solid #1a1a1a;
}
.lps-cta-stat {
  padding: 24px 16px; border-right: 1px solid #1a1a1a;
}
.lps-cta-stat:last-child { border-right: none; }
.lps-cta-stat-v {
  font-family: var(--lp-heading-font, 'JetBrains Mono', monospace);
  font-size: 36px; font-weight: 700; color: #4caf50;
  letter-spacing: -0.03em;
}
.lps-cta-stat-l {
  font-size: 9px; color: #555; letter-spacing: 0.2em; margin-top: 6px;
}

/* ── FOOTER ────────────────────────── */
.lps-footer { background: #050505; }
.lps-footer-top {
  display: grid; grid-template-columns: 2fr 1fr 1fr 1fr;
  padding: 60px 60px; gap: 40px;
  border-bottom: 1px solid #1a1a1a;
}
.lps-footer-tag {
  font-family: 'Inter', sans-serif;
  color: #888; font-size: 12px; margin-top: 12px; line-height: 1.5;
}
.lps-footer-col { display: flex; flex-direction: column; gap: 8px; }
.lps-footer-title {
  font-size: 9px; color: #3a8f3a; letter-spacing: 0.2em; margin-bottom: 8px;
}
.lps-footer-col a {
  font-size: 11px; color: #888; letter-spacing: 0.08em;
}
.lps-footer-col a:hover { color: #4caf50; }
.lps-footer-bot {
  display: flex; justify-content: space-between;
  padding: 18px 60px; font-size: 9px; color: #555; letter-spacing: 0.18em;
}

@media (max-width: 960px) {
  .lps-parts-section { padding-bottom: 80px; }
  .lps-parts-section > .lps-section-head { margin-bottom: 48px; }
  .lps-parts-inner { grid-template-columns: minmax(0, 1fr); gap: 48px; padding: 0 32px; }
  .lps-sim-inner, .lps-val-inner { grid-template-columns: minmax(0, 1fr); }
  .lps-sim-copy { border-right: 0; border-bottom: 1px solid #1a1a1a; }
  .lps-val-inner { padding: 64px 32px; }
  .lps-exp-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .lps-footer-top { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; }
  .lps-footer-top > :first-child { grid-column: 1 / -1; }
}

/* Compact navigation keeps every destination and both launch actions available. */
@media (max-width: 1100px) {
  .lps-nav {
    height: auto; min-height: 88px; padding: 8px 20px;
    display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 12px;
  }
  .lps-nav > .lps-brand { flex-wrap: wrap; min-width: 0; gap: 4px 6px; font-size: 10px; }
  .lps-nav .lps-brand-v { flex-basis: 100%; margin-left: 14px; font-size: 9px; }
  .lps-nav-right { gap: 6px; }
  .lps-nav-meta { display: none; }
  .lps-nav-right .lps-btn { min-height: 40px; padding: 8px; font-size: 9px; letter-spacing: 0.05em; }
  .lps-nav-links {
    grid-column: 1 / -1; width: 100%; margin-left: 0;
    justify-content: space-between; flex-wrap: wrap; gap: 0 12px;
    font-size: 9px; letter-spacing: 0.05em;
  }
  .lps-nav-links a { display: inline-flex; align-items: center; min-height: 28px; }
  .lps-hero-meta { top: 108px; }
}

@media (max-width: 760px) {
  .lps-root section { scroll-margin-top: 104px; }
  .lps-nav { padding-inline: 16px; }
  .lps-hero, .lps-hero-pin { height: auto; min-height: 0; width: 100%; }
  .lps-hero-pin { padding: 112px 20px 40px; }
  .lps-hero-stage {
    top: 260px; left: 75%; width: min(440px, 100vw); height: min(440px, 100vw); opacity: 0.3;
  }
  .lps-hero-meta {
    position: relative; inset: auto; padding: 0; justify-content: flex-start;
    flex-wrap: wrap; gap: 8px 20px; font-size: 8px; letter-spacing: 0.08em;
  }
  .lps-hero-copy { position: relative; inset: auto; width: 100%; max-width: none; margin-top: 28px; }
  .lps-hero-kicker { font-size: 9px; line-height: 1.6; letter-spacing: 0.08em; margin-bottom: 18px; }
  .lps-hero-title { font-size: clamp(20px, calc((100vw - 40px) / 10.5), 42px); line-height: 1.08; }
  .lps-hero-sub { width: 100%; max-width: 100%; font-size: 14px; margin-top: 20px; }
  .lps-hero-ctas, .lps-cta-row { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; margin-top: 24px; }
  .lps-hero-ctas .lps-btn, .lps-cta-row .lps-btn { justify-content: center; min-height: 44px; }
  .lps-hero-dots { flex-wrap: wrap; gap: 12px 20px; margin-top: 20px; font-size: 9px; }
  .lps-scroll-hint { position: relative; inset: auto; margin-top: 28px; }
  .lps-scroll-line { height: 24px; }
  .lps-section-head, .lps-panel-head { flex-wrap: wrap; gap: 8px 16px; line-height: 1.6; }
  .lps-section-head { padding: 14px 20px; letter-spacing: 0.1em; }
  .lps-manifesto { padding: 64px 20px; }
  .lps-manifesto .lps-label { margin-bottom: 24px; }
  .lps-words { font-size: clamp(24px, 4vw, 28px); }
  .lps-word, .lps-word > span { max-width: 100%; overflow-wrap: anywhere; }
  .lps-manifesto-sig { flex-wrap: wrap; gap: 12px; margin-top: 32px; font-size: 9px; }
  .lps-stats, .lps-cta-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .lps-stat { padding: 28px 20px; }
  .lps-stat-num { font-size: 48px; }
  .lps-parts-section { padding-bottom: 64px; }
  .lps-parts-section > .lps-section-head { margin-bottom: 40px; }
  .lps-parts-inner { padding: 0 20px; gap: 32px; }
  .lps-parts-inner > *, .lps-sim-inner > *, .lps-disp-inner > *, .lps-val-inner > * { min-width: 0; }
  .lps-parts-hero { font-size: 36px; }
  .lps-parts-copy { margin-bottom: 28px; }
  .lps-parts-kv-row { grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr); gap: 12px; font-size: 10px; }
  .lps-parts-kv-row > span { overflow-wrap: anywhere; }
  .lps-parts-frame { padding: 12px; }
  .lps-parts-row { grid-template-columns: 14px minmax(0, 1fr) minmax(0, 1fr); gap: 6px 10px; padding: 12px 4px; font-size: 12px; }
  .lps-parts-dot { grid-column: 1; grid-row: 1 / 3; }
  .lps-parts-name { grid-column: 2 / -1; overflow-wrap: anywhere; }
  .lps-parts-a { grid-column: 2; text-align: left; }
  .lps-parts-b { grid-column: 3; }
  .lps-parts-a, .lps-parts-b { font-size: 10px; overflow-wrap: anywhere; }
  .lps-sim-copy { padding: 48px 20px; }
  .lps-big-num { font-size: clamp(64px, 20vw, 100px); }
  .lps-sim-stats { grid-template-columns: minmax(0, 1fr); margin-top: 28px; }
  .lps-sim-stat { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; border-right: 0; padding: 16px 0; }
  .lps-sim-stat-v { margin-top: 0; font-size: 24px; }
  .lps-sim-chart { padding: 24px 20px; }
  .lps-sim-chart svg { display: block; width: 100%; height: auto; aspect-ratio: 760 / 400; }
  .lps-disp-inner { grid-template-columns: minmax(0, 1fr); padding: 48px 20px; gap: 32px; }
  .lps-disp-stat-row, .lps-kv { flex-wrap: wrap; gap: 8px 12px; }
  .lps-disp-stat-row > span, .lps-kv > span { min-width: 0; overflow-wrap: anywhere; }
  .lps-val-inner { padding: 48px 20px; gap: 32px; }
  .lps-val-row { padding: 16px; }
  .lps-val-t { overflow-wrap: anywhere; }
  .lps-exp-head { padding: 48px 20px 32px; }
  .lps-exp-grid, .lps-cert-grid { grid-template-columns: minmax(0, 1fr); }
  .lps-exp-card, .lps-cert-card { padding: 32px 20px; border-right: 0; border-bottom: 1px solid #1a1a1a; }
  .lps-cta { padding: 64px 20px; }
  .lps-cta-stats { margin-top: 40px; }
  .lps-cta-stat { padding: 20px 12px; }
  .lps-footer-top { padding: 40px 20px; gap: 28px 12px; }
  .lps-footer-title { font-size: 8px; letter-spacing: 0.1em; }
  .lps-footer-col a { display: inline-flex; align-items: center; min-height: 32px; font-size: 10px; letter-spacing: 0.04em; }
  .lps-footer-bot { padding: 20px; flex-wrap: wrap; gap: 12px 24px; overflow-wrap: anywhere; }
}
`;

export default function LPScrollStyles() {
  return <style dangerouslySetInnerHTML={{ __html: LPS_CSS }} />;
}
