/* Écran de jeu plein format : canvas et boutons d'action.
 *
 * Pour les sports collectifs (G.action), c'est une simple animation à
 * regarder, sans aucune commande — le mode « Diriger depuis le banc » y
 * mène. Pour les Grands Prix (G.drive), le joystick et les boutons restent
 * actifs : on pilote soi-même la voiture. À la fin, le résultat est transmis
 * au championnat et le bilan financier propose de replacer les gains en Bourse.
 */
window.G = window.G || {};

G.play = (function () {
  'use strict';
  var u = G.util, ui = G.ui;

  var el = {};
  var raf = null;
  var last = 0;
  var mode = null;         // 'match' | 'race'
  var M = null;            // état courant
  var joy = { active: false, id: null, cx: 0, cy: 0, dx: 0, dy: 0 };
  var shootHold = 0;

  function q(id) { return document.getElementById(id); }

  function ensureDom() {
    if (el.root) return;
    el.root = q('play');
    el.canvas = q('play-canvas');
    el.ctx = el.canvas.getContext('2d');
    el.top = q('play-top');
    el.feed = q('play-feed');
    el.pad = q('play-pad');
    el.knob = q('play-knob');
    el.btns = q('play-btns');
    el.end = q('play-end');
    bindInput();
  }

  /* =========================================================== ENTRÉES === */

  function bindInput() {
    var surface = el.root;

    surface.addEventListener('pointerdown', function (ev) {
      /* Ni pendant l'écran de fin, ni sur les boutons : sinon le joystick
         capture le pointeur et les boutons deviennent inutilisables. Le mode
         « match » n'a pas de joystick : on ne fait qu'y regarder. */
      if (!M || M.done || mode !== 'race') return;
      if (ev.target.closest('#play-btns') || ev.target.closest('#play-end') ||
        ev.target.closest('.play-ui')) return;
      var rect = surface.getBoundingClientRect();
      /* Le joystick apparaît là où le pouce se pose, dans la moitié gauche. */
      if (ev.clientX - rect.left > rect.width * 0.55) return;
      joy.active = true;
      joy.id = ev.pointerId;
      joy.cx = ev.clientX;
      joy.cy = ev.clientY;
      el.pad.style.display = 'block';
      el.pad.style.left = (ev.clientX - rect.left - 60) + 'px';
      el.pad.style.top = (ev.clientY - rect.top - 60) + 'px';
      moveKnob(0, 0);
      surface.setPointerCapture(ev.pointerId);
    });

    surface.addEventListener('pointermove', function (ev) {
      if (!joy.active || ev.pointerId !== joy.id) return;
      var dx = ev.clientX - joy.cx;
      var dy = ev.clientY - joy.cy;
      var len = Math.hypot(dx, dy);
      var max = 52;
      if (len > max) { dx = dx / len * max; dy = dy / len * max; len = max; }
      moveKnob(dx, dy);
      var nx = dx / max, ny = dy / max;
      joy.dx = nx;
      joy.dy = ny;
      applyInput();
    });

    function release(ev) {
      if (!joy.active || (ev && ev.pointerId !== joy.id)) return;
      joy.active = false;
      joy.dx = 0; joy.dy = 0;
      el.pad.style.display = 'none';
      applyInput();
    }
    surface.addEventListener('pointerup', release);
    surface.addEventListener('pointercancel', release);

    /* Clavier, pour jouer confortablement sur ordinateur. */
    var keys = {};
    function keyVec() {
      var dx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.q ? 1 : 0);
      var dy = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.z ? 1 : 0);
      var len = Math.hypot(dx, dy) || 1;
      joy.dx = dx / len * (dx || dy ? 1 : 0);
      joy.dy = dy / len * (dx || dy ? 1 : 0);
      applyInput();
    }
    document.addEventListener('keydown', function (ev) {
      if (!M || M.done || mode !== 'race') return;
      keys[ev.key] = true;
      if (ev.key === ' ') { primary(); ev.preventDefault(); }
      if (ev.key === 'Shift') secondary();
      keyVec();
    });
    document.addEventListener('keyup', function (ev) {
      keys[ev.key] = false;
      keyVec();
    });
  }

  function moveKnob(dx, dy) {
    el.knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  }

  /** Traduit le joystick vers le moteur concerné (course uniquement). */
  function applyInput() {
    if (!M || mode !== 'race') return;
    M.input.steer = joy.dx;
  }

  /* =========================================================== BOUTONS === */

  function primary() {
    if (!M || M.done || mode !== 'race') return;
    M.input.boost = true;
  }

  function secondary() {
    if (!M || M.done || mode !== 'race') return;
    G.drive.pit(M);
  }

  ui.act('pl.primary', function () { primary(); });
  ui.act('pl.secondary', function () { secondary(); });
  ui.act('pl.sprintOn', function () {
    if (!M || mode !== 'race') return;
    M.input.brake = true;
  });
  ui.act('pl.sprintOff', function () {
    if (!M || mode !== 'race') return;
    M.input.brake = false;
  });
  ui.act('pl.pause', function () {
    if (!M) return;
    M.paused = !M.paused;
    renderTop();
  });
  ui.act('pl.skip', function () {
    if (!M || M.done) return;
    if (mode === 'match') G.action.skipToEnd(M);
    else G.drive.skipToEnd(M);
    showEnd();
  });
  ui.act('pl.close', function () { close(); });
  ui.act('pl.info', function () {
    if (!M) return;
    var h = '<div class="match-info">';
    if (M.feed && M.feed.length) {
      h += '<div class="info-section">📋 Événements</div>';
      for (var i = Math.min(M.feed.length - 1, 9); i >= 0; i--) {
        h += '<div class="info-event">' + u.esc(M.feed[i].txt) + '</div>';
      }
    }
    if (M.subs && (M.subs.you.length || M.subs.opp.length)) {
      h += '<div class="info-section" style="margin-top:8px">🔄 Remplacements</div>';
      for (var j = 0; j < M.subs.you.length; j++) {
        h += '<div class="info-event">(' + M.subs.you[j].time + '\') ' + u.esc(M.subs.you[j].out) +
          ' → ' + u.esc(M.subs.you[j].in) + '</div>';
      }
    }
    h += '</div>';
    ui.modal('📊 Événements du match', h);
  });

  /* ============================================================= BOUCLE == */

  function resize() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = el.root.clientWidth, h = el.root.clientHeight;
    el.canvas.width = Math.round(w * dpr);
    el.canvas.height = Math.round(h * dpr);
    el.canvas.style.width = w + 'px';
    el.canvas.style.height = h + 'px';
    el.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function frame(ts) {
    if (!M) return;
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
    last = ts;

    if (mode === 'match') {
      G.action.update(M, dt);
      G.action.draw(M, el.ctx, el.canvas.clientWidth, el.canvas.clientHeight);
    } else {
      G.drive.update(M, dt);
      G.drive.draw(M, el.ctx, el.canvas.clientWidth, el.canvas.clientHeight);
      if (M.input.boost) M.input.boost = false;   // impulsion ponctuelle
    }

    renderTop();
    /* Pas de commentaires écrits pendant un match regardé : l'animation
       parle d'elle-même. Le détail des événements reste consultable via le
       bouton ℹ️. La course pilotée garde ses messages radio. */
    if (mode !== 'match') renderFeed();

    if (M.done) { showEnd(); return; }
    raf = requestAnimationFrame(frame);
  }

  function renderTop() {
    if (mode === 'match') {
      var mins = Math.floor(M.clock);
      var icon = (M.sport && M.sport.icon) ? M.sport.icon + ' ' : '';
      el.top.innerHTML =
        '<div class="pl-score"><span class="pl-team">' + u.esc(shortName(M.club.name)) +
        '</span><b>' + icon + M.score.you + ' - ' + M.score.opp + '</b><span class="pl-team">' +
        u.esc(shortName(M.oppName)) + '</span></div>' +
        '<div class="pl-sub">' + mins + "' / " + M.F.clock + "' · possession " +
        M.stats.poss + ' % · tirs ' + M.stats.youShots + '-' + M.stats.oppShots + '</div>';
    } else {
      var c = M.user;
      el.top.innerHTML =
        '<div class="pl-score"><span class="pl-team">P' + (c ? c.pos : '-') + '</span>' +
        '<b>' + Math.min(M.laps, (c ? c.lap : 0) + 1) + ' / ' + M.laps + '</b>' +
        '<span class="pl-team">' + Math.round(c ? c.v * 3 : 0) + ' km/h</span></div>' +
        '<div class="pl-sub">' + u.esc(M.circuit) + ' · gommes ' +
        Math.round(Math.max(0, 100 - (c ? c.wear : 0))) + ' %' +
        (M.rain ? ' · 🌧️ pluie' : '') + '</div>';
    }
  }

  function shortName(n) {
    return n.length > 16 ? n.slice(0, 15) + '…' : n;
  }

  function renderFeed() {
    var f = M.feed[0];
    if (!f) { el.feed.innerHTML = ''; return; }
    if (el.feed.dataset.k === f.txt) return;
    el.feed.dataset.k = f.txt;
    el.feed.className = 'play-feed ' + (f.type || '');
    el.feed.textContent = f.txt;
    /* Animation pour les événements importants. */
    if (f.type === 'goal') {
      el.feed.style.animation = 'none';
      setTimeout(function () {
        el.feed.style.animation = 'pulse 0.5s ease-in-out';
      }, 10);
    }
  }

  /* ============================================================== FIN ==== */

  function showEnd() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    var res = M.result || {};
    var inc = res.income || {};
    var win, title;

    if (mode === 'match') {
      win = M.score.you > M.score.opp;
      title = win ? '🎉 Victoire' : M.score.you === M.score.opp ? '🤝 Match nul' : '😞 Défaite';
      title += ' · ' + M.score.you + ' - ' + M.score.opp;
    } else {
      var c = M.user;
      win = c && c.pos <= 3;
      title = '🏁 Arrivée · P' + (c ? c.pos : '-');
    }

    var srcKey = 'manager:' + M.club.sport;
    var pend = G.state.pending[srcKey] || 0;

    var h = '<div class="play-card">' +
      '<div class="pc-title ' + (win ? 'good' : '') + '">' + title + '</div>' +
      '<div class="grid2" style="margin:10px 0">' +
      ui.stat('Recettes', u.fmtMoney(inc.total || 0), 'good') +
      ui.stat('Salaires', u.fmtMoney(res.wages || 0), 'bad') + '</div>' +
      '<div class="grid2">' +
      ui.stat('Solde', u.fmtSigned(res.net || 0), ui.signCls(res.net || 0)) +
      ui.stat('Trésorerie', u.fmtMoney(G.state.money)) + '</div>';

    if (mode === 'match') {
      h += '<div class="mute2" style="margin-top:8px">Possession ' + M.stats.poss +
        ' % · tirs ' + M.stats.youShots + ' - ' + M.stats.oppShots + '</div>';
    }
    h += '<div class="mute2" style="margin-top:4px">Billetterie ' +
      u.fmtMoney(inc.gate || 0) + ' · sponsors ' + u.fmtMoney(inc.sponsor || 0) +
      ' · primes ' + u.fmtMoney(inc.prize || 0) + '</div>';

    if (pend > 100) {
      h += '<button class="btn green full" style="margin-top:10px" data-act="pl.reinvest" ' +
        'data-src="' + srcKey + '">♻️ Replacer ' + u.fmtMoney(pend) + ' en Bourse</button>';
    }
    h += '<button class="btn primary full" style="margin-top:8px" data-act="pl.close">' +
      'Retour au club</button></div>';

    el.end.innerHTML = h;
    el.end.style.display = 'flex';
    el.btns.style.display = 'none';
    el.pad.style.display = 'none';
    /* Les commandes du haut n'ont plus lieu d'être une fois la rencontre finie. */
    var quit = document.querySelector('.play-quit');
    var skip = document.querySelector('.play-skip');
    if (quit) quit.style.display = 'none';
    if (skip) skip.style.display = 'none';
  }

  ui.act('pl.reinvest', function (d) {
    var src = d.src;
    close();
    ui.setTab('invest');
    var act = ui.actionOf('mk.reinvest');
    if (act) act({ src: src });
  });

  /* ============================================================ CYCLE ==== */

  /** Boutons de pilotage : uniquement pour la course, le match n'étant qu'à regarder. */
  function controlsHtml() {
    if (mode !== 'race') return '';
    return '<button class="pl-btn big" data-act="pl.primary">🚀 DRS</button>' +
      '<button class="pl-btn" data-act="pl.secondary">🔧 STAND</button>' +
      '<button class="pl-btn hold" data-act="pl.sprintOn">🛑 FREIN</button>';
  }

  function open(sportId) {
    ensureDom();
    el.root.classList.remove('hidden');
    el.end.style.display = 'none';
    var quit0 = document.querySelector('.play-quit');
    var skip0 = document.querySelector('.play-skip');
    if (quit0) quit0.style.display = '';
    if (skip0) skip0.style.display = '';
    el.btns.style.display = mode === 'race' ? 'flex' : 'none';
    el.btns.innerHTML = controlsHtml(sportId);
    el.pad.style.display = 'none';
    /* Pas de commentaires écrits pendant un match regardé (voir frame()) :
       on repart d'un bandeau vide, jamais du résidu d'une course précédente. */
    el.feed.textContent = '';
    el.feed.className = 'play-feed';
    el.feed.dataset.k = '';
    el.feed.style.display = mode === 'match' ? 'none' : '';
    document.body.classList.add('playing');
    resize();
    window.addEventListener('resize', resize);

    /* Le bouton maintenu (frein) doit se relâcher au doigt levé. */
    var hold = el.btns.querySelector('.hold');
    if (hold) {
      var off = function () { if (mode === 'race' && M) M.input.brake = false; };
      hold.addEventListener('pointerup', off);
      hold.addEventListener('pointerleave', off);
      hold.addEventListener('pointercancel', off);
    }
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  function close() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    /* Une rencontre quittée en cours de route est terminée par l'adjoint. */
    if (M && !M.done) {
      if (mode === 'match') G.action.skipToEnd(M);
      else G.drive.skipToEnd(M);
      if (G.ui) G.ui.toast('⏱️ Rencontre terminée', 'Votre adjoint a fini le travail');
    }
    M = null;
    mode = null;
    if (el.root) el.root.classList.add('hidden');
    document.body.classList.remove('playing');
    window.removeEventListener('resize', resize);
    if (G.ui) G.ui.refresh();
  }

  /* ------------------------------------------------------------ API ----- */

  /** Regarder l'animation du match en cours, sans y intervenir. */
  function watchMatch(club) {
    var m = G.action.create(club);
    if (!m) {
      ui.toast('📅 Saison terminée', 'Le calendrier est bouclé', 'bad');
      return false;
    }
    M = m;
    mode = 'match';
    open(club.sport);
    return true;
  }

  function startRace(club) {
    var r = G.drive.create(club, 3);
    if (!r) {
      ui.toast('📅 Saison terminée', 'Le calendrier est bouclé', 'bad');
      return false;
    }
    M = r;
    mode = 'race';
    open(club.sport);
    return true;
  }

  return { watchMatch: watchMatch, startRace: startRace, close: close };
})();
