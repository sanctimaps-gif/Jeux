/* Onglet Pays : mappemonde interactive et gestion complète d'un État. */
window.G = window.G || {};

(function () {
  'use strict';
  var u = G.util, ui = G.ui;

  var sub = 'carte';
  var selected = null;        // code pays sélectionné sur la carte
  var view = { x: 0, y: 0, k: 1 };
  var search = '';
  var autoAdvance = false;    // automatisation de la progression du temps
  var autoAdvanceInterval = 6000;  // intervalle en ms entre chaque avancement (6s par défaut)
  var autoTimer = null;       // identifiant du timer d'auto-avancement

  var MAP = G.DATA.mapSize;

  function proj(lat, lon) {
    return {
      x: (lon + 180) / 360 * MAP.w,
      y: (MAP.latMax - lat) / (MAP.latMax - MAP.latMin) * MAP.h
    };
  }

  /* ============================================================ CARTE ===== */

  /** Classe CSS d'un pays selon sa situation vis-à-vis du joueur. */
  function classOf(code) {
    var n = G.nation.get();
    if (!n) return 'c-neutral';
    if (G.nation.controls(code)) return 'c-mine';
    if (n.allies[code]) return 'c-ally';
    if (G.nation.warWith(code)) return 'c-war';
    var w = n.world[code];
    if (!w) return 'c-neutral';
    if (w.rel > 40) return 'c-friend';
    if (w.rel < -35) return 'c-hostile';
    return 'c-neutral';
  }

  function mapSvg() {
    var paths = G.DATA.mapPaths;
    var out = ['<svg class="worldmap" id="worldmap" viewBox="0 0 ' + MAP.w + ' ' + MAP.h +
      '" preserveAspectRatio="xMidYMid slice">',
      '<rect x="0" y="0" width="' + MAP.w + '" height="' + MAP.h + '" fill="#0b1622"/>',
      '<g id="map-g">'];

    for (var i = 0; i < G.DATA.world.length; i++) {
      var c = G.DATA.world[i];
      var d = paths[c.id];
      var cls = classOf(c.id) + (selected === c.id ? ' c-sel' : '');
      if (d) {
        out.push('<path class="cy ' + cls + '" data-act="nt.pick" data-code="' + c.id +
          '" d="' + d + '"></path>');
      } else {
        /* Micro-État : une pastille suffit à le rendre cliquable. */
        var p = proj(c.lat, c.lon);
        out.push('<circle class="cy dot ' + cls + '" data-act="nt.pick" data-code="' +
          c.id + '" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="2.6"></circle>');
      }
    }
    out.push('</g></svg>');
    return out.join('');
  }

  function renderMap() {
    var n = G.nation.get();
    var h = '';

    if (!n) {
      h += '<div class="card"><div class="card-head">🌍 Choisir un pays</div>' +
        '<div class="mute2">Touchez un pays sur la carte pour consulter sa fiche, ' +
        'puis lancez votre campagne électorale. 194 États sont jouables : le budget ' +
        'de campagne dépend de la richesse du pays.</div></div>';
    }

    h += '<div class="map-wrap">' + mapSvg() +
      '<div class="map-tools">' +
      '<button class="btn xs" data-act="nt.zoom" data-v="1.35">＋</button>' +
      '<button class="btn xs" data-act="nt.zoom" data-v="0.74">－</button>' +
      '<button class="btn xs" data-act="nt.reset">⤢</button>' +
      '</div></div>';

    h += '<div class="map-legend">' +
      leg('c-mine', 'Votre territoire') + leg('c-ally', 'Alliés') +
      leg('c-friend', 'Amicaux') + leg('c-neutral', 'Neutres') +
      leg('c-hostile', 'Hostiles') + leg('c-war', 'En guerre') + '</div>';

    h += '<label class="field" style="margin-top:10px">Rechercher un pays</label>' +
      '<input type="text" id="nt-search" placeholder="Nom du pays…" value="' +
      u.esc(search) + '" data-live="nt.search">';
    h += '<div id="nt-results">' + searchResults() + '</div>';

    if (selected) h += countryCard(selected);
    return h;
  }

  function leg(cls, label) {
    return '<span class="lg"><i class="' + cls + '"></i>' + label + '</span>';
  }

  function searchResults() {
    if (!search || search.length < 2) return '';
    var q = search.toLowerCase();
    var hits = G.DATA.world.filter(function (c) {
      return c.n.toLowerCase().indexOf(q) >= 0;
    }).slice(0, 8);
    if (!hits.length) return '<div class="mute2">Aucun pays trouvé.</div>';
    var h = '<div class="card tight">';
    for (var i = 0; i < hits.length; i++) {
      h += '<div class="item" data-act="nt.pick" data-code="' + hits[i].id + '">' +
        '<div class="item-icon">' + hits[i].f + '</div>' +
        '<div class="item-main"><div class="t">' + u.esc(hits[i].n) + '</div>' +
        '<div class="s">' + u.esc(hits[i].reg) + ' · ' + u.dec(hits[i].pop, 1) +
        ' M habitants</div></div></div>';
    }
    return h + '</div>';
  }

  ui.act('nt.search', function (d, node) {
    search = node.value;
    var box = document.getElementById('nt-results');
    if (box) box.innerHTML = searchResults();
  });

  ui.act('nt.pick', function (d) {
    selected = d.code;
    sub = 'carte';
    centerOn(d.code);
    ui.refresh();
    var card = document.querySelector('.country-card');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /** Recentre la carte sur un pays, avec un zoom confortable. */
  function centerOn(code, zoom) {
    var c = G.DATA.worldById[code];
    if (!c) return;
    var p = proj(c.lat, c.lon);
    view.k = zoom || Math.max(view.k, 2.2);
    view.x = MAP.w / 2 - p.x * view.k;
    view.y = MAP.h / 2 - p.y * view.k;
    applyView();
  }

  ui.act('nt.zoom', function (d) {
    view.k = u.clamp(view.k * parseFloat(d.v), 1, 8);
    applyView();
  });
  ui.act('nt.reset', function () {
    view = { x: 0, y: 0, k: 1 };
    applyView();
  });

  function applyView() {
    var g = document.getElementById('map-g');
    if (!g) return;
    g.setAttribute('transform',
      'translate(' + view.x + ',' + view.y + ') scale(' + view.k + ')');
  }

  /** Déplacement au doigt sur la carte. */
  function bindMap(root) {
    var svg = root.querySelector('#worldmap');
    if (!svg) return;
    applyView();
    var drag = null;
    svg.addEventListener('pointerdown', function (ev) {
      drag = { x: ev.clientX, y: ev.clientY, vx: view.x, vy: view.y, moved: 0 };
    });
    svg.addEventListener('pointermove', function (ev) {
      if (!drag) return;
      var rect = svg.getBoundingClientRect();
      var scale = MAP.w / rect.width;
      var dx = (ev.clientX - drag.x) * scale;
      var dy = (ev.clientY - drag.y) * scale;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      view.x = drag.vx + dx;
      view.y = drag.vy + dy;
      applyView();
    });
    function end() { drag = null; }
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('pointerleave', end);
    svg.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      view.k = u.clamp(view.k * (ev.deltaY < 0 ? 1.15 : 0.87), 1, 8);
      applyView();
    }, { passive: false });
  }

  /* =================================================== FICHE D'UN PAYS ==== */

  function countryCard(code) {
    var d = G.DATA.worldById[code];
    if (!d) return '';
    var n = G.nation.get();
    var gdp = G.nation.gdpOf(d);
    var h = '<div class="card country-card">';

    h += '<div class="row" style="gap:10px">' +
      '<div style="font-size:34px">' + d.f + '</div>' +
      '<div class="item-main"><div class="t" style="font-size:17px">' + u.esc(d.n) + '</div>' +
      '<div class="s">' + u.esc(d.cap) + ' · ' + u.esc(d.reg) + '</div></div>';
    if (n && G.nation.controls(code)) h += '<span class="pill gold">votre territoire</span>';
    h += '</div>';

    h += '<div class="grid3" style="margin:10px 0">' +
      ui.stat('Population', u.dec(d.pop, 1) + ' M') +
      ui.stat('PIB', u.fmtMoney(gdp)) +
      ui.stat('PIB/hab.', u.fmtMoney(d.gdppc)) + '</div>';

    h += '<div class="grid3" style="margin-bottom:10px">' +
      ui.stat('Superficie', u.fmtNum(d.area) + ' km²') +
      ui.stat('Religion', d.rel) +
      ui.stat('Puissance', Math.round(G.nation.baseMilitary(code))) + '</div>';

    if (!n) {
      var cost = G.nation.campaignCost(code);
      var can = G.nation.canRun(code);
      h += '<button class="btn ' + (can ? 'primary' : '') + ' full" data-act="nt.elect" ' +
        'data-code="' + code + '"' + (can ? '' : ' disabled') + '>' +
        '🗳️ Se présenter · ' + u.fmtMoney(cost) + '</button>';
      if (!can) {
        h += '<div class="mute2" style="margin-top:6px">Il vous manque ' +
          u.fmtMoney(cost - G.state.money) + ' pour financer cette campagne.</div>';
      }
      return h + '</div>';
    }

    if (G.nation.controls(code)) {
      h += '<div class="mute2">Ce territoire est sous votre autorité.</div></div>';
      return h;
    }

    /* Relations et actions diplomatiques. */
    var w = G.nation.worldEntry(code);
    var war = G.nation.warWith(code);
    h += '<div class="row between small"><span>Relations</span><b class="' +
      (w.rel > 20 ? 'good' : w.rel < -20 ? 'bad' : '') + '">' + Math.round(w.rel) + '</b></div>' +
      ui.bar((w.rel + 100) / 2, w.rel > 20 ? 'green' : w.rel < -20 ? 'red' : '');

    if (war) {
      h += '<div class="card tight" style="margin-top:10px;border-color:rgba(255,107,107,.5)">' +
        '<div class="row between"><b class="bad">⚔️ En guerre</b><span class="mute2">' +
        'mois ' + (n.month - war.since) + '</span></div>' +
        '<div class="row between small"><span>Front</span><b>' +
        Math.round(war.front) + ' %</b></div>' + ui.bar(war.front, 'red') +
        '<div class="mute2" style="margin-top:4px">Vos forces : ' +
        u.fmtNum(G.nation.militaryPower(false)) + ' · ennemi : ' +
        u.fmtNum(G.nation.enemyPower(code)) + '</div>' +
        '<div class="grid2" style="margin-top:8px">' +
        '<button class="btn" data-act="nt.peace" data-code="' + code + '">🕊️ Négocier la paix</button>' +
        (n.army.nuke > 0
          ? '<button class="btn danger" data-act="nt.nuke" data-code="' + code + '">☢️ Frappe</button>'
          : '<button class="btn" disabled>☢️ Pas d\'arme</button>') +
        '</div></div>';
    } else {
      h += '<div class="grid2" style="margin-top:10px">' +
        '<button class="btn sm" data-act="nt.gift" data-code="' + code + '">🎁 Aide financière</button>' +
        '<button class="btn sm" data-act="nt.pact" data-code="' + code + '">📜 Pacte de non-agression</button>' +
        '</div><div class="grid2" style="margin-top:6px">' +
        (n.allies[code]
          ? '<button class="btn sm" data-act="nt.unally" data-code="' + code + '">💔 Rompre l\'alliance</button>'
          : '<button class="btn sm" data-act="nt.ally" data-code="' + code + '">🤝 Alliance</button>') +
        '<button class="btn sm danger" data-act="nt.war" data-code="' + code + '">⚔️ Déclarer la guerre</button>' +
        '</div>';
    }
    return h + '</div>';
  }

  ui.act('nt.elect', function (d) {
    var c = G.DATA.worldById[d.code];
    ui.confirm('Se présenter en ' + u.esc(c.n) + ' ?',
      'Budget de campagne : ' + u.fmtMoney(G.nation.campaignCost(d.code)) +
      '. Mandat de ' + G.nation.TERM_MONTHS + ' mois. Vous héritez de l\'économie, ' +
      'des infrastructures et de l\'armée réelles du pays.',
      function () {
        if (G.nation.elect(d.code)) {
          sub = 'nation';
          centerOn(d.code, 2.6);
          ui.toast('🗳️ Élu !', 'Vous dirigez ' + c.n, 'good');
        }
        ui.refresh();
      }, 'Lancer la campagne');
  });

  ui.act('nt.gift', function (d) {
    var n = G.nation.get();
    var suggest = Math.round(n.gdp * 0.002);
    ui.modal('🎁 Aide financière',
      '<p class="muted">Un versement au budget de ' +
      u.esc(G.DATA.worldById[d.code].n) + ' réchauffe durablement les relations.</p>' +
      '<label class="field">Montant (depuis le Trésor : ' + u.fmtMoney(n.treasury) + ')</label>' +
      '<input type="number" id="nt-amt" value="' + suggest + '">' +
      '<button class="btn primary full" style="margin-top:12px" data-act="nt.dogift" ' +
      'data-code="' + d.code + '">Verser</button>', {});
  });
  ui.act('nt.dogift', function (d) {
    var input = document.getElementById('nt-amt');
    var v = input ? parseFloat(input.value) : 0;
    if (G.nation.gift(d.code, v)) {
      ui.toast('🎁 Aide versée', 'Les relations s\'améliorent', 'good');
    }
    ui.closeModal();
  });
  ui.act('nt.pact', function (d) { G.nation.signPact(d.code); ui.refresh(); });
  ui.act('nt.ally', function (d) { G.nation.signAlliance(d.code); ui.refresh(); });
  ui.act('nt.unally', function (d) { G.nation.breakAlliance(d.code); ui.refresh(); });

  ui.act('nt.war', function (d) {
    var c = G.DATA.worldById[d.code];
    var mine = G.nation.militaryPower(false);
    var theirs = G.nation.enemyPower(d.code);
    ui.confirm('Déclarer la guerre à ' + u.esc(c.n) + ' ?',
      'Rapport de forces : ' + u.fmtNum(mine) + ' contre ' + u.fmtNum(theirs) +
      '. Une guerre coûte des vies, de la popularité et l\'estime du monde entier. ' +
      'La victoire permet l\'annexion.',
      function () { G.nation.declareWar(d.code); ui.refresh(); }, 'Déclarer la guerre');
  });
  ui.act('nt.peace', function (d) {
    if (G.nation.makePeace(d.code)) ui.refresh();
  });
  ui.act('nt.nuke', function (d) {
    var c = G.DATA.worldById[d.code];
    ui.confirm('Frappe nucléaire sur ' + u.esc(c.n) + ' ?',
      'Des millions de victimes, une condamnation mondiale et un risque de riposte. ' +
      'Cette décision est irréversible.',
      function () { G.nation.nuke(d.code); ui.refresh(); }, 'Lancer la frappe');
  });

  /* ================================================== TABLEAU DE BORD ==== */

  /** Lance ou arrête l'avancement automatique des mois. */
  function startAutoAdvance() {
    if (autoTimer) return;
    autoAdvance = true;
    autoTimer = setInterval(function () {
      if (!autoAdvance || !G.nation.get()) return;
      var modal = document.getElementById('modal');
      if (modal && modal.style.display !== 'none') return;
      advance(1);
    }, autoAdvanceInterval);
  }

  function stopAutoAdvance() {
    autoAdvance = false;
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  function toggleAutoAdvance() {
    if (autoAdvance) {
      stopAutoAdvance();
      ui.toast('⏸️ Pause automatique', 'Avancement du temps arrêté', 'info');
    } else {
      startAutoAdvance();
      ui.toast('▶️ Avancement automatique', 'Mois : ' + G.nation.get().month, 'good');
    }
    ui.refresh();
  }

  function renderDash(n) {
    var d = G.DATA.worldById[n.code];
    var sheet = G.nation.balanceSheet();
    var bal = G.nation.balance();
    var h = '';

    h += '<div class="card"><div class="row">' +
      '<div style="font-size:32px">' + n.flag + '</div>' +
      '<div class="item-main"><div class="t">' + u.esc(n.name) +
      (n.annexed.length ? ' <span class="pill gold">+' + n.annexed.length + '</span>' : '') +
      '</div>' +
      '<div class="s">' + G.nation.ideologyDef(n.ideology).name + ' · mandat ' + n.term +
      ' · mois ' + (n.monthsInTerm + 1) + '/' + G.nation.TERM_MONTHS + '</div>' +
      '<div class="mute2">' + u.dec(n.pop, 1) + ' M habitants · ' + u.esc(n.religion) +
      '</div></div>' +
      '<div class="item-side"><div class="ov ' +
      (n.ind.popularite >= 55 ? 'e1' : n.ind.popularite >= 40 ? 'e2' : 'e4') + '">' +
      Math.round(n.ind.popularite) + '</div><div class="mute2">popularité</div></div>' +
      '</div></div>';

    h += '<div class="grid3" style="margin-bottom:10px">' +
      ui.stat('PIB', u.fmtMoney(n.gdp)) +
      ui.stat('Croissance', u.dec(n.ind.croissance, 2) + ' %',
        n.ind.croissance > 0 ? 'good' : 'bad') +
      ui.stat('Chômage', u.dec(n.ind.chomage, 1) + ' %', n.ind.chomage < 8 ? 'good' : 'bad') +
      '</div>';

    h += '<div class="grid3" style="margin-bottom:10px">' +
      ui.stat('Trésor', u.fmtMoney(n.treasury)) +
      ui.stat('Dette / PIB', u.dec(G.nation.debtRatio(), 0) + ' %',
        G.nation.debtRatio() < 90 ? '' : 'bad') +
      ui.stat('Rang militaire', Math.round(G.nation.worldRank()) + 'e') +
      '</div>' +
      '<div class="mute2">Mois : ' + n.month + ' / ' + (G.nation.TERM_MONTHS) +
      ' · Avancement automatique ' + (autoAdvance ? '✓ activé' : '✗ désactivé') + '</div>';

    /* Ressources. */
    h += '<div class="card"><div class="card-head">📦 Ressources<span class="sub">' +
      'par mois</span></div>';
    for (var i = 0; i < G.DATA.resources.length; i++) {
      var r = G.DATA.resources[i];
      var net = sheet.net[r.id] || 0;
      h += '<div class="row between" style="padding:3px 0">' +
        '<span>' + r.icon + ' ' + r.name + '</span>' +
        '<span><b>' + u.fmtNum(n.res[r.id] || 0) + '</b> ' +
        '<span class="small ' + ui.signCls(net) + '">' +
        (net >= 0 ? '+' : '') + u.fmtNum(net) + '</span></span></div>';
    }
    h += '</div>';

    /* Budget. */
    h += '<div class="card"><div class="card-head">📊 Budget mensuel</div>' +
      '<div class="row between"><span>Recettes</span><b class="good">' +
      u.fmtMoney(G.nation.revenue()) + '</b></div>' +
      '<div class="row between"><span>Dépenses</span><b class="bad">' +
      u.fmtMoney(G.nation.spending()) + '</b></div><div class="hr"></div>' +
      '<div class="row between"><b>Solde</b><b class="' + ui.signCls(bal) + '">' +
      u.fmtSigned(bal) + '</b></div>' +
      '<div class="grid3" style="margin-top:10px">' +
      '<button class="btn primary' + (autoAdvance ? ' active' : '') + '" data-act="nt.auto">' +
      (autoAdvance ? '⏸️ Pause' : '▶️ Auto') + '</button>' +
      '<button class="btn" data-act="nt.month">' +
      '📅 Mois</button>' +
      '<button class="btn" data-act="nt.year">' +
      '⏩ 12 mois</button></div></div>';

    /* Guerres en cours. */
    if (n.wars.length) {
      h += '<div class="card" style="border-color:rgba(255,107,107,.45)">' +
        '<div class="card-head">⚔️ Guerres en cours</div>';
      for (var w = 0; w < n.wars.length; w++) {
        var war = n.wars[w];
        var cd = G.DATA.worldById[war.code];
        h += '<div class="item" data-act="nt.pick" data-code="' + war.code + '">' +
          '<div class="item-icon">' + cd.f + '</div>' +
          '<div class="item-main"><div class="t">' + u.esc(cd.n) + '</div>' +
          ui.bar(war.front, war.front > 50 ? 'green' : 'red') + '</div>' +
          '<div class="item-side">' + Math.round(war.front) + ' %</div></div>';
      }
      h += '</div>';
    }

    /* Indicateurs sociaux. */
    h += '<div class="card"><div class="card-head">🩺 Société</div>' +
      gauge('Santé', n.ind.sante) + gauge('Éducation', n.ind.education) +
      gauge('Sécurité', n.ind.securite) + gauge('Protection sociale', n.ind.social) +
      gauge('Stabilité', n.ind.stabilite) + gauge('Tourisme', n.ind.tourisme) +
      gauge('Pollution', n.ind.pollution) + gauge('Influence à l\'ONU', n.ind.unInfluence) +
      '</div>';

    /* Liens avec l'empire du joueur. */
    h += '<div class="card"><div class="card-head">🤝 Votre empire et l\'État</div>' +
      '<div class="mute2">Effet sur vos affaires : entreprises ×' +
      u.dec(G.nation.bizMultiplier(), 2) + ' · marchés ' +
      (G.nation.marketEffect() >= 0 ? '+' : '') +
      u.dec(G.nation.marketEffect() * 100, 1) + '</div>' +
      '<div class="grid2" style="margin-top:9px">' +
      '<button class="btn sm" data-act="nt.salary">💼 Traitement</button>' +
      '<button class="btn sm" data-act="nt.subsidy">💰 Plan de soutien</button></div>' +
      '<button class="btn sm full" style="margin-top:6px" data-act="nt.inject">' +
      '🎁 Donner au Trésor public</button></div>';

    if (n.journal.length) {
      h += '<div class="card"><div class="card-head">📰 Journal du mandat</div><div class="feed">';
      for (var j = 0; j < Math.min(14, n.journal.length); j++) {
        h += '<div class="entry"><span class="m">M' + n.journal[j].m + '</span><span>' +
          u.esc(n.journal[j].txt) + '</span></div>';
      }
      h += '</div></div>';
    }
    return h;
  }

  function gauge(label, value) {
    return '<div style="margin-bottom:6px">' +
      '<div class="row between small"><span>' + label + '</span><b>' +
      Math.round(value) + '</b></div>' + ui.bar(value) + '</div>';
  }

  /* ========================================================= ÉCONOMIE ==== */

  function renderEconomy(n) {
    var sheet = G.nation.balanceSheet();
    var h = '';

    /* Fiscalité. */
    h += '<div class="card"><div class="card-head">💶 Fiscalité</div>';
    var taxes = [['corp', 'Impôt sur les sociétés'], ['income', 'Impôt sur le revenu'],
    ['vat', 'TVA']];
    for (var i = 0; i < taxes.length; i++) {
      var k = taxes[i][0];
      h += '<div style="margin-bottom:10px">' +
        '<div class="row between small"><span>' + taxes[i][1] + '</span>' +
        '<b id="tax-' + k + '-v">' + n.taxes[k] + ' %</b></div>' +
        '<input type="range" min="0" max="60" step="1" value="' + n.taxes[k] +
        '" data-live="nt.taxlive" data-change="nt.tax" data-k="' + k + '"></div>';
    }
    h += '<div class="mute2">Un impôt sur les sociétés élevé pèse aussi sur ' +
      '<b>vos</b> entreprises.</div></div>';

    /* Budgets sociaux. */
    h += '<div class="card"><div class="card-head">🏛️ Budgets<span class="sub">' +
      u.dec(G.nation.totalBudget() * 100, 1) + ' % du PIB</span></div>';
    var budgets = [['sante', 'Santé', 0.085], ['education', 'Éducation', 0.055],
    ['securite', 'Sécurité', 0.030], ['social', 'Affaires sociales', 0.075]];
    for (var b = 0; b < budgets.length; b++) {
      var id = budgets[b][0], ref = budgets[b][2];
      var v = n.budgets[id];
      h += '<div style="margin-bottom:12px">' +
        '<div class="row between small"><span>' + budgets[b][1] +
        ' <span class="mute2">(référence ' + u.dec(ref * 100, 1) + ' %)</span></span>' +
        '<b id="bud-' + id + '-v">' + u.dec(v * 100, 1) + ' % · ' +
        u.fmtMoney(n.gdp * v / 12) + '</b></div>' +
        '<input type="range" min="0" max="' + Math.round(ref * 300) + '" step="1" value="' +
        Math.round(v * 1000) + '" data-live="nt.budlive" data-change="nt.bud" data-k="' +
        id + '" data-gdp="' + n.gdp + '"></div>';
    }
    h += '</div>';

    /* Banque centrale. */
    h += '<div class="card"><div class="card-head">🏦 Banque centrale</div>' +
      '<div class="row between"><span>Dette publique</span><b>' +
      u.fmtMoney(n.debt) + ' (' + u.dec(G.nation.debtRatio(), 0) + ' % du PIB)</b></div>' +
      '<div class="mute2">Taux d\'intérêt : ' + (n.orgs.fmi ? '1,6' : '3,2') +
      ' % par an' + (n.orgs.fmi ? ' (adhésion au FMI)' : '') + '</div>' +
      '<div class="grid2" style="margin-top:9px">' +
      '<button class="btn sm" data-act="nt.borrow">📈 Emprunter</button>' +
      '<button class="btn sm" data-act="nt.repay">📉 Rembourser</button></div></div>';

    /* Commerce des ressources. */
    h += '<div class="card"><div class="card-head">🚢 Marché mondial</div>';
    for (var r = 0; r < G.DATA.resources.length; r++) {
      var res = G.DATA.resources[r];
      if (res.id === 'tech') continue;
      var price = G.nation.resourcePrice(res.id);
      h += '<div class="item"><div class="item-icon">' + res.icon + '</div>' +
        '<div class="item-main"><div class="t">' + res.name + '</div>' +
        '<div class="s">' + u.fmtMoney(price) + ' l\'unité · stock ' +
        u.fmtNum(n.res[res.id] || 0) + '</div></div>' +
        '<div class="item-side"><div class="row" style="gap:4px">' +
        '<button class="btn xs" data-act="nt.trade" data-id="' + res.id +
        '" data-q="100">Acheter</button>' +
        '<button class="btn xs" data-act="nt.trade" data-id="' + res.id +
        '" data-q="-100">Vendre</button></div>' +
        '<div class="mute2">par 100</div></div></div>';
    }
    h += '</div>';

    /* Constructions. */
    h += '<div class="card"><div class="card-head">🏗️ Construire</div>' +
      '<div class="mute2">Chaque bâtiment produit, consomme et emploie. ' +
      'Coût calculé sur la taille de votre économie.</div></div>';

    for (var k2 = 0; k2 < G.DATA.buildings.length; k2++) {
      var bd = G.DATA.buildings[k2];
      var owned = n.buildings[bd.id] || 0;
      var cost = G.nation.buildCost(bd);
      var locked = (bd.tech && !n.techs[bd.tech]) ||
        (bd.sea && G.DATA.worldById[n.code].lock);
      var can = !locked && n.treasury >= cost;
      h += '<div class="card tight"><div class="row">' +
        '<div class="item-icon">' + bd.icon + '</div>' +
        '<div class="item-main"><div class="t">' + bd.name +
        ' <span class="pill">' + owned + '</span></div>' +
        '<div class="s">' + u.esc(bd.desc) + '</div>' +
        '<div class="mute2">' + prodLine(bd) + '</div></div>' +
        '<div class="item-side">' +
        (locked
          ? '<span class="pill red">' + (bd.sea ? 'sans littoral' : 'technologie requise') + '</span>'
          : '<button class="btn sm ' + (can ? 'primary' : '') + '" data-act="nt.build" ' +
            'data-id="' + bd.id + '"' + (can ? '' : ' disabled') + '>' +
            u.fmtMoney(cost) + '</button>') +
        '</div></div></div>';
    }
    return h;
  }

  function prodLine(bd) {
    var parts = [];
    for (var r in bd.prod) {
      parts.push('+' + bd.prod[r] + ' ' + resIcon(r));
    }
    for (var c in bd.cons) {
      parts.push('-' + bd.cons[c] + ' ' + resIcon(c));
    }
    if (bd.jobs) parts.push(u.dec(bd.jobs, 1) + ' M emplois');
    return parts.join(' · ');
  }

  function resIcon(id) {
    for (var i = 0; i < G.DATA.resources.length; i++) {
      if (G.DATA.resources[i].id === id) return G.DATA.resources[i].icon;
    }
    return id;
  }

  ui.act('nt.taxlive', function (d, node) {
    var lbl = document.getElementById('tax-' + d.k + '-v');
    if (lbl) lbl.textContent = node.value + ' %';
  });
  ui.act('nt.tax', function (d, node) { G.nation.setTax(d.k, parseInt(node.value, 10)); });
  ui.act('nt.budlive', function (d, node) {
    var lbl = document.getElementById('bud-' + d.k + '-v');
    var v = parseInt(node.value, 10) / 1000;
    if (lbl) {
      lbl.textContent = u.dec(v * 100, 1) + ' % · ' + u.fmtMoney(parseFloat(d.gdp) * v / 12);
    }
  });
  ui.act('nt.bud', function (d, node) {
    G.nation.setBudget(d.k, parseInt(node.value, 10) / 1000);
  });
  ui.act('nt.build', function (d) {
    if (G.nation.build(d.id, 1)) ui.refresh();
  });
  ui.act('nt.trade', function (d) {
    if (G.nation.trade(d.id, parseInt(d.q, 10))) ui.refresh();
  });
  ui.act('nt.borrow', function () {
    var n = G.nation.get();
    var suggest = Math.round(n.gdp * 0.05);
    ui.modal('📈 Emprunter', '<p class="muted">La banque centrale place des ' +
      'obligations. Les intérêts pèseront chaque mois sur le budget.</p>' +
      '<label class="field">Montant</label>' +
      '<input type="number" id="nt-loan" value="' + suggest + '">' +
      '<button class="btn primary full" style="margin-top:12px" data-act="nt.doborrow">' +
      'Émettre</button>', {});
  });
  ui.act('nt.doborrow', function () {
    var input = document.getElementById('nt-loan');
    if (input && G.nation.borrow(parseFloat(input.value))) ui.closeModal();
  });
  ui.act('nt.repay', function () {
    var n = G.nation.get();
    G.nation.repay(Math.min(n.treasury * 0.5, n.debt));
    ui.refresh();
  });

  /* ============================================================ ARMÉE ==== */

  function renderArmy(n) {
    var h = '<div class="card"><div class="card-head">🎖️ Forces armées</div>' +
      '<div class="grid3">' +
      ui.stat('Puissance', u.fmtNum(G.nation.militaryPower(false))) +
      ui.stat('Rang mondial', Math.round(G.nation.worldRank()) + 'e') +
      ui.stat('Guerres', n.wars.length) + '</div>' +
      '<div class="mute2" style="margin-top:6px">L\'entretien est prélevé chaque ' +
      'mois et consomme du carburant et des biens manufacturés.</div></div>';

    for (var i = 0; i < G.DATA.units.length; i++) {
      var un = G.DATA.units[i];
      var owned = n.army[un.id] || 0;
      var cost = G.nation.unitCost(un);
      var locked = (un.tech && !n.techs[un.tech]) ||
        (un.sea && G.DATA.worldById[n.code].lock);
      var can = !locked && n.treasury >= cost;
      h += '<div class="card tight"><div class="row">' +
        '<div class="item-icon">' + un.icon + '</div>' +
        '<div class="item-main"><div class="t">' + un.name +
        ' <span class="pill">' + u.fmtNum(owned) + '</span></div>' +
        '<div class="s">' + u.esc(un.desc) + '</div>' +
        '<div class="mute2">Attaque ' + un.atk + ' · défense ' + un.def +
        ' · entretien ' + u.fmtMoney(un.upkeep * G.nation.costFactor()) + '/mois</div></div>' +
        '<div class="item-side">' +
        (locked
          ? '<span class="pill red">verrouillé</span>'
          : '<button class="btn sm ' + (can ? 'primary' : '') + '" data-act="nt.recruit" ' +
            'data-id="' + un.id + '"' + (can ? '' : ' disabled') + '>' +
            u.fmtMoney(cost) + '</button>' +
            (owned > 0 ? '<button class="btn xs" style="margin-top:4px" ' +
              'data-act="nt.disband" data-id="' + un.id + '">Dissoudre</button>' : '')) +
        '</div></div></div>';
    }
    return h;
  }

  ui.act('nt.recruit', function (d) { if (G.nation.recruit(d.id, 1)) ui.refresh(); });
  ui.act('nt.disband', function (d) { if (G.nation.disband(d.id, 1)) ui.refresh(); });

  /* ======================================================= DIPLOMATIE ==== */

  function renderDiplomacy(n) {
    var h = '';

    /* Alliances et guerres. */
    h += '<div class="card"><div class="card-head">🌐 Situation internationale</div>' +
      '<div class="grid3">' +
      ui.stat('Alliés', Object.keys(n.allies).length) +
      ui.stat('Guerres', n.wars.length) +
      ui.stat('Influence ONU', Math.round(n.ind.unInfluence)) + '</div></div>';

    /* Résolutions. */
    h += '<div class="card"><div class="card-head">🇺🇳 Nations unies</div>' +
      '<div class="mute2">Proposer une résolution coûte de l\'argent ; on peut ' +
      'aussi acheter des voix pour améliorer ses chances.</div>';
    for (var i = 0; i < G.DATA.resolutions.length; i++) {
      var r = G.DATA.resolutions[i];
      var cost = r.cost * G.nation.costFactor();
      var needTarget = r.target;
      var ok = n.treasury >= cost && (!needTarget || (selected && !G.nation.controls(selected)));
      h += '<div class="item"><div class="item-icon">' + r.icon + '</div>' +
        '<div class="item-main"><div class="t">' + r.name + '</div>' +
        '<div class="s">' + u.esc(r.desc) + '</div>' +
        (needTarget ? '<div class="mute2">Cible : ' +
          (selected ? G.DATA.worldById[selected].n : '— sélectionnez un pays sur la carte') +
          '</div>' : '') + '</div>' +
        '<div class="item-side"><button class="btn sm ' + (ok ? 'primary' : '') +
        '" data-act="nt.resolution" data-id="' + r.id + '"' + (ok ? '' : ' disabled') + '>' +
        u.fmtMoney(cost) + '</button></div></div>';
    }
    h += '</div>';

    /* Organisations internationales. */
    h += '<div class="card"><div class="card-head">🏛️ Organisations internationales</div>';
    for (var o = 0; o < G.DATA.organisations.length; o++) {
      var org = G.DATA.organisations[o];
      var c2 = org.cost * G.nation.costFactor();
      var has = n.orgs[org.id];
      h += '<div class="item"><div class="item-icon">' + org.icon + '</div>' +
        '<div class="item-main"><div class="t">' + org.name +
        (has ? ' <span class="pill green">dirigée</span>' : '') + '</div>' +
        '<div class="s">' + u.esc(org.desc) + '</div></div>' +
        '<div class="item-side">' + (has ? '✅' :
          '<button class="btn sm ' + (n.treasury >= c2 ? 'primary' : '') +
          '" data-act="nt.joinorg" data-id="' + org.id + '"' +
          (n.treasury >= c2 ? '' : ' disabled') + '>' + u.fmtMoney(c2) + '</button>') +
        '</div></div>';
    }
    h += '</div>';

    /* Relations principales. */
    var rels = [];
    for (var code in n.world) {
      if (G.nation.controls(code)) continue;
      rels.push({ code: code, rel: n.world[code].rel });
    }
    rels = u.sortBy(rels, function (x) { return Math.abs(x.rel); }, true).slice(0, 12);
    if (rels.length) {
      h += '<div class="card"><div class="card-head">🤝 Relations marquantes</div>';
      for (var j = 0; j < rels.length; j++) {
        var cd = G.DATA.worldById[rels[j].code];
        if (!cd) continue;
        h += '<div class="item" data-act="nt.pick" data-code="' + rels[j].code + '">' +
          '<div class="item-icon">' + cd.f + '</div>' +
          '<div class="item-main"><div class="t">' + u.esc(cd.n) + '</div>' +
          ui.bar((rels[j].rel + 100) / 2, rels[j].rel > 20 ? 'green' :
            rels[j].rel < -20 ? 'red' : '') + '</div>' +
          '<div class="item-side ' + ui.signCls(rels[j].rel) + '">' +
          Math.round(rels[j].rel) + '</div></div>';
      }
      h += '</div>';
    }
    return h;
  }

  ui.act('nt.resolution', function (d) {
    var r = G.nation.resolutionDef(d.id);
    var n = G.nation.get();
    var target = r.target ? selected : null;
    var est = G.nation.voteEstimate(d.id, target, 0);
    ui.modal('🇺🇳 ' + r.name,
      '<p class="muted">' + u.esc(r.desc) + '</p>' +
      (target ? '<div class="mute2">Cible : ' + G.DATA.worldById[target].n + '</div>' : '') +
      '<div class="grid2" style="margin:10px 0">' +
      ui.stat('Voix estimées', Math.round(est) + ' %') +
      ui.stat('Coût de dépôt', u.fmtMoney(r.cost * G.nation.costFactor())) + '</div>' +
      '<label class="field">Achat de voix (facultatif)</label>' +
      '<input type="number" id="nt-bribe" value="0">' +
      '<button class="btn primary full" style="margin-top:12px" data-act="nt.dores" ' +
      'data-id="' + d.id + '">Déposer la résolution</button>', {});
  });
  ui.act('nt.dores', function (d) {
    var input = document.getElementById('nt-bribe');
    var bribe = input ? Math.max(0, parseFloat(input.value) || 0) : 0;
    var r = G.nation.resolutionDef(d.id);
    var res = G.nation.proposeResolution(d.id, r.target ? selected : null, bribe);
    if (res) {
      ui.toast(res.passed ? '🇺🇳 Résolution adoptée' : '🇺🇳 Résolution rejetée',
        res.votes + ' % de voix favorables', res.passed ? 'good' : 'bad');
    }
    ui.closeModal();
  });
  ui.act('nt.joinorg', function (d) { if (G.nation.joinOrg(d.id)) ui.refresh(); });

  /* ======================================================== RECHERCHE ==== */

  function renderResearch(n) {
    var h = '<div class="card"><div class="card-head">🔬 Recherche</div>' +
      '<div class="grid2">' +
      ui.stat('Points disponibles', u.fmtNum(n.res.tech)) +
      ui.stat('Production', '+' + u.fmtNum(G.nation.balanceSheet().net.tech) + '/mois') +
      '</div><div class="mute2" style="margin-top:6px">Construisez des centres de ' +
      'recherche et des universités pour accélérer.</div></div>';

    for (var i = 0; i < G.DATA.techs.length; i++) {
      var t = G.DATA.techs[i];
      var has = n.techs[t.id];
      var can = G.nation.canResearch(t);
      var afford = n.res.tech >= t.cost;
      var reqNames = t.req.map(function (r) { return G.nation.techDef(r).name; }).join(', ');
      h += '<div class="card tight' + (has ? ' done' : '') + '"><div class="row">' +
        '<div class="item-icon">' + t.icon + '</div>' +
        '<div class="item-main"><div class="t">' + t.name +
        (has ? ' <span class="pill green">acquise</span>' : '') + '</div>' +
        '<div class="s">' + u.esc(t.desc) + '</div>' +
        (t.req.length && !has ? '<div class="mute2">Prérequis : ' + reqNames + '</div>' : '') +
        '</div>' +
        '<div class="item-side">' + (has ? '✅' :
          '<button class="btn sm ' + (can && afford ? 'primary' : '') +
          '" data-act="nt.research" data-id="' + t.id + '"' +
          (can && afford ? '' : ' disabled') + '>' + u.fmtNum(t.cost) + ' 🔬</button>') +
        '</div></div></div>';
    }

    /* Merveilles du monde. */
    h += '<div class="card-head" style="margin-top:14px">🏛️ Merveilles</div>';
    for (var w = 0; w < G.DATA.wonders.length; w++) {
      var wd = G.DATA.wonders[w];
      var built = n.wonders[wd.id];
      var cost = wd.cost * G.nation.costFactor();
      var lockedW = wd.tech && !n.techs[wd.tech];
      h += '<div class="card tight"><div class="row">' +
        '<div class="item-icon">' + wd.icon + '</div>' +
        '<div class="item-main"><div class="t">' + wd.name +
        (built ? ' <span class="pill green">construite</span>' : '') + '</div>' +
        '<div class="s">Tourisme +' + wd.tourism + ' · popularité +' + wd.pop + '</div></div>' +
        '<div class="item-side">' + (built ? '✅' : lockedW ?
          '<span class="pill red">technologie</span>' :
          '<button class="btn sm ' + (n.treasury >= cost ? 'primary' : '') +
          '" data-act="nt.wonder" data-id="' + wd.id + '"' +
          (n.treasury >= cost ? '' : ' disabled') + '>' + u.fmtMoney(cost) + '</button>') +
        '</div></div></div>';
    }

    /* Ministres. */
    h += '<div class="card-head" style="margin-top:14px">👤 Gouvernement</div>';
    for (var m = 0; m < G.DATA.ministers.length; m++) {
      var post = G.DATA.ministers[m];
      var cur = n.ministers[post.id];
      h += '<div class="item"><div class="item-icon">' + post.icon + '</div>' +
        '<div class="item-main"><div class="t">' + post.name + '</div>' +
        '<div class="s">' + (cur
          ? u.esc(cur.name) + ' · ' + cur.trait + ' · compétence ' + cur.skill
          : 'poste vacant') + '</div></div>' +
        '<div class="item-side"><button class="btn xs" data-act="nt.minister" data-id="' +
        post.id + '">' + (cur ? 'Remplacer' : 'Nommer') + '</button></div></div>';
    }

    /* Idéologie et religion. */
    h += '<div class="card" style="margin-top:12px"><div class="card-head">📜 Régime</div>' +
      '<div class="row wrap" style="gap:5px">';
    for (var d2 = 0; d2 < G.DATA.ideologies.length; d2++) {
      var ideo = G.DATA.ideologies[d2];
      h += '<button class="btn xs' + (n.ideology === ideo.id ? ' primary' : '') +
        '" data-act="nt.ideology" data-id="' + ideo.id + '">' + ideo.icon + ' ' +
        ideo.name + '</button>';
    }
    h += '</div><div class="mute2" style="margin-top:6px">' +
      G.nation.ideologyDef(n.ideology).pros + '. Changer de régime déstabilise ' +
      'fortement le pays.</div>' +
      '<div class="hr"></div>' +
      '<div class="row between"><span>🕊️ ' + u.esc(n.religion) + '</span><b>' +
      Math.round(n.ind.faith) + ' %</b></div>' + ui.bar(n.ind.faith) +
      '<button class="btn sm full" style="margin-top:8px" data-act="nt.faith">' +
      'Financer la diffusion religieuse</button></div>';

    return h;
  }

  ui.act('nt.research', function (d) { if (G.nation.research(d.id)) ui.refresh(); });
  ui.act('nt.wonder', function (d) { if (G.nation.buildWonder(d.id)) ui.refresh(); });
  ui.act('nt.ideology', function (d) {
    var ideo = G.nation.ideologyDef(d.id);
    if (G.nation.get().ideology === d.id) return;
    ui.confirm('Adopter : ' + ideo.name + ' ?',
      ideo.pros + '. Le changement de régime coûte 15 points de stabilité et ' +
      '5 de popularité.',
      function () { G.nation.setIdeology(d.id); ui.refresh(); }, 'Changer de régime');
  });
  ui.act('nt.faith', function () {
    var n = G.nation.get();
    var amount = n.gdp * 0.002;
    if (G.nation.spreadFaith(amount)) ui.refresh();
  });
  ui.act('nt.minister', function (d) {
    var list = G.nation.candidates(d.id);
    var h = '<p class="muted">Trois profils se présentent pour ce poste.</p>';
    for (var i = 0; i < list.length; i++) {
      h += '<div class="item"><div class="item-main">' +
        '<div class="t">' + u.esc(list[i].name) + '</div>' +
        '<div class="s">' + list[i].trait + ' · compétence ' + list[i].skill + '</div>' +
        ui.bar(list[i].skill) + '</div>' +
        '<div class="item-side"><button class="btn sm primary" data-act="nt.appoint" ' +
        'data-post="' + d.id + '" data-i="' + i + '">Nommer</button></div></div>';
    }
    ui.modal('👤 Nomination', h, { candidates: list });
  });
  ui.act('nt.appoint', function (d, node) {
    /* Les candidats sont régénérés : on relit ceux affichés dans la modale. */
    var rows = document.querySelectorAll('#modal-body .item');
    var idx = parseInt(d.i, 10);
    var row = rows[idx];
    if (!row) return;
    var name = row.querySelector('.t').textContent;
    var parts = row.querySelector('.s').textContent.split(' · ');
    G.nation.appoint(d.post, {
      name: name, trait: parts[0],
      skill: parseInt(parts[1].replace(/\D/g, ''), 10) || 50
    });
    ui.closeModal();
  });

  /* ========================================================== ACTIONS ==== */

  function advance(n) {
    var reports = [];
    for (var i = 0; i < n; i++) {
      if (!G.nation.get()) break;
      var r = G.nation.endMonth();
      if (r) reports.push(r);
      if (r && (r.ousted || (r.election && !r.election.won))) break;
    }
    var nat = G.nation.get();
    var last = reports[reports.length - 1];
    if (!nat) {
      ui.modal('🏛️ Fin de parcours',
        '<p class="muted">Votre mandat s\'achève ici. Vous pouvez repartir en ' +
        'campagne dans n\'importe quel pays — la fortune, elle, reste.</p>' +
        '<button class="btn full" data-act="ui.close">Fermer</button>', {});
    } else if (last) {
      var h = '<div class="grid3">' +
        ui.stat('Popularité', Math.round(nat.ind.popularite),
          nat.ind.popularite >= 45 ? 'good' : 'bad') +
        ui.stat('Croissance', u.dec(nat.ind.croissance, 2) + ' %') +
        ui.stat('Solde', u.fmtSigned(last.balance), ui.signCls(last.balance)) + '</div>';
      if (last.emergency > 0) {
        h += '<div class="card tight bad" style="margin-top:8px">Importations ' +
          'd\'urgence : ' + u.fmtMoney(last.emergency) + '. Développez votre ' +
          'production pour éviter ces achats coûteux.</div>';
      }
      h += '<div class="card flat" style="margin-top:10px">' +
        reports.slice(-6).map(function (r) {
          return '<div class="entry"><span class="m">M' + r.month + '</span><span>' +
            u.esc(r.events.join(' · ')) + '</span></div>';
        }).join('') + '</div>' +
        '<button class="btn full" style="margin-top:10px" data-act="ui.close">Continuer</button>';
      ui.modal('📅 ' + (n > 1 ? n + ' mois écoulés' : 'Conseil des ministres'), h, {});
    }
    ui.refresh();
  }

  ui.act('nt.auto', function () { toggleAutoAdvance(); });
  ui.act('nt.month', function () { advance(1); });
  ui.act('nt.year', function () { advance(12); });
  ui.act('nt.salary', function () { if (G.nation.drawSalary()) ui.refresh(); });
  ui.act('nt.subsidy', function () {
    var n = G.nation.get();
    ui.confirm('Lancer un plan de soutien ?',
      'Le Trésor verse ' + u.fmtMoney(n.gdp * 0.004) + '. Vos entreprises produisent ' +
      '25 % de plus pendant six mois, mais l\'opinion y voit un conflit d\'intérêts.',
      function () { G.nation.subsidize(); ui.refresh(); }, 'Signer le décret');
  });
  ui.act('nt.inject', function () {
    var n = G.nation.get();
    var suggested = Math.min(G.state.money, n.gdp * 0.002);
    ui.modal('🎁 Don au Trésor public',
      '<p class="muted">Un versement personnel renfloue les caisses et fait ' +
      'grimper votre popularité.</p>' +
      '<label class="field">Montant</label>' +
      '<input type="number" id="nt-give" value="' + Math.round(suggested) + '">' +
      '<button class="btn primary full" style="margin-top:10px" data-act="nt.doinject">' +
      'Verser</button>', {});
  });
  ui.act('nt.doinject', function () {
    var input = document.getElementById('nt-give');
    var v = input ? parseFloat(input.value) : 0;
    if (v > 0 && G.nation.injectFunds(v)) {
      ui.toast('🤝 Don effectué', 'Votre cote de popularité grimpe', 'good');
    }
    ui.closeModal();
  });

  /* ------------------------------------------------------------- vue ---- */

  function subTabs(n) {
    var tabs = [['carte', '🗺️ Carte']];
    if (n) {
      tabs.push(['nation', '🏛️ Nation'], ['economie', '💶 Économie'],
        ['armee', '🎖️ Armée'], ['diplo', '🌐 Diplomatie'], ['recherche', '🔬 Recherche']);
    }
    return '<div class="sub-tabs">' + tabs.map(function (t) {
      return '<button class="sub' + (sub === t[0] ? ' active' : '') +
        '" data-act="nt.sub" data-sub="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</div>';
  }
  ui.act('nt.sub', function (d) {
    sub = d.sub;
    if (sub === 'carte') stopAutoAdvance();
    ui.refresh();
  });

  G.ui.register('pays', {
    icon: '🌍', label: 'Pays',
    render: function () {
      var n = G.nation.get();
      if (!n) stopAutoAdvance();
      var h = '<div class="view-title">' + (n ? u.esc(n.name) : 'Géopolitique') + '</div>';
      h += subTabs(n);
      if (!n || sub === 'carte') h += renderMap();
      else if (sub === 'nation') h += renderDash(n);
      else if (sub === 'economie') h += renderEconomy(n);
      else if (sub === 'armee') h += renderArmy(n);
      else if (sub === 'diplo') h += renderDiplomacy(n);
      else h += renderResearch(n);
      return h;
    },
    after: function (root) {
      if (!G.nation.get() || sub === 'carte') {
        bindMap(root);
        stopAutoAdvance();
      }
    }
  });
})();
