/* Empire d'entreprises : achat, montée en niveau, directeurs, revenus. */
window.G = window.G || {};

G.business = (function () {
  'use strict';
  var u = G.util;

  function def(id) {
    for (var i = 0; i < G.DATA.businesses.length; i++) {
      if (G.DATA.businesses[i].id === id) return G.DATA.businesses[i];
    }
    return null;
  }

  function owned(id) { return G.state.biz.owned[id] || null; }

  /* --------------------------------------------------------- économie --- */

  /** Prix du prochain niveau. */
  function levelCost(b, lvl) {
    return b.cost * Math.pow(b.growth, lvl);
  }

  /** Prix de `n` niveaux à partir du niveau courant. */
  function bulkCost(b, lvl, n) {
    var r = b.growth;
    return b.cost * Math.pow(r, lvl) * (Math.pow(r, n) - 1) / (r - 1);
  }

  /** Nombre de niveaux achetables avec la trésorerie disponible. */
  function maxAffordable(b, lvl, cash) {
    var r = b.growth;
    var base = b.cost * Math.pow(r, lvl);
    if (cash < base) return 0;
    var n = Math.floor(Math.log(cash * (r - 1) / base + 1) / Math.log(r));
    return Math.max(0, n);
  }

  /** Multiplicateur issu des paliers de niveau (x2 à chaque palier franchi). */
  function milestoneMult(lvl) {
    var m = 1;
    for (var i = 0; i < G.DATA.businessMilestones.length; i++) {
      if (lvl >= G.DATA.businessMilestones[i]) m *= 2;
    }
    return m;
  }

  /** Prochain palier et niveaux restants. */
  function nextMilestone(lvl) {
    for (var i = 0; i < G.DATA.businessMilestones.length; i++) {
      if (lvl < G.DATA.businessMilestones[i]) {
        return { at: G.DATA.businessMilestones[i], left: G.DATA.businessMilestones[i] - lvl };
      }
    }
    return null;
  }

  /** Multiplicateur global : collections, lois, conjoncture nationale. */
  function globalMult() {
    var m = 1 + G.eco.bonus('biz');
    if (G.country && G.country.bizMultiplier) m *= G.country.bizMultiplier();
    return Math.max(0.1, m);
  }

  /** Revenu d'un cycle complet pour une entreprise possédée. */
  function cycleRevenue(b, o) {
    if (!o || o.lvl <= 0) return 0;
    return b.rev * o.lvl * milestoneMult(o.lvl) * globalMult();
  }

  function revenuePerSec(b, o) {
    return cycleRevenue(b, o) / b.cycle;
  }

  /** Revenu passif total (seulement les entreprises dirigées). */
  function incomePerSec() {
    var s = G.state, total = 0;
    for (var i = 0; i < G.DATA.businesses.length; i++) {
      var b = G.DATA.businesses[i];
      var o = s.biz.owned[b.id];
      if (o && o.mgr) total += revenuePerSec(b, o);
    }
    return total;
  }

  /** Revenu maximal théorique (tout encaissé à la main sans temps mort). */
  function potentialPerSec() {
    var s = G.state, total = 0;
    for (var i = 0; i < G.DATA.businesses.length; i++) {
      var b = G.DATA.businesses[i];
      var o = s.biz.owned[b.id];
      if (o) total += revenuePerSec(b, o);
    }
    return total;
  }

  /* Sans directeur, on peut stocker jusqu'à 4 cycles avant saturation. */
  var MAX_STORED_CYCLES = 4;

  /* ------------------------------------------------------------ tick ---- */

  /**
   * Fait tourner les entreprises pendant `dt` secondes.
   * @param {boolean} offline true pour un rattrapage hors ligne (pas de toasts)
   */
  function tick(dt, offline) {
    var s = G.state, gained = 0;
    for (var i = 0; i < G.DATA.businesses.length; i++) {
      var b = G.DATA.businesses[i];
      var o = s.biz.owned[b.id];
      if (!o || o.lvl <= 0) continue;

      o.prog += dt;
      if (o.prog < b.cycle) continue;

      var cycles = Math.floor(o.prog / b.cycle);
      o.prog -= cycles * b.cycle;
      var amount = cycles * cycleRevenue(b, o);

      if (o.mgr) {
        gained += amount;
      } else {
        var cap = MAX_STORED_CYCLES * cycleRevenue(b, o);
        o.ready = Math.min(cap, (o.ready || 0) + amount);
      }
    }
    if (gained > 0) {
      G.eco.earn(gained, 'business', null, true);
      s.biz.totalCollected += gained;
    }
    return gained;
  }

  /* --------------------------------------------------------- actions ---- */

  /** Encaisse la caisse en attente d'une entreprise sans directeur. */
  function collect(id) {
    var s = G.state, o = s.biz.owned[id];
    if (!o || !o.ready || o.ready <= 0) return 0;
    var amount = o.ready;
    o.ready = 0;
    s.stats.clicks++;
    s.biz.totalCollected += amount;
    G.eco.earn(amount, 'business', def(id).name, true);
    return amount;
  }

  /** Encaisse toutes les caisses disponibles d'un coup. */
  function collectAll() {
    var s = G.state, total = 0;
    for (var id in s.biz.owned) {
      var o = s.biz.owned[id];
      if (o.ready > 0) { total += o.ready; o.ready = 0; }
    }
    if (total > 0) {
      s.biz.totalCollected += total;
      G.eco.earn(total, 'business', 'Encaissement général', true);
    }
    return total;
  }

  function readyTotal() {
    var total = 0;
    for (var id in G.state.biz.owned) total += G.state.biz.owned[id].ready || 0;
    return total;
  }

  /** Achète `n` niveaux (le premier niveau vaut acquisition de l'entreprise). */
  function buy(id, n) {
    var b = def(id);
    if (!b) return false;
    var s = G.state;
    var o = s.biz.owned[id];
    var lvl = o ? o.lvl : 0;
    n = Math.max(1, Math.floor(n || 1));

    var cost = bulkCost(b, lvl, n);
    if (!G.eco.spend(cost, 'business', b.name + ' ×' + n, true)) return false;

    if (!o) {
      o = s.biz.owned[id] = { lvl: 0, mgr: false, prog: 0, ready: 0 };
    }
    var before = o.lvl;
    o.lvl += n;

    var ms = nextMilestone(before);
    if (ms && o.lvl >= ms.at && G.ui) {
      G.ui.toast('⭐ Palier atteint !', b.name + ' niveau ' + ms.at + ' : rendement doublé', 'good');
    }
    return true;
  }

  /** Recrute un directeur : les encaissements deviennent automatiques. */
  function hireManager(id) {
    var b = def(id), o = owned(id);
    if (!b || !o || o.mgr) return false;
    if (!G.eco.spend(b.managerCost, 'business', 'Directeur · ' + b.name)) return false;
    o.mgr = true;
    if (o.ready > 0) collect(id);
    return true;
  }

  /** Entreprises débloquées : la suivante apparaît dès qu'on possède la précédente. */
  function isVisible(b, index) {
    var s = G.state;
    if (s.biz.owned[b.id]) return true;
    if (index === 0) return true;
    var prev = G.DATA.businesses[index - 1];
    if (s.biz.owned[prev.id]) return true;
    /* Ou si on peut déjà se l'offrir à 40 % près (pour les gros retours). */
    return s.money >= b.cost * 0.4;
  }

  return {
    def: def, owned: owned,
    levelCost: levelCost, bulkCost: bulkCost, maxAffordable: maxAffordable,
    milestoneMult: milestoneMult, nextMilestone: nextMilestone,
    cycleRevenue: cycleRevenue, revenuePerSec: revenuePerSec,
    incomePerSec: incomePerSec, potentialPerSec: potentialPerSec,
    globalMult: globalMult, MAX_STORED_CYCLES: MAX_STORED_CYCLES,
    tick: tick, collect: collect, collectAll: collectAll, readyTotal: readyTotal,
    buy: buy, hireManager: hireManager, isVisible: isVisible
  };
})();
