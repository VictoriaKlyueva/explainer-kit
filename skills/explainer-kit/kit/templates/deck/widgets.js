/* Content widgets for the slides template. Same helpers as on a page; onShow fires when the
   slide opens, onStep on every click. Colors are theme tokens, so a theme switch needs no code. */

/* ---------- calculator on a slide ---------- */
(() => {
  const svg = $('#calc'); if (!svg) return;
  let P = 100000;
  const SER = [{ r: 0.04, col: COL.accent2 }, { r: 0.08, col: COL.accent }, { r: 0.12, col: COL.warn }, { r: 0.08, simple: true, col: COL.muted }];
  const val = (s, n) => s.simple ? P * (1 + s.r * n) : P * (1 + s.r) ** n;
  const years = slider('#calc-n', v => v + ' лет', draw);
  chips($('#calc-p'), b => { P = +b.dataset.p; draw(); });
  function draw() {
    const N = years ? years() : 30;
    const c = chart(svg, { box: [90, 20, 640, 380], x: { min: 0, max: 40, ticks: [0, 10, 20, 30, 40], title: 'лет' }, y: { min: 5e4, max: 3e7, log: true, ticks: [1e5, 1e6, 1e7], fmt: v => v >= 1e6 ? fmt(v / 1e6) + ' млн' : fmt(v / 1e3) + ' тыс' } });
    SER.forEach(s => c.line(Array.from({ length: 41 }, (_, n) => [n, val(s, n)]), { stroke: s.col, 'stroke-dasharray': s.simple ? '5 5' : null, 'stroke-width': 3 }));
    c.vline(N);
    SER.forEach(s => { c.dot(N, val(s, N), { fill: s.col, r: 6 }); });
    T(c.g, c.X(N) + (N > 30 ? -10 : 10), c.Y(val(SER[1], N)) - 12, fmt(val(SER[1], N)), { fill: COL.accent, 'font-size': 16, 'text-anchor': N > 30 ? 'end' : 'start' });
  }
  draw();
})();

/* ---------- step-by-step diagram: rule of 72 ----------
   Step 0 shows today; every click adds one doubling. On a page (no clicks) onStep gives
   Infinity, and the diagram shows its final state. */
(() => {
  const svg = $('#steps'); if (!svg) return;
  const base = 440, unit = 19; // 100 000 = 19 px of bar height
  function draw(step) {
    svg.innerHTML = '';
    const defs = S('defs', {}, svg), m = S('marker', { id: 'arr', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 8, markerHeight: 8, orient: 'auto' }, defs);
    S('path', { d: 'M0 0L10 5L0 10z', fill: COL.accent2 }, m);
    S('line', { x1: 0, y1: base + 0.5, x2: 1408, y2: base + 0.5, stroke: COL.line2 }, svg);
    const last = Math.min(step, 3) + 1;
    for (let i = 0; i <= last; i++) {
      const x = 60 + i * 300, h = unit * 2 ** i;
      S('rect', { x, y: base - h, width: 150, height: h, fill: i === last ? COL.accent : mix(COL.accent, 35), rx: 2 }, svg);
      T(svg, x + 75, base - h - 14, fmt(100000 * 2 ** i), { 'text-anchor': 'middle', 'font-size': 22, fill: COL.ink });
      T(svg, x + 75, base + 34, i === 0 ? 'сейчас' : `через ${9 * i} лет`, { 'text-anchor': 'middle', 'font-size': 18, fill: COL.muted });
      if (i > 0) {
        S('path', { d: `M${x - 140} ${base - 20} q 60 -60 120 0`, fill: 'none', stroke: COL.accent2, 'stroke-width': 2, 'marker-end': 'url(#arr)' }, svg);
        T(svg, x - 80, base - 64, '×2', { 'text-anchor': 'middle', 'font-size': 20, fill: COL.accent2 });
      }
    }
    T(svg, 0, 30, last === 4 ? '72 / 8 = 9 лет на каждое удвоение: за 36 лет — ×16' : '72 / ставка в % = лет до удвоения', { 'font-size': 22, fill: COL.ink2 });
  }
  onStep(svg, s => draw(s === Infinity ? 3 : s));
})();
