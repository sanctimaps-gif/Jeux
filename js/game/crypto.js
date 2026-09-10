/* Cryptomonnaies : marché très volatil, achats fractionnés, staking.
 *
 * Même horloge que la Bourse (une séance toutes les quatre secondes), mais
 * des amplitudes bien supérieures : de quoi doubler une fortune ou la perdre.
 */
window.G = window.G || {};

G.crypto = (function () {
  'use strict';
  var u = G.util;

  var FEE = 0.010;                 // frais de plateforme, plus élevés qu'en Bourse

  function def(id) {
    for (var i = 0; i < G.DATA.cryptos.length; i++) {
      if (G.DATA.cryptos[i].id === id) return G.DATA.cryptos[i];
    }
    return null;
  }

  function hold(id) { return G.state.crypto.coins[id]; }

  function price(id) {
    var h = hold(id);
    return h ? h.p : (def(id) || {}).p0 || 0;
  }

  /* ------------------------------------------------------------ séance -- */

  function onNewDay() {
    var s = G.state, m = s.crypto;
    /* Le sentiment crypto suit de loin celui des actions, en amplifié. */
    var mood = s.market.mood * 0.9 + u.gauss(0, 0.30);
    m.mood = u.clamp(m.mood * 0.88 + mood * 0.12, -1.6, 1.6);

    for (var i = 0; i < G.DATA.cryptos.length; i++) {
      var c = G.DATA.cryptos[i];
      var h = m.coins[c.id];
      if (!h) continue;
      h.open = h.p;

      var shock = 0;
      if (u.chance(0.02)) {
        var news = u.pick(G.DATA.cryptoNews);
        shock = news.impact * u.rfloat(0.6, 1.5);
        pushNews((news.impact >= 0 ? '🚀 ' : '💥 ') +
          news.txt.replace('{n}', c.name), c.id);
      }

      var ret = c.drift + m.mood * 0.006 + u.gauss(0, c.vol) + shock;
      /* Un stablecoin reste accroché à sa parité. */
      if (c.vol < 0.01) ret = (1 - h.p) * 0.5 + u.gauss(0, 0.002);

      ret = u.clamp(ret, -0.55, 0.90);
      h.p = Math.max(1e-7, h.p * (1 + ret));
      h.hist.push(h.p);
      if (h.hist.length > 90) h.hist.shift();

      /* Récompenses de staking versées chaque séance. */
      if (h.staked > 0 && c.stake > 0) {
        var reward = h.staked * c.stake / 365;
        h.staked += reward;
        h.rewards = (h.rewards || 0) + reward;
      }
    }
  }

  function pushNews(txt, id) {
    var n = G.state.crypto.news;
    n.unshift({ day: G.state.market.day, txt: txt, id: id });
    if (n.length > 30) n.length = 30;
  }

  /* ------------------------------------------------------------ ordres -- */

  /** Achète pour `amount` euros de la cryptomonnaie choisie. */
  function buy(id, amount) {
    var h = hold(id);
    if (!h || amount <= 0) return false;
    if (!G.eco.spend(amount, 'crypto', 'Achat ' + id, true)) return false;
    var qty = (amount * (1 - FEE)) / h.p;
    h.qty += qty;
    h.cost += amount;
    G.eco.consumePending(amount);
    if (G.ui) {
      G.ui.toast('🪙 Achat exécuté', u.fmtNum(qty, 4) + ' ' + id + ' à ' +
        fmtPrice(h.p), 'neutral');
    }
    return true;
  }

  /** Vend une quantité de jetons (ou tout si qty non fourni). */
  function sell(id, qty) {
    var h = hold(id);
    if (!h || h.qty <= 0) return false;
    qty = Math.min(qty === undefined ? h.qty : qty, h.qty);
    var gross = qty * h.p;
    var net = gross * (1 - FEE);
    var partCost = h.cost * (qty / h.qty);
    h.qty -= qty;
    h.cost -= partCost;
    if (h.qty < 1e-9) { h.qty = 0; h.cost = 0; }
    G.state.crypto.realized += net - partCost;
    G.eco.earn(net, 'crypto', 'Vente ' + id);
    return true;
  }

  function stake(id, qty) {
    var c = def(id), h = hold(id);
    if (!c || !h || !c.stake || qty <= 0) return false;
    qty = Math.min(qty, h.qty);
    h.qty -= qty;
    h.staked += qty;
    return true;
  }

  function unstake(id) {
    var h = hold(id);
    if (!h || h.staked <= 0) return false;
    h.qty += h.staked;
    h.staked = 0;
    return true;
  }

  /* ----------------------------------------------------------- lecture -- */

  function fmtPrice(p) {
    if (p >= 1000) return u.fmtMoney(p);
    if (p >= 1) return u.dec(p, 2).replace('.', ',') + ' €';
    if (p >= 0.01) return u.dec(p, 4) + ' €';
    return p.toExponential(2).replace('.', ',') + ' €';
  }

  function dayChange(id) {
    var h = hold(id);
    if (!h || !h.open) return 0;
    return (h.p / h.open - 1) * 100;
  }

  function trend(id, days) {
    var h = hold(id);
    if (!h || h.hist.length < 2) return 0;
    var n = Math.min(days || 30, h.hist.length);
    return (h.p / h.hist[h.hist.length - n] - 1) * 100;
  }

  function positionValue(id) {
    var h = hold(id);
    return h ? (h.qty + h.staked) * h.p : 0;
  }

  function totalValue() {
    var total = 0;
    for (var id in G.state.crypto.coins) total += positionValue(id);
    return total;
  }

  function totalPnl() {
    var abs = 0, cost = 0;
    for (var id in G.state.crypto.coins) {
      var h = G.state.crypto.coins[id];
      if (h.qty + h.staked <= 0) continue;
      abs += (h.qty + h.staked) * h.p * (1 - FEE) - h.cost;
      cost += h.cost;
    }
    return { abs: abs, pct: cost > 0 ? abs / cost * 100 : 0, cost: cost };
  }

  function sparkline(id, w, hgt) {
    var h = hold(id);
    if (!h || h.hist.length < 2) return '';
    var pts = h.hist.slice(-40);
    var min = Math.min.apply(null, pts), max = Math.max.apply(null, pts);
    var span = (max - min) || 1;
    var d = '';
    for (var i = 0; i < pts.length; i++) {
      var x = (i / (pts.length - 1)) * w;
      var y = hgt - ((pts[i] - min) / span) * (hgt - 2) - 1;
      d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
    }
    var up = pts[pts.length - 1] >= pts[0];
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + hgt + '" width="' + w +
      '" height="' + hgt + '" preserveAspectRatio="none">' +
      '<path d="' + d + '" fill="none" stroke="' + (up ? '#3ddc97' : '#ff6b6b') +
      '" stroke-width="1.6"/></svg>';
  }

  return {
    FEE: FEE, def: def, hold: hold, price: price, onNewDay: onNewDay,
    buy: buy, sell: sell, stake: stake, unstake: unstake,
    fmtPrice: fmtPrice, dayChange: dayChange, trend: trend,
    positionValue: positionValue, totalValue: totalValue, totalPnl: totalPnl,
    sparkline: sparkline, pushNews: pushNews
  };
})();
