// A brown bear ambling through the trees well away from the trail, as they do in the Slovak mountains.
// It wanders between the trunks, stops now and then to sniff the ground, and keeps its distance.
import * as THREE from 'three';

const rand = (a, b) => a + Math.random() * (b - a);
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function buildBear() {
  const fur = new THREE.MeshStandardMaterial({ color: 0x4b3323, roughness: 1, envMapIntensity: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x32221a, roughness: 1, envMapIntensity: 0.15 });
  const muzzle = new THREE.MeshStandardMaterial({ color: 0x8b6b4b, roughness: 0.95, envMapIntensity: 0.15 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0e0b09, roughness: 0.5 });
  const blob = (parent, mat, r, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), mat);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const root = new THREE.Group();                                  // faces +z
  const body = new THREE.Group(); body.position.y = 0.92; root.add(body);

  // A heavy barrel of a body with the shoulder hump brown bears have, sloping down to the rump.
  blob(body, fur, 0.5, 0, 0.02, 0, 1, 0.98, 1.75);
  blob(body, fur, 0.42, 0, 0.2, 0.52, 1.1, 1, 1.1);                // shoulder hump
  blob(body, fur, 0.46, 0, 0.0, -0.62, 1.05, 0.98, 1.05);          // rump
  blob(body, fur, 0.4, 0, -0.14, 0.05, 1.08, 0.9, 1.9);            // belly
  blob(body, dark, 0.07, 0, 0.1, -1.08, 1, 1, 1);                  // stub of a tail

  // Neck and head carried low, in front of the shoulders.
  const neck = new THREE.Group(); neck.position.set(0, 0.06, 0.8); body.add(neck);
  blob(neck, fur, 0.3, 0, 0, 0.12, 1.05, 1, 1.25);
  const head = new THREE.Group(); head.position.set(0, -0.02, 0.42); neck.add(head);
  blob(head, fur, 0.25, 0, 0, 0.08, 1.12, 1, 1.05);
  blob(head, muzzle, 0.125, 0, -0.07, 0.34, 1, 0.82, 1.35);        // snout
  blob(head, black, 0.045, 0, -0.05, 0.5, 1.2, 0.8, 0.8);          // nose
  for (const s of [-1, 1]) {
    blob(head, fur, 0.075, s * 0.19, 0.2, 0.0, 1, 1, 0.6);         // ear
    blob(head, black, 0.02, s * 0.11, 0.06, 0.27);                 // eye
  }

  // Four thick legs with a knee and a broad paw.
  const leg = (x, z, front) => {
    const hip = new THREE.Group(); hip.position.set(x, -0.12, z); body.add(hip);
    blob(hip, front ? fur : fur, front ? 0.2 : 0.23, 0, -0.16, 0, 1, 1.5, 1.05);
    const knee = new THREE.Group(); knee.position.set(0, -0.4, 0); hip.add(knee);
    blob(knee, dark, 0.135, 0, -0.15, 0.0, 1, 1.5, 1);
    blob(knee, dark, 0.14, 0, -0.36, 0.06, 1.05, 0.55, 1.4);       // paw
    return { hip, knee };
  };
  const legs = [leg(0.28, 0.55, true), leg(-0.28, 0.55, true), leg(0.3, -0.6, false), leg(-0.3, -0.6, false)];
  root.scale.setScalar(rand(0.95, 1.08));
  return { root, body, neck, head, legs };
}

// trees: [x, z] of every trunk, so the bear can walk around them. cameraZ(): where the visitor is on the trail.
export function createBear(scene, { path, heightAt, trees, cameraZ }) {
  const bear = buildBear();
  scene.add(bear.root);
  const side = Math.random() < 0.5 ? -1 : 1;
  let z = cameraZ() - 24, x = path(z) + side * 8;
  let yaw = 0, stride = 0, moving = 0, sniff = 0, pause = 0, untilPause = rand(7, 13);
  const goal = new THREE.Vector2(x, z);

  function newGoal() {                                             // somewhere ahead of the visitor, 6 to 11 metres off the trail, so it stays in view
    const gz = cameraZ() - rand(20, 34);
    goal.set(path(gz) + side * rand(6, 11), gz);
  }
  newGoal();

  update.root = bear.root;                                         // lets tests find the bear
  return update;

  function update(time, dt) {
    if (dt === 0) { bear.root.position.set(x, heightAt(x, z), z); return; }
    const dx = goal.x - x, dz = goal.y - z, far = Math.hypot(dx, dz);
    if (far < 1.2 || goal.y > cameraZ() - 14) newGoal();           // arrived, or the visitor has caught up

    let walking = 1;
    if (pause > 0) {                                               // stopped, nose to the ground
      pause -= dt; walking = 0;
      if (pause <= 0) untilPause = rand(8, 15);
    } else {
      untilPause -= dt;
      if (untilPause <= 0) pause = rand(3, 5.5);
    }
    moving += (walking - moving) * Math.min(1, dt * 2.5);
    sniff += ((pause > 0 ? 1 : 0) - sniff) * Math.min(1, dt * 2);

    // Head for the goal, leaning away from any trunk that is close.
    let hx = dx / (far || 1), hz = dz / (far || 1);
    for (let i = 0; i < trees.length; i++) {
      const tx = x - trees[i][0], tz = z - trees[i][1], d2 = tx * tx + tz * tz;
      if (d2 < 9 && d2 > 0.0001) { const d = Math.sqrt(d2), push = (3 - d) / 3 * 1.6; hx += tx / d * push; hz += tz / d * push; }
    }
    const want = Math.atan2(hx, hz);
    yaw += Math.atan2(Math.sin(want - yaw), Math.cos(want - yaw)) * Math.min(1, dt * 1.6);
    const speed = 0.62 * moving;
    x += Math.sin(yaw) * speed * dt; z += Math.cos(yaw) * speed * dt;
    stride += speed * dt * 3.3;

    bear.root.position.set(x, heightAt(x, z), z);
    bear.root.rotation.y = yaw;

    // A slow four-beat walk: each leg a quarter of a cycle after the last, body rolling from side to side.
    const beats = [0, 0.5, 0.75, 0.25];
    for (let i = 0; i < 4; i++) {
      const ph = stride + beats[i] * Math.PI * 2, s = Math.sin(ph), lift = Math.max(0, Math.cos(ph));
      bear.legs[i].hip.rotation.x = -s * 0.42 * moving;
      bear.legs[i].knee.rotation.x = lift * 0.55 * moving;
    }
    const roll = Math.sin(stride);
    bear.body.position.y = 0.92 + Math.abs(Math.sin(stride * 2)) * 0.02 * moving - sniff * 0.03;
    bear.body.rotation.set(sniff * 0.07, 0, roll * 0.045 * moving);
    // Head swings with the walk; drops to the ground and moves about when sniffing.
    bear.neck.rotation.set(0.25 + sniff * 0.55 + Math.sin(stride * 2) * 0.04 * moving, roll * 0.1 * moving + Math.sin(time * 0.7) * 0.35 * sniff, 0);
    bear.head.rotation.set(0.1 + sniff * 0.35 + Math.sin(time * 2.4) * 0.05 * sniff, Math.sin(time * 0.31) * 0.2 * (1 - sniff), 0);
  }
}
