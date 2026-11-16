// Project photo galleries: each thumbnail opens the photo full screen. Arrow buttons, the arrow keys and a
// sideways swipe move between photos; Escape, the close button or a click beside the photo close it.
// Without JavaScript every thumbnail is still a plain link to the large photo.
(function () {
  var grid = document.querySelector('.photos');
  var box = document.querySelector('.lightbox');
  if (!grid || !box || typeof box.showModal !== 'function') return;

  var links = Array.prototype.slice.call(grid.querySelectorAll('[data-full]'));
  var img = box.querySelector('img'), count = box.querySelector('.lightbox__count');
  var index = 0, opener = null;

  function show(i) {
    index = (i + links.length) % links.length;
    var a = links[index];
    img.style.opacity = '0';
    var next = new Image();
    next.onload = function () { img.src = next.src; img.alt = a.querySelector('img').alt; img.style.opacity = '1'; };
    next.src = a.getAttribute('data-full');
    count.textContent = (index + 1) + ' / ' + links.length;
    [index + 1, index - 1].forEach(function (j) {                       // the neighbours load in the background
      var n = links[(j + links.length) % links.length]; if (n) new Image().src = n.getAttribute('data-full');
    });
  }
  function open(i, from) {
    opener = from;
    show(i);
    box.showModal();
    document.documentElement.classList.add('is-viewing');
    if (window.__lenis) window.__lenis.stop();
  }
  function close() { if (box.open) box.close(); }
  box.addEventListener('close', function () {
    document.documentElement.classList.remove('is-viewing');
    if (window.__lenis) window.__lenis.start();
    if (opener) opener.focus();
  });

  links.forEach(function (a, i) {
    a.addEventListener('click', function (e) { e.preventDefault(); open(i, a); });
  });
  box.querySelector('.lightbox__prev').addEventListener('click', function () { show(index - 1); });
  box.querySelector('.lightbox__next').addEventListener('click', function () { show(index + 1); });
  box.querySelector('.lightbox__close').addEventListener('click', close);
  box.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
  });
  // A click on the dark area around the photo closes the viewer.
  box.querySelector('.lightbox__stage').addEventListener('click', function (e) { if (e.target === this) close(); });

  // Swipe sideways on touch screens.
  var x0 = null, y0 = null;
  box.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') { x0 = e.clientX; y0 = e.clientY; } });
  box.addEventListener('pointerup', function (e) {
    if (x0 === null) return;
    var dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) show(index + (dx < 0 ? 1 : -1));
  });
})();
