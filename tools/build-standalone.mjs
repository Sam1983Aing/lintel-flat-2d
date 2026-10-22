#!/usr/bin/env node
// Folds Lintel v10 into one HTML file for Aura: lintel.html at the project root.
//
// The page is already plain classic scripts (no modules, no imports), so nothing has to be
// bundled: each <script src> and each stylesheet goes inside the file as it is, in the same
// order. three.js, GSAP, ScrollTrigger and Lenis go in from the exact versions the page links,
// cached in tools/standalone/vendor/. The four Google fonts go in as base64 (latin subset, the
// same unicode-range Google serves), cached in tools/standalone/fonts/.
//
// The 14 photos of the service drawer are not inside. They are on the CDN, from the assets
// repo Sam1983Aing/aura-assets, folder lintel/, pinned to TAG. Without a network the page still
// runs: the house is all code (materials and sky), and a photo that cannot load is hidden so the
// card shows its own colour instead of a broken image.
//
// v10 is frozen and is never edited for this. The only change made to its code on the way in:
// the 'assets/<photo>.jpg' paths in scene.js point at the CDN.
//
// --aura makes the lighter file Aura's editor accepts (it refuses a page over 1,048,576 bytes,
// and the full one is 2.5 MB): lintel-aura.html. Three things change. The libraries stay
// <script src> tags at the same pinned versions, the fonts stay the Google Fonts link (both as
// v10 itself loads them), and the page's own scripts are minified with tools/publish/strip.mjs,
// which also takes the comments out of the shaders. The stylesheets lose their comments and the
// markup its HTML comments. It needs a network for the libraries and the fonts, which Aura has.
//
//   node tools/build-standalone.mjs                    lintel.html, photos from the CDN at TAG
//   node tools/build-standalone.mjs --aura             lintel-aura.html, under Aura's size limit
//   node tools/build-standalone.mjs --no-cdn-check     the same, without comparing the CDN to the local photos
//   node tools/build-standalone.mjs --asset-base=URL   photos from URL instead (testing before a push), writes lintel-local.html
//
// New photos: README.md, "The standalone file for Aura".

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { tokenizer } from './publish/node_modules/acorn/dist/acorn.mjs';

// Bump after pushing new photos to the assets repo. A tag, never a branch: a file already out
// in the world must not change because something was pushed later.
const TAG = '1.22.0';
const CDN = `https://cdn.jsdelivr.net/gh/Sam1983Aing/aura-assets@${TAG}/lintel/`;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, '001 Lintel/v10');
const CACHE = join(root, 'tools/standalone');
const assetBase = process.argv.find((a) => a.startsWith('--asset-base='))?.slice(13);
const BASE = assetBase ? assetBase.replace(/\/?$/, '/') : CDN;
const AURA = process.argv.includes('--aura');
const AURA_LIMIT = 1_000_000;   // Aura refuses over 1,048,576 bytes, and counts a few hundred more than the file has
const OUT = join(root, `lintel${AURA ? '-aura' : ''}${assetBase ? '-local' : ''}.html`);

const read = (p) => readFileSync(join(SRC, p), 'utf8');
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

// A file from the network, kept in the cache after the first build so the next one needs no network.
async function cached(url, dir) {
  const file = join(CACHE, dir, url.replace(/^https:\/\//, '').replace(/[^\w.@-]+/g, '_'));
  if (!existsSync(file)) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log(`fetched ${url}`);
  }
  return readFileSync(file);
}

// ---------------------------------------------------------------- are the photos on the CDN?

const photos = readdirSync(join(SRC, 'assets')).filter((f) => /\.(jpg|png|webp)$/.test(f));
if (!assetBase && !process.argv.includes('--no-cdn-check')) {
  const stale = (await Promise.all(photos.map(async (f) => {
    const res = await fetch(CDN + f);
    if (!res.ok) return `${f} (${res.status})`;
    return sha(Buffer.from(await res.arrayBuffer())) === sha(readFileSync(join(SRC, 'assets', f))) ? null : `${f} (changed)`;
  }))).filter(Boolean);
  if (stale.length) throw new Error(`the CDN at ${TAG} does not have the local photos: ${stale.join(', ')}. Push them under a new tag and set TAG.`);
  console.log(`${photos.length} photos on the CDN at ${TAG} match the local copies`);
}

// ---------------------------------------------------------------- the page

let html = read('index.html');
// (Aura: the notes in the markup go. index.html has no inline script or style for this to reach into.)
if (AURA) html = html.replace(/\n?[ \t]*<!--[\s\S]*?-->/g, '');
const swap = (from, to) => {
  if (!html.includes(from)) throw new Error(`index.html no longer has: ${from.slice(0, 80)}`);
  html = html.split(from).join(to);
};
// `</script` only ever occurs in a string, a comment or a regex in JavaScript, and `<\/script`
// reads the same in all three, so this cannot change what the code does.
const safe = (js) => js.replaceAll('</script', '<\\/script');

// The fonts: the latin block of each face Google serves, one @font-face per file (Geist and
// Geist Mono are variable, one file for all their weights).
const fontLink = html.match(/<link href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)" rel="stylesheet" \/>/);
if (!fontLink) throw new Error('index.html no longer links its Google fonts the way this build expects');
const fontCss = (await cached(fontLink[1].replaceAll('&amp;', '&'), 'fonts')).toString();
const faces = new Map();
for (const m of fontCss.matchAll(/\/\* latin \*\/\s*@font-face\s*\{([^}]*)\}/g)) {
  const get = (k) => (m[1].match(new RegExp(`${k}:\\s*([^;]+);`)) || [])[1]?.trim();
  const url = get('src').match(/url\(([^)]+)\)/)[1];
  const key = `${get('font-family')}|${get('font-style')}|${url}`;
  const f = faces.get(key) || { family: get('font-family'), style: get('font-style'), url, range: get('unicode-range'), weights: [] };
  f.weights.push(Number(get('font-weight')));
  faces.set(key, f);
}
if (faces.size < 5) throw new Error(`expected 5 font files (Instrument Serif x2, Saira Stencil One, Geist, Geist Mono), found ${faces.size}`);
const fonts = [];
if (!AURA) {
  for (const f of faces.values()) {
    const w = [Math.min(...f.weights), Math.max(...f.weights)];
    const b64 = (await cached(f.url, 'fonts')).toString('base64');
    fonts.push(`@font-face{font-family:${f.family};font-style:${f.style};font-weight:${w[0] === w[1] ? w[0] : w.join(' ')};font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2');unicode-range:${f.range};}`);
  }
  html = html.replace(/\n\s*<link rel="preconnect"[^>]*>/g, '');
  swap(fontLink[0], `<style>\n${fonts.join('\n')}\n</style>`);
}

// The two stylesheets. (Aura: without their comments, blank lines and indentation.)
const lean = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]+/gm, '').replace(/\n{2,}/g, '\n').trim();
for (const css of ['shared/fx-ui.css', 'theme.css']) swap(`<link rel="stylesheet" href="${css}" />`, `<style>\n${AURA ? lean(read(css)) : read(css)}\n</style>`);

// Aura: a page script through the publish copy's stripper (terser, plus the comments out of the shaders).
const MIN = join(CACHE, 'min');
const minify = (name, js) => {
  mkdirSync(MIN, { recursive: true });
  const src = join(MIN, name.replace(/\//g, '_')), out = src.replace(/\.js$/, '.min.js');
  writeFileSync(src, js);
  execFileSync('node', [join(root, 'tools/publish/strip.mjs'), src, out], { stdio: 'pipe' });
  return auraSafe(readFileSync(out, 'utf8'));
};

// Aura will not save a page when an inline script looks to it like it has an unterminated
// string. Its check (unterminated() below, copied from Aura's editor, 21 Oct 2026) walks the
// script for quotes, backticks and comments but does not know regex literals, so staging.js's
// /['"]/g reads to it as a string that never ends. In a regex literal a quote or a backtick is
// therefore written as its \x escape, which matches the same character.
function auraSafe(js) {
  const edits = [];
  for (const tk of tokenizer(js, { ecmaVersion: 'latest' })) {
    if (tk.type.label !== 'regexp') continue;
    const text = js.slice(tk.start, tk.end);
    if (!/['"`]/.test(text)) continue;
    const hex = { "'": '\\x27', '"': '\\x22', '`': '\\x60' };
    // an odd run of backslashes before the quote escapes it (\' is a quote too): one of them goes
    edits.push([tk.start, tk.end, text.replace(/(\\*)(['"`])/g, (_, bs, q) => bs.slice(bs.length % 2) + hex[q])]);
  }
  for (const [a, b, text] of edits.reverse()) js = js.slice(0, a) + text + js.slice(b);
  return js;
}
function unterminated(e) {
  let t = null, r = false;
  for (let n = 0; n < e.length; n += 1) {
    const s = e[n], o = e[n + 1];
    if (t === 'line-comment') { if (s === '\n' || s === '\r') t = null; continue; }
    if (t === 'block-comment') { if (s === '*' && o === '/') { t = null; n += 1; } continue; }
    if (t) {
      if (r) { r = false; continue; }
      if (s === '\\') { r = true; continue; }
      if ((t === 'single' && s === "'") || (t === 'double' && s === '"') || (t === 'template' && s === '`')) t = null;
      continue;
    }
    if (s === '/' && o === '/') { t = 'line-comment'; n += 1; continue; }
    if (s === '/' && o === '*') { t = 'block-comment'; n += 1; continue; }
    if (s === "'") t = 'single'; else if (s === '"') t = 'double'; else if (s === '`') t = 'template';
  }
  return t === 'single' || t === 'double' || t === 'template';
}

// The scripts, in the page's own order.
let libs = 0, own = 0;
for (const m of [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]) {
  const src = m[1];
  let js;
  if (/^https:/.test(src)) {
    libs++;
    if (AURA) continue;   // the <script src> tag stays as it is
    js = (await cached(src, 'vendor')).toString();
  } else {
    js = read(src);
    if (src === 'scene.js') {
      let n = 0;
      js = js.replace(/(['"`])assets\/([\w-]+\.(?:jpg|png|webp))\1/g, (_, q, f) => {
        if (!photos.includes(f)) throw new Error(`scene.js asks for assets/${f}, which is not in v10/assets/`);
        n++;
        return `${q}${BASE}${f}${q}`;
      });
      if (n < photos.length) throw new Error(`scene.js points at ${n} photos, expected at least ${photos.length}`);
      console.log(`scene.js: ${n} photo paths now read from ${BASE}`);
    }
    if (AURA) js = minify(src, js);
    own++;
  }
  swap(m[0], `<script>\n// ${src}\n${safe(js)}\n</script>`);
}

// A photo that cannot load (no network) is hidden, so its card shows its own colour instead of
// a broken image. It comes back when a later one loads into the same element (the sliders swap src).
const fallback = `<script>
addEventListener('error', function (e) { var t = e.target; if (t && t.tagName === 'IMG') t.style.visibility = 'hidden'; }, true);
addEventListener('load', function (e) { var t = e.target; if (t && t.tagName === 'IMG') t.style.visibility = ''; }, true);
</script>`;
const stamp = new Date().toISOString().slice(0, 10);
swap('<head>', `<head>\n  <!-- Lintel v10, the standalone file for Aura (tools/build-standalone.mjs, ${stamp}). Photos: ${BASE} -->\n  ${fallback}`);

// Anything relative left in the markup would be a 404 once the file is on its own. (The scripts'
// own templates, `src="${it.img}"`, are filled from the paths swapped above.)
const markup = html.replace(/<script>[\s\S]*?<\/script>/g, '').replace(/<style>[\s\S]*?<\/style>/g, '');
const left = [...markup.matchAll(/\b(?:src|href)="(?!https?:|data:|#|mailto:)([^"]+)"/g)].map((m) => m[1]);
if (left.length) throw new Error(`relative references left in the page: ${left.join(', ')}`);
writeFileSync(OUT, html);

// Each inline script must parse as a classic script, the way a browser reads it from file://.
// (Not `node --check` on a .js file: node 22 and later take one with an import in it for a
// module and pass it.) vm.Script compiles as a classic script and does not run it.
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
scripts.forEach((m, i) => {
  try { new vm.Script(m[1], { filename: `inline script ${i}` }); } catch (e) { throw new Error(`inline script ${i} is not a classic script: ${e.message}`); }
});
const bytes = statSync(OUT).size;
console.log(`${relative(root, OUT)}: ${bytes.toLocaleString('en')} bytes, ${libs} libraries ${AURA ? 'linked' : 'inline'} and ${own} page scripts inline${AURA ? ' (minified)' : ''}, ${AURA ? 'fonts linked' : `${faces.size} font files inline`}, ${scripts.length} scripts parse, photos from ${BASE}`);
if (AURA && bytes > AURA_LIMIT) throw new Error(`${bytes.toLocaleString('en')} bytes is over the ${AURA_LIMIT.toLocaleString('en')} kept for Aura`);
if (AURA) {
  const refused = scripts.map((m) => m[1]).filter(unterminated).map((js) => (js.match(/^\s*\/\/ (\S+)/) || [])[1] || 'the fallback');
  if (refused.length) throw new Error(`Aura would refuse to save: ${refused.join(', ')} looks unterminated to its check`);
  console.log('every inline script passes Aura\'s save check');
}
