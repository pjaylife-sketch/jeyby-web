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

  /* Tlačítko „Chci tento balíček“ předvyplní balíček ve formuláři */
  var chosenPackage = '';
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a || !/Chci tento balíček|Chci být hlavní partner/.test(a.textContent)) return;
    var card = a.parentElement, nameEl = card && card.querySelector('div[style*="Anton"]');
    chosenPackage = nameEl ? nameEl.textContent.trim().replace(/\s+/g, ' ') : '';
    var pkg = document.getElementById('m-f-pkg');
    if (pkg && a.closest('.m-root')) {
      [].forEach.call(pkg.options, function (o) { if (o.text.toLowerCase() === chosenPackage.toLowerCase()) pkg.value = o.text; });
    }
  });

  /* Poptávkový formulář → Cloudflare Worker → Google Tabulka + e-maily přes Resend.
     Dokud není BOOKING_ENDPOINT vyplněný, formulář otevře e-mail jako dřív. */
  var BOOKING_ENDPOINT = window.JEYBY_BOOKING_ENDPOINT || '';

  function val(f, id) { var el = f.querySelector('#' + id) || f.querySelector('#m-' + id); return el ? (el.value || '').trim() : ''; }
  function setSent(f, text) {
    f.querySelectorAll('[data-if="notSent"]').forEach(function (el) { el.classList.add('off'); });
    f.querySelectorAll('[data-if="sent"]').forEach(function (el) {
      el.classList.remove('off');
      var box = el.querySelector('[role="status"]'); if (box && text) box.textContent = text;
    });
  }

  document.querySelectorAll('form[data-form]').forEach(function (f) {
    var hp = document.createElement('input');                 // skryté pole proti botům
    hp.type = 'text'; hp.name = 'web'; hp.tabIndex = -1; hp.autocomplete = 'off';
    hp.setAttribute('aria-hidden', 'true'); hp.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
    f.appendChild(hp);

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var mobile = !!f.closest('.m-root');
      var d = {
        jmeno: val(f, 'f-name'), firma: val(f, 'f-org'), email: val(f, 'f-mail'), telefon: val(f, 'f-tel'),
        typ: val(f, 'f-type'), balicek: val(f, 'f-pkg'), datum: val(f, 'f-date'), misto: val(f, 'f-place'),
        pocet: val(f, 'f-guests'), zprava: val(f, 'f-msg'), zdroj: (mobile ? 'web – mobil' : 'web – desktop'), web: hp.value
      };
      if (!d.balicek || d.balicek === 'Zatím nevím') d.balicek = chosenPackage || (/^VIP na míru/.test(d.zprava) ? 'VIP na míru' : d.balicek);
      var mailEl = f.querySelector('input[type="email"]');
      if (!d.jmeno) {
        var n = f.querySelector('input[autocomplete="name"], input[id$="f-name"]');
        if (n) { n.focus(); n.setCustomValidity('Vyplňte prosím jméno.'); n.reportValidity(); n.setCustomValidity(''); }
        return;
      }
      if (!d.email && !d.telefon) {
        if (mailEl) { mailEl.focus(); mailEl.setCustomValidity('Vyplňte prosím e-mail nebo telefon.'); mailEl.reportValidity(); mailEl.setCustomValidity(''); }
        return;
      }
      if (d.email && mailEl && !mailEl.checkValidity()) { mailEl.reportValidity(); return; }

      function mailtoFallback() {
        var lines = [['Jméno', d.jmeno], ['Firma / pořadatel', d.firma], ['E-mail', d.email], ['Telefon', d.telefon], ['Typ akce', d.typ],
          ['Balíček', d.balicek], ['Datum akce', d.datum], ['Místo konání', d.misto], ['Počet hostů', d.pocet], ['Zpráva', d.zprava]]
          .filter(function (x) { return x[1]; }).map(function (x) { return x[0] + ': ' + x[1]; });
        var subject = 'Poptávka vystoupení' + (d.typ ? ' – ' + d.typ : '') + (d.datum ? ' – ' + d.datum : '');
        window.location.href = 'mailto:' + BOOKING_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
        setSent(f, 'Otevřeli jsme vám e-mail s poptávkou – stačí ho odeslat.');
      }
      if (!BOOKING_ENDPOINT) { mailtoFallback(); return; }

      var btn = f.querySelector('button[type="submit"]'), label = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.style.opacity = '0.7'; btn.textContent = 'Odesílám…'; }
      fetch(BOOKING_ENDPOINT, { method: 'POST', body: new URLSearchParams(d), headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (!res || !res.success) throw new Error(res && res.error);
          setSent(f, 'Díky! Poptávku máme' + (d.email ? ' a potvrzení jsme vám poslali na e-mail.' : '. Brzy se vám ozveme.'));
        })
        .catch(function () {
          if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.innerHTML = label; }
          mailtoFallback();
        });
    });
  });
})();
