// A 3D printer that prints the Mladá Vlna logo, layer by layer, in the digital skills section.
// The logo outline is traced from images/logos/logo.png (tools/trace-logo.py -> models/logo-shape.json).
// The print head traces each layer's outline while the bed steps down; when the print is done the head parks,
// the logo lifts off the bed, stands up to face you and turns once, then the printer starts again in the
// next filament colour. Built only when the section comes near, drawn only while it is on screen.
import * as THREE from '../vendor/three/three.module.min.js';
import { RoomEnvironment } from '../vendor/three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from '../vendor/three/addons/geometries/RoundedBoxGeometry.js';

const figure = document.querySelector('.printer');
const canvas = figure && figure.querySelector('.printer__canvas');
const pctEl = figure && figure.querySelector('.printer__pct');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Weak devices and slow or metered connections get the flat logo (.no-3d), not a second 3D scene.
const net = navigator.connection || {};
const weak = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2)
  || net.saveData || /^(slow-2g|2g)$/.test(net.effectiveType || '');
if (canvas && weak) figure.classList.add('no-3d');
else if (canvas) {
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); figure.classList.add('no-3d'); });
  const near = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    near.disconnect();
    // Built in a quiet moment, well before it scrolls into view, so building it never stutters the scroll.
    const whenIdle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
    whenIdle(() => build().catch((err) => { console.warn('3D printer unavailable', err); figure.classList.add('no-3d'); }), { timeout: 1500 });
  }, { rootMargin: '1400px 0px' });
  near.observe(figure);
}

async function build() {
  const shapes = await (await fetch('models/logo-shape.json')).json();
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch (e) { figure.classList.add('no-3d'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 800 ? 1.25 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.add(new THREE.HemisphereLight(0xfff8ec, 0xc9c2ae, 0.55));
  const key = new THREE.DirectionalLight(0xfff2dc, 2.2);
  key.position.set(3.5, 7, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 16 });
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02;
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  const target = new THREE.Vector3(0, 1.45, 0);

  // ---------- materials ----------
  const mat = {
    frame: new THREE.MeshStandardMaterial({ color: 0x1c2124, metalness: 0.65, roughness: 0.38 }),
    base: new THREE.MeshPhysicalMaterial({ color: 0x23292c, metalness: 0.2, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.4 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xdfe4e6, metalness: 1, roughness: 0.14 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xb9c0c4, metalness: 0.9, roughness: 0.32 }),
    head: new THREE.MeshPhysicalMaterial({ color: 0x225c92, metalness: 0.05, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x15191b, metalness: 0.3, roughness: 0.5 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xd4a347, metalness: 1, roughness: 0.25 }),
    sock: new THREE.MeshStandardMaterial({ color: 0xd9472b, roughness: 0.65 }),
    glow: new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0 }),
    tube: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, transmission: 0.6, transparent: true, opacity: 0.75, thickness: 0.05 }),
  };
  // Textured spring-steel bed: speckled gold.
  const bedTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#b38c52'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,230,170,0.35)' : 'rgba(90,60,25,0.3)'; g.fillRect(Math.random() * 256, Math.random() * 256, 1.4, 1.4); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
  })();
  mat.bed = new THREE.MeshStandardMaterial({ map: bedTex, metalness: 0.55, roughness: 0.48 });

  const add = (geo, m, parent, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; };
  const printer = new THREE.Group();
  scene.add(printer);
  // An invisible floor that only catches the printer's shadow, so it sits on the paper.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.2 }));
  floor.receiveShadow = true; scene.add(floor);

  // ---------- frame and base ----------
  const POST = 1.12, TOP = 2.78, GY = 2.3;                      // post offset, frame top, gantry height
  add(new RoundedBoxGeometry(2.42, 0.38, 2.42, 4, 0.07), mat.base, printer, 0, 0.19, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.BoxGeometry(0.1, TOP - 0.38, 0.1), mat.frame, printer, sx * POST, (TOP + 0.38) / 2, sz * POST);
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(2.34, 0.1, 0.1), mat.frame, printer, 0, TOP, s * POST);
    add(new THREE.BoxGeometry(0.1, 0.1, 2.34), mat.frame, printer, s * POST, TOP, 0);
    const rail = add(new THREE.CylinderGeometry(0.024, 0.024, 2.14, 12), mat.chrome, printer, s * 1.0, GY, 0); rail.rotation.x = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.03, 0.03, TOP - 0.4, 12), mat.chrome, printer, s * 0.72, (TOP + 0.38) / 2, -1.02);      // lead screws for the bed
  }
  // The little screen on the front of the base.
  const screenCanvas = document.createElement('canvas'); screenCanvas.width = 512; screenCanvas.height = 128;
  const screenTex = new THREE.CanvasTexture(screenCanvas); screenTex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.24), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.position.set(0, 0.2, 1.212); printer.add(screen);
  function drawScreen(pct, label) {
    const g = screenCanvas.getContext('2d');
    g.fillStyle = '#0c1214'; g.fillRect(0, 0, 512, 128);
    g.fillStyle = '#cfe3cf'; g.font = '600 30px "Inter Tight", system-ui, sans-serif'; g.fillText(label, 26, 52);
    g.textAlign = 'right'; g.fillText(Math.round(pct * 100) + '%', 486, 52); g.textAlign = 'left';
    g.fillStyle = '#26323a'; g.fillRect(26, 78, 460, 14);
    g.fillStyle = '#7fb0e0'; g.fillRect(26, 78, 460 * pct, 14);
    screenTex.needsUpdate = true;
  }

  // ---------- gantry and print head ----------
  const beam = new THREE.Group(); printer.add(beam);
  add(new THREE.BoxGeometry(2.06, 0.07, 0.11), mat.frame, beam, 0, GY + 0.02, 0);
  for (const s of [-1, 1]) add(new RoundedBoxGeometry(0.16, 0.12, 0.2, 2, 0.02), mat.dark, beam, s * 1.0, GY, 0);
  const head = new THREE.Group(); printer.add(head);
  add(new RoundedBoxGeometry(0.36, 0.38, 0.3, 4, 0.06), mat.head, head, 0, 0.0, 0.02);
  add(new THREE.CylinderGeometry(0.055, 0.055, 0.12, 14), mat.alu, head, 0, -0.25, 0.02);
  add(new THREE.BoxGeometry(0.15, 0.07, 0.11), mat.sock, head, 0, -0.345, 0.02);
  const nozzle = add(new THREE.ConeGeometry(0.036, 0.07, 16), mat.brass, head, 0, -0.415, 0.02); nozzle.rotation.x = Math.PI;
  const tipGlow = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), mat.glow); tipGlow.position.set(0, -0.452, 0.02); head.add(tipGlow);
  const TIP = 0.452;                                             // nozzle tip below the head's centre
  // Front fan: a ring and spinning blades.
  const fan = new THREE.Group(); fan.position.set(0, 0.0, 0.176); head.add(fan);
  add(new THREE.TorusGeometry(0.115, 0.014, 8, 32), mat.dark, fan);
  const blades = new THREE.Group(); fan.add(blades);
  add(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), mat.dark, blades).rotation.x = Math.PI / 2;
  for (let i = 0; i < 7; i++) { const b = add(new THREE.BoxGeometry(0.03, 0.09, 0.008), mat.dark, blades); const a = i / 7 * Math.PI * 2; b.position.set(Math.cos(a) * 0.06, Math.sin(a) * 0.06, 0); b.rotation.set(0.35, 0, a - Math.PI / 2); }

  // ---------- spool and filament tube ----------
  const spool = new THREE.Group(); spool.position.set(1.42, 2.35, -0.45); spool.rotation.z = Math.PI / 2; printer.add(spool);
  for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.34, 0.34, 0.025, 36), mat.dark, spool, 0, s * 0.12, 0);
  const filamentMat = new THREE.MeshPhysicalMaterial({ color: 0x225c92, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  add(new THREE.CylinderGeometry(0.28, 0.28, 0.23, 36), filamentMat, spool);
  add(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 16), mat.alu, spool);
  add(new THREE.BoxGeometry(0.06, 0.06, 0.7), mat.frame, printer, 1.17, 2.35, -0.45);      // spool holder arm
  let tube = null;
  const tubePts = [new THREE.Vector3(1.3, 2.6, -0.45), new THREE.Vector3(1.0, 3.25, -0.3), new THREE.Vector3(), new THREE.Vector3()];
  function updateTube() {
    tubePts[2].set(head.position.x * 0.7, GY + 0.75, head.position.z * 0.7 + 0.1);
    tubePts[3].set(head.position.x, GY + 0.19, head.position.z + 0.02);
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tubePts), 28, 0.018, 6, false);
    if (tube) { tube.geometry.dispose(); tube.geometry = geo; } else { tube = new THREE.Mesh(geo, mat.tube); printer.add(tube); }
  }

  // ---------- bed and the printed logo ----------
  const bed = new THREE.Group(); printer.add(bed);
  add(new RoundedBoxGeometry(1.76, 0.05, 1.76, 2, 0.02), mat.bed, bed, 0, 0, 0);
  add(new THREE.BoxGeometry(1.84, 0.07, 1.84), mat.dark, bed, 0, -0.06, 0);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.12, 0.06, 0.4), mat.dark, bed, s * 0.72, -0.06, -0.9);
  const BED_TOP = 0.025;                                         // top of the plate, in the bed's own space

  const R = 0.66, THICK = 0.16, LAYERS = 16, LAYER = THICK / LAYERS;
  const toShape = (pts, ShapeType) => new ShapeType(pts.map(([x, y]) => new THREE.Vector2(x * R, y * R)));
  const logoShapes = shapes.map((s) => { const sh = toShape(s.outer, THREE.Shape); sh.holes = s.holes.map((h) => toShape(h, THREE.Path)); return sh; });
  const logoGeo = new THREE.ExtrudeGeometry(logoShapes, { depth: THICK, bevelEnabled: false, curveSegments: 1 });
  logoGeo.rotateX(-Math.PI / 2);                                  // lying flat, extruded upward
  logoGeo.computeVertexNormals();
  // The print is cut off at the current layer height (a clipping plane in world space).
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 10);
  const printMat = new THREE.MeshPhysicalMaterial({ color: 0x225c92, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.5, clippingPlanes: [clip], side: THREE.DoubleSide });
  printMat.onBeforeCompile = (shader) => {                        // faint layer lines, like a real print
    shader.vertexShader = 'varying float vLayerY;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLayerY = position.y;');
    shader.fragmentShader = 'varying float vLayerY;\n' + shader.fragmentShader.replace('#include <color_fragment>',
      `#include <color_fragment>\nfloat ln = abs(fract(vLayerY / ${LAYER.toFixed(5)}) - 0.5) * 2.0;\ndiffuseColor.rgb *= 0.86 + 0.14 * smoothstep(0.0, 0.6, ln);`);
  };
  const piece = new THREE.Group(); bed.add(piece);               // the logo on the bed; it stands up at the end
  const logo = add(logoGeo, printMat, piece);
  // The freshly laid top layer: a flat cap that hides the open cut, a touch warmer while hot.
  const capMat = new THREE.MeshStandardMaterial({ color: 0x225c92, roughness: 0.5, emissive: 0xff7a2a, emissiveIntensity: 0 });
  const cap = new THREE.Mesh(new THREE.ShapeGeometry(logoShapes, 1).rotateX(-Math.PI / 2), capMat);
  piece.add(cap);
  piece.position.y = BED_TOP;

  // The path the nozzle follows on every layer: outer outline, then each hole.
  const path = [];
  for (const s of shapes) for (const loop of [s.outer, ...s.holes]) for (let i = 0; i < loop.length; i += 2) path.push([loop[i][0] * R, -loop[i][1] * R]);
  const cum = [0];
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const total = cum[cum.length - 1];
  function along(u) {                                              // point at fraction u of the path
    const d = u * total; let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < d) lo = m; else hi = m; }
    const t = (d - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
    return [path[lo][0] + (path[hi][0] - path[lo][0]) * t, path[lo][1] + (path[hi][1] - path[lo][1]) * t];
  }

  // ---------- timeline ----------
  const COLORS = [0x225c92, 0x2e7d4a, 0xe0562b, 0x18241f];       // the logo blue first
  const T_HEAT = 1.0, T_LAYER = 0.55, T_PRINT = LAYERS * T_LAYER, T_PARK = 0.9, T_SHOW = 3.6, T_RESET = 1.0;
  const CYCLE = T_HEAT + T_PRINT + T_PARK + T_SHOW + T_RESET;
  const PARK = [0.85, -0.85];
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  let cycle = -1, lastPct = -1, lastScreen = 0;
  const TIP_Y = GY - TIP;                                          // world height of the nozzle tip
  const bedTopWorld = (h) => TIP_Y - h;                             // the bed keeps the print's top at the nozzle

  function setColor(i) {
    const c = COLORS[i % COLORS.length];
    printMat.color.setHex(c); capMat.color.setHex(c); filamentMat.color.setHex(c);
  }

  function pose(t, dt) {
    const n = Math.floor(t / CYCLE);
    if (n !== cycle) { cycle = n; setColor(n); }
    const k = t - n * CYCLE;
    let h = 0, hx = PARK[0], hz = PARK[1], glow = 0, pct = 0, done = false, label = 'mlada-vlna.stl', drop = 0;
    piece.rotation.set(0, 0, 0); piece.position.set(0, BED_TOP, 0); piece.scale.setScalar(1); logo.visible = true; cap.visible = true;

    if (k < T_HEAT) {                                                // heating up; head travels to the start of the first layer
      const u = sm(0, T_HEAT, k); const [sx, sz] = along(0);
      hx = PARK[0] + (sx - PARK[0]) * u; hz = PARK[1] + (sz - PARK[1]) * u;
      glow = u; h = 0; label = 'heating...';
      logo.visible = false; cap.visible = false;
    } else if (k < T_HEAT + T_PRINT) {                               // printing, layer by layer
      const p = (k - T_HEAT) / T_PRINT, layerF = p * LAYERS, layer = Math.floor(layerF), u = layerF - layer;
      h = (layer + u) * LAYER;
      [hx, hz] = along(u);
      glow = 1; pct = p;
    } else if (k < T_HEAT + T_PRINT + T_PARK) {                      // done: the head parks out of the way
      const u = sm(0, T_PARK, k - T_HEAT - T_PRINT); const [ex, ez] = along(1);
      hx = ex + (PARK[0] - ex) * u; hz = ez + (PARK[1] - ez) * u;
      h = THICK; glow = 1 - u; pct = 1; done = true;
    } else if (k < T_HEAT + T_PRINT + T_PARK + T_SHOW) {             // the logo lifts, stands up and turns once
      const s = k - T_HEAT - T_PRINT - T_PARK;
      h = THICK; pct = 1; done = true;
      const up = sm(0.35, 1.05, s), turn = sm(0.9, 3.2, s);
      drop = sm(0, 0.7, s) * 0.85;                                  // the bed lowers first, like a real printer at the end
      piece.position.y = BED_TOP + up * 0.7;
      piece.position.z = up * 0.25;
      piece.rotation.x = up * Math.PI / 2;
      piece.rotation.y = turn * Math.PI * 2;
    } else {                                                         // it drops back and shrinks away; next colour
      const s = sm(0, T_RESET, k - T_HEAT - T_PRINT - T_PARK - T_SHOW);
      h = THICK; pct = 1; done = true;
      drop = 0.85 * (1 - s);
      piece.position.y = BED_TOP + 0.7 * (1 - s); piece.position.z = 0.25 * (1 - s);
      piece.rotation.x = Math.PI / 2 * (1 - s); piece.rotation.y = 0;
      piece.scale.setScalar(1 - s);
    }

    head.position.set(hx, GY, hz);
    beam.position.z = hz;
    bed.position.y = bedTopWorld(Math.min(h, THICK)) - BED_TOP - drop;
    // Clip the logo at the current height (in world space), and put the cap on top of what is printed.
    const printing = k >= T_HEAT && k < T_HEAT + T_PRINT;
    clip.constant = printing ? TIP_Y + 0.0005 : 100;
    cap.position.y = printing ? h : THICK + 0.0005;
    cap.visible = printing && h > 0.001;
    capMat.emissiveIntensity = printing ? 0.35 : 0;
    mat.glow.opacity = glow * 0.9;
    blades.rotation.z += dt * (printing ? 40 : 12);
    spool.rotation.x -= dt * (printing ? 0.8 : 0);

    figure.classList.toggle('is-done', done);
    const shown = Math.round(pct * 100);
    if (shown !== lastPct && pctEl) { pctEl.textContent = shown + ' %'; lastPct = shown; }
    const now = performance.now();
    if (now - lastScreen > 150) { drawScreen(pct, done ? 'done · mlada-vlna.stl' : label); lastScreen = now; }
  }

  // ---------- camera, size, pointer ----------
  let px = 0, py = 0, lx = 0, ly = 0;
  if (!reduced) window.addEventListener('pointermove', (e) => { px = e.clientX / window.innerWidth - 0.5; py = e.clientY / window.innerHeight - 0.5; });
  function resize() {
    const w = figure.clientWidth, hgt = figure.clientHeight;
    if (!w || !hgt) return;
    renderer.setSize(w, hgt, false);
    camera.aspect = w / hgt;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(figure);
  resize();
  function placeCamera(t) {
    lx += (px - lx) * 0.05; ly += (py - ly) * 0.05;
    const a = 0.62 + Math.sin(t * 0.18) * 0.1 + lx * 0.35, dist = 7.2 * Math.max(1, 1.08 / camera.aspect);   // back off on narrow canvases so the whole machine fits
    camera.position.set(Math.sin(a) * dist, 3.9 - ly * 1.2, Math.cos(a) * dist);
    camera.lookAt(target);
  }

  // ---------- loop: only while on screen ----------
  let visible = false, t = 0, last = performance.now();
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; last = performance.now(); }).observe(figure);
  if (renderer.compileAsync) await renderer.compileAsync(scene, camera).catch(() => {});
  updateTube();
  if (reduced) {                                                    // a finished print, still
    t = T_HEAT + T_PRINT + T_PARK + 1.2; pose(t, 0); placeCamera(0); updateTube();
    const still = () => { resize(); placeCamera(0); renderer.render(scene, camera); };
    still(); window.addEventListener('resize', still);
    return;
  }
  let frame = 0;
  (function loop(now) {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    t += dt;
    pose(t, dt);
    if (++frame % 2 === 0) updateTube();
    placeCamera(t);
    renderer.render(scene, camera);
  })(performance.now());
  figure.classList.add('is-live');
}
