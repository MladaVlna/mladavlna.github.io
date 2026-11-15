// Second homepage: language switch, phone menu and scroll reveals.
(function () {
  // Slovak is the text in the HTML. Only English lives here.
  var en = {
    skip: 'Skip to content',
    nav_about: 'About', nav_projects: 'Projects', nav_join: 'How to join', nav_faq: 'Questions', nav_contact: 'Contact',
    hero_label: 'Civic association · eastern Slovakia',
    hero_lead: 'Erasmus+ exchanges for young people who care about what we leave behind. Free, for anyone aged 13 to 30.',
    cta_join: 'I want to join', cta_projects: 'See the projects',
    hero_hint: "Scroll · we'll clean the forest",
    about_label: 'About us',
    about_title: 'We take young people out into Europe. And bring Europe to Košice<span class="dot">.</span>',
    about_p: 'We are a civic association from eastern Slovakia. Through the Erasmus+ programme we create opportunities for young people, students and youth workers to take part in international exchanges and training.',
    stat_1: 'exchanges since 2025', stat_2: 'countries at one table', stat_3: 'is what it costs to take part',
    c1_t: 'Youth exchanges', c1_p: 'A week in an international team, for young people looking for experience beyond Slovakia.',
    c2_t: 'Training and workshops', c2_p: 'For teachers, youth workers and volunteers who want to build professional and personal skills.',
    c3_t: 'Something for the neighbourhood', c3_p: 'We clean up towns, perform for kindergarten children and give what we make to the local community.',
    proj_label: 'Projects', proj_title: 'Where we have been<span class="dot">.</span>',
    tag_demo: 'Democracy', tag_eco: 'Environment', tag_rights: 'Human rights', tag_next: 'Next call',
    p1_place: 'Orahovica, Croatia', p2_place: 'Rymanów, Poland', p3_place: 'Košice, Slovakia', p5_place: 'Stara Zagora, Bulgaria',
    next_t: 'Your exchange could be here.', next_p: 'No call is open at the moment. We announce new ones on Instagram.',
    join_label: 'How to join', join_title: 'Four steps to your first exchange<span class="dot">.</span>',
    s1_t: 'Pick a project', s1_p: 'Look through the open calls and the info pack with the programme, place and conditions.',
    s2_t: 'Fill in the form', s2_p: 'You only need to be 13 to 30. No proof of study or work is required.',
    s3_t: 'We get in touch', s3_p: "Once we have considered every application, we contact you. If you're still interested, you're in.",
    s4_t: 'Pack and go', s4_p: 'Accommodation and meals are covered by an EU grant. Travel is reimbursed after the project.',
    faq_label: 'Questions', faq_title: 'What you ask most often<span class="dot">.</span>',
    q1: 'Is this a scam?',
    a1: 'No. Every project is funded by Erasmus+ under the supervision of the European Commission. The list of approved projects is on the',
    a1_link: "European Commission's website",
    q2: 'How much does it cost?',
    a2: 'Nothing. Accommodation and meals on site are covered by a European Union grant. Travel is reimbursed up to a set amount, depending on distance, usually within a month of the project ending.',
    q3: 'Do I have to be a student?',
    a3: 'No. For a youth exchange you only need to be 13 to 30; a team leader can be older. For a training course you need to be 18 or over.',
    q4: "My English isn't good. Is that a problem?",
    a4: 'Not at all. You travel in a national team, so there are always Slovaks beside you to help you translate and speak up.',
    q5: 'Where do I find the details of a project?',
    a5: "In its info pack. You'll find it on each project's page.",
    cta_label: 'Contact', cta_title: 'Aged 13 to 30? The next exchange could be yours<span class="dot">.</span>',
    docs: 'Documents', other: 'First version of the site'
  };

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nodes = document.querySelectorAll('[data-i18n]');
  var sk = {};
  nodes.forEach(function (el) { sk[el.getAttribute('data-i18n')] = el.innerHTML; });

  function apply(lang) {
    var dict = lang === 'en' ? en : sk;
    document.documentElement.lang = lang;
    nodes.forEach(function (el) {
      var text = dict[el.getAttribute('data-i18n')];
      if (text != null) el.innerHTML = text;
    });
    document.querySelectorAll('.lang button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    });
    try { localStorage.setItem('lang', lang); } catch (e) {}
  }
  document.querySelectorAll('.lang button').forEach(function (b) {
    b.addEventListener('click', function () {
      var lang = b.dataset.lang;
      if (lang === document.documentElement.lang) return;
      if (reduced) { apply(lang); return; }
      document.body.classList.add('is-swapping');
      setTimeout(function () { apply(lang); document.body.classList.remove('is-swapping'); }, 300);
    });
  });
  try { if (localStorage.getItem('lang') === 'en') apply('en'); } catch (e) {}

  // Phone menu.
  var btn = document.querySelector('.menu-btn'), nav = document.getElementById('nav');
  btn.addEventListener('click', function () {
    btn.setAttribute('aria-expanded', String(nav.classList.toggle('is-open')));
  });
  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { nav.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }
  });

  // Fade cards in as they enter the screen.
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    reveals.forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }
})();
