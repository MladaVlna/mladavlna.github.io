// Young volunteers cleaning the forest. Each one looks for a real piece of litter near the trail,
// walks over to it, bends, picks it up with a grabber stick, drops it into the bag they carry,
// and goes looking for the next. The litter they take disappears from the forest floor.
import * as THREE from 'three';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const SKIN = [0xf1c9a5, 0xe2b48c, 0xc98f62, 0x9a6a48, 0x6b4a34];
const TOPS = [0x2a6fd6, 0xd9534a, 0x6b4fa0, 0xe9e6dc, 0x2f8f5b, 0xe6a23c, 0x30343c, 0xd86a9c, 0x3aa7b8];
const TROUSERS = [0x2b3f63, 0x1f2937, 0x4a5a78, 0x3a3f3a, 0x6a5a44, 0x7d8894];
const HAIR = [0x2a1c12, 0x4a2f1c, 0x101010, 0xb98a4a, 0x7a3b1e, 0xd9c08a];
const GLOVES = [0xf2c21f, 0x2a6fd6, 0xe8e8e8, 0x2f8f5b];
const BAGS = [0x1c2226, 0x234f9a, 0x1c2226];

function material(color, roughness = 0.85) {
  return new THREE.MeshStandardMaterial({ color, roughness, envMapIntensity: 0.3 });
}
function part(geometry, mat, parent, x = 0, y = 0, z = 0, shadow = true) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow; mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function joint(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}
// A tapering limb segment hanging from its joint, with a rounded top so joints stay smooth when they bend.
function limb(parent, rTop, rBottom, length, mat) {
  part(new THREE.CylinderGeometry(rTop, rBottom, length, 14), mat, parent, 0, -length / 2, 0);
  part(new THREE.SphereGeometry(rTop, 14, 10), mat, parent, 0, 0, 0, false);
}
const lathe = (points, segments = 18, start = 0, sweep = Math.PI * 2) =>
  new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments, start, sweep);

function buildPerson() {
  const skin = material(pick(SKIN), 0.65), top = material(pick(TOPS)), trousers = material(pick(TROUSERS));
  const shoeMat = material(pick([0x1c1c1c, 0xf0f0f0, 0xc23b2f, 0x2a4f8f]), 0.6), sole = material(0xf2f2ee, 0.7);
  const hair = material(pick(HAIR), 0.9), glove = material(pick(GLOVES), 0.6), dark = material(0x241a14, 0.4), white = material(0xf3efe8, 0.5);
  const vest = material(0xd6f02e, 0.6); vest.emissive = new THREE.Color(0x2c3600); vest.side = THREE.DoubleSide;   // hi-vis, as on their real clean-ups
  const tape = material(0xe8eeee, 0.35), tool = material(0x9aa2a6, 0.4); tool.metalness = 0.7;

  const root = new THREE.Group();
  root.scale.setScalar(rand(0.93, 1.07));
  const hips = joint(root, 0, 0.88, 0);
  part(new THREE.SphereGeometry(0.15, 16, 12), trousers, hips, 0, 0.02, 0).scale.set(1.04, 0.8, 0.8);

  // Body: a jacket that narrows at the waist and widens to the shoulders, with an open hi-vis vest over it.
  const torso = joint(hips, 0, 0.04, 0);
  const body = part(lathe([[0.0, -0.02], [0.13, 0], [0.142, 0.06], [0.13, 0.17], [0.146, 0.3], [0.164, 0.42], [0.158, 0.49], [0.1, 0.545], [0.05, 0.585], [0.046, 0.64], [0, 0.64]]), top, torso);
  body.scale.set(1.06, 1, 0.7);
  const vestMesh = part(lathe([[0.146, 0.1], [0.137, 0.17], [0.153, 0.3], [0.171, 0.42], [0.168, 0.465]], 20, 0.3, Math.PI * 2 - 0.6), vest, torso);
  vestMesh.scale.set(1.06, 1, 0.72);
  for (const s of [-1, 1]) {                                     // straps over the shoulders
    const strap = part(new THREE.CapsuleGeometry(0.03, 0.17, 4, 8), vest, torso, s * 0.1, 0.505, 0, false);
    strap.rotation.x = Math.PI / 2; strap.scale.set(1.15, 1, 0.5);
  }
  for (const [y, r] of [[0.2, 0.144], [0.34, 0.16]]) {
    const band = part(new THREE.TorusGeometry(r, 0.011, 6, 26), tape, torso, 0, y, 0, false);
    band.rotation.x = Math.PI / 2; band.scale.set(1.06, 0.72, 1);
  }
  if (Math.random() < 0.45) {                                    // some carry a small backpack
    const pack = part(new THREE.CapsuleGeometry(0.1, 0.16, 6, 12), material(pick(TOPS), 0.75), torso, 0, 0.33, -0.155);
    pack.scale.set(1.2, 1, 0.75);
  } else if (Math.random() < 0.6) {                              // others have a hood down their back
    const hood = part(new THREE.SphereGeometry(0.1, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), top, torso, 0, 0.53, -0.085);
    hood.rotation.x = -2.0; hood.scale.set(1.15, 0.8, 1);
  }

  // Head: face, ears and one of several hair or hat styles.
  const head = joint(torso, 0, 0.66, 0);
  part(new THREE.SphereGeometry(0.104, 22, 18), skin, head, 0, 0.095, 0).scale.set(0.94, 1.08, 1.04);
  part(new THREE.SphereGeometry(0.082, 18, 14), skin, head, 0, 0.035, 0.014).scale.set(0.9, 1, 0.98);   // jaw and chin
  for (const s of [-1, 1]) {
    part(new THREE.SphereGeometry(0.022, 8, 6), skin, head, s * 0.103, 0.075, -0.005, false).scale.set(0.5, 1, 0.8);
    part(new THREE.SphereGeometry(0.013, 10, 8), white, head, s * 0.036, 0.098, 0.091, false).scale.set(1.25, 0.72, 0.6);
    part(new THREE.SphereGeometry(0.0065, 8, 6), dark, head, s * 0.036, 0.098, 0.099, false);
    const brow = part(new THREE.BoxGeometry(0.028, 0.005, 0.008), hair, head, s * 0.037, 0.118, 0.098, false);
    brow.rotation.z = -s * 0.12;
  }
  part(new THREE.SphereGeometry(0.014, 10, 8), skin, head, 0, 0.07, 0.104, false).scale.set(0.85, 1.35, 1);
  part(new THREE.CapsuleGeometry(0.004, 0.026, 3, 6), material(0x9a5648, 0.6), head, 0, 0.034, 0.092, false).rotation.z = Math.PI / 2;
  const cap = (mat, y = 0.1, r = 0.115, cover = 0.56) => part(new THREE.SphereGeometry(r, 18, 12, 0, Math.PI * 2, 0, Math.PI * cover), mat, head, 0, y, -0.008);
  const style = Math.random();
  if (style < 0.22) {                                            // beanie with a turned-up rim
    const wool = material(pick(TOPS), 0.95);
    cap(wool, 0.105, 0.118, 0.52);
    const rim = part(new THREE.TorusGeometry(0.112, 0.02, 8, 22), wool, head, 0, 0.115, -0.008, false);
    rim.rotation.x = Math.PI / 2;
  } else if (style < 0.4) {                                      // baseball cap
    const cloth = material(pick(TOPS), 0.8);
    cap(cloth, 0.108, 0.116, 0.48);
    part(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 16, 1, false, -Math.PI / 2, Math.PI), cloth, head, 0, 0.13, 0.07, false).scale.set(1, 1, 1.4);
  } else {
    cap(hair, 0.1, 0.117, 0.6);
    part(new THREE.BoxGeometry(0.15, 0.035, 0.03), hair, head, 0, 0.165, 0.085, false).rotation.x = -0.35;   // fringe
    if (style > 0.78) part(new THREE.CapsuleGeometry(0.045, 0.16, 4, 8), hair, head, 0, -0.02, -0.105);       // ponytail
    else if (style > 0.62) part(new THREE.CapsuleGeometry(0.085, 0.14, 6, 10), hair, head, 0, 0.0, -0.05).scale.set(1.1, 1, 0.7);   // long hair
  }

  // Legs with trainers.
  const leg = (side) => {
    const thigh = joint(hips, side * 0.088, 0, 0);
    limb(thigh, 0.086, 0.066, 0.4, trousers);
    const knee = joint(thigh, 0, -0.4, 0);
    limb(knee, 0.066, 0.047, 0.4, trousers);
    const foot = joint(knee, 0, -0.4, 0);
    const upper = part(new THREE.CapsuleGeometry(0.046, 0.13, 6, 10), shoeMat, foot, 0, -0.035, 0.05);
    upper.rotation.x = Math.PI / 2; upper.scale.set(1, 1, 0.85);
    part(new THREE.BoxGeometry(0.094, 0.022, 0.245), sole, foot, 0, -0.068, 0.05, false);
    return { thigh, knee, foot };
  };
  // Arms with work gloves. Facing +z, the right hand is on the -x side.
  const arm = (side) => {
    const shoulder = joint(torso, side * 0.196, 0.5, 0);
    limb(shoulder, 0.058, 0.048, 0.26, top);
    const elbow = joint(shoulder, 0, -0.26, 0);
    limb(elbow, 0.048, 0.037, 0.24, top);
    const hand = joint(elbow, 0, -0.25, 0);
    part(new THREE.SphereGeometry(0.038, 12, 10), glove, hand, 0, -0.016, 0).scale.set(0.88, 1.35, 0.62);
    part(new THREE.SphereGeometry(0.016, 8, 6), glove, hand, side * -0.03, 0.0, 0.022, false);
    return { shoulder, elbow, hand };
  };
  const legL = leg(1), legR = leg(-1), armL = arm(1), armR = arm(-1);

  // Grabber stick in the right hand, with the thing it has just picked up at its tip.
  const stick = joint(armR.hand);
  stick.rotation.x = -0.5;
  part(new THREE.CylinderGeometry(0.011, 0.011, 0.92, 8), tool, stick, 0, -0.42, 0);
  part(new THREE.BoxGeometry(0.036, 0.085, 0.036), material(0xd94a2b, 0.5), stick, 0, 0.03, 0, false);
  for (const s of [-1, 1]) part(new THREE.BoxGeometry(0.012, 0.06, 0.02), tool, stick, s * 0.022, -0.9, 0, false).rotation.z = s * 0.3;
  const found = part(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 10), material(0xffffff, 0.3), stick, 0, -0.93, 0.01, false);
  found.rotation.z = Math.PI / 2;

  // Rubbish bag in the left hand: a lumpy, half-full sack gathered at the top.
  const bagGeo = new THREE.IcosahedronGeometry(0.2, 3);
  const bp = bagGeo.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
    const k = 1 + 0.14 * Math.sin(x * 17 + y * 9) * Math.cos(z * 13) + 0.06 * Math.sin(y * 31 + z * 23);
    const neck = y > 0 ? Math.max(0.16, 1 - y * 3.3) : 1;
    bp.setXYZ(i, x * k * neck, y * 1.75 * k, z * k * 0.85 * neck);
  }
  bagGeo.computeVertexNormals();
  const bag = joint(armL.hand);
  const bagMat = material(pick(BAGS), 0.3); bagMat.envMapIntensity = 0.9;
  part(bagGeo, bagMat, bag, 0, -0.35, 0);

  return { root, hips, torso, head, legL, legR, armL, armR, found, bag };
}

export function createPeople(scene, { count, path, heightAt, zFrom, zTo, pieces }) {
  const REACH = 0.9;                                             // how far in front of their feet the stick touches down
  const EDGE = 3.1;                                              // they keep to the cleared strip along the trail
  const people = [];
  for (let i = 0; i < count; i++) {
    const p = buildPerson();
    const homeZ = zFrom + (zTo - zFrom) * (i + 0.5) / count + rand(-1.2, 1.2);
    Object.assign(p, {
      homeZ, z: homeZ, x: path(homeZ) + (i % 2 ? 1 : -1) * rand(1.6, 2.8),
      speed: rand(0.6, 0.85), offset: rand(0, 20),
      state: 'seek', wait: rand(0, 2.5), target: null, goal: new THREE.Vector2(), face: new THREE.Vector2(),
      yaw: rand(0, 6.28), stride: rand(0, 6), a: 0, u: 0, grabbed: false,
    });
    scene.add(p.root);
    people.push(p);
  }

  function chooseNext(p) {
    let best = null, bestD = Infinity;
    for (const piece of pieces) {
      if (piece.taken || piece.claimed || piece.lifting || piece.heavy) continue;
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
      let moving = 0;
      if (p.state === 'seek') {
        p.wait -= dt;
        if (p.wait <= 0) chooseNext(p);
      } else if (p.state === 'walk') {
        const dx = p.goal.x - p.x, dz = p.goal.y - p.z, d = Math.hypot(dx, dz);
        if (p.target && (p.target.taken || p.target.lifting)) {      // someone or something got there first
          p.target.claimed = false; p.target = null; p.state = 'seek'; p.wait = 0.4;
        } else if (d < 0.05) {
          if (p.target) { p.state = 'pick'; p.u = 0; p.grabbed = false; }
          else { p.state = 'seek'; p.wait = rand(1.5, 3.5); }
        } else {
          const step = Math.min(d, Math.min(p.speed, d * 2 + 0.12) * dt);   // ease to a stop
          p.x += dx / d * step; p.z += dz / d * step;
          p.stride += step * 4.4;
          p.wantYaw = Math.atan2(dx, dz);
          moving = 1;
        }
      } else if (p.state === 'pick') {
        p.u += dt;
        p.wantYaw = Math.atan2(p.face.x - p.x, p.face.y - p.z);
        if (!p.grabbed && p.u > 0.75) {
          p.grabbed = true;
          if (p.target.lifting) p.u = 2.4;                           // it lifted away just before the grab: straighten up
          else { p.target.taken = true; p.found.material.color.setHex(p.target.color); }
        }
        if (p.u > 3.1) { p.target = null; p.state = 'seek'; p.wait = rand(1.2, 4.0); }   // a breather before the next one
      }

      const picking = p.state === 'pick';
      const u = p.u;
      const k = picking ? sm(0, 0.7, u) * (1 - sm(1.4, 2.1, u)) : 0;        // bend down and reach
      const d = picking ? sm(1.5, 2.1, u) * (1 - sm(2.5, 3.0, u)) : 0;      // swing the find over to the bag
      p.found.visible = picking && p.grabbed && p.target && p.target.taken && u < 2.2;
      p.a += (moving - p.a) * Math.min(1, dt * 7);
      const a = p.a;

      p.root.position.set(p.x, heightAt(p.x, p.z), p.z);
      if (p.wantYaw !== undefined) {
        const turn = Math.atan2(Math.sin(p.wantYaw - p.yaw), Math.cos(p.wantYaw - p.yaw));
        p.yaw += turn * Math.min(1, dt * 5);
      }
      p.root.rotation.y = p.yaw;

      const s = Math.sin(p.stride), c = Math.cos(p.stride), breath = Math.sin(time * 1.5 + p.offset);
      p.hips.position.set(c * 0.014 * a, 0.88 + Math.abs(s) * 0.028 * a - k * 0.14, 0);
      p.hips.rotation.y = s * 0.1 * a;
      p.torso.rotation.set(0.05 + a * 0.04 + k * 0.66 + breath * 0.006, -s * 0.16 * a, -c * 0.025 * a);
      p.torso.scale.y = 1 + breath * 0.006;
      // Looks around while walking and idling; watches the stick while picking.
      p.head.rotation.set(k * 0.32 - 0.04 + breath * 0.01, Math.sin(time * 0.45 + p.offset) * 0.35 * (1 - k), 0);

      p.legL.thigh.rotation.x = -s * 0.55 * a - k * 0.62;
      p.legR.thigh.rotation.x = s * 0.55 * a - k * 0.62;
      const bendL = Math.max(0, Math.sin(p.stride + 0.9)), bendR = Math.max(0, Math.sin(p.stride + 0.9 + Math.PI));
      p.legL.knee.rotation.x = bendL * 0.9 * a + k * 0.95;
      p.legR.knee.rotation.x = bendR * 0.9 * a + k * 0.95;
      p.legL.foot.rotation.x = (s * 0.25 - bendL * 0.3) * a - k * 0.33;     // heel strike, toe off
      p.legR.foot.rotation.x = (-s * 0.25 - bendR * 0.3) * a - k * 0.33;

      // Left arm carries the bag and swings a little; right arm works the stick.
      p.armL.shoulder.rotation.set(s * 0.2 * a + 0.03, 0, -0.1 - k * 0.1);
      p.armL.elbow.rotation.x = -0.14 - Math.max(0, s) * 0.12 * a;
      p.bag.rotation.set(-p.torso.rotation.x * 0.85 - s * 0.16 * a, 0, 0.1 + c * 0.06 * a);
      p.armR.shoulder.rotation.set(-0.4 - k * 0.62 - d * 0.35 - s * 0.1 * a, 0, 0.08 + d * 0.62);
      p.armR.elbow.rotation.x = -0.38 + k * 0.3 - d * 0.78;
    }
  }
}
