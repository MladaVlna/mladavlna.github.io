// Hero scene: a misty Slovak spruce forest with litter on the ground. Scrolling walks you down
// the trail, and the litter ahead of you lifts off the forest floor and is cleared away.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { createPeople } from './forest-people.js';
import { createVolunteers } from './forest-volunteers.js';

const hero = document.querySelector('.hero');
const stage = document.querySelector('.hero__stage');
const canvas = document.querySelector('.hero__canvas');
const params = new URLSearchParams(location.search);
// ?seed=N makes the forest's random layout repeat exactly, so two builds can be compared picture by picture.
if (params.has('seed')) {
  let a = (parseInt(params.get('seed'), 10) || 1) >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const net = navigator.connection || {};
// Visitors who asked for less motion or less data, or who are on a very slow connection, get the still
// picture (the poster in the page) and no 3D at all. ?still in the address shows that version.
const still = reduced || net.saveData || /^(slow-2g|2g)$/.test(net.effectiveType || '') || params.has('still');
const slowNet = net.effectiveType === '3g';                     // the forest, but not the 1.5 MB of people

// How much the device can draw, decided once before anything is built. ?tier=low|medium|high overrides it.
const TIERS = {
  high: { trees: 1, ferns: 2200, grass: 3600, litter: 1150, stones: 70, shadow: 2048, ratio: 1.5, people: 5, paint: 1, aa: true, mists: 16, rays: 11, pollen: 1100, needles: 260, lock30: false },
  medium: { trees: 0.85, ferns: 1700, grass: 2600, litter: 900, stones: 60, shadow: 1536, ratio: 1.25, people: 5, paint: 1, aa: true, mists: 14, rays: 10, pollen: 800, needles: 200, lock30: false },
  low: { trees: 0.6, ferns: 700, grass: 900, litter: 480, stones: 40, shadow: 1024, ratio: 1, people: 0, paint: 0.4, aa: false, mists: 9, rays: 7, pollen: 400, needles: 100, lock30: true },
};
function gpuName() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (!gl) return null;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    return name;
  } catch (e) { return null; }
}
function pickTier(gpu) {
  if (TIERS[params.get('tier')]) return params.get('tier');
  const g = (gpu || '').toLowerCase();
  const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 4;
  const narrow = Math.min(window.innerWidth, window.screen.width || window.innerWidth) < 800;
  let tier = 'high';
  if (/swiftshader|llvmpipe|software|basic render|mali-[t4]|mali-g[1-5]\d\b|adreno[^0-9]*[1-5]\d\d\b|powervr|\bhd graphics\b|uhd graphics [56]\d\d/.test(g)) tier = 'low';
  else if (/intel|iris|mali|adreno|apple|qualcomm|mobile|radeon\(tm\) graphics|vega \d\b/.test(g)) tier = 'medium';
  if (mem <= 2 || cores <= 2) tier = 'low';
  else if ((mem <= 4 || cores <= 4 || narrow) && tier === 'high') tier = 'medium';
  return tier;
}

let renderer, tierName, gpu;
if (still) document.documentElement.classList.add('hero-still');
else {
  gpu = gpuName();
  tierName = pickTier(gpu);
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: TIERS[tierName].aa, powerPreference: 'high-performance' }); }
  catch (e) { document.documentElement.classList.add('no-webgl'); }
}
if (renderer) start();

function start() {
  // ?cold in the address makes every drawing program look new, to test a first-ever visit.
  if (params.has('cold')) THREE.ShaderChunk.common += '\n// cold ' + Date.now() + '\n';
  const small = window.innerWidth < 800;
  const tier = { ...TIERS[tierName] };
  if (small) {                                                    // phones: the counts the scene always used there
    Object.assign(tier, { trees: Math.min(tier.trees, 0.5), ferns: Math.min(tier.ferns, 900), grass: Math.min(tier.grass, 1400), litter: Math.min(tier.litter, 520),
      shadow: 1024, ratio: Math.min(tier.ratio, 1.25), people: Math.min(tier.people, 3), pollen: Math.min(tier.pollen, 500), needles: Math.min(tier.needles, 120) });
  }
  if (slowNet) tier.people = 0;
  if (params.has('people')) tier.people = Math.max(0, Math.min(5, parseInt(params.get('people'), 10) || 0));   // ?people=N (tests)
  const fixedRatio = parseFloat(params.get('ratio'));              // ?ratio=1 pins the resolution (tests, screenshots)
  renderer.setPixelRatio(fixedRatio > 0 ? fixedRatio : Math.min(window.devicePixelRatio, tier.ratio));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;                             // a bright, sunny morning
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;                          // redrawn only when something casting a shadow has moved (see the loop)
  renderer.autoClear = false;                                     // two passes per frame: far backdrop, then the forest

  const MIST = 0xdde6d3;                                          // warm, sunlit haze (matches the sky's horizon)
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(MIST, 0.015);                     // light haze only: the owner wants little fog
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  // The sky and the mountains sit hundreds of metres away, far past where the mist hides the forest. They are
  // drawn first in a pass of their own with a deep camera, so the forest camera can stop at 110 m.
  const backdrop = new THREE.Scene();
  backdrop.background = skyTexture();

  scene.add(new THREE.HemisphereLight(0xfff3d6, 0x2c4a2a, 1.75));
  // A low morning sun behind the trees: long shadows fall towards you across the trail.
  const SUN = new THREE.Vector3(18, 26, -40);
  const sun = new THREE.DirectionalLight(0xffdf9e, 4.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(tier.shadow, tier.shadow);
  // 68 m across: past that the mist hides the shadows anyway, and a smaller area means fewer trees drawn into the map.
  Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 150 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.35;
  scene.add(sun, sun.target);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 110);
  const farCamera = new THREE.PerspectiveCamera(55, 1, 50, 1200);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const path = (z) => Math.sin(z * 0.07) * 2.6;                 // the trail winds a little
  const START_Z = 12, END_Z = -26;
  // The walk takes the first WALK_END of the scroll; the rest turns you to this tree beside the end of the
  // trail and walks you into its trunk, and the screen goes dark into the section below.
  const WALK_END = 0.78;
  const END_TREE = { x: path(END_Z - 7) + 0.9, z: END_Z - 7, radius: 0.4 };
  const REACH = 85;                                               // nothing is built further than this from the walk: the mist hides it all
  const fromWalk = (x, z) => { const wz = Math.min(START_Z, Math.max(END_Z, z)); return Math.hypot(x - path(wz), z - wz); };
  const strokes = (n) => Math.round(n * tier.paint);              // weaker devices paint the textures with fewer strokes
  const uTime = { value: 0 };
  const m4 = new THREE.Matrix4(), pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3(), eul = new THREE.Euler();
  const tint = new THREE.Color();
  // Bark, needles, ferns, moss and stone are fully rough, so the simpler Lambert lighting looks the same as the
  // physically based one at a fraction of the cost per pixel, and these surfaces fill most of the screen.
  // The faint environment light the rough materials got is folded into the colour. ?pbr restores the old ones.
  const pbr = params.has('pbr');
  function matte({ envMapIntensity = 0.1, roughness, ...rest }) {
    if (pbr) return new THREE.MeshStandardMaterial({ ...rest, roughness: 1, envMapIntensity });
    const m = new THREE.MeshLambertMaterial({ ...rest });
    const env = envMapIntensity.toFixed(4);                       // matched against ?pbr picture by picture
    m.customProgramCacheKey = () => 'matte:' + env;
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>
        irradiance += vec3(${env}) * 3.14159265;   // the soft room light the rough materials used to get`);
    };
    return m;
  }

  function draw(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    fn(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }
  // Makes a material's plants bend in the wind. bendBy is a GLSL expression for how much a vertex moves (0 at the root).
  function addWind(material, bendBy, strength) {
    const before = material.onBeforeCompile;
    // Each wind setting is its own drawing program: without this key, three.js would reuse one material's
    // program for another (it can't see the different expression inside the shader text).
    const key = material.customProgramCacheKey.call(material);
    material.customProgramCacheKey = () => key + '|wind:' + bendBy + ':' + strength;
    material.onBeforeCompile = (shader, r) => {
      before.call(material, shader, r);
      shader.uniforms.uTime = uTime;
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float windPhase = instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.23;
        float windBend = ${bendBy};
        transformed.x += (sin(uTime * 0.9 + windPhase) + 0.4 * sin(uTime * 2.3 + windPhase * 1.7)) * ${strength} * windBend;
        transformed.z += cos(uTime * 0.7 + windPhase * 1.3) * ${strength} * 0.6 * windBend;`);
    };
  }

  // ---------- sky: a clear, sunny morning, a warm low sun and the ridge of the mountains ----------
  function skyTexture() {
    return draw(1024, 1024, (g) => {
      const sky = g.createLinearGradient(0, 0, 0, 1024);
      sky.addColorStop(0, '#5fa9e3'); sky.addColorStop(0.3, '#9fcdf0'); sky.addColorStop(0.47, '#d6e6e6'); sky.addColorStop(0.56, '#dde6d3'); sky.addColorStop(1, '#dde6d3');
      g.fillStyle = sky; g.fillRect(0, 0, 1024, 1024);
      const glow = g.createRadialGradient(720, 330, 0, 720, 330, 520);
      glow.addColorStop(0, 'rgba(255,248,220,1)'); glow.addColorStop(0.12, 'rgba(255,236,170,0.75)'); glow.addColorStop(0.4, 'rgba(255,226,160,0.28)'); glow.addColorStop(1, 'rgba(255,226,160,0)');
      g.fillStyle = glow; g.fillRect(0, 0, 1024, 1024);
      const ridge = (base, height, color, seed) => {
        g.beginPath(); g.moveTo(0, 1024);
        for (let x = 0; x <= 1024; x += 6) {
          const n = Math.sin(x * 0.011 + seed) * 0.5 + Math.sin(x * 0.027 + seed * 2.3) * 0.3 + Math.abs(Math.sin(x * 0.006 + seed * 0.7)) * 0.9 + Math.sin(x * 0.09 + seed) * 0.05;
          g.lineTo(x, base - n * height);
        }
        g.lineTo(1024, 1024); g.closePath(); g.fillStyle = color; g.fill();
      };
      ridge(505, 130, '#bcd3dc', 1.3);
      ridge(528, 95, '#a9c6cd', 2.9);
      ridge(548, 70, '#97b9bb', 4.1);
    });
  }

  // ---------- the mountains: a Tatra-like massif rising behind the forest ----------
  {
    const hash = (x, z) => { const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return n - Math.floor(n); };
    const noise = (x, z) => {
      const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
      const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
      return (hash(ix, iz) * (1 - ux) + hash(ix + 1, iz) * ux) * (1 - uz) + (hash(ix, iz + 1) * (1 - ux) + hash(ix + 1, iz + 1) * ux) * uz;
    };
    const ridged = (x, z) => {                                    // sharp crests and gullies
      let a = 0.5, sum = 0;
      for (let o = 0; o < 5; o++) { sum += a * (1 - Math.abs(noise(x, z) * 2 - 1)); x = x * 2.03 + 17; z = z * 2.03 + 9; a *= 0.5; }
      return sum;
    };
    // [x, z, height, radius]: one main summit with lower shoulders either side.
    const PEAKS = [[-40, -330, 178, 230], [-210, -350, 118, 180], [150, -345, 132, 190], [330, -370, 96, 170], [-390, -380, 104, 180], [40, -420, 150, 240]];
    const heightOf = (x, z) => {
      let h = 0;
      for (const [px, pz, top, r] of PEAKS) {
        const d = Math.hypot(x - px, (z - pz) * 1.25) / r;
        if (d < 1) h = Math.max(h, top * Math.pow(1 - d, 1.45));
      }
      return h * (0.72 + 0.5 * ridged(x * 0.011, z * 0.011)) + ridged(x * 0.03, z * 0.03) * 7;
    };
    const geo = new THREE.PlaneGeometry(1100, 360, 200, 72);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -350);
    const mp = geo.attributes.position;
    for (let i = 0; i < mp.count; i++) mp.setY(i, heightOf(mp.getX(i), mp.getZ(i)));
    geo.computeVertexNormals();
    // Colour is painted in: rock, snow above the snow line, dark forest on the lower slopes, all softened by distance haze.
    const mn = geo.attributes.normal, mcol = new Float32Array(mp.count * 3);
    const light = new THREE.Vector3(-0.55, 0.62, 0.56).normalize(), n3 = new THREE.Vector3();
    const rock = new THREE.Color(0x5f7b84), snow = new THREE.Color(0xf4fbfb), woods = new THREE.Color(0x2c5a4a), haze = new THREE.Color(0xc4dbe2), c = new THREE.Color();
    for (let i = 0; i < mp.count; i++) {
      const x = mp.getX(i), y = mp.getY(i), z = mp.getZ(i);
      n3.set(mn.getX(i), mn.getY(i), mn.getZ(i));
      const snowLine = 112 + (noise(x * 0.05, z * 0.05) - 0.5) * 34;
      const snowy = Math.min(1, Math.max(0, (y - snowLine) / 14)) * Math.min(1, Math.max(0, (n3.y - 0.42) / 0.2));
      c.copy(woods).lerp(rock, Math.min(1, Math.max(0, (y - 38) / 30))).lerp(snow, snowy);
      c.multiplyScalar(0.5 + 0.75 * Math.max(0, n3.dot(light)));
      c.lerp(haze, Math.min(0.92, Math.max(0.3, 0.86 - y / 260)));
      mcol[i * 3] = c.r; mcol[i * 3 + 1] = c.g; mcol[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(mcol, 3));
    const mountain = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
    mountain.position.y = -6;
    backdrop.add(mountain);
  }

  // ---------- forest floor: moss, fallen needles and a worn trail ----------
  const floorTex = draw(512, 512, (g, w, h) => {
    g.fillStyle = '#5c7a52'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < strokes(900); i++) {                      // patches of moss and shade
      g.fillStyle = pick(['rgba(40,84,48,0.35)', 'rgba(92,132,70,0.3)', 'rgba(28,56,38,0.4)', 'rgba(120,150,84,0.22)']);
      g.beginPath(); g.ellipse(rand(0, w), rand(0, h), rand(6, 34), rand(5, 22), rand(0, 3.14), 0, 6.28); g.fill();
    }
    for (let i = 0; i < strokes(5200); i++) {                     // fallen needles and twigs
      g.strokeStyle = pick(['rgba(96,70,38,0.75)', 'rgba(140,104,58,0.6)', 'rgba(52,40,26,0.7)', 'rgba(176,150,96,0.45)']);
      g.lineWidth = rand(0.6, 1.5);
      const x = rand(0, w), y = rand(0, h), a = rand(0, 6.28), l = rand(4, 13);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(46, 46);
  const groundGeo = new THREE.PlaneGeometry(260, 260, 130, 130);
  groundGeo.rotateX(-Math.PI / 2);
  const gp = groundGeo.attributes.position, gcol = new Float32Array(gp.count * 3);
  const heightAt = (x, z) => {
    const off = Math.min(1, Math.abs(x - path(z)) / 5);          // flat on the trail, uneven beside it
    return (Math.sin(x * 0.35) * Math.cos(z * 0.31) * 0.38 + Math.sin(x * 0.9 + z * 0.7) * 0.13) * off;
  };
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    gp.setY(i, heightAt(x, z));
    const trail = 1 - Math.min(1, Math.abs(x - path(z)) / 2.4);  // the trail is bare earth and needles
    tint.setRGB(0.42, 0.62, 0.42).lerp(new THREE.Color(0.62, 0.5, 0.36), trail * 0.85);
    gcol[i * 3] = tint.r; gcol[i * 3 + 1] = tint.g; gcol[i * 3 + 2] = tint.b;
  }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(gcol, 3));
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, matte({ map: floorTex, bumpMap: floorTex, bumpScale: 1.2, vertexColors: true, envMapIntensity: 0.12 }));
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------- spruce trees ----------
  // One texture holds bark (left half) and a spray of needles with a ragged lower edge (right half).
  const treeTex = draw(512, 256, (g) => {
    g.fillStyle = '#4a3a2c'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < strokes(520); i++) {                      // furrowed bark
      g.strokeStyle = pick(['rgba(24,18,12,0.6)', 'rgba(96,78,58,0.45)', 'rgba(60,70,50,0.35)']);
      g.lineWidth = rand(1, 3.5);
      const x = rand(0, 256), y = rand(0, 256);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand(-3, 3), y + rand(10, 44)); g.stroke();
    }
    g.fillStyle = '#1c4a34'; g.fillRect(256, 0, 256, 256);
    for (let i = 0; i < strokes(2600); i++) {                     // needles hanging down the bough
      g.strokeStyle = pick(['rgba(12,40,28,0.7)', 'rgba(44,104,70,0.6)', 'rgba(70,134,88,0.4)', 'rgba(8,26,20,0.6)']);
      g.lineWidth = rand(0.8, 2);
      const x = rand(256, 512), y = rand(0, 256);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand(-5, 5), y + rand(8, 26)); g.stroke();
    }
    g.globalCompositeOperation = 'destination-out';              // cut the ragged fringe out of the lower edge
    for (let x = 256; x < 512; x += 5) {
      const depth = rand(26, 96);
      g.beginPath(); g.moveTo(x - 1, 256); g.lineTo(x + 2.5, 256 - depth); g.lineTo(x + 6, 256); g.closePath(); g.fill();
    }
  });
  treeTex.wrapS = treeTex.wrapT = THREE.ClampToEdgeWrapping;

  // detail: 0 for the forest at large, 1 for the trees beside the trail, where you see them up close.
  function spruce(tiers, spread, detail = 0) {
    const parts = [];
    const half = (geo, right) => {                                // point this part at its half of the texture
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, (right ? 0.5 : 0) + 0.004 + uv.getX(i) * 0.492);
      return geo;
    };
    const trunk = new THREE.CylinderGeometry(0.07, 0.3, 12.4, detail ? 12 : 7, 1);
    trunk.translate(0, 6.2, 0);
    parts.push(half(trunk, false));
    for (let i = 0; i < tiers; i++) {
      const f = i / (tiers - 1);
      const r = spread * (1 - f * 0.9) + 0.22, h = r * 0.95 + 0.5;
      const bough = new THREE.ConeGeometry(r, h, detail ? 16 : 10, detail ? 2 : 1, true);   // the needle texture carries the detail
      const bp = bough.attributes.position;
      for (let v = 0; v < bp.count; v++) {                        // uneven boughs, drooping at the tips
        const y = bp.getY(v), k = 1 - (y + h / 2) / h;            // 0 at the tip, 1 at the rim
        const a = Math.atan2(bp.getZ(v), bp.getX(v));
        const wob = 1 + (Math.sin(a * 5 + i * 1.7) * 0.11 + Math.sin(a * 11 + i) * 0.06) * k;
        bp.setX(v, bp.getX(v) * wob); bp.setZ(v, bp.getZ(v) * wob);
        bp.setY(v, y - k * k * 0.35);
      }
      bough.rotateY(i * 2.4);
      bough.translate(0, 3.9 + f * 7.6 + h / 2, 0);
      bough.computeVertexNormals();
      parts.push(half(bough, true));
    }
    return mergeGeometries(parts);
  }
  const treeMat = matte({ map: treeTex, alphaTest: 0.5, side: THREE.DoubleSide, envMapIntensity: 0.1 });
  addWind(treeMat, 'pow(max(position.y, 0.0) / 12.0, 2.0)', '0.16');
  const treeDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: treeTex, alphaTest: 0.5 });
  // Instances are grouped into slices along the trail, so the graphics chip skips the slices behind
  // you or outside the shadow area. items: [{ x, z, matrix, color }].
  const SLICE = 12;
  function sliced(geo, mat, items, setup) {
    const groups = new Map();
    for (const it of items) { const k = Math.floor(it.z / SLICE); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(it); }
    const meshes = [];
    for (const list of groups.values()) {
      const mesh = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((it, i) => { mesh.setMatrixAt(i, it.matrix); if (it.color) mesh.setColorAt(i, it.color); });
      mesh.computeBoundingSphere();
      mesh.boundingSphere.radius += 1.5;                          // room for the wind
      setup(mesh);
      scene.add(mesh); meshes.push(mesh);
    }
    return meshes;
  }
  const TREES = Math.round(600 * tier.trees);
  const NEAR = 13;                                                // trees this close to the walk get the finer shape
  const shapes = [[13, 2.5], [11, 2.0], [15, 2.9]];
  const treeSetup = (mesh) => { mesh.castShadow = true; mesh.receiveShadow = true; mesh.customDepthMaterial = treeDepth; };
  shapes.forEach(([tiers, spread]) => {
    const n = Math.floor(TREES / 3), items = [], close = [];
    for (let i = 0; i < n; i++) {
      let x, z;
      do { x = rand(-70, 70); z = rand(-125, 22); } while (Math.abs(x - path(z)) < 3.6);
      const s = rand(0.62, 1.2);                               // 7 to 15 metres tall
      quat.setFromEuler(eul.set(rand(-0.03, 0.03), rand(0, 6.28), rand(-0.03, 0.03)));
      const matrix = new THREE.Matrix4().compose(pos.set(x, heightAt(x, z) - 0.25, z), quat, scl.set(s * rand(1.0, 1.3), s, s * rand(1.0, 1.3)));
      const color = new THREE.Color().setHSL(0.4 + rand(-0.03, 0.04), 0.25, rand(0.62, 0.95));
      const d = fromWalk(x, z);
      if (d > REACH) continue;                                  // lost in the mist from anywhere on the walk
      if (Math.hypot(x - END_TREE.x, z - END_TREE.z) < 4) continue;   // keep the way to the last tree clear
      (d < NEAR ? close : items).push({ x, z, matrix, color });
    }
    sliced(spruce(tiers, spread, 0), treeMat, items, treeSetup);
    sliced(spruce(tiers, spread, 1), treeMat, close, treeSetup);
  });

  // ---------- the last tree: the walk ends by stepping into its trunk ----------
  {
    const S = 1.4, y0 = heightAt(END_TREE.x, END_TREE.z) - 0.25;
    const tree = new THREE.InstancedMesh(spruce(15, 2.9, 1), treeMat, 1);
    tree.setMatrixAt(0, m4.compose(pos.set(END_TREE.x, y0, END_TREE.z), quat.identity(), scl.set(S, S, S)));
    tree.setColorAt(0, tint.setHSL(0.4, 0.25, 0.8));
    treeSetup(tree);
    tree.frustumCulled = false;
    scene.add(tree);
    // Up close the bark needs its own finer texture, wrapped round a slightly wider trunk.
    const bark = draw(256, 512, (g) => {
      g.fillStyle = '#4a3a2c'; g.fillRect(0, 0, 256, 512);
      for (let i = 0; i < strokes(1400); i++) {
        g.strokeStyle = pick(['rgba(24,18,12,0.65)', 'rgba(96,78,58,0.45)', 'rgba(60,70,50,0.35)', 'rgba(130,112,86,0.3)']);
        g.lineWidth = rand(1, 4);
        const x = rand(0, 256), y = rand(-40, 512);
        g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + rand(-4, 4), y + 15, x + rand(-4, 4), y + 30, x + rand(-3, 3), y + rand(20, 60)); g.stroke();
      }
    });
    bark.wrapS = bark.wrapT = THREE.RepeatWrapping; bark.repeat.set(2, 9);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * S * 1.04, 0.3 * S * 1.04, 12.4 * S, 28, 1, true),
      matte({ map: bark, bumpMap: bark, bumpScale: 2.5, envMapIntensity: 0.1 }));
    trunk.position.set(END_TREE.x, y0 + 6.2 * S, END_TREE.z);
    trunk.castShadow = true; trunk.receiveShadow = true;
    scene.add(trunk);
    END_TREE.radius = (0.3 - 0.23 * (1.9 / 12.4)) * S * 1.04;     // trunk radius at eye height
  }

  // ---------- ferns and grass ----------
  const fernTex = draw(256, 256, (g) => {
    for (let f = 0; f < 9; f++) {
      const lean = rand(-1.05, 1.05), len = rand(150, 235);
      const ex = 128 + Math.sin(lean) * len, ey = 256 - Math.cos(lean) * len;
      const cxp = 128 + Math.sin(lean) * len * 0.4, cyp = 256 - Math.cos(lean) * len * 0.75;
      const green = pick(['#2f7a45', '#3f9a55', '#256339', '#57a85f']);
      g.strokeStyle = green; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(128, 256); g.quadraticCurveTo(cxp, cyp, ex, ey); g.stroke();
      for (let k = 0.12; k < 1; k += 0.045) {                     // leaflets along the stem
        const u = 1 - k;
        const x = u * u * 128 + 2 * u * k * cxp + k * k * ex, y = u * u * 256 + 2 * u * k * cyp + k * k * ey;
        const size = 26 * Math.sin(k * 3.0) + 4;
        g.lineWidth = 3;
        for (const side of [-1, 1]) {
          g.beginPath(); g.moveTo(x, y);
          g.lineTo(x + Math.cos(lean) * size * side - Math.sin(lean) * size * 0.3, y + Math.sin(lean) * size * side - Math.cos(lean) * size * 0.3 + size * 0.2);
          g.stroke();
        }
      }
    }
  });
  const grassTex = draw(128, 128, (g) => {
    for (let i = 0; i < 46; i++) {
      g.strokeStyle = pick(['#3f8a4a', '#5aa55a', '#2c6a3c', '#86b46a', '#a3bd6e']);
      g.lineWidth = rand(1.2, 2.6);
      const x = rand(20, 108), top = rand(10, 90);
      g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + rand(-8, 8), (128 + top) / 2, x + rand(-26, 26), top); g.stroke();
    }
  });
  function tuft() {                                               // two crossed upright cards
    const a = new THREE.PlaneGeometry(1, 1); a.translate(0, 0.5, 0);
    const b = a.clone(); b.rotateY(Math.PI / 2);
    return mergeGeometries([a, b]);
  }
  function plants(tex, count, minS, maxS, reach, lightness) {
    const mat = matte({ map: tex, alphaTest: 0.4, side: THREE.DoubleSide, envMapIntensity: 0.15 });
    addWind(mat, 'uv.y * uv.y', '0.07');
    const items = [], geo = tuft();
    for (let i = 0; i < count; i++) {
      const z = rand(END_Z - 30, START_Z + 4);
      const x = path(z) + (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.pow(Math.random(), 1.4) * reach);
      const s = rand(minS, maxS);
      quat.setFromEuler(eul.set(0, rand(0, 6.28), 0));
      items.push({ x, z, matrix: new THREE.Matrix4().compose(pos.set(x, heightAt(x, z) - 0.03, z), quat, scl.set(s * rand(0.9, 1.4), s, s * rand(0.9, 1.4))),
        color: new THREE.Color().setHSL(0.33 + rand(-0.04, 0.04), 0.3, rand(lightness - 0.15, lightness + 0.15)) });
    }
    return sliced(geo, mat, items, (mesh) => { mesh.receiveShadow = true; });   // low plants cast no shadow
  }
  plants(fernTex, tier.ferns, 0.5, 1.25, 20, 0.75);
  plants(grassTex, tier.grass, 0.18, 0.5, 14, 0.8);

  // Mossy boulders and fallen logs.
  const stone = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.6, 2),
    matte({ map: floorTex, color: 0x9fb09a, envMapIntensity: 0.15 }), tier.stones);
  for (let i = 0; i < tier.stones; i++) {
    let x, z;
    do { x = rand(-26, 26); z = rand(-60, 16); } while (Math.abs(x - path(z)) < 2.2);
    const s = rand(0.4, 1.6);
    quat.setFromEuler(eul.set(rand(0, 6.28), rand(0, 6.28), rand(0, 6.28)));
    stone.setMatrixAt(i, m4.compose(pos.set(x, heightAt(x, z) - 0.05, z), quat, scl.set(s * 1.3, s * 0.7, s)));
  }
  stone.receiveShadow = true;                                     // too low to throw a shadow worth drawing
  scene.add(stone);
  const barkTex = treeTex.clone(); barkTex.repeat.set(0.49, 1); barkTex.needsUpdate = true;
  const logs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.27, 5, 12),
    matte({ map: barkTex, envMapIntensity: 0.1 }), 14);
  for (let i = 0; i < 14; i++) {
    const z = rand(END_Z - 20, START_Z - 2), x = path(z) + (Math.random() < 0.5 ? -1 : 1) * rand(4.5, 15);
    quat.setFromEuler(eul.set(Math.PI / 2 + rand(-0.06, 0.06), 0, rand(0, 3.14), 'ZXY'));
    logs.setMatrixAt(i, m4.compose(pos.set(x, heightAt(x, z) + 0.14, z), quat, scl.set(1, rand(0.6, 1.3), 1)));
  }
  logs.castShadow = true; logs.receiveShadow = true;
  scene.add(logs);

  // ---------- shafts of light, ground mist, pollen and falling needles ----------
  const rayTex = draw(64, 256, (g) => {
    const across = g.createLinearGradient(0, 0, 64, 0);
    across.addColorStop(0, 'rgba(255,255,255,0)'); across.addColorStop(0.5, 'rgba(255,255,255,1)'); across.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = across; g.fillRect(0, 0, 64, 256);
    g.globalCompositeOperation = 'destination-in';
    const down = g.createLinearGradient(0, 0, 0, 256);
    down.addColorStop(0, 'rgba(0,0,0,0.9)'); down.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = down; g.fillRect(0, 0, 64, 256);
  });
  const rays = [];
  for (let i = 0; i < tier.rays; i++) {
    const ray = new THREE.Mesh(new THREE.PlaneGeometry(rand(2, 6), 46),
      new THREE.MeshBasicMaterial({ map: rayTex, color: 0xffe9a8, transparent: true, opacity: rand(0.12, 0.26), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    ray.position.set(rand(-16, 22), 15, rand(-56, -4));
    ray.rotation.z = 0.44;                                         // slanted along the sun's direction
    ray.userData = { base: ray.material.opacity, phase: rand(0, 6.28) };
    scene.add(ray); rays.push(ray);
  }
  const puffTex = draw(256, 128, (g) => {
    for (let i = 0; i < 26; i++) {
      const x = rand(40, 216), y = rand(40, 88), r = rand(24, 60);
      const b = g.createRadialGradient(x, y, 0, x, y, r);
      b.addColorStop(0, 'rgba(255,255,255,0.22)'); b.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = b; g.fillRect(0, 0, 256, 128);
    }
  });
  const mists = [];
  for (let i = 0; i < tier.mists; i++) {
    const puff = new THREE.Mesh(new THREE.PlaneGeometry(rand(26, 46), rand(5, 9)),
      new THREE.MeshBasicMaterial({ map: puffTex, color: 0xfbf4df, transparent: true, opacity: rand(0.04, 0.11), depthWrite: false, fog: false }));
    puff.position.set(rand(-24, 24), rand(0.8, 3), rand(-64, -6));
    puff.userData = { x: puff.position.x, speed: rand(0.03, 0.09), phase: rand(0, 6.28) };
    scene.add(puff); mists.push(puff);
  }
  const dotTex = draw(32, 32, (g) => {
    const d = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    d.addColorStop(0, 'rgba(255,255,255,1)'); d.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = d; g.fillRect(0, 0, 32, 32);
  });
  function cloud(count, size, color, opacity, blending) {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { arr[i * 3] = rand(-18, 18); arr[i * 3 + 1] = rand(0.2, 10); arr[i * 3 + 2] = rand(-50, 14); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: dotTex, color, size, transparent: true, opacity, depthWrite: false, blending }));
    pts.frustumCulled = false;
    scene.add(pts);
    return pts;
  }
  const pollen = cloud(tier.pollen, 0.09, 0xf6ffd9, 0.75, THREE.AdditiveBlending);
  const needles = cloud(tier.needles, 0.07, 0x7a5a30, 0.9, THREE.NormalBlending);

  // ---------- litter on the forest floor ----------
  const profile = [[0, -0.5], [0.15, -0.5], [0.17, -0.45], [0.17, -0.3], [0.17, -0.15], [0.17, 0], [0.17, 0.1], [0.15, 0.2], [0.075, 0.33], [0.06, 0.36], [0.06, 0.4], [0.072, 0.4], [0.072, 0.47], [0, 0.47]];
  const bottle = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 12);
  bottle.scale(0.62, 0.62, 0.62);
  // Clear plastic body, a printed label band and a solid cap. v runs along the bottle from base (0) to cap (1).
  const band = (g, v0, v1, fill) => { g.fillStyle = fill; g.fillRect(0, 256 * (1 - v1), 64, 256 * (v1 - v0)); };
  const bottleMap = draw(64, 256, (g) => {
    g.fillStyle = '#eef7fa'; g.fillRect(0, 0, 64, 256);
    band(g, 0.23, 0.47, '#ffffff'); band(g, 0.3, 0.33, '#9aa3a8'); band(g, 0.38, 0.4, '#c5ccd0'); band(g, 0.84, 1, '#8d969b');
  });
  const bottleAlpha = draw(64, 256, (g) => {
    g.fillStyle = '#5c5c5c'; g.fillRect(0, 0, 64, 256);           // the body lets the forest floor show through
    band(g, 0.23, 0.47, '#ffffff'); band(g, 0.84, 1, '#ffffff');
  });
  const canMap = draw(128, 128, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#8f9499'; g.fillRect(0, 0, 128, 12); g.fillRect(0, 116, 128, 12);   // bare metal rims
    g.fillStyle = '#c9ced2'; g.beginPath(); g.moveTo(0, 96); g.lineTo(128, 40); g.lineTo(128, 62); g.lineTo(0, 114); g.closePath(); g.fill();
    g.fillStyle = '#3d4246'; for (let i = 0; i < 5; i++) g.fillRect(18, 26 + i * 6, rand(24, 54), 2.5);
  });
  // Plastic bags are smooth-shaded spheres (one shared vertex per point), pushed about into folds and creases.
  const blob = (r, w, h) => { const g = new THREE.SphereGeometry(r, w, h); g.deleteAttribute('uv'); g.deleteAttribute('normal'); return mergeVertices(g); };
  const crease = (v) => Math.pow(1 - Math.abs(Math.sin(v)), 6);   // 0 mostly, 1 along a narrow fold line
  const bag = blob(0.24, 18, 12);
  const bagPos = bag.attributes.position;
  for (let i = 0; i < bagPos.count; i++) {                        // a crumpled, half-collapsed carrier bag
    const x = bagPos.getX(i), y = bagPos.getY(i), z = bagPos.getZ(i);
    const k = 0.78 + 0.2 * Math.sin(x * 11) * Math.cos(z * 9) + 0.08 * Math.sin(y * 23 + x * 7) - 0.12 * crease(x * 13 + z * 11) - 0.08 * crease(z * 17 - x * 5);
    bagPos.setXYZ(i, x * k * 1.3, y * k * 0.42, z * k);
  }
  bag.computeVertexNormals();
  // Fly-tipped rubbish: old tyres and full bin bags.
  const sack = blob(0.3, 24, 16), sackPos = sack.attributes.position;
  for (let i = 0; i < sackPos.count; i++) {
    const x = sackPos.getX(i), y = sackPos.getY(i), z = sackPos.getZ(i), a = Math.atan2(z, x);
    const k = 1 + 0.07 * Math.sin(x * 13 + y * 7) * Math.cos(z * 11) - 0.06 * crease(a * 5 + y * 4) * (0.4 + Math.max(0, y) * 3);   // folds gathering to the knot
    const neck = y > 0.12 ? Math.max(0.14, 1 - (y - 0.12) * 4.6) : 1;   // tied at the top
    sackPos.setXYZ(i, x * k * neck, (y < 0 ? y * 0.8 : y * 1.35) * k, z * k * neck);
  }
  sack.computeVertexNormals();
  const geos = [bottle, new THREE.CylinderGeometry(0.075, 0.075, 0.24, 14), new THREE.CylinderGeometry(0.06, 0.06, 0.05, 10), new RoundedBoxGeometry(0.3, 0.2, 0.13, 2, 0.025), bag,
    new THREE.TorusGeometry(0.27, 0.105, 8, 18), sack];
  const mats = [
    new THREE.MeshStandardMaterial({ map: bottleMap, alphaMap: bottleAlpha, transparent: true, roughness: 0.08, metalness: 0.0, envMapIntensity: 1.8 }),
    new THREE.MeshStandardMaterial({ map: canMap, roughness: 0.3, metalness: 0.85, envMapIntensity: 1.3 }),
    new THREE.MeshStandardMaterial({ roughness: 0.35, envMapIntensity: 1.1 }),
    new THREE.MeshStandardMaterial({ roughness: 0.6, envMapIntensity: 0.8 }),
    new THREE.MeshStandardMaterial({ roughness: 0.32, envMapIntensity: 1.2 }),
    new THREE.MeshStandardMaterial({ roughness: 0.92, envMapIntensity: 0.25 }),
    new THREE.MeshStandardMaterial({ roughness: 0.28, envMapIntensity: 1.0 }),
  ];
  const COLORS = [
    [0xffffff, 0xdff3f8, 0x8fd3a8, 0x7fc4ee, 0xd8f0ff],           // bottles: clear, green, blue
    [0xd9342b, 0x1f5fc0, 0xe8e8e8, 0x1d8a4a, 0xf2b01e, 0x2b2b2b], // cans
    [0xe23b30, 0x2a6fd6, 0xffffff, 0xf4c21f, 0x2fa35a],           // caps
    [0xf08a2c, 0xf6f1e6, 0xd9342b, 0x2a6fd6],                     // cartons
    [0xf4f6f6, 0x3d8fe0, 0x24282a, 0xf1d34a, 0xdfe9ee],           // bags
    [0x161616, 0x1c1c1c, 0x121212],                               // tyres
    [0x15181a, 0x15181a, 0x1b3f7a, 0x2a2e30],                     // full bin bags
  ];
  const REST = [0.105, 0.075, 0.028, 0.065, 0.07, 0.1, 0.23];                // how high each kind sits when lying on the ground
  const pieces = [];
  const LITTER = tier.litter;
  for (let i = 0; i < LITTER; i++) {
    const z = rand(END_Z - 2, START_Z - 2);                       // none beyond the end of the walk, so the forest ends up clean
    const x = path(z) + (Math.random() < 0.5 ? -1 : 1) * (Math.pow(Math.random(), 1.6) * 9 + 0.2);   // most lies close to the trail
    const r = Math.random();
    const heavy = Math.random() < 0.04;                           // a tyre or a full bin bag
    const type = heavy ? (Math.random() < 0.4 ? 5 : 6) : r < 0.34 ? 0 : r < 0.6 ? 1 : r < 0.74 ? 2 : r < 0.84 ? 3 : 4;
    const size = heavy ? rand(0.9, 1.25) : rand(0.7, 1.15);
    const crush = type === 1 && Math.random() < 0.55 ? rand(0.35, 0.7) : type === 0 && Math.random() < 0.4 ? rand(0.5, 0.8) : 1;
    pieces.push({ type, x, z, size, crush, heavy, y: heightAt(x, z) + REST[type] * size * (0.55 + 0.45 * crush) - rand(0, 0.02),
      rot: new THREE.Euler(type === 2 || type === 4 || type === 6 ? rand(-0.25, 0.25) : Math.PI / 2 + rand(-0.2, 0.2), rand(0, 6.28), rand(-0.2, 0.2), 'YXZ'),
      spin: rand(-3, 3), drift: rand(-1, 1), color: pick(COLORS[type]) });
  }
  const meshes = geos.map((g, t) => {
    const mesh = new THREE.InstancedMesh(g, mats[t], pieces.filter((p) => p.type === t).length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.receiveShadow = true; mesh.frustumCulled = false;      // litter casts no shadow: too small to notice, costly to draw twice
    scene.add(mesh);
    return mesh;
  });
  const slot = [0, 0, 0, 0, 0, 0, 0];
  pieces.forEach((p) => { p.slot = slot[p.type]++; meshes[p.type].setColorAt(p.slot, tint.setHex(p.color)); });
  meshes.forEach((m) => { m.instanceColor.needsUpdate = true; });

  // ---------- volunteers cleaning up ----------
  // With ?debug in the address, tests can read the litter state and move the camera.
  const debug = params.has('debug') ? (window.__forest = { pieces, people: [], view: null, scene, backdrop, renderer, sun, tier: tierName, gpu, settings: tier }) : null;

  // Realistic rigged characters; if their files fail to load, the simple hand-built figures stand in.
  // They load only once the forest is on screen, so the first picture isn't held up by their 1.5 MB.
  const crew = { count: tier.people, path, heightAt, zFrom: 4, zTo: END_Z + 2, pieces, prepare: (o) => prepare(o) };   // they stay clear of the last tree
  let updatePeople = () => {};
  // A quiet moment if one comes, but never later than 1.5 s: with the forest, the smooth scroll and the printer
  // all drawing, the page can be busy every frame, and without a deadline the people sometimes never loaded.
  const whenIdle = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 400));
  const loadPeople = () => {
    if (crew.count <= 0) return;
    setTimeout(() => whenIdle(() => createVolunteers(scene, crew)
      .then((update) => { updatePeople = update; if (debug) debug.people = update.people; })
      .catch((err) => { console.warn('Realistic volunteers unavailable, using simple figures.', err); updatePeople = createPeople(scene, crew); })), 800);
  };


  // ---------- layout and input ----------
  let baseFov = 55, heroSpan = 0;
  // CSS variables are only written when they change, so a still page doesn't restyle the stage every frame.
  const cssVars = {};
  const setVar = (name, value) => { if (cssVars[name] !== value) { cssVars[name] = value; stage.style.setProperty(name, value); } };
  function resize() {
    heroSpan = hero.offsetHeight - window.innerHeight;
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = farCamera.aspect = w / h;
    baseFov = camera.fov = farCamera.fov = w / h < 0.8 ? 72 : 55;
    camera.updateProjectionMatrix(); farCamera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(() => { heroSpan = hero.offsetHeight - window.innerHeight; }).observe(hero);

  let px = 0, py = 0, lx = 0, ly = 0;
  if (!reduced) {
    window.addEventListener('pointermove', (e) => { px = e.clientX / window.innerWidth - 0.5; py = e.clientY / window.innerHeight - 0.5; });
  }
  let visible = true;
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(hero);
  // The graphics chip has to compile a drawing program for every material, which can take many seconds
  // the first time. Drawing while that is going on makes the whole page crawl, so the programs are
  // prepared in the background first; then a few hidden frames run until the pace is steady, and only
  // then does the forest fade in over the still backdrop.
  const warm = { compiled: false, shown: false, steady: 0, last: 0, since: performance.now() };
  const compiled = () => { warm.compiled = true; warm.since = performance.now(); };
  if (renderer.compileAsync) Promise.all([renderer.compileAsync(scene, camera), renderer.compileAsync(backdrop, farCamera)]).then(compiled, compiled); else compiled();
  setTimeout(compiled, 25000);                                   // never wait forever
  function warmUp(now) {                                         // true once the forest is on screen
    if (warm.shown) return true;
    if (!warm.compiled) return false;
    warm.steady = warm.last && now - warm.last < 55 ? warm.steady + 1 : 0;
    warm.last = now;
    if (warm.steady >= 4 || now - warm.since > 8000) {
      warm.shown = true;
      canvas.classList.add('is-ready');
      dyn.cool = now + 2500;                                       // let the fade-in finish before judging the pace
      loadPeople();
    }
    return warm.compiled;
  }
  // New objects (the volunteers) get the same treatment before they join the scene.
  // Their textures are sent to the graphics chip at the same time, so they don't stall the frame they first appear in.
  const prepare = (object) => {
    object.traverse((o) => { for (const m of [].concat(o.material || [])) for (const k of ['map', 'alphaMap', 'bumpMap']) if (m[k] && m[k].image) renderer.initTexture(m[k]); });
    return renderer.compileAsync ? renderer.compileAsync(object, camera, scene).catch(() => {}) : Promise.resolve();
  };

  // ---------- keeping it smooth ----------
  // Dynamic resolution: a smoothed frame time is compared with the screen's own pace. When frames run late
  // for a second, the drawing resolution drops a small step (down to 0.6); after five calm seconds it
  // climbs back by a smaller step. A step up that brings the lateness back lowers the ceiling, so it
  // doesn't see-saw. If even a reduced picture can't keep up, the scene settles on a steady 30 frames a
  // second (every other screen refresh) instead of a jittery 40 to 55. Weak devices start there.
  const dyn = { ratio: renderer.getPixelRatio(), max: renderer.getPixelRatio(), ceiling: renderer.getPixelRatio(), min: Math.min(0.6, renderer.getPixelRatio()),
    ema: 0, refresh: 16.7, raf: 0, lastRaf: 0, last: 0, slow: 0, calm: 0, cool: 0, raisedAt: -1e9, locked: tier.lock30 };
  const setRatio = (r) => { dyn.ratio = Math.round(r * 100) / 100; renderer.setPixelRatio(dyn.ratio); resize(); };
  function trackRefresh(now) {                                    // the screen's pace, from the quickest steady rAF rhythm seen
    const d = now - dyn.lastRaf; dyn.lastRaf = now;
    if (d <= 0 || d > 100) return;
    dyn.raf = dyn.raf ? dyn.raf * 0.9 + d * 0.1 : d;
    dyn.refresh = Math.max(6, Math.min(dyn.refresh, dyn.raf) * 0.999 + dyn.raf * 0.001);
  }
  const budget = () => (dyn.locked ? 1000 / 30 : Math.max(dyn.refresh, 1000 / 60));
  function pace(now) {                                            // called after each drawn frame
    if (fixedRatio > 0) return;
    const d = now - dyn.last; dyn.last = now;
    if (document.hidden || d > 250) { dyn.ema = 0; return; }
    dyn.ema = dyn.ema ? dyn.ema * 0.9 + d * 0.1 : d;
    if (now < dyn.cool) { dyn.slow = dyn.calm = 0; return; }
    const b = budget();
    dyn.slow = dyn.ema > b * 1.2 ? dyn.slow + d : 0;
    dyn.calm = dyn.ema < b * 1.06 ? dyn.calm + d : 0;
    if (dyn.slow > 1000) {
      if (now - dyn.raisedAt < 4000) dyn.ceiling = Math.max(dyn.min, dyn.ratio - 0.05);   // that last step up was too much
      if (!dyn.locked && dyn.ratio <= dyn.max * 0.75 + 0.001) { dyn.locked = true; setRatio(Math.min(dyn.ceiling, dyn.max * 0.9)); }
      else if (dyn.ratio > dyn.min + 0.001) setRatio(Math.max(dyn.min, dyn.ratio - 0.1));
      else if (!dyn.locked) dyn.locked = true;
      dyn.slow = dyn.calm = 0; dyn.cool = now + 1500;
    } else if (dyn.calm > 5000 && dyn.ratio < dyn.ceiling - 0.001) {
      setRatio(Math.min(dyn.ceiling, dyn.ratio + 0.05));
      dyn.raisedAt = now; dyn.slow = dyn.calm = 0; dyn.cool = now + 1500;
    }
  }

  // Free the graphics memory when the page is left, so reloads and back-and-forth visits don't pile up.
  window.addEventListener('pagehide', () => { renderer.dispose(); });

  // ---------- loop ----------
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const clock = new THREE.Clock();
  const look = new THREE.Vector3();
  let t = 0, walk = 0, stride = 0;

  let lastDrawn = 0, frameNo = 0, shadowAt = null, litterWalk = -1;
  const SHADOW_EVERY = 2;                                          // the people move: their shadows are redrawn every other frame

  (function frame(now) {
    requestAnimationFrame(frame);
    now = now || performance.now();
    trackRefresh(now);
    if (!visible || !warm.compiled) return;                        // nothing is drawn until the programs are ready
    if (dyn.locked && now - lastDrawn < 1000 / 30 - dyn.refresh * 0.5) return;   // steady 30: skip every other refresh
    lastDrawn = now;
    const T0 = performance.now();
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!reduced) t += dt;
    if (debug && debug.time !== undefined) t = debug.time;        // ?debug: tests can freeze the wind and mist
    uTime.value = t;

    // Scroll position through the pinned hero, 0 to 1, eased so the walk feels smooth.
    const span = heroSpan;                                         // measured on resize: reading layout here would force it every frame
    const target = span > 0 ? Math.min(1, Math.max(0, window.scrollY / span)) : 0;
    const before = walk;
    walk += (target - walk) * 0.08;
    if (debug && debug.snap) walk = target;                       // ?debug: tests can skip the easing
    stride += Math.abs(walk - before) * 70;                       // footsteps only while moving
    setVar('--p', walk.toFixed(4));

    const along = Math.min(1, walk / WALK_END);                    // down the trail
    const dive = Math.max(0, (walk - WALK_END) / (1 - WALK_END));  // then into the last tree
    const cz = START_Z + (END_Z - START_Z) * along;
    lx += (px - lx) * 0.04; ly += (py - ly) * 0.04;
    const calm = 1 - sm(0, 0.5, dive);                              // the pointer sway fades as you turn to the tree
    camera.position.set(path(cz) + Math.sin(stride * 0.5) * 0.035, 1.7 + Math.abs(Math.sin(stride)) * 0.045 + Math.sin(t * 0.8) * 0.012, cz);
    look.set(path(cz - 12) + lx * 5 * calm, 2.3 - ly * 2.5 * calm, cz - 12);
    if (dive > 0) {
      // Turn to the trunk first, then walk up to it; stop a hand's width from the bark.
      const dx = camera.position.x - END_TREE.x, dz = camera.position.z - END_TREE.z, d = Math.hypot(dx, dz) || 1;
      const stopAt = END_TREE.radius + 0.16;
      pos.set(END_TREE.x + dx / d * stopAt, 1.75, END_TREE.z + dz / d * stopAt);
      camera.position.lerp(pos, sm(0.05, 0.82, dive));
      look.lerp(pos.set(END_TREE.x, 1.75, END_TREE.z), sm(0, 0.4, dive));
    }
    camera.lookAt(look);
    // At the bark, a slight push in, as if stepping into the tree, while the picture goes dark.
    const fov = baseFov - sm(0.7, 1, dive) * baseFov * 0.3;
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = farCamera.fov = fov; camera.updateProjectionMatrix(); farCamera.updateProjectionMatrix(); }
    const dark = sm(0.74, 0.98, dive);
    setVar('--dark', dark.toFixed(3));
    if (dark > 0.995 && warm.shown) return;                        // all black: nothing to draw until you scroll back

    // The shadow area follows you down the trail, in whole steps so the shadows don't shimmer.
    const sx = Math.round(camera.position.x / 2) * 2, sz = Math.round((cz - 16) / 2) * 2;
    const sunMoved = shadowAt !== sx * 1000 + sz;
    shadowAt = sx * 1000 + sz;
    sun.target.position.set(sx, 0, sz);
    sun.position.set(sx + SUN.x, SUN.y, sz + SUN.z);
    sun.target.updateMatrixWorld();

    // Litter a few steps ahead lifts off the ground, spins and is gone by the time you reach it.
    // Only redone when the walk has moved, a piece is in the air, or a volunteer has bagged one.
    if (Math.abs(walk - litterWalk) > 0.0002 || pieces.changed || pieces.airborne) {
      litterWalk = walk; pieces.changed = false; pieces.airborne = false;
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        const lift = walk < 0.002 ? 0 : sm(9, 2.5, cz - p.z);
        p.lifting = lift > 0.02;                                    // tells the volunteers this one is already on its way
        if (p.lifting && lift < 1) pieces.airborne = true;          // still bobbing: keep updating
        pos.set(p.x + p.drift * lift * 1.2, p.y + lift * lift * 5.5 + Math.sin(t * 2 + p.spin) * 0.06 * lift, p.z);
        eul.set(p.rot.x + lift * p.spin, p.rot.y + lift * p.spin * 0.7, p.rot.z, 'YXZ');
        quat.setFromEuler(eul);
        const s = p.taken ? 0 : p.size * (1 - sm(0.55, 1, lift));    // taken: a volunteer has bagged it
        scl.set(s, s, s * p.crush);
        meshes[p.type].setMatrixAt(p.slot, m4.compose(pos, quat, scl));
      }
      meshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
    }

    for (const ray of rays) ray.material.opacity = ray.userData.base * (0.65 + 0.35 * Math.sin(t * 0.4 + ray.userData.phase));
    for (const puff of mists) {
      puff.position.x = puff.userData.x + Math.sin(t * puff.userData.speed + puff.userData.phase) * 8;
      puff.quaternion.copy(camera.quaternion);
    }
    pollen.position.set(Math.sin(t * 0.1) * 0.6, Math.sin(t * 0.17) * 0.3, cz - START_Z);
    pollen.rotation.y = t * 0.01;
    // Needles fall steadily and start again from the canopy.
    const fall = needles.geometry.attributes.position;
    for (let i = 0; i < fall.count; i++) {
      let y = fall.getY(i) - dt * (0.5 + (i % 5) * 0.12);
      if (y < 0) y = 10;
      fall.setY(i, y);
      fall.setX(i, fall.getX(i) + Math.sin(t * 1.3 + i) * dt * 0.25);
    }
    fall.needsUpdate = true;
    needles.position.z = cz - START_Z;

    const T1 = performance.now(), T2 = T1;
    updatePeople(t, reduced ? 0 : dt);
    const T3 = performance.now();
    if (debug && debug.view) debug.view(camera);                  // ?debug: lets a test move the camera

    farCamera.position.copy(camera.position); farCamera.quaternion.copy(camera.quaternion);
    renderer.clear();
    renderer.render(backdrop, farCamera);
    const farCalls = renderer.info.render.calls, farTris = renderer.info.render.triangles;
    renderer.clearDepth();
    if (sunMoved || frameNo++ % SHADOW_EVERY === 0) renderer.shadowMap.needsUpdate = true;   // set after the backdrop pass, which would use it up
    renderer.render(scene, camera);
    if (!warmUp(performance.now())) return;
    if (debug) {
      const T4 = performance.now();
      debug.ms = { scene: T1 - T0, people: T3 - T2, draw: T4 - T3, calls: renderer.info.render.calls + farCalls, triangles: renderer.info.render.triangles + farTris,
        ratio: dyn.ratio, locked: dyn.locked, frame: Math.round(dyn.ema * 10) / 10, refresh: Math.round(dyn.refresh * 10) / 10 };
    }
    pace(now);
  })();
}
