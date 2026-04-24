/* Flight chart variants for the SIM section. Four variations, all read
 * from the same parametric flight profile so they stay consistent. */

// Shared flight model — ascent (quadratic decel to apogee) + linear descent.
// Asymmetric padding: more left for Y-axis labels, more bottom for X-axis labels.
const FC_W = 760, FC_H = 400;
const FC_PAD_L = 64, FC_PAD_R = 28, FC_PAD_T = 44, FC_PAD_B = 48;
const FC_TOTAL = 84, FC_ASCENT = 30, FC_APOGEE = 5847;

function fcAltAt(t) {
  if (t <= FC_ASCENT) return FC_APOGEE * (1 - Math.pow(1 - t / FC_ASCENT, 2));
  const dt = t - FC_ASCENT, dd = FC_TOTAL - FC_ASCENT;
  return FC_APOGEE * (1 - dt / dd);
}
function fcVelAt(t) {
  // derivative of altitude
  const h = 0.5;
  return (fcAltAt(Math.min(FC_TOTAL, t + h)) - fcAltAt(Math.max(0, t - h))) / (2 * h);
}
const fcXScale = (t) => FC_PAD_L + (t / FC_TOTAL) * (FC_W - FC_PAD_L - FC_PAD_R);
const fcYScaleAlt = (a) => FC_H - FC_PAD_B - (a / FC_APOGEE) * (FC_H - FC_PAD_T - FC_PAD_B);
const fcYScaleVel = (v) => {
  // velocity ranges roughly +600 to -70 ft/s; map symmetric so zero = midline
  const VMAX = 700;
  return FC_PAD_T + (1 - (v + VMAX * 0.1) / (VMAX * 1.1)) * (FC_H - FC_PAD_T - FC_PAD_B);
};

function fcAltPath() {
  let d = '';
  for (let t = 0; t <= FC_TOTAL; t++) {
    d += (t === 0 ? 'M' : 'L') + fcXScale(t).toFixed(1) + ',' + fcYScaleAlt(fcAltAt(t)).toFixed(1) + ' ';
  }
  return d;
}
function fcVelPath() {
  let d = '';
  for (let t = 0; t <= FC_TOTAL; t += 0.5) {
    d += (t === 0 ? 'M' : 'L') + fcXScale(t).toFixed(1) + ',' + fcYScaleVel(fcVelAt(t)).toFixed(1) + ' ';
  }
  return d;
}

const FC_PALETTES = {
  green:  { path: '#4caf50', accent: '#f5a623', grid: '#1e2230', tick: '#3a8f3a' },
  amber:  { path: '#f5a623', accent: '#ff7043', grid: '#2a2216', tick: '#8a6a2a' },
  cyan:   { path: '#22d3ee', accent: '#f5a623', grid: '#132832', tick: '#3a8aa3' },
  red:    { path: '#ef4444', accent: '#f5a623', grid: '#2a1818', tick: '#8a3a3a' },
  violet: { path: '#a78bfa', accent: '#f5a623', grid: '#1f1a30', tick: '#6a5aa8' },
  mono:   { path: '#e0e0e0', accent: '#f5a623', grid: '#1e2230', tick: '#5a5a5a' },
};
function fcPal() {
  const key = (typeof window !== 'undefined' && window.__LP_CHART_PALETTE) || 'green';
  return FC_PALETTES[key] || FC_PALETTES.green;
}

function FCGrid({ ticks = 5, labels = true }) {
  const pal = fcPal();
  const gs = Array.from({ length: ticks }, (_, i) => i / (ticks - 1));
  const plotTop = FC_PAD_T, plotBot = FC_H - FC_PAD_B;
  const plotLeft = FC_PAD_L, plotRight = FC_W - FC_PAD_R;
  // X-axis time ticks at 0, 20, 40, 60, 80
  const xTicks = [0, 20, 40, 60, 80];
  return (
    <g fontFamily="var(--lp-heading-font)">
      {/* horizontal gridlines + Y-axis altitude labels */}
      {gs.map((g, i) => {
        const y = plotTop + g * (plotBot - plotTop);
        const alt = Math.round((1 - g) * FC_APOGEE);
        return (
          <g key={'y' + i}>
            <line x1={plotLeft} x2={plotRight} y1={y} y2={y} stroke={pal.grid} strokeWidth="0.6" />
            {labels && (
              <text x={plotLeft - 8} y={y + 3} fill={pal.tick} fontSize="9" textAnchor="end">
                {alt.toLocaleString()}
              </text>
            )}
          </g>
        );
      })}
      {/* vertical time ticks */}
      {xTicks.map((t) => {
        const x = fcXScale(t);
        return (
          <g key={'x' + t}>
            <line x1={x} x2={x} y1={plotBot} y2={plotBot + 4} stroke={pal.tick} strokeWidth="0.8" />
            <text x={x} y={plotBot + 16} fill={pal.tick} fontSize="9" textAnchor="middle">T+{t}</text>
          </g>
        );
      })}
      {/* axis titles */}
      <text x={14} y={plotTop - 16} fill={pal.tick} fontSize="9" fontWeight="600" letterSpacing="0.5">ALTITUDE (FT)</text>
      <text x={plotRight} y={FC_H - 8} fill={pal.tick} fontSize="9" fontWeight="600" letterSpacing="0.5" textAnchor="end">TIME (S)</text>
      {/* left axis line */}
      <line x1={plotLeft} x2={plotLeft} y1={plotTop} y2={plotBot} stroke={pal.tick} strokeWidth="0.6" opacity="0.5" />
      <line x1={plotLeft} x2={plotRight} y1={plotBot} y2={plotBot} stroke={pal.tick} strokeWidth="0.6" opacity="0.5" />
    </g>
  );
}

function FCApogeeMarker() {
  const cx = fcXScale(FC_ASCENT);
  const cy = fcYScaleAlt(FC_APOGEE);
  const pal = fcPal();
  // Label sits ABOVE the plot area, centered over the apogee tick
  const labelY = FC_PAD_T - 8;
  return (
    <g fontFamily="var(--lp-heading-font)">
      <line x1={cx} x2={cx} y1={FC_PAD_T} y2={FC_H - FC_PAD_B} stroke={pal.accent + '55'} strokeWidth="0.6" strokeDasharray="3 3" />
      <circle cx={cx} cy={cy} r="3.5" fill={pal.accent} stroke="#0d0d0d" strokeWidth="1.5" />
      <text x={cx} y={labelY} fill={pal.accent} fontSize="10" fontWeight="600" textAnchor="middle" letterSpacing="0.5">
        APOGEE · {FC_APOGEE.toLocaleString()} FT · T+{FC_ASCENT}S
      </text>
    </g>
  );
}

/* Variant A — original: altitude line */
function FCLine() {
  const pal = fcPal();
  return (
    <svg viewBox={`0 0 ${FC_W} ${FC_H}`} width="100%" height="380" preserveAspectRatio="xMidYMid meet">
      <FCGrid />
      <path className="lps-sim-path" d={fcAltPath()} fill="none" stroke={pal.path} strokeWidth="1.8" />
      <FCApogeeMarker />
    </svg>
  );
}

/* Variant B — filled area under altitude curve */
function FCArea() {
  const pal = fcPal();
  const p = fcAltPath();
  const floor = `L ${fcXScale(FC_TOTAL).toFixed(1)},${(FC_H - FC_PAD_B).toFixed(1)} L ${fcXScale(0).toFixed(1)},${(FC_H - FC_PAD_B).toFixed(1)} Z`;
  const gradId = 'fcarea-' + (window.__LP_CHART_PALETTE || 'green');
  return (
    <svg viewBox={`0 0 ${FC_W} ${FC_H}`} width="100%" height="380" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={pal.path} stopOpacity="0.45" />
          <stop offset="100%" stopColor={pal.path} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <FCGrid />
      <path d={p + floor} fill={`url(#${gradId})`} stroke="none" />
      <path className="lps-sim-path" d={p} fill="none" stroke={pal.path} strokeWidth="1.8" />
      <FCApogeeMarker />
    </svg>
  );
}

/* Variant C — altitude + velocity overlay */
function FCDual() {
  const pal = fcPal();
  return (
    <svg viewBox={`0 0 ${FC_W} ${FC_H}`} width="100%" height="380" preserveAspectRatio="xMidYMid meet">
      <FCGrid />
      {/* zero-velocity axis */}
      <line x1={FC_PAD_L} x2={FC_W - FC_PAD_R} y1={fcYScaleVel(0)} y2={fcYScaleVel(0)} stroke="#2a3550" strokeWidth="0.6" strokeDasharray="2 3" />
      {/* altitude */}
      <path className="lps-sim-path" d={fcAltPath()} fill="none" stroke={pal.path} strokeWidth="1.8" />
      {/* velocity */}
      <path d={fcVelPath()} fill="none" stroke={pal.accent} strokeWidth="1.4" strokeDasharray="4 3" opacity="0.9" />
      {/* legend */}
      <g fontFamily="var(--lp-heading-font)" fontSize="9">
        <g transform={`translate(${FC_PAD_L + 8}, ${FC_PAD_T + 4})`}>
          <line x1="0" x2="18" y1="6" y2="6" stroke={pal.path} strokeWidth="1.8" />
          <text x="24" y="9" fill="#e0e0e0">ALT (FT)</text>
        </g>
        <g transform={`translate(${FC_PAD_L + 100}, ${FC_PAD_T + 4})`}>
          <line x1="0" x2="18" y1="6" y2="6" stroke={pal.accent} strokeWidth="1.4" strokeDasharray="4 3" />
          <text x="24" y="9" fill="#e0e0e0">VEL (FT/S)</text>
        </g>
      </g>
      <FCApogeeMarker />
    </svg>
  );
}

/* Variant D — stepped / waveform style (blocky retro) */
function FCStepped() {
  const pal = fcPal();
  let d = '';
  let prev = 0;
  const SAMPLES = 42;
  for (let i = 0; i <= SAMPLES; i++) {
    const t = (i / SAMPLES) * FC_TOTAL;
    const a = fcAltAt(t);
    const x = fcXScale(t), y = fcYScaleAlt(a);
    if (i === 0) { d += `M${x.toFixed(1)},${y.toFixed(1)} `; prev = y; }
    else { d += `L${x.toFixed(1)},${prev.toFixed(1)} L${x.toFixed(1)},${y.toFixed(1)} `; prev = y; }
  }
  return (
    <svg viewBox={`0 0 ${FC_W} ${FC_H}`} width="100%" height="380" preserveAspectRatio="xMidYMid meet">
      <FCGrid />
      <path className="lps-sim-path" d={d} fill="none" stroke={pal.path} strokeWidth="1.6" />
      {/* sample dots */}
      {Array.from({ length: SAMPLES + 1 }, (_, i) => {
        const t = (i / SAMPLES) * FC_TOTAL;
        return <circle key={i} cx={fcXScale(t)} cy={fcYScaleAlt(fcAltAt(t))} r="1.6" fill={pal.path} />;
      })}
      <FCApogeeMarker />
    </svg>
  );
}

function FlightChart({ variant = 'line' }) {
  switch (variant) {
    case 'area':    return <FCArea />;
    case 'dual':    return <FCDual />;
    case 'stepped': return <FCStepped />;
    case 'line':
    default:        return <FCLine />;
  }
}

window.FlightChart = FlightChart;
