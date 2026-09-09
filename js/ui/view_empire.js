/* Onglet Empire : entreprises, Bourse (actions) et collections. */
window.G = window.G || {};

(function () {
  'use strict';
  var u = G.util, ui = G.ui;

  var sub = 'entreprises';
  var qty = 1;              // 1, 10, 100 ou 'max'
  var openStock = null;

  function subTabs() {
    var tabs = [
      ['entreprises', '🏢 Entreprises'],
      ['bourse', '📈 Bourse'],
      ['collections', '🖼️ Collections']
    ];
    return '<div class="sub-tabs">' + tabs.map(function (t) {
      return '<button class="sub' + (sub === t[0] ? ' active' : '') +
        '" data-act="emp.sub" data-sub="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</div>';
  }

  /* ==================================================== ENTREPRISES ====== */

  function renderBusiness() {
    var s = G.state;
    var h = '';
    var ready = G.business.readyTotal();

    h += '<div class="grid3" style="margin-bottom:10px">' +
      ui.stat('Revenu passif', u.fmtMoney(G.business.incomePerSec()) + '/s', 'good') +
      ui.stat('En caisse', u.fmtMoney(ready), ready > 0 ? 'warn' : '') +
      ui.stat('Multiplicateur', '×' + u.dec(G.business.globalMult(), 2), 'blue') +
      '</div>';

    if (ready > 0) {
      h += '<button class="btn green full" data-act="biz.collectAll" style="margin-bottom:10px">' +
        '💰 Tout encaisser · ' + u.fmtMoney(ready) + '</button>';
    }

    h += '<div class="row" style="margin-bottom:10px;gap:6px">' +
      '<span class="mute2">Acheter&nbsp;:</span>' +
      [1, 10, 100, 'max'].map(function (q) {
        return '<button class="btn xs' + (qty === q ? ' primary' : '') +
          '" data-act="biz.qty" data-q="' + q + '">' +
          (q === 'max' ? 'MAX' : '×' + q) + '</button>';
      }).join('') + '</div>';

    for (var i = 0; i < G.DATA.businesses.length; i++) {
      var b = G.DATA.businesses[i];
      if (!G.business.isVisible(b, i)) continue;
      h += businessCard(b, i);
    }

    var mult = G.eco.bonus('biz');
    if (Math.abs(mult) > 0.001 || (G.state.country && G.country.get())) {
      h += '<div class="card flat small muted">Bonus appliqués aux revenus : ' +
        'collections ' + u.fmtPct(G.eco.bonus('biz') * 100) +
        (G.state.country ? ' · conjoncture nationale ×' +
          u.dec(G.country.bizMultiplier(), 2) : '') + '.</div>';
    }
    return h;
  }

  function businessCard(b, index) {
    var o = G.business.owned(b.id);
    var lvl = o ? o.lvl : 0;

    if (!o) {
      var affordable = G.state.money >= b.cost;
      return '<div class="biz-card">' +
        '<div class="biz-tap">' + b.icon + '</div>' +
        '<div class="item-main"><div class="t">' + b.name + '</div>' +
        '<div class="s">' + u.esc(b.desc) + '</div></div>' +
        '<div class="item-side"><button class="btn sm ' +
        (affordable ? 'primary' : '') + '" data-act="biz.buy" data-id="' + b.id + '"' +
        (affordable ? '' : ' disabled') + '>' +
        '<span class="btn-col"><span>Acquérir</span><span class="k">' +
        u.fmtMoney(b.cost) + '</span></span></button></div></div>';
    }

    var n = qty === 'max' ? Math.max(1, G.business.maxAffordable(b, lvl, G.state.money)) : qty;
    var cost = G.business.bulkCost(b, lvl, n);
    var can = G.state.money >= cost;
    var prog = (o.prog / b.cycle) * 100;
    var ms = G.business.nextMilestone(lvl);
    var rev = G.business.cycleRevenue(b, o);

    var h = '<div class="biz-card' + (o.ready > 0 ? ' ready' : '') + '">';
    h += '<div class="biz-tap' + (o.mgr ? ' on' : '') + '" data-act="biz.collect" data-id="' +
      b.id + '">' + b.icon +
      (o.ready > 0 ? '<span class="badge">' + u.fmtMoney(o.ready) + '</span>' : '') +
      '</div>';

    h += '<div class="item-main">' +
      '<div class="t">' + b.name + ' <span class="pill gold">Niv. ' + lvl + '</span>' +
      (o.mgr ? ' <span class="pill green">auto</span>' : '') + '</div>' +
      '<div class="s">' + u.fmtMoney(rev) + ' / ' + b.cycle + 's · ' +
      u.fmtMoney(G.business.revenuePerSec(b, o)) + '/s' +
      (G.business.milestoneMult(lvl) > 1 ? ' · ×' + G.business.milestoneMult(lvl) : '') +
      '</div>' +
      ui.bar(prog, o.mgr ? 'green' : '') +
      (ms ? '<div class="mute2" style="margin-top:2px">Palier ×2 dans ' + ms.left +
        ' niveaux</div>' : '') +
      '</div>';

    h += '<div class="item-side">' +
      '<button class="btn sm ' + (can ? 'primary' : '') + '" data-act="biz.buy" data-id="' +
      b.id + '"' + (can ? '' : ' disabled') + '>' +
      '<span class="btn-col"><span>×' + n + '</span><span class="k">' +
      u.fmtMoney(cost) + '</span></span></button>';
    if (!o.mgr) {
      var canM = G.state.money >= b.managerCost;
      h += '<button class="btn xs" style="margin-top:5px" data-act="biz.mgr" data-id="' +
        b.id + '"' + (canM ? '' : ' disabled') + '>👔 ' + u.fmtMoney(b.managerCost) + '</button>';
    }
    h += '</div></div>';
    return h;
  }

  ui.act('emp.sub', function (d) { sub = d.sub; G.state.settings.sub = d.sub; ui.refresh(); });
  ui.act('biz.qty', function (d) {
    qty = d.q === 'max' ? 'max' : parseInt(d.q, 10);
    ui.refresh();
  });
  ui.act('biz.collect', function (d) {
    var got = G.business.collect(d.id);
    if (got > 0) ui.toast('💰 +' + u.fmtMoney(got), G.business.def(d.id).name, 'good');
    ui.refresh();
  });
  ui.act('biz.collectAll', function () { G.business.collectAll(); ui.refresh(); });
  ui.act('biz.buy', function (d) {
    var b = G.business.def(d.id);
    var o = G.business.owned(d.id);
    var lvl = o ? o.lvl : 0;
    var n = qty === 'max' ? Math.max(1, G.business.maxAffordable(b, lvl, G.state.money)) : qty;
    if (G.business.buy(d.id, n)) {
      if (!o) ui.toast('🏢 Nouvelle entreprise', b.name, 'good');
    }
    ui.refresh();
  });
  ui.act('biz.mgr', function (d) {
    if (G.business.hireManager(d.id)) {
      ui.toast('👔 Directeur recruté', G.business.def(d.id).name + ' tourne tout seul', 'good');
    }
    ui.refresh();
  });

  /* ========================================================= BOURSE ====== */

  function renderMarket() {
    var s = G.state, m = s.market;
    var pnl = G.market.totalPnl();
    var h = '';

    h += '<div class="grid3" style="margin-bottom:10px">' +
      ui.stat('Portefeuille', u.fmtMoney(G.eco.portfolioValue())) +
      ui.stat('Plus/moins-value', u.fmtSigned(pnl.abs), ui.signCls(pnl.abs)) +
      ui.stat('Humeur marché', moodLabel(m.mood), m.mood >= 0 ? 'good' : 'bad') +
      '</div>';

    /* Le lien direct entre les autres activités et la Bourse. */
    var pend = pendingList();
    if (pend.length) {
      h += '<div class="card tight" style="border-color:rgba(61,220,151,.4)">' +
        '<div class="card-head">♻️ Gains à replacer<span class="sub">' +
        'venus de vos autres activités</span></div>';
      for (var i = 0; i < pend.length; i++) {
        h += '<div class="item"><div class="item-icon">' + pend[i].meta.icon + '</div>' +
          '<div class="item-main"><div class="t">' + u.esc(pend[i].meta.label) + '</div>' +
          '<div class="s">' + u.fmtMoney(pend[i].amount) + ' disponibles</div></div>' +
          '<div class="item-side"><button class="btn sm green" data-act="mk.reinvest" ' +
          'data-src="' + u.esc(pend[i].key) + '">Investir</button></div></div>';
      }
      h += '</div>';
    }

    h += '<div class="card">';
    h += '<div class="card-head">📈 Cotation<span class="sub">séance ' +
      u.fmtDay(m.day) + '</span></div>';
    for (var j = 0; j < G.DATA.stocks.length; j++) {
      h += stockRow(G.DATA.stocks[j]);
    }
    h += '</div>';

    if (m.news.length) {
      h += '<div class="card"><div class="card-head">📰 Fil d\'actualité</div><div class="feed">';
      for (var k = 0; k < Math.min(12, m.news.length); k++) {
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
        'ou aux tables travaille désormais en Bourse.</div></div>';
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

  function pendingList() {
    var out = [];
    for (var k in G.state.pending) {
      if (G.state.pending[k] > 100) {
        out.push({ key: k, amount: G.state.pending[k], meta: G.eco.meta(k) });
      }
    }
    return u.sortBy(out, function (x) { return x.amount; }, true).slice(0, 4);
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

  /* --------------------------------------------------- fiche d'une action */

  function stockModal(id) {
    openStock = id;
    var st = G.market.def(id);
    var h = G.market.hold(id);
    var pos = G.market.positionPnl(id);
    var maxBuy = G.market.maxBuyable(id);
    var sec = G.DATA.sectors[st.sector] || G.DATA.stockSectors[st.sector] || { name: st.sector, icon: '' };

    var html = '';
    html += '<div class="row between" style="margin-bottom:8px">' +
      '<div><div style="font-size:22px;font-weight:800">' + u.fmtMoney(h.p) + '</div>' +
      '<div class="small ' + ui.signCls(G.market.dayChange(id)) + '">' +
      u.fmtPct(G.market.dayChange(id)) + ' aujourd\'hui · ' +
      u.fmtPct(G.market.trend(id, 30)) + ' sur 30 séances</div></div>' +
      '<div>' + ui.pill(sec.icon + ' ' + sec.name) + '</div></div>';

    html += '<div class="card flat tight">' + G.market.sparkline(id, 300, 70) + '</div>';

    html += '<div class="grid3" style="margin:8px 0">' +
      ui.stat('Titres détenus', h.qty) +
      ui.stat('Valorisation', u.fmtMoney(h.qty * h.p)) +
      ui.stat('Résultat', u.fmtSigned(pos.abs), ui.signCls(pos.abs)) +
      '</div>';

    html += '<div class="grid3" style="margin-bottom:8px">' +
      ui.stat('Dividende', u.dec(st.div * 100, 1) + ' %/an') +
      ui.stat('Volatilité', u.dec(st.vol * 100, 1) + ' %') +
      ui.stat('Soutien', '+' + u.dec(G.market.sectorSupport(st.sector) * 1000, 2) + '‰',
        'blue') +
      '</div>';

    html += '<label class="field">Quantité</label>' +
      '<input type="number" id="mk-qty" min="1" step="1" value="' +
      Math.max(1, Math.min(10, maxBuy)) + '">';

    html += '<div class="grid4" style="margin:8px 0">' +
      '<button class="btn xs" data-act="mk.setqty" data-v="1">1</button>' +
      '<button class="btn xs" data-act="mk.setqty" data-v="10">10</button>' +
      '<button class="btn xs" data-act="mk.setqty" data-v="100">100</button>' +
      '<button class="btn xs" data-act="mk.setqty" data-v="max">MAX</button>' +
      '</div>';

    html += '<div class="grid2">' +
      '<button class="btn green" data-act="mk.buy" data-id="' + id + '">Acheter</button>' +
      '<button class="btn danger" data-act="mk.sell" data-id="' + id + '"' +
      (h.qty > 0 ? '' : ' disabled') + '>Vendre</button></div>';
    html += '<div class="mute2" style="margin-top:6px">Frais de courtage ' +
      u.dec(G.market.FEE * 100, 1) + ' %. Achat max : ' + maxBuy + ' titres.</div>';

    var news = G.state.market.news.filter(function (n) { return n.id === id; }).slice(0, 5);
    if (news.length) {
      html += '<div class="hr"></div><div class="card-head">Actualité du titre</div><div class="feed">';
      for (var i = 0; i < news.length; i++) {
        html += '<div class="entry"><span class="m">J' + news[i].day + '</span><span>' +
          u.esc(news[i].txt) + '</span></div>';
      }
      html += '</div>';
    }

    ui.modal(st.id + ' · ' + u.esc(st.name), html, {
      after: null,
      onClose: function () { openStock = null; }
    });
  }

  function readQty(id) {
    var input = document.getElementById('mk-qty');
    var v = input ? parseInt(input.value, 10) : 1;
    if (!v || v < 1) v = 1;
    return v;
  }

  ui.act('mk.open', function (d) { stockModal(d.id); });
  ui.act('mk.setqty', function (d) {
    var input = document.getElementById('mk-qty');
    if (!input) return;
    if (d.v === 'max') input.value = Math.max(1, G.market.maxBuyable(openStock));
    else input.value = d.v;
  });
  ui.act('mk.buy', function (d) {
    if (G.market.buy(d.id, readQty(d.id))) stockModal(d.id);
  });
  ui.act('mk.sell', function (d) {
    if (G.market.sell(d.id, readQty(d.id))) stockModal(d.id);
  });

  /** Réinvestir des gains venus d'un sport, du casino ou du gouvernement. */
  function reinvestModal(srcKey) {
    var amount = G.state.pending[srcKey] || 0;
    var meta = G.eco.meta(srcKey);
    var list = u.sortBy(G.DATA.stocks.slice(), function (s) {
      return G.market.trend(s.id, 20);
    }, true);

    var html = '<p class="muted">' + meta.icon + ' <b>' + u.fmtMoney(amount) +
      '</b> gagnés grâce à « ' + u.esc(meta.label) + ' ». Choisissez la valeur ' +
      'sur laquelle placer ce capital : le montant sera investi intégralement ' +
      '(dans la limite de vos liquidités).</p>';

    html += '<div class="card tight">';
    for (var i = 0; i < Math.min(8, list.length); i++) {
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
    ui.modal('♻️ Réinvestir en Bourse', html, {});
  }

  ui.act('mk.reinvest', function (d) { reinvestModal(d.src); });
  ui.act('ui.reinvest', function (d, node) {
    var src = node.getAttribute('data-src');
    if (src) { sub = 'bourse'; ui.setTab('empire'); reinvestModal(src); }
  });
  ui.act('mk.doreinvest', function (d) {
    var amount = Math.min(G.state.pending[d.src] || 0, G.state.money);
    var h = G.market.hold(d.id);
    var n = Math.floor(amount / (h.p * (1 + G.market.FEE)));
    if (n > 0 && G.market.buy(d.id, n)) {
      ui.toast('♻️ Capital replacé', n + ' × ' + d.id + ' financés par ' +
        G.eco.meta(d.src).label, 'good');
    }
    ui.closeModal();
  });

  /* ==================================================== COLLECTIONS ====== */

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
          G.DATA.bonusLabels[keys[i]] + '</span><b class="' +
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
        '<span class="sub">' + owned + '/' + items.length +
        (done ? ' ✅' : '') + '</span></div>';
      h += '<div class="mute2" style="margin-bottom:6px">Série complète : ' +
        u.fmtPct(set.setBonus.value * 100) + ' de ' +
        G.DATA.bonusLabels[set.setBonus.type] + '</div>';

      for (var i2 = 0; i2 < items.length; i2++) {
        h += collectibleRow(items[i2]);
      }
      h += '</div>';
    }
    return h;
  }

  function collectibleRow(it) {
    var o = G.state.coll.owned[it.id];
    var price = G.collections.price(it);
    var can = G.state.money >= price;

    var h = '<div class="item"><div class="item-icon">' + it.icon + '</div>' +
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

  G.ui.register('empire', {
    icon: '🏢', label: 'Empire',
    live: true, liveEvery: 1.0,
    alert: function () { return G.business.readyTotal() > 0; },
    render: function () {
      var h = '<div class="view-title">Empire</div>' + subTabs();
      if (sub === 'entreprises') h += renderBusiness();
      else if (sub === 'bourse') h += renderMarket();
      else h += renderCollections();
      return h;
    }
  });
})();
