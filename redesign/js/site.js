// Language switch, scroll reveals, the changing light in the "eight days" section, project previews.
(function () {
  // Slovak is the text in the HTML. Only English lives here.
  var en = {
    skip: 'Skip to content',
    nav_about: 'About', nav_week: 'The exchange', nav_calls: 'Projects', nav_faq: 'Questions', nav_contact: 'Contact',
    kicker: 'Mladá vlna · civic association · Erasmus+',
    line_a: 'Somebody threw this away.', line_b: 'Young people built a city out of it.', scroll: 'Scroll down',
    tag: 'Let the wave carry you.', skip_intro: 'Skip', replay: 'Play the wave again',
    tag_w: 'The wave that cleans up after itself.',
    lead: 'Youth exchanges across Europe. Free, for anyone aged 13 to 30.',
    cta_calls: 'Projects and calls', cta_how: 'What an exchange is like',
    place: 'Košice · Prešov · Europe',
    about_label: 'About us',
    about_statement: 'We are a civic association from eastern Slovakia. We take young people out into Europe, and bring Europe to <em>Košice.</em>',
    about_p1: 'Through the Erasmus+ programme we create opportunities for young people, students, youth workers and the wider public to take part in international projects, exchanges and training.',
    about_p2: 'We believe in the power of education and intercultural cooperation. You come home from an exchange with better English, new skills and friends across Europe.',
    week_label: 'The exchange',
    week_title: 'Eight days, day by <em>day.</em>',
    week_intro: 'An exchange lasts eight or nine days. Each one is different, but this is how it usually goes.',
    d1_t: 'Arrival', d1_p: "You arrive with your national team. You don't know the people from the other countries yet.",
    d2_t: 'The ice breaks', d2_p: 'Name games and team challenges. By the evening you know the names, and English comes more easily than you expected.',
    d3_t: 'Out among people', d3_p: "The programme doesn't stay in one room. On ReToy and The Masters of Puppets we cleaned up the surroundings and made things from the waste we collected.",
    d4_t: 'You make something', d4_p: "Puppets, a model city, a campaign or a simulation. In an international team, something appears that didn't exist that morning.",
    d5_t: 'Intercultural night', d5_p: 'Every country brings its food, music and dances. These are the evenings participants remember longest.',
    d6_t: 'New tools', d6_p: "3D printing, artificial intelligence, fact-checking. You try things you wouldn't normally get your hands on.",
    d7_t: 'For the people around', d7_p: "The result doesn't end up in a drawer. We performed a puppet show for kindergarten children and gave away toys and the model city.",
    d8_t: 'Goodbye', d8_p: 'Leaving is harder than you expected. You go home with friends from across Europe and the courage to speak up.',
    proj_label: 'Projects',
    proj_title: 'Where the wave has <em>taken us.</em>',
    proj_open: 'No call is open at the moment. Follow our',
    p1_place: 'Orahovica, Croatia', p2_place: 'Rymanów, Poland', p3_place: 'Košice, Slovakia', p4_place: 'Košice, Slovakia', p5_place: 'Stara Zagora, Bulgaria',
    faq_label: 'Questions',
    faq_title: 'What people ask <em>most often.</em>',
    q1: 'Is this a scam?',
    a1: 'No. Every project is funded by Erasmus+ under the supervision of the European Commission. The list of approved projects is on the',
    a1_link: "European Commission's website",
    q2: 'How much does it cost?',
    a2: 'Nothing. Accommodation and meals on site are covered by a European Union grant. Travel is reimbursed up to a set amount, depending on distance, usually within a month of the project ending.',
    q3: 'Do I have to be a student?',
    a3: 'No. For a youth exchange you only need to be 13 to 30 years old; a team leader can be older. For a training course you need to be 18 or over. No proof of study or employment is needed.',
    q4: "My English isn't good. Is that a problem?",
    a4: 'Not at all. You travel in a national team, so there are always Slovaks beside you to help you translate and speak up. And your English gets practice.',
    q5: 'How do I apply?',
    a5: "You fill in the application form for the project you're interested in. Once we have considered all candidates, we get in touch.",
    q6: 'Where do I find the details of a project?',
    a6: "In its info pack. You'll find it on each project's page.",
    country: 'Slovak Republic', docs: 'Documents'
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
      setTimeout(function () { apply(lang); document.body.classList.remove('is-swapping'); }, 500);
    });
  });
  try { if (localStorage.getItem('lang') === 'en') apply('en'); } catch (e) {}

  // Fade sections in as they enter the screen.
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.18 });
    reveals.forEach(function (el) { io.observe(el); });

    // The background light changes as the days go by.
    var week = document.querySelector('.week');
    var tone = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) week.style.setProperty('--tone', e.target.dataset.tone);
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    document.querySelectorAll('.day').forEach(function (d) { tone.observe(d); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  // A photo of the project appears beside the list on hover.
  var preview = document.querySelector('.plist__preview');
  document.querySelectorAll('.plist a').forEach(function (a) {
    function show() { preview.src = a.dataset.img; preview.classList.add('is-on'); }
    function hide() { preview.classList.remove('is-on'); }
    a.addEventListener('pointerenter', show);
    a.addEventListener('focus', show);
    a.addEventListener('pointerleave', hide);
    a.addEventListener('blur', hide);
  });
})();
