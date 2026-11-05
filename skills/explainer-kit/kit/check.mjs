#!/usr/bin/env node
/* explainer-kit · check.mjs — look at a built page the way a reader will.
   node kit/check.mjs <dist/index.html> [--out dir] [--widths 1440,400] [--only id,id] [--ink]

   Page:  screenshots of the hero and every section at each width; horizontal overflow with
          the offending elements; console errors.
   Deck:  a 1600×900 screenshot of every slide at its last step; elements that stick out of
          the slide; text smaller than 14 stage px; console errors.
   --ink  also draws a test stroke with the drawing tool and screenshots it.
   Needs playwright: npm i -D playwright && npx playwright install chromium.
   Google Fonts are served from local @fontsource packages when they are installed. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const KIT_DIR = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { console.error('Нужен playwright: npm i -D playwright && npx playwright install chromium'); process.exit(2); }

const argv = process.argv.slice(2), o = { _: [] };
for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); o[k] = v ?? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true); } else o._.push(a); }
const FILE = path.resolve(o._[0] || 'dist/index.html');
const DIR = path.dirname(FILE);
const OUT = path.resolve(o.out || path.join(DIR, 'shots'));
fs.mkdirSync(OUT, { recursive: true });
let html = fs.readFileSync(FILE, 'utf8');
const kitJson = /window\.KIT = (\{.*\});\n/.exec(html);
const KIT = kitJson ? JSON.parse(kitJson[1]) : { format: 'page', theme: { fonts: [] } };
let entry = path.basename(FILE);
if (!/^<!doctype/i.test(html.trimStart())) { // artifact fragment: wrap it the way the viewer does
  entry = '.preview.html';
  fs.writeFileSync(path.join(DIR, entry), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${html}</body></html>`);
}

/* local font CSS for Google Fonts requests */
function fontCss(base) {
  let css = '';
  for (const f of KIT.theme.fonts || []) {
    const dir = [path.join(KIT_DIR, 'node_modules/@fontsource', f.pkg), path.join(process.cwd(), 'node_modules/@fontsource', f.pkg)].find(fs.existsSync);
    if (!dir) continue;
    for (const w of f.weights) for (const st of f.italic ? ['', '-italic'] : ['']) {
      const p = path.join(dir, `${w}${st}.css`); if (!fs.existsSync(p)) continue;
      css += fs.readFileSync(p, 'utf8').replace(/url\(\.\/files\/([^)]+)\)/g, (_, file) => `url(${base}__fonts/${f.pkg}/${file})`);
    }
  }
  return css;
}

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u.startsWith('/__fonts/')) {
    const [, , pkg, ...rest] = u.split('/');
    const p = [path.join(KIT_DIR, 'node_modules/@fontsource', pkg, 'files', rest.join('/')), path.join(process.cwd(), 'node_modules/@fontsource', pkg, 'files', rest.join('/'))].find(fs.existsSync);
    if (!p) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': p.endsWith('.woff2') ? 'font/woff2' : 'font/woff' }); return fs.createReadStream(p).pipe(res);
  }
  const p = path.join(DIR, u === '/' ? entry : u);
  if (!p.startsWith(DIR) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  const ext = path.extname(p).toLowerCase();
  const type = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' }[ext] || 'application/octet-stream';
  res.writeHead(200, { 'content-type': type }); fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;
const FONT_CSS = fontCss(BASE);

const report = { file: FILE, format: KIT.format, theme: KIT.theme.name, errors: [], overflow: [], small: [], shots: [] };
const browser = await pw.chromium.launch();
async function open(viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on('pageerror', e => report.errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g(oogleapis|static)\.com/.test(m.text())) report.errors.push('console: ' + m.text()); });
  await page.route(/fonts\.googleapis\.com/, r => FONT_CSS ? r.fulfill({ status: 200, contentType: 'text/css', body: FONT_CSS }) : r.abort());
  await page.route(/fonts\.gstatic\.com/, r => r.abort());
  await page.goto(BASE + entry);
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(900);
  return page;
}
const only = typeof o.only === 'string' ? o.only.split(',') : null;

if (KIT.format === 'deck') {
  const page = await open({ width: 1600, height: 900 });
  const n = await page.evaluate(() => Deck.slides.length);
  for (let i = 0; i < n; i++) {
    if (only && !only.includes(String(i + 1))) continue;
    await page.evaluate(i => Deck.go(i, 'end'), i);
    await page.waitForTimeout(650);
    const shot = path.join(OUT, `slide-${String(i + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path: shot }); report.shots.push(shot);
    const r = await page.evaluate(() => {
      const s = Deck.slides[Deck.cur], sr = s.getBoundingClientRect(), k = Deck.scale, out = [], small = [];
      const inScroll = e => { for (let p = e.parentElement; p && p !== s; p = p.parentElement) { const ox = getComputedStyle(p).overflowX; if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true; } return false; };
      s.querySelectorAll('*').forEach(e => {
        const r = e.getBoundingClientRect(); if (!r.width || !r.height || e.closest('.notes')) return;
        const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity === 0) return;
        if ((r.right > sr.right + 2 || r.bottom > sr.bottom + 2 || r.left < sr.left - 2 || r.top < sr.top - 2) && !inScroll(e)) out.push(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').join('.') : ''} → ${Math.round((r.right - sr.left) / k)}×${Math.round((r.bottom - sr.top) / k)}`);
        if (e.childNodes.length && [...e.childNodes].some(c => c.nodeType === 3 && c.textContent.trim()) && parseFloat(cs.fontSize) < 13 && !e.closest('svg')) small.push(`${e.tagName.toLowerCase()} ${cs.fontSize}: «${e.textContent.trim().slice(0, 30)}»`);
      });
      return { out: [...new Set(out)].slice(0, 8), small: [...new Set(small)].slice(0, 5) };
    });
    if (r.out.length) report.overflow.push({ slide: i + 1, items: r.out });
    if (r.small.length) report.small.push({ slide: i + 1, items: r.small });
  }
  if (o.ink) {
    await page.evaluate(() => Deck.go(0, 'end')); await page.waitForTimeout(500);
    await inkTest(page, { x: 400, y: 300 }, path.join(OUT, 'ink-test.png'));
  }
  await page.close();
} else {
  const widths = String(o.widths || '1440,400').split(',').map(Number);
  for (const w of widths) {
    const page = await open({ width: w, height: 900 });
    const ov = await page.evaluate(() => {
      const W = document.documentElement.clientWidth, list = [];
      if (document.documentElement.scrollWidth <= W + 1) return { sw: document.documentElement.scrollWidth, list };
      document.querySelectorAll('main *, .hero *').forEach(e => {
        const r = e.getBoundingClientRect(); if (r.right <= W + 1 || !r.width) return;
        for (let p = e.parentElement; p; p = p.parentElement) { const ox = getComputedStyle(p).overflowX; if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return; }
        list.push(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''} right=${Math.round(r.right)} «${(e.textContent || '').trim().slice(0, 40)}»`);
      });
      return { sw: document.documentElement.scrollWidth, list: list.slice(0, 10) };
    });
    if (ov.list.length || ov.sw > w + 1) report.overflow.push({ width: w, scrollWidth: ov.sw, items: ov.list });
    await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}.ink-fab{visibility:hidden}' });
    const ids = await page.evaluate(() => [...document.querySelectorAll('.hero, section.sec')].map((e, i) => e.id || 'part' + i));
    for (const id of ids) {
      if (only && !only.includes(id)) continue;
      const el = await page.$('#' + id) || null; if (!el) continue;
      await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(350);
      const shot = path.join(OUT, `${w}-${id}.png`); await el.screenshot({ path: shot }); report.shots.push(shot);
    }
    if (o.ink && w === widths[0]) { await page.addStyleTag({ content: '.ink-fab{visibility:visible}' }); await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await page.waitForTimeout(400); await inkTest(page, { x: Math.min(500, w / 2), y: 360 }, path.join(OUT, 'ink-test.png')); }
    await page.close();
  }
}
async function inkTest(page, at, file) {
  await page.keyboard.press('d'); await page.waitForTimeout(200);
  await page.mouse.move(at.x, at.y); await page.mouse.down();
  for (let i = 1; i <= 24; i++) await page.mouse.move(at.x + i * 14, at.y + Math.sin(i / 2) * 40);
  await page.mouse.up(); await page.waitForTimeout(200);
  const st = await page.evaluate(() => ({ on: Ink.on, bar: !document.querySelector('.ink-bar').hidden }));
  await page.screenshot({ path: file }); report.shots.push(file);
  if (!st.on || !st.bar) report.errors.push('ink: режим рисования не включился');
  await page.keyboard.press('Escape');
}
await browser.close(); server.close();
if (entry === '.preview.html') fs.rmSync(path.join(DIR, entry), { force: true });
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log(`${report.format} · тема ${report.theme} · скриншотов ${report.shots.length} → ${path.relative(process.cwd(), OUT)}`);
console.log(report.errors.length ? '✗ ошибки:\n  ' + report.errors.join('\n  ') : '✓ ошибок в консоли нет');
console.log(report.overflow.length ? '✗ вылезает за край:\n  ' + report.overflow.map(x => JSON.stringify(x)).join('\n  ') : '✓ ничего не вылезает');
if (report.small.length) console.log('! мелкий текст:\n  ' + report.small.map(x => JSON.stringify(x)).join('\n  '));
process.exit(report.errors.length || report.overflow.length ? 1 : 0);
