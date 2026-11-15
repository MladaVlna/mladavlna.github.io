// Realistic volunteers cleaning the forest, using rigged characters and motion from the
// Microsoft Rocketbox library (MIT licence, see models/LICENSE-Rocketbox.md).
// Each one looks for a real piece of litter near the trail, walks to it, crouches, picks it up
// with a grabber stick and drops it into the bag they carry. The litter they take disappears.
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const rand = (a, b) => a + Math.random() * (b - a);
const MODELS = 'models/';
// hair: whether the character has a separate hair-and-lashes texture.
const CAST = [
  { file: 'Male_Adult_17', tex: 'm022', walk: 'm_walk_neutral', hair: false },   // blue and white hoodie
  { file: 'Female_Adult_12', tex: 'f012', walk: 'f_walk_neutral', hair: true },  // dark hoodie, shorts, trainers
  { file: 'Male_Adult_18', tex: 'm023', walk: 'm_walk_neutral', hair: false },   // grey hoodie
  { file: 'Female_Adult_17', tex: 'f006', walk: 'f_walk_neutral', hair: true },  // green T-shirt, jeans
  { file: 'Male_Adult_08', tex: 'm014', walk: 'm_walk_neutral', hair: true },    // blue shirt, jeans
];
const SHARED = { idle: 'f_idle_look_around_01', down: 'f_crouch_in', up: 'f_crouch_out' };
const BLANK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// Keeps only what carries over between bodies of different sizes: joint rotations, plus the hip height.
// vertical is which axis of the hip position is "up"; inPlace removes the forward travel so the code can move the person.
function fitClip(clip, name, vertical, heightScale, inPlace) {
  const tracks = [];
  for (const track of clip.tracks) {
    if (!track.name.startsWith('Bip01')) continue;                // helper objects in the motion files that the characters don't have
    if (track.name.endsWith('.quaternion')) tracks.push(track.clone());
    else if (track.name === 'Bip01.position') {
      const t = track.clone(), v = t.values;
      for (let i = 0; i < v.length; i += 3) {
        for (let k = 0; k < 3; k++) {
          if (k === vertical) v[i + k] *= heightScale;
          else if (inPlace) v[i + k] = v[k];
        }
      }
      tracks.push(t);
    }
  }
  return new THREE.AnimationClip(name, clip.duration, tracks);
}

async function loadCast(howMany) {
  const manager = new THREE.LoadingManager();
  // The model files point at texture files we don't ship; ours are applied below.
  manager.setURLModifier((url) => (/\.(tga|bmp|tif|tiff|png|jpg|jpeg)$/i.test(url) && !url.includes(MODELS) ? BLANK : url));
  // Same reason: answer requests for the original TGA textures with an empty one, quietly.
  manager.addHandler(/\.tga$/i, { setPath() { return this; }, load(url, onLoad) { const t = new THREE.Texture(); if (onLoad) onLoad(t); return t; } });
  const fbx = new FBXLoader(manager);
  const textures = new THREE.TextureLoader();
  const image = (name) => { const t = textures.load(MODELS + name); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

  // Several characters share a walk; fetch and read each walk file only once.
  const walks = new Map();
  const walkFiles = (name) => { if (!walks.has(name)) walks.set(name, fbx.loadAsync(MODELS + name + '.fbx')); return walks.get(name); };
  const shared = {};
  const breathe = () => new Promise((resolve) => setTimeout(resolve, 30));   // lets a frame through between heavy files
  for (const [key, file] of Object.entries(SHARED)) { shared[key] = (await fbx.loadAsync(MODELS + file + '.fbx')).animations[0]; await breathe(); }

  const cast = [];
  for (const who of CAST.slice(0, howMany)) { cast.push(await one(who)); await breathe(); }
  return cast;

  async function one(who) {
    const [model, walkFile] = await Promise.all([fbx.loadAsync(MODELS + who.file + '.fbx'), walkFiles(who.walk)]);
    model.traverse((o) => {
      if (!o.isMesh) return;
      const fitted = [].concat(o.material).map((m) => {
        const n = m.name.toLowerCase();
        if (n.includes('opacity') && !who.hair) return new THREE.MeshBasicMaterial({ visible: false });
        if (n.includes('opacity')) return new THREE.MeshStandardMaterial({ map: image(who.tex + '_opacity_color.png'), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.85, envMapIntensity: 0.25 });
        if (n.includes('head')) return new THREE.MeshStandardMaterial({ map: image(who.tex + '_head_color.jpg'), roughness: 0.72, envMapIntensity: 0.25 });
        return new THREE.MeshStandardMaterial({ map: image(who.tex + '_body_color.jpg'), roughness: 0.88, envMapIntensity: 0.25 });
      });
      o.material = Array.isArray(o.material) ? fitted : fitted[0];
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    });

    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const hip = model.getObjectByName('Bip01');
    // The body is measured from its skeleton, in a real pose (below): resting skeletons and bounding boxes differ between characters.
    const boneY = (name) => { const bone = model.getObjectByName(name); return bone ? bone.getWorldPosition(new THREE.Vector3()).y : null; };

    const rest = hip.position.toArray();
    const vertical = [0, 1, 2].sort((a, b) => Math.abs(rest[b]) - Math.abs(rest[a]))[0];
    const hipHeight = (clip) => { const t = clip.tracks.find((x) => x.name === 'Bip01.position'); return t ? Math.abs(t.values[vertical]) : Math.abs(rest[vertical]); };

    // Play the walk once to find which way the character faces and how fast it really walks.
    const walkRaw = walkFile.animations[0];
    walkRaw.tracks = walkRaw.tracks.filter((track) => track.name.startsWith('Bip01'));   // drop helper objects the characters don't have
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

    const fit = (clip, name, inPlace) => fitClip(clip, name, vertical, Math.abs(rest[vertical]) / hipHeight(clip), inPlace);
    return {
      model,
      height: headTop - ground, floor: ground,
      facing: moves ? Math.atan2(dx, dz) : 0,                     // direction the character walks in its own space
      pace: moves ? travelled / (walkRaw.duration * 0.98) : 130,  // centimetres per second
      clips: {
        walk: fitClip(walkRaw, 'walk', vertical, 1, true),
        idle: fit(shared.idle, 'idle', false),
        down: fit(shared.down, 'down', false),
        up: fit(shared.up, 'up', false),
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
  const geo = new THREE.IcosahedronGeometry(0.2, 3), bp = geo.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
    const k = 1 + 0.14 * Math.sin(x * 17 + y * 9) * Math.cos(z * 13) + 0.06 * Math.sin(y * 31 + z * 23);
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
      yaw: rand(0, 6.28), wantYaw: undefined, u: 0, grabbed: false, low: 0,
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
          if (!p.target.lifting) { p.target.taken = true; p.found.material.color.setHex(p.target.color); p.found.visible = true; }
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
