/* Immobilier : achat de biens, loyers versés à la minute, plus-values.
 *
 * Chaque ville a son propre indice de marché : la valeur d'un bien suit
 * l'indice de sa ville, le loyer suit la valeur. Rénover augmente le loyer et
 * la valeur.
 */
window.G = window.G || {};

G.realestate = (function () {
  'use strict';
  var u = G.util;

  function typeDef(id) {
    for (var i = 0; i < G.DATA.propertyTypes.length; i++) {
      if (G.DATA.propertyTypes[i].id === id) return G.DATA.propertyTypes[i];
    }
    return null;
  }

  function cityDef(id) {
    for (var i = 0; i < G.DATA.cities.length; i++) {
      if (G.DATA.cities[i].id === id) return G.DATA.cities[i];
    }
    return null;
  }

  function owned() { return G.state.realestate.props; }

  function byUid(uid) {
    var l = owned();
    for (var i = 0; i < l.length; i++) if (l[i].uid === uid) return l[i];
    return null;
  }

  function cityIndex(cityId) {
    var idx = G.state.realestate.index[cityId];
    return idx === undefined ? 1 : idx;
  }

  /** Prix au catalogue d'un bien dans une ville donnée. */
  function askPrice(type, cityId) {
    var c = cityDef(cityId);
    return type.price * c.mult * cityIndex(cityId);
  }

  /** Loyer horaire d'un bien possédé. */
  function hourly(p) {
    var t = typeDef(p.type);
    if (!t) return 0;
    var renov = 1 + (p.lvl - 1) * 0.16;
    return p.value * t.yield * renov * (1 + G.eco.bonus('rent'));
  }

  function totalHourly() {
    var l = owned(), total = 0;
    for (var i = 0; i < l.length; i++) total += hourly(l[i]);
    return total;
  }

  function totalValue() {
    var l = owned(), total = 0;
    for (var i = 0; i < l.length; i++) total += l[i].value;
    return total;
  }

  function totalGain() {
    var l = owned(), g = 0;
    for (var i = 0; i < l.length; i++) g += l[i].value - l[i].paid;
    return g;
  }

  /* ------------------------------------------------------------ achat --- */

  function buy(typeId, cityId) {
    var t = typeDef(typeId);
    if (!t) return null;
    var price = askPrice(t, cityId);
    var c = cityDef(cityId);
    if (!G.eco.spend(price, 'immobilier', t.name + ' · ' + c.name)) return null;

    var p = {
      uid: u.uid('re'),
      type: typeId,
      city: cityId,
      paid: price,
      value: price,
      lvl: 1,
      bought: G.state.market.day
    };
    owned().push(p);
    return p;
  }

  function sell(uid) {
    var p = byUid(uid);
    if (!p) return false;
    var net = p.value * 0.955;          // frais d'agence et de notaire
    var l = owned();
    l.splice(l.indexOf(p), 1);
    G.eco.earn(net, 'immobilier', 'Vente · ' + typeDef(p.type).name);
    return true;
  }

  function renovateCost(p) {
    return p.value * 0.13 * Math.pow(1.14, p.lvl - 1);
  }

  function renovate(uid) {
    var p = byUid(uid);
    if (!p) return false;
    var t = typeDef(p.type);
    if (p.lvl >= t.maxLvl) return false;
    var cost = renovateCost(p);
    if (!G.eco.spend(cost, 'immobilier', 'Rénovation · ' + t.name)) return false;
    p.lvl++;
    p.paid += cost;
    p.value += cost * 0.75;             // les travaux se retrouvent en partie dans la valeur
    return true;
  }

  /* -------------------------------------------------------- marché ------ */

  /** Fait évoluer les indices des villes (appelé à chaque séance). */
  function onNewDay() {
    var s = G.state, i;
    if (!s.realestate.index) s.realestate.index = {};

    var macro = 0;
    if (G.nation && G.nation.marketEffect) macro = G.nation.marketEffect() * 0.35;

    for (i = 0; i < G.DATA.cities.length; i++) {
      var c = G.DATA.cities[i];
      var cur = s.realestate.index[c.id] === undefined ? 1 : s.realestate.index[c.id];
      var r = 0.0006 + macro * 0.01 + u.gauss(0, c.vol);
      cur = u.clamp(cur * (1 + r), 0.25, 12);
      s.realestate.index[c.id] = cur;
    }

    /* Une actualité locale de temps en temps. */
    if (u.chance(0.05)) {
      var city = u.pick(G.DATA.cities);
      var news = u.pick(G.DATA.propertyNews);
      s.realestate.index[city.id] *= (1 + news.impact);
      pushNews(news.txt.replace('{v}', city.name), city.id);
    }

    /* Réévaluation des biens détenus selon l'indice de leur ville. */
    var l = owned();
    for (i = 0; i < l.length; i++) {
      var p = l[i];
      var t = typeDef(p.type);
      var cd = cityDef(p.city);
      if (!t || !cd) continue;
      var base = t.price * cd.mult * cityIndex(p.city);
      var renovBonus = 1 + (p.lvl - 1) * 0.10;
      /* La valeur converge vers le prix de marché, avec un peu de bruit. */
      p.value = u.lerp(p.value, base * renovBonus, 0.25) * (1 + u.gauss(0, 0.004));
    }
  }

  function pushNews(txt, cityId) {
    var n = G.state.realestate.news;
    n.unshift({ day: G.state.market.day, txt: txt, city: cityId });
    if (n.length > 30) n.length = 30;
  }

  /* ------------------------------------------------------------ loyers -- */

  /** Accumule les loyers ; versement par tranche d'une minute. */
  function tick(dt) {
    var s = G.state;
    s.realestate.accrued += totalHourly() / 3600 * dt;
    s.realestate.timer += dt;
    var paid = 0;
    if (s.realestate.timer >= G.business.PAYOUT_SECONDS) {
      var periods = Math.floor(s.realestate.timer / G.business.PAYOUT_SECONDS);
      s.realestate.timer -= periods * G.business.PAYOUT_SECONDS;
      paid = s.realestate.accrued;
      s.realestate.accrued = 0;
      if (paid > 0) {
        G.eco.earn(paid, 'immobilier', 'Loyers encaissés', true);
        s.realestate.totalRent += paid;
      }
    }
    return paid;
  }

  /** Trend de la ville sur les 30 dernières séances (approximation). */
  function cityTrend(cityId) {
    var h = G.state.realestate.hist && G.state.realestate.hist[cityId];
    if (!h || h.length < 2) return 0;
    return (h[h.length - 1] / h[0] - 1) * 100;
  }

  function recordHistory() {
    var s = G.state;
    if (!s.realestate.hist) s.realestate.hist = {};
    for (var i = 0; i < G.DATA.cities.length; i++) {
      var id = G.DATA.cities[i].id;
      if (!s.realestate.hist[id]) s.realestate.hist[id] = [];
      s.realestate.hist[id].push(cityIndex(id));
      if (s.realestate.hist[id].length > 30) s.realestate.hist[id].shift();
    }
  }

  /** Types accessibles selon la fortune du joueur. */
  function catalog() {
    var reach = Math.max(G.state.money, G.state.stats.earned * 0.2);
    return G.DATA.propertyTypes.filter(function (t, i) {
      return i < 2 || reach >= t.price * 0.3;
    });
  }

  return {
    typeDef: typeDef, cityDef: cityDef, owned: owned, byUid: byUid,
    cityIndex: cityIndex, askPrice: askPrice, hourly: hourly,
    totalHourly: totalHourly, totalValue: totalValue, totalGain: totalGain,
    buy: buy, sell: sell, renovateCost: renovateCost, renovate: renovate,
    onNewDay: onNewDay, tick: tick, cityTrend: cityTrend,
    recordHistory: recordHistory, catalog: catalog, pushNews: pushNews
  };
})();
