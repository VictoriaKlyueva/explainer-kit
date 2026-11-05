/* explainer-kit · ambient.js — the backdrop behind the content.
   Types: "ocean" (water gradient that darkens with depth, light rays, marine snow, sprite
   creatures), "grid" (blueprint lines), "plain" (just the background). Any type can add
   "grain" and "vignette". Settings come from theme.json → ambient, overridable in config.json. */
const Ambient = (() => {
  const base = KIT.theme.ambient || {};
  const over = KIT.config.ambient;
  const A = Object.assign({ type: 'plain' }, base, typeof over === 'object' && over ? over : {});
  if (typeof over === 'string' && over !== 'theme') A.type = over;
  const deck = KIT.format === 'deck';
  let root, water, rays, depth = 0, W = 0, H = 0, run = true;
  const canv = {}, sharks = [], flakes = [];
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mixHex = (a, b, t) => { const P = hex(a), Q = hex(b); return `rgb(${P.map((v, i) => Math.round(lerp(v, Q[i], t))).join(',')})`; };

  function layer(cls, tag = 'div') { const e = document.createElement(tag); e.className = cls; root.appendChild(e); return e; }
  function init() {
    if (A.type === 'none') return;
    root = document.createElement('div'); root.id = 'ambient'; root.setAttribute('aria-hidden', 'true');
    document.body.prepend(root);
    if (A.type === 'ocean') ocean();
    if (A.type === 'grid') layer('amb-grid');
    if (A.vignette) layer('amb-vignette');
    if (A.grain) { const g = layer('amb-grain amb-fx'); g.style.setProperty('--grain', A.grain); }
    setDepth(deck ? (A.deckDepth ?? 0.15) : 0);
  }

  /* ---------- ocean ---------- */
  function ocean() {
    water = layer('amb-water');
    if (A.rays) {
      rays = layer('amb-rays amb-fx' + (A.sway !== false && !REDUCED && !deck ? ' sway' : ''));
      const R = rng(7);
      for (let i = 0; i < A.rays; i++) {
        const el = document.createElement('i');
        el.style.left = (8 + i * 13 + R() * 6) + '%'; el.style.setProperty('--r', (-18 + i * 5 + R() * 4) + 'deg');
        el.style.width = (5 + R() * 8) + '%'; el.style.opacity = (0.35 + R() * 0.5).toFixed(2); el.style.animationDelay = (-R() * 14) + 's';
        rays.appendChild(el);
      }
    }
    if (A.sprite) { canv.far = layer('amb-far amb-fx', 'canvas'); canv.mid = layer('amb-mid amb-fx', 'canvas'); canv.far.style.filter = 'blur(3.4px)'; canv.mid.style.filter = 'blur(1.4px)'; canv.far.style.opacity = A.farOpacity ?? 0.22; canv.mid.style.opacity = A.midOpacity ?? 0.3; }
    if (A.snow) canv.snow = layer('amb-snow amb-fx', 'canvas');
    for (const k in canv) canv[k].ctx = canv[k].getContext('2d');
    resize(); addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { run = !document.hidden; });
    if (A.sprite) {
      const img = new Image();
      img.onload = () => { A._img = img; A._cw = img.naturalWidth / (A.spriteGrid?.[0] || 4); A._ch = img.naturalHeight / (A.spriteGrid?.[1] || 4); if (!swims()) drawStatic(); };
      img.src = A.sprite;
      const n = A.creatures ?? 4; const R = rng(3);
      for (let i = 0; i < n; i++) { const s = { layer: i < n / 2 ? 'far' : 'mid', R }; spawn(s, true); sharks.push(s); }
    }
    if (A.snow) { const n = Math.round(clamp(W * H / 18000, 40, 110)); for (let i = 0; i < n; i++) flakes.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.5 + 0.3, v: 4 + Math.random() * 9, d: Math.random() * 6, glow: !deck && Math.random() < 0.3, p: Math.random() * 6 }); }
    let last = performance.now();
    const frame = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (run) {
        if (swims()) { const { far, mid } = canv; far.ctx.clearRect(0, 0, W, H); mid.ctx.clearRect(0, 0, W, H); for (const s of sharks) { if (!REDUCED) move(s, dt); draw(s); } }
        if (canv.snow) snow(dt);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  const swims = () => !!A.sprite && (deck ? !!A.swimDeck : A.swim !== false);
  function resize() {
    const d = Math.min(window.devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight;
    for (const k in canv) { const c = canv[k]; c.width = Math.round(W * d); c.height = Math.round(H * d); c.ctx.setTransform(d, 0, 0, d, 0, 0); }
    if (A._img && !swims()) drawStatic();
  }
  function spawn(s, init) {
    const R = Math.random;
    const base = s.layer === 'far' ? 0.18 + R() * 0.12 : 0.3 + R() * 0.16;
    s.w = base * Math.max(W, 900); s.dir = R() < 0.5 ? -1 : 1;
    s.speed = (s.layer === 'far' ? 12 : 20) * (0.75 + R() * 0.5) * (s.w / 500);
    s.y = H * (0.12 + R() * 0.75); s.x = init ? R() * W : (s.dir < 0 ? W + s.w * 0.7 : -s.w * 0.7);
    s.phase = R() * 16; s.bob = R() * 6; s.fps = 7 + R() * 3; s.tilt = (R() - 0.5) * 0.06;
  }
  function move(s, dt) { s.x += s.dir * s.speed * dt; s.phase += s.fps * dt; s.bob += dt * 0.6; if ((s.dir < 0 && s.x < -s.w * 0.75) || (s.dir > 0 && s.x > W + s.w * 0.75)) spawn(s, false); }
  function draw(s) {
    if (!A._img) return;
    const ctx = canv[s.layer].ctx, cols = A.spriteGrid?.[0] || 4, frames = cols * (A.spriteGrid?.[1] || 4);
    const f = Math.floor(s.phase) % frames, h = s.w * A._ch / A._cw;
    ctx.save(); ctx.translate(s.x, s.y + Math.sin(s.bob) * 6); ctx.rotate(s.tilt); if (s.dir > 0) ctx.scale(-1, 1);
    ctx.drawImage(A._img, (f % cols) * A._cw, Math.floor(f / cols) * A._ch, A._cw, A._ch, -s.w / 2, -h / 2, s.w, h); ctx.restore();
  }
  function drawStatic() {
    // still creatures for slides: fixed, calm positions that never cross the middle of the stage
    const { far, mid } = canv; far.ctx.clearRect(0, 0, W, H); mid.ctx.clearRect(0, 0, W, H);
    const spots = [{ layer: 'far', x: 0.14, y: 0.16, w: 0.2, dir: 1 }, { layer: 'far', x: 0.6, y: 0.08, w: 0.14, dir: -1 }, { layer: 'mid', x: 0.5, y: 0.86, w: 0.4, dir: -1 }];
    spots.forEach((p, i) => draw({ layer: p.layer, x: p.x * W, y: p.y * H, w: p.w * Math.max(W, 900), dir: p.dir, phase: i * 5, bob: 0, tilt: p.dir * 0.03 }));
  }
  function snow(dt) {
    const ctx = canv.snow.ctx; ctx.clearRect(0, 0, W, H);
    for (const f of flakes) {
      if (!REDUCED) { f.y += f.v * dt * 0.6; f.d += dt * 0.3; f.x += Math.sin(f.d) * 0.15; f.p += dt * 1.4; }
      if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; }
      if (f.glow) { const a = depth * (0.35 + 0.35 * Math.sin(f.p)); if (a > 0.02) { ctx.globalAlpha = a; ctx.fillStyle = A.glow || '#72d8c6'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r + 0.8, 0, 7); ctx.fill(); ctx.globalAlpha = 1; } }
      else { ctx.fillStyle = `rgba(220,235,230,${(0.16 + 0.18 * (1 - depth)).toFixed(3)})`; ctx.fillRect(f.x, f.y, f.r, f.r); }
    }
  }

  /* depth 0…1: page scroll position, or a fixed value for slides */
  function setDepth(f) {
    depth = f;
    if (!water || !A.stops) return;
    const st = A.stops; let i = 0; while (i < st.length - 2 && f > st[i + 1][0]) i++;
    const a = st[i], b = st[i + 1], t = clamp((f - a[0]) / (b[0] - a[0]), 0, 1);
    water.style.background = `linear-gradient(180deg, ${mixHex(a[1], b[1], t)} 0%, ${mixHex(a[2], b[2], t)} 45%, ${mixHex(a[3], b[3], t)} 100%)`;
    if (rays) rays.style.opacity = lerp(a[4], b[4], t).toFixed(3);
    const br = lerp(a[5] ?? 1, b[5] ?? 1, t).toFixed(3);
    if (canv.far) { canv.far.style.filter = `blur(3.4px) brightness(${br})`; canv.mid.style.filter = `blur(1.4px) brightness(${br})`; }
  }
  const toggle = () => document.body.classList.toggle('ambient-off');
  return { init, setDepth, toggle, settings: A };
})();
