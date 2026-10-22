#!/usr/bin/env python3
"""Build the published copy of Lintel into publish/lintel/.

  python3 tools/publish_lintel.py [--readable] [--textures full|light|phone]

The working page in "001 Lintel/" is never touched. This reads it and writes a
flat folder that GitHub Pages can serve from https://<USER>.github.io/<REPO>/:

  - shared/ moves inside, the two asset paths in scene.js become relative to the page
  - only the files the page really loads are copied (tools/publish/assets.json, read
    from the page itself with performance.getEntriesByType('resource') after a walk
    to the end, 12 Oct 2026: 41 files)
  - tools/publish/gate.js goes in front of the engine: a still, the clip and one line
    for a device that cannot draw the page
  - share tags, a work in progress mark, a credit
  - the starter prompt gets links of its own, from one text file (tools/publish/starter-prompt.txt):
    starter-prompt.md in the repo (the link Sam shares: the prompt in a box with GitHub's copy
    button, lines wrapped so nobody scrolls sideways), the README, and prompt/ on the live site
  - scripts and styles are stripped of their comments and minified (--readable keeps
    them as they are in the project)
  - --textures says how heavy the page is (TEXTURES below is the default):
      full    the 2048 px scans the working page uses, for everyone
      light   the five heaviest sets at 1024 px, for everyone
      phone   full on a laptop, every set at 1024 px on a phone or tablet (the same test
              the engine uses to lower its render size). A quarter of the memory there.

Then it checks what Linux hosting cares about and macOS does not: the exact case of
every path, no spaces, nothing that points outside the folder.

Everything Sam decides is a constant below. Change one, run it again.
The first time: cd tools/publish && npm install   (acorn and terser, for the minifier)
"""
import html as htmllib, json, os, re, shutil, subprocess, sys, textwrap

USER = "sam1983aing"
REPO = "casa-serra"                    # the repo's name is the last part of the link
SHARE = "share-split.jpg"              # the picture a pasted link shows: share-split.jpg or share-pair.jpg (tools/publish/media/)
TITLE = "Lintel · Casa Serra"
DESC = "At first it looks like a flat floor plan of a house. Until you scroll. Work in progress."
WIP = "Work in progress"
PHONE_NOTE = "best on a laptop"
CREDIT = "A concept by Sam Aing, built with Claude Opus 5.5"
CREDIT_LINK = ""                       # one link for the credit. Empty: plain text
BUTTONS = ""                           # where "Start a project", "Work | Studio | Contact" and the closing buttons go. Empty: as on the working page
TEXTURES = "phone"                     # full, light or phone (see above). phone since the first push, 12 Oct 2026
LIGHT_SETS = ["withered_grass", "gravel_floor_02", "poly_wool_herringbone", "leather_red_02", "rough_linen"]   # the five heaviest, 23.4 of 38.6 MB
SMALL = 1024                           # the edge of a lighter texture, in pixels
PHONE = "(max-width: 760px), (pointer: coarse)"    # what the engine calls LOW (fx-experience.js)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "001 Lintel")
SRC = os.path.join(HERE, "publish")
OUT = os.path.join(ROOT, "publish", "lintel")
SITE = f"https://{USER}.github.io/{REPO}/"
MINIFY = "--readable" not in sys.argv
if "--textures" in sys.argv:
    TEXTURES = sys.argv[sys.argv.index("--textures") + 1]

SCRIPTS = ["shared/fx-core.js", "shared/fx-post.js", "shared/fx-paint.js", "shared/fx-experience.js",
           "staging.js", "hero-options.js", "light-options.js", "scene.js"]
STYLES = ["shared/fx-ui.css", "theme.css"]


def die(msg):
    sys.exit("publish_lintel: " + msg)


def exact(base, rel):
    """True when rel exists under base with exactly this case (macOS says yes to any case)."""
    at = base
    for part in rel.split("/"):
        if part not in os.listdir(at):
            return False
        at = os.path.join(at, part)
    return True


def sub(text, old, new, count=1):
    if text.count(old) != count:
        die(f"expected {count} of {old!r}, found {text.count(old)}")
    return text.replace(old, new)


def source(rel):
    return os.path.join(ROOT, rel) if rel.startswith("shared/") else os.path.join(PAGE, rel)


def write(rel, text):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(text)


def small(rel):
    """A 1024 px copy of one texture, made once and kept in tools/publish/media/tex-small/."""
    kept = os.path.join(SRC, "media", "tex-small", rel[len("assets/tex/"):])
    if not os.path.exists(kept):
        os.makedirs(os.path.dirname(kept), exist_ok=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(ROOT, rel), "-vf", f"scale={SMALL}:{SMALL}:flags=lanczos", "-q:v", "2", kept], check=True)
    return kept


def strip_js(path):
    r = subprocess.run(["node", os.path.join(SRC, "strip.mjs"), path, path], capture_output=True, text=True)
    if r.returncode:
        die("strip.mjs failed on " + path + "\n" + r.stdout + r.stderr)
    print("  " + r.stdout.strip())


def strip_css(text):
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return "\n".join(line.rstrip() for line in text.split("\n") if line.strip()) + "\n"


def main():
    if MINIFY and not os.path.isdir(os.path.join(SRC, "node_modules", "terser")):
        die("the minifier is not installed: cd tools/publish && npm install")

    # a clean folder, keeping the repository if there is one
    os.makedirs(OUT, exist_ok=True)
    for name in os.listdir(OUT):
        if name == ".git":
            continue
        p = os.path.join(OUT, name)
        shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)

    # ---- the textures and the sky, as the page asked for them
    if TEXTURES not in ("full", "light", "phone"):
        die("--textures is full, light or phone")
    assets = json.load(open(os.path.join(SRC, "assets.json")))
    weight = phone_weight = 0
    for rel in assets:
        if not exact(ROOT, rel):
            die("not on disk with this exact case: " + rel)
        dst = os.path.join(OUT, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        tex = rel.startswith("assets/tex/")
        lighter = TEXTURES == "light" and tex and rel.split("/")[2] in LIGHT_SETS
        shutil.copyfile(small(rel) if lighter else os.path.join(ROOT, rel), dst)
        weight += os.path.getsize(dst)
        if TEXTURES == "phone" and tex:
            dst = os.path.join(OUT, rel.replace("assets/tex/", "assets/tex-1k/"))
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copyfile(small(rel), dst)
        phone_weight += os.path.getsize(dst)
    mb = str(round(weight / 1e6))
    phone_mb = str(round(phone_weight / 1e6))

    # ---- scripts and styles
    for rel in SCRIPTS + STYLES:
        text = open(source(rel)).read()
        if rel == "scene.js":
            tex = f"matchMedia('{PHONE}').matches ? 'assets/tex-1k/' : 'assets/tex/'" if TEXTURES == "phone" else "'assets/tex/'"
            text = sub(text, "const TEX = '../assets/tex/';", f"const TEX = {tex};")
            text = sub(text, "const SKY = '../assets/sky/';", "const SKY = 'assets/sky/';")
        if rel.endswith(".css") and MINIFY:
            text = strip_css(text)
        write(rel, text)
    size = f"matchMedia('{PHONE}').matches ? '{phone_mb}' : '{mb}'" if TEXTURES == "phone" else f"'{mb}'"
    write("gate.js", sub(open(os.path.join(SRC, "gate.js")).read(), "'__MB__'", size))
    css = open(os.path.join(SRC, "publish.css")).read()
    write("publish.css", strip_css(css) if MINIFY else css)
    if MINIFY:
        for rel in SCRIPTS + ["gate.js"]:
            strip_js(os.path.join(OUT, rel))

    # ---- the still, the clip, the share picture
    os.makedirs(os.path.join(OUT, "media"), exist_ok=True)
    for name, to in (("still.jpg", "still.jpg"), ("walk.mp4", "walk.mp4"), (SHARE, "share.jpg"),
                     ("casa-larga-sheet.jpg", "casa-larga-sheet.jpg"), ("casa-larga-hall.jpg", "casa-larga-hall.jpg")):
        shutil.copyfile(os.path.join(SRC, "media", name), os.path.join(OUT, "media", to))

    # ---- the page
    html = open(os.path.join(PAGE, "index.html")).read()
    html = sub(html, "../shared/", "shared/", 5)
    if MINIFY:
        html = re.sub(r"\n\s*<!--.*?-->", "", html, flags=re.S)
    icon = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23efebe2'/%3E"
            "%3Cpath d='M9 6v20h15v-5h-9V6z' fill='%231d1d1f'/%3E%3C/svg%3E")
    head = f"""  <meta name="theme-color" content="#efebe2" />
  <link rel="icon" href="{icon}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="{TITLE}" />
  <meta property="og:description" content="{DESC}" />
  <meta property="og:url" content="{SITE}" />
  <meta property="og:image" content="{SITE}media/share.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{TITLE}" />
  <meta name="twitter:description" content="{DESC}" />
  <meta name="twitter:image" content="{SITE}media/share.jpg" />
"""
    html = sub(html, '  <link rel="preconnect" href="https://fonts.googleapis.com" />', head + '  <link rel="preconnect" href="https://fonts.googleapis.com" />')
    html = sub(html, '  <link rel="stylesheet" href="theme.css" />', '  <link rel="stylesheet" href="theme.css" />\n  <link rel="stylesheet" href="publish.css" />')
    bar = '    <div class="loader__bar"><span>Drawing</span><i><b id="loadFill"></b></i><span id="loadPct">0%</span></div>'
    html = sub(html, bar, bar + f'\n    <p class="loader__note">{WIP}<span> · {PHONE_NOTE}</span></p>')
    html = sub(html, "  </header>", f'  </header>\n  <p class="wip">{WIP}</p>')
    credit = f'<a href="{CREDIT_LINK}" target="_blank" rel="noopener">{CREDIT}</a>' if CREDIT_LINK else CREDIT
    meta_end = "      <span>Materials: Poly Haven, CC0</span>\n    </div>"
    html = sub(html, meta_end, meta_end + f'\n    <p class="credit">{credit} · {WIP}</p>')
    if BUTTONS:
        html = sub(html, '<a class="pill" href="#finale" data-to="end">', f'<a class="pill" href="{BUTTONS}" target="_blank" rel="noopener">')
        html = sub(html, '<a class="pill pill--solid" href="#">', f'<a class="pill pill--solid" href="{BUTTONS}" target="_blank" rel="noopener">')
        html = sub(html, '<a class="link" href="#">', f'<a class="link" href="{BUTTONS}" target="_blank" rel="noopener">')
        html = sub(html, '<a href="#finale" data-to="end">', f'<a href="{BUTTONS}" target="_blank" rel="noopener">', 3)
    three = '  <script src="https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.min.js"></script>'
    html = sub(html, three, '  <script src="gate.js"></script>\n' + three)
    engine = '  <script src="shared/fx-experience.js"></script>'
    html = sub(html, engine, engine + "\n  <script>if (window.LINTEL_GATE && !LINTEL_GATE.ok) FX.experience = function () {};</script>")
    write("index.html", html)

    # ---- the starter prompt, on a page of its own
    prompt = open(os.path.join(SRC, "starter-prompt.txt")).read().strip()
    shown = re.sub(r"(\[[^\]]+\])", r"<mark>\1</mark>", htmllib.escape(prompt, quote=False))
    page = open(os.path.join(SRC, "prompt.html")).read()
    for key, value in (("__PROMPT_HTML__", shown), ("__PROMPT_JSON__", json.dumps(prompt).replace("</", "<\\/")), ("__SITE__", SITE),
                       ("__ICON__", icon), ("__CREDIT__", f"{CREDIT} · {WIP}"), ("__GH__", f"Sam1983Aing/{REPO}")):
        if key not in page:
            die("prompt.html has no " + key)
        page = page.replace(key, value)
    write("prompt/index.html", page)
    # the same prompt for GitHub's own pages: a code block there does not wrap, so the lines are cut at 88
    wrapped = "\n".join(textwrap.fill(line, 88, subsequent_indent="  " if line.startswith("- ") else "", break_long_words=False) if line else ""
                        for line in prompt.split("\n"))
    write("starter-prompt.md", open(os.path.join(SRC, "starter-prompt.md")).read().replace("__SITE__", SITE).replace("__PROMPT_WRAPPED__", wrapped))

    # ---- what the host needs
    write(".nojekyll", "")
    write("README.md", open(os.path.join(SRC, "README.md")).read().replace("__SITE__", SITE).replace("__MB__", mb).replace("__PHONE_MB__", phone_mb).replace("__PROMPT__", wrapped))

    # ---- checks
    bad = []
    for d, dirs, files in os.walk(OUT):
        dirs[:] = [x for x in dirs if x != ".git"]
        for name in dirs + files:
            if " " in name:
                bad.append("a space in a name: " + os.path.join(d, name))
    refs = re.findall(r'(?:src|href)="([^"#]+)"', html) + re.findall(r'content="' + re.escape(SITE) + r'([^"]+)"', html)
    for ref in refs:
        if ref.startswith(("http", "data:")):
            continue
        if ref.startswith(("/", "..")):
            bad.append("points outside the folder: " + ref)
        elif not exact(OUT, ref):
            bad.append("not in the folder with this exact case: " + ref)
    for ref in re.findall(r'(?:src|href)="([^"#]+)"', page):
        if ref.startswith(("http", "data:")):
            continue
        inside = os.path.normpath(os.path.join("prompt", ref))
        if inside.startswith("..") or ref.startswith("/"):
            bad.append("prompt page points outside the folder: " + ref)
        elif inside != "." and not exact(OUT, inside):
            bad.append("prompt page, not in the folder with this exact case: " + ref)
    for rel in SCRIPTS + STYLES + ["gate.js", "publish.css"]:
        text = open(os.path.join(OUT, rel)).read()
        if "../" in text or "localhost" in text:
            bad.append("a path that leaves the folder, or localhost, in " + rel)
    if len(assets) != 41:
        bad.append(f"{len(assets)} assets, the page loaded 41")
    if bad:
        die("\n  " + "\n  ".join(bad))

    total = code = 0
    for d, dirs, files in os.walk(OUT):
        dirs[:] = [x for x in dirs if x != ".git"]
        for name in files:
            n = os.path.getsize(os.path.join(d, name))
            total += n
            if name.endswith((".js", ".css", ".html")):
                code += n
    phone = f" (a phone loads {phone_weight / 1e6:.1f} MB)" if TEXTURES == "phone" else ""
    print(f"publish/lintel: {len(assets)} assets {weight / 1e6:.1f} MB{phone}, textures {TEXTURES}, code {code / 1e3:.0f} kB "
          f"({'minified' if MINIFY else 'readable'}), everything {total / 1e6:.1f} MB. Checks passed.")
    print(f"will be served from {SITE}")


if __name__ == "__main__":
    main()
