/* Boucle de jeu : temps réel, rattrapage hors ligne, sauvegarde automatique. */
window.G = window.G || {};

G.loop = (function () {
  'use strict';
  var u = G.util;

  var TICK_MS = 200;
  var MAX_OFFLINE = 8 * 3600;        // 8 heures de rattrapage maximum
  var AD_INTERVAL = 5 * 60;          // une publicité toutes les 5 minutes de connexion
  var timer = null;
  var last = 0;
  var lastDay = 0;
  var sinceAd = 0;

  /** Tout ce qui se passe au changement de séance. */
  function onNewDays(n) {
    var steps = Math.min(n, 90);
    for (var i = 0; i < steps; i++) {
      G.collections.onNewDay();
      G.realestate.onNewDay();
      G.crypto.onNewDay();
    }
    G.realestate.recordHistory();

    var clubs = G.state.manager.clubs;
    for (var c = 0; c < clubs.length; c++) {
      for (var d = 0; d < Math.min(n, 30); d++) G.manager.restDay(clubs[c]);
    }
  }

  /** Versement des revenus passifs (entreprises + loyers), toutes les minutes. */
  function payroll(dt, silent) {
    G.tax.tick(dt, silent);
    var biz = G.business.tick(dt, true);
    var rent = G.realestate.tick(dt);
    var total = biz + rent;
    if (total > 0 && !silent && G.ui && G.ui.toast) {
      var detail = rent > 0
        ? u.fmtMoney(biz) + ' d\'entreprises · ' + u.fmtMoney(rent) + ' de loyers'
        : 'Salaires des entreprises';
      G.ui.toast('💼 +' + u.fmtMoney(total), detail, 'good');
    }
    return total;
  }

  function tick() {
    var now = Date.now();
    var dt = (now - last) / 1000;
    last = now;
    if (dt <= 0) return;
    if (dt > 5) dt = 5;               // onglet en arrière-plan : on lisse

    G.state.playTime += dt;
    payroll(dt, false);
    G.market.tick(dt);

    if (G.state.market.day !== lastDay) {
      onNewDays(G.state.market.day - lastDay);
      lastDay = G.state.market.day;
    }

    if (G.ui) G.ui.onTick(dt);

    /* Publicité périodique : réessayée au prochain tick si l'écran de jeu
       ou une modale l'empêche de s'afficher pour l'instant. */
    sinceAd += dt;
    if (sinceAd >= AD_INTERVAL) {
      if (G.ui && G.ui.showAd && G.ui.showAd()) sinceAd = 0;
    }

    G.save.autosave(8000);
  }

  /** Calcule ce qui s'est passé pendant l'absence du joueur. */
  function offlineProgress() {
    var s = G.state;
    var elapsed = (Date.now() - (s.lastSeen || Date.now())) / 1000;
    if (elapsed < 60) return null;
    var capped = Math.min(elapsed, MAX_OFFLINE);

    var before = s.money;
    var dayBefore = s.market.day;

    payroll(capped, true);
    G.market.tick(capped);

    var days = s.market.day - dayBefore;
    if (days > 0) onNewDays(days);
    lastDay = s.market.day;

    return {
      seconds: elapsed, capped: capped,
      earned: s.money - before,
      days: days
    };
  }

  function start() {
    last = Date.now();
    lastDay = G.state.market.day;
    sinceAd = 0;
    if (timer) clearInterval(timer);
    timer = setInterval(tick, TICK_MS);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) G.save.write();
      else last = Date.now();
    });
    window.addEventListener('beforeunload', function () { G.save.write(); });
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return {
    start: start, stop: stop, tick: tick, payroll: payroll,
    offlineProgress: offlineProgress, MAX_OFFLINE: MAX_OFFLINE
  };
})();
