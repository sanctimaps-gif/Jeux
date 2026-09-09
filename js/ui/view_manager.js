/* Onglet Manager : gestion des clubs et matchs jouables. */
window.G = window.G || {};

(function () {
  'use strict';
  var u = G.util, ui = G.ui;

  var sub = 'club';
  var live = null;        // match ou course en cours
  var timer = null;
  var paused = false;

  function clubs() { return G.state.manager.clubs; }
  function activeClub() {
    var a = G.state.manager.active;
    return a ? clubs()[a] : null;
  }

  /* ==================================================== ACQUISITION ====== */

  function renderShop() {
    var h = '<div class="card"><div class="card-head">🏅 Devenir propriétaire</div>' +
      '<div class="mute2">Rachetez un club et prenez les commandes : effectif, ' +
      'transferts, tactique, installations… et les matchs, que vous jouez ' +
      'vous-même. Tout ce que le club encaisse arrive sur votre compte, ' +
      'prêt à être réinvesti ailleurs.</div></div>';

    for (var i = 0; i < G.DATA.sports.length; i++) {
      var sp = G.DATA.sports[i];
      if (clubs()[sp.id]) continue;
      var cost = sp.economy.clubCost;
      var can = G.state.money >= cost;
      h += '<div class="card"><div class="row">' +
        '<div class="item-icon" style="font-size:30px">' + sp.icon + '</div>' +
        '<div class="item-main"><div class="t">' + sp.name + '</div>' +
        '<div class="s">' + sp.leagueName + ' · ' + sp.leagueSize + ' équipes · ' +
        (sp.type === 'race' ? '2 pilotes' : sp.lineupSize + ' titulaires, effectif de ' +
          sp.squadSize) + '</div></div>' +
        '<div class="item-side"><button class="btn sm ' + (can ? 'primary' : '') +
        '" data-act="mg.buyclub" data-id="' + sp.id + '"' + (can ? '' : ' disabled') + '>' +
        u.fmtMoney(cost) + '</button></div></div>' +
        '<div class="mute2" style="margin-top:6px">Recettes indicatives par rencontre : ' +
        u.fmtMoney(sp.economy.gateBase + sp.economy.sponsorBase) +
        ' · masse salariale de départ ' + u.fmtMoney(sp.economy.wageBase * sp.squadSize * 0.6) +
        '</div></div>';
    }
    return h;
  }

  ui.act('mg.buyclub', function (d) {
    var sp = G.DATA.sportById[d.id];
    ui.confirm('Racheter un club de ' + sp.name + ' ?',
      'Coût : ' + u.fmtMoney(sp.economy.clubCost) + '. Vous héritez d\'un effectif ' +
      'moyen, d\'installations de base et d\'une place en ' + sp.leagueName + '.',
      function () {
        if (G.manager.buyClub(d.id)) {
          G.state.manager.active = d.id;
          sub = 'club';
          ui.toast('🏟️ Club acquis !', clubs()[d.id].name, 'good');
        }
        ui.refresh();
      }, 'Racheter');
  });

  /* ====================================================== SÉLECTEUR ====== */

  function clubSelector() {
    var ids = Object.keys(clubs());
    if (!ids.length) return '';
    var h = '<div class="sub-tabs">';
    for (var i = 0; i < ids.length; i++) {
      var c = clubs()[ids[i]];
      var sp = G.DATA.sportById[ids[i]];
      h += '<button class="sub' + (G.state.manager.active === ids[i] ? ' active' : '') +
        '" data-act="mg.select" data-id="' + ids[i] + '">' + sp.icon + ' ' +
        u.esc(c.name) + '</button>';
    }
    h += '<button class="sub" data-act="mg.shop">➕ Nouveau club</button></div>';
    return h;
  }

  function sectionTabs() {
    var sp = G.DATA.sportById[G.state.manager.active];
    var tabs = [['club', '🏟️ Club'], ['effectif', '👥 Effectif'],
    ['transferts', '💱 Transferts'], ['tactique', sp && sp.type === 'race' ? '🔧 Voiture' : '📋 Tactique'],
    ['infra', '🏗️ Structure'], ['palmares', '🏆 Palmarès']];
    return '<div class="sub-tabs">' + tabs.map(function (t) {
      return '<button class="sub' + (sub === t[0] ? ' active' : '') +
        '" data-act="mg.sub" data-sub="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</div>';
  }

  ui.act('mg.select', function (d) {
    G.state.manager.active = d.id; sub = 'club'; ui.refresh();
  });
  ui.act('mg.shop', function () { G.state.manager.active = null; ui.refresh(); });
  ui.act('mg.sub', function (d) { sub = d.sub; ui.refresh(); });

  /* ========================================================= APERÇU ====== */

  function renderClub(club) {
    var sp = G.DATA.sportById[club.sport];
    var r = G.manager.teamRatings(club);
    var h = '';

    h += '<div class="card"><div class="row">' +
      '<div class="item-icon" style="font-size:30px">' + sp.icon + '</div>' +
      '<div class="item-main"><div class="t">' + u.esc(club.name) + '</div>' +
      '<div class="s">' + sp.leagueName + ' · saison ' + club.season +
      ' · ' + (club.league.isRace ? 'GP ' + Math.min(club.league.round + 1,
        club.league.fixtures.length) + '/' + club.league.fixtures.length
        : 'journée ' + Math.min(club.league.round + 1, club.league.fixtures.length) +
        '/' + club.league.fixtures.length) + '</div></div>' +
      '<div class="item-side"><div class="ov ' + ui.ovrClass(r.ovr) + '">' +
      Math.round(r.ovr) + '</div></div></div>';

    h += '<div class="grid4" style="margin-top:8px">' +
      ui.stat('Attaque', Math.round(r.att)) +
      ui.stat('Défense', Math.round(r.def)) +
      ui.stat('Renom', Math.round(club.rep)) +
      ui.stat('Classement', G.manager.rankOf(club) + 'e') +
      '</div></div>';

    /* Prochaine rencontre */
    h += nextMatchCard(club, sp);

    /* Finances */
    var last = club.finances.last;
    h += '<div class="card"><div class="card-head">💶 Finances<span class="sub">saison ' +
      club.season + '</span></div>' +
      '<div class="grid3">' +
      ui.stat('Recettes', u.fmtMoney(club.finances.seasonIn), 'good') +
      ui.stat('Salaires', u.fmtMoney(club.finances.seasonOut), 'bad') +
      ui.stat('Solde', u.fmtSigned(club.finances.seasonIn - club.finances.seasonOut),
        ui.signCls(club.finances.seasonIn - club.finances.seasonOut)) +
      '</div>';
    if (last) {
      h += '<div class="mute2" style="margin-top:7px">Dernière rencontre : ' +
        'billetterie ' + u.fmtMoney(last.gate) + ' · sponsors ' + u.fmtMoney(last.sponsor) +
        ' · primes ' + u.fmtMoney(last.prize) + ' · salaires ' + u.fmtMoney(last.wages) +
        ' → <b class="' + ui.signCls(last.net) + '">' + u.fmtSigned(last.net) + '</b></div>';
    }
    h += '<div class="mute2" style="margin-top:4px">Masse salariale par rencontre : ' +
      u.fmtMoney(G.manager.wageBill(club)) + '</div></div>';

    /* Classement */
    h += standingsCard(club);

    /* Derniers résultats */
    if (club.results.length) {
      h += '<div class="card"><div class="card-head">📊 Derniers résultats</div><div class="feed">';
      for (var i = 0; i < Math.min(8, club.results.length); i++) {
        var res = club.results[i];
        var cls = res.race ? (res.you > 0 ? 'good' : '') :
          (res.you > res.opp ? 'good' : res.you === res.opp ? '' : 'bad');
        h += '<div class="entry ' + cls + '"><span class="m">J' + res.round + '</span>' +
          '<span>' + (res.race ? res.you + ' pts · ' + u.esc(res.oppName)
            : (res.home ? '' : '(ext.) ') + res.you + ' - ' + res.opp + ' vs ' +
            u.esc(res.oppName)) +
          ' <span class="mute2">' + u.fmtSigned(res.net) + '</span></span></div>';
      }
      h += '</div></div>';
    }
    return h;
  }

  function nextMatchCard(club, sp) {
    var h = '<div class="card">';
    if (sp.type === 'race') {
      var evt = G.race.nextRace(club);
      if (!evt) return h + '<div class="muted">Saison terminée.</div></div>';
      h += '<div class="card-head">🏁 Prochain Grand Prix</div>' +
        '<div class="t" style="font-size:16px;font-weight:700">' + u.esc(evt.circuit) + '</div>' +
        '<div class="mute2">Course ' + evt.round + ' sur ' + evt.total + ' · ' +
        sp.race.laps + ' tours · ' + sp.race.grid + ' voitures</div>';
    } else {
      var fx = G.manager.nextFixture(club);
      if (!fx) return h + '<div class="muted">Saison terminée.</div></div>';
      h += '<div class="card-head">⚔️ Prochaine rencontre</div>' +
        '<div class="scorebar"><div class="team">' +
        u.esc(fx.youHome ? club.name : fx.opp.name) + '</div>' +
        '<div class="min">' + (fx.youHome ? 'à domicile' : 'à l\'extérieur') + '</div>' +
        '<div class="team r">' + u.esc(fx.youHome ? fx.opp.name : club.name) + '</div></div>' +
        '<div class="mute2">Adversaire évalué à ' + Math.round(fx.opp.str) +
        ' · votre équipe à ' + Math.round(G.manager.teamRatings(club).ovr) + '</div>';
    }
    var isRace = sp.type === 'race';
    h += '<div class="grid2" style="margin-top:10px">' +
      '<button class="btn primary" data-act="mg.play">▶️ ' +
      (isRace ? 'Jouer la course' : 'Jouer le match') + '</button>' +
      '<button class="btn" data-act="mg.sim">⏩ Simuler</button></div>';

    var injured = club.players.filter(function (p) { return p.injury > 0; }).length;
    var tired = club.players.filter(function (p) { return p.starter && p.energy < 45; }).length;
    if (injured || tired) {
      h += '<div class="mute2" style="margin-top:6px">' +
        (injured ? '🚑 ' + injured + ' blessé(s). ' : '') +
        (tired ? '😮‍💨 ' + tired + ' titulaire(s) à court de jus.' : '') + '</div>';
    }
    return h + '</div>';
  }

  function standingsCard(club) {
    var st = G.manager.standings(club);
    var isRace = !!club.league.isRace;
    var h = '<div class="card"><div class="card-head">🏆 ' +
      (isRace ? 'Championnat constructeurs' : 'Classement') + '</div>' +
      '<div class="scroll-x"><table class="table"><tr><th>#</th><th>Équipe</th>' +
      '<th class="num">J</th>' + (isRace ? '' :
        '<th class="num">V</th><th class="num">N</th><th class="num">D</th>' +
        '<th class="num">+/-</th>') + '<th class="num">Pts</th></tr>';
    for (var i = 0; i < st.length; i++) {
      var t = st[i].t;
      h += '<tr class="' + (st[i].i === 0 ? 'you' : '') + '"><td>' + (i + 1) + '</td>' +
        '<td>' + u.esc(t.name) + '</td><td class="num">' + t.played + '</td>' +
        (isRace ? '' : '<td class="num">' + t.w + '</td><td class="num">' + t.d +
          '</td><td class="num">' + t.l + '</td><td class="num">' +
          (t.sf - t.sa > 0 ? '+' : '') + (t.sf - t.sa) + '</td>') +
        '<td class="num"><b>' + t.pts + '</b></td></tr>';
    }
    return h + '</table></div></div>';
  }

  /* ======================================================== EFFECTIF ===== */

  function playerRow(club, p, opts) {
    var sp = G.DATA.sportById[club.sport];
    var o = G.manager.ovr(p, sp);
    var pd = G.manager.posDef(sp, p.pos);
    var h = '<div class="pl' + (p.starter ? ' start' : '') + '" data-act="mg.player" data-id="' +
      p.id + '">' +
      '<div class="pos">' + p.pos + '</div>' +
      '<div class="nm"><div class="n">' + u.esc(p.name) +
      (p.injury ? ' 🚑' : '') + (p.starter ? ' <span class="pill gold">titulaire</span>' : '') +
      '</div>' +
      '<div class="d">' + p.age + ' ans · ' + (pd ? pd.name : '') +
      ' · ' + u.fmtMoney(p.value) + ' · ' + u.fmtMoney(p.wage) + '/match</div>' +
      '<div class="row" style="gap:4px;margin-top:3px">' +
      '<span class="mute2">Forme</span>' + miniBar(p.form) +
      '<span class="mute2">Jus</span>' + miniBar(p.energy) +
      '</div></div>' +
      '<div class="ov ' + ui.ovrClass(o) + '">' + o + '</div>';
    if (opts && opts.action) h += opts.action(p);
    return h + '</div>';
  }

  function miniBar(v) {
    var cls = v >= 66 ? 'green' : v >= 40 ? '' : 'red';
    return '<span style="display:inline-block;width:38px">' +
      '<span class="bar thin ' + cls + '"><i style="width:' + u.clamp(v, 0, 100) +
      '%"></i></span></span>';
  }

  function renderSquad(club) {
    var sp = G.DATA.sportById[club.sport];
    var list = u.sortBy(club.players, function (p) {
      return (p.starter ? 1000 : 0) + G.manager.ovr(p, sp);
    }, true);

    var h = '<div class="card"><div class="row between" style="margin-bottom:6px">' +
      '<div><b>' + club.players.length + ' joueurs</b> <span class="mute2">· ' +
      G.manager.starters(club).length + '/' + sp.lineupSize + ' titulaires</span></div>' +
      '<button class="btn xs" data-act="mg.auto">🔄 Composition auto</button></div>';
    h += '<div class="mute2">Touchez un joueur pour le faire entrer dans le onze, ' +
      'consulter sa fiche ou le vendre.</div></div>';

    h += '<div class="card">';
    for (var i = 0; i < list.length; i++) h += playerRow(club, list[i]);
    return h + '</div>';
  }

  ui.act('mg.auto', function () {
    G.manager.autoLineup(activeClub());
    ui.toast('🔄 Composition mise à jour', 'Meilleure équipe alignée');
    ui.refresh();
  });

  ui.act('mg.player', function (d) {
    var club = activeClub();
    var sp = G.DATA.sportById[club.sport];
    var p = null;
    for (var i = 0; i < club.players.length; i++) if (club.players[i].id === d.id) p = club.players[i];
    if (!p) return;
    var o = G.manager.ovr(p, sp);

    var html = '<div class="row between"><div>' +
      '<div style="font-size:17px;font-weight:800">' + u.esc(p.name) + '</div>' +
      '<div class="mute2">' + p.age + ' ans · ' + G.manager.posDef(sp, p.pos).name +
      ' · contrat ' + p.contract + ' saison(s)</div></div>' +
      '<div class="ov ' + ui.ovrClass(o) + '" style="width:44px;height:44px;font-size:18px">' +
      o + '</div></div>';

    html += '<div class="grid3" style="margin:10px 0">' +
      ui.stat('Potentiel', p.pot) +
      ui.stat('Valeur', u.fmtMoney(p.value)) +
      ui.stat('Salaire', u.fmtMoney(p.wage)) + '</div>';

    html += '<div class="card flat tight">';
    var keys = ['att', 'def', 'phy', 'tec', 'men'];
    for (var k = 0; k < keys.length; k++) {
      html += '<div class="row" style="gap:8px;padding:3px 0">' +
        '<span style="width:82px" class="small">' + G.DATA.attrLabels[keys[k]] + '</span>' +
        '<span style="flex:1">' + ui.bar(p.attrs[keys[k]]) + '</span>' +
        '<b style="width:26px;text-align:right">' + p.attrs[keys[k]] + '</b></div>';
    }
    html += '</div>';

    html += '<div class="grid3" style="margin:10px 0">' +
      ui.stat('Forme', Math.round(p.form)) +
      ui.stat('Énergie', Math.round(p.energy)) +
      ui.stat('Moral', Math.round(p.morale)) + '</div>';

    html += '<div class="mute2">' + p.apps + ' rencontre(s) · ' + (p.scored || 0) +
      ' réalisation(s)' + (p.injury ? ' · 🚑 indisponible ' + p.injury + ' match(s)' : '') +
      '</div>';

    html += '<div class="grid2" style="margin-top:12px">' +
      '<button class="btn" data-act="mg.toggle" data-id="' + p.id + '">' +
      (p.starter ? '🪑 Mettre sur le banc' : '✅ Titulariser') + '</button>' +
      '<button class="btn danger" data-act="mg.sell" data-id="' + p.id + '">' +
      '💱 Vendre (' + u.fmtMoney(p.value) + ')</button></div>';

    ui.modal('Fiche joueur', html, {});
  });

  ui.act('mg.toggle', function (d) {
    var club = activeClub();
    var sp = G.DATA.sportById[club.sport];
    for (var i = 0; i < club.players.length; i++) {
      if (club.players[i].id !== d.id) continue;
      var p = club.players[i];
      if (p.starter) { p.starter = false; }
      else {
        if (p.injury) { ui.toast('🚑 Joueur blessé', 'Il ne peut pas jouer', 'bad'); return; }
        var n = G.manager.starters(club).length;
        if (n >= sp.lineupSize) {
          ui.toast('👥 Onze complet', 'Sortez d\'abord un titulaire', 'bad');
          return;
        }
        p.starter = true;
      }
    }
    ui.closeModal();
  });

  ui.act('mg.sell', function (d) {
    var club = activeClub();
    if (G.manager.sellPlayer(club, d.id)) ui.closeModal();
  });

  /* ======================================================= TRANSFERTS ==== */

  function renderTransfers(club) {
    var sp = G.DATA.sportById[club.sport];
    var list = G.manager.refreshTransfers(club);
    var h = '<div class="card"><div class="row between">' +
      '<div><b>Joueurs disponibles</b><div class="mute2">Liste renouvelée par vos ' +
      'recruteurs (niveau ' + club.staff.scout + ')</div></div>' +
      '<button class="btn xs" data-act="mg.scoutnow">🔍 Prospecter</button></div></div>';

    h += '<div class="card">';
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var o = G.manager.ovr(p, sp);
      var can = G.state.money >= p.askPrice;
      h += '<div class="pl">' +
        '<div class="pos">' + p.pos + '</div>' +
        '<div class="nm"><div class="n">' + u.esc(p.name) + '</div>' +
        '<div class="d">' + p.age + ' ans · potentiel ' + p.pot + ' · salaire ' +
        u.fmtMoney(p.wage) + '/match</div></div>' +
        '<div class="ov ' + ui.ovrClass(o) + '">' + o + '</div>' +
        '<div class="item-side" style="margin-left:6px">' +
        '<button class="btn sm ' + (can ? 'primary' : '') + '" data-act="mg.sign" data-id="' +
        p.id + '"' + (can ? '' : ' disabled') + '>' + u.fmtMoney(p.askPrice) + '</button>' +
        '</div></div>';
    }
    h += '</div>';

    h += '<div class="card"><div class="card-head">💱 Vendre un joueur</div>';
    var mine = u.sortBy(club.players, function (p) { return p.value; }, true);
    for (var j = 0; j < mine.length; j++) {
      var m = mine[j];
      h += '<div class="item"><div class="item-main">' +
        '<div class="t">' + u.esc(m.name) + ' <span class="mute2">' + m.pos + '</span></div>' +
        '<div class="s">' + m.age + ' ans · note ' + G.manager.ovr(m, sp) + '</div></div>' +
        '<div class="item-side"><button class="btn xs danger" data-act="mg.sell" data-id="' +
        m.id + '">' + u.fmtMoney(m.value) + '</button></div></div>';
    }
    return h + '</div>';
  }

  ui.act('mg.scoutnow', function () {
    G.manager.refreshTransfers(activeClub(), true);
    ui.toast('🔍 Nouvelle liste', 'Vos recruteurs ont fait le tour du marché');
    ui.refresh();
  });
  ui.act('mg.sign', function (d) {
    var club = activeClub();
    if (G.manager.signPlayer(club, d.id)) {
      ui.toast('✍️ Transfert bouclé', 'Bienvenue au club', 'good');
    }
    ui.refresh();
  });

  /* ========================================================= TACTIQUE ==== */

  function renderTactics(club) {
    var sp = G.DATA.sportById[club.sport];
    var h = '';

    if (sp.type === 'race') {
      h += '<div class="card"><div class="card-head">🔧 Développement de la voiture</div>';
      for (var i = 0; i < sp.car.length; i++) {
        var part = sp.car[i];
        var lvl = club.car[part.id];
        var cost = G.manager.carPartCost(club, part.id);
        var can = G.state.money >= cost;
        h += '<div class="item"><div class="item-icon">' + part.icon + '</div>' +
          '<div class="item-main"><div class="t">' + part.name + ' <b>' + Math.round(lvl) +
          '</b></div><div class="s">' + part.desc + '</div>' + ui.bar(lvl) + '</div>' +
          '<div class="item-side"><button class="btn sm ' + (can ? 'primary' : '') +
          '" data-act="mg.car" data-part="' + part.id + '"' + (can ? '' : ' disabled') + '>' +
          u.fmtMoney(cost) + '</button></div></div>';
      }
      h += '</div>';
    }

    var groups = [['mentality', 'Approche'], ['pressing', 'Organisation'], ['style', 'Style de jeu']];
    h += '<div class="card"><div class="card-head">📋 Consignes</div>';
    for (var g = 0; g < groups.length; g++) {
      var key = groups[g][0];
      var opts = sp.tactics[key];
      h += '<div style="margin-bottom:10px"><div class="mute2" style="margin-bottom:4px">' +
        groups[g][1] + '</div><div class="row wrap" style="gap:5px">';
      for (var o2 = 0; o2 < opts.length; o2++) {
        h += '<button class="btn xs' + (club.tactics[key] === o2 ? ' primary' : '') +
          '" data-act="mg.tac" data-k="' + key + '" data-v="' + o2 + '">' +
          u.esc(opts[o2]) + '</button>';
      }
      h += '</div></div>';
    }
    var r = G.manager.teamRatings(club);
    h += '<div class="grid2">' + ui.stat('Puissance offensive', Math.round(r.att)) +
      ui.stat('Solidité défensive', Math.round(r.def)) + '</div>';
    h += '<div class="mute2" style="margin-top:6px">Une approche offensive augmente ' +
      'votre production mais découvre votre défense. Les consignes se règlent aussi ' +
      'en direct pendant le match.</div></div>';
    return h;
  }

  ui.act('mg.tac', function (d) {
    var club = activeClub();
    club.tactics[d.k] = parseInt(d.v, 10);
    ui.refresh();
  });
  ui.act('mg.car', function (d) {
    if (G.manager.upgradeCar(activeClub(), d.part)) {
      ui.toast('🔧 Évolution installée', 'La voiture gagne en performance', 'good');
    }
    ui.refresh();
  });

  /* ======================================================== STRUCTURE ==== */

  function renderInfra(club) {
    var h = '<div class="card"><div class="card-head">🏗️ Installations</div>';
    for (var i = 0; i < G.DATA.facilities.length; i++) {
      var f = G.DATA.facilities[i];
      var lvl = club.facilities[f.id] || 1;
      var cost = G.manager.facilityCost(club, f.id);
      var can = G.state.money >= cost && lvl < 10;
      h += '<div class="item"><div class="item-icon">' + f.icon + '</div>' +
        '<div class="item-main"><div class="t">' + f.name +
        ' <span class="pill gold">Niv. ' + lvl + '</span></div>' +
        '<div class="s">' + f.desc + '</div>' + ui.bar(lvl * 10) + '</div>' +
        '<div class="item-side"><button class="btn sm ' + (can ? 'primary' : '') +
        '" data-act="mg.fac" data-id="' + f.id + '"' + (can ? '' : ' disabled') + '>' +
        (lvl >= 10 ? 'MAX' : u.fmtMoney(cost)) + '</button></div></div>';
    }
    h += '</div>';

    h += '<div class="card"><div class="card-head">🧑‍🏫 Encadrement</div>';
    for (var j = 0; j < G.DATA.staffRoles.length; j++) {
      var s = G.DATA.staffRoles[j];
      var lv = club.staff[s.id] || 1;
      var c2 = G.manager.staffCost(club, s.id);
      var can2 = G.state.money >= c2 && lv < 10;
      h += '<div class="item"><div class="item-icon">' + s.icon + '</div>' +
        '<div class="item-main"><div class="t">' + s.name +
        ' <span class="pill">Niv. ' + lv + '</span></div>' +
        '<div class="s">' + s.effect + '</div></div>' +
        '<div class="item-side"><button class="btn sm ' + (can2 ? 'primary' : '') +
        '" data-act="mg.staff" data-id="' + s.id + '"' + (can2 ? '' : ' disabled') + '>' +
        (lv >= 10 ? 'MAX' : u.fmtMoney(c2)) + '</button></div></div>';
    }
    h += '</div>';

    h += '<div class="card"><div class="card-head">⚠️ Céder le club</div>' +
      '<div class="mute2">Valeur estimée : ' + u.fmtMoney(G.manager.clubValue(club)) +
      ' (revente à 85 %).</div>' +
      '<button class="btn danger full" style="margin-top:8px" data-act="mg.sellclub">' +
      'Vendre ' + u.esc(club.name) + '</button></div>';
    return h;
  }

  ui.act('mg.fac', function (d) {
    if (G.manager.upgradeFacility(activeClub(), d.id)) {
      ui.toast('🏗️ Travaux terminés', 'Installation améliorée', 'good');
    }
    ui.refresh();
  });
  ui.act('mg.staff', function (d) {
    if (G.manager.upgradeStaff(activeClub(), d.id)) {
      ui.toast('🧑‍🏫 Nouvel encadrant', 'Le staff monte en gamme', 'good');
    }
    ui.refresh();
  });
  ui.act('mg.sellclub', function () {
    var club = activeClub();
    ui.confirm('Vendre ' + u.esc(club.name) + ' ?',
      'Vous récupérez ' + u.fmtMoney(G.manager.clubValue(club) * 0.85) +
      ' mais perdez l\'effectif, les installations et le palmarès en cours.',
      function () { G.manager.sellClub(club.sport); ui.refresh(); }, 'Vendre');
  });

  /* ========================================================= PALMARÈS ==== */

  function renderPalmares(club) {
    var h = '<div class="card"><div class="card-head">🏆 Trophées</div>';
    var t = G.state.manager.trophies;
    if (!t.length) h += '<div class="mute2">Aucun titre pour l\'instant. Ça viendra.</div>';
    for (var i = 0; i < t.length; i++) {
      var sp = G.DATA.sportById[t[i].sport];
      h += '<div class="item"><div class="item-icon">' + (sp ? sp.icon : '🏆') + '</div>' +
        '<div class="item-main"><div class="t">' + u.esc(t[i].name) + '</div>' +
        '<div class="s">' + u.esc(t[i].club) + ' · saison ' + t[i].season + '</div></div></div>';
    }
    h += '</div>';

    h += '<div class="card"><div class="card-head">📚 Historique du club</div>';
    if (!club.history.length) h += '<div class="mute2">Première saison en cours.</div>';
    else {
      h += '<div class="scroll-x"><table class="table"><tr><th>Saison</th><th class="num">Place</th>' +
        '<th class="num">Pts</th><th class="num">Recettes</th><th class="num">Salaires</th></tr>';
      for (var j = club.history.length - 1; j >= 0; j--) {
        var hh = club.history[j];
        h += '<tr><td>' + hh.season + '</td><td class="num">' + hh.rank + 'e</td>' +
          '<td class="num">' + hh.pts + '</td><td class="num">' + u.fmtMoney(hh.in) +
          '</td><td class="num">' + u.fmtMoney(hh.out) + '</td></tr>';
      }
      h += '</table></div>';
    }

    var sp2 = G.DATA.sportById[club.sport];
    var scorers = u.sortBy(club.players.filter(function (p) { return (p.scored || 0) > 0; }),
      function (p) { return p.scored; }, true).slice(0, 6);
    if (scorers.length) {
      h += '<div class="hr"></div><div class="card-head">🎯 Meilleurs réalisateurs</div>';
      for (var k = 0; k < scorers.length; k++) {
        h += '<div class="row between small" style="padding:3px 0"><span>' +
          u.esc(scorers[k].name) + '</span><b>' + scorers[k].scored + '</b></div>';
      }
    }
    return h + '</div>';
  }

  /* ==================================================== MATCH JOUABLE ==== */

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function startMatch(quick) {
    var club = activeClub();
    if (!club) return;
    var sp = G.DATA.sportById[club.sport];
    var isRace = sp.type === 'race';

    if (quick) {
      var M = isRace ? G.race.quickSim(club) : G.match.quickSim(club);
      if (!M) { ui.toast('📅 Saison terminée', 'Le calendrier est bouclé', 'bad'); return; }
      showResult(M, isRace);
      return;
    }

    live = isRace ? G.race.create(club) : G.match.create(club);
    if (!live) { ui.toast('📅 Saison terminée', 'Le calendrier est bouclé', 'bad'); return; }
    paused = false;
    ui.modal(isRace ? '🏁 ' + u.esc(live.circuit) : '⚔️ Match en direct',
      matchHtml(live, isRace), {
      onClose: function () {
        stopTimer();
        if (live && !live.done) {
          /* On ne laisse pas un match en plan : l'adjoint le termine. */
          var guard = 0;
          while (!live.done && guard++ < 400) {
            if (live.decision) (isRace ? G.race : G.match).decide(live, 1);
            else (isRace ? G.race : G.match).step(live);
          }
          if (!live.done) (isRace ? G.race : G.match).finish(live);
          ui.toast('⏱️ Rencontre terminée sans vous',
            isRace ? 'Résultat du Grand Prix enregistré' : G.match.scoreLine(live));
        }
        live = null;
      }
    });
    tickMatch(isRace);
  }

  function tickMatch(isRace) {
    stopTimer();
    var engine = isRace ? G.race : G.match;
    timer = setInterval(function () {
      if (!live) { stopTimer(); return; }
      if (paused || live.decision || live.done) {
        if (live.done) { stopTimer(); }
        return;
      }
      engine.step(live);
      ui.modalUpdate(matchHtml(live, isRace));
      if (live.done) stopTimer();
    }, G.state.settings.matchSpeed);
  }

  function matchHtml(M, isRace) {
    return isRace ? raceHtml(M) : teamMatchHtml(M);
  }

  function teamMatchHtml(M) {
    var h = '';
    h += '<div class="scorebar">' +
      '<div class="team">' + u.esc(M.club.name) + '</div>' +
      '<div><div class="sc">' + M.score.you + ' - ' + M.score.opp + '</div>' +
      '<div class="min">' + u.fmtClock(M.minute) + ' / ' + M.sport.duration + "'</div></div>" +
      '<div class="team r">' + u.esc(M.oppName) + '</div></div>';

    h += ui.bar(M.seg / M.segments * 100, 'blue');

    h += '<div class="grid3" style="margin:9px 0">' +
      ui.stat('Possession', M.stats.poss + ' %') +
      ui.stat('Occasions', M.stats.youShots + ' - ' + M.stats.oppShots) +
      ui.stat('Dynamique', M.mom > 0.15 ? 'Pour vous' : M.mom < -0.15 ? 'Contre vous' : 'Neutre',
        M.mom > 0.15 ? 'good' : M.mom < -0.15 ? 'bad' : '') +
      '</div>';

    if (M.decision) h += decisionHtml(M.decision);
    else if (!M.done) {
      h += '<div class="grid3" style="margin-bottom:9px">' +
        '<button class="btn sm" data-act="mg.pause">' + (paused ? '▶️ Reprendre' : '⏸️ Pause') +
        '</button>' +
        '<button class="btn sm" data-act="mg.step">⏭️ Séquence</button>' +
        '<button class="btn sm" data-act="mg.rush">⏩ Fin du match</button></div>';
    }

    if (M.done) h += resultBlock(M, false);

    h += '<div class="card tight"><div class="feed">';
    for (var i = 0; i < M.feed.length; i++) {
      h += '<div class="entry ' + M.feed[i].type + '"><span class="m">' +
        M.feed[i].min + "'</span><span>" + u.esc(M.feed[i].txt) + '</span></div>';
    }
    return h + '</div></div>';
  }

  function raceHtml(R) {
    var lead = G.race.myLead(R);
    var mine = G.race.myCars(R);
    var h = '';

    h += '<div class="scorebar"><div class="team">' + u.esc(R.club.name) + '</div>' +
      '<div><div class="sc">' + R.lap + '/' + R.laps + '</div>' +
      '<div class="min">tours · ' + (R.rain ? '🌧️ pluie' : '☀️ sec') +
      (R.safety > 0 ? ' · 🟡 SC' : '') + '</div></div>' +
      '<div class="team r">' + u.esc(R.circuit.replace('Grand Prix ', 'GP ')) + '</div></div>';

    h += ui.bar(R.lap / R.laps * 100, 'blue');

    h += '<div class="card tight" style="margin-top:9px"><table class="table">' +
      '<tr><th>Pos</th><th>Pilote</th><th>Gommes</th><th class="num">Arrêts</th></tr>';
    for (var i = 0; i < mine.length; i++) {
      var c = mine[i];
      h += '<tr class="you"><td>' + (c.out ? 'ABD' : 'P' + c.pos) + '</td>' +
        '<td>' + u.esc(c.driver) + (c.lead ? ' ⭐' : '') + '</td>' +
        '<td>' + G.race.tyreDef(R.sport, c.tyre).name + ' ' +
        Math.round(Math.max(0, 100 - c.wear)) + '%</td>' +
        '<td class="num">' + c.stops + '</td></tr>';
    }
    h += '</table></div>';

    /* Cinq premiers en piste. */
    var top = u.sortBy(R.cars.filter(function (x) { return !x.out; }),
      function (x) { return x.pos; }).slice(0, 5);
    h += '<div class="card tight"><div class="card-head">Classement en piste</div>';
    for (var j = 0; j < top.length; j++) {
      h += '<div class="row between small" style="padding:2px 0"><span>' +
        'P' + top[j].pos + ' ' + u.esc(top[j].driver) + '</span><span class="mute2">' +
        u.esc(top[j].team) + '</span></div>';
    }
    h += '</div>';

    if (R.decision) h += decisionHtml(R.decision);
    else if (!R.done) {
      h += '<div class="grid3" style="margin-bottom:9px">' +
        '<button class="btn sm" data-act="mg.pause">' + (paused ? '▶️ Reprendre' : '⏸️ Pause') +
        '</button>' +
        '<button class="btn sm" data-act="mg.step">⏭️ Un tour</button>' +
        '<button class="btn sm" data-act="mg.rush">⏩ Arrivée</button></div>';
    }

    if (R.done) h += resultBlock(R, true);

    h += '<div class="card tight"><div class="feed">';
    for (var k = 0; k < R.feed.length; k++) {
      h += '<div class="entry ' + R.feed[k].type + '"><span class="m">T' +
        R.feed[k].min + '</span><span>' + u.esc(R.feed[k].txt) + '</span></div>';
    }
    return h + '</div></div>';
  }

  function decisionHtml(dec) {
    var h = '<div class="decision"><div class="dt">' + u.esc(dec.title) + '</div>' +
      '<div class="dx">' + u.esc(dec.text) + '</div>';
    for (var i = 0; i < dec.options.length; i++) {
      h += '<button class="opt" data-act="mg.decide" data-i="' + i + '">' +
        '<b>' + u.esc(dec.options[i].label) + '</b>' +
        '<span>' + u.esc(dec.options[i].hint || '') + '</span></button>';
    }
    return h + '</div>';
  }

  function resultBlock(M, isRace) {
    var res = M.result || {};
    var inc = res.income || {};
    var won = isRace ? (M.result && M.result.income.prize > 0)
      : M.score.you > M.score.opp;
    var h = '<div class="card" style="border-color:' +
      (won ? 'rgba(61,220,151,.45)' : 'var(--line)') + '">' +
      '<div class="card-head">' + (isRace ? '🏁 Arrivée' :
        (won ? '🎉 Victoire' : M.score.you === M.score.opp ? '🤝 Match nul' : '😞 Défaite')) +
      '</div>';
    h += '<div class="grid2">' +
      ui.stat('Recettes', u.fmtMoney(inc.total || 0), 'good') +
      ui.stat('Salaires', u.fmtMoney(res.wages || 0), 'bad') + '</div>';
    h += '<div class="grid2" style="margin-top:6px">' +
      ui.stat(isRace ? 'Solde du week-end' : 'Solde du match',
        u.fmtSigned(res.net || 0), ui.signCls(res.net || 0)) +
      ui.stat('Trésorerie', u.fmtMoney(G.state.money)) + '</div>';
    h += '<div class="mute2" style="margin-top:6px">Billetterie ' +
      u.fmtMoney(inc.gate || 0) + ' · sponsors ' + u.fmtMoney(inc.sponsor || 0) +
      ' · primes ' + u.fmtMoney(inc.prize || 0) + '</div>';

    var srcKey = 'manager:' + M.club.sport;
    var pend = G.state.pending[srcKey] || 0;
    if (pend > 100) {
      h += '<button class="btn green full" style="margin-top:9px" data-act="mk.reinvest" ' +
        'data-src="' + srcKey + '">♻️ Replacer ' + u.fmtMoney(pend) + ' en Bourse</button>';
    }
    h += '<button class="btn full" style="margin-top:6px" data-act="ui.close">Fermer</button>';
    return h + '</div>';
  }

  function showResult(M, isRace) {
    live = M;
    ui.modal(isRace ? '🏁 Résultat du Grand Prix' : '📋 Résultat',
      matchHtml(M, isRace), { onClose: function () { live = null; } });
  }

  ui.act('mg.play', function () { startMatch(false); });
  ui.act('mg.sim', function () { startMatch(true); });
  ui.act('mg.pause', function () {
    paused = !paused;
    ui.modalUpdate(matchHtml(live, live.sport.type === 'race'));
  });
  ui.act('mg.step', function () {
    if (!live || live.done) return;
    var isRace = live.sport.type === 'race';
    (isRace ? G.race : G.match).step(live);
    ui.modalUpdate(matchHtml(live, isRace));
  });
  ui.act('mg.rush', function () {
    if (!live) return;
    var isRace = live.sport.type === 'race';
    var engine = isRace ? G.race : G.match;
    stopTimer();
    var guard = 0;
    while (!live.done && !live.decision && guard++ < 400) engine.step(live);
    ui.modalUpdate(matchHtml(live, isRace));
    if (!live.done && !live.decision) tickMatch(isRace);
  });
  ui.act('mg.decide', function (d) {
    if (!live || !live.decision) return;
    var isRace = live.sport.type === 'race';
    var engine = isRace ? G.race : G.match;
    engine.decide(live, parseInt(d.i, 10));
    ui.modalUpdate(matchHtml(live, isRace));
    if (!live.done) tickMatch(isRace);
  });

  /* ------------------------------------------------------------- vue ---- */

  G.ui.register('manager', {
    icon: '🏟️', label: 'Manager',
    render: function () {
      var h = '<div class="view-title">Manager</div>';
      var club = activeClub();
      if (!club) return h + clubSelector() + renderShop();

      h += clubSelector() + sectionTabs();
      if (sub === 'club') h += renderClub(club);
      else if (sub === 'effectif') h += renderSquad(club);
      else if (sub === 'transferts') h += renderTransfers(club);
      else if (sub === 'tactique') h += renderTactics(club);
      else if (sub === 'infra') h += renderInfra(club);
      else h += renderPalmares(club);
      return h;
    }
  });
})();
