#!/usr/bin/env node
/* explainer-kit · new.mjs — start a project from a template.
   node kit/new.mjs <dir> [--format page|deck] [--theme abyss|paper|blueprint] [--title "…"] [--force] */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT_DIR = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), o = { _: [] };
for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); o[k] = v ?? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true); } else o._.push(a); }
const dir = path.resolve(o._[0] || '');
if (!o._[0]) { console.error('Использование: node new.mjs <папка> [--format page|deck] [--theme abyss|paper|blueprint] [--title "…"]'); process.exit(1); }
const format = o.format === 'deck' ? 'deck' : 'page';
const tpl = path.join(KIT_DIR, 'templates', format);
if (fs.existsSync(dir) && fs.readdirSync(dir).length && !o.force) { console.error(`Папка ${dir} не пуста. Добавьте --force, чтобы перезаписать файлы шаблона.`); process.exit(1); }
fs.cpSync(tpl, dir, { recursive: true });
const cfgPath = path.join(dir, 'config.json');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
cfg.format = format;
if (typeof o.theme === 'string') cfg.theme = o.theme;
if (typeof o.title === 'string') cfg.title = o.title;
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
const rel = p => path.relative(process.cwd(), p) || '.';
console.log(`✓ ${rel(dir)}: шаблон «${format}», тема «${cfg.theme}».
Дальше:
  1. правьте ${rel(path.join(dir, 'content.html'))} и ${rel(path.join(dir, 'widgets.js'))}
  2. node ${rel(path.join(KIT_DIR, 'build.mjs'))} ${rel(dir)}            → ${rel(path.join(dir, 'dist/index.html'))}
  3. node ${rel(path.join(KIT_DIR, 'check.mjs'))} ${rel(path.join(dir, 'dist/index.html'))}   → скриншоты и отчёт`);
