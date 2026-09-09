/* Onglet Pays : simulation de gouvernement. */
window.G = window.G || {};

(function () {
  'use strict';
  var u = G.util, ui = G.ui;

  var sub = 'tableau';

  /* ======================================================== CAMPAGNE ===== */

  function renderCampaign() {
    var cost = G.country.campaignCost();
    var h = '<div class="card"><div class="card-head">🏛️ Entrer en politique</div>' +
      '<div class="mute2">Votre fortune peut acheter autre chose que des usines : ' +
      'une campagne électorale. À la tête d\'un pays, vous fixez les impôts et les ' +
      'budgets, vous votez des lois — et l\'économie nationale se répercute ' +
      'directement sur vos entreprises et sur la Bourse.</div>' +
      '<div class="row between" style="margin-top:10px">' +
      '<span>Budget de campagne</span><b class="' +
      (G.country.canRun() ? 'good' : 'bad') + '">' + u.fmtMoney(cost) + '</b></div></div>';

    for (var i = 0; i < G.DATA.countries.length; i++) {
      var c = G.DATA.countries[i];
      var gdp = c.pop * 1e6 * c.gdpPerCap;
      h += '<div class="card"><div class="row">' +
        '<div class="item-icon" style="font-size:30px">' + c.icon + '</div>' +
        '<div class="item-main"><div class="t">' + c.name + '</div>' +
        '<div class="s">' + c.style + '</div>' +
        '<div class="mute2">' + u.dec(c.pop, 1) + ' M habitants · PIB ' +
        u.fmtMoney(gdp) + ' · ' + u.fmtMoney(c.gdpPerCap) + ' par habitant</div></div>' +
        '<div class="item-side"><button class="btn sm ' +
        (G.country.canRun() ? 'primary' : '') + '" data-act="ct.elect" data-id="' + c.id + '"' +
        (G.country.canRun() ? '' : ' disabled') + '>Se présenter</button></div>' +
        '</div></div>';
    }
    return h;
  }

  ui.act('ct.elect', function (d) {
    var c = G.country.defOf(d.id);
    ui.confirm('Se présenter en ' + c.name + ' ?',
      'Budget de campagne : ' + u.fmtMoney(G.country.campaignCost()) +
      '. Mandat de ' + G.country.TERM_MONTHS + ' mois, réélection soumise à votre bilan.',
      function () {
        if (G.country.elect(d.id)) {
          ui.toast('🗳️ Élu !', 'Vous dirigez ' + c.name, 'good');
        }
        ui.refresh();
      }, 'Lancer la campagne');
  });

  /* ==================================================== TABLEAU DE BORD == */

  function gauge(label, value, max, cls, suffix) {
    return '<div style="margin-bottom:7px">' +
      '<div class="row between small"><span>' + label + '</span><b>' +
      (typeof value === 'number' ? u.dec(value, value < 10 ? 1 : 0) : value) +
      (suffix || '') + '</b></div>' +
      ui.bar(value / max * 100, cls) + '</div>';
  }

  function renderDash(c) {
    var h = '';
    var bal = G.country.balance(c);

    h += '<div class="card"><div class="row">' +
      '<div class="item-icon" style="font-size:30px">' + c.icon + '</div>' +
      '<div class="item-main"><div class="t">' + c.name + '</div>' +
      '<div class="s">Mandat ' + c.term + ' · mois ' + (c.monthsInTerm + 1) + '/' +
      G.country.TERM_MONTHS + ' · ' + u.dec(c.pop, 1) + ' M habitants</div></div>' +
      '<div class="item-side"><div class="ov ' +
      (c.ind.popularite >= 55 ? 'e1' : c.ind.popularite >= 40 ? 'e2' : 'e4') + '">' +
      Math.round(c.ind.popularite) + '</div><div class="mute2">popularité</div></div>' +
      '</div></div>';

    h += '<div class="grid3" style="margin-bottom:10px">' +
      ui.stat('PIB', u.fmtMoney(c.gdp)) +
      ui.stat('Croissance', u.dec(c.ind.croissance, 2) + ' %',
        c.ind.croissance > 0 ? 'good' : 'bad') +
      ui.stat('Chômage', u.dec(c.ind.chomage, 1) + ' %',
        c.ind.chomage < 8 ? 'good' : 'bad') +
      '</div>';

    h += '<div class="grid3" style="margin-bottom:10px">' +
      ui.stat('Inflation', u.dec(c.ind.inflation, 1) + ' %',
        c.ind.inflation < 4 ? '' : 'bad') +
      ui.stat('Dette / PIB', u.dec(G.country.debtRatio(c), 0) + ' %',
        G.country.debtRatio(c) < 90 ? '' : 'bad') +
      ui.stat('Trésor', u.fmtMoney(c.treasury)) +
      '</div>';

    h += '<div class="card"><div class="card-head">📊 Budget mensuel</div>' +
      '<div class="row between"><span>Recettes fiscales</span><b class="good">' +
      u.fmtMoney(G.country.revenue(c)) + '</b></div>' +
      '<div class="row between"><span>Dépenses publiques</span><b class="bad">' +
      u.fmtMoney(G.country.spending(c)) + '</b></div>' +
      '<div class="hr"></div>' +
      '<div class="row between"><b>Solde</b><b class="' + ui.signCls(bal) + '">' +
      u.fmtSigned(bal) + '</b></div>' +
      '<button class="btn primary full" style="margin-top:10px" data-act="ct.month">' +
      '📅 Valider le mois</button>' +
      '<button class="btn full" style="margin-top:6px" data-act="ct.year">' +
      '⏩ Passer 12 mois</button></div>';

    h += '<div class="card"><div class="card-head">🩺 Indicateurs sociaux</div>' +
      gauge('Santé', c.ind.sante, 100, 'green') +
      gauge('Éducation', c.ind.education, 100, 'green') +
      gauge('Sécurité', c.ind.securite, 100, 'blue') +
      gauge('Infrastructures', c.ind.infra, 100, 'blue') +
      gauge('Protection sociale', c.ind.social, 100, 'green') +
      gauge('Innovation', c.ind.innovation, 100) +
      gauge('Stabilité politique', c.ind.stabilite, 100,
        c.ind.stabilite > 45 ? '' : 'red') +
      '</div>';

    h += '<div class="card"><div class="card-head">🤝 Votre empire et l\'État</div>' +
      '<div class="mute2">Effet actuel sur vos affaires : entreprises ×' +
      u.dec(G.country.bizMultiplier(), 2) + ' · humeur des marchés ' +
      (G.country.marketEffect() >= 0 ? '+' : '') +
      u.dec(G.country.marketEffect() * 100, 1) + '</div>' +
      '<div class="grid2" style="margin-top:9px">' +
      '<button class="btn sm" data-act="ct.salary">💼 Percevoir le traitement</button>' +
      '<button class="btn sm" data-act="ct.subsidy">💰 Plan de soutien</button>' +
      '</div>' +
      '<button class="btn sm full" style="margin-top:6px" data-act="ct.inject">' +
      '🎁 Donner au Trésor public</button>' +
      '<div class="mute2" style="margin-top:6px">Le plan de soutien booste vos ' +
      'entreprises de 25 % pendant six mois, coûte ' + u.fmtMoney(c.gdp * 0.004) +
      ' au Trésor et 5 points de popularité.</div></div>';

    if (c.journal.length) {
      h += '<div class="card"><div class="card-head">📰 Journal du mandat</div><div class="feed">';
      for (var i = 0; i < Math.min(12, c.journal.length); i++) {
        h += '<div class="entry"><span class="m">M' + c.journal[i].m + '</span><span>' +
          u.esc(c.journal[i].txt) + '</span></div>';
      }
      h += '</div></div>';
    }
    return h;
  }

  /* ========================================================== BUDGETS ==== */

  function renderBudget(c) {
    var h = '<div class="card"><div class="card-head">💶 Fiscalité</div>';
    var taxes = [['corp', 'Impôt sur les sociétés'], ['income', 'Impôt sur le revenu'],
    ['vat', 'TVA']];
    for (var i = 0; i < taxes.length; i++) {
      var k = taxes[i][0];
      h += '<div style="margin-bottom:10px">' +
        '<div class="row between small"><span>' + taxes[i][1] + '</span>' +
        '<b id="tax-' + k + '-v">' + c.taxes[k] + ' %</b></div>' +
        '<input type="range" min="0" max="60" step="1" value="' + c.taxes[k] +
        '" data-live="ct.taxlive" data-change="ct.tax" data-k="' + k + '">' +
        '</div>';
    }
    h += '<div class="mute2">Un impôt sur les sociétés élevé pèse aussi sur ' +
      '<b>vos</b> entreprises. Au-delà d\'un certain niveau, le rendement fiscal ' +
      'diminue et la popularité s\'effondre.</div></div>';

    h += '<div class="card"><div class="card-head">🏛️ Budgets des ministères' +
      '<span class="sub">' + u.dec(G.country.totalBudget(c) * 100, 1) +
      ' % du PIB</span></div>';
    for (var j = 0; j < G.DATA.ministries.length; j++) {
      var m = G.DATA.ministries[j];
      var v = c.budgets[m.id] || 0;
      var pct = (v * 100);
      var ratio = v / m.need;
      h += '<div style="margin-bottom:12px">' +
        '<div class="row between small"><span>' + m.icon + ' ' + m.name +
        ' <span class="mute2">(référence ' + u.dec(m.need * 100, 1) + ' %)</span></span>' +
        '<b id="bud-' + m.id + '-v" class="' +
        (ratio > 1.05 ? 'good' : ratio < 0.9 ? 'bad' : '') + '">' +
        u.dec(pct, 1) + ' % · ' + u.fmtMoney(c.gdp * v / 12) + '</b></div>' +
        '<input type="range" min="0" max="' + Math.round(m.need * 300) +
        '" step="1" value="' + Math.round(pct * 10) +
        '" data-live="ct.budlive" data-change="ct.bud" data-k="' + m.id +
        '" data-gdp="' + c.gdp + '">' +
        '<div class="mute2">' + m.desc + '</div></div>';
    }
    return h + '</div>';
  }

  ui.act('ct.taxlive', function (d, node) {
    var lbl = document.getElementById('tax-' + d.k + '-v');
    if (lbl) lbl.textContent = node.value + ' %';
  });
  ui.act('ct.tax', function (d, node) {
    G.country.setTax(d.k, parseInt(node.value, 10));
  });
  ui.act('ct.budlive', function (d, node) {
    var lbl = document.getElementById('bud-' + d.k + '-v');
    var v = parseInt(node.value, 10) / 1000;
    if (lbl) {
      lbl.textContent = u.dec(v * 100, 1) + ' % · ' +
        u.fmtMoney(parseFloat(d.gdp) * v / 12);
    }
  });
  ui.act('ct.bud', function (d, node) {
    G.country.setBudget(d.k, parseInt(node.value, 10) / 1000);
  });

  /* ============================================================= LOIS ==== */

  function renderLaws(c) {
    var h = '<div class="card"><div class="card-head">⚖️ Lois</div>' +
      '<div class="mute2">Chaque loi a un effet durable sur le pays… et souvent ' +
      'sur vos propres intérêts. Le coût politique est immédiat.</div></div>';

    for (var i = 0; i < G.DATA.laws.length; i++) {
      var l = G.DATA.laws[i];
      var active = !!c.laws[l.id];
      h += '<div class="card' + (active ? '' : ' flat') + '"><div class="row">' +
        '<div class="item-icon">' + l.icon + '</div>' +
        '<div class="item-main"><div class="t">' + l.name +
        (active ? ' <span class="pill green">en vigueur</span>' : '') + '</div>' +
        '<div class="s">' + u.esc(l.desc) + '</div>' +
        '<div class="mute2">Popularité ' + (l.pop >= 0 ? '+' : '') + l.pop +
        ' · coût budgétaire ' + (l.cost > 0 ? u.dec(l.cost * 100, 1) + ' % du PIB'
          : l.cost < 0 ? 'recette ' + u.dec(-l.cost * 100, 1) + ' %' : 'nul') +
        '</div></div>' +
        '<div class="item-side"><button class="btn sm ' + (active ? 'danger' : 'primary') +
        '" data-act="' + (active ? 'ct.repeal' : 'ct.vote') + '" data-id="' + l.id + '">' +
        (active ? 'Abroger' : 'Voter') + '</button></div></div></div>';
    }
    return h;
  }

  ui.act('ct.vote', function (d) {
    if (G.country.voteLaw(d.id)) {
      var l = G.country.lawDef(d.id);
      ui.toast('⚖️ Loi promulguée', l.name, l.pop >= 0 ? 'good' : 'bad');
    }
    ui.refresh();
  });
  ui.act('ct.repeal', function (d) {
    G.country.repealLaw(d.id);
    ui.refresh();
  });

  /* ========================================================== ACTIONS ==== */

  ui.act('ct.month', function () { advance(1); });
  ui.act('ct.year', function () { advance(12); });

  function advance(n) {
    var reports = [];
    for (var i = 0; i < n; i++) {
      if (!G.country.get()) break;
      var r = G.country.endMonth();
      if (r) reports.push(r);
      if (r && (r.ousted || (r.election && !r.election.won))) break;
    }
    var c = G.country.get();
    var last = reports[reports.length - 1];
    if (!c) {
      ui.modal('🏛️ Fin de parcours',
        '<p class="muted">Votre mandat s\'achève ici. Vous pouvez repartir en ' +
        'campagne quand vous voulez — la fortune, elle, reste.</p>' +
        '<button class="btn full" data-act="ui.close">Fermer</button>', {});
    } else if (last) {
      var html = '<div class="grid3">' +
        ui.stat('Popularité', Math.round(c.ind.popularite),
          c.ind.popularite >= 45 ? 'good' : 'bad') +
        ui.stat('Croissance', u.dec(c.ind.croissance, 2) + ' %') +
        ui.stat('Solde', u.fmtSigned(last.balance), ui.signCls(last.balance)) +
        '</div><div class="card flat" style="margin-top:10px">' +
        reports.slice(-6).map(function (r) {
          return '<div class="entry"><span class="m">M' + r.month + '</span><span>' +
            u.esc(r.events.join(' · ')) + '</span></div>';
        }).join('') + '</div>' +
        '<button class="btn full" style="margin-top:10px" data-act="ui.close">Continuer</button>';
      ui.modal('📅 ' + (n > 1 ? n + ' mois écoulés' : 'Conseil des ministres'), html, {});
    }
    ui.refresh();
  }

  ui.act('ct.salary', function () {
    if (G.country.drawSalary()) ui.refresh();
  });
  ui.act('ct.subsidy', function () {
    var c = G.country.get();
    ui.confirm('Lancer un plan de soutien ?',
      'Le Trésor verse ' + u.fmtMoney(c.gdp * 0.004) + ' à l\'économie. Vos ' +
      'entreprises produisent 25 % de plus pendant six mois, mais l\'opinion ' +
      'y voit un conflit d\'intérêts (-5 points).',
      function () { G.country.subsidize(); ui.refresh(); }, 'Signer le décret');
  });
  ui.act('ct.inject', function () {
    var c = G.country.get();
    var suggested = Math.min(G.state.money, c.gdp * 0.002);
    ui.modal('🎁 Don au Trésor public',
      '<p class="muted">Un versement personnel renfloue les caisses et fait ' +
      'grimper votre popularité.</p>' +
      '<label class="field">Montant</label>' +
      '<input type="number" id="ct-amount" value="' + Math.round(suggested) + '">' +
      '<button class="btn primary full" style="margin-top:10px" data-act="ct.doinject">' +
      'Verser</button>', {});
  });
  ui.act('ct.doinject', function () {
    var input = document.getElementById('ct-amount');
    var v = input ? parseFloat(input.value) : 0;
    if (v > 0 && G.country.injectFunds(v)) {
      ui.toast('🤝 Don effectué', 'Votre cote de popularité grimpe', 'good');
    }
    ui.closeModal();
  });

  /* ------------------------------------------------------------- vue ---- */

  function subTabs() {
    var tabs = [['tableau', '📊 Tableau de bord'], ['budget', '💶 Budget'],
    ['lois', '⚖️ Lois']];
    return '<div class="sub-tabs">' + tabs.map(function (t) {
      return '<button class="sub' + (sub === t[0] ? ' active' : '') +
        '" data-act="ct.sub" data-sub="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</div>';
  }
  ui.act('ct.sub', function (d) { sub = d.sub; ui.refresh(); });

  G.ui.register('pays', {
    icon: '🏛️', label: 'Pays',
    render: function () {
      var c = G.country.get();
      var h = '<div class="view-title">Gouvernement</div>';
      if (!c) return h + renderCampaign();
      h += subTabs();
      if (sub === 'budget') h += renderBudget(c);
      else if (sub === 'lois') h += renderLaws(c);
      else h += renderDash(c);
      return h;
    }
  });
})();
