/* explainer-kit · deck.js — slides engine.
   Stage 1600×900 scaled to the window; <section class="slide"> are slides; data-f="n" reveals
   on click n; data-ch groups slides into chapters for the progress bar; <aside class="notes">
   holds speaker notes. Events on each slide: slide:enter, slide:leave, slide:step (detail = step). */
const Deck = (() => {
  const stage = $('#stage');
  const slides = $$('.slide', stage);
  let cur = 0, step = 0, scale = 1;
  const maxStep = s => { let m = +s.dataset.steps || 0; $$('[data-f]', s).forEach(e => { m = Math.max(m, +e.dataset.f); }); return m; };
  function fit() { scale = Math.min(innerWidth / 1600, innerHeight / 900); stage.style.transform = `translate(-50%, -50%) scale(${scale})`; }
  function applyStep(s, n) { $$('[data-f]', s).forEach(e => e.classList.toggle('on', +e.dataset.f <= n)); s.dispatchEvent(new CustomEvent('slide:step', { detail: n })); }
  function go(i, st = 0, fromNav = true) {
    i = clamp(i, 0, slides.length - 1);
    const prev = slides[cur];
    if (i !== cur || !prev.classList.contains('active')) {
      prev.classList.remove('active'); prev.dispatchEvent(new CustomEvent('slide:leave'));
      cur = i; slides[cur].classList.add('active'); slides[cur].dispatchEvent(new CustomEvent('slide:enter'));
    }
    step = st === 'end' ? maxStep(slides[cur]) : clamp(st, 0, maxStep(slides[cur]));
    applyStep(slides[cur], step);
    UI.update();
    if (fromNav) { try { history.replaceState(null, '', '#' + (cur + 1)); } catch (e) {} }
    document.dispatchEvent(new CustomEvent('deck:change', { detail: { index: cur, step } }));
  }
  function next() { const s = slides[cur]; if (step < maxStep(s)) { step++; applyStep(s, step); } else if (cur < slides.length - 1) go(cur + 1, 0); }
  function prev() { if (step > 0) { step--; applyStep(slides[cur], step); } else if (cur > 0) go(cur - 1, 'end'); }

  /* ---------- chrome: bottom bar, notes, help, lightbox ---------- */
  const UI = (() => {
    const CH = KIT.config.chapters || {};
    const ticks = [];
    function build() {
      const who = KIT.config.author ? `<span class="who">${KIT.config.author}</span>` : '';
      stage.insertAdjacentHTML('beforeend', `<div id="bar">${who}<div class="prog" id="prog"><div class="track"></div><div class="done" id="prog-done"></div></div><span class="count" id="count"></span>${KIT.config.draw !== false ? `<button id="b-ink" aria-label="Рисовать (D)" title="Рисовать · D">${icon('pen', 16)}</button>` : ''}<button id="b-prev" aria-label="Назад">${icon('left', 16)}</button><button id="b-next" aria-label="Дальше">${icon('right', 16)}</button></div>`);
      const keys = [['→ / пробел', 'дальше'], ['←', 'назад'], ['N', 'заметки докладчика'], ['F', 'полный экран'], ['A', 'спрятать фон'], ['D', 'рисовать поверх слайда'], ['Home / End', 'в начало и в конец'], ['?', 'эта справка']];
      document.body.insertAdjacentHTML('beforeend', `<div id="notes" hidden><span class="label">Заметки</span><div id="notes-text"></div></div><div id="help" hidden><div class="panel">${keys.map(([k, v]) => `<div><kbd>${k}</kbd>${v}</div>`).join('')}</div></div>${$('#lightbox') ? '' : '<div id="lightbox" hidden><img id="lb-img" alt=""></div>'}`);
      const prog = $('#prog'); let last = null;
      slides.forEach((s, i) => {
        const ch = s.dataset.ch;
        if (ch !== undefined && ch !== last) {
          last = ch;
          const t = document.createElement('div'); t.className = 'ch'; t.dataset.ch = ch;
          t.style.left = (i / Math.max(1, slides.length - 1) * 100) + '%';
          t.innerHTML = `<span>${CH[ch] ?? ''}</span>`; prog.appendChild(t); ticks.push(t);
        }
      });
    }
    function update() {
      const s = slides[cur];
      $('#count').textContent = String(cur + 1).padStart(2, '0') + ' / ' + slides.length;
      $('#prog-done').style.width = (cur / Math.max(1, slides.length - 1) * 100) + '%';
      ticks.forEach(t => t.classList.toggle('on', t.dataset.ch === s.dataset.ch));
      const n = s.querySelector('.notes'); $('#notes-text').textContent = n ? n.textContent.trim() : '';
    }
    return { build, update };
  })();

  /* ---------- input ---------- */
  function input() {
    const isField = el => el && ((el.tagName === 'INPUT' && el.type !== 'range') || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    document.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (!$('#help').hidden || !$('#lightbox').hidden) { if (['Escape', ' ', 'Enter'].includes(k)) { $('#help').hidden = true; $('#lightbox').hidden = true; e.preventDefault(); } return; }
      const onRange = document.activeElement && document.activeElement.type === 'range';
      if (isField(document.activeElement)) return;
      if (k === 'PageDown' || (!onRange && (k === 'ArrowRight' || k === 'ArrowDown')) || k === ' ') { e.preventDefault(); if (onRange) document.activeElement.blur(); next(); }
      else if (k === 'PageUp' || (!onRange && (k === 'ArrowLeft' || k === 'ArrowUp'))) { e.preventDefault(); if (onRange) document.activeElement.blur(); prev(); }
      else if (k === 'Home') go(0);
      else if (k === 'End') go(slides.length - 1);
      else if ('nNтТ'.includes(k)) $('#notes').hidden = !$('#notes').hidden;
      else if ('fFаА'.includes(k)) fullscreen();
      else if ('aAфФ'.includes(k)) Ambient.toggle();
      else if (k === '?' || k === 'h' || k === 'H') $('#help').hidden = false;
      else if (k === 'Escape') $('#notes').hidden = true;
    });
    document.addEventListener('pointerup', () => { const a = document.activeElement; if (a && a.type === 'range') setTimeout(() => a.blur(), 0); });
    document.addEventListener('click', e => { const b = e.target.closest('button,.chip'); if (b) setTimeout(() => b.blur(), 0); });
    $('#b-next').addEventListener('click', next); $('#b-prev').addEventListener('click', prev);
    $('#help').addEventListener('click', () => { $('#help').hidden = true; });
    $('#lightbox').addEventListener('click', () => { $('#lightbox').hidden = true; });
    $$('.exhibit', stage).forEach(ex => {
      ex.tabIndex = 0;
      const open = () => { const img = ex.querySelector('img'); $('#lb-img').src = img.src; $('#lb-img').alt = img.alt; $('#lightbox').hidden = false; };
      ex.addEventListener('click', e => { e.stopPropagation(); open(); });
      ex.addEventListener('keydown', e => { if (e.key === 'Enter') { e.stopPropagation(); open(); } });
    });
    $$('[data-go]', stage).forEach(z => {
      const jump = () => { const i = slides.findIndex(s => s.id === z.dataset.go); if (i >= 0) go(i); };
      z.addEventListener('click', jump); z.addEventListener('keydown', e => { if (e.key === 'Enter') { e.stopPropagation(); jump(); } });
    });
    let sx = null, sy = null;
    document.addEventListener('touchstart', e => { if (document.body.classList.contains('inking')) return; const t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
    document.addEventListener('touchend', e => {
      if (sx === null) return;
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && !e.target.closest('input,svg,button')) { dx < 0 ? next() : prev(); }
      sx = null;
    }, { passive: true });
  }
  function fullscreen() { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {} }

  function init() {
    UI.build(); fit(); addEventListener('resize', fit); input();
    let start = 0; const h = (location.hash || '').replace('#', '');
    if (/^\d+$/.test(h)) start = clamp(+h - 1, 0, slides.length - 1);
    slides.forEach(s => s.classList.remove('active'));
    cur = start; slides[cur].classList.add('active');
    go(start, 0, false);
    slides[cur].dispatchEvent(new CustomEvent('slide:enter'));
  }
  return { init, go, next, prev, get cur() { return cur; }, get step() { return step; }, get scale() { return scale; }, slides, stage, maxStep };
})();
