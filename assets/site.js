/* JeyBy – interakce webu (videa, menu, VIP balíček, poptávkový formulář) */
(function () {
  var BOOKING_EMAIL = 'jeyby.booking@gmail.com';

  /* Desktop layout je navržený na 1440 px – na menších obrazovkách (821–1439 px) ho úměrně zmenšíme */
  function fit() {
    var w = window.innerWidth;
    document.querySelectorAll('.jb-root').forEach(function (r) {
      r.style.zoom = (w > 820 && w < 1440) ? (w / 1440).toFixed(4) : '';
    });
  }
  fit();
  window.addEventListener('resize', fit);

  /* Videa: přehrávají se ztlumeně, jen když jsou vidět */
  var vids = [].slice.call(document.querySelectorAll('video'));
  function play(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  vids.forEach(function (v) { v.muted = true; });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting && v.offsetParent !== null) { v.preload = 'auto'; play(v); } else { v.pause(); }
      });
    }, { threshold: 0.25 });
    vids.forEach(function (v) { io.observe(v); });
  } else {
    vids.forEach(function (v) { if (v.offsetParent !== null) play(v); });
  }

  function setMenu(header, open) {
    if (!header) return;
    header.querySelectorAll('[data-if="menuOpen"]').forEach(function (el) { el.classList.toggle('off', !open); });
    header.querySelectorAll('[data-if="menuClosed"]').forEach(function (el) { el.classList.toggle('off', open); });
    var b = header.querySelector('[data-toggle-menu]');
    if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function vipCard(el) {
    var c = el.parentElement;
    while (c && !c.querySelector('[data-vip-send]')) c = c.parentElement;
    return c;
  }
  function setChip(chip, on) {
    chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    chip.setAttribute('style', chip.getAttribute(on ? 'data-on-style' : 'data-off-style'));
  }
  function pickChip(chip) {
    var card = vipCard(chip), key = chip.getAttribute('data-key');
    if (key === 'extras') {
      setChip(chip, chip.getAttribute('aria-pressed') !== 'true');
    } else {
      card.querySelectorAll('.vip-chip[data-key="' + key + '"]').forEach(function (c) { setChip(c, c === chip); });
      if (key === 'len') { var l = card.querySelector('[data-vip-len]'); if (l) l.textContent = chip.getAttribute('data-val'); }
    }
  }
  function picked(card, key) {
    return [].slice.call(card.querySelectorAll('.vip-chip[data-key="' + key + '"][aria-pressed="true"]'))
      .map(function (c) { return c.getAttribute('data-val'); });
  }
  function vipSend(a) {
    var card = vipCard(a);
    var ex = picked(card, 'extras');
    var msg = 'VIP na míru – délka: ' + picked(card, 'len')[0] + ', tanečníci: ' + picked(card, 'dancers')[0] +
      ', moderace: ' + picked(card, 'mod')[0].toLowerCase() + (ex.length ? ', extra: ' + ex.join(', ') : '') + '.';
    var mobile = !!a.closest('.m-root');
    var t = document.getElementById(mobile ? 'm-f-msg' : 'f-msg');
    if (t) t.value = msg;
    var p = document.getElementById('m-f-pkg');
    if (mobile && p) p.value = 'VIP na míru';
  }

  document.addEventListener('click', function (e) {
    var v = e.target.closest('video[data-sound]');
    if (v) {
      var turnOn = v.muted;
      vids.forEach(function (o) { o.muted = true; o.parentElement.classList.remove('sound'); });
      if (turnOn) { v.muted = false; v.parentElement.classList.add('sound'); play(v); }
      return;
    }
    var t = e.target.closest('[data-toggle-menu]');
    if (t) { setMenu(t.closest('header'), t.getAttribute('aria-expanded') !== 'true'); return; }
    var c = e.target.closest('[data-close-menu]');
    if (c) setMenu(c.closest('header'), false);
    var chip = e.target.closest('.vip-chip');
    if (chip) { pickChip(chip); return; }
    var send = e.target.closest('[data-vip-send]');
    if (send) vipSend(send);
  });

  /* Poptávkový formulář – otevře e-mail s vyplněnými údaji */
  document.querySelectorAll('form[data-form]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var lines = [], typ = '', datum = '', mail = '', tel = '';
      f.querySelectorAll('input, select, textarea').forEach(function (el) {
        var lab = f.querySelector('label[for="' + el.id + '"]');
        var name = lab ? lab.textContent.trim() : el.id;
        var val = (el.value || '').trim();
        if (/typ akce/i.test(name)) typ = val;
        if (/datum/i.test(name)) datum = val;
        if (el.type === 'email') mail = val;
        if (el.type === 'tel') tel = val;
        if (val) lines.push(name + ': ' + val);
      });
      if (!mail && !tel) {
        var m = f.querySelector('input[type="email"]');
        if (m) { m.focus(); m.setCustomValidity('Vyplňte prosím e-mail nebo telefon.'); m.reportValidity(); m.setCustomValidity(''); }
        return;
      }
      var subject = 'Poptávka vystoupení' + (typ ? ' – ' + typ : '') + (datum ? ' – ' + datum : '');
      window.location.href = 'mailto:' + BOOKING_EMAIL + '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(lines.join('\n'));
      f.querySelectorAll('[data-if="notSent"]').forEach(function (el) { el.classList.add('off'); });
      f.querySelectorAll('[data-if="sent"]').forEach(function (el) { el.classList.remove('off'); });
    });
  });
})();
