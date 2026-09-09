/* Boucle de jeu : temps réel, rattrapage hors ligne, sauvegarde automatique. */
window.G = window.G || {};

G.loop = (function () {
  'use strict';
  var u = G.util;

  var TICK_MS = 200;
  var MAX_OFFLINE = 8 * 3600;        // 8 heures de rattrapage maximum
  var timer = null;
  var last = 0;
  var lastDay = 0;

  function onNewDays(n) {
    /* Revalorisation des collections + repos des effectifs. */
    for (var i = 0; i < Math.min(n, 60); i++) G.collections.onNewDay();
    var clubs = G.state.manager.clubs;
    for (var sid in clubs) {
      for (var d = 0; d < Math.min(n, 30); d++) G.manager.restDay(clubs[sid]);
    }
  }

  function tick() {
    var now = Date.now();
    var dt = (now - last) / 1000;
    last = now;
    if (dt <= 0) return;
    if (dt > 5) dt = 5;               // onglet en arrière-plan : on lisse

    G.state.playTime += dt;
    G.business.tick(dt);
    G.market.tick(dt);

    if (G.state.market.day !== lastDay) {
      onNewDays(G.state.market.day - lastDay);
      lastDay = G.state.market.day;
    }

    if (G.ui) G.ui.onTick(dt);
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

    G.business.tick(capped, true);
    G.market.tick(capped);

    var days = s.market.day - dayBefore;
    if (days > 0) onNewDays(days);
    lastDay = s.market.day;

    return {
      seconds: elapsed, capped: capped,
      earned: s.money - before,
      pending: G.business.readyTotal(),
      days: days
    };
  }

  function start() {
    last = Date.now();
    lastDay = G.state.market.day;
    if (timer) clearInterval(timer);
    timer = setInterval(tick, TICK_MS);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        G.save.write();
      } else {
        last = Date.now();
      }
    });
    window.addEventListener('beforeunload', function () { G.save.write(); });
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return {
    start: start, stop: stop, tick: tick,
    offlineProgress: offlineProgress, MAX_OFFLINE: MAX_OFFLINE
  };
})();
