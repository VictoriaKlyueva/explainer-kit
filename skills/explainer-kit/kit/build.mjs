#!/usr/bin/env node
/* explainer-kit · build.mjs — turns a content folder into one HTML file.

   node kit/build.mjs <content-dir> [--format page|deck] [--theme abyss|paper|blueprint|<path>]
                                    [--target standalone|artifact] [--offline] [--out file.html]

   content-dir holds: config.json, content.html, widgets.js (optional), style.css (optional),
   assets/ (optional). Formulas: <m>inline TeX</m> and <M>display TeX</M> are rendered to SVG here,
   so the page needs no math library at runtime. {{include:file.svg}} inlines a file from content-dir.

   Targets
     standalone (default) — a complete HTML document; assets copied next to it.
     artifact             — a fragment for the claude.ai Artifact tool (no <html>/<head>/<body>);
                            prints the `files` map to publish together with the page.
     offline (--offline)  — one self-contained file: fonts and images inlined as base64. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const KIT_DIR = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const read = p => fs.readFileSync(p, 'utf8');
const exists = p => fs.existsSync(p);

function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { o._.push(a); continue; }
    const [k, v] = a.slice(2).split('=');
    if (v !== undefined) o[k] = v;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) o[k] = argv[++i];
    else o[k] = true;
  }
  return o;
}
const A = parseArgs(process.argv.slice(2));
if (A.help || A.h) { console.log(read(fileURLToPath(import.meta.url)).split('\n').slice(1, 16).join('\n').replace(/^\/\*|\*\/$/g, '')); process.exit(0); }
const SRC = path.resolve(A._[0] || A.src || '.');
if (!exists(path.join(SRC, 'content.html'))) { console.error(`Нет ${path.join(SRC, 'content.html')}. Создайте проект: node ${path.relative(process.cwd(), KIT_DIR)}/new.mjs <папка>`); process.exit(1); }
const config = exists(path.join(SRC, 'config.json')) ? JSON.parse(read(path.join(SRC, 'config.json'))) : {};
for (const k of ['format', 'theme', 'title', 'lang']) if (typeof A[k] === 'string') config[k] = A[k];
const format = config.format === 'deck' ? 'deck' : 'page';
const target = A.offline ? 'offline' : (A.target || config.target || 'standalone');
const OUT = path.resolve(A.out || path.join(SRC, 'dist', 'index.html'));
const OUTDIR = path.dirname(OUT);
const lang = config.lang || 'ru';
const title = config.title || 'Без названия';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/* ---------- theme ---------- */
function themeDir(name) {
  const builtIn = path.join(KIT_DIR, 'themes', name);
  if (exists(path.join(builtIn, 'theme.json'))) return builtIn;
  const own = path.resolve(SRC, name);
  if (exists(path.join(own, 'theme.json'))) return own;
  const all = fs.readdirSync(path.join(KIT_DIR, 'themes')).join(', ');
  throw new Error(`Тема «${name}» не найдена. Встроенные: ${all}; либо путь к папке с theme.json и theme.css.`);
}
const TDIR = themeDir(config.theme || 'abyss');
const theme = JSON.parse(read(path.join(TDIR, 'theme.json')));
const fonts = Object.assign({}, theme.fonts, config.fonts || {});

/* ---------- assets ---------- */
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.json': 'application/json' };
const dataUri = file => `data:${MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'};base64,${fs.readFileSync(file).toString('base64')}`;
const files = {}; // published path -> source path
function walk(dir, base, prefix) {
  if (!exists(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, base, prefix);
    else if (!f.startsWith('.')) files[prefix + path.relative(base, p).split(path.sep).join('/')] = p;
  }
}
walk(path.join(SRC, 'assets'), path.join(SRC, 'assets'), 'assets/');
walk(path.join(TDIR, 'assets'), path.join(TDIR, 'assets'), 'theme/');
const ambient = JSON.parse(JSON.stringify(theme.ambient || {}));
if (ambient.sprite) { const pub = 'theme/' + ambient.sprite.replace(/^assets\//, ''); ambient.sprite = target === 'offline' ? dataUri(files[pub]) : pub; }

/* ---------- css ---------- */
const core = f => read(path.join(KIT_DIR, 'core', f));
let css = read(path.join(TDIR, 'theme.css')) + '\n' + core('base.css') + '\n' + core(format + '.css') + '\n';
if (config.draw !== false) css += core('draw.css') + '\n';
const tok = o => Object.entries(o).map(([k, v]) => `${k.startsWith('--') ? k : '--' + k}: ${v};`).join(' ');
const fontTok = {}; for (const r of ['display', 'body', 'mono']) if (config.fonts && config.fonts[r]) fontTok['--f-' + r] = config.fonts[r];
if (config.tokens || Object.keys(fontTok).length) css += `:root { ${tok(Object.assign({}, fontTok, config.tokens || {}))} }\n`;
if (config.tokensDark) css += `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${tok(config.tokensDark)} } }\n:root[data-theme="dark"] { ${tok(config.tokensDark)} }\n`;
if (exists(path.join(SRC, 'style.css'))) css += '/* content */\n' + read(path.join(SRC, 'style.css')) + '\n';

/* ---------- fonts ---------- */
function fontsourceDir(pkg) {
  const tries = [path.join(KIT_DIR, 'node_modules', '@fontsource', pkg), path.join(SRC, 'node_modules', '@fontsource', pkg), path.join(process.cwd(), 'node_modules', '@fontsource', pkg)];
  return tries.find(exists);
}
const SUBSETS = config.fontSubsets || (A['all-subsets'] ? ['cyrillic', 'cyrillic-ext', 'latin', 'latin-ext'] : ['cyrillic', 'latin']);
function inlineFonts() {
  let out = '', missing = [];
  for (const f of fonts.fontsource || []) {
    const dir = fontsourceDir(f.pkg); if (!dir) { missing.push('@fontsource/' + f.pkg); continue; }
    for (const w of f.weights) for (const st of f.italic ? ['', '-italic'] : ['']) {
      const cssFile = path.join(dir, `${w}${st}.css`); if (!exists(cssFile)) continue;
      for (const block of read(cssFile).match(/@font-face\s*{[^}]*}/g) || []) {
        const m = /url\(\.\/files\/([^)]+?)-(\d+)-(normal|italic)\.woff2\)/.exec(block); if (!m) continue;
        const subset = m[1].slice(f.pkg.length + 1);
        if (!SUBSETS.includes(subset)) continue;
        const woff = path.join(dir, 'files', `${m[1]}-${m[2]}-${m[3]}.woff2`);
        out += block.replace(/src:[^;]+;/, `src: url(${dataUri(woff)}) format('woff2');`) + '\n';
      }
    }
  }
  return { out, missing };
}
let fontHead = '';
if (target === 'offline') {
  const { out, missing } = inlineFonts();
  if (missing.length) console.warn(`! Нет пакетов ${missing.join(', ')} — эти шрифты подгрузятся из Google Fonts, если будет сеть. Установите: cd ${path.relative(process.cwd(), KIT_DIR) || '.'} && npm install`);
  css = out + css;
  if (missing.length && fonts.google) fontHead = `<link rel="stylesheet" href="${fonts.google}">\n`;
} else if (fonts.google) {
  fontHead = `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="${fonts.google}">\n`;
}

/* ---------- content + math ---------- */
let content = read(path.join(SRC, 'content.html'));
content = content.replace(/\{\{include:([^}]+)\}\}/g, (_, f) => read(path.resolve(SRC, f.trim())));
let nMath = 0, mathErr = 0, mathCache = '';
if (/<[mM]>/.test(content)) {
  let mj;
  try {
    const { mathjax } = require('mathjax-full/js/mathjax.js');
    const { TeX } = require('mathjax-full/js/input/tex.js');
    const { SVG } = require('mathjax-full/js/output/svg.js');
    const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');
    const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');
    const { AllPackages } = require('mathjax-full/js/input/tex/AllPackages.js');
    const adaptor = liteAdaptor(); RegisterHTMLHandler(adaptor);
    const svg = new SVG({ fontCache: 'global' });
    const doc = mathjax.document('', { InputJax: new TeX({ packages: AllPackages }), OutputJax: svg });
    mj = { adaptor, svg, doc };
  } catch (e) {
    console.error(`В тексте есть формулы, но нет mathjax-full. Установите: cd ${path.relative(process.cwd(), KIT_DIR) || '.'} && npm install`); process.exit(1);
  }
  const conv = (t, display) => {
    nMath++;
    const html = mj.adaptor.outerHTML(mj.doc.convert(t.trim(), { display, em: 18, ex: 8.6, containerWidth: 900 }));
    if (/data-mjx-error|merror/.test(html)) { mathErr++; console.error('! Ошибка TeX:', t.trim()); }
    return html;
  };
  content = content.replace(/<M>([\s\S]*?)<\/M>/g, (_, t) => conv(t, true)).replace(/<m>([\s\S]*?)<\/m>/g, (_, t) => conv(t, false));
  mathCache = `<svg style="display:none" aria-hidden="true">${mj.adaptor.outerHTML(mj.svg.fontCache.getCache())}</svg>\n`;
}

/* ---------- page skeleton ---------- */
let body;
if (format === 'deck') body = `<main id="stage" aria-live="polite">\n${content}\n</main>`;
else {
  const toc = config.toc !== false;
  const brand = config.brand || esc(title);
  body = `<div id="progress"></div>\n<div class="wrap${toc ? '' : ' no-toc'}">\n${toc ? `<nav class="toc" id="toc" aria-label="Оглавление"><div class="brand">${brand}</div></nav>\n` : ''}<main id="main">\n${content}\n</main>\n</div>`;
}
const pub = Object.assign({}, config); delete pub.tokens; delete pub.tokensDark; delete pub.fonts;
const KITJSON = { format, config: pub, theme: { name: theme.name, scheme: theme.scheme, ambient, fonts: fonts.fontsource || [] } };
let js = `document.documentElement.lang = ${JSON.stringify(lang)};\nwindow.KIT = ${JSON.stringify(KITJSON)};\n`;
js += core('runtime.js') + '\n' + core('ambient.js') + '\n' + core(format + '.js') + '\n';
if (config.draw !== false) js += core('draw.js') + '\n';
if (exists(path.join(SRC, 'widgets.js'))) js += '/* ---------- content widgets ---------- */\n' + read(path.join(SRC, 'widgets.js')) + '\n';
js += `Ambient.init(); ${format === 'deck' ? 'Deck' : 'Page'}.init(); if (typeof Ink !== 'undefined') Ink.init();\n`;

let html;
const desc = config.description ? `<meta name="description" content="${esc(config.description)}">\n` : '';
if (target === 'artifact') {
  html = `<title>${esc(title)}</title>\n${format === 'page' ? '<meta name="claude:viewport-fit-sides" content="cover">\n' : ''}${desc}${fontHead}<style>\n${css}</style>\n${mathCache}${body}\n<script>\n${js}</script>\n`;
} else {
  html = `<!doctype html>\n<html lang="${lang}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>${esc(title)}</title>\n${desc}${fontHead}<style>\n${css}</style>\n</head>\n<body>\n${mathCache}${body}\n<script>\n${js}</script>\n</body>\n</html>\n`;
}

/* ---------- write ---------- */
fs.mkdirSync(OUTDIR, { recursive: true });
if (target === 'offline') {
  html = html.replace(/((?:src|href|poster)=["'])((?:assets|theme)\/[^"']+)(["'])/g, (m, a, p, b) => files[p] ? a + dataUri(files[p]) + b : m)
             .replace(/url\((["']?)((?:assets|theme)\/[^)"']+)\1\)/g, (m, q, p) => files[p] ? `url(${dataUri(files[p])})` : m);
} else {
  for (const [p, src] of Object.entries(files)) { const dst = path.join(OUTDIR, p); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); }
}
fs.writeFileSync(OUT, html);
const kb = Math.round(Buffer.byteLength(html) / 1024);
console.log(`✓ ${path.relative(process.cwd(), OUT)} · ${format} · тема ${theme.name} · ${target} · ${kb} КБ · формул ${nMath}${mathErr ? ` (ошибок ${mathErr})` : ''} · файлов ${target === 'offline' ? 0 : Object.keys(files).length}`);
if (target === 'artifact') {
  const map = Object.fromEntries(Object.keys(files).map(p => [p, path.join(OUTDIR, p)]));
  console.log('Публикация: Artifact file_path =', OUT, Object.keys(map).length ? '\n  files = ' + JSON.stringify(map) : '', '\n  icon =', JSON.stringify(theme.icon || 'page'));
}
if (mathErr) process.exit(1);
