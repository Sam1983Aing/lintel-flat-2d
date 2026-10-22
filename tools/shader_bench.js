/* Shader bench (tools only, 15 Oct 2026): how long one material's shader takes to be ready the first time it is drawn,
   with parts of it switched off. Evaluated in the loaded Lintel page (tools/probe.mjs step "eval" with this file's text).
   Every variant gets its own salt, so no shader cache helps: each number is a first visit's wait for that one shader.
   It draws only the test box (everything else hidden, the lights kept, since the lights are part of every shader) into a
   buffer like the scene's own (half float, 4 samples, depth), and times it to the end of the graphics card's work. */
(async () => {
  const L = window.__lintel, ctx = __rig.ctx, r = ctx.renderer, T = THREE, gl = r.getContext();
  const scene = L.scene, cam = ctx.camera, M = L.M;
  const rt = new T.WebGLRenderTarget(256, 256, { type: T.HalfFloatType, samples: 4, depthBuffer: true });
  let salt = 900000 + Math.floor(Math.random() * 90000);
  const g = new T.BoxGeometry(0.5, 0.5, 0.5);
  g.setAttribute('aDecor', new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count), 1));
  g.setAttribute('color', new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
  const MAIN = /void\s+main\s*\(\s*\)\s*\{/;
  const salted = (m, edit) => {
    const b = m.onBeforeCompile, k = m.customProgramCacheKey, n = ++salt;
    m.onBeforeCompile = (sh, rr) => { b.call(m, sh, rr); if (edit) edit(sh);
      sh.fragmentShader = sh.fragmentShader.replace(MAIN, (x) => x + `\nif (gl_FragCoord.x < -${n}.5) discard;\n`);
      sh.vertexShader = sh.vertexShader.replace(MAIN, (x) => x + `\nif (gl_VertexID == -${n}) { gl_Position = vec4(0.0); return; }\n`); };
    m.customProgramCacheKey = () => (k ? k.call(m) : '') + '-bench' + n;
    return m;
  };
  const twin = (src) => { const m = src.clone(); m.onBeforeCompile = src.onBeforeCompile; m.customProgramCacheKey = src.customProgramCacheKey; m.userData = Object.assign({}, src.userData); return m; };
  const box = new T.Mesh(g, null); box.frustumCulled = false;
  const f = new T.Vector3(); cam.getWorldDirection(f); box.position.copy(cam.position).addScaledVector(f, 3);
  scene.add(box);
  const draw = () => {
    const hid = [];
    scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && o !== box && o.visible) { hid.push(o); o.visible = false; } });
    const bg = scene.background; scene.background = null;
    r.setRenderTarget(rt); const t = performance.now(); r.render(scene, cam); gl.finish(); const dt = performance.now() - t; r.setRenderTarget(null);
    hid.forEach((o) => { o.visible = true; }); scene.background = bg;
    return dt;
  };
  box.material = new T.MeshBasicMaterial(); draw(); draw();          // the shadow pass's own shaders, once
  const env = scene.environment, shadow = r.shadowMap.enabled, clip = r.clippingPlanes;
  const NR = L.RU.uRR.value.length;
  const LOOP = /for \(int i = 0; i < \d+; i\+\+\) \{\s*vec4 r = uRR\[i\];[\s\S]*?break; \}\s*\}/;
  const roomLoop = (sh, txt) => { if (!LOOP.test(sh.fragmentShader)) throw new Error('room loop not found'); sh.fragmentShader = sh.fragmentShader.replace(LOOP, txt); };
  const cut = (from, to) => (sh) => { if (!sh.fragmentShader.includes(from)) throw new Error('no ' + from.slice(0, 40)); sh.fragmentShader = sh.fragmentShader.replace(from, to); };
  const V = {
    'scan drawable (trav)': () => salted(twin(M.trav)),
    'scan drawable, no room loop': () => salted(twin(M.trav), cut('roomOf(wq, whole ? vec3(0.0) : wn, rev, org);', 'rev = uXV; org = uXO;')),
    'scan drawable, no reveal': () => salted(twin(M.trav), (sh) => { cut('roomOf(wq, whole ? vec3(0.0) : wn, rev, org);', 'rev = uXV; org = uXO;')(sh); cut('float got = revealAt(wq, whole ? vec3(0.0, 1.0, 0.0) : wn, rev, org, ring);', 'float got = 1.0; ring = 0.0;')(sh); }),
    'room loop: find, then read once': () => salted(twin(M.trav), (sh) => roomLoop(sh, `
      int k = -1;
      for (int i = 0; i < ${NR}; i++) { vec4 r = uRR[i]; if (q.x > r.x && q.x < r.z && q.y > r.y && q.y < r.w) { k = i; break; } }
      if (k >= 0) { rev = uRV[k]; org = uRO[k]; gInk = uRI[k]; gDir = uRD[k]; }`)),
    'room loop: no break': () => salted(twin(M.trav), (sh) => roomLoop(sh, `
      int k = -1;
      for (int i = 0; i < ${NR}; i++) { vec4 r = uRR[i]; if (k < 0 && q.x > r.x && q.x < r.z && q.y > r.y && q.y < r.w) k = i; }
      if (k >= 0) { rev = uRV[k]; org = uRO[k]; gInk = uRI[k]; gDir = uRD[k]; }`)),
    'room loop: count from a uniform': () => salted(twin(M.trav), (sh) => { roomLoop(sh, `
      int k = -1;
      for (int i = 0; i < uBenchNR; i++) { vec4 r = uRR[i]; if (q.x > r.x && q.x < r.z && q.y > r.y && q.y < r.w) { k = i; break; } }
      if (k >= 0) { rev = uRV[k]; org = uRO[k]; gInk = uRI[k]; gDir = uRD[k]; }`); sh.fragmentShader = sh.fragmentShader.replace('void roomOf(', 'uniform int uBenchNR;\nvoid roomOf('); }),
    'standard with the scan maps': () => salted(new T.MeshStandardMaterial({ map: M.trav.map, normalMap: M.trav.normalMap, roughnessMap: M.trav.roughnessMap })),
    'standard plain': () => salted(new T.MeshStandardMaterial({ color: 0x888888 })),
    'standard plain, no env': () => { scene.environment = null; return salted(new T.MeshStandardMaterial({ color: 0x888888 })); },
    'standard plain, no shadow': () => { r.shadowMap.enabled = false; return salted(new T.MeshStandardMaterial({ color: 0x888888 })); },
    'standard plain, no clip plane': () => { r.clippingPlanes = []; return salted(new T.MeshStandardMaterial({ color: 0x888888 })); },
    'drawable plain standard': () => salted(L.drawable(new T.MeshStandardMaterial({ color: 0x888888 }), 'none', { sat: 1, macro: 0 })),
    'physical plain': () => salted(new T.MeshPhysicalMaterial({ color: 0x888888 })),
    'physical sheen + clearcoat': () => salted(new T.MeshPhysicalMaterial({ color: 0x888888, sheen: 1, clearcoat: 0.3 })),
    'lambert plain': () => salted(new T.MeshLambertMaterial({ color: 0x888888 })),
    'basic': () => salted(new T.MeshBasicMaterial({ color: 0x888888 })),
  };
  const only = (window.__benchOnly || Object.keys(V)), reps = window.__benchReps || 2, out = {};
  for (let rep = 0; rep < reps; rep++) for (const name of only) {
    let m;
    try { m = V[name](); } catch (e) { out[name] = String(e); continue; }
    box.material = m;
    if (window.__benchPause) await new Promise((res) => setTimeout(res, window.__benchPause));
    const first = draw(), again = draw();
    scene.environment = env; r.shadowMap.enabled = shadow; r.clippingPlanes = clip;
    box.material = salted(new T.MeshBasicMaterial({ color: 0x888888 }));
    const after = draw(), after2 = draw();
    (out[name] = out[name] || []).push(Math.round(first - again) + '+' + Math.round(after - after2));
    m.dispose(); box.material.dispose();
  }
  scene.remove(box); rt.dispose();
  return JSON.stringify(out);
})()
