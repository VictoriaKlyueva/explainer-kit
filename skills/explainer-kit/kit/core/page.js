/* explainer-kit · page.js — long-read chrome: table of contents, reading progress,
   ambient depth, wide figures that scroll sideways on phones, image lightbox. */
const Page = (() => {
  function toc() {
    const nav = $('#toc'); if (!nav) return [];
    const secs = $$('section.sec[data-title]');
    secs.forEach((s, i) => { const a = document.createElement('a'); a.href = '#' + s.id; a.innerHTML = `<span>${String(i + 1).padStart(2, '0')}</span>${s.dataset.title}`; nav.appendChild(a); });
    return secs;
  }
  function wideFigs() {
    $$('svg.fig').forEach(s => {
      const vb = (s.getAttribute('viewBox') || '').split(/\s+/);
      if (+vb[2] >= 900 && !s.closest('.figscroll, .scrollx') && !s.hasAttribute('data-shrink')) { const d = document.createElement('div'); d.className = 'figscroll'; s.parentNode.insertBefore(d, s); d.appendChild(s); }
    });
  }
  function lightbox() {
    if (!$('#lightbox')) document.body.insertAdjacentHTML('beforeend', '<div id="lightbox" hidden><img id="lb-img" alt=""></div>');
    const lb = $('#lightbox');
    lb.addEventListener('click', () => { lb.hidden = true; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') lb.hidden = true; });
    $$('.exhibit').forEach(ex => {
      ex.tabIndex = 0;
      const open = () => { const img = ex.querySelector('img'); $('#lb-img').src = img.src; $('#lb-img').alt = img.alt; lb.hidden = false; };
      ex.addEventListener('click', open); ex.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
    });
  }
  function init() {
    const secs = toc(), links = $$('#toc a');
    wideFigs(); lightbox();
    const bar = $('#progress');
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight, f = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
      if (bar) bar.style.width = (f * 100) + '%';
      Ambient.setDepth(f);
      let cur = -1; secs.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * 0.35) cur = i; });
      links.forEach((a, i) => a.classList.toggle('on', i === cur));
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }
  return { init };
})();
