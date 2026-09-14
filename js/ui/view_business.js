/* Onglet Entreprises : catalogue, fondation, investissement, fusions. */
window.G = window.G || {};

(function () {
  'use strict';
  var u = G.util, ui = G.ui;

  var openUid = null;
  var foundType = null;

  /* ============================================================ LISTE ===== */

  function render() {
    var h = '<div class="view-title">Entreprise</div>';

    /* Bandeau de revenus, façon tableau de bord. */
    var hourly = G.business.totalHourly();
    var rent = G.realestate.totalHourly();
    h += '<div class="card hero">' +
      '<div class="hero-v">' + u.fmtMoney(hourly + rent) + '</div>' +
      '<div class="hero-l">Revenu total par heure</div>' +
      '<div class="mute2" style="margin-top:8px">Versé en continu sur votre compte, ' +
      'seconde après seconde.</div>' +
      '</div>';

    h += '<div class="card tight" style="margin-bottom:10px">' +
      '<div class="row between"><span class="mute2">💰 Compte en banque</span>' +
      '<b class="good" style="font-size:16px">' + u.fmtMoney(G.state.money) + '</b></div></div>';

    h += taxCard();

    h += '<div class="grid2" style="margin-bottom:10px">' +
      '<button class="btn primary" data-act="bz.found">🏗️ Fonder une entreprise</button>' +
      '<button class="btn" data-act="bz.merge"' +
      (G.business.canMergeAny() ? '' : ' disabled') + '>🤝 Fusions</button>' +
      '</div>';

    /* Emplacements commerciaux. */
    var used = G.business.count(), slots = G.business.slots();
    h += '<div class="card tight"><div class="row between">' +
      '<div><b>Emplacements commerciaux</b>' +
      '<div class="mute2">' + used + ' occupé(s) sur ' + slots + '</div></div>' +
      (slots < G.DATA.slotMax
        ? '<button class="btn sm" data-act="bz.slot">+1 · ' +
          u.fmtMoney(G.business.slotCost()) + '</button>'
        : '<span class="pill gold">maximum</span>') +
      '</div></div>';

    /* Mes entreprises. */
    h += '<div class="row between" style="margin:14px 0 8px">' +
      '<b style="font-size:17px">Mes entreprises</b>' +
      '<span class="mute2">' + used + '/' + slots + '</span></div>';

    var list = G.business.all();
    if (!list.length) {
      h += ui.empty('🏢', 'Aucune entreprise. Fondez-en une pour commencer.');
    }
    for (var i = 0; i < list.length; i++) h += companyCard(list[i]);

    return h;
  }

  /* ============================================================= IMPÔTS === */

  function taxCard() {
    var t = G.state.tax;
    if (!t) return '';
    if (t.due <= 0) {
      return '<div class="card tight" style="margin-bottom:10px">' +
        '<div class="row between"><span class="mute2">🧾 Prochains impôts</span>' +
        '<b>' + u.fmtDuration(Math.max(0, t.dueIn) * 1000) + '</b></div>' +
        '<div class="mute2" style="margin-top:2px">' + u.dec(G.tax.RATE * 100, 0) +
        ' % des revenus accumulés depuis la dernière échéance.</div></div>';
    }
    var cls = t.overdue ? 'bad' : '';
    return '<div class="card tight" style="margin-bottom:10px;' +
      (t.overdue ? 'border-color:rgba(255,107,107,.5)' : 'border-color:rgba(240,180,41,.4)') + '">' +
      '<div class="row between"><b class="' + cls + '">🧾 Impôts dus : ' +
      u.fmtMoney(t.due) + '</b></div>' +
      '<div class="mute2" style="margin-top:2px">' +
      (t.overdue
        ? 'Revenus bloqués : entreprises et loyers sont à l\'arrêt.'
        : 'Sursis : ' + u.fmtDuration(Math.max(0, t.graceLeft) * 1000) + ' restants.') +
      '</div>' +
      '<button class="btn sm full ' + (t.overdue ? 'danger' : 'primary') +
      '" style="margin-top:6px" data-act="tx.pay">Payer maintenant</button></div>';
  }

  ui.act('tx.open', function () {
    var t = G.state.tax;
    if (!t || t.due <= 0) { ui.setTab('empire'); return; }
    ui.confirm('🧾 Payer les impôts ?',
      'Montant dû : ' + u.fmtMoney(t.due) + '.' +
      (t.overdue ? ' Vos revenus sont actuellement bloqués jusqu\'au paiement.' : ''),
      function () { if (G.tax.pay()) ui.refresh(); }, 'Payer');
  });
  ui.act('tx.pay', function () {
    if (G.tax.pay()) ui.refresh();
  });

  function companyCard(c) {
    var t = G.business.typeDef(c.type);
    if (!t) return '';
    var sector = G.DATA.sectors[t.sector] || { name: '', icon: '' };
    var maxed = c.lvl >= t.maxLvl;
    var can = G.state.money >= G.business.upgradeCost(c);
    var upgrading = G.business.isUpgrading(c);

    return '<div class="co-card" data-act="bz.open" data-uid="' + c.uid + '">' +
      '<div class="co-icon">' + t.icon + '</div>' +
      '<div class="item-main">' +
      '<div class="t">' + u.esc(c.name) + '</div>' +
      '<div class="s">' + t.name + ' · ' + sector.icon + ' ' + sector.name + '</div>' +
      '<div class="mute2" style="margin-top:3px">' +
      '📊 ' + c.lvl + ' sur ' + t.maxLvl +
      (c.merged > 1 ? ' · fusion ×' + u.dec(c.merged, 2) : '') + '</div>' +
      ui.bar(c.lvl / t.maxLvl * 100, maxed ? 'green' : '') +
      (upgrading
        ? '<div class="mute2" style="margin-top:3px">🔨 Chantier · niveau ' +
          c.upgrade.toLvl + ' dans ' + u.fmtDuration(G.business.upgradeRemaining(c) * 1000) +
          '</div>' + ui.bar(G.business.upgradeProgress(c) * 100)
        : '<div class="co-rev">' + u.fmtMoney(G.business.hourly(c)) +
          ' <span class="mute2">par heure</span></div>') +
      '</div>' +
      '<div class="item-side">' +
      (upgrading ? '<span class="pill gold">🔨</span>' :
        maxed ? '<span class="pill green">max</span>'
        : '<span class="co-badge' + (can ? ' on' : '') + '">+</span>') +
      '</div></div>';
  }

  /* ========================================================= FONDATION ==== */

  function foundModal() {
    var cat = G.business.catalog();
    var h = '<p class="muted">Choisissez le type d\'entreprise, puis donnez-lui ' +
      'le nom que vous voulez.</p>';

    if (G.business.count() >= G.business.slots()) {
      h += '<div class="card tight bad">Tous vos emplacements commerciaux sont ' +
        'occupés. Achetez-en un nouveau pour fonder une entreprise de plus.</div>';
    }

    var bySector = {};
    for (var i = 0; i < cat.length; i++) {
      var t = cat[i];
      if (!bySector[t.sector]) bySector[t.sector] = [];
      bySector[t.sector].push(t);
    }
    for (var sec in bySector) {
      var sd = G.DATA.sectors[sec];
      h += '<div class="card-head" style="margin-top:10px">' + sd.icon + ' ' + sd.name + '</div>';
      for (var j = 0; j < bySector[sec].length; j++) {
        var ty = bySector[sec][j];
        var can = G.state.money >= ty.cost;
        h += '<div class="item"><div class="item-icon">' + ty.icon + '</div>' +
          '<div class="item-main"><div class="t">' + ty.name + '</div>' +
          '<div class="s">' + u.esc(ty.desc) + '</div>' +
          '<div class="mute2">' + u.fmtMoney(ty.rev) + '/h au niveau 1 · ' +
          ty.maxLvl + ' paliers</div></div>' +
          '<div class="item-side"><button class="btn sm ' + (can ? 'primary' : '') +
          '" data-act="bz.pick" data-id="' + ty.id + '"' + (can ? '' : ' disabled') + '>' +
          u.fmtMoney(ty.cost) + '</button></div></div>';
      }
    }
    ui.modal('🏗️ Fonder une entreprise', h, {});
  }

  ui.act('bz.found', function () { foundModal(); });

  ui.act('bz.pick', function (d) {
    foundType = d.id;
    var t = G.business.typeDef(d.id);
    var suggested = G.business.suggestName(d.id);
    var h = '<div class="row" style="gap:10px;margin-bottom:10px">' +
      '<div style="font-size:34px">' + t.icon + '</div>' +
      '<div><div class="t" style="font-weight:700">' + t.name + '</div>' +
      '<div class="mute2">' + u.esc(t.desc) + '</div></div></div>';
    h += '<label class="field">Nom de votre entreprise</label>' +
      '<input type="text" id="bz-name" maxlength="28" value="' + u.esc(suggested) + '">' +
      '<div class="row" style="gap:6px;margin-top:6px">' +
      '<button class="btn xs" data-act="bz.suggest">🎲 Autre proposition</button></div>';
    h += '<div class="grid2" style="margin-top:12px">' +
      ui.stat('Capital requis', u.fmtMoney(t.cost)) +
      ui.stat('Revenu de départ', u.fmtMoney(t.rev) + '/h', 'good') + '</div>';
    h += '<button class="btn primary full" style="margin-top:12px" data-act="bz.create">' +
      'Créer l\'entreprise</button>';
    ui.modal('Nouvelle entreprise', h, {});
  });

  ui.act('bz.suggest', function () {
    var input = document.getElementById('bz-name');
    if (input) input.value = G.business.suggestName(foundType);
  });

  ui.act('bz.create', function () {
    var input = document.getElementById('bz-name');
    var name = input ? input.value.trim() : '';
    var c = G.business.found(foundType, name);
    if (c) {
      ui.closeModal();
      ui.toast('🏢 Entreprise fondée', c.name, 'good');
      openCompany(c.uid);
    }
  });

  ui.act('bz.slot', function () {
    var cost = G.business.slotCost();
    ui.confirm('Acheter un emplacement ?',
      'Un emplacement supplémentaire vous permet de posséder une entreprise de ' +
      'plus. Coût : ' + u.fmtMoney(cost) + '.',
      function () { G.business.buySlot(); ui.refresh(); }, 'Acheter');
  });

  /* ==================================================== FICHE ENTREPRISE == */

  function companyDetailHtml(uid) {
    var c = G.business.byUid(uid);
    if (!c) return '';
    var t = G.business.typeDef(c.type);
    var sector = G.DATA.sectors[t.sector];
    var maxed = c.lvl >= t.maxLvl;
    var upgrading = G.business.isUpgrading(c);

    var h = '<div class="row" style="gap:10px;margin-bottom:10px">' +
      '<div class="co-icon big">' + t.icon + '</div>' +
      '<div style="flex:1;min-width:0">' +
      '<div style="font-size:18px;font-weight:800">' + u.esc(c.name) + '</div>' +
      '<div class="mute2">' + t.name + ' · ' + sector.icon + ' ' + sector.name + '</div>' +
      '</div>' +
      '<button class="btn xs" data-act="bz.rename" data-uid="' + uid + '">✏️</button>' +
      '</div>';

    h += '<div class="grid3" style="margin-bottom:10px">' +
      ui.stat('Revenu horaire', u.fmtMoney(G.business.hourly(c)), 'good') +
      ui.stat('Niveau', c.lvl + ' / ' + t.maxLvl) +
      ui.stat('Capital investi', u.fmtMoney(c.invested)) +
      '</div>';

    h += ui.bar(c.lvl / t.maxLvl * 100, maxed ? 'green' : '');

    var ms = G.business.nextMilestone(c.lvl);
    if (ms) {
      h += '<div class="mute2" style="margin-top:6px">Palier ×2 au niveau ' + ms.at +
        ' (encore ' + ms.left + ' investissement' + (ms.left > 1 ? 's' : '') + ')</div>';
    }
    if (G.business.milestoneMult(c.lvl) > 1) {
      h += '<div class="mute2">Bonus de paliers actif : ×' +
        G.business.milestoneMult(c.lvl) + '</div>';
    }
    if (c.merged > 1) {
      h += '<div class="mute2">Bonus de fusion : ×' + u.dec(c.merged, 2) + '</div>';
    }

    if (upgrading) {
      h += '<div class="card-head" style="margin-top:14px">🔨 Chantier en cours</div>';
      h += '<div class="mute2" style="margin-bottom:6px">Niveau ' + c.lvl + ' → ' +
        c.upgrade.toLvl + ' · prêt dans ' +
        u.fmtDuration(G.business.upgradeRemaining(c) * 1000) + '</div>';
      h += ui.bar(G.business.upgradeProgress(c) * 100);
    } else if (!maxed) {
      h += '<div class="card-head" style="margin-top:14px">💵 Investir</div>';
      h += '<div class="mute2" style="margin-bottom:6px">Un seul palier à la fois : ' +
        'l\'investissement lance un chantier, plus long pour les paliers qui ' +
        'franchissent un cap de rendement.</div>';
      h += upBtn(uid, G.business.upgradeCost(c), G.business.upgradeDuration(c));
    } else {
      h += '<div class="card tight good" style="margin-top:12px">' +
        'Entreprise développée au maximum. Vous pouvez la fusionner avec une ' +
        'entreprise identique pour dépasser ce plafond.</div>';
      var cands = G.business.mergeCandidates(c);
      if (cands.length) {
        h += '<div class="card-head" style="margin-top:10px">🤝 Fusion possible</div>';
        for (var i = 0; i < cands.length; i++) {
          h += '<div class="item"><div class="item-main"><div class="t">' +
            u.esc(cands[i].name) + '</div><div class="s">niveau max · revenu ' +
            u.fmtMoney(G.business.hourly(cands[i])) + '/h</div></div>' +
            '<div class="item-side"><button class="btn sm primary" data-act="bz.domerge" ' +
            'data-a="' + uid + '" data-b="' + cands[i].uid + '">Fusionner</button></div></div>';
        }
      }
    }

    h += '<div class="hr"></div>';
    h += '<div class="grid2">' +
      '<button class="btn" data-act="bz.rename" data-uid="' + uid + '">✏️ Renommer</button>' +
      '<button class="btn danger" data-act="bz.sell" data-uid="' + uid + '">' +
      '💱 Vendre (' + u.fmtMoney(G.business.saleValue(c)) + ')</button></div>';

    return h;
  }

  function openCompany(uid) {
    openUid = uid;
    var c = G.business.byUid(uid);
    if (!c) return;
    var t = G.business.typeDef(c.type);
    var sinceTick = 0;
    ui.modal(t.icon + ' ' + u.esc(c.name), companyDetailHtml(uid), {
      tick: function (dt) {
        if (!G.business.isUpgrading(c)) return;
        sinceTick += dt;
        if (sinceTick < 1) return;
        sinceTick = 0;
        if (openUid === uid) ui.modalUpdate(companyDetailHtml(uid));
      }
    });
  }

  function upBtn(uid, cost, duration) {
    var can = G.state.money >= cost;
    return '<button class="btn full ' + (can ? 'primary' : '') + '" data-act="bz.invest" ' +
      'data-uid="' + uid + '"' + (can ? '' : ' disabled') + '>' +
      '<span class="btn-col"><span>+1 palier</span>' +
      '<span class="k">' + u.fmtMoney(cost) + '</span>' +
      '<span class="k">⏱ ' + u.fmtDuration(duration * 1000) + '</span>' +
      '</span></button>';
  }

  ui.act('bz.open', function (d) { openCompany(d.uid); });

  ui.act('bz.invest', function (d) {
    if (G.business.invest(d.uid)) openCompany(d.uid);
  });

  ui.act('bz.rename', function (d) {
    var c = G.business.byUid(d.uid);
    if (!c) return;
    ui.modal('✏️ Renommer', '<label class="field">Nouveau nom</label>' +
      '<input type="text" id="bz-newname" maxlength="28" value="' + u.esc(c.name) + '">' +
      '<button class="btn primary full" style="margin-top:12px" data-act="bz.dorename" ' +
      'data-uid="' + d.uid + '">Valider</button>', {});
  });

  ui.act('bz.dorename', function (d) {
    var input = document.getElementById('bz-newname');
    if (input && input.value.trim()) {
      G.business.rename(d.uid, input.value.trim());
      openCompany(d.uid);
    }
  });

  ui.act('bz.sell', function (d) {
    var c = G.business.byUid(d.uid);
    if (!c) return;
    ui.confirm('Vendre ' + u.esc(c.name) + ' ?',
      'Vous récupérez ' + u.fmtMoney(G.business.saleValue(c)) +
      ' et libérez un emplacement commercial.',
      function () { G.business.sell(d.uid); ui.refresh(); }, 'Vendre');
  });

  /* ============================================================ FUSIONS === */

  ui.act('bz.merge', function () {
    var list = G.business.all();
    var h = '<p class="muted">Deux entreprises identiques arrivées au niveau ' +
      'maximum peuvent fusionner : le rendement se cumule et un emplacement ' +
      'se libère.</p>';
    var found = false;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var t = G.business.typeDef(c.type);
      if (c.lvl < t.maxLvl) continue;
      var cands = G.business.mergeCandidates(c);
      if (!cands.length) continue;
      found = true;
      h += '<div class="card tight"><div class="t">' + t.icon + ' ' + u.esc(c.name) + '</div>';
      for (var j = 0; j < cands.length; j++) {
        h += '<div class="item"><div class="item-main"><div class="s">fusionner avec ' +
          u.esc(cands[j].name) + '</div></div>' +
          '<div class="item-side"><button class="btn xs primary" data-act="bz.domerge" ' +
          'data-a="' + c.uid + '" data-b="' + cands[j].uid + '">Fusionner</button></div></div>';
      }
      h += '</div>';
    }
    if (!found) h += ui.empty('🤝', 'Aucune fusion possible pour le moment.');
    ui.modal('🤝 Fusions d\'entreprises', h, {});
  });

  ui.act('bz.domerge', function (d) {
    if (G.business.merge(d.a, d.b)) {
      ui.closeModal();
      ui.refresh();
    }
  });

  /* ------------------------------------------------------------- vue ---- */

  G.ui.register('empire', {
    icon: '🏢', label: 'Entreprise',
    live: true, liveEvery: 1.0,
    render: render
  });
})();
