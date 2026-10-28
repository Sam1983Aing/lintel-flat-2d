#!/usr/bin/env node
// Writes the live copy of Lintel v10 into publish/lintel-live/, its own git repository: the
// public Sam1983Aing/lintel-live, served by GitHub Pages at https://sam1983aing.github.io/lintel-live/
// (the working repository, lintel-flat-2d, is private, and GitHub Pages needs a paid plan for that).
//
// Only the page goes in: v10's index.html, the stylesheets and scripts it links, and the photos.
// No briefs, no teach notes, no older versions. The scripts are minified with tools/publish/strip.mjs
// (the same stripper as the casa-serra copy), the stylesheets and the markup lose their comments.
// The .git folder in publish/lintel-live/ is kept, so its history stays.
//
//   node tools/build-live.mjs
//   git -C publish/lintel-live add -A && git -C publish/lintel-live commit -m "what changed" && git -C publish/lintel-live push

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, '001 Lintel/v10');
const OUT = join(root, 'publish/lintel-live');
const URL = 'https://sam1983aing.github.io/lintel-live/';

// Start clean, but keep the repository.
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f !== '.git') rmSync(join(OUT, f), { recursive: true, force: true });
const write = (p, text) => { mkdirSync(dirname(join(OUT, p)), { recursive: true }); writeFileSync(join(OUT, p), text); };

// The page, and what it links.
const html = readFileSync(join(SRC, 'index.html'), 'utf8');
const css = [...html.matchAll(/<link rel="stylesheet" href="(?!https?:)([^"]+)"/g)].map((m) => m[1]);
const js = [...html.matchAll(/<script src="(?!https?:)([^"]+)"/g)].map((m) => m[1]);
if (css.length !== 2 || js.length !== 12) throw new Error(`index.html links ${css.length} stylesheets and ${js.length} scripts, expected 2 and 12`);
write('index.html', html.replace(/\n?[ \t]*<!--[\s\S]*?-->/g, ''));
for (const f of css) write(f, readFileSync(join(SRC, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]+/gm, '').replace(/\n{2,}/g, '\n').trim() + '\n');
for (const f of js) {
  mkdirSync(dirname(join(OUT, f)), { recursive: true });
  execFileSync('node', [join(root, 'tools/publish/strip.mjs'), join(SRC, f), join(OUT, f)], { stdio: 'pipe' });
  new vm.Script(readFileSync(join(OUT, f), 'utf8'), { filename: f });   // still a classic script
}

// The photos the cards show (scene.js asks for assets/<name>.jpg).
const photos = readdirSync(join(SRC, 'assets')).filter((f) => /\.(jpg|png|webp)$/.test(f));
const asked = [...new Set([...readFileSync(join(SRC, 'scene.js'), 'utf8').matchAll(/['"`]assets\/([\w-]+\.(?:jpg|png|webp))['"`]/g)].map((m) => m[1]))];
const missing = asked.filter((f) => !photos.includes(f));
if (missing.length) throw new Error(`scene.js asks for photos that are not in v10/assets/: ${missing.join(', ')}`);
for (const f of asked) { mkdirSync(join(OUT, 'assets'), { recursive: true }); copyFileSync(join(SRC, 'assets', f), join(OUT, 'assets', f)); }

writeFileSync(join(OUT, '.nojekyll'), '');
write('README.md', `# Lintel · Casa Serra

An architecture studio landing page. A 1:200 floor plan rises into a 3D house you walk through room by room.

Live: ${URL}

This repository only serves the page. The working project is private.
`);

let files = 0, bytes = 0;
(function walk(d) { for (const f of readdirSync(d)) { if (f === '.git') continue; const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else { files++; bytes += statSync(p).size; } } })(OUT);
console.log(`${relative(root, OUT)}: ${files} files, ${(bytes / 1e6).toFixed(2)} MB (${js.length} scripts minified, ${asked.length} photos)`);
