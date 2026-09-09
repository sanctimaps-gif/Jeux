/* La Bourse : cours, ordres, dividendes, actualités.
 *
 * Le temps boursier avance tout seul : une séance dure DAY_SECONDS secondes
 * réelles. Les cours réagissent à l'humeur du marché, aux actualités, à
 * l'économie du pays que vous dirigez et à VOS activités (une entreprise dans
 * un secteur soutient les valeurs du secteur, un club qui gagne fait monter
 * les équipementiers, etc.).
 */
window.G = window.G || {};

G.market = (function () {
  'use strict';
  var u = G.util;

  var DAY_SECONDS = 4;        // durée réelle d'une séance
  var FEE = 0.005;            // frais de courtage
  var DIVIDEND_EVERY = 90;    // jours entre deux détachements de coupon
  var HIST_MAX = 90;

  function def(id) {
    for (var i = 0; i < G.DATA.stocks.length; i++) {
      if (G.DATA.stocks[i].id === id) return G.DATA.stocks[i];
    }
    return null;
  }

  function hold(id) { return G.state.market.stocks[id]; }

  /* ------------------------------------------------------- influences --- */

  /** Soutien apporté à un secteur par les entreprises que l'on possède. */
  function sectorSupport(sector) {
    var s = G.state, support = 0;
    for (var i = 0; i < G.DATA.businesses.length; i++) {
      var b = G.DATA.businesses[i];
      if (b.sector !== sector) continue;
      var o = s.biz.owned[b.id];
      if (o && o.lvl > 0) support += Math.min(0.0012, 0.00008 * Math.sqrt(o.lvl));
    }
    return support;
  }

  /** Coup de pouce temporaire sur un titre (résultat sportif, loi, casino…). */
  function addBoost(stockId, value, reason) {
    var m = G.state.market;
    if (!m.boosts) m.boosts = {};
    m.boosts[stockId] = (m.boosts[stockId] || 0) + value;
    if (reason) {
      pushNews((value >= 0 ? '📈 ' : '📉 ') + reason, stockId);
    }
  }

  function pushNews(txt, stockId) {
    var m = G.state.market;
    m.news.unshift({ day: m.day, txt: txt, id: stockId || null });
    if (m.news.length > 40) m.news.length = 40;
  }

  /* ------------------------------------------------------------ séance -- */

  function newDay() {
    var s = G.state, m = s.market;
    m.day++;

    /* Humeur générale : marche aléatoire à retour à la moyenne. */
    var macro = 0;
    if (G.country && G.country.marketEffect) macro = G.country.marketEffect();
    m.mood = u.clamp(m.mood * 0.90 + u.gauss(macro * 0.5, 0.10), -1.2, 1.2);

    var volGlobal = 1;
    if (s.country && s.country.laws && s.country.laws['derégulation']) volGlobal += 0.35;

    /* Actualité macro occasionnelle. */
    if (u.chance(0.05)) {
      var n = u.pick(G.DATA.macroNews);
      m.mood = u.clamp(m.mood + n.impact * 3, -1.5, 1.5);
      pushNews('🌍 ' + n.txt, null);
    }

    if (!m.boosts) m.boosts = {};

    for (var i = 0; i < G.DATA.stocks.length; i++) {
      var st = G.DATA.stocks[i];
      var h = m.stocks[st.id];
      if (!h) continue;

      h.open = h.p;

      var drift = st.drift + sectorSupport(st.sector);
      var boost = m.boosts[st.id] || 0;
      var shock = 0;

      /* Actualité propre au titre. */
      if (u.chance(0.012)) {
        var news = u.pick(G.DATA.marketNews);
        shock += news.impact * u.rfloat(0.6, 1.3);
        pushNews((news.impact >= 0 ? '📈 ' : '📉 ') +
          news.txt.replace('{n}', st.name), st.id);
      }

      var ret = drift
        + m.mood * st.beta * 0.010
        + u.gauss(0, st.vol * volGlobal)
        + boost
        + shock;

      ret = u.clamp(ret, -0.32, 0.38);
      h.p = Math.max(0.5, h.p * (1 + ret));

      h.hist.push(h.p);
      if (h.hist.length > HIST_MAX) h.hist.shift();

      /* Les coups de pouce s'estompent. */
      if (m.boosts[st.id]) {
        m.boosts[st.id] *= 0.55;
        if (Math.abs(m.boosts[st.id]) < 0.0004) delete m.boosts[st.id];
      }
    }

    /* Dividendes trimestriels. */
    if (m.day - (m.lastDividend || 0) >= DIVIDEND_EVERY) {
      m.lastDividend = m.day;
      payDividends();
    }
  }

  function payDividends() {
    var s = G.state, total = 0;
    for (var i = 0; i < G.DATA.stocks.length; i++) {
      var st = G.DATA.stocks[i];
      var h = s.market.stocks[st.id];
      if (!h || h.qty <= 0 || !st.div) continue;
      total += h.qty * h.p * st.div / 4;
    }
    if (total <= 0) return;
    total *= (1 + G.eco.bonus('market'));
    G.eco.earn(total, 'dividende', 'Coupons trimestriels');
  }

  function tick(dt) {
    var m = G.state.market;
    m.dayProgress += dt;
    var guard = 0;
    while (m.dayProgress >= DAY_SECONDS && guard < 400) {
      m.dayProgress -= DAY_SECONDS;
      newDay();
      guard++;
    }
    if (guard >= 400) m.dayProgress = 0;
  }

  /* ------------------------------------------------------------ ordres -- */

  function buy(id, qty) {
    var st = def(id), h = hold(id);
    if (!st || !h || qty <= 0) return false;
    qty = Math.floor(qty);
    var gross = h.p * qty;
    var cost = gross * (1 + FEE);
    if (!G.eco.spend(cost, 'bourse', 'Achat ' + qty + ' × ' + st.id, true)) return false;

    h.qty += qty;
    h.cost += cost;
    G.eco.consumePending(cost);
    if (G.ui) G.ui.toast('📈 Achat exécuté', qty + ' × ' + st.id + ' à ' +
      u.fmtMoney(h.p), 'neutral');
    return true;
  }

  function sell(id, qty) {
    var st = def(id), h = hold(id);
    if (!st || !h || qty <= 0 || h.qty <= 0) return false;
    qty = Math.min(Math.floor(qty), h.qty);

    var gross = h.p * qty;
    var net = gross * (1 - FEE);
    var partCost = h.cost * (qty / h.qty);

    h.qty -= qty;
    h.cost -= partCost;
    if (h.qty <= 0) { h.qty = 0; h.cost = 0; }

    G.state.market.realized += net - partCost;
    G.eco.earn(net, 'bourse', 'Vente ' + qty + ' × ' + st.id);
    return true;
  }

  function maxBuyable(id) {
    var h = hold(id);
    if (!h) return 0;
    return Math.floor(G.state.money / (h.p * (1 + FEE)));
  }

  /* ----------------------------------------------------------- lecture -- */

  function dayChange(id) {
    var h = hold(id);
    if (!h || !h.open) return 0;
    return (h.p / h.open - 1) * 100;
  }

  function trend(id, days) {
    var h = hold(id);
    if (!h || h.hist.length < 2) return 0;
    var n = Math.min(days || 30, h.hist.length);
    var old = h.hist[h.hist.length - n];
    return (h.p / old - 1) * 100;
  }

  function positionValue(id) {
    var h = hold(id);
    return h ? h.qty * h.p : 0;
  }

  function positionPnl(id) {
    var h = hold(id);
    if (!h || h.qty <= 0) return { abs: 0, pct: 0 };
    var val = h.qty * h.p * (1 - FEE);
    return { abs: val - h.cost, pct: h.cost > 0 ? (val / h.cost - 1) * 100 : 0 };
  }

  function totalPnl() {
    var abs = 0, cost = 0;
    for (var id in G.state.market.stocks) {
      var h = G.state.market.stocks[id];
      if (h.qty <= 0) continue;
      abs += h.qty * h.p * (1 - FEE) - h.cost;
      cost += h.cost;
    }
    return { abs: abs, pct: cost > 0 ? (abs / cost) * 100 : 0, cost: cost };
  }

  /** Sparkline SVG du cours (utilisée par l'interface). */
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
    DAY_SECONDS: DAY_SECONDS, FEE: FEE,
    def: def, hold: hold, tick: tick, newDay: newDay,
    buy: buy, sell: sell, maxBuyable: maxBuyable,
    dayChange: dayChange, trend: trend, positionValue: positionValue,
    positionPnl: positionPnl, totalPnl: totalPnl, sparkline: sparkline,
    addBoost: addBoost, pushNews: pushNews, sectorSupport: sectorSupport,
    payDividends: payDividends
  };
})();
