// Contact page: the "copy address" button. It shows "Copied" for a moment; where the clipboard is not
// available (some in-app browsers), it selects the address so it can be copied by hand.
(function () {
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    var timer = null;
    function done() {
      btn.classList.add('is-copied');
      clearTimeout(timer);
      timer = setTimeout(function () { btn.classList.remove('is-copied'); }, 2200);
    }
    function selectByHand() {
      var mail = document.querySelector('.mail');
      if (!mail || !window.getSelection) return;
      var range = document.createRange();
      range.selectNodeContents(mail);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      try { if (document.execCommand('copy')) done(); } catch (e) {}
    }
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, selectByHand);
      } else {
        selectByHand();
      }
    });
  });
})();
