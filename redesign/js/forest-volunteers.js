// Realistic volunteers cleaning the forest, using rigged characters and motion from the
// Microsoft Rocketbox library (MIT licence, see models/LICENSE-Rocketbox.md).
// Each one looks for a real piece of litter near the trail, walks to it, crouches, picks it up
// with a grabber stick and drops it into the bag they carry. The litter they take disappears.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const rand = (a, b) => a + Math.random() * (b - a);
const MODELS = 'models/';
// Each character is a compressed glTF file (mesh and skeleton only); all motion is in one shared file, anims.glb,
// made from the Rocketbox motion files. hair: whether the character has a separate hair-and-lashes texture.
const CAST = [
  { file: 'Male_Adult_17', tex: 'm022', walk: 'walk_m', hair: false },   // blue and white hoodie
  { file: 'Female_Adult_12', tex: 'f012', walk: 'walk_f', hair: true },  // dark hoodie, shorts, trainers
  { file: 'Male_Adult_18', tex: 'm023', walk: 'walk_m', hair: false },   // grey hoodie
  { file: 'Female_Adult_17', tex: 'f006', walk: 'walk_f', hair: true },  // green T-shirt, jeans
  { file: 'Male_Adult_08', tex: 'm014', walk: 'walk_m', hair: true },    // blue shirt, jeans
];

// Keeps only what carries over between bodies of different sizes: joint rotations, plus the hip height.
// vertical is which axis of the hip position is "up". heightScale turns the source rig's hip height into this
// character's. pin, if given, holds the hip's other two axes at those values, so the code alone moves the person.
function fitClip(clip, name, vertical, heightScale, pin) {
  const tracks = [];
  for (const track of clip.tracks) {
    if (!track.name.startsWith('Bip01') || track.name.startsWith('Bip01_Footsteps')) continue;   // the footstep helper has no bone in the characters
    if (track.name.endsWith('.quaternion')) tracks.push(track.clone());
    else if (track.name === 'Bip01.position') {
      const t = track.clone(), v = t.values;
      for (let i = 0; i < v.length; i += 3) {
        for (let k = 0; k < 3; k++) {
          if (k === vertical) v[i + k] *= heightScale;
          else if (pin) v[i + k] = pin[k];
        }
      }
      tracks.push(t);
    }
  }
  return new THREE.AnimationClip(name, clip.duration, tracks);
}

const hipTrack = (clip) => clip.tracks.find((x) => x.name === 'Bip01.position');

// Hi-vis vests and work gloves, painted over the clothes in the shader. Which part of the body a vertex
// belongs to comes from the bones that move it: chest and shoulders get the vest, hands and fingers the
// gloves. gear = (vest amount, glove amount, height up the vest from 0 at the hem to 1 at the collar).
const TORSO = /^Bip01_(Spine\d?|[LR]_Clavicle)$/, HAND = /^Bip01_[LR]_(Hand|Finger)/;
const GET = ['getX', 'getY', 'getZ', 'getW'];
const comp = (attr, i, k) => attr[GET[k]](i);       // works for interleaved (compressed) attributes too
function addGear(mesh) {
  const g = mesh.geometry;
  if (g.attributes.gear) return;
  const idx = g.attributes.skinIndex, wt = g.attributes.skinWeight, ps = g.attributes.position, bones = mesh.skeleton.bones;
  const gear = new Float32Array(ps.count * 3);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < ps.count; i++) {
    let vest = 0, glove = 0;
    for (let k = 0; k < 4; k++) {
      const w = comp(wt, i, k); if (!w) continue;
      const name = bones[Math.round(comp(idx, i, k))]?.name || '';
      if (TORSO.test(name)) vest += w; else if (HAND.test(name)) glove += w;
    }
    gear[i * 3] = vest; gear[i * 3 + 1] = glove;
    if (vest > 0.5) { lo = Math.min(lo, ps.getY(i)); hi = Math.max(hi, ps.getY(i)); }
  }
  for (let i = 0; i < ps.count; i++) gear[i * 3 + 2] = (ps.getY(i) - lo) / (hi - lo || 1);
  g.setAttribute('gear', new THREE.BufferAttribute(gear, 3));
}
function wearGear(material, vestColor) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uVest = { value: new THREE.Color(vestColor) };
    shader.uniforms.uGlove = { value: new THREE.Color(0x2b3530) };
    shader.vertexShader = 'attribute vec3 gear;\nvarying vec3 vGear;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vGear = gear;');
    shader.fragmentShader = 'uniform vec3 uVest;\nuniform vec3 uGlove;\nvarying vec3 vGear;\n' + shader.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        // Keep a little of the folds and shading of the clothes underneath.
        float folds = mix(1.0, 0.62 + 0.9 * dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)), 0.4);
        float vest = smoothstep(0.42, 0.58, vGear.x);
        float glove = smoothstep(0.42, 0.58, vGear.y);
        float band = (step(0.12, vGear.z) - step(0.2, vGear.z)) + (step(0.34, vGear.z) - step(0.42, vGear.z));   // two reflective strips
        vec3 vestColor = mix(uVest, vec3(0.62, 0.66, 0.68), band) * clamp(folds, 0.6, 1.15);
        diffuseColor.rgb = mix(diffuseColor.rgb, vestColor, vest);
        diffuseColor.rgb = mix(diffuseColor.rgb, uGlove * clamp(folds, 0.7, 1.1), glove);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vestColor * vest * (1.0 - band) * 0.18;   // fluorescent cloth stays bright in the shade`);
  };
}

async function loadCast(howMany) {
  const gltf = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const textures = new THREE.TextureLoader();
  let loading = [];                                                // textures still downloading for the current character
  const image = (name) => {
    let done; loading.push(new Promise((r) => { done = r; }));
    const t = textures.load(MODELS + name, done, undefined, done);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  };
  const breathe = () => new Promise((resolve) => setTimeout(resolve, 30));   // lets a frame through between files

  const motion = await gltf.loadAsync(MODELS + 'anims.glb');
  const clip = (name) => motion.animations.find((a) => a.name === name);
  for (const a of motion.animations) a.tracks = a.tracks.filter((t) => !t.name.startsWith('Bip01_Footsteps'));   // a helper the characters don't have
  const shared = { idle: clip('idle'), down: clip('down'), up: clip('up') };

  const cast = [];
  for (const [i, who] of CAST.slice(0, howMany).entries()) { cast.push(await one(who, i % 3 === 2 ? 0xff6a1a : 0xd8f52a)); await breathe(); }   // mostly yellow, some orange
  return cast;

  async function one(who, vestColor) {
    const model = (await gltf.loadAsync(MODELS + who.file + '.glb')).scene;
    model.traverse((o) => {
      if (!o.isMesh) return;
      const fitted = [].concat(o.material).map((m) => {
        const n = m.name.toLowerCase();
        if (n.includes('opacity') && !who.hair) return new THREE.MeshBasicMaterial({ visible: false });
        if (n.includes('opacity')) return new THREE.MeshStandardMaterial({ map: image(who.tex + '_opacity_color.webp'), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.85, envMapIntensity: 0.25 });
        if (n.includes('head')) return new THREE.MeshStandardMaterial({ map: image(who.tex + '_head_color.webp'), roughness: 0.72, envMapIntensity: 0.25 });
        const body = new THREE.MeshStandardMaterial({ map: image(who.tex + '_body_color.webp'), roughness: 0.88, envMapIntensity: 0.25 });
        if (o.isSkinnedMesh) { addGear(o); wearGear(body, vestColor); }
        return body;
      });
      o.material = Array.isArray(o.material) ? fitted : fitted[0];
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    });

    await Promise.all(loading); loading = [];                     // so they can go to the graphics chip before the person appears
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const hip = model.getObjectByName('Bip01');
    // The body is measured from its skeleton, in a real pose (below): resting skeletons and bounding boxes differ between characters.
    const boneY = (name) => { const bone = model.getObjectByName(name); return bone ? bone.getWorldPosition(new THREE.Vector3()).y : null; };

    const rest = hip.position.toArray();
    const vertical = [0, 1, 2].sort((a, b) => Math.abs(rest[b]) - Math.abs(rest[a]))[0];
    const hipHeight = (c) => { const t = hipTrack(c); return t ? Math.abs(t.values[vertical]) : Math.abs(rest[vertical]); };

    // Play the walk once to find which way the character faces and how fast it really walks.
    const walkRaw = clip(who.walk);
    const probe = new THREE.AnimationMixer(model);
    probe.clipAction(walkRaw).play();
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    probe.setTime(0); model.updateMatrixWorld(true); hip.getWorldPosition(a);
    const toeY = Math.min(boneY('Bip01_L_Toe0') ?? Infinity, boneY('Bip01_R_Toe0') ?? Infinity), ankleY = boneY('Bip01_L_Foot'), headY = boneY('Bip01_Head');
    const ground = Number.isFinite(toeY) ? toeY - 2 : ankleY !== null ? ankleY - 9 : box.min.y;
    const headTop = headY !== null ? headY + 17 : box.max.y;
    probe.setTime(walkRaw.duration * 0.98); model.updateMatrixWorld(true); hip.getWorldPosition(b);
    probe.stopAllAction(); probe.uncacheRoot(model);
    hip.position.fromArray(rest);
    const dx = b.x - a.x, dz = b.z - a.z, travelled = Math.hypot(dx, dz);
    const moves = travelled > 20;                                 // centimetres; otherwise the clip is already in place

    // Idle, crouch down and stand up all come from one female rig. They share one height scale, taken from
    // that rig standing (the idle's first frame). Each clip used to be scaled by its own first frame, and the
    // stand-up clip starts crouched, so standing up threw people about 2.5 m into the air.
    const stand = Math.abs(rest[vertical]) / hipHeight(shared.idle);
    // Crouching and standing keep the hip over the same spot as the idle, so there is no slide between them.
    const idleHip = hipTrack(shared.idle), pin = idleHip ? Array.from(idleHip.values.slice(0, 3)) : null;
    return {
      model,
      height: headTop - ground, floor: ground,
      facing: moves ? Math.atan2(dx, dz) : 0,                     // direction the character walks in its own space
      pace: moves ? travelled / (walkRaw.duration * 0.98) : 130,  // centimetres per second
      clips: {
        walk: fitClip(walkRaw, 'walk', vertical, 1, (() => { const t = hipTrack(walkRaw); return t ? Array.from(t.values.slice(0, 3)) : null; })()),
        idle: fitClip(shared.idle, 'idle', vertical, stand, null),
        down: fitClip(shared.down, 'down', vertical, stand, pin),
        up: fitClip(shared.up, 'up', vertical, stand, pin),
      },
    };
  }
}

function buildKit() {
  const metal = new THREE.MeshStandardMaterial({ color: 0x9aa2a6, roughness: 0.4, metalness: 0.7 });
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };

  // Grabber stick: held in the right hand, pointing forward and down.
  const stick = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.95, 8), metal, stick, 0, -0.43, 0);
  mesh(new THREE.BoxGeometry(0.036, 0.09, 0.036), new THREE.MeshStandardMaterial({ color: 0xd94a2b, roughness: 0.5 }), stick, 0, 0.03, 0);
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.012, 0.06, 0.02), metal, stick, s * 0.022, -0.92, 0).rotation.z = s * 0.3;
  const found = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }), stick, 0, -0.95, 0.01);
  found.rotation.z = Math.PI / 2; found.visible = false;

  // Rubbish bag: a lumpy, half-full sack gathered at the top, hanging from the left hand.
  let geo = new THREE.SphereGeometry(0.2, 20, 14);
  geo.deleteAttribute('uv'); geo.deleteAttribute('normal');
  geo = mergeVertices(geo);                                         // one vertex per point, so the plastic shades smoothly
  const bp = geo.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i), a = Math.atan2(z, x);
    const fold = Math.pow(1 - Math.abs(Math.sin(a * 4 + y * 9)), 6);   // soft folds running up to the knot
    const k = 1 + 0.08 * Math.sin(x * 17 + y * 9) * Math.cos(z * 13) - 0.07 * fold;
    const neck = y > 0 ? Math.max(0.16, 1 - y * 3.3) : 1;
    bp.setXYZ(i, x * k * neck, y * 1.75 * k, z * k * 0.85 * neck);
  }
  geo.computeVertexNormals();
  const bag = new THREE.Group();
  mesh(geo, new THREE.MeshStandardMaterial({ color: Math.random() < 0.6 ? 0x1c2226 : 0x234f9a, roughness: 0.3, envMapIntensity: 0.9 }), bag, 0, -0.36, 0);
  return { stick, bag, found };
}

export async function createVolunteers(scene, { count, path, heightAt, zFrom, zTo, pieces, prepare }) {
  const cast = await loadCast(count);                           // phones show fewer people, so they load fewer files
  const REACH = 0.75;                                            // how far in front of their feet the stick touches down
  const EDGE = 3.1;                                              // they keep to the cleared strip along the trail
  const people = [];
  const hand = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const role = cast[i % cast.length];
    const tall = rand(1.64, 1.84), scale = tall / role.height;
    const root = new THREE.Group();                              // moved and turned by the code below
    const body = SkeletonUtils.clone(role.model);
    // Drawn always until the body has been posed and measured (see fitBounds in update): the compressed model's
    // own resting bounds are a 2 cm dot at the feet, and culling with those made people vanish whenever their
    // feet left the picture.
    body.traverse((o) => { if (o.isSkinnedMesh) o.frustumCulled = false; });
    body.scale.setScalar(scale);
    body.position.y = -role.floor * scale;
    body.rotation.y = -role.facing;                              // so the character's own "forward" is the group's +z
    root.add(body);
    const kit = buildKit();
    root.add(kit.stick, kit.bag);
    root.visible = false;                                         // joins the scene below, once it is ready to draw

    const mixer = new THREE.AnimationMixer(body);
    const actions = {};
    for (const [key, clip] of Object.entries(role.clips)) actions[key] = mixer.clipAction(clip);
    for (const key of ['down', 'up']) { actions[key].setLoop(THREE.LoopOnce, 1); actions[key].clampWhenFinished = true; }
    const ease = rand(0.72, 0.9);                                // an unhurried pace
    const speed = role.pace * scale * ease;                      // metres per second (the scale already turns centimetres into metres)
    actions.walk.timeScale = ease;                               // slow the legs by the same amount, so the feet don't slide
    actions.idle.time = rand(0, role.clips.idle.duration);
    actions.idle.play();

    const homeZ = zFrom + (zTo - zFrom) * (i + 0.5) / count + rand(-1.2, 1.2);
    people.push({
      root, mixer, actions, current: 'idle', ...kit, speed, clips: role.clips,
      rightHand: body.getObjectByName('Bip01_R_Hand'), leftHand: body.getObjectByName('Bip01_L_Hand'),
      homeZ, z: homeZ, x: path(homeZ) + (i % 2 ? 1 : -1) * rand(1.6, 2.8),
      state: 'seek', wait: rand(0, 3), target: null, goal: new THREE.Vector2(), face: new THREE.Vector2(),
      yaw: rand(0, 6.28), wantYaw: undefined, u: 0, grabbed: false, low: 0, sized: 0,
    });
  }

  // Prepare each person's materials in the background, then let them walk on one at a time.
  const waiting = people.splice(0);
  (async () => {
    for (const p of waiting) {
      if (prepare) await prepare(p.root);
      p.root.visible = true;
      scene.add(p.root);
      people.push(p);
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  })();

  function play(p, name, fade = 0.3) {
    if (p.current === name) return;
    const next = p.actions[name];
    next.reset().play();
    p.actions[p.current].crossFadeTo(next, fade, false);
    p.current = name;
  }

  function chooseNext(p) {
    let best = null, bestD = Infinity;
    for (const piece of pieces) {
      if (piece.taken || piece.claimed || piece.lifting || piece.heavy) continue;   // tyres and full sacks are too much for a stick
      if (Math.abs(piece.z - p.homeZ) > 7 || Math.abs(piece.x - path(piece.z)) > EDGE) continue;
      const d = (piece.x - p.x) ** 2 + (piece.z - p.z) ** 2;
      if (d < bestD) { bestD = d; best = piece; }
    }
    p.target = best;
    if (best) {
      best.claimed = true;
      const dx = best.x - p.x, dz = best.z - p.z, d = Math.hypot(dx, dz) || 1;
      p.goal.set(best.x - dx / d * REACH, best.z - dz / d * REACH);   // stop a stick's length short of it
      p.face.set(best.x, best.z);
    } else {                                                     // nothing left nearby: stroll and keep looking
      const z = p.homeZ + rand(-5, 5);
      p.goal.set(path(z) + rand(-2.6, 2.6), z);
    }
    p.state = 'walk';
  }

  update.people = people;
  return update;

  // Once a person has been posed for a few frames, measure the real body (with its bones) and give three.js a
  // sphere around it, enlarged for crouching, reaching and swinging arms. From then on people off screen, or
  // outside the shadow area, are skipped; people on screen are always drawn.
  function fitBounds(root) {
    root.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      o.computeBoundingSphere();
      o.boundingSphere.radius *= 1.45;
      o.frustumCulled = true;
    });
  }

  function update(time, dt) {
    for (const p of people) {
      if (p.state === 'seek') {
        play(p, 'idle');
        p.wait -= dt;
        if (p.wait <= 0) chooseNext(p);
      } else if (p.state === 'walk') {
        const dx = p.goal.x - p.x, dz = p.goal.y - p.z, d = Math.hypot(dx, dz);
        if (p.target && (p.target.taken || p.target.lifting)) {      // someone or something got there first
          p.target.claimed = false; p.target = null; p.state = 'seek'; p.wait = 0.4;
        } else if (d < 0.06) {
          if (p.target) { p.state = 'pick'; p.u = 0; p.grabbed = false; play(p, 'down', 0.25); }
          else { p.state = 'seek'; p.wait = rand(2, 4.5); }
        } else {
          play(p, 'walk');
          const step = Math.min(d, p.speed * dt);
          p.x += dx / d * step; p.z += dz / d * step;
          p.wantYaw = Math.atan2(dx, dz);
        }
      } else if (p.state === 'pick') {
        // Crouch down, take the litter, hold a moment, stand up, then go looking again.
        p.u += dt;
        p.wantYaw = Math.atan2(p.face.x - p.x, p.face.y - p.z);
        const downFor = p.clips.down.duration, upAt = downFor + 0.7;
        if (!p.grabbed && p.u > downFor * 0.9) {
          p.grabbed = true;
          if (!p.target.lifting) { p.target.taken = true; pieces.changed = true; p.found.material.color.setHex(p.target.color); p.found.visible = true; }
        }
        if (p.u > upAt) play(p, 'up', 0.25);
        if (p.u > upAt + p.clips.up.duration * 0.55) p.found.visible = false;     // dropped into the bag
        if (p.u > upAt + p.clips.up.duration) { p.target = null; p.state = 'seek'; p.wait = rand(1.2, 4); }
      }

      p.root.position.set(p.x, heightAt(p.x, p.z), p.z);
      if (p.wantYaw !== undefined) {
        const turn = Math.atan2(Math.sin(p.wantYaw - p.yaw), Math.cos(p.wantYaw - p.yaw));
        p.yaw += turn * Math.min(1, dt * 5);
      }
      p.root.rotation.y = p.yaw;
      p.mixer.update(dt);

      // The stick and bag follow the hands. They are placed in the person's own space, so they turn with the body.
      p.root.updateMatrixWorld(true);
      if (p.sized < 3 && ++p.sized === 3) fitBounds(p.root);
      const crouching = p.current === 'down' ? 1 : 0;
      p.low += (crouching - p.low) * Math.min(1, dt * 4);
      p.rightHand.getWorldPosition(hand); p.root.worldToLocal(hand);
      p.stick.position.copy(hand);
      p.stick.rotation.set(-0.62 - p.low * 0.55, 0, 0);          // flatter when crouched, so the claw reaches the ground ahead
      p.leftHand.getWorldPosition(hand); p.root.worldToLocal(hand);
      p.bag.position.copy(hand);
      p.bag.rotation.z = Math.sin(time * 2 + p.homeZ) * 0.04;
    }
  }
}
