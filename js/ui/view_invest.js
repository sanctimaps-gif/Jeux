/* Onglet Investissement : actions, immobilier, cryptomonnaies, collections. */
window.G = window.G || {};

(function () {
  'use strict';
  var u = G.util, ui = G.ui;

  var sub = 'actions';
  var openStock = null;
  var openCoin = null;
  var reCity = 'paris';

  function subTabs() {
    var tabs = [['actions', 'Actions'], ['immobilier', 'Immobilier'],
    ['crypto', 'Cryptomonnaie'], ['collections', 'Collections']];
    return '<div class="sub-tabs">' + tabs.map(function (t) {
      return '<button class="sub' + (sub === t[0] ? ' active' : '') +
        '" data-act="iv.sub" data-sub="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</div>';
  }
  ui.act('iv.sub', function (d) { sub = d.sub; ui.refresh(); });

  /* ====================================================== RÉINVESTIR ====== */

  function pendingList() {
    var out = [];
    for (var k in G.state.pending) {
      if (G.state.pending[k] > 100) {
        out.push({ key: k, amount: G.state.pending[k], meta: G.eco.meta(k) });
      }
    }
    return u.sortBy(out, function (x) { return x.amount; }, true).slice(0, 4);
  }

  function pendingCard() {
    var pend = pendingList();
    if (!pend.length) return '';
    var h = '<div class="card tight" style="border-color:rgba(61,220,151,.4)">' +
      '<div class="card-head">♻️ Gains à replacer<span class="sub">' +
      'venus de vos autres activités</span></div>';
    for (var i = 0; i < pend.length; i++) {
      h += '<div class="item"><div class="item-icon">' + pend[i].meta.icon + '</div>' +
        '<div class="item-main"><div class="t">' + u.esc(pend[i].meta.label) + '</div>' +
        '<div class="s">' + u.fmtMoney(pend[i].amount) + ' disponibles</div></div>' +
        '<div class="item-side"><button class="btn sm green" data-act="mk.reinvest" ' +
        'data-src="' + u.esc(pend[i].key) + '">Investir</button></div></div>';
    }
    return h + '</div>';
  }

  /* ========================================================== ACTIONS ===== */

  function renderStocks() {
    var m = G.state.market;
    var pnl = G.market.totalPnl();
    var h = '';

    h += '<div class="card portfolio">' +
      '<div class="row between"><b>💼 Mon portefeuille d\'actions</b></div>' +
      '<div class="pf-v">' + u.fmtMoney(G.eco.portfolioValue()) + '</div>' +
      (pnl.cost > 0
        ? '<div class="' + ui.signCls(pnl.abs) + '">' + u.fmtSigned(pnl.abs) +
          ' (' + u.fmtPct(pnl.pct) + ') depuis toujours</div>'
        : '<div class="mute2">Aucune position ouverte</div>') +
      '<div class="row between" style="margin-top:8px">' +
      '<span class="mute2">Humeur du marché</span><b class="' +
      (m.mood >= 0 ? 'good' : 'bad') + '">' + moodLabel(m.mood) + '</b></div>' +
      '</div>';

    h += pendingCard();

    h += '<div class="card"><div class="card-head">📈 Cotation' +
      '<span class="sub">séance ' + u.fmtDay(m.day) + '</span></div>';
    for (var j = 0; j < G.DATA.stocks.length; j++) h += stockRow(G.DATA.stocks[j]);
    h += '</div>';

    if (m.news.length) {
      h += '<div class="card"><div class="card-head">📰 Actualité des marchés</div><div class="feed">';
      for (var k = 0; k < Math.min(10, m.news.length); k++) {
        h += '<div class="entry"><span class="m">J' + m.news[k].day + '</span><span>' +
          u.esc(m.news[k].txt) + '</span></div>';
      }
      h += '</div></div>';
    }

    var re = reinvestedSummary();
    if (re.length) {
      h += '<div class="card"><div class="card-head">🔗 Origine des capitaux placés</div>';
      for (var q = 0; q < re.length; q++) {
        h += '<div class="row between small" style="padding:3px 0"><span>' +
          re[q].meta.icon + ' ' + u.esc(re[q].meta.label) + '</span><b>' +
          u.fmtMoney(re[q].amount) + '</b></div>';
      }
      h += '<div class="mute2" style="margin-top:6px">L\'argent gagné sur le terrain ' +
        'ou aux tables travaille désormais sur les marchés.</div></div>';
    }
    return h;
  }

  function moodLabel(mood) {
    if (mood > 0.6) return 'Euphorie';
    if (mood > 0.2) return 'Optimiste';
    if (mood > -0.2) return 'Neutre';
    if (mood > -0.6) return 'Prudente';
    return 'Panique';
  }

  function reinvestedSummary() {
    var out = [];
    for (var k in G.state.reinvested) {
      if (G.state.reinvested[k] > 1) {
        out.push({ key: k, amount: G.state.reinvested[k], meta: G.eco.meta(k) });
      }
    }
    return u.sortBy(out, function (x) { return x.amount; }, true);
  }

  function stockRow(st) {
    var h = G.market.hold(st.id);
    var chg = G.market.dayChange(st.id);
    var pos = h.qty > 0 ? G.market.positionPnl(st.id) : null;
    return '<div class="stock-row" data-act="mk.open" data-id="' + st.id + '">' +
      '<div><div class="stock-tic">' + st.id + '</div>' +
      '<div class="stock-name">' + u.esc(st.name) + '</div></div>' +
      '<div class="spacer">' + G.market.sparkline(st.id, 70, 26) + '</div>' +
      '<div class="stock-price">' + u.fmtMoney(h.p) +
      '<div class="small ' + ui.signCls(chg) + '">' + u.fmtPct(chg) + '</div></div>' +
      (h.qty > 0 ? '<div class="item-side" style="min-width:66px">' +
        '<div class="small">' + u.fmtNum(h.qty) + ' tit.</div><div class="small ' +
        ui.signCls(pos.abs) + '">' + u.fmtSigned(pos.abs) + '</div></div>' : '') +
      '</div>';
  }

  function stockModal(id) {
    openStock = id;
    var st = G.market.def(id);
    var h = G.market.hold(id);
    var pos = G.market.positionPnl(id);
    var maxBuy = G.market.maxBuyable(id);
    var sec = G.DATA.sectors[st.sector] || G.DATA.stockSectors[st.sector] ||
      { name: st.sector, icon: '' };

    var html = '<div class="row between" style="margin-bottom:8px">' +
      '<div><div style="font-size:22px;font-weight:800">' + u.fmtMoney(h.p) + '</div>' +
      '<div class="small ' + ui.signCls(G.market.dayChange(id)) + '">' +
      u.fmtPct(G.market.dayChange(id)) + ' aujourd\'hui · ' +
      u.fmtPct(G.market.trend(id, 30)) + ' sur 30 séances</div></div>' +
      '<div>' + ui.pill(sec.icon + ' ' + sec.name) + '</div></div>';

    html += '<div class="card flat tight">' + G.market.sparkline(id, 300, 70) + '</div>';

    html += '<div class="grid3" style="margin:8px 0">' +
      ui.stat('Titres détenus', u.fmtNum(h.qty)) +
      ui.stat('Valorisation', u.fmtMoney(h.qty * h.p)) +
      ui.stat('Résultat', u.fmtSigned(pos.abs), ui.signCls(pos.abs)) +
      '</div>';

    html += '<div class="grid3" style="margin-bottom:8px">' +
      ui.stat('Dividende', u.dec(st.div * 100, 1) + ' %/an') +
      ui.stat('Volatilité', u.dec(st.vol * 100, 1) + ' %') +
      ui.stat('Soutien', '+' + u.dec(G.market.sectorSupport(st.sector) * 1000, 2) + '‰', 'blue') +
      '</div>';

    var left = G.market.sharesLeft(id);
    html += '<div class="mute2" style="margin-bottom:6px">Flottant disponible : ' +
      u.fmtNum(left) + ' / ' + u.fmtNum(st.shares) + ' titres</div>';

    html += '<label class="field">Quantité</label>' +
      '<input type="number" id="mk-qty" min="1" max="' + Math.max(1, maxBuy) + '" step="1" value="' +
      Math.max(1, Math.min(10, maxBuy)) + '">';
    html += '<div class="grid4" style="margin:8px 0">' +
      '<button class="btn xs" data-act="mk.setqty" data-v="1">1</button>' +
      '<button class="btn xs" data-act="mk.setqty" data-v="10">10</button>' +
      '<button class="btn xs" data-act="mk.setqty" data-v="100">100</button>' +
      '<button class="btn xs" data-act="mk.setqty" data-v="max">MAX</button></div>';
    html += '<div class="grid2">' +
      '<button class="btn green" data-act="mk.buy" data-id="' + id + '"' +
      (maxBuy > 0 ? '' : ' disabled') + '>Acheter</button>' +
      '<button class="btn danger" data-act="mk.sell" data-id="' + id + '"' +
      (h.qty > 0 ? '' : ' disabled') + '>Vendre</button></div>';
    html += '<div class="mute2" style="margin-top:6px">Frais de courtage ' +
      u.dec(G.market.FEE * 100, 1) + ' %. Achat maximum : ' + u.fmtNum(maxBuy) + ' titres.</div>';

    ui.modal(st.id + ' · ' + u.esc(st.name), html, {
      onClose: function () { openStock = null; }
    });
  }

  function readQty() {
    var input = document.getElementById('mk-qty');
    var v = input ? parseInt(input.value, 10) : 1;
    return (!v || v < 1) ? 1 : v;
  }

  ui.act('mk.open', function (d) { stockModal(d.id); });
  ui.act('mk.setqty', function (d) {
    var input = document.getElementById('mk-qty');
    if (!input) return;
    input.value = d.v === 'max' ? Math.max(1, G.market.maxBuyable(openStock)) : d.v;
  });
  ui.act('mk.buy', function (d) { if (G.market.buy(d.id, readQty())) stockModal(d.id); });
  ui.act('mk.sell', function (d) { if (G.market.sell(d.id, readQty())) stockModal(d.id); });

  /** Réinvestir des gains venus d'un sport, du casino ou du gouvernement. */
  function reinvestModal(srcKey) {
    var amount = G.state.pending[srcKey] || 0;
    var meta = G.eco.meta(srcKey);
    var list = u.sortBy(G.DATA.stocks.slice(), function (s) {
      return G.market.trend(s.id, 20);
    }, true);

    var html = '<p class="muted">' + meta.icon + ' <b>' + u.fmtMoney(amount) +
      '</b> gagnés grâce à « ' + u.esc(meta.label) + ' ». Choisissez le placement : ' +
      'le montant sera investi intégralement, dans la limite de vos liquidités.</p>';

    html += '<div class="card tight">';
    for (var i = 0; i < Math.min(6, list.length); i++) {
      var st = list[i];
      var h = G.market.hold(st.id);
      var n = Math.floor(Math.min(amount, G.state.money) / (h.p * (1 + G.market.FEE)));
      html += '<div class="item"><div class="item-main">' +
        '<div class="t">' + st.id + ' <span class="mute2">' + u.esc(st.name) + '</span></div>' +
        '<div class="s">' + u.fmtMoney(h.p) + ' · 20 séances ' +
        '<span class="' + ui.signCls(G.market.trend(st.id, 20)) + '">' +
        u.fmtPct(G.market.trend(st.id, 20)) + '</span></div></div>' +
        '<div class="item-side"><button class="btn sm ' + (n > 0 ? 'green' : '') +
        '" data-act="mk.doreinvest" data-id="' + st.id + '" data-src="' + u.esc(srcKey) +
        '"' + (n > 0 ? '' : ' disabled') + '>' + u.fmtNum(n) + ' tit.</button></div></div>';
    }
    html += '</div>';

    /* On peut aussi replacer en crypto ou en immobilier. */
    html += '<div class="card-head" style="margin-top:6px">Autres placements</div>' +
      '<div class="grid2">' +
      '<button class="btn" data-act="iv.gocrypto" data-src="' + u.esc(srcKey) +
      '">🪙 Cryptomonnaies</button>' +
      '<button class="btn" data-act="iv.goimmo" data-src="' + u.esc(srcKey) +
      '">🏘️ Immobilier</button></div>';

    ui.modal('♻️ Réinvestir', html, {});
  }

  ui.act('mk.reinvest', function (d) { reinvestModal(d.src); });
  ui.act('ui.reinvest', function (d, node) {
    var src = node.getAttribute('data-src');
    if (src) { sub = 'actions'; ui.setTab('invest'); reinvestModal(src); }
  });
  ui.act('mk.doreinvest', function (d) {
    var amount = Math.min(G.state.pending[d.src] || 0, G.state.money);
    var h = G.market.hold(d.id);
    var n = Math.floor(amount / (h.p * (1 + G.market.FEE)));
    if (n > 0 && G.market.buy(d.id, n)) {
      ui.toast('♻️ Capital replacé', u.fmtNum(n) + ' × ' + d.id + ' financés par ' +
        G.eco.meta(d.src).label, 'good');
    }
    ui.closeModal();
  });
  ui.act('iv.gocrypto', function () { sub = 'crypto'; ui.closeModal(); });
  ui.act('iv.goimmo', function () { sub = 'immobilier'; ui.closeModal(); });

  /* ======================================================= IMMOBILIER ===== */

  function renderRealEstate() {
    var h = '';
    var val = G.realestate.totalValue();
    var gain = G.realestate.totalGain();

    h += '<div class="card portfolio">' +
      '<div class="row between"><b>🏘️ Mon patrimoine immobilier</b></div>' +
      '<div class="pf-v">' + u.fmtMoney(val) + '</div>' +
      '<div class="' + ui.signCls(gain) + '">' + u.fmtSigned(gain) + ' de plus-value</div>' +
      '<div class="row between" style="margin-top:8px">' +
      '<span class="mute2">Loyers</span><b class="good">' +
      u.fmtMoney(G.realestate.totalHourly()) + ' / heure</b></div></div>';

    h += pendingCard();

    /* Mes biens. */
    var props = G.realestate.owned();
    if (props.length) {
      h += '<div class="card"><div class="card-head">🔑 Mes biens<span class="sub">' +
        props.length + '</span></div>';
      for (var i = 0; i < props.length; i++) {
        var p = props[i];
        var t = G.realestate.typeDef(p.type);
        var city = G.realestate.cityDef(p.city);
        var diff = p.value - p.paid;
        h += '<div class="item" data-act="re.open" data-uid="' + p.uid + '">' +
          '<div class="item-icon">' + t.icon + '</div>' +
          '<div class="item-main"><div class="t">' + t.name + ' <span class="mute2">' +
          city.flag + ' ' + city.name + '</span></div>' +
          '<div class="s">Niveau ' + p.lvl + '/' + t.maxLvl + ' · loyer ' +
          u.fmtMoney(G.realestate.hourly(p)) + '/h</div></div>' +
          '<div class="item-side"><div>' + u.fmtMoney(p.value) + '</div>' +
          '<div class="small ' + ui.signCls(diff) + '">' + u.fmtSigned(diff) + '</div></div>' +
          '</div>';
      }
      h += '</div>';
    }

    /* Marché : choix de la ville. */
    h += '<div class="card-head" style="margin-top:12px">🏙️ Marché immobilier</div>';
    h += '<div class="sub-tabs">';
    for (var c = 0; c < G.DATA.cities.length; c++) {
      var cd = G.DATA.cities[c];
      h += '<button class="sub' + (reCity === cd.id ? ' active' : '') +
        '" data-act="re.city" data-id="' + cd.id + '">' + cd.flag + ' ' + cd.name + '</button>';
    }
    h += '</div>';

    var idx = G.realestate.cityIndex(reCity);
    var trend = G.realestate.cityTrend(reCity);
    h += '<div class="card tight"><div class="row between">' +
      '<span class="mute2">Indice des prix</span>' +
      '<b class="' + ui.signCls(idx - 1) + '">' + u.dec(idx * 100, 0) + '</b></div>' +
      '<div class="row between"><span class="mute2">Tendance 30 séances</span>' +
      '<b class="' + ui.signCls(trend) + '">' + u.fmtPct(trend) + '</b></div></div>';

    var cat = G.realestate.catalog();
    h += '<div class="card">';
    for (var j = 0; j < cat.length; j++) {
      var ty = cat[j];
      var price = G.realestate.askPrice(ty, reCity);
      var can = G.state.money >= price;
      var yieldH = price * ty.yield;
      h += '<div class="item"><div class="item-icon">' + ty.icon + '</div>' +
        '<div class="item-main"><div class="t">' + ty.name + '</div>' +
        '<div class="s">' + u.esc(ty.desc) + '</div>' +
        '<div class="mute2">Loyer estimé ' + u.fmtMoney(yieldH) + '/h · rendement ' +
        u.dec(ty.yield * 24 * 100, 2) + ' %/jour</div></div>' +
        '<div class="item-side"><button class="btn sm ' + (can ? 'primary' : '') +
        '" data-act="re.buy" data-id="' + ty.id + '"' + (can ? '' : ' disabled') + '>' +
        u.fmtMoney(price) + '</button></div></div>';
    }
    h += '</div>';

    if (G.state.realestate.news.length) {
      h += '<div class="card"><div class="card-head">📰 Actualité immobilière</div><div class="feed">';
      for (var k = 0; k < Math.min(8, G.state.realestate.news.length); k++) {
        var nw = G.state.realestate.news[k];
        h += '<div class="entry"><span class="m">J' + nw.day + '</span><span>' +
          u.esc(nw.txt) + '</span></div>';
      }
      h += '</div></div>';
    }
    return h;
  }

  ui.act('re.city', function (d) { reCity = d.id; ui.refresh(); });
  ui.act('re.buy', function (d) {
    var p = G.realestate.buy(d.id, reCity);
    if (p) ui.toast('🔑 Acquisition', G.realestate.typeDef(d.id).name, 'good');
    ui.refresh();
  });

  ui.act('re.open', function (d) {
    var p = G.realestate.byUid(d.uid);
    if (!p) return;
    var t = G.realestate.typeDef(p.type);
    var city = G.realestate.cityDef(p.city);
    var cost = G.realestate.renovateCost(p);
    var maxed = p.lvl >= t.maxLvl;

    var h = '<div class="row" style="gap:10px;margin-bottom:10px">' +
      '<div style="font-size:32px">' + t.icon + '</div><div>' +
      '<div style="font-weight:800">' + t.name + '</div>' +
      '<div class="mute2">' + city.flag + ' ' + city.name + '</div></div></div>';

    h += '<div class="grid3" style="margin-bottom:10px">' +
      ui.stat('Valeur', u.fmtMoney(p.value)) +
      ui.stat('Loyer', u.fmtMoney(G.realestate.hourly(p)) + '/h', 'good') +
      ui.stat('Plus-value', u.fmtSigned(p.value - p.paid), ui.signCls(p.value - p.paid)) +
      '</div>';

    h += '<div class="row between small"><span>Rénovations</span><b>' + p.lvl + ' / ' +
      t.maxLvl + '</b></div>' + ui.bar(p.lvl / t.maxLvl * 100);

    if (!maxed) {
      var can = G.state.money >= cost;
      h += '<button class="btn ' + (can ? 'primary' : '') + ' full" style="margin-top:10px" ' +
        'data-act="re.renovate" data-uid="' + p.uid + '"' + (can ? '' : ' disabled') + '>' +
        '🔨 Rénover · ' + u.fmtMoney(cost) + ' (+16 % de loyer)</button>';
    }
    h += '<button class="btn danger full" style="margin-top:8px" data-act="re.sell" ' +
      'data-uid="' + p.uid + '">💱 Vendre · ' + u.fmtMoney(p.value * 0.955) + '</button>';
    ui.modal(t.icon + ' ' + t.name, h, {});
  });

  ui.act('re.renovate', function (d) {
    if (G.realestate.renovate(d.uid)) {
      ui.toast('🔨 Travaux terminés', 'Le loyer augmente', 'good');
      ui.closeModal();
    }
  });
  ui.act('re.sell', function (d) {
    var p = G.realestate.byUid(d.uid);
    if (!p) return;
    ui.confirm('Vendre ce bien ?',
      'Vous en tirez ' + u.fmtMoney(p.value * 0.955) + ' après frais.',
      function () { G.realestate.sell(d.uid); ui.refresh(); }, 'Vendre');
  });

  /* ========================================================== CRYPTO ====== */

  function renderCrypto() {
    var pnl = G.crypto.totalPnl();
    var h = '';

    h += '<div class="card portfolio">' +
      '<div class="row between"><b>🪙 Mon portefeuille crypto</b></div>' +
      '<div class="pf-v">' + u.fmtMoney(G.crypto.totalValue()) + '</div>' +
      (pnl.cost > 0
        ? '<div class="' + ui.signCls(pnl.abs) + '">' + u.fmtSigned(pnl.abs) +
          ' (' + u.fmtPct(pnl.pct) + ')</div>'
        : '<div class="mute2">Aucune position ouverte</div>') +
      '<div class="mute2" style="margin-top:6px">Marché extrêmement volatil : ' +
      'les variations quotidiennes dépassent souvent 10 %.</div></div>';

    h += pendingCard();

    h += '<div class="card">';
    for (var i = 0; i < G.DATA.cryptos.length; i++) {
      var c = G.DATA.cryptos[i];
      var hd = G.crypto.hold(c.id);
      var chg = G.crypto.dayChange(c.id);
      h += '<div class="stock-row" data-act="cr.open" data-id="' + c.id + '">' +
        '<div style="width:34px;font-size:20px;text-align:center">' + c.icon + '</div>' +
        '<div><div class="stock-tic">' + c.id + '</div>' +
        '<div class="stock-name">' + u.esc(c.name) + '</div></div>' +
        '<div class="spacer">' + G.crypto.sparkline(c.id, 60, 26) + '</div>' +
        '<div class="stock-price">' + G.crypto.fmtPrice(hd.p) +
        '<div class="small ' + ui.signCls(chg) + '">' + u.fmtPct(chg) + '</div></div>' +
        (hd.qty + hd.staked > 0
          ? '<div class="item-side" style="min-width:62px"><div class="small">' +
            u.fmtNum(hd.qty + hd.staked, 3) + '</div><div class="small good">' +
            u.fmtMoney(G.crypto.positionValue(c.id)) + '</div></div>'
          : '') +
        '</div>';
    }
    h += '</div>';

    if (G.state.crypto.news.length) {
      h += '<div class="card"><div class="card-head">📰 Actualité crypto</div><div class="feed">';
      for (var k = 0; k < Math.min(8, G.state.crypto.news.length); k++) {
        var nw = G.state.crypto.news[k];
        h += '<div class="entry"><span class="m">J' + nw.day + '</span><span>' +
          u.esc(nw.txt) + '</span></div>';
      }
      h += '</div></div>';
    }
    return h;
  }

  function coinModal(id) {
    openCoin = id;
    var c = G.crypto.def(id);
    var hd = G.crypto.hold(id);
    var pnl = (function () {
      if (hd.qty + hd.staked <= 0) return { abs: 0, pct: 0 };
      var val = (hd.qty + hd.staked) * hd.p * (1 - G.crypto.FEE);
      return { abs: val - hd.cost, pct: hd.cost > 0 ? (val / hd.cost - 1) * 100 : 0 };
    })();

    var h = '<div class="row between" style="margin-bottom:8px">' +
      '<div><div style="font-size:22px;font-weight:800">' + G.crypto.fmtPrice(hd.p) + '</div>' +
      '<div class="small ' + ui.signCls(G.crypto.dayChange(id)) + '">' +
      u.fmtPct(G.crypto.dayChange(id)) + ' aujourd\'hui · ' +
      u.fmtPct(G.crypto.trend(id, 30)) + ' sur 30 séances</div></div>' +
      '<div style="font-size:30px">' + c.icon + '</div></div>';

    h += '<div class="card flat tight">' + G.crypto.sparkline(id, 300, 70) + '</div>';

    h += '<div class="grid3" style="margin:8px 0">' +
      ui.stat('Détenu', u.fmtNum(hd.qty, 4)) +
      ui.stat('En staking', u.fmtNum(hd.staked, 4)) +
      ui.stat('Résultat', u.fmtSigned(pnl.abs), ui.signCls(pnl.abs)) +
      '</div>';

    h += '<label class="field">Montant à investir</label>' +
      '<input type="number" id="cr-amt" min="1" value="' +
      Math.round(Math.min(G.state.money * 0.1, 10000)) + '">';
    h += '<div class="grid4" style="margin:8px 0">' +
      '<button class="btn xs" data-act="cr.amt" data-v="1000">1 k</button>' +
      '<button class="btn xs" data-act="cr.amt" data-v="100000">100 k</button>' +
      '<button class="btn xs" data-act="cr.amt" data-v="10000000">10 M</button>' +
      '<button class="btn xs" data-act="cr.amt" data-v="max">MAX</button></div>';

    h += '<div class="grid2">' +
      '<button class="btn green" data-act="cr.buy" data-id="' + id + '">Acheter</button>' +
      '<button class="btn danger" data-act="cr.sell" data-id="' + id + '"' +
      (hd.qty > 0 ? '' : ' disabled') + '>Tout vendre</button></div>';

    if (c.stake > 0) {
      h += '<div class="hr"></div><div class="card-head">🔒 Staking · ' +
        u.dec(c.stake * 100, 1) + ' %/an</div>' +
        '<div class="mute2">Les jetons bloqués produisent des récompenses chaque ' +
        'séance, mais ne peuvent pas être vendus tant qu\'ils sont immobilisés.</div>' +
        '<div class="grid2" style="margin-top:8px">' +
        '<button class="btn blue" data-act="cr.stake" data-id="' + id + '"' +
        (hd.qty > 0 ? '' : ' disabled') + '>Bloquer</button>' +
        '<button class="btn" data-act="cr.unstake" data-id="' + id + '"' +
        (hd.staked > 0 ? '' : ' disabled') + '>Débloquer</button></div>';
      if (hd.rewards > 0) {
        h += '<div class="mute2" style="margin-top:6px">Récompenses cumulées : ' +
          u.fmtNum(hd.rewards, 4) + ' ' + id + '</div>';
      }
    }

    h += '<div class="mute2" style="margin-top:8px">Frais de plateforme ' +
      u.dec(G.crypto.FEE * 100, 1) + ' %.</div>';

    ui.modal(c.icon + ' ' + u.esc(c.name), h, { onClose: function () { openCoin = null; } });
  }

  function readAmt() {
    var input = document.getElementById('cr-amt');
    var v = input ? parseFloat(input.value) : 0;
    return v > 0 ? v : 0;
  }

  ui.act('cr.open', function (d) { coinModal(d.id); });
  ui.act('cr.amt', function (d) {
    var input = document.getElementById('cr-amt');
    if (!input) return;
    input.value = d.v === 'max' ? Math.floor(G.state.money) : d.v;
  });
  ui.act('cr.buy', function (d) {
    var amt = Math.min(readAmt(), G.state.money);
    if (amt > 0 && G.crypto.buy(d.id, amt)) coinModal(d.id);
  });
  ui.act('cr.sell', function (d) { if (G.crypto.sell(d.id)) coinModal(d.id); });
  ui.act('cr.stake', function (d) {
    var hd = G.crypto.hold(d.id);
    if (G.crypto.stake(d.id, hd.qty)) coinModal(d.id);
  });
  ui.act('cr.unstake', function (d) { if (G.crypto.unstake(d.id)) coinModal(d.id); });

  /* ====================================================== COLLECTIONS ===== */

  function renderCollections() {
    var h = '';
    var val = G.eco.collectionValue();
    var gain = G.collections.totalGain();

    h += '<div class="grid3" style="margin-bottom:10px">' +
      ui.stat('Valeur', u.fmtMoney(val)) +
      ui.stat('Plus-value', u.fmtSigned(gain), ui.signCls(gain)) +
      ui.stat('Pièces', Object.keys(G.state.coll.owned).length + ' / ' +
        G.DATA.collectibles.length) +
      '</div>';

    var bonuses = G.collections.activeBonuses();
    var keys = Object.keys(bonuses);
    if (keys.length) {
      h += '<div class="card tight"><div class="card-head">✨ Bonus actifs</div>';
      for (var i = 0; i < keys.length; i++) {
        h += '<div class="row between small" style="padding:2px 0"><span>' +
          (G.DATA.bonusLabels[keys[i]] || keys[i]) + '</span><b class="' +
          (bonuses[keys[i]] >= 0 ? 'good' : 'bad') + '">' +
          u.fmtPct(bonuses[keys[i]] * 100) + '</b></div>';
      }
      h += '</div>';
    }

    for (var s = 0; s < G.DATA.collectionSets.length; s++) {
      var set = G.DATA.collectionSets[s];
      var items = G.collections.itemsOfSet(set.id);
      var owned = G.collections.ownedCount(set.id);
      var done = owned >= items.length;

      h += '<div class="card"><div class="card-head">' + set.icon + ' ' + set.name +
        '<span class="sub">' + owned + '/' + items.length + (done ? ' ✅' : '') + '</span></div>';
      h += '<div class="mute2" style="margin-bottom:6px">Série complète : ' +
        u.fmtPct(set.setBonus.value * 100) + ' de ' +
        G.DATA.bonusLabels[set.setBonus.type] + '</div>';
      for (var i2 = 0; i2 < items.length; i2++) h += collectibleRow(items[i2]);
      h += '</div>';
    }
    return h;
  }

  function collectibleRow(it) {
    var o = G.state.coll.owned[it.id];
    var price = G.collections.price(it);
    var can = G.state.money >= price;

    var h = '<div class="item"><div class="item-icon">' + (it.photo || it.icon) + '</div>' +
      '<div class="item-main"><div class="t">' + u.esc(it.name) + '</div>' +
      '<div class="s">' + u.fmtPct(it.bonus.value * 100) + ' ' +
      G.DATA.bonusLabels[it.bonus.type] +
      (o ? ' · acheté ' + u.fmtMoney(o.buy) : '') + '</div></div>';

    if (o) {
      var diff = o.value - o.buy;
      h += '<div class="item-side"><div class="small ' + ui.signCls(diff) + '">' +
        u.fmtMoney(o.value) + '</div>' +
        '<button class="btn xs" style="margin-top:4px" data-act="coll.sell" data-id="' +
        it.id + '">Vendre</button></div>';
    } else {
      h += '<div class="item-side"><button class="btn sm ' + (can ? 'primary' : '') +
        '" data-act="coll.buy" data-id="' + it.id + '"' + (can ? '' : ' disabled') + '>' +
        u.fmtMoney(price) + '</button></div>';
    }
    return h + '</div>';
  }

  ui.act('coll.buy', function (d) {
    if (G.collections.buy(d.id)) {
      ui.toast('🖼️ Acquisition', G.collections.def(d.id).name, 'good');
    }
    ui.refresh();
  });
  ui.act('coll.sell', function (d) {
    var it = G.collections.def(d.id);
    ui.confirm('Vendre aux enchères ?',
      'Vous cédez « ' + u.esc(it.name) + ' ». La maison de ventes prélève 6 % ' +
      'et vous perdez son bonus.',
      function () { G.collections.sell(d.id); ui.refresh(); }, 'Vendre');
  });

  /* ------------------------------------------------------------- vue ---- */

  G.ui.register('invest', {
    icon: '📈', label: 'Investir',
    live: true, liveEvery: 1.6,
    render: function () {
      var h = '<div class="view-title">Investissement</div>' + subTabs();
      if (sub === 'actions') h += renderStocks();
      else if (sub === 'immobilier') h += renderRealEstate();
      else if (sub === 'crypto') h += renderCrypto();
      else h += renderCollections();
      return h;
    }
  });
})();
