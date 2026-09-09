/* Collections : objets de prestige qui prennent de la valeur et donnent des
 * bonus permanents à tout le reste du jeu. */
window.G = window.G || {};

G.collections = (function () {
  'use strict';
  var u = G.util;

  function def(id) {
    for (var i = 0; i < G.DATA.collectibles.length; i++) {
      if (G.DATA.collectibles[i].id === id) return G.DATA.collectibles[i];
    }
    return null;
  }

  function setDef(id) {
    for (var i = 0; i < G.DATA.collectionSets.length; i++) {
      if (G.DATA.collectionSets[i].id === id) return G.DATA.collectionSets[i];
    }
    return null;
  }

  function itemsOfSet(setId) {
    return G.DATA.collectibles.filter(function (c) { return c.set === setId; });
  }

  function ownedCount(setId) {
    var items = itemsOfSet(setId), n = 0;
    for (var i = 0; i < items.length; i++) {
      if (G.state.coll.owned[items[i].id]) n++;
    }
    return n;
  }

  /** Prix de marché courant (les objets déjà vendus prennent de la valeur). */
  function price(item) {
    var o = G.state.coll.owned[item.id];
    if (o) return o.value;
    /* Le prix d'acquisition dérive lentement avec l'ancienneté de la partie. */
    var days = G.state.market.day;
    return item.cost * (1 + item.appr * days * 0.6);
  }

  function buy(id) {
    var it = def(id);
    if (!it) return false;
    if (G.state.coll.owned[id]) return false;
    var p = price(it);
    if (!G.eco.spend(p, 'collection', 'Acquisition · ' + it.name)) return false;

    G.state.coll.owned[id] = { buy: p, value: p, day: G.state.market.day };
    checkSet(it.set);
    return true;
  }

  function sell(id) {
    var it = def(id), o = G.state.coll.owned[id];
    if (!it || !o) return false;
    var net = o.value * 0.94;    // commission de la maison de ventes
    delete G.state.coll.owned[id];
    if (G.state.coll.sets[it.set]) delete G.state.coll.sets[it.set];
    G.eco.earn(net, 'collection', 'Vente aux enchères · ' + it.name);
    return true;
  }

  function checkSet(setId) {
    var items = itemsOfSet(setId);
    if (ownedCount(setId) < items.length) return false;
    if (G.state.coll.sets[setId]) return true;
    G.state.coll.sets[setId] = true;
    var sd = setDef(setId);
    if (G.ui) {
      G.ui.toast('🏅 Collection complète !', sd.name + ' — bonus de série activé',
        'good');
    }
    return true;
  }

  /** Revalorisation quotidienne des objets possédés. */
  function onNewDay() {
    var s = G.state;
    for (var id in s.coll.owned) {
      var it = def(id);
      if (!it) continue;
      var o = s.coll.owned[id];
      /* Tendance de fond + bruit de marché de l'art. */
      var r = it.appr + u.gauss(0, it.appr * 1.8);
      o.value = Math.max(it.cost * 0.4, o.value * (1 + r));
    }
  }

  function totalValue() { return G.eco.collectionValue(); }

  function totalGain() {
    var s = G.state, g = 0;
    for (var id in s.coll.owned) g += s.coll.owned[id].value - s.coll.owned[id].buy;
    return g;
  }

  /** Liste des bonus actifs, pour l'affichage. */
  function activeBonuses() {
    var out = {};
    var types = ['biz', 'sponsor', 'luck', 'market', 'wage', 'pop'];
    for (var i = 0; i < types.length; i++) {
      var v = G.eco.bonus(types[i]);
      if (Math.abs(v) > 0.0001) out[types[i]] = v;
    }
    return out;
  }

  return {
    def: def, setDef: setDef, itemsOfSet: itemsOfSet, ownedCount: ownedCount,
    price: price, buy: buy, sell: sell, onNewDay: onNewDay,
    totalValue: totalValue, totalGain: totalGain, activeBonuses: activeBonuses
  };
})();
