/* ================= HERO: what sits in a layer's memory ================= */
(() => {
  const svg = $('#hero'); if (!svg) return;
  const NT = 512, X0 = 232, X1 = 984, PX = (X1 - X0) / NT, WIN = 128;
  const lanes = [
    { y: 22, name: 'Полное attention', col: COL.coral },
    { y: 96, name: 'CSA · 4 → 1', col: COL.lamp },
    { y: 170, name: 'HCA · 128 → 1', col: COL.violet },
    { y: 244, name: 'SSM', col: COL.bio }
  ];
  const sub = lanes.map(l => { T(svg, 18, l.y + 14, l.name, { fill: l.col, 'font-size': 14 }); return [T(svg, 18, l.y + 33, '', { 'font-size': 12 }), T(svg, 18, l.y + 50, '', { 'font-size': 12 })]; });
  S('line', { x1: X0 - 10, y1: 14, x2: X0 - 10, y2: 316, stroke: COL.line }, svg);
  const full = [];
  for (let j = 0; j < NT; j++) full.push(S('rect', { x: X0 + j * PX, y: 24, width: Math.max(PX - 0.35, 0.6), height: 34, fill: COL.coral, opacity: 0 }, svg));
  const fullRead = S('rect', { x: X0 - 3, y: 20, width: 0, height: 42, fill: 'none', stroke: COL.lamp, 'stroke-opacity': 0.6, 'stroke-dasharray': '3 3' }, svg);
  function compLane(y, m, col) {
    const cells = [], ticks = [];
    for (let i = 0; i < NT / m; i++) cells.push(S('rect', { x: X0 + i * m * PX + 0.5, y, width: m * PX - 1.5, height: 22, fill: col, opacity: 0 }, svg));
    for (let j = 0; j < NT; j++) ticks.push(S('rect', { x: X0 + j * PX, y: y + 27, width: Math.max(PX - 0.35, 0.6), height: 12, fill: COL.bio, opacity: 0 }, svg));
    const tail = S('rect', { x: 0, y, width: 0, height: 22, fill: 'none', stroke: col, 'stroke-dasharray': '3 2', opacity: 0.8 }, svg);
    return { cells, ticks, tail, m };
  }
  const csa = compLane(98, 4, COL.lamp), hca = compLane(172, 128, COL.violet);
  const score = (() => { const R = rng(11); return Array.from({ length: NT / 4 }, () => R()); })();
  const cellsSSM = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 22; c++) cellsSSM.push(S('rect', { x: X0 + c * 15, y: 248 + r * 13, width: 12, height: 10, fill: COL.bio, opacity: 0.3 }, svg));
  T(svg, X0 + 22 * 15 + 16, 268, 'одна матрица d × d на голову:', { 'font-size': 12.5 });
  T(svg, X0 + 22 * 15 + 16, 287, 'каждый токен переписывает её целиком', { 'font-size': 12.5 });
  const R2 = rng(5);
  function draw(n) {
    full.forEach((r, j) => r.setAttribute('opacity', j < n ? 0.85 : 0));
    fullRead.setAttribute('width', n ? n * PX + 5 : 0);
    const k = 8, done4 = Math.floor(n / 4);
    const sel = new Set(score.map((s, i) => [s, i]).filter(x => x[1] < done4).sort((a, b) => b[0] - a[0]).slice(0, k).map(x => x[1]));
    [csa, hca].forEach(L => {
      const done = Math.floor(n / L.m);
      L.cells.forEach((c, i) => c.setAttribute('opacity', i >= done ? 0 : (L === csa ? (sel.has(i) ? 1 : 0.26) : 0.9)));
      L.ticks.forEach((t, j) => t.setAttribute('opacity', j < n && j >= n - WIN ? 0.9 : 0));
      const rest = n - done * L.m;
      L.tail.setAttribute('x', X0 + done * L.m * PX + 0.5); L.tail.setAttribute('width', rest > 0 ? Math.max(rest * PX - 1, 1) : 0);
    });
    cellsSSM.forEach(c => c.setAttribute('opacity', (0.15 + 0.75 * R2()).toFixed(2)));
    $('#hero-count').textContent = 'токенов: ' + n;
    const put = (i, a, b) => { sub[i][0].textContent = a; sub[i][1].textContent = b; };
    put(0, `записей: ${n}`, 'читает все');
    put(1, `записей: ${done4} + окно`, `читает ${Math.min(k, done4)} + окно`);
    put(2, `записей: ${Math.floor(n / 128)} + окно`, 'читает все + окно');
    put(3, 'размер не меняется', 'читает всю матрицу');
  }
  let n = 300, hold = 0, timer = null;
  function tick() { if (hold > 0) { hold--; return; } n += 2; if (n > NT) { n = 0; } if (n === NT) hold = 30; draw(n); }
  whenVisible(svg, () => { if (!timer && !REDUCED) timer = setInterval(tick, 45); }, () => { clearInterval(timer); timer = null; });
  draw(n);
})();

/* ================= 02 compressor: 8 tokens -> 1 entry ================= */
(() => {
  const svg = $('#cmp'); if (!svg) return;
  const TOK = ['Кот', 'Барсик', 'спрятал', 'ключи', 'от', 'машины', 'под', 'диван', 'в', 'гостиной', ',', 'а', 'потом', 'забыл', 'где', 'они'];
  const F = [[2.2, 0, 0], [3, 0, 0], [0.6, 0.8, 0.2], [0, 3, 0], [0, 0.2, 0], [0, 2, 0.4], [0, 0, 1.6], [0, 0.6, 2.8], [0, 0, 0.9], [0, 0, 3], [0, 0, 0], [0.2, 0, 0], [0, 0, 0.4], [0.8, 0.6, 0], [0, 0, 1.2], [1, 1.6, 0]];
  const CH = ['«кто»', '«что»', '«где»'];
  const BA = [-0.2, 0, 0.15, 0.3], BB = [-0.5, -0.35, -0.2, -0.05];
  let I = 1, mode = 'gate';
  const SW = 58, X0 = 36, CX = 214, CW = 96;
  function weights() {
    const idx = []; for (let j = 0; j < 4; j++) idx.push((I - 1) * 4 + j); for (let j = 0; j < 4; j++) idx.push(I * 4 + j);
    const W = CH.map((_, c) => {
      if (mode === 'mean') return idx.map(() => 1 / 8);
      const z = idx.map((t, p) => p < 4 ? F[t][c] * 1.5 + BB[p] : F[t][c] * 1.8 + BA[p - 4]);
      const mx = Math.max(...z), e = z.map(v => Math.exp(v - mx)), s = e.reduce((a, b) => a + b, 0);
      return e.map(v => v / s);
    });
    return { idx, W };
  }
  function draw() {
    svg.innerHTML = '';
    const { idx, W } = weights();
    TOK.forEach((t, j) => {
      const used = idx.includes(j), x = X0 + j * SW;
      S('rect', { x: x + 2, y: 18, width: SW - 4, height: 34, fill: used ? 'rgba(241,196,108,.10)' : 'rgba(150,182,184,.05)', stroke: used ? COL.lamp : COL.line, 'stroke-opacity': used ? 0.7 : 1 }, svg);
      T(svg, x + SW / 2, 40, t, { 'text-anchor': 'middle', 'font-size': t.length > 7 ? 11.5 : 13, fill: used ? COL.bone : COL.fog });
    });
    for (let b = 0; b < 4; b++) {
      const x1 = X0 + b * 4 * SW + 4, x2 = X0 + (b + 1) * 4 * SW - 4, on = b === I || b === I - 1;
      S('path', { d: `M${x1} 58v6H${x2}v-6`, fill: 'none', stroke: on ? COL.lamp : COL.line }, svg);
      T(svg, (x1 + x2) / 2, 80, `блок ${b}` + (b === I ? ' · ветка a' : b === I - 1 ? ' · ветка b' : ''), { 'text-anchor': 'middle', 'font-size': 12, fill: on ? COL.lamp : COL.fog });
    }
    idx.forEach((t, c) => { const xs = X0 + t * SW + SW / 2, xe = CX + c * CW + CW / 2 - 3; S('path', { d: `M${xs} 88 C${xs} 104 ${xe} 100 ${xe} 116`, fill: 'none', stroke: COL.lineS }, svg); });
    W.forEach((row, r) => {
      const y = 120 + r * 52;
      T(svg, 20, y + 20, 'канал ' + (r + 1), { 'font-size': 12 });
      T(svg, 20, y + 38, CH[r], { 'font-size': 14, fill: COL.bone });
      const best = row.indexOf(Math.max(...row));
      row.forEach((w, c) => {
        const x = CX + c * CW;
        S('rect', { x, y, width: CW - 6, height: 44, fill: COL.lamp, 'fill-opacity': Math.min(1, 0.06 + w * 1.4).toFixed(3), stroke: c === best && mode === 'gate' ? COL.bone : 'none' }, svg);
        T(svg, x + (CW - 6) / 2, y + 27, Math.round(w * 100) + '%', { 'text-anchor': 'middle', 'font-size': 14, fill: w > 0.45 ? '#1b1407' : COL.bone });
      });
    });
    S('line', { x1: CX + 4 * CW - 3, y1: 114, x2: CX + 4 * CW - 3, y2: 280, stroke: COL.lineS, 'stroke-dasharray': '3 3' }, svg);
    const y0 = 300;
    S('rect', { x: 20, y: y0, width: 960, height: 46, fill: 'rgba(241,196,108,.08)', stroke: COL.lamp, 'stroke-opacity': 0.6 }, svg);
    T(svg, 34, y0 + 28, `запись ${I}:`, { 'font-size': 14, fill: COL.lamp });
    W.forEach((row, r) => {
      const best = row.indexOf(Math.max(...row));
      const txt = mode === 'mean' ? `${CH[r]} = среднее всех 8` : `${CH[r]} ← «${TOK[idx[best]]}» ${Math.round(row[best] * 100)}%`;
      T(svg, 150 + r * 280, y0 + 28, txt, { 'font-size': 14, fill: COL.bone });
    });
    const wk = W[1], bi = wk.indexOf(Math.max(...wk));
    $('#cmp-note').textContent = mode === 'mean'
      ? 'При простом среднем каждый токен получает 12,5% в каждом канале. Важное слово растворяется среди предлогов и запятых, и запись хранит размытую смесь блока.'
      : `В канале «что» ${Math.round(wk[bi] * 100)}% веса у слова «${TOK[idx[bi]]}»` + (wk[bi] > 0.6 ? ': запись почти дословно сохраняет его, хотя рядом ещё семь токенов.' : '. Когда в блоке нет одного явного кандидата, вес распределяется между несколькими словами.') + ' Каждый канал выбирает своё. Настоящие каналы не подписаны словами, веса здесь придуманы для иллюстрации.';
  }
  chips($('#cmp-i'), b => { I = +b.dataset.i; draw(); });
  chips($('#cmp-mode'), b => { mode = b.dataset.m; draw(); });
  draw();
})();

/* ================= 03 lightning indexer: top-k over compressed entries ================= */
(() => {
  const svg = $('#ix'); if (!svg) return;
  const NE = 512, X0 = 40, X1 = 984, PX = (X1 - X0) / NE, BASE = 196, HMAX = 150;
  const noise = (() => { const R = rng(21); return Array.from({ length: NE }, () => 0.16 * R() * R()); })();
  const PEAKS = [
    [[14, 0.95, 3], [27, 0.7, 2], [41, 0.55, 4], [8, 0.4, 2]],
    [[232, 0.9, 4], [251, 0.75, 3], [270, 0.5, 2], [218, 0.4, 2]],
    [[30, 0.7, 3], [150, 0.85, 3], [301, 0.6, 3], [418, 0.75, 2], [466, 0.5, 3]]
  ];
  let q = 0;
  const sl = $('#ix-k');
  function scores() {
    return noise.map((v, i) => { let s = v; PEAKS[q].forEach(([c, h, w]) => { s += h * Math.exp(-((i - c) ** 2) / (2 * w * w)); }); return Math.min(1, s); });
  }
  function draw() {
    const k = +sl.value; $('#ix-k-o').textContent = k;
    svg.innerHTML = '';
    const sc = scores(), top = new Set(sc.map((s, i) => [s, i]).sort((a, b) => b[0] - a[0]).slice(0, k).map(x => x[1]));
    T(svg, X0, 18, 'оценка индексатора I(t, s) для каждой сжатой записи s', { 'font-size': 12.5 });
    S('line', { x1: X0, y1: BASE + 0.5, x2: X1, y2: BASE + 0.5, stroke: COL.lineS }, svg);
    const wx = X0 + (NE - 32) * PX;
    S('rect', { x: wx, y: 30, width: X1 - wx, height: BASE - 30, fill: 'rgba(114,216,198,.06)' }, svg);
    sc.forEach((s, i) => S('rect', { x: X0 + i * PX, y: BASE - s * HMAX, width: Math.max(PX - 0.3, 0.8), height: s * HMAX, fill: top.has(i) ? COL.lamp : COL.fog, opacity: top.has(i) ? 1 : 0.35 }, svg));
    S('rect', { x: wx, y: BASE + 8, width: X1 - wx, height: 12, fill: COL.bio, opacity: 0.85 }, svg);
    T(svg, wx - 8, BASE + 18, 'окно: 128 последних токенов без сжатия', { 'text-anchor': 'end', 'font-size': 12, fill: COL.bio });
    S('path', { d: `M${X1} ${BASE + 26}l-6 10h12z`, fill: COL.bone }, svg);
    T(svg, X1, BASE + 52, 'текущий токен t', { 'text-anchor': 'end', 'font-size': 12, fill: COL.bone });
    [0, 512, 1024, 1536].forEach(tk => { const x = X0 + tk / 4 * PX; S('line', { x1: x, y1: BASE, x2: x, y2: BASE + 5, stroke: COL.lineS }, svg); T(svg, x, BASE + 52, String(tk), { 'text-anchor': 'middle', 'font-size': 12 }); });
    T(svg, X0, BASE + 74, 'позиция в тексте, токенов · одна полоска = одна запись = 4 токена', { 'font-size': 12 });
    const read = k + 128, share = read / 2048 * 100;
    $('#ix-note').innerHTML = `Внимание читает <b>${k}</b> записей (≈${k * 4} токенов) и окно из 128 токенов, всего ${read} векторов вместо 2048, это ${ru(share, 1)}%. В реальной V4-Flash на миллионе токенов: 512 записей из 262 144 плюс окно, около 0,06%. Индексатор при этом оценивает все 262 144, поэтому ему нужна дешёвая арифметика.`;
  }
  chips($('#ix-q'), b => { q = +b.dataset.q; draw(); });
  sl.addEventListener('input', draw); draw();
})();

/* ================= 04 layer stack ================= */
(() => {
  const svg = $('#ly'); if (!svg) return;
  const CFG = {
    flash: [0, 0, ...Array.from({ length: 41 }, (_, i) => (i % 2 ? 128 : 4))],
    pro: [128, 128, ...Array.from({ length: 59 }, (_, i) => (i % 2 ? 128 : 4))]
  };
  const KIND = { 0: ['только окно', COL.fog], 4: ['CSA', COL.lamp], 128: ['HCA', COL.violet] };
  const K = { flash: 512, pro: 1024 };
  let m = 'flash', sel = -1;
  function info(i) {
    const r = CFG[m][i];
    if (r === 0) return `Слой ${i} · только окно: видит 128 последних токенов, и больше ничего. Дальнее прошлое такие слои получают от остальных через остаточный поток.`;
    if (r === 4) return `Слой ${i} · CSA: на миллионе токенов индексатор оценивает 262 144 записи, внимание читает ${K[m]} лучших и окно из 128 токенов.`;
    return `Слой ${i} · HCA: на миллионе токенов читает все 8 192 записи по 128 токенов и окно из 128 токенов.`;
  }
  function draw() {
    svg.innerHTML = '';
    const L = CFG[m], n = L.length, X0 = 28, X1 = 972, w = (X1 - X0) / n;
    L.forEach((r, i) => {
      const x = X0 + i * w, [, col] = KIND[r];
      const rc = S('rect', { x: x + 1, y: 22, width: w - 2.5, height: 62, fill: col, 'fill-opacity': r === 0 ? 0.35 : 0.85, stroke: i === sel ? COL.bone : 'none', 'stroke-width': 2, style: 'cursor:pointer' }, svg);
      const pick = () => { sel = i; draw(); };
      rc.addEventListener('mouseenter', pick); rc.addEventListener('click', pick);
      if (i % 5 === 0) T(svg, x + w / 2, 102, String(i), { 'text-anchor': 'middle', 'font-size': 11.5 });
    });
    T(svg, X0, 14, 'вход', { 'font-size': 11.5 }); T(svg, X1, 14, 'выход', { 'font-size': 11.5, 'text-anchor': 'end' });
    const cnt = { 0: 0, 4: 0, 128: 0 }; L.forEach(r => cnt[r]++);
    let lx = X0;
    [4, 128, 0].forEach(r => { if (!cnt[r]) return; const [nm, col] = KIND[r]; S('rect', { x: lx, y: 128, width: 14, height: 14, fill: col, 'fill-opacity': r === 0 ? 0.35 : 0.85 }, svg); const t = T(svg, lx + 22, 140, `${nm} × ${cnt[r]}`, { 'font-size': 13, fill: COL.bone }); lx += 22 + t.getComputedTextLength() + 34; });
    $('#ly-note').textContent = sel >= 0 && sel < n ? info(sel) : `Наведите на слой или нажмите на него. У ${m === 'flash' ? 'Flash первые два слоя смотрят только в окно' : 'Pro первые два слоя — HCA'}, дальше CSA и HCA строго чередуются. Плюс в конце блок MTP с одним окном, он нужен для спекулятивного декодинга.`;
  }
  chips($('#ly-m'), b => { m = b.dataset.m; sel = -1; draw(); });
  draw();
})();

/* ================= 05 toy recall experiment ================= */
(() => {
  const svg = $('#rc'), svgA = $('#rc-age'); if (!svg) return;
  const NG = [2, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256];
  const MET = [
    { k: 'h', n: 'линейное attention: S = Σ v kᵀ', col: COL.coral },
    { k: 'd', n: 'SSM: delta rule, β = 0,5', col: COL.bio },
    { k: 's', n: 'softmax по отдельным записям', col: COL.lamp }
  ];
  $('#rc-legend').innerHTML = MET.map(m => `<span style="display:inline-flex;gap:8px;align-items:center;font-size:14.5px;color:var(--bone-dim)"><span style="width:16px;height:3px;background:${m.col};display:inline-block"></span>${m.n}</span>`).join('');
  function gauss(R) { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * R()); }
  function sim(d, N, seed) {
    const R = rng(seed * 7919 + N * 31 + d), K = [], V = [];
    const unit = () => { const x = new Float64Array(d); let s = 0; for (let i = 0; i < d; i++) { x[i] = gauss(R); s += x[i] * x[i]; } s = Math.sqrt(s); for (let i = 0; i < d; i++) x[i] /= s; return x; };
    for (let i = 0; i < N; i++) { K.push(unit()); V.push(unit()); }
    const H = new Float64Array(d * d), D = new Float64Array(d * d), Sk = new Float64Array(d), beta = 0.5;
    for (let i = 0; i < N; i++) {
      const k = K[i], v = V[i];
      for (let r = 0; r < d; r++) { let s = 0; for (let c = 0; c < d; c++) s += D[r * d + c] * k[c]; Sk[r] = s; }
      for (let r = 0; r < d; r++) { const e = beta * (v[r] - Sk[r]), vr = v[r]; for (let c = 0; c < d; c++) { D[r * d + c] += e * k[c]; H[r * d + c] += vr * k[c]; } }
    }
    const o = new Float64Array(d), sc = new Float64Array(N), res = { h: [], d: [], s: [] };
    const nearest = () => { let b = -1e9, bi = -1; for (let i = 0; i < N; i++) { let s = 0; const v = V[i]; for (let r = 0; r < d; r++) s += o[r] * v[r]; if (s > b) { b = s; bi = i; } } return bi; };
    for (let j = 0; j < N; j++) {
      const q = K[j];
      for (const [M, key] of [[H, 'h'], [D, 'd']]) { for (let r = 0; r < d; r++) { let s = 0; for (let c = 0; c < d; c++) s += M[r * d + c] * q[c]; o[r] = s; } res[key].push(nearest() === j ? 1 : 0); }
      let mx = -1e9; for (let i = 0; i < N; i++) { let s = 0; const k = K[i]; for (let c = 0; c < d; c++) s += k[c] * q[c]; sc[i] = 10 * s; if (sc[i] > mx) mx = sc[i]; }
      o.fill(0); let Z = 0; for (let i = 0; i < N; i++) { const w = Math.exp(sc[i] - mx); Z += w; const v = V[i]; for (let r = 0; r < d; r++) o[r] += w * v[r]; }
      res.s.push(nearest() === j ? 1 : 0);
    }
    return res;
  }
  const cache = {};
  function stats(d, N, seeds) {
    const key = d + ':' + N + ':' + seeds; if (cache[key]) return cache[key];
    const tot = { h: 0, d: 0, s: 0 }, bk = { h: Array(8).fill(0), d: Array(8).fill(0), s: Array(8).fill(0) }, cnt = Array(8).fill(0);
    for (let sd = 0; sd < seeds; sd++) {
      const r = sim(d, N, sd + 1);
      for (const m of ['h', 'd', 's']) r[m].forEach((x, j) => { tot[m] += x / N / seeds; bk[m][Math.min(7, Math.floor(j * 8 / N))] += x; });
      for (let j = 0; j < N; j++) cnt[Math.min(7, Math.floor(j * 8 / N))]++;
    }
    for (const m of ['h', 'd', 's']) bk[m] = bk[m].map((v, i) => v / (cnt[i] || 1));
    return (cache[key] = { tot, bk });
  }
  let d = 16;
  const sl = $('#rc-n');
  const L0 = 52, R0 = 484, T0 = 22, B0 = 270;
  const X = N => L0 + (Math.log2(N) - 1) / 7 * (R0 - L0), Y = a => B0 - a * (B0 - T0);
  function axes(g, title) {
    [0, 0.25, 0.5, 0.75, 1].forEach(a => { S('line', { x1: L0, y1: Y(a), x2: R0, y2: Y(a), stroke: COL.line }, g); T(g, L0 - 8, Y(a) + 4, Math.round(a * 100) + '%', { 'text-anchor': 'end', 'font-size': 11.5 }); });
    T(g, L0, 12, title, { 'font-size': 12, fill: COL.bone });
  }
  function draw() {
    const N = NG[+sl.value]; $('#rc-n-o').textContent = N;
    svg.innerHTML = ''; svgA.innerHTML = '';
    axes(svg, 'доля верно вспомненных фактов');
    [2, 8, 32, 128].concat([4, 16, 64, 256]).forEach(n => T(svg, X(n), B0 + 18, String(n), { 'text-anchor': 'middle', 'font-size': 11.5 }));
    T(svg, (L0 + R0) / 2, B0 + 40, 'сколько фактов N записано', { 'text-anchor': 'middle', 'font-size': 12 });
    S('line', { x1: X(d), y1: T0, x2: X(d), y2: B0, stroke: COL.fog, 'stroke-dasharray': '2 4' }, svg);
    T(svg, X(d) + 5, B0 - 8, 'N = d', { 'font-size': 11.5 });
    const curves = NG.map(n => stats(d, n, 3).tot);
    MET.forEach(m => {
      const pts = NG.map((n, i) => `${X(n).toFixed(1)} ${Y(curves[i][m.k]).toFixed(1)}`);
      S('path', { d: 'M' + pts.join('L'), fill: 'none', stroke: m.col, 'stroke-width': 2.5 }, svg);
    });
    S('line', { x1: X(N), y1: T0, x2: X(N), y2: B0, stroke: COL.lamp, 'stroke-opacity': 0.5 }, svg);
    MET.forEach(m => S('circle', { cx: X(N), cy: Y(curves[+sl.value][m.k]), r: 4.5, fill: m.col }, svg));
    // by age
    const st = stats(d, N, 6);
    const AL = 52, AR = 484, bw = (AR - AL) / 8;
    [0, 0.25, 0.5, 0.75, 1].forEach(a => { S('line', { x1: AL, y1: Y(a), x2: AR, y2: Y(a), stroke: COL.line }, svgA); T(svgA, AL - 8, Y(a) + 4, Math.round(a * 100) + '%', { 'text-anchor': 'end', 'font-size': 11.5 }); });
    T(svgA, AL, 12, `та же память при N = ${N}: кого помнит`, { 'font-size': 12, fill: COL.bone });
    for (let b = 0; b < 8; b++) MET.forEach((m, mi) => { const v = st.bk[m.k][b], x = AL + b * bw + 6 + mi * ((bw - 12) / 3); S('rect', { x, y: Y(v), width: (bw - 12) / 3 - 2, height: B0 - Y(v), fill: m.col, opacity: 0.9 }, svgA); });
    T(svgA, AL, B0 + 18, '← старые факты', { 'font-size': 12 });
    T(svgA, AR, B0 + 18, 'новые →', { 'font-size': 12, 'text-anchor': 'end' });
    T(svgA, (AL + AR) / 2, B0 + 40, 'восемь групп по времени записи', { 'text-anchor': 'middle', 'font-size': 12 });
  }
  chips($('#rc-d'), b => { d = +b.dataset.d; draw(); });
  sl.addEventListener('input', draw);
  draw();
})();

/* ================= 06 memory calculator ================= */
(() => {
  const svg = $('#mem'); if (!svg) return;
  const MiB = 2 ** 20;
  const V4 = { csa: 21 * 576 / 4, idx: 21 * 64 / 4, hca: 20 * 576 / 128, win: 43 * 128 * 576 };
  const M = [
    { n: 'Полное attention · GQA-8, BF16', t: 43 * 4096, c: 0, col: COL.coral },
    { n: 'Гибрид ≈3:1 · 32 слоя Gated DeltaNet + 11 GQA-8', t: 11 * 4096, c: 32 * MiB, col: COL.violet },
    { n: 'DeepSeek V4-Flash · CSA + HCA, оценка', t: V4.csa + V4.idx + V4.hca, c: V4.win, col: COL.lamp },
    { n: 'DeepSeek V4.1-Flash · CSA2 + FP4, данные DeepSeek', t: 890, c: 0, col: COL.bone },
    { n: 'Только Gated DeltaNet · 43 слоя', t: 0, c: 43 * MiB, col: COL.bio }
  ];
  const sl = $('#mem-L');
  const L0 = 90, R0 = 970, T0 = 20, B0 = 370, YMIN = 5.5, YMAX = 11.5;
  const X = lg => L0 + (lg - 10) / 10 * (R0 - L0), Y = b => B0 - (Math.log10(b) - YMIN) / (YMAX - YMIN) * (B0 - T0);
  function draw() {
    const L = Math.round(2 ** (10 + +sl.value / 10));
    $('#mem-L-o').textContent = fmtTok(L);
    svg.innerHTML = '';
    [[1e6, '1 МБ'], [1e7, '10 МБ'], [1e8, '100 МБ'], [1e9, '1 ГБ'], [1e10, '10 ГБ'], [1e11, '100 ГБ']].forEach(([b, l]) => { S('line', { x1: L0, y1: Y(b), x2: R0, y2: Y(b), stroke: COL.line }, svg); T(svg, L0 - 10, Y(b) + 4, l, { 'text-anchor': 'end', 'font-size': 12 }); });
    [10, 12, 14, 16, 18, 20].forEach(p => { S('line', { x1: X(p), y1: T0, x2: X(p), y2: B0, stroke: COL.line }, svg); T(svg, X(p), B0 + 20, fmtTok(2 ** p), { 'text-anchor': 'middle', 'font-size': 12 }); });
    T(svg, (L0 + R0) / 2, B0 + 42, 'длина контекста, токенов', { 'text-anchor': 'middle', 'font-size': 12 });
    M.forEach(m => {
      let d = '';
      for (let i = 0; i <= 80; i++) { const lg = 10 + i / 8, b = m.t * 2 ** lg + m.c; d += (i ? 'L' : 'M') + X(lg).toFixed(1) + ' ' + Y(clamp(b, 10 ** YMIN, 10 ** YMAX)).toFixed(1); }
      S('path', { d, fill: 'none', stroke: m.col, 'stroke-width': 2.5 }, svg);
    });
    const xl = X(Math.log2(L));
    S('line', { x1: xl, y1: T0, x2: xl, y2: B0, stroke: COL.lamp, 'stroke-dasharray': '4 4' }, svg);
    M.forEach(m => { const b = m.t * L + m.c; S('circle', { cx: xl, cy: Y(clamp(b, 10 ** YMIN, 10 ** YMAX)), r: 5, fill: m.col }, svg); });
    $('#mem-legend').innerHTML = M.map(m => `<div style="display:flex;gap:10px;align-items:baseline;font-size:15px;min-width:0"><span style="width:14px;height:3px;background:${m.col};display:inline-block;flex:none;transform:translateY(-4px)"></span><span style="flex:1;min-width:0;color:var(--bone-dim)">${m.n}</span><span class="mono num" style="color:${m.col};white-space:nowrap">${fmtBytes(m.t * L + m.c)}</span></div>`).join('');
    // breakdown
    const bar = $('#mem-bar'); bar.innerHTML = '';
    const parts = [
      ['CSA', V4.csa * L, COL.lamp, 1], ['индексатор', V4.idx * L, COL.lamp, 0.45],
      ['HCA', V4.hca * L, COL.violet, 0.9], ['окно', V4.win, COL.bio, 0.85]
    ];
    const tot = parts.reduce((s, p) => s + p[1], 0);
    let x = 0;
    parts.forEach(([nm, v, col, op]) => { const w = v / tot * 1000; S('rect', { x, y: 0, width: Math.max(w, 0), height: 26, fill: col, 'fill-opacity': op }, bar); x += w; });
    let lx = 0;
    parts.forEach(([nm, v, col, op]) => { S('rect', { x: lx, y: 44, width: 12, height: 12, fill: col, 'fill-opacity': op }, bar); const t = T(bar, lx + 18, 55, `${nm} ${ru(v / tot * 100, v / tot < 0.1 ? 1 : 0)}% · ${fmtBytes(v)}`, { 'font-size': 13, fill: COL.bone }); lx += 18 + t.getComputedTextLength() + 26; });
  }
  sl.addEventListener('input', draw); draw();
})();
