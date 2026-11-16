// Responsive layout check for the homepage (index.html). In the browser console at any window size:
//   await (new (async () => {}).constructor(await (await fetch("tools/responsive-audit.js", { cache: "reload" })).text()))()
await new Promise((r) => setTimeout(r, 2500));
const W = innerWidth, H = innerHeight, out = { size: W + 'x' + H };
out.overflowX = document.documentElement.scrollWidth - W;
// Elements sticking out of the viewport sideways (ignore the marquee strip, canvases, hidden things).
const off = [];
document.querySelectorAll('main *, header *, footer *').forEach((el) => {
  if (el.closest('.strip, svg, canvas, picture, .hero__poster') || el.closest('[hidden]')) return;
  const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return;
  if (el.closest('.nav') && !document.documentElement.classList.contains('menu-open') && W <= 980) return;
  const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
  if (r.right > W + 1 || r.left < -1) off.push((el.className || el.tagName) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
});
out.offscreen = off.slice(0, 8);
// Smallest text in use.
let minFont = 99, minEl = '';
document.querySelectorAll('main p, main span, main a, main li, main h3, footer p, footer a, header a, header button').forEach((el) => {
  if (el.closest('svg, .strip')) return; const cs = getComputedStyle(el); if (cs.display === 'none') return;
  if (!el.textContent.trim()) return;
  const f = parseFloat(cs.fontSize); if (f < minFont) { minFont = f; minEl = el.className || el.tagName; }
});
out.minFont = minFont + ' ' + minEl;
out.h1 = getComputedStyle(document.querySelector('h1')).fontSize;
out.h2 = getComputedStyle(document.querySelector('.mission__title')).fontSize;
// Words overflowing their own box (long words in big headings).
const clipped = [];
document.querySelectorAll('h1, h2, h3, .pillars strong, .tools strong').forEach((el) => { if (el.scrollWidth > el.clientWidth + 2) clipped.push(el.textContent.trim().slice(0, 24)); });
out.clippedHeadings = clipped;
// Hero copy fits on screen.
const copy = document.querySelector('.hero__copy').getBoundingClientRect(); out.heroCopy = Math.round(copy.top) + '..' + Math.round(copy.bottom) + ' of ' + H;
// Top bar parts overlapping each other.
const brand = document.querySelector('.brand').getBoundingClientRect();
const btn = document.querySelector('.menu-btn'); const navEl = document.querySelector('.nav');
const right = getComputedStyle(btn).display !== 'none' ? btn.getBoundingClientRect() : navEl.getBoundingClientRect();
out.barOverlap = brand.right > right.left - 8 ? 'OVERLAP brand ' + Math.round(brand.right) + ' > ' + Math.round(right.left) : 'ok';
// Phone menu: open it and check everything fits.
if (getComputedStyle(btn).display !== 'none') {
  btn.click(); await new Promise((r) => setTimeout(r, 600));
  const top = document.querySelector('.top').getBoundingClientRect().bottom;
  const items = [...navEl.children].map((c) => c.getBoundingClientRect());
  out.menu = { fits: items.every((b) => b.top >= top - 1 && b.bottom <= H + 1), firstTop: Math.round(items[0].top), barBottom: Math.round(top), lastBottom: Math.round(items[items.length - 1].bottom), linkFont: getComputedStyle(navEl.querySelector('a')).fontSize, linkHeight: Math.round(items[0].height) };
  btn.click(); await new Promise((r) => setTimeout(r, 500));
}
return out;
