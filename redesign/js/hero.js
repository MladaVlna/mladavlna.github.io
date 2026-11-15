// Hero: a photo of discarded litter dissolves, as you scroll, into the model city
// that participants built from collected waste.
import * as THREE from 'three';

const hero = document.querySelector('.hero');
const stage = document.querySelector('.hero__stage');
const canvas = document.querySelector('.hero__canvas');

// zoom and focus keep the important part of each photo in frame when it is cropped to the screen.
const BEFORE = { src: 'img/litter.jpg', aspect: 2400 / 1600, zoom: 1.0, focus: [0.5, 0.5] };
const AFTER = { src: 'img/city.jpg', aspect: 1600 / 1200, zoom: 1.16, focus: [0.5, 0.45] };

// Scroll position through the hero, 0 to 1. The text layers read it from CSS as --p.
let target = 0, p = 0;
function readScroll() {
  const span = hero.offsetHeight - window.innerHeight;
  target = span > 0 ? Math.min(1, Math.max(0, window.scrollY / span)) : 0;
}
window.addEventListener('scroll', readScroll, { passive: true });
readScroll();

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false }); } catch (e) { /* CSS background stays */ }

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
let uniforms = null;

if (renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const loader = new THREE.TextureLoader();
  let loaded = 0;
  const load = (src) => {
    const t = loader.load(src, () => { if (++loaded === 2) canvas.classList.add('is-ready'); });
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  uniforms = {
    uA: { value: load(BEFORE.src) }, uB: { value: load(AFTER.src) },
    uP: { value: 0 }, uView: { value: 1 },
    uAspA: { value: BEFORE.aspect }, uAspB: { value: AFTER.aspect },
    uZoomA: { value: BEFORE.zoom }, uZoomB: { value: AFTER.zoom },
    uFocA: { value: new THREE.Vector2(...BEFORE.focus) }, uFocB: { value: new THREE.Vector2(...AFTER.focus) },
  };
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform sampler2D uA, uB;
      uniform float uP, uView, uAspA, uAspB, uZoomA, uZoomB;
      uniform vec2 uFocA, uFocB;
      varying vec2 vUv;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float a = 0.5, s = 0.0;
        for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; }
        return s;
      }
      // Fill the screen with the photo, cropping whichever side overflows.
      vec2 cover(vec2 uv, float asp, float zoom, vec2 focus) {
        vec2 s = vec2(min(1.0, uView / asp), min(1.0, asp / uView)) / zoom;
        vec2 c = clamp(focus, s * 0.5, 1.0 - s * 0.5);
        return (uv - 0.5) * s + c;
      }
      vec3 grade(vec3 c, float sat, float gain) {
        float l = dot(c, vec3(0.3, 0.59, 0.11));
        return mix(vec3(l), c, sat) * gain;
      }
      void main() {
        vec2 aspect = vec2(uView, 1.0);
        // The city grows out of the litter in patches, not as a flat cross-fade.
        float n = fbm(vUv * aspect * 3.2);
        float m = smoothstep(n - 0.12, n + 0.12, uP * 1.34 - 0.17);

        vec3 a = texture2D(uA, cover(vUv, uAspA, uZoomA * (1.0 + 0.1 * uP), uFocA)).rgb;
        vec3 b = texture2D(uB, cover(vUv, uAspB, uZoomB * (1.12 - 0.12 * uP), uFocB)).rgb;
        // Litter is grey and dim; the city has its colour.
        a = grade(a, 0.35, 0.5) * vec3(0.92, 1.0, 1.1);
        b = grade(b, 1.0, 0.82);

        vec3 col = mix(a, b, m);
        col += vec3(1.0, 0.78, 0.5) * m * (1.0 - m) * 0.9;          // a warm edge where the change is happening
        float v = distance(vUv, vec2(0.5)) * 1.25;
        col *= 1.0 - 0.55 * v * v;                                  // vignette
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  })));

  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    uniforms.uView.value = w / h;
  };
  resize();
  window.addEventListener('resize', resize);
}

(function frame() {
  requestAnimationFrame(frame);
  p += (target - p) * 0.12;
  if (Math.abs(target - p) < 0.0005) p = target;
  stage.style.setProperty('--p', p.toFixed(4));
  if (renderer) { uniforms.uP.value = p; renderer.render(scene, camera); }
})();
