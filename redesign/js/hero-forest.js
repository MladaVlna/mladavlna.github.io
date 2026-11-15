// Hero scene: a misty Slovak spruce forest with litter on the ground. Scrolling walks you down
// the trail, and the litter ahead of you lifts off the forest floor and is cleared away.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createPeople } from './forest-people.js';
import { createVolunteers } from './forest-volunteers.js';
import { createBear } from './forest-bear.js';

const hero = document.querySelector('.hero');
const stage = document.querySelector('.hero__stage');
const canvas = document.querySelector('.hero__canvas');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
catch (e) { document.documentElement.classList.add('no-webgl'); }
if (renderer) start();

function start() {
  // ?cold in the address makes every drawing program look new, to test a first-ever visit.
  if (new URLSearchParams(location.search).has('cold')) THREE.ShaderChunk.common += '\n// cold ' + Date.now() + '\n';
  const small = window.innerWidth < 800;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.25 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.34;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const MIST = 0x8fc7c2;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(MIST, 0.03);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = skyTexture();

  scene.add(new THREE.HemisphereLight(0xd4f1ea, 0x1c3a2a, 1.5));
  // A low morning sun behind the trees: long shadows fall towards you across the trail.
  const SUN = new THREE.Vector3(18, 26, -40);
  const sun = new THREE.DirectionalLight(0xfff0c2, 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 150 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.35;
  scene.add(sun, sun.target);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1200);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const path = (z) => Math.sin(z * 0.07) * 2.6;                 // the trail winds a little
  const START_Z = 12, END_Z = -26;
  const uTime = { value: 0 };
  const m4 = new THREE.Matrix4(), pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3(), eul = new THREE.Euler();
  const tint = new THREE.Color();

  function draw(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    fn(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }
  // Makes a material's plants bend in the wind. bendBy is a GLSL expression for how much a vertex moves (0 at the root).
  function addWind(material, bendBy, strength) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTime;
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float windPhase = instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.23;
        float windBend = ${bendBy};
        transformed.x += (sin(uTime * 0.9 + windPhase) + 0.4 * sin(uTime * 2.3 + windPhase * 1.7)) * ${strength} * windBend;
        transformed.z += cos(uTime * 0.7 + windPhase * 1.3) * ${strength} * 0.6 * windBend;`);
    };
  }

  // ---------- sky: morning mist, a low sun and the ridge of the mountains ----------
  function skyTexture() {
    return draw(1024, 1024, (g) => {
      const sky = g.createLinearGradient(0, 0, 0, 1024);
      sky.addColorStop(0, '#dcf4ec'); sky.addColorStop(0.42, '#a9d9d2'); sky.addColorStop(0.56, '#8fc7c2'); sky.addColorStop(1, '#8fc7c2');
      g.fillStyle = sky; g.fillRect(0, 0, 1024, 1024);
      const glow = g.createRadialGradient(720, 330, 0, 720, 330, 430);
      glow.addColorStop(0, 'rgba(255,250,214,0.98)'); glow.addColorStop(0.22, 'rgba(246,250,214,0.5)'); glow.addColorStop(1, 'rgba(244,250,214,0)');
      g.fillStyle = glow; g.fillRect(0, 0, 1024, 1024);
      const ridge = (base, height, color, seed) => {
        g.beginPath(); g.moveTo(0, 1024);
        for (let x = 0; x <= 1024; x += 6) {
          const n = Math.sin(x * 0.011 + seed) * 0.5 + Math.sin(x * 0.027 + seed * 2.3) * 0.3 + Math.abs(Math.sin(x * 0.006 + seed * 0.7)) * 0.9 + Math.sin(x * 0.09 + seed) * 0.05;
          g.lineTo(x, base - n * height);
        }
        g.lineTo(1024, 1024); g.closePath(); g.fillStyle = color; g.fill();
      };
      ridge(505, 130, '#a6d3ce', 1.3);
      ridge(528, 95, '#97cbc6', 2.9);
      ridge(548, 70, '#86bdb9', 4.1);
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
    const geo = new THREE.PlaneGeometry(1100, 360, 300, 110);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -350);
    const mp = geo.attributes.position;
    for (let i = 0; i < mp.count; i++) mp.setY(i, heightOf(mp.getX(i), mp.getZ(i)));
    geo.computeVertexNormals();
    // Colour is painted in: rock, snow above the snow line, dark forest on the lower slopes, all softened by distance haze.
    const mn = geo.attributes.normal, mcol = new Float32Array(mp.count * 3);
    const light = new THREE.Vector3(-0.55, 0.62, 0.56).normalize(), n3 = new THREE.Vector3();
    const rock = new THREE.Color(0x5f7b84), snow = new THREE.Color(0xf4fbfb), woods = new THREE.Color(0x2c5a4a), haze = new THREE.Color(0xa9d9d2), c = new THREE.Color();
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
    scene.add(mountain);
  }

  // ---------- forest floor: moss, fallen needles and a worn trail ----------
  const floorTex = draw(512, 512, (g, w, h) => {
    g.fillStyle = '#5c7a52'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {                               // patches of moss and shade
      g.fillStyle = pick(['rgba(40,84,48,0.35)', 'rgba(92,132,70,0.3)', 'rgba(28,56,38,0.4)', 'rgba(120,150,84,0.22)']);
      g.beginPath(); g.ellipse(rand(0, w), rand(0, h), rand(6, 34), rand(5, 22), rand(0, 3.14), 0, 6.28); g.fill();
    }
    for (let i = 0; i < 5200; i++) {                              // fallen needles and twigs
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
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ map: floorTex, bumpMap: floorTex, bumpScale: 1.2, vertexColors: true, roughness: 1, envMapIntensity: 0.12 }));
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------- spruce trees ----------
  // One texture holds bark (left half) and a spray of needles with a ragged lower edge (right half).
  const treeTex = draw(512, 256, (g) => {
    g.fillStyle = '#4a3a2c'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 520; i++) {                               // furrowed bark
      g.strokeStyle = pick(['rgba(24,18,12,0.6)', 'rgba(96,78,58,0.45)', 'rgba(60,70,50,0.35)']);
      g.lineWidth = rand(1, 3.5);
      const x = rand(0, 256), y = rand(0, 256);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand(-3, 3), y + rand(10, 44)); g.stroke();
    }
    g.fillStyle = '#1c4a34'; g.fillRect(256, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {                              // needles hanging down the bough
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

  function spruce(tiers, spread) {
    const parts = [];
    const half = (geo, right) => {                                // point this part at its half of the texture
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, (right ? 0.5 : 0) + 0.004 + uv.getX(i) * 0.492);
      return geo;
    };
    const trunk = new THREE.CylinderGeometry(0.07, 0.3, 12.4, 12, 6);
    trunk.translate(0, 6.2, 0);
    parts.push(half(trunk, false));
    for (let i = 0; i < tiers; i++) {
      const f = i / (tiers - 1);
      const r = spread * (1 - f * 0.9) + 0.22, h = r * 0.95 + 0.5;
      const bough = new THREE.ConeGeometry(r, h, 22, 3, true);
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
  const treeMat = new THREE.MeshStandardMaterial({ map: treeTex, alphaTest: 0.5, roughness: 1, side: THREE.DoubleSide, envMapIntensity: 0.1 });
  addWind(treeMat, 'pow(max(position.y, 0.0) / 12.0, 2.0)', '0.16');
  const treeDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: treeTex, alphaTest: 0.5 });
  const TREES = small ? 300 : 600;
  const trunks = [];                                             // [x, z] of every tree, for the bear to walk around
  [spruce(13, 2.5), spruce(11, 2.0), spruce(15, 2.9)].forEach((geo, v) => {
    const n = Math.floor(TREES / 3);
    const mesh = new THREE.InstancedMesh(geo, treeMat, n);
    for (let i = 0; i < n; i++) {
      let x, z;
      do { x = rand(-70, 70); z = rand(-125, 22); } while (Math.abs(x - path(z)) < 3.6);
      trunks.push([x, z]);
      const s = rand(0.62, 1.2);                               // 7 to 15 metres tall
      quat.setFromEuler(eul.set(rand(-0.03, 0.03), rand(0, 6.28), rand(-0.03, 0.03)));
      mesh.setMatrixAt(i, m4.compose(pos.set(x, heightAt(x, z) - 0.25, z), quat, scl.set(s * rand(1.0, 1.3), s, s * rand(1.0, 1.3))));
      mesh.setColorAt(i, tint.setHSL(0.4 + rand(-0.03, 0.04), 0.25, rand(0.62, 0.95)));
    }
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    mesh.customDepthMaterial = treeDepth;
    scene.add(mesh);
  });

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
    const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1, envMapIntensity: 0.15 });
    addWind(mat, 'uv.y * uv.y', '0.07');
    const mesh = new THREE.InstancedMesh(tuft(), mat, count);
    for (let i = 0; i < count; i++) {
      const z = rand(END_Z - 30, START_Z + 4);
      const x = path(z) + (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.pow(Math.random(), 1.4) * reach);
      const s = rand(minS, maxS);
      quat.setFromEuler(eul.set(0, rand(0, 6.28), 0));
      mesh.setMatrixAt(i, m4.compose(pos.set(x, heightAt(x, z) - 0.03, z), quat, scl.set(s * rand(0.9, 1.4), s, s * rand(0.9, 1.4))));
      mesh.setColorAt(i, tint.setHSL(0.33 + rand(-0.04, 0.04), 0.3, rand(lightness - 0.15, lightness + 0.15)));
    }
    mesh.receiveShadow = true; mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  }
  plants(fernTex, small ? 900 : 2200, 0.5, 1.25, 20, 0.75);
  const grass = plants(grassTex, small ? 1400 : 3600, 0.18, 0.5, 14, 0.8);

  // Mossy boulders and fallen logs.
  const stone = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.6, 2),
    new THREE.MeshStandardMaterial({ map: floorTex, color: 0x9fb09a, roughness: 1, envMapIntensity: 0.15 }), 70);
  for (let i = 0; i < 70; i++) {
    let x, z;
    do { x = rand(-26, 26); z = rand(-60, 16); } while (Math.abs(x - path(z)) < 2.2);
    const s = rand(0.4, 1.6);
    quat.setFromEuler(eul.set(rand(0, 6.28), rand(0, 6.28), rand(0, 6.28)));
    stone.setMatrixAt(i, m4.compose(pos.set(x, heightAt(x, z) - 0.05, z), quat, scl.set(s * 1.3, s * 0.7, s)));
  }
  stone.castShadow = true; stone.receiveShadow = true;
  scene.add(stone);
  const barkTex = treeTex.clone(); barkTex.repeat.set(0.49, 1); barkTex.needsUpdate = true;
  const logs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.27, 5, 12),
    new THREE.MeshStandardMaterial({ map: barkTex, roughness: 1, envMapIntensity: 0.1 }), 14);
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
  for (let i = 0; i < 11; i++) {
    const ray = new THREE.Mesh(new THREE.PlaneGeometry(rand(2, 6), 46),
      new THREE.MeshBasicMaterial({ map: rayTex, color: 0xf4f7cf, transparent: true, opacity: rand(0.09, 0.2), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
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
  for (let i = 0; i < 16; i++) {
    const puff = new THREE.Mesh(new THREE.PlaneGeometry(rand(26, 46), rand(5, 9)),
      new THREE.MeshBasicMaterial({ map: puffTex, color: 0xd9f1ea, transparent: true, opacity: rand(0.3, 0.6), depthWrite: false, fog: false }));
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
  const pollen = cloud(small ? 500 : 1100, 0.09, 0xf6ffd9, 0.75, THREE.AdditiveBlending);
  const needles = cloud(small ? 120 : 260, 0.07, 0x7a5a30, 0.9, THREE.NormalBlending);

  // ---------- litter on the forest floor ----------
  const profile = [[0, -0.5], [0.15, -0.5], [0.17, -0.45], [0.17, -0.3], [0.17, -0.15], [0.17, 0], [0.17, 0.1], [0.15, 0.2], [0.075, 0.33], [0.06, 0.36], [0.06, 0.4], [0.072, 0.4], [0.072, 0.47], [0, 0.47]];
  const bottle = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 24);
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
  const bag = new THREE.IcosahedronGeometry(0.24, 3);
  const bagPos = bag.attributes.position;
  for (let i = 0; i < bagPos.count; i++) {                        // a crumpled, half-collapsed carrier bag
    const x = bagPos.getX(i), y = bagPos.getY(i), z = bagPos.getZ(i);
    const k = 0.72 + 0.3 * Math.sin(x * 19) * Math.cos(z * 17) + 0.16 * Math.sin(y * 31 + x * 11);
    bagPos.setXYZ(i, x * k * 1.3, y * k * 0.42, z * k);
  }
  bag.computeVertexNormals();
  // Fly-tipped rubbish: old tyres and full bin bags.
  const sack = new THREE.IcosahedronGeometry(0.3, 3), sackPos = sack.attributes.position;
  for (let i = 0; i < sackPos.count; i++) {
    const x = sackPos.getX(i), y = sackPos.getY(i), z = sackPos.getZ(i);
    const k = 1 + 0.13 * Math.sin(x * 13 + y * 7) * Math.cos(z * 11) + 0.06 * Math.sin(y * 23 + z * 19);
    const neck = y > 0.12 ? Math.max(0.14, 1 - (y - 0.12) * 4.6) : 1;   // tied at the top
    sackPos.setXYZ(i, x * k * neck, (y < 0 ? y * 0.8 : y * 1.35) * k, z * k * neck);
  }
  sack.computeVertexNormals();
  const geos = [bottle, new THREE.CylinderGeometry(0.075, 0.075, 0.24, 24), new THREE.CylinderGeometry(0.06, 0.06, 0.05, 18), new RoundedBoxGeometry(0.3, 0.2, 0.13, 3, 0.025), bag,
    new THREE.TorusGeometry(0.27, 0.105, 14, 30), sack];
  const mats = [
    new THREE.MeshStandardMaterial({ map: bottleMap, alphaMap: bottleAlpha, transparent: true, roughness: 0.08, metalness: 0.0, envMapIntensity: 1.8 }),
    new THREE.MeshStandardMaterial({ map: canMap, roughness: 0.3, metalness: 0.85, envMapIntensity: 1.3 }),
    new THREE.MeshStandardMaterial({ roughness: 0.35, envMapIntensity: 1.1 }),
    new THREE.MeshStandardMaterial({ roughness: 0.6, envMapIntensity: 0.8 }),
    new THREE.MeshStandardMaterial({ roughness: 0.32, envMapIntensity: 1.2, flatShading: true }),
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
  const LITTER = small ? 520 : 1150;
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
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  });
  const slot = [0, 0, 0, 0, 0, 0, 0];
  pieces.forEach((p) => { p.slot = slot[p.type]++; meshes[p.type].setColorAt(p.slot, tint.setHex(p.color)); });
  meshes.forEach((m) => { m.instanceColor.needsUpdate = true; });

  // ---------- volunteers cleaning up ----------
  // With ?debug in the address, tests can read the litter state and move the camera.
  const debug = new URLSearchParams(location.search).has('debug') ? (window.__forest = { pieces, people: [], bear: null, view: null, scene, renderer, sun }) : null;

  // Realistic rigged characters; if their files fail to load, the simple hand-built figures stand in.
  const crew = { count: small ? 3 : 5, path, heightAt, zFrom: 4, zTo: END_Z - 10, pieces, prepare: (o) => prepare(o) };
  let updatePeople = () => {};
  const whenIdle = window.requestIdleCallback || ((fn) => setTimeout(fn, 400));
  whenIdle(() => createVolunteers(scene, crew)
    .then((update) => { updatePeople = update; if (debug) debug.people = update.people; })
    .catch((err) => { console.warn('Realistic volunteers unavailable, using simple figures.', err); updatePeople = createPeople(scene, crew); }));

  // ---------- a bear in the background ----------
  let trailZ = START_Z;                                          // where the visitor currently is on the trail
  const updateBear = createBear(scene, { path, heightAt, trees: trunks, cameraZ: () => trailZ });
  if (debug) debug.bear = updateBear.root;

  // ---------- layout and input ----------
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 72 : 55;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

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
  if (renderer.compileAsync) renderer.compileAsync(scene, camera).then(compiled, compiled); else compiled();
  setTimeout(compiled, 25000);                                   // never wait forever
  function warmUp(now) {                                         // true once the forest is on screen
    if (warm.shown) return true;
    if (!warm.compiled) return false;
    warm.steady = warm.last && now - warm.last < 55 ? warm.steady + 1 : 0;
    warm.last = now;
    if (warm.steady >= 4 || now - warm.since > 8000) {
      warm.shown = true;
      canvas.classList.add('is-ready');
      smooth.settle = 4000;
    }
    return warm.compiled;
  }
  // New objects (the volunteers) get the same treatment before they join the scene.
  const prepare = (object) => (renderer.compileAsync ? renderer.compileAsync(object, camera, scene).catch(() => {}) : Promise.resolve());

  // ---------- keeping it smooth ----------
  // If the frame rate stays really low (under 22 a second for four seconds), quality is stepped down one
  // notch at a time. A step that doesn't help is undone, so a machine that is slow for some other reason
  // keeps the full picture. A steady 30 is left alone: changing quality costs a brief stutter of its own.
  const setRatio = (r) => { renderer.setPixelRatio(r); resize(); };
  const setShadow = (px) => { sun.shadow.mapSize.set(px, px); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } };
  const fullRatio = renderer.getPixelRatio(), fullShadow = sun.shadow.mapSize.x;
  const steps = [
    { on: () => setRatio(1), off: () => setRatio(fullRatio), skip: fullRatio <= 1 },
    { on: () => setShadow(1024), off: () => setShadow(fullShadow), skip: fullShadow <= 1024 },
    { on: () => { grass.visible = false; }, off: () => { grass.visible = true; } },
    { on: () => setRatio(0.75), off: () => setRatio(Math.min(fullRatio, 1)) },
  ].filter((s) => !s.skip);
  const smooth = { frames: 0, since: performance.now(), settle: 4000, step: -1, before: 0, done: false, low: 0 };
  function watchFrameRate(now) {
    if (smooth.done || document.hidden) { smooth.frames = 0; smooth.since = now; return; }
    if (smooth.settle > 0) { smooth.settle -= now - smooth.last || 0; smooth.last = now; smooth.frames = 0; smooth.since = now; return; }
    smooth.last = now;
    smooth.frames++;
    const elapsed = now - smooth.since;
    if (elapsed < 2000) return;
    const fps = smooth.frames * 1000 / elapsed;
    smooth.frames = 0; smooth.since = now;
    if (smooth.step >= 0 && smooth.before > 0 && fps < smooth.before * 1.12) {   // the last step didn't help: undo it and stop
      steps[smooth.step].off(); smooth.done = true; return;
    }
    smooth.before = 0;
    smooth.low = fps < 22 ? smooth.low + 1 : 0;
    if (smooth.low < 2 || smooth.step + 1 >= steps.length) return;
    smooth.low = 0; smooth.before = fps; smooth.step++;
    steps[smooth.step].on();
    smooth.settle = 1800;                                         // let the change take effect before judging it
  }

  // Free the graphics memory when the page is left, so reloads and back-and-forth visits don't pile up.
  window.addEventListener('pagehide', () => { renderer.dispose(); });

  // ---------- loop ----------
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const clock = new THREE.Clock();
  const look = new THREE.Vector3();
  let t = 0, walk = 0, stride = 0;

  (function frame() {
    requestAnimationFrame(frame);
    if (!visible || !warm.compiled) return;                        // nothing is drawn until the programs are ready
    const T0 = performance.now();
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!reduced) t += dt;
    uTime.value = t;

    // Scroll position through the pinned hero, 0 to 1, eased so the walk feels smooth.
    const span = hero.offsetHeight - window.innerHeight;
    const target = span > 0 ? Math.min(1, Math.max(0, window.scrollY / span)) : 0;
    const before = walk;
    walk += (target - walk) * 0.08;
    stride += Math.abs(walk - before) * 70;                       // footsteps only while moving
    stage.style.setProperty('--p', walk.toFixed(4));

    const cz = START_Z + (END_Z - START_Z) * walk;
    lx += (px - lx) * 0.04; ly += (py - ly) * 0.04;
    camera.position.set(path(cz) + Math.sin(stride * 0.5) * 0.035, 1.7 + Math.abs(Math.sin(stride)) * 0.045 + Math.sin(t * 0.8) * 0.012, cz);
    look.set(path(cz - 12) + lx * 5, 2.3 - ly * 2.5, cz - 12);
    camera.lookAt(look);

    // The shadow area follows you down the trail, in whole steps so the shadows don't shimmer.
    const sx = Math.round(camera.position.x / 2) * 2, sz = Math.round((cz - 16) / 2) * 2;
    sun.target.position.set(sx, 0, sz);
    sun.position.set(sx + SUN.x, SUN.y, sz + SUN.z);
    sun.target.updateMatrixWorld();

    // Litter a few steps ahead lifts off the ground, spins and is gone by the time you reach it.
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      const lift = walk < 0.002 ? 0 : sm(9, 2.5, cz - p.z);
      p.lifting = lift > 0.02;                                    // tells the volunteers this one is already on its way
      pos.set(p.x + p.drift * lift * 1.2, p.y + lift * lift * 5.5 + Math.sin(t * 2 + p.spin) * 0.06 * lift, p.z);
      eul.set(p.rot.x + lift * p.spin, p.rot.y + lift * p.spin * 0.7, p.rot.z, 'YXZ');
      quat.setFromEuler(eul);
      const s = p.taken ? 0 : p.size * (1 - sm(0.55, 1, lift));    // taken: a volunteer has bagged it
      scl.set(s, s, s * p.crush);
      meshes[p.type].setMatrixAt(p.slot, m4.compose(pos, quat, scl));
    }
    meshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; });

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

    trailZ = cz;
    const T1 = performance.now();
    updateBear(t, reduced ? 0 : dt);
    const T2 = performance.now();
    updatePeople(t, reduced ? 0 : dt);
    const T3 = performance.now();
    if (debug && debug.view) debug.view(camera);                  // ?debug: lets a test move the camera

    renderer.render(scene, camera);
    if (!warmUp(performance.now())) return;
    if (debug) { const T4 = performance.now(); debug.ms = { scene: T1 - T0, bear: T2 - T1, people: T3 - T2, draw: T4 - T3, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }; }
    watchFrameRate(performance.now());
  })();
}
