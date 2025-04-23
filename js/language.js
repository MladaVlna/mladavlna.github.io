/*
Language change
*/
function loadLanguage(lang) {
    fetch(`language/${lang}.json`)
      .then(res => res.json())
      .then(translations => {
        document.querySelectorAll('[data-i18n]').forEach(elem => {
          const key = elem.getAttribute('data-i18n');
          elem.textContent = translations[key] || key;
        });
        localStorage.setItem('lang', lang);
      });
  }

  // Load saved language or default to Slovak
  const savedLang = localStorage.getItem('lang') || 'sk';
  loadLanguage(savedLang);

  // Language switcher event listeners
  document.getElementById('flag-sk').addEventListener('click', (e) => {
    e.preventDefault();
    loadLanguage('sk');
  });

  document.getElementById('flag-en').addEventListener('click', (e) => {
    e.preventDefault();
    loadLanguage('en');
  });