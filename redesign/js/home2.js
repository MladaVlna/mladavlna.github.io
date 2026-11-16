// Second homepage: language switch, smooth scrolling, the top bar, phone menu and scroll reveals.
(function () {
  // DEVELOPMENT: the page always opens in English while it is being designed.
  // BEFORE RELEASE: set this back to 'sk' (and <html lang="sk"> in home2.html).
  var DEFAULT_LANG = 'en';

  // Slovak is the text in the HTML. Only English lives here.
  var en = {
    skip: 'Skip to content', menu: 'Menu',
    nav_about: 'About', nav_focus: 'What we do', nav_projects: 'Projects', nav_join: 'How to join', nav_contact: 'Contact',
    hero_lead: "Together we're making eastern Slovakia a better place. For everyone, but especially for young people.",
    hero_hint: "Scroll · we'll clean the forest",
    mission_label: 'Our mission',
    mission_title: 'Change starts where you live.',
    mission_p1: 'Mladá Vlna is a youth-led civic association from eastern Slovakia. We help young people become active in their own community: caring for the place they live in, learning new skills and being there for each other.',
    pil1_t: 'Environment', pil1_p: 'Clean-up actions in Košice and Prešov.',
    pil2_t: 'Digital skills', pil2_p: 'AI, vibe coding and 3D printing for young people with fewer opportunities.',
    pil3_t: 'Mental health', pil3_p: 'What ties everything else together.',
    env_label: 'Environment', env_title: 'A cleaner Košice and Prešov, one bag at a time.',
    env_p1: 'We organise clean-up actions in Košice and Prešov: in parks, along roads and at the edge of the forest. Anyone can join; just turn up.',
    env_p2: "It isn't only about rubbish. Working side by side, people get to know each other, see the result straight away and start noticing what is happening around them.",
    env_cap: 'Before a clean-up · The Masters of Puppets',
    dig_label: 'Digital skills', dig_title: 'Technology for everyone, not just the lucky few.',
    dig_p: 'We work with young people with fewer opportunities. We teach them to use new technology as a tool for learning and making things, not just something that happens around them.',
    dig1_t: 'Artificial intelligence', dig1_p: 'How to learn, research and create with AI, with a critical eye.',
    dig2_t: 'Vibe coding', dig2_p: 'Your own website or app, made by describing it to AI. No coding experience needed.',
    dig3_t: '3D printing', dig3_p: 'From an idea to an object you can hold. Design it, print it, and find out what you can do.',
    printer_alt: 'A 3D printer printing the Mladá Vlna logo',
    mh_label: 'Mental health', mh_title: 'The thread that ties everything together.',
    mh_p1: "Every activity we run is also a place where young people meet, talk and feel they belong. Whether we're cleaning up, 3D printing or travelling, that's what it's really about.",
    mh_p2: "We create safe spaces where young people connect, share what they're going through and face together the challenges that would be hard to carry alone.",
    mh_cap: 'Sharing circle · ReToy',
    proj_label: 'Erasmus+ projects', proj_all: 'All projects and photos', proj_title: 'Where we have been.',
    proj_p: 'Erasmus+ exchanges are one part of what we do. For a week they bring together young people from across Europe, who come home with ideas for their own community.',
    tag_demo: 'Democracy', tag_eco: 'Environment', tag_rights: 'Human rights', tag_next: 'Next call',
    p1_place: 'Orahovica, Croatia', p2_place: 'Rymanów, Poland', p3_place: 'Košice, Slovakia', p5_place: 'Stara Zagora, Bulgaria',
    next_t: 'Your exchange could be here.', next_p: 'No call is open at the moment. We announce new ones on Instagram.',
    join_label: 'How to join', join_title: 'The trail to your first exchange.', step: 'Step',
    s1_t: 'Pick a project', s1_p: 'Look through the open calls and the info pack with the programme, place and conditions.',
    s2_t: 'Fill in the form', s2_p: 'You need to be 13 to 30.<br>Write us a great motivation: why you want to go, and what you would bring with you.',
    s3_t: 'We get in touch', s3_p: "Once we have considered every application, we contact you. We give priority to young people with fewer opportunities.",
    s4_t: 'Pack and go', s4_p: 'Accommodation and meals are covered by an EU grant. Travel is reimbursed after the project.',
    cta_label: 'Contact', cta_title: 'Want to change something where you live? Get in touch.',
    docs: 'Documents', other: 'First version of the site'
  };
  // Other pages (the project pages) add their own English text in window.PAGE_EN, set before this script.
  if (window.PAGE_EN) for (var k in window.PAGE_EN) en[k] = window.PAGE_EN[k];

  var root = document.documentElement;
  // ?palette=warm shows the earlier warm cream and green-black palette, for comparison.
  if (/[?&]palette=warm(&|$)/.test(location.search)) root.setAttribute('data-palette', 'warm');
  // Start at the very top: the beginning of the forest walk. A link from another page to a section (#join, ...) still works.
  var nav0 = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  if (location.hash && nav0 && nav0.type === 'reload') history.replaceState(null, '', location.pathname + location.search);   // a reload is a fresh start
  if (!location.hash) window.scrollTo(0, 0);
  // Some in-app browsers put a newly opened page back at the old page's scroll position after this has run.
  // Once everything has loaded, send it to the top again, unless the visitor has already scrolled themselves.
  var touched = false;
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (t) { window.addEventListener(t, function () { touched = true; }, { once: true, passive: true }); });
  function toTop() { if (!location.hash && !touched && window.scrollY > 0) window.scrollTo(0, 0); }
  window.addEventListener('load', function () { toTop(); setTimeout(toTop, 120); });
  window.addEventListener('pageshow', function (e) { if (!e.persisted) toTop(); });
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nodes = document.querySelectorAll('[data-i18n]'), ariaNodes = document.querySelectorAll('[data-i18n-aria]');
  var sk = {}, skAria = {};
  nodes.forEach(function (el) { sk[el.getAttribute('data-i18n')] = el.innerHTML; });
  ariaNodes.forEach(function (el) { skAria[el.getAttribute('data-i18n-aria')] = el.getAttribute('aria-label'); });
  var lang = 'sk';

  function apply(next) {
    lang = next;
    var dict = next === 'en' ? en : sk, aria = next === 'en' ? en : skAria;
    root.lang = next;
    nodes.forEach(function (el) {
      var text = dict[el.getAttribute('data-i18n')];
      if (text != null) el.innerHTML = text;
    });
    ariaNodes.forEach(function (el) {
      var text = aria[el.getAttribute('data-i18n-aria')];
      if (text != null) el.setAttribute('aria-label', text);
    });
    document.querySelectorAll('.lang button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === next));
    });
  }
  document.querySelectorAll('.lang button').forEach(function (b) {
    b.addEventListener('click', function () {
      var next = b.dataset.lang;
      if (next === lang) return;
      if (reduced) { apply(next); return; }
      document.body.classList.add('is-swapping');
      setTimeout(function () { apply(next); document.body.classList.remove('is-swapping'); }, 300);
      try { sessionStorage.setItem('mv-lang', next); } catch (e) {}   // carried to the next page in this visit
    });
  });

  // ---------- smooth scrolling ----------
  // Lenis eases wheel scrolling; the page still scrolls natively underneath, so the forest walk (which reads
  // window.scrollY) follows it. Touch scrolling stays native. Off for reduced motion.
  var lenis = null;
  function startLenis() {
    // Lenis only smooths the mouse wheel. On touch screens (tablets, phones) it adds nothing, and its
    // scrollTo was seen to leave the menu links dead on a tablet, so touch screens scroll natively.
    if (reduced || !window.Lenis || !window.matchMedia('(pointer: fine)').matches) return;
    lenis = new window.Lenis({ lerp: 0.11, wheelMultiplier: 0.9, smoothWheel: true });
    window.__lenis = lenis;                                          // for tests: __lenis.scrollTo(y, { immediate: true })
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    lenis.on('scroll', onScroll);
  }
  if (window.Lenis) startLenis(); else window.addEventListener('load', startLenis);

  // In-page links glide with Lenis, under the top bar.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    var target = id.length > 1 && document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    target = target.querySelector('[data-anchor]') || target;      // e.g. the mission text, not the black above it
    glideTo(target);
    // The address is left as it is, so a reload starts at the top of the forest rather than at this section.
  });

  // Scrolls so the element sits just under the top bar. If the page hasn't moved by the time the glide
  // should be over (a smooth-scroll library or a browser that ignores the request), it jumps there instead.
  function glideTo(el) {
    var y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 70);
    var from = window.scrollY;
    if (lenis) lenis.scrollTo(y, { duration: 1.6, force: true });
    else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    if (Math.abs(y - from) < 4) return;
    setTimeout(function () {
      if (Math.abs(window.scrollY - from) < 4) window.scrollTo(0, y);
    }, lenis ? 1900 : 900);
  }

  // Arriving from another page with a section in the address (home2.html#join): go to it once the page
  // has its final height, under the top bar.
  if (location.hash.length > 1) {
    window.addEventListener('load', function () {
      var el = null;
      try { el = document.querySelector(location.hash); } catch (e) {}
      if (el) window.scrollTo(0, Math.max(0, (el.querySelector('[data-anchor]') || el).getBoundingClientRect().top + window.scrollY - 70));
    });
  }

  // ---------- top bar ----------
  // Over the forest and the dark mission it is plain light words; on the paper sections it becomes a paper strip.
  // Pages mark where their paper begins (data-paper-start) and where a dark band begins (data-dark-start);
  // the homepage uses its environment and mission sections.
  var firstPaper = document.querySelector('[data-paper-start]') || document.getElementById('environment');
  var darkStart = document.querySelector('[data-dark-start]') || document.getElementById('mission');
  var paperFrom = 0, darkFrom = 0;
  function measure() {
    paperFrom = firstPaper ? firstPaper.offsetTop - 60 : Infinity;
    darkFrom = darkStart ? darkStart.offsetTop - 60 : Infinity;
  }
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);

  // ---------- phone menu ----------
  var btn = document.querySelector('.menu-btn');
  function closeMenu() {
    if (!root.classList.contains('menu-open')) return;
    root.classList.remove('menu-open'); btn.setAttribute('aria-expanded', 'false');
    if (lenis) lenis.start(); document.body.style.overflow = '';
  }
  btn.addEventListener('click', function () {
    var open = root.classList.toggle('menu-open');
    btn.setAttribute('aria-expanded', String(open));
    if (lenis) { open ? lenis.stop() : lenis.start(); }
    document.body.style.overflow = open ? 'hidden' : '';
  });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', function () { if (window.innerWidth > 980) closeMenu(); });

  function onScroll() {
    root.classList.toggle('on-paper', window.scrollY > paperFrom);
    root.classList.toggle('on-dark', window.scrollY > darkFrom);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- reveals ----------
  var reveals = document.querySelectorAll('.reveal, .trail');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    reveals.forEach(function (el, i) { if (el.classList.contains('reveal')) el.style.transitionDelay = (i % 4) * 90 + 'ms'; io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  var chosen = null;
  try { chosen = sessionStorage.getItem('mv-lang'); } catch (e) {}
  apply(chosen === 'sk' || chosen === 'en' ? chosen : DEFAULT_LANG);
  window.MV_LANG = function () { return lang; };
})();
