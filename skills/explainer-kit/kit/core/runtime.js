/* explainer-kit · runtime.js — helpers shared by both formats and by content widgets.
   build.mjs puts `window.KIT = { format, config, theme }` before this file. */
const KIT = window.KIT || { format: 'page', config: {}, theme: {} };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

/* Theme colors for SVG. They are CSS variables, so widgets follow the theme and its
   light/dark switch without redrawing. Legacy names (lamp, bio…) keep old widgets working. */
const COL = {
  bg: 'var(--bg)', surface: 'var(--surface)', surface2: 'var(--surface-2)',
  ink: 'var(--ink)', ink2: 'var(--ink-2)', muted: 'var(--muted)', line: 'var(--line)', line2: 'var(--line-2)',
  accent: 'var(--accent)', accentInk: 'var(--accent-ink)', accent2: 'var(--accent-2)', warn: 'var(--warn)', extra: 'var(--extra)'
};
Object.assign(COL, { lamp: COL.accent, bio: COL.accent2, coral: COL.warn, violet: COL.extra, bone: COL.ink, fog: COL.muted, lineS: COL.line2, cell: COL.surface2 });
const SERIES = [COL.accent, COL.accent2, COL.warn, COL.extra, COL.ink];
/* translucent version of any color: mix(COL.accent, 20) */
const mix = (c, pct, base = 'transparent') => `color-mix(in srgb, ${c} ${pct}%, ${base})`;
/* a real color string for <canvas>, which cannot read CSS variables */
function cssColor(c) {
  const m = /^var\((--[\w-]+)\)$/.exec(c);
  if (!m) return c;
  return getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || '#888';
}

/* SVG builder. Paint attributes given as var()/color-mix() go to `style`, where they work everywhere. */
const PAINT = new Set(['fill', 'stroke', 'stop-color', 'color', 'flood-color']);
function S(tag, attrs = {}, parent) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  let style = '';
  for (const k in attrs) {
    const v = attrs[k];
    if (v === undefined || v === null) continue;
    if (k === 'style') style += v + ';';
    else if (PAINT.has(k) && typeof v === 'string' && /^(var|color-mix)\(/.test(v)) style += `${k}:${v};`;
    else e.setAttribute(k, v);
  }
  if (style) e.setAttribute('style', style);
  if (parent) parent.appendChild(e);
  return e;
}
function T(parent, x, y, txt, attrs = {}) { const t = S('text', Object.assign({ x, y, fill: COL.muted, 'font-size': 13 }, attrs), parent); t.textContent = txt; return t; }
/* HTML builder: H('div', {class: 'card'}, '<b>hi</b>', parent) */
function H(tag, attrs = {}, html, parent) { const e = document.createElement(tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (html !== undefined) e.innerHTML = html; if (parent) parent.appendChild(e); return e; }

/* a row of toggle buttons: chips(box, btn => …); the clicked one gets .on */
function chips(box, cb) {
  if (!box) return;
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !box.contains(b)) return;
    $$('button', box).forEach(x => x.classList.toggle('on', x === b));
    cb(b);
  });
}
/* a range input with its <output>: slider('#id', v => label, v => redraw). Returns a getter.
   The callback fires on input only, so draw once yourself after setting up. */
function slider(sel, label, cb) {
  const el = typeof sel === 'string' ? $(sel) : sel; if (!el) return () => 0;
  const out = el.parentElement.querySelector('output');
  const upd = (fire = true) => { const v = +el.value; if (out && label) out.textContent = label(v); if (cb && fire) cb(v); };
  el.addEventListener('input', () => upd()); upd(false);
  return () => +el.value;
}
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

/* numbers in the page language: minus sign, local decimal separator, units */
const LOCALE = KIT.config.lang || document.documentElement.lang || 'ru';
const RU = /^ru/.test(LOCALE);
function fmt(v, d = 0) { const s = Math.abs(v).toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d }); return (v < 0 ? '−' : '') + s; }
const ru = (v, d = 2) => fmt(v, d); // legacy name
function fmtBytes(b) {
  const U = RU ? ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'] : ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0; while (b >= 1024 && i < U.length - 1) { b /= 1024; i++; }
  return (i === 0 ? Math.round(b) : fmt(b, b >= 10 ? 0 : 1)) + ' ' + U[i];
}
const fmtTok = n => n >= 1048576 ? fmt(n / 1048576, n % 1048576 ? 1 : 0) + 'M' : n >= 1024 ? Math.round(n / 1024) + 'K' : String(n);
function sci(v) { if (v === 0) return '0'; const e = Math.floor(Math.log10(Math.abs(v))); const m = v / 10 ** e; const sup = String(e).replace('-', '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]); return fmt(m, 1) + '·10' + sup; }

/* lifecycle that works in both formats:
   onShow(el, enter, leave) — slide entered / element scrolled into view
   onStep(el, fn)           — deck: fn(step) on every click; page: fn(Infinity) once, the final state */
function whenVisible(el, start, stop) {
  if (!('IntersectionObserver' in window)) { start(); return; }
  new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? start() : stop && stop())), { threshold: 0.05 }).observe(el);
}
function onShow(el, enter, leave) {
  const s = KIT.format === 'deck' && el.closest('.slide');
  if (s) { if (enter) s.addEventListener('slide:enter', enter); if (leave) s.addEventListener('slide:leave', leave); }
  else whenVisible(el, enter || (() => {}), leave);
}
function onStep(el, fn) {
  const s = KIT.format === 'deck' && el.closest('.slide');
  if (s) s.addEventListener('slide:step', e => fn(e.detail)); else fn(Infinity);
}
/* animation loop that runs only while its element is visible: loop(el, dt => …) */
function loop(el, fn) {
  let raf = 0, last = 0;
  const tick = now => { const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now; fn(dt, now); raf = requestAnimationFrame(tick); };
  const start = () => { if (raf) return; if (REDUCED) { fn(0, performance.now()); return; } last = performance.now(); raf = requestAnimationFrame(tick); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  onShow(el, start, stop);
  return { start, stop };
}

/* ---------- tiny chart helper: axes + lines on linear or log scales ----------
   chart(svg, { x: {min, max, log, ticks, fmt, title}, y: {…}, box: [l, t, r, b] })
   returns { X, Y, line(points, attrs), dot(x, y, attrs), vline(x, attrs), g } */
function chart(svg, o) {
  svg.innerHTML = '';
  const [L, Tp, R, B] = o.box || [70, 20, 980, 360];
  const ax = a => { const f = a.log ? Math.log10 : v => v; return { f, lo: f(a.min), hi: f(a.max) }; };
  const xa = ax(o.x), ya = ax(o.y);
  const X = v => L + (xa.f(v) - xa.lo) / (xa.hi - xa.lo) * (R - L);
  const Y = v => B - (ya.f(clamp(v, o.y.min, o.y.max)) - ya.lo) / (ya.hi - ya.lo) * (B - Tp);
  const g = S('g', {}, svg);
  (o.y.ticks || []).forEach(v => { S('line', { x1: L, y1: Y(v), x2: R, y2: Y(v), stroke: COL.line }, g); T(g, L - 10, Y(v) + 4, (o.y.fmt || String)(v), { 'text-anchor': 'end', 'font-size': 12 }); });
  (o.x.ticks || []).forEach(v => { S('line', { x1: X(v), y1: Tp, x2: X(v), y2: B, stroke: COL.line }, g); T(g, X(v), B + 20, (o.x.fmt || String)(v), { 'text-anchor': 'middle', 'font-size': 12 }); });
  if (o.x.title) T(g, (L + R) / 2, B + 42, o.x.title, { 'text-anchor': 'middle', 'font-size': 12 });
  if (o.y.title) T(g, L, Tp - 6, o.y.title, { 'font-size': 12 });
  return {
    X, Y, g,
    line: (pts, a = {}) => S('path', Object.assign({ d: 'M' + pts.map(p => X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join('L'), fill: 'none', stroke: COL.accent, 'stroke-width': 2.5 }, a), g),
    dot: (x, y, a = {}) => S('circle', Object.assign({ cx: X(x), cy: Y(y), r: 5, fill: COL.accent }, a), g),
    vline: (x, a = {}) => S('line', Object.assign({ x1: X(x), y1: Tp, x2: X(x), y2: B, stroke: COL.accent, 'stroke-dasharray': '4 4' }, a), g)
  };
}

/* inline SVG icons (stroke = currentColor; width/cap come from theme tokens) */
const ICON = {
  pen: '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/><path d="M14 6l3 3"/>',
  marker: '<path d="M9 15l-4 5h6l1.5-2"/><path d="M8.5 14.5l7-9 4 3-7 9z"/>',
  laser: '<circle cx="12" cy="12" r="2.5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  eraser: '<path d="M8 20h12"/><path d="M4.5 15.5l9-9a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L12 18H7z"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', notes: '<path d="M5 4h14v16H5z"/><path d="M8 9h8M8 13h8M8 17h5"/>'
};
const icon = (name, size = 18) => `<svg class="ico" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" style="stroke-width:var(--icon-stroke,1.7);stroke-linecap:var(--icon-cap,round);stroke-linejoin:round">${ICON[name] || ''}</svg>`;
