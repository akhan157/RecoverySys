/* =====================================================================
   landing-scroll.jsx — Apple-style scroll-driven landing page for
   RecoverySys. Pinned hero globe, progressive feature reveals, big type
   moments, final CTA. Built with GSAP + ScrollTrigger.

   Aesthetic: Mission Control dark + JetBrains Mono + green telemetry.
   Reuses primitives from landing-primitives.jsx.
   ===================================================================== */

/* ─────────────────────────────  GLOBE  ────────────────────────────── */
/* Wire-globe renderer driven by scroll progress 0..1.
   Zoom, rotation, sun direction, and a "dispatch" overlay fade all
   respond to `progress`. */
function LPScrollGlobe({ progressRef }) {
  const svgRef = React.useRef(null);
  const gRef = React.useRef(null);
  const hotRef = React.useRef(null);
  const overlayRef = React.useRef(null);
  const arcsRef = React.useRef(null);

  // Build sphere geometry once.
  const geom = React.useMemo(() => {
    // icosphere-ish: lat/lon grid of verts, plus great circles.
    const lats = 18;
    const lons = 28;
    const verts = [];
    for (let i = 1; i < lats; i++) {
      const theta = (i / lats) * Math.PI;
      for (let j = 0; j < lons; j++) {
        const phi = (j / lons) * Math.PI * 2;
        verts.push([
          Math.sin(theta) * Math.cos(phi),
          Math.cos(theta),
          Math.sin(theta) * Math.sin(phi),
        ]);
      }
    }
    // Landing-site dots (lat deg, lon deg)
    const sites = [
      [32.99, -106.97], // Spaceport America
      [35.34, -106.72], // Albuquerque
      [45.51, -122.68], // Portland
      [40.71, -74.00],  // NYC
      [51.50, -0.12],   // London
      [35.68, 139.69],  // Tokyo
      [-33.86, 151.21], // Sydney
      [-22.90, -43.17], // Rio
      [28.53, -80.65],  // Cape Canaveral
      [34.05, -118.24], // LA
      [55.75, 37.62],   // Moscow
      [19.07, 72.87],   // Mumbai
    ].map(([la, lo]) => {
      const t = (90 - la) * Math.PI / 180;
      const p = (lo + 180) * Math.PI / 180;
      return [
        Math.sin(t) * Math.cos(p),
        Math.cos(t),
        Math.sin(t) * Math.sin(p),
      ];
    });
    // Flight arcs between site pairs
    const arcPairs = [
      [0, 8], [2, 3], [3, 4], [4, 5], [5, 6], [8, 9], [0, 10], [11, 5],
      [3, 6], [9, 4], [10, 5], [1, 7], [11, 2], [7, 6], [4, 8], [1, 3],
      [10, 11], [2, 9], [0, 5], [7, 4],
    ];
    const arcs = arcPairs.map(([a, b]) => {
      const pa = sites[a], pb = sites[b];
      const steps = 28;
      const pts = [];
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        // slerp
        const dot = pa[0]*pb[0]+pa[1]*pb[1]+pa[2]*pb[2];
        const om = Math.acos(Math.max(-1, Math.min(1, dot)));
        const sO = Math.sin(om) || 1;
        const s1 = Math.sin((1-t)*om)/sO, s2 = Math.sin(t*om)/sO;
        const lift = 1 + 0.22 * Math.sin(Math.PI * t); // arch
        pts.push([
          (pa[0]*s1 + pb[0]*s2) * lift,
          (pa[1]*s1 + pb[1]*s2) * lift,
          (pa[2]*s1 + pb[2]*s2) * lift,
        ]);
      }
      return pts;
    });
    return { verts, sites, arcs, lats, lons };
  }, []);

  // Rotation helpers
  const rotY = (p, ang) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    return [c*p[0] + s*p[2], p[1], -s*p[0] + c*p[2]];
  };
  const rotX = (p, ang) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    return [p[0], c*p[1] - s*p[2], s*p[1] + c*p[2]];
  };

  React.useEffect(() => {
    let raf;
    const R = 160;
    const CX = 200, CY = 200;

    const project = (p, zoom) => {
      const f = 420; // focal
      const z = p[2] + 3 / zoom;
      const s = f / (z * 160);
      return [CX + p[0] * R * s * zoom, CY + p[1] * R * s * zoom, p[2]];
    };

    const step = () => {
      const t = performance.now() * 0.00011;
      const prog = (progressRef.current || 0);
      // Scroll controls: rotate yaw, tilt, zoom in, and move sun.
      const yaw = t * 1.0 + prog * Math.PI * 1.0;
      const pitch = -0.2 + prog * 0.2;
      const zoom = 1 + prog * 0.2;

      // Rotate verts
      const vx = geom.verts.map(v => rotX(rotY(v, yaw), pitch));
      // Great circles (lat, lon lines) — we rebuild projected polylines
      const g = gRef.current;
      if (!g) return;

      // Build lat lines
      const latPaths = [];
      for (let i = 1; i < geom.lats; i++) {
        const ring = [];
        for (let j = 0; j <= geom.lons; j++) {
          ring.push(vx[(i - 1) * geom.lons + (j % geom.lons)]);
        }
        latPaths.push(ring);
      }
      // Build lon lines
      const lonPaths = [];
      for (let j = 0; j < geom.lons; j++) {
        const line = [];
        for (let i = 0; i < geom.lats - 1; i++) {
          line.push(vx[i * geom.lons + j]);
        }
        lonPaths.push(line);
      }

      const toPath = (ring) => {
        let d = '';
        let pen = false;
        for (let k = 0; k < ring.length; k++) {
          const p3 = ring[k];
          const visible = p3[2] > -0.15;
          if (!visible) { pen = false; continue; }
          const p = project(p3, zoom);
          d += (pen ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ' ';
          pen = true;
        }
        return d;
      };

      // Group render: construct as <path> nodes
      // Simpler: write into innerHTML (svg)
      let html = '';
      // back rim
      html += `<circle cx="${CX}" cy="${CY}" r="${R * zoom}" fill="none" stroke="#0f4015" stroke-width="0.8" opacity="0.55"/>`;
      // hot-limb glow removed (orange hue)

      // wire lines
      const wireStroke = `rgba(92,255,92,${0.35 + prog * 0.25})`;
      for (const ring of latPaths) {
        const d = toPath(ring);
        if (d) html += `<path d="${d}" fill="none" stroke="${wireStroke}" stroke-width="0.6"/>`;
      }
      for (const line of lonPaths) {
        const d = toPath(line);
        if (d) html += `<path d="${d}" fill="none" stroke="${wireStroke}" stroke-width="0.55" opacity="0.8"/>`;
      }

      // Site dots — only dots referenced by flight arcs get rendered
      const arcEndpointSet = new Set();
      geom.arcs.forEach((_, ai) => {
        // arcPairs lives in geom closure; infer from arc first/last matching sites
      });
      // Simpler: precompute which site indices are arc endpoints
      const arcSiteIdx = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
      const sitesX = geom.sites.map(v => rotX(rotY(v, yaw), pitch));
      sitesX.forEach((v, i) => {
        if (!arcSiteIdx.has(i)) return;
        if (v[2] < -0.08) return;
        const p = project(v, zoom);
        const op = Math.min(1, 0.45 + v[2]);
        const r = 1.4;
        html += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r}" fill="#7dff7d" opacity="${op.toFixed(2)}"/>`;
      });

      // Flight arcs — smooth fractional trail, no integer snapping
      let arcHtml = '';
      geom.arcs.forEach((arc, idx) => {
        const axr = arc.map(v => rotX(rotY(v, yaw), pitch));
        const N = axr.length - 1; // last index
        // Phase: 0..1 = head sweeping across arc, 1..1.32 = tail getting
        // absorbed into the endpoint (head pinned at end), >1.32 = rest.
        const tailFrac = 0.32;              // trail length as fraction of arc
        const tailLen  = N * tailFrac;
        const cycle = 1 + tailFrac + 0.15;  // draw + absorb + rest
        const phase = (t * 1.6 + idx * 0.11) % cycle;

        // Head position: capped at arc end during the absorb phase.
        const headF = Math.min(phase, 1) * N;
        // Tail starts advancing normally, then keeps going past the end during absorb.
        const tailF = Math.max(0, phase * N - tailLen);

        // full faint arc path (always visible, back-face culled)
        let df = '';
        let penf = false;
        axr.forEach(p3 => {
          if (p3[2] < -0.12) { penf = false; return; }
          const p = project(p3, zoom);
          df += (penf ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ' ';
          penf = true;
        });
        if (df) arcHtml += `<path d="${df}" fill="none" stroke="#3a8f3a" stroke-width="0.4" opacity="0.35"/>`;

        // Rest period: tail has fully caught up to the head at endpoint — nothing to draw.
        if (tailF >= N) return;

        // Build trail polyline with fractional endpoints via lerp
        const lerp = (a, b, u) => [a[0]+(b[0]-a[0])*u, a[1]+(b[1]-a[1])*u, a[2]+(b[2]-a[2])*u];
        const pts = [];
        // start at fractional tailF
        const tI = Math.floor(tailF), tU = tailF - tI;
        if (axr[tI] && axr[tI+1]) pts.push(lerp(axr[tI], axr[tI+1], tU));
        else if (axr[tI]) pts.push(axr[tI]);
        // integer steps between
        for (let k = Math.ceil(tailF); k <= Math.floor(headF); k++) {
          if (axr[k]) pts.push(axr[k]);
        }
        // end at fractional headF
        const hI = Math.floor(headF), hU = headF - hI;
        if (axr[hI] && axr[hI+1]) pts.push(lerp(axr[hI], axr[hI+1], hU));

        // draw with back-face culling
        let d = '';
        let pen = false;
        for (const p3 of pts) {
          if (p3[2] < -0.12) { pen = false; continue; }
          const p = project(p3, zoom);
          d += (pen ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ' ';
          pen = true;
        }
        if (d) arcHtml += `<path d="${d}" fill="none" stroke="#ffb366" stroke-width="1.2" opacity="${(0.85 + prog * 0.15).toFixed(2)}" stroke-linecap="round"/>`;

        // bright comet head
        if (pts.length > 0) {
          const last = pts[pts.length - 1];
          if (last[2] >= -0.12) {
            const hp = project(last, zoom);
            arcHtml += `<circle cx="${hp[0].toFixed(1)}" cy="${hp[1].toFixed(1)}" r="1.6" fill="#ffd9a6"/>`;
          }
        }
      });

      // Front limb
      html += `<circle cx="${CX}" cy="${CY}" r="${R * zoom}" fill="none" stroke="#5cff5c" stroke-width="0.5" opacity="${0.35 + prog * 0.25}"/>`;

      g.innerHTML = html + arcHtml;

      // overlay crosshair + reticle ticks grow in with prog
      if (overlayRef.current) {
        overlayRef.current.style.opacity = (0.5 + prog * 0.5).toFixed(2);
        overlayRef.current.style.transform = `scale(${1 + prog * 0.08})`;
      }

      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [geom]);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg ref={svgRef} viewBox="0 0 400 400" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"
           style={{ display: 'block', filter: 'drop-shadow(0 0 40px rgba(76,175,80,0.08))' }}>
        <g ref={gRef} />
      </svg>
      {/* Reticle overlay */}
      <div ref={overlayRef} style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        transition: 'opacity 0.2s, transform 0.3s',
      }}>
        <svg viewBox="0 0 400 400" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          {/* corner brackets */}
          {[[30,30,1,1],[370,30,-1,1],[30,370,1,-1],[370,370,-1,-1]].map(([x,y,dx,dy],i)=>(
            <g key={i} stroke="#2a6b2a" strokeWidth="0.8" fill="none">
              <line x1={x} y1={y} x2={x+12*dx} y2={y} />
              <line x1={x} y1={y} x2={x} y2={y+12*dy} />
            </g>
          ))}
          {/* outer ticks */}
          {Array.from({length: 24}).map((_,i)=>{
            const a = (i/24)*Math.PI*2;
            const x1 = 200 + Math.cos(a)*188, y1 = 200 + Math.sin(a)*188;
            const x2 = 200 + Math.cos(a)*(i%6===0?178:184), y2 = 200 + Math.sin(a)*(i%6===0?178:184);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2a6b2a" strokeWidth={i%6===0?1:0.6}/>;
          })}
          {/* cross */}
          <line x1="200" y1="16" x2="200" y2="30" stroke="#2a6b2a" strokeWidth="0.8"/>
          <line x1="200" y1="370" x2="200" y2="384" stroke="#2a6b2a" strokeWidth="0.8"/>
          <line x1="16" y1="200" x2="30" y2="200" stroke="#2a6b2a" strokeWidth="0.8"/>
          <line x1="370" y1="200" x2="384" y2="200" stroke="#2a6b2a" strokeWidth="0.8"/>
        </svg>
      </div>
    </div>
  );
}

/* ─────────────────────  UTILITIES & BUILDING BLOCKS  ───────────────── */
function useScrollProgress(ref) {
  const [p, setP] = React.useState(0);
  React.useEffect(() => {
    const onScroll = () => {
      const el = ref.current; if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const passed = Math.min(total, Math.max(0, -rect.top));
      setP(total > 0 ? passed / total : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);
  return p;
}

/* Fixed left-edge progress rail. Highlights the currently-active section. */
function LPProgressRail() {
  const SECTIONS = [
    { id: 'parts',      label: 'Parts' },
    { id: 'sim',        label: 'Sim' },
    { id: 'dispersion', label: 'Dispersion' },
    { id: 'validation', label: 'Validation' },
  ];
  const [active, setActive] = React.useState(-1);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => {
      const mid = window.innerHeight * 0.5;
      let best = -1, bestDist = Infinity;
      SECTIONS.forEach((s, i) => {
        const el = document.getElementById(s.id);
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          const d = Math.abs((r.top + r.bottom) / 2 - mid);
          if (d < bestDist) { bestDist = d; best = i; }
        }
      });
      setActive(best);
      const hero = document.getElementById('hero');
      setVisible(hero ? hero.getBoundingClientRect().bottom < window.innerHeight * 0.3 : true);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Lenis swallows native scroll events — subscribe directly, with a retry
    // loop since Lenis may initialize after this component mounts.
    let lenisOff = null;
    const tryBind = () => {
      if (window.__lenis && window.__lenis.on) {
        window.__lenis.on('scroll', onScroll);
        lenisOff = () => window.__lenis.off && window.__lenis.off('scroll', onScroll);
        return true;
      }
      return false;
    };
    let tries = 0;
    const iv = setInterval(() => { if (tryBind() || ++tries > 40) clearInterval(iv); }, 50);

    return () => {
      window.removeEventListener('scroll', onScroll);
      clearInterval(iv);
      if (lenisOff) lenisOff();
    };
  }, []);

  return (
    <nav className={`lps-rail ${visible ? 'lps-rail-on' : ''}`} aria-label="Section progress">
      {SECTIONS.map((s, i) => (
        <a key={s.id} href={`#${s.id}`} className={`lps-rail-item ${i === active ? 'lps-rail-item-on' : ''}`}>
          <span className="lps-rail-dot" />
          <span className="lps-rail-label">{s.label}</span>
        </a>
      ))}
    </nav>
  );
}

/* Wrapper: listens for chart-variant tweak changes and re-runs the
 * path-draw ScrollTrigger animation each time the variant switches. */
function LPFlightChartWrap() {
  const [variant, setVariant] = React.useState(() => window.__LP_CHART_VARIANT || 'line');
  const [palette, setPalette] = React.useState(() => window.__LP_CHART_PALETTE || 'green');
  const wrapRef = React.useRef(null);

  React.useEffect(() => {
    const onChange = (e) => {
      if (e.detail?.variant) setVariant(e.detail.variant);
      if (e.detail?.palette) setPalette(e.detail.palette);
    };
    window.addEventListener('lp-chart-change', onChange);
    return () => window.removeEventListener('lp-chart-change', onChange);
  }, []);

  React.useEffect(() => {
    if (!window.gsap || !window.ScrollTrigger || !wrapRef.current) return;
    const paths = wrapRef.current.querySelectorAll('.lps-sim-path');
    paths.forEach((p) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      gsap.to(p, {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: wrapRef.current.closest('.lps-sim'),
          start: 'top 70%', end: 'top 15%', scrub: 0.5,
        },
      });
    });
    // Refresh so ScrollTrigger picks up the new path instantly
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }, [variant, palette]);

  const FC = window.FlightChart;
  return (
    <div ref={wrapRef}>
      {FC ? <FC variant={variant} palette={palette} /> : null}
    </div>
  );
}

/* ───────────────────────────  MAIN PAGE  ──────────────────────────── */
function LPScroll() {
  const rootRef = React.useRef(null);
  const heroStageRef = React.useRef(null);
  const progressRef = React.useRef(0);

  // Wait for ScrollTrigger to load
  React.useEffect(() => {
    let cancelled = false;
    const attempt = () => {
      if (cancelled) return;
      if (window.gsap && window.ScrollTrigger) {
        window.gsap.registerPlugin(window.ScrollTrigger);
        setupScroll();
      } else setTimeout(attempt, 40);
    };
    attempt();
    return () => { cancelled = true; };
  }, []);

  const setupScroll = () => {
    const gsap = window.gsap;
    const ST = window.ScrollTrigger;
    const scope = rootRef.current;
    if (!scope) return;

    // 1. Hero pin: globe scales up and moves as you scroll.
    ST.create({
      trigger: scope.querySelector('.lps-hero'),
      start: 'top top',
      end: '+=120%',
      pin: scope.querySelector('.lps-hero-pin'),
      pinSpacing: true,
      scrub: 0.4,
      onUpdate: self => { progressRef.current = self.progress; },
    });
    gsap.to(scope.querySelector('.lps-hero-stage'), {
      scale: 1.25,
      ease: 'none',
      scrollTrigger: {
        trigger: scope.querySelector('.lps-hero'),
        start: 'top top',
        end: '+=120%',
        scrub: 0.4,
      },
    });
    gsap.to(scope.querySelector('.lps-hero-copy'), {
      y: -120, opacity: 0, ease: 'none',
      scrollTrigger: {
        trigger: scope.querySelector('.lps-hero'),
        start: 'top top', end: '+=60%', scrub: 0.4,
      },
    });
    gsap.to(scope.querySelector('.lps-hero-meta'), {
      opacity: 0, y: -40, ease: 'none',
      scrollTrigger: {
        trigger: scope.querySelector('.lps-hero'),
        start: 'top top', end: '+=40%', scrub: 0.4,
      },
    });

    // 2. Big type manifesto: letters & clauses wipe in
    scope.querySelectorAll('.lps-reveal').forEach(el => {
      gsap.from(el, {
        opacity: 0, y: 60, ease: 'power3.out', duration: 0.9,
        scrollTrigger: { trigger: el, start: 'top 82%' },
      });
    });

    // 3. Word-by-word for .lps-words
    scope.querySelectorAll('.lps-words').forEach(el => {
      const words = el.innerText.trim().split(/\s+/);
      el.innerHTML = words.map(w => `<span class="lps-word"><span>${w}</span></span>`).join(' ');
      gsap.from(el.querySelectorAll('.lps-word > span'), {
        yPercent: 110,
        opacity: 0,
        duration: 0.8,
        stagger: 0.025,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 80%' },
      });
    });

    // 4. Counters
    scope.querySelectorAll('[data-counter]').forEach(el => {
      const end = parseFloat(el.getAttribute('data-counter'));
      const dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
      const obj = { v: 0 };
      gsap.to(obj, {
        v: end, duration: 1.6, ease: 'power2.out',
        onUpdate: () => { el.textContent = obj.v.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }); },
        scrollTrigger: { trigger: el, start: 'top 85%' },
      });
    });

    // 5. Parts catalog — frame draw + stagger rows + highlight sweep
    const partsSection = scope.querySelector('.lps-parts-section');
    if (partsSection) {
      const frame = partsSection.querySelector('.lps-parts-frame');
      const corners = partsSection.querySelectorAll('.lps-parts-corner');
      const rows = partsSection.querySelectorAll('.lps-parts-row');
      const hl = partsSection.querySelector('.lps-parts-row.is-hl');

      gsap.from(frame, {
        opacity: 0, y: 20, duration: 0.8, ease: 'power2.out',
        scrollTrigger: { trigger: partsSection, start: 'top 70%' },
      });
      gsap.from(corners, {
        opacity: 0, scale: 0.6, duration: 0.5, stagger: 0.08, delay: 0.2,
        ease: 'power2.out',
        scrollTrigger: { trigger: partsSection, start: 'top 70%' },
      });
      gsap.from(rows, {
        opacity: 0, x: 18, duration: 0.5, stagger: 0.06, ease: 'power2.out',
        scrollTrigger: { trigger: partsSection, start: 'top 65%' },
      });
      if (hl) {
        gsap.fromTo(hl,
          { backgroundColor: 'rgba(76,175,80,0.0)' },
          {
            backgroundColor: 'rgba(76,175,80,0.10)',
            duration: 0.6, ease: 'power1.out',
            scrollTrigger: { trigger: partsSection, start: 'top 50%' },
          }
        );
      }
    }

    // 6. Flight chart path drawing — handled by LPFlightChartWrap (reacts to variant changes).

    // 7. Dispersion: simple sequenced reveal matching new map structure
    const dispSvg = scope.querySelector('.lps-disp-svg');
    const dispSection = scope.querySelector('.lps-disp');
    if (dispSvg && dispSection) {
      const dispEll = dispSvg.querySelectorAll('.lps-disp-ell');
      const dispDots = dispSvg.querySelectorAll('.lps-dot');
      if (dispEll.length || dispDots.length) {
        const dispTl = gsap.timeline({
          scrollTrigger: { trigger: dispSection, start: 'top 70%' },
        });
        if (dispEll.length) dispTl.from(dispEll, {
          opacity: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out',
        });
        if (dispDots.length) dispTl.from(dispDots, {
          opacity: 0, scale: 0, transformOrigin: '50% 50%',
          duration: 0.4, stagger: 0.003, ease: 'power2.out',
        }, '-=0.2');
      }
    }

    // 8. Validation rows slide in
    const valRows = scope.querySelectorAll('.lps-val-row');
    const valSection = scope.querySelector('.lps-validation');
    if (valRows.length && valSection) {
      gsap.from(valRows, {
        x: 40, opacity: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out',
        scrollTrigger: { trigger: valSection, start: 'top 75%' },
      });
    }

    // 9. Export cards flip up
    const expCards = scope.querySelectorAll('.lps-exp-card');
    const expSection = scope.querySelector('.lps-exports');
    if (expCards.length && expSection) {
      gsap.from(expCards, {
        y: 60, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out',
        scrollTrigger: { trigger: expSection, start: 'top 75%' },
      });
    }

    // 10. CTA telemetry dash grows
    const ctaStats = scope.querySelectorAll('.lps-cta-stat');
    const ctaSection = scope.querySelector('.lps-cta');
    if (ctaStats.length && ctaSection) {
      gsap.from(ctaStats, {
        y: 20, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out',
        scrollTrigger: { trigger: ctaSection, start: 'top 75%' },
      });
    }

    // Cleanup on unmount
    return () => ST.getAll().forEach(s => s.kill());
  };

  return (
    <div ref={rootRef} className="lps-root">
      <LPScrollStyles />
      <LPProgressRail />

      {/* Top chrome — sticky header */}
      <nav className="lps-nav">
        <div className="lps-brand"><span className="lps-brand-dot" /> RECOVERYSYS <span className="lps-brand-v">v1.2</span></div>
        <div className="lps-nav-links">
          <a href="#parts">PARTS</a>
          <a href="#sim">SIMULATION</a>
          <a href="#dispersion">DISPERSION</a>
          <a href="#validation">VALIDATION</a>
        </div>
        <div className="lps-nav-right">
          <span className="lps-nav-meta">BUILD_20260427</span>
          <a href="https://github.com/akhan157/RecoverySys" className="lps-btn lps-btn--ghost">GITHUB →</a>
          <a href="../?demo=1" className="lps-btn lps-btn--green">LAUNCH ▶</a>
        </div>
      </nav>

      {/* HERO — pinned scroll-reactive globe */}
      <section className="lps-hero" id="hero">
        <div className="lps-hero-pin">
          <div className="lps-hero-grid" />
          <div className="lps-hero-stage" ref={heroStageRef}>
            <LPScrollGlobe progressRef={progressRef} />
          </div>
          <div className="lps-hero-meta">
            <span>SYS.MISSION_CONTROL</span>
            <span>NODE 7A3F-22</span>
            <span>42.39°N / 71.12°W</span>
            <span className="lps-hero-live">● LIVE</span>
          </div>
          <div className="lps-hero-copy">
            <div className="lps-hero-kicker">// FOR L1 / L2 / L3 HPR RECOVERY BAY DESIGN</div>
            <h1 className="lps-hero-title">
              RECOVERY_BAY<br/>
              CONFIGURATION <span className="lps-green">+</span><br/>
              FLIGHT_SIMULATION
            </h1>
            <p className="lps-hero-sub">
              Browser tool for L1 / L2 / L3 high-power rocketry. Configure a recovery bay
              from a 189-part catalog, predict apogee with an RK4 engine and Mach-dependent
              drag, and plot landing dispersion via 500-iteration Monte Carlo. Free. No account.
              Runs entirely in your browser.
            </p>
            <div className="lps-hero-ctas">
              <a href="../?demo=1" className="lps-btn lps-btn--green lps-btn--lg">▶ RUN_A_SIMULATION</a>
              <a href="../?demo=1#parts" className="lps-btn lps-btn--lg">PARTS_CATALOG →</a>
            </div>
            <div className="lps-hero-dots">
              <span>◉ NO_SIGNUP</span>
              <span>◉ CLIENT_SIDE</span>
              <span>◉ OPEN_SOURCE</span>
            </div>
          </div>
          <div className="lps-scroll-hint">
            <span>SCROLL</span>
            <div className="lps-scroll-line"><div /></div>
          </div>
        </div>
      </section>

      {/* MANIFESTO — big type, scroll-reveal per word */}
      <section className="lps-manifesto">
        <div className="lps-label lps-reveal">// WHY_IT_EXISTS</div>
        <h2 className="lps-words">
          Existing HPR simulators focus on the motor and ascent. Few handle
          what happens after apogee. This tool covers recovery: bay layout,
          descent rate, shock load, and landing dispersion.
        </h2>
        <div className="lps-manifesto-sig lps-reveal">
          <span>— MISSION_ENG</span>
          <span>SIGNED 2026-04-22</span>
        </div>
      </section>

      {/* PARTS — two-column catalog with framed list */}
      <section className="lps-parts-section" id="parts">
        <div className="lps-section-head">
          <span>PARTS_CATALOG</span>
          <span>189 PARTS · 11 MFRS · 05 CATEGORIES</span>
        </div>
        <div className="lps-parts-inner">
          <div className="lps-parts-left">
            <h2 className="lps-parts-hero lps-reveal">
              <span className="lps-parts-hero-l1">Parts catalog.</span>
              <span className="lps-parts-hero-l2">Pick what's in your bay.</span>
            </h2>
            <p className="lps-parts-copy lps-reveal">
              Browse 189 parachutes, altimeters, GPS beacons, shock cords, and
              recovery hardware from 11 manufacturers. Filter by category,
              diameter, or impulse class. Add custom parts — they save to your
              browser and stay there.
            </p>
            <div className="lps-parts-kv">
              <div className="lps-parts-kv-row">
                <span className="lps-parts-kv-k">CATEGORIES</span>
                <span className="lps-parts-kv-v">05 (CHUTE / ALT / GPS / CORD / HARDWARE)</span>
              </div>
              <div className="lps-parts-kv-row">
                <span className="lps-parts-kv-k">COMPONENTS</span>
                <span className="lps-parts-kv-v">189</span>
              </div>
              <div className="lps-parts-kv-row">
                <span className="lps-parts-kv-k">CUSTOM_PARTS</span>
                <span className="lps-parts-kv-v">PERSISTED · LOCALSTORAGE</span>
              </div>
            </div>
          </div>

          <div className="lps-parts-right">
            <div className="lps-parts-frame">
              {/* corner brackets */}
              <span className="lps-parts-corner lps-parts-corner--tl" />
              <span className="lps-parts-corner lps-parts-corner--tr" />
              <span className="lps-parts-corner lps-parts-corner--bl" />
              <span className="lps-parts-corner lps-parts-corner--br" />

              <ul className="lps-parts-list">
                {[
                  { dot: '#4aa3ff', name: 'Fruity Chutes Iris Ultra 48"',   a: '48 in',   b: '280 g' },
                  { dot: '#4aa3ff', name: 'Rocketman R14',                  a: '14 in',   b: '85 g'  },
                  { dot: '#4caf50', name: 'AltusMetrum TeleMega v3.0',      a: '0.84"',   b: '52 g', hl: true },
                  { dot: '#4aa3ff', name: 'Featherweight Raven 4',          a: '0.56"',   b: '15 g'  },
                  { dot: '#f5a623', name: 'Eggfinder TRS v3',               a: '0.62"',   b: '32 g'  },
                  { dot: '#4caf50', name: 'Tubular Nylon 1" · 30ft',        a: '1 in',    b: '205 g' },
                  { dot: '#4aa3ff', name: 'Sky Angle CERT-3 XL',            a: '60 in',   b: '410 g' },
                ].map((p, i) => (
                  <li key={i} className={`lps-parts-row${p.hl ? ' is-hl' : ''}`} data-idx={i}>
                    <span className="lps-parts-dot" style={{ background: p.dot }} />
                    <span className="lps-parts-name">{p.name}</span>
                    <span className="lps-parts-a">{p.a}</span>
                    <span className="lps-parts-b">{p.b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SIM — flight chart draws as you scroll */}
      <section className="lps-sim" id="sim">
        <div className="lps-section-head">
          <span>PHYSICS_SIMULATION</span>
          <span>CLIENT_SIDE · &lt;50ms</span>
        </div>
        <div className="lps-sim-inner">
          <div className="lps-sim-copy">
            <h2 className="lps-section-title lps-reveal">Flight<br/> <span className="lps-green">simulation.</span></h2>
            <p className="lps-section-sub lps-words">
              4th-order Runge-Kutta ascent integration with Mach-dependent drag,
              Tsiolkovsky mass depletion, and full ISA atmosphere. Computes apogee,
              descent rates, shock load with safety factor, and landing kinetic energy.
              Import .eng thrust curves for ±2-3% apogee accuracy.
            </p>
            <div className="lps-sim-stats">
              {[
                ['APOGEE', 5847, 'FT', 0, '#fff'],
                ['DESCENT', 15.3, 'FT/S', 1, '#f5a623'],
                ['DRIFT', 1240, 'FT', 0, '#fff'],
                ['PEAK_SHOCK', 384, 'LBS', 0, '#fff'],
                ['FLIGHT_TIME', 84, 'S', 0, '#fff'],
              ].map(([l, v, u, dec, c]) => (
                <div key={l} className="lps-sim-stat">
                  <div className="lps-label">{l}</div>
                  <div className="lps-sim-stat-v" style={{ color: c }}>
                    <span data-counter={v} data-decimals={dec}>0</span><span className="lps-sim-stat-u">{u}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lps-sim-chart">
            <div className="lps-panel-head"><span>FLIGHT_PROFILE · 7A3F-22</span><span>L2 · K-CLASS</span></div>
            <LPFlightChartWrap />
          </div>
        </div>
      </section>

      {/* DISPERSION — dots pop in + big type */}
      <section className="lps-disp" id="dispersion">
        <div className="lps-section-head">
          <span>DISPERSION_MAP</span>
          <span>500-TRIAL_MONTE_CARLO</span>
        </div>
        <div className="lps-disp-inner">
          <div className="lps-disp-copy">
            <h2 className="lps-section-title lps-reveal">Landing<br/><span className="lps-amber-accent">dispersion.</span></h2>
            <p className="lps-section-sub lps-words">
              Multi-parameter Monte Carlo perturbs wind (±30%), drag coefficient
              (±10%), mass (±2%), deploy altitude (±50ft), and motor impulse (±3%)
              across 500 iterations. Landing scatter with 95% confidence ellipse
              on Leaflet tiles so you know the landing zone before you fly.
            </p>

            <div className="lps-disp-stats-strip">
              <div className="lps-disp-strip-title">Dispersion Map (Monte Carlo)</div>
              <div className="lps-disp-stat-row"><span className="lps-disp-stat-k">Drift</span><span className="lps-disp-stat-v">2,988 ft <span className="lps-dim">(0.91 km)</span></span></div>
              <div className="lps-disp-stat-row"><span className="lps-disp-stat-k">Direction</span><span className="lps-disp-stat-v">E (76°)</span></div>
              <div className="lps-disp-stat-row"><span className="lps-disp-stat-k">Drogue</span><span className="lps-disp-stat-v lps-amber">2,354 ft / 186 s</span></div>
              <div className="lps-disp-stat-row"><span className="lps-disp-stat-k">Main</span><span className="lps-disp-stat-v lps-red">668 ft / 43 s</span></div>
              <div className="lps-disp-stat-row"><span className="lps-disp-stat-k">95% ellipse</span><span className="lps-disp-stat-v">443 × 371 m</span></div>
            </div>
          </div>
          <div className="lps-disp-chart">
            <div className="lps-panel-head">
              <span>DISPERSION_MAP · 7A3F-22 // LANDING_PREDICTION</span>
              <span>500_TRIALS</span>
            </div>

            <svg className="lps-disp-svg" viewBox="0 0 1000 540" width="100%" style={{ display:'block', height:'auto', aspectRatio:'1000 / 540', background:'#0a0a0a' }} preserveAspectRatio="xMidYMid meet">
              <defs>
                <pattern id="lpsMapGrid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                  <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#1e1e1e" strokeWidth="0.5"/>
                </pattern>
                <radialGradient id="lpsMc95Grad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stopColor="#e07b2d" stopOpacity="0.32"/>
                  <stop offset="70%"  stopColor="#e07b2d" stopOpacity="0.18"/>
                  <stop offset="100%" stopColor="#e07b2d" stopOpacity="0"/>
                </radialGradient>
                <filter id="lpsDotBlur" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="0.35"/>
                </filter>
              </defs>

              {/* dark map backdrop */}
              <rect width="1000" height="540" fill="#0a0a0a"/>
              <rect width="1000" height="540" fill="url(#lpsMapGrid)"/>

              {/* stylized "terrain" contours — abstract, not photographic */}
              <g stroke="#1f2524" strokeWidth="0.8" fill="none" opacity="0.9">
                <path d="M -20 120 Q 180 90 340 140 T 700 150 T 1020 130"/>
                <path d="M -20 200 Q 220 165 420 220 T 760 210 T 1020 205"/>
                <path d="M -20 395 Q 180 420 360 390 T 700 410 T 1020 398"/>
                <path d="M -20 460 Q 260 475 480 450 T 780 465 T 1020 458"/>
              </g>

              {/* water features — dashed blue, like rivers/coastline on the real map */}
              <g stroke="#2a4a6a" strokeWidth="1.2" fill="none" strokeDasharray="4 3" opacity="0.55">
                <path d="M -20 60 Q 160 90 260 75 T 420 90 T 580 70 T 780 95 T 1020 80"/>
                <path d="M 540 470 Q 620 455 700 480 T 880 475 T 1020 485"/>
              </g>

              {/* zoom controls — top left */}
              <g transform="translate(24 24)">
                <rect x="0"  y="0"  width="28" height="28" fill="#0a0a0a" stroke="#3a3a3a"/>
                <rect x="0"  y="28" width="28" height="28" fill="#0a0a0a" stroke="#3a3a3a"/>
                <line x1="9"  y1="14" x2="19" y2="14" stroke="#888" strokeWidth="1.2"/>
                <line x1="14" y1="9"  x2="14" y2="19" stroke="#888" strokeWidth="1.2"/>
                <line x1="9"  y1="42" x2="19" y2="42" stroke="#888" strokeWidth="1.2"/>
              </g>

              {/* PAD: green rectangle pill inside dashed waiver square */}
              {(() => {
                const padX = 340, padY = 290;
                return (
                  <g>
                    <rect x={padX - 40} y={padY - 40} width="80" height="80"
                          fill="none" stroke="#b58a2a" strokeWidth="1" strokeDasharray="5 4" opacity="0.75"/>
                    <rect x={padX - 9}  y={padY - 14} width="18" height="28"
                          fill="#2d5a33" stroke="#4caf50" strokeWidth="1"/>
                    {/* small blue dot at pad anchor */}
                    <circle cx={padX + 16} cy={padY} r="4" fill="#4a90e2" stroke="#0a0a0a" strokeWidth="1.2"/>
                  </g>
                );
              })()}

              {/* DROGUE VECTOR — pad -> drogue open point (amber/orange) */}
              {(() => {
                const x1 = 356, y1 = 290;
                const x2 = 540, y2 = 282;
                return (
                  <g>
                    <line className="lps-disp-vec-drogue"
                          x1={x1} y1={y1} x2={x2} y2={y2}
                          stroke="#e07b2d" strokeWidth="2.4" opacity="0.92"/>
                    <circle cx={x2} cy={y2} r="3" fill="#e07b2d"/>
                  </g>
                );
              })()}

              {/* MAIN VECTOR — drogue open -> landing centroid (red) */}
              {(() => {
                const x1 = 540, y1 = 282;
                const x2 = 762, y2 = 264;
                return (
                  <line className="lps-disp-vec-main"
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke="#d24f3a" strokeWidth="2.4" opacity="0.92"/>
                );
              })()}

              {/* 95 / 75 / 50 — nested confidence rings */}
              <g className="lps-disp-ell95" transform="translate(762 264) rotate(-8)">
                <circle r="118" fill="url(#lpsMc95Grad)"/>
                <circle r="118" fill="none" stroke="#e07b2d" strokeWidth="1.6" strokeDasharray="6 5" opacity="0.95"/>
                <circle r="84"  fill="none" stroke="#e07b2d" strokeWidth="1"   strokeDasharray="3 4" opacity="0.7"/>
                <circle r="52"  fill="none" stroke="#e07b2d" strokeWidth="1"   strokeDasharray="2 3" opacity="0.55"/>
              </g>

              {/* in-map confidence legend — top-right */}
              <g transform="translate(820 30)" fontFamily="JetBrains Mono" fontSize="9" letterSpacing="0.04em">
                <rect x="-10" y="-14" width="160" height="64" fill="#0a0a0a" stroke="#2a2a2a" opacity="0.92"/>
                <text x="0" y="0" fill="#888">CONFIDENCE</text>
                <g transform="translate(0 14)">
                  <line x1="0" x2="14" y1="0" y2="0" stroke="#e07b2d" strokeWidth="1.6" strokeDasharray="6 5"/>
                  <text x="20" y="3" fill="#cfcfcf">95% · 443×371m</text>
                </g>
                <g transform="translate(0 28)">
                  <line x1="0" x2="14" y1="0" y2="0" stroke="#e07b2d" strokeWidth="1" strokeDasharray="3 4" opacity="0.7"/>
                  <text x="20" y="3" fill="#aaa">75%</text>
                </g>
                <g transform="translate(0 42)">
                  <line x1="0" x2="14" y1="0" y2="0" stroke="#e07b2d" strokeWidth="1" strokeDasharray="2 3" opacity="0.55"/>
                  <text x="20" y="3" fill="#888">50%</text>
                </g>
              </g>

              {/* MC dots — 2D gaussian, ~95% inside the ellipse radius */}
              {(() => {
                const cx = 762, cy = 264;
                const rEll = 118;
                const sigma = rEll / 2.45; // 2D 95% radius ≈ 2.45σ
                let rng = 42;
                const rnd = () => { rng = (rng * 9301 + 49297) % 233280; return rng / 233280; };
                // Box-Muller: proper unit-variance gaussian
                const gauss = () => {
                  const u = Math.max(1e-9, rnd());
                  const v = rnd();
                  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
                };
                const dots = [];
                for (let i = 0; i < 200; i++) {
                  const ex = gauss() * sigma;
                  const ey = gauss() * sigma;
                  const x = cx + ex;
                  const y = cy + ey;
                  const t = rnd();
                  const fill = t < 0.55 ? '#d95a2a'
                             : t < 0.85 ? '#e07b2d'
                             :            '#c94a3a';
                  dots.push({ x, y, fill, i });
                }
                return dots.map(d => (
                  <circle key={d.i} className="lps-dot"
                    cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r="1.5"
                    fill={d.fill} opacity="0.78"/>
                ));
              })()}

              {/* landing centroid marker — bold red circle */}
              <circle cx="762" cy="264" r="6" fill="#d24f3a" stroke="#0a0a0a" strokeWidth="1.5"/>

              {/* legend — bottom, matches real app */}
              <g transform="translate(24 512)" fontFamily="JetBrains Mono" fontSize="10" letterSpacing="0.04em">
                <g>
                  <line x1="0"  y1="0" x2="14" y2="0" stroke="#e07b2d" strokeWidth="2"/>
                  <text x="20" y="4" fill="#888">Drogue vector</text>
                </g>
                <g transform="translate(120 0)">
                  <line x1="0"  y1="0" x2="14" y2="0" stroke="#d24f3a" strokeWidth="2"/>
                  <text x="20" y="4" fill="#888">Main vector</text>
                </g>
                <g transform="translate(220 0)">
                  <circle cx="6" cy="0" r="2" fill="#d95a2a"/>
                  <text x="16" y="4" fill="#888">MC scatter (500 pts)</text>
                </g>
                <g transform="translate(380 0)">
                  <circle cx="6" cy="0" r="5" fill="none" stroke="#e07b2d" strokeDasharray="2 2"/>
                  <text x="16" y="4" fill="#888">95% ellipse</text>
                </g>
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* VALIDATION — checks slide in */}
      <section className="lps-validation" id="validation">
        <div className="lps-section-head">
          <span>LIVE_COMPATIBILITY</span>
          <span>20+ RULES · REALTIME</span>
        </div>
        <div className="lps-val-inner">
          <div>
            <h2 className="lps-section-title lps-reveal">Compatibility<br/><span className="lps-amber-accent">checks.</span></h2>
            <p className="lps-section-sub lps-words">
              Every change re-runs 20+ rules: landing KE vs NAR/TRA guidelines,
              opening shock at main deploy, dynamic snatch force from cord elongation,
              packing volume with 70% efficiency factor, deploy altitude sanity, cord/chute
              material mismatch, and more. Issues surface before they matter on the pad.
            </p>
          </div>
          <div className="lps-val-rows">
            {[
              { lvl: 'ok', t: '✓ LANDING_KE_OK', b: 'Landing KE 42 ft-lbf — within 75 ft-lbf NAR/TRA guideline.' },
              { lvl: 'ok', t: '✓ SAFETY_FACTOR_PASS', b: 'Shock cord SF 4.2× — passes nylon threshold of 4.0×.' },
              { lvl: 'warn', t: '▲ OPENING_SHOCK', b: 'Main chute opening shock ~320 lbs at 62 fps approaching cord limit (500 lbs).' },
              { lvl: 'warn', t: '▲ DUAL_DEPLOY_NO_DBAG', b: 'No deployment bag — main opens uncontrolled at drogue speed.' },
              { lvl: 'crit', t: '■ SNATCH_FORCE', b: 'Kevlar 3% elongation amplifies snatch 5.8× — dynamic load 1290 lbs exceeds 1500 lbs rating.' },
            ].map((r, i) => {
              const color = r.lvl === 'crit' ? '#e74c3c' : r.lvl === 'warn' ? '#f5a623' : '#4caf50';
              const bg = r.lvl === 'crit' ? 'rgba(231,76,60,0.06)' : r.lvl === 'warn' ? 'rgba(245,166,35,0.06)' : 'rgba(76,175,80,0.06)';
              return (
                <div key={i} className="lps-val-row" style={{ background: bg, borderLeft: `3px solid ${color}` }}>
                  <div className="lps-val-t" style={{ color }}>{r.t}</div>
                  <div className="lps-val-b">{r.b}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lps-cta">
        <div className="lps-label lps-reveal">// GET STARTED</div>
        <h2 className="lps-cta-title lps-reveal">Open the<br/><span className="lps-green">tool.</span></h2>
        <p className="lps-cta-sub lps-words">
          Runs entirely in your browser. No account, no server, no tracking.
          Your configurations save locally and stay on your machine.
        </p>
        <div className="lps-cta-row">
          <a href="../?demo=1" className="lps-btn lps-btn--green lps-btn--lg">▶ OPEN_THE_TOOL</a>
          <a href="https://github.com/akhan157/RecoverySys" className="lps-btn lps-btn--lg">GITHUB →</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lps-footer">
        <div className="lps-footer-top">
          <div>
            <div className="lps-brand"><span className="lps-brand-dot"/> RECOVERYSYS</div>
            <div className="lps-footer-tag">Recovery bay design &amp; simulation for high-power rocketry.</div>
          </div>
          <div className="lps-footer-col"><div className="lps-footer-title">PRODUCT</div><a href="#">PARTS</a><a href="#">SIM</a><a href="#">DISPERSION</a><a href="#">VALIDATION</a></div>
          <div className="lps-footer-col"><div className="lps-footer-title">DOCS</div><a href="#">START</a><a href="#">PHYSICS</a><a href="#">API</a></div>
          <div className="lps-footer-col"><div className="lps-footer-title">COMMUNITY</div><a href="https://github.com/akhan157/RecoverySys">GITHUB</a><a href="https://www.nar.org">NAR</a><a href="https://www.tripoli.org">TRA</a></div>
        </div>
        <div className="lps-footer-bot">
          <span>© 2026 RECOVERYSYS · MIT</span>
          <span>BUILD_20260427</span>
          <span>NODE 7A3F-22 · NOMINAL</span>
        </div>
      </footer>
    </div>
  );
}

Object.assign(window, { LPScroll, LPScrollGlobe });
