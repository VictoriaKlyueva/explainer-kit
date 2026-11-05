/* Content widgets for the long-read template. Helpers come from kit/core/runtime.js:
   $, S (svg), T (svg text), chart, slider, chips, loop, onShow, fmt, COL, mix. */

/* ---------- hero: simple vs compound, animated, complete at rest ---------- */
(() => {
  const svg = $('#hero'); if (!svg) return;
  const P = 100000, r = 0.08, N = 40;
  const comp = n => P * (1 + r) ** n, simple = n => P * (1 + r * n);
  let year = 30, hold = 0;
  function draw() {
    const c = chart(svg, { box: [70, 18, 900, 238], x: { min: 0, max: N, ticks: [0, 10, 20, 30, 40], fmt: v => v + ' л' }, y: { min: 0, max: comp(N), ticks: [0, 500000, 1000000, 1500000, 2000000], fmt: v => v ? fmt(v / 1e6, 1) + ' млн' : '0' } });
    const yrs = Array.from({ length: Math.floor(year) + 1 }, (_, i) => i);
    c.line(yrs.map(n => [n, simple(n)]), { stroke: COL.muted, 'stroke-dasharray': '5 5' });
    c.line(yrs.map(n => [n, comp(n)]), { stroke: COL.accent });
    yrs.forEach(n => { c.dot(n, comp(n), { r: 3, fill: COL.accent }); c.dot(n, simple(n), { r: 2.5, fill: COL.muted }); });
    const y = Math.floor(year);
    const right = y > 28, dx = right ? -12 : 10, anchor = right ? 'end' : 'start';
    T(c.g, c.X(y) + dx, c.Y(comp(y)) + (right ? -8 : 4), `сложный: ${fmt(comp(y))}`, { fill: COL.accent, 'font-size': 13, 'text-anchor': anchor });
    T(c.g, c.X(y) + dx, c.Y(simple(y)) - 10, `простой: ${fmt(simple(y))}`, { fill: COL.muted, 'font-size': 13, 'text-anchor': anchor });
    $('#hero-year').textContent = 'год ' + y;
  }
  loop(svg, dt => {
    if (hold > 0) { hold -= dt; return; }
    year += dt * 6; if (year >= N) { year = N; hold = 2; draw(); year = 0; return; }
    draw();
  });
  draw();
})();

/* ---------- calculator: log-scale chart + slider + chips ---------- */
(() => {
  const svg = $('#calc'); if (!svg) return;
  let P = 100000;
  const SER = [
    { n: 'сложный, 4%', r: 0.04, col: COL.accent2 },
    { n: 'сложный, 8%', r: 0.08, col: COL.accent },
    { n: 'сложный, 12%', r: 0.12, col: COL.warn },
    { n: 'простой, 8%', r: 0.08, simple: true, col: COL.muted }
  ];
  const val = (s, n) => s.simple ? P * (1 + s.r * n) : P * (1 + s.r) ** n;
  const years = slider('#calc-n', v => v + ' лет', draw);
  chips($('#calc-p'), b => { P = +b.dataset.p; draw(); });
  function draw() {
    const N = years ? years() : 30;
    const c = chart(svg, { box: [90, 20, 970, 350], x: { min: 0, max: 40, ticks: [0, 5, 10, 15, 20, 25, 30, 35, 40], title: 'лет' }, y: { min: 5e4, max: 3e7, log: true, ticks: [1e5, 3e5, 1e6, 3e6, 1e7], fmt: v => v >= 1e6 ? fmt(v / 1e6) + ' млн' : fmt(v / 1e3) + ' тыс' } });
    SER.forEach(s => c.line(Array.from({ length: 41 }, (_, n) => [n, val(s, n)]), { stroke: s.col, 'stroke-dasharray': s.simple ? '5 5' : null }));
    c.vline(N);
    SER.forEach(s => c.dot(N, val(s, N), { fill: s.col }));
    $('#calc-legend').innerHTML = SER.map(s => `<div style="display:flex;gap:10px;align-items:baseline;font-size:15px;min-width:0"><span style="width:14px;height:3px;background:${s.col};display:inline-block;flex:none;transform:translateY(-4px)"></span><span style="flex:1;color:var(--ink-2)">${s.n}</span><span class="mono num" style="color:${s.col}">${fmt(val(s, N))}</span></div>`).join('');
  }
  draw();
})();
