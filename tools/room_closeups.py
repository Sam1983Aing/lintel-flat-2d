#!/usr/bin/env python3
"""Close-ups of one of Lintel's rooms, always from the same places, for comparing scans and code (?code=).

  python3 tools/room_closeups.py <url> <outdir> --room entrance [--only door,wall] [--dpr 2] [--size 1728x992]

The page stands at the rest where the room is real (read from the page's own keys), then the camera is placed by
hand with the page's design aid (__cam, plan coordinates: p = [x, y, eye height], look = [x, y, height]). Depth of
field is off and the small print is hidden, so the stills show only the room. Run from 014 Flat 3D/ with the server
up. tools/living_closeups.py is the living room's version of this, kept as it was for its earlier stills.
"""
import json, os, subprocess, sys, tempfile

args = sys.argv[1:]
if len(args) < 2 or '--room' not in args:
    print(__doc__); sys.exit(1)
url, out = args[0], os.path.abspath(args[1])
opt = lambda k, d=None: (args[args.index(k) + 1] if k in args else d)
only = set((opt('--only') or '').split(',')) - {''}
dpr, size, room = opt('--dpr', '2'), opt('--size', '1728x992'), opt('--room')
here = os.path.dirname(os.path.abspath(__file__))
os.makedirs(out, exist_ok=True)

# room: (the key whose rest makes it real, its place in that rest 0 to 1, { name: (camera, where it looks, lens) })
ROOMS = {
    'entrance': ('hall', 0.5, {
        'wall':     ([14.5, 22.5, 1.6], [11.2, 21.0, 2.2], 50),       # the west wall's board concrete and its tie holes
        'wallnear': ([12.6, 21.2, 1.5], [11.0, 20.0, 1.7], 40),       # the same wall from a metre and a half
        'door':     ([17.4, 23.2, 1.6], [14.3, 25.6, 2.0], 50),       # the pivot door's face, standing open
        'console':  ([13.5, 22.0, 1.3], [11.55, 21.5, 0.9], 46),      # the smoked oak console, the bench beside it
        'hall':     ([10.0, 18.5, 1.4], [10.0, 24.0, 0.0], 50),       # the hall's travertine floor
        'wc':       ([20.0, 18.0, 1.5], [20.0, 24.0, 0.3], 56),       # the WC's floor and walls
        'ceiling':  ([15.0, 24.0, 1.6], [15.0, 18.0, 4.6], 56),       # the ceiling, the clerestory and its piers
        'room':     ([15.6, 25.2, 1.6], [15.0, 17.5, 1.8], 58),       # the whole entrance from the door
    }),
    # (iteration 8, the entrance redesigned on Sam's notes of 15 Oct: the front wall, its vessels, the floor's slabs, the light)
    'entrance2': ('hall', 0.5, {
        'front':    ([15.0, 24.6, 1.6], [15.0, 17.0, 2.0], 62),       # the front wall round the opening, the two vessels
        'vessel':   ([13.4, 19.3, 1.45], [11.5, 17.4, 1.1], 44),      # the west vessel and its branches, close
        'floor':    ([15.6, 24.8, 1.55], [14.6, 19.5, 0.0], 55),      # the slabs and their joints, from the door
        'chand':    ([15.7, 24.4, 1.5], [15.0, 21.3, 3.3], 56),       # the light over the room's middle
        'room':     ([15.6, 25.2, 1.6], [15.0, 17.5, 1.8], 58),       # the whole entrance from the door
        'console2': ([13.9, 20.6, 1.25], [11.6, 19.1, 0.55], 50),     # the console in the corner, its drawers (16 Oct)
        'necks':    ([13.0, 18.6, 1.55], [11.73, 17.45, 1.2], 40),    # the west vessel's neck and where its branches leave it
    }),
    # (iteration 8, the master bedroom on Sam's notes of the night of 15 to 16 Oct: the king bed, the higher headboard, the rug)
    'bedroom': ('bedroom', 1.0, {
        'room':     ([47.25, 39.6, 1.6], [47.25, 32.3, 1.25], 56),     # the bed and the larch wall from the room's far side
        'bed':      ([45.4, 36.2, 1.55], [47.4, 33.1, 0.7], 50),       # the bed from its foot corner, the bedding and the pillows
        'pillows':  ([46.4, 34.4, 1.25], [47.25, 32.6, 0.75], 46),     # the pillows and the turned-down sheet, close
        'ledge':    ([47.25, 35.0, 1.75], [47.25, 32.3, 1.8], 56),     # the ledge, the painting, the vase and the bowl
        'vase':     ([48.6, 33.9, 1.85], [49.05, 32.3, 2.0], 44),      # the vase and its branches on the larch, close
        'rug':      ([44.8, 37.6, 1.5], [46.6, 36.0, 0.0], 50),        # the rug's pile and its border by the bench
        'head':     ([47.25, 34.9, 1.2], [47.25, 32.3, 1.05], 60),     # the headboard square on, its joints (Sam's still of 16 Oct)
        'chest':    ([48.3, 37.6, 1.35], [50.8, 36.8, 1.05], 56),      # the chest on the east wall, its drawers, the painting over it
        'stand':    ([46.3, 34.0, 1.15], [45.45, 32.6, 0.7], 50),      # a nightstand, its two drawers and the globe lamp
        'fig':      ([47.9, 37.9, 1.55], [50.1, 40.0, 1.15], 52),      # the fiddle-leaf fig in the corner by the glass (Sam's still of 16 Oct)
        'figClose': ([49.2, 39.0, 1.6], [50.15, 40.05, 1.35], 44),     # its leaves close: the veins, the quilting, the stalks
        'figPot':   ([49.0, 38.9, 0.75], [50.12, 40.04, 0.35], 46),    # the reeded pot and the soil
    }),
    # (iteration 8, the dressing room on Sam's notes of 16 Oct: real clothes and shoes, the two closed units opened, the runner)
    'dressing': ('dressMid', 0.5, {
        'along':    ([50.4, 34.5, 1.6], [55.5, 32.4, 1.2], 56),        # the wardrobe from the bedroom's door (Sam's first still)
        'down':     ([51.3, 33.6, 1.6], [59.0, 33.6, 1.3], 62),        # down the room to the window (his second)
        'acc':      ([56.0, 32.9, 1.5], [58.35, 34.6, 1.15], 56),      # the tall unit by the bath's door (his third)
        'hang':     ([52.9, 33.95, 1.45], [52.0, 32.45, 1.35], 48),    # the first hanging bay, close
        'shelves':  ([53.9, 33.95, 1.45], [53.1, 32.45, 1.2], 48),     # the first bay of shelves, close
        'shoes':    ([53.3, 34.0, 0.95], [52.3, 32.5, 0.2], 48),       # the shoes under the first rail
        'south':    ([54.6, 32.8, 1.5], [52.6, 34.6, 1.2], 58),        # the long unit on the south wall
        'runner':   ([50.6, 33.5, 1.6], [53.2, 33.5, 0.0], 58),        # the runner and the threshold to the bedroom's marble
        'sill':     ([50.2, 33.5, 1.7], [51.2, 33.5, 0.0], 56),        # the runner's end at the threshold, looking down
        'accnear':  ([58.1, 33.25, 1.45], [58.35, 34.5, 1.25], 50),    # the cabinet for small things, close
        'tray':     ([58.3, 33.65, 1.25], [58.35, 34.45, 0.84], 44),   # its tray: sunglasses and watches
        'hats':     ([58.2, 33.35, 1.85], [58.35, 34.5, 1.72], 50),    # its upper shelves: belts, scarves, hats
        'shoewall': ([52.4, 33.2, 1.3], [51.9, 34.5, 1.0], 54),        # the wall of shoes, close
    }),
    # (16 Oct: the bird of paradise in the living room's south-west corner, Sam's view of it, and from above against the walls)
    'plant': ('living', 0.5, {
        'sam':      ([13.6, 15.3, 1.35], [9.6, 16.3, 0.95], 40),       # from the room, the fireplace on the right (Sam's still)
        'top':      ([10.2, 16.05, 4.1], [10.15, 16.1, 0.0], 70),      # from above: the leaves against the two walls and the hearth
        'side':     ([10.6, 13.2, 1.2], [10.0, 16.6, 0.8], 50),        # from the hearth's end, along the west wall
    }),
    # (16 Oct: the patio olive's trunk and where its limbs part, from four sides)
    'olive': ('olive', 0.5, {
        'n':        ([30.0, 15.2, 1.2], [30.1, 18.0, 1.15], 55),
        'e':        ([32.8, 18.0, 1.2], [30.1, 18.0, 1.15], 55),
        's':        ([30.0, 20.8, 1.2], [30.1, 18.0, 1.15], 55),
        'w':        ([27.2, 18.0, 1.2], [30.1, 18.0, 1.15], 55),
        'forkn':    ([30.0, 15.4, 1.6], [30.15, 18.0, 1.85], 55),      # where the limbs part, from the north
        'forke':    ([32.6, 18.0, 1.6], [30.15, 18.0, 1.85], 55),      # and from the east
    }),
    # (16 Oct: the bath made over. 'door' is the walk's own view at its rest)
    'bath': ('bath', 0.5, {
        'door':     ([56.4, 36.1, 1.32], [54.55, 37.78, 1.37], 56),
        'tub':      ([54.4, 38.3, 1.5], [52.3, 40.05, 0.6], 50),
        'shower':   ([55.4, 39.2, 1.55], [57.9, 36.4, 1.2], 62),
        'wc':       ([56.2, 38.2, 1.4], [58.3, 38.8, 0.6], 55),
        'vanity':   ([54.4, 36.6, 1.55], [51.3, 37.1, 1.3], 58),
        'out':      ([55.8, 37.2, 1.45], [55.4, 41.0, 1.2], 64),
    }),
    # (16 Oct: the wine room, from the walk's new stop beside the table, and close through its glass)
    'wine': ('wine', 0.5, {
        'stop':     ([22.5, 5.6, 1.515], [24.855, 4.7625, 1.45], 58),
        'glass':    ([24.2, 4.0, 1.5], [28.0, 3.6, 1.3], 60),
        'rack':     ([26.6, 5.0, 1.5], [28.5, 2.9, 1.4], 56),
    }),
    # (16 Oct: the gallery's plinths, bronzes and benches, and the sliding door from the patio)
    'gallery': ('gallery', 0.5, {
        'plinth':   ([42.6, 12.6, 1.4], [41.62, 13.9, 0.9], 50),
        'ring':     ([42.7, 18.7, 1.3], [41.62, 19.9, 0.95], 50),
        'bench':    ([42.3, 15.6, 1.2], [43.4, 16.9, 0.35], 50),
        'door':     ([37.6, 10.4, 1.6], [41.0, 12.6, 1.6], 58),
    }),
    'wine2': ('wine', 0.5, {
        'table':    ([25.9, 5.2, 1.55], [27.0, 4.0, 0.95], 48),
        'magnums':  ([26.6, 4.3, 1.5], [28.6, 4.05, 1.3], 50),
    }),
    'front': ('door', 1.68, {
        'door':     ([15.25, 32.98, 1.60], [15.25, 21.5, 2.2], 50),
        'wide':     ([15.25, 36.2, 2.00], [15.25, 25.5, 2.1], 62),
        'left':     ([13.8, 31.4, 1.45], [11.2, 26.8, 1.5], 54),
        'right':    ([16.4, 31.4, 1.55], [18.8, 26.8, 1.7], 54),
        'path':     ([15.1, 31.8, 1.45], [15.0, 27.2, 0.0], 52),
    }),
}
key, frac, SHOTS = ROOMS[room]
HIDE = ("(() => { const s = document.createElement('style'); s.textContent = '.spots, .topbar, .corner, .ruler, .count, .hint, .file { display: none !important; }';"
        " document.head.appendChild(s); window.__P = { dof: 0 }; return 1; })()")
AT = f"(() => {{ const k = __rig.K.find((k) => k.id === '{key}'); __rig.jump(k.h0 + (k.h1 - k.h0) * {frac}); return 1; }})()"
steps = [{"jump": 0, "wait": 2600}, {"eval": AT, "wait": 4200}, {"eval": HIDE}]
for name, (p, look, fov) in SHOTS.items():
    if only and name not in only:
        continue
    steps.append({"eval": f"(window.__cam = {{ p: {json.dumps(p)}, look: {json.dumps(look)}, fov: {fov} }}, 1)", "wait": 2600, "shot": os.path.join(out, name + '.jpg')})
fd, path = tempfile.mkstemp(suffix='.json'); os.write(fd, json.dumps(steps).encode()); os.close(fd)
try:
    r = subprocess.run(['node', os.path.join(here, 'probe.mjs'), url, path, size], capture_output=True, text=True, timeout=600, env=dict(os.environ, DPR=dpr))
finally:
    os.unlink(path)
txt = r.stdout + r.stderr
print(txt[txt.index('PAGE PROBLEMS') if 'PAGE PROBLEMS' in txt else -600:].strip())
