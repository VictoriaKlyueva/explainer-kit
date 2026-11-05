/* explainer-kit · draw.js — draw on top of the page or the slides.
   A pen button (page: floating, bottom-right; deck: in the bottom bar) or the D key turns
   drawing on. Tools: pen, marker, laser (fades away), eraser; theme colors; three sizes;
   undo, clear, hide. On slides every slide keeps its own drawing; on a page strokes are
   pinned to the document and scroll with it. config.json → "draw": false | true | {persist, colors}. */
const Ink = (() => {
  const raw = KIT.config.draw;
  const cfg = Object.assign({ persist: false, colors: ['--accent', '--accent-2', '--warn', '--ink'] }, typeof raw === 'object' && raw ? raw : {});
  const deck = KIT.format === 'deck';
  const TOOLS = [['pen', 'Перо', 'P'], ['marker', 'Маркер', 'M'], ['laser', 'Лазер: исчезает сам', 'L'], ['eraser', 'Ластик', 'E']];
  const SIZES = deck ? [3, 6, 12] : [2, 4, 8];
  const LASER_MS = 1400;
  let on = false, tool = 'pen', color = 0, size = 1, hidden = false;
  let canvas, ctx, k = 1, bar, fab, cur = null, raf = 0;
  const layers = {}, history = {}, lasers = [];
  const key = () => (deck ? 's' + Deck.cur : 'page');
  const list = () => layers[key()] || (layers[key()] = []);
  const hist = () => history[key()] || (history[key()] = []);
  const storeKey = 'ink:' + location.pathname + ':' + document.title;

  function init() {
    if (raw === false) return;
    canvas = document.createElement('canvas'); canvas.id = 'ink';
    (deck ? Deck.stage : document.body).appendChild(canvas);
    ctx = canvas.getContext('2d');
    buildBar();
    if (!deck) { fab = H('button', { class: 'ink-fab', 'aria-label': 'Рисовать на странице (D)', title: 'Рисовать · D' }, icon('pen', 22), document.body); fab.addEventListener('click', () => toggle()); }
    else { fab = $('#b-ink'); if (fab) fab.addEventListener('click', () => toggle()); }
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    addEventListener('resize', () => { resize(); render(); });
    if (!deck) addEventListener('scroll', () => schedule(), { passive: true });
    document.addEventListener('deck:change', () => render());
    document.addEventListener('keydown', keys, true);
    if (cfg.persist) { try { Object.assign(layers, JSON.parse(localStorage.getItem(storeKey) || '{}')); } catch (e) {} }
    resize(); render();
  }

  function buildBar() {
    bar = H('div', { class: 'ink-bar', role: 'toolbar', 'aria-label': 'Рисование' }, '', document.body); bar.hidden = true;
    const btn = (name, title, fn, cls = '') => { const b = H('button', { type: 'button', title, 'aria-label': title, class: cls }, icon(name), bar); b.addEventListener('click', fn); return b; };
    TOOLS.forEach(([t, title, hk]) => { const b = btn(t, `${title} · ${hk}`, () => setTool(t)); b.dataset.tool = t; });
    H('span', { class: 'sep' }, '', bar);
    cfg.colors.forEach((c, i) => { const b = H('button', { type: 'button', class: 'sw', title: `Цвет ${i + 1}`, 'aria-label': `Цвет ${i + 1}` }, '', bar); b.style.background = `var(${c})`; b.dataset.color = i; b.addEventListener('click', () => setColor(i)); });
    H('span', { class: 'sep' }, '', bar);
    SIZES.forEach((s, i) => { const b = H('button', { type: 'button', class: 'sz', title: ['Тонко', 'Средне', 'Толсто'][i], 'aria-label': ['Тонко', 'Средне', 'Толсто'][i] }, `<i style="width:${4 + i * 4}px;height:${4 + i * 4}px"></i>`, bar); b.dataset.size = i; b.addEventListener('click', () => setSize(i)); });
    H('span', { class: 'sep' }, '', bar);
    btn('undo', 'Отменить · Ctrl+Z', undo);
    btn('trash', 'Стереть всё на этом ' + (deck ? 'слайде' : 'экране') + ' · C', clear);
    btn('eye', 'Скрыть или показать рисунки · H', () => { hidden = !hidden; sync(); render(); }).dataset.act = 'hide';
    btn('x', 'Закончить рисовать · Esc', () => toggle(false));
    sync();
  }
  function sync() {
    $$('[data-tool]', bar).forEach(b => b.classList.toggle('on', b.dataset.tool === tool));
    $$('[data-color]', bar).forEach(b => b.classList.toggle('on', +b.dataset.color === color));
    $$('[data-size]', bar).forEach(b => b.classList.toggle('on', +b.dataset.size === size));
    const h = $('[data-act="hide"]', bar); if (h) h.classList.toggle('on', hidden);
    document.body.classList.toggle('ink-eraser', tool === 'eraser');
  }
  const setTool = t => { tool = t; sync(); };
  const setColor = i => { color = i; if (tool === 'eraser') tool = 'pen'; sync(); };
  const setSize = i => { size = i; sync(); };
  function toggle(force) {
    on = force === undefined ? !on : force;
    document.body.classList.toggle('inking', on); bar.hidden = !on;
    if (fab) fab.classList.toggle('on', on);
    if (on && hidden) { hidden = false; sync(); render(); }
  }

  function keys(e) {
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z' && on) { e.preventDefault(); e.stopPropagation(); undo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (k === 'd' || k === 'в') { e.preventDefault(); e.stopPropagation(); toggle(); return; }
    if (!on) return;
    const map = { p: 'pen', з: 'pen', m: 'marker', ь: 'marker', l: 'laser', д: 'laser', e: 'eraser', у: 'eraser' };
    if (map[k]) { setTool(map[k]); e.stopPropagation(); }
    else if (/^[1-9]$/.test(k) && +k <= cfg.colors.length) { setColor(+k - 1); e.stopPropagation(); }
    else if (k === 'c' || k === 'с') { clear(); e.stopPropagation(); }
    else if (k === 'h' || k === 'р') { hidden = !hidden; sync(); render(); e.stopPropagation(); }
    else if (k === 'escape') { toggle(false); e.stopPropagation(); }
  }

  /* ---------- coordinates: stage pixels on slides, document pixels (from the center) on a page ---------- */
  function pos(e) {
    if (deck) { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 1600, (e.clientY - r.top) / r.height * 900]; }
    return [e.clientX + scrollX - document.documentElement.clientWidth / 2, e.clientY + scrollY];
  }
  function down(e) {
    if (!on) return;
    e.preventDefault(); canvas.setPointerCapture(e.pointerId);
    const [x, y] = pos(e);
    if (tool === 'eraser') { cur = { erase: true }; eraseAt(x, y); return; }
    const w = SIZES[size] * (tool === 'marker' ? 4 : tool === 'laser' ? 1.5 : 1);
    cur = { tool, color: cfg.colors[color], w, pen: e.pointerType === 'pen', pts: [[x, y, e.pressure || 0.5]], slide: deck ? Deck.cur : undefined };
    if (tool === 'laser') lasers.push(cur);
    schedule();
  }
  function move(e) {
    if (!cur) return;
    const [x, y] = pos(e);
    if (cur.erase) { eraseAt(x, y); return; }
    const p = cur.pts[cur.pts.length - 1];
    if (Math.hypot(x - p[0], y - p[1]) < 1.2) return;
    cur.pts.push([x, y, e.pressure || 0.5]);
    if (cur.tool === 'laser') cur.t = performance.now();
    schedule();
  }
  function up() {
    if (!cur) return;
    if (cur.tool === 'laser') cur.t = performance.now();
    else if (!cur.erase && cur.pts.length) { list().push(cur); hist().push({ type: 'add', s: cur }); save(); }
    cur = null; schedule();
  }
  function eraseAt(x, y) {
    const r = deck ? 16 : 12, L = list();
    const gone = L.filter(s => s.pts.some(p => Math.hypot(p[0] - x, p[1] - y) < r + s.w / 2));
    if (!gone.length) return;
    layers[key()] = L.filter(s => !gone.includes(s)); hist().push({ type: 'erase', s: gone }); save(); schedule();
  }
  function undo() {
    const a = hist().pop(); if (!a) return;
    if (a.type === 'add') layers[key()] = list().filter(s => s !== a.s);
    else if (a.type === 'erase') list().push(...a.s);
    else if (a.type === 'clear') layers[key()] = a.prev;
    save(); render();
  }
  function clear() { const L = list(); if (!L.length) return; hist().push({ type: 'clear', prev: L.slice() }); layers[key()] = []; save(); render(); }
  function save() { if (!cfg.persist) return; try { localStorage.setItem(storeKey, JSON.stringify(layers)); } catch (e) {} }

  /* ---------- rendering ---------- */
  function resize() {
    const d = window.devicePixelRatio || 1;
    if (deck) { k = clamp(d * Deck.scale, 1, 2); canvas.width = Math.round(1600 * k); canvas.height = Math.round(900 * k); }
    else { k = Math.min(d, 2); canvas.width = Math.round(innerWidth * k); canvas.height = Math.round(innerHeight * k); }
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); }
  function stroke(s, alpha = 1) {
    const P = s.pts; if (!P.length) return;
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle = cssColor(`var(${s.color})`);
    ctx.globalAlpha = alpha * (s.tool === 'marker' ? 0.35 : 1);
    ctx.lineCap = s.tool === 'marker' ? 'butt' : 'round'; ctx.lineJoin = 'round';
    if (s.tool === 'laser') { ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 14; }
    if (P.length === 1) { ctx.beginPath(); ctx.arc(P[0][0], P[0][1], s.w / 2, 0, 7); ctx.fill(); ctx.restore(); return; }
    const width = p => (s.pen ? s.w * (0.4 + p[2] * 1.2) : s.w);
    if (s.pen) {
      for (let i = 1; i < P.length; i++) { ctx.lineWidth = width(P[i]); ctx.beginPath(); ctx.moveTo(P[i - 1][0], P[i - 1][1]); ctx.lineTo(P[i][0], P[i][1]); ctx.stroke(); }
    } else {
      ctx.lineWidth = s.w; ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]);
      for (let i = 1; i < P.length - 1; i++) { const mx = (P[i][0] + P[i + 1][0]) / 2, my = (P[i][1] + P[i + 1][1]) / 2; ctx.quadraticCurveTo(P[i][0], P[i][1], mx, my); }
      const l = P[P.length - 1]; ctx.lineTo(l[0], l[1]); ctx.stroke();
    }
    ctx.restore();
  }
  function render() {
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (deck) ctx.setTransform(k, 0, 0, k, 0, 0);
    else ctx.setTransform(k, 0, 0, k, (-scrollX + document.documentElement.clientWidth / 2) * k, -scrollY * k);
    if (!hidden) list().forEach(s => stroke(s));
    if (cur && !cur.erase && cur.tool !== 'laser') stroke(cur);
    const now = performance.now();
    for (let i = lasers.length - 1; i >= 0; i--) {
      const s = lasers[i], age = s === cur || !s.t ? 0 : now - s.t;
      if (age > LASER_MS) { lasers.splice(i, 1); continue; }
      if (!deck || s.slide === undefined || s.slide === Deck.cur) stroke(s, 1 - age / LASER_MS);
    }
    if (lasers.length) schedule();
  }
  return { init, toggle, clear, undo, get on() { return on; }, get count() { return list().length; } };
})();
