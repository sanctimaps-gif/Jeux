/* Onglet Manager : plusieurs clubs, choix du pays et de la division de départ
 * (D3 à Élite), fédérations nationales, fusions, sponsors. */
window.G = window.G || {};

(function () {
  'use strict';
  var u = G.util, ui = G.ui;

  var sub = 'club';
  var shopMode = false;           // affiche la boutique même si on a déjà un club
  var shop = { sport: null, country: null };
  var live = null;        // rencontre en mode « coach »
  var timer = null;
  var paused = false;

  function clubs() { return G.manager.clubs(); }
  function activeClub() { return G.manager.activeClub(); }

  /* ==================================================== ACQUISITION ====== */

  /** « club » ou « joueur » selon que la discipline s'achète en individuel. */
  function entityWord(sportId, cap) {
    var sport = G.DATA.sportById[sportId];
    var indiv = sport && sport.individual;
    if (cap) return indiv ? 'Joueur' : 'Club';
    return indiv ? 'joueur' : 'club';
  }

  function renderShop() {
    var word = shop.sport ? entityWord(shop.sport) : 'club';
    var h = '<div class="card"><div class="card-head">🏅 Racheter un ' + word + '</div>' +
      '<div class="mute2">Choisissez une discipline, un pays, puis une division de ' +
      'départ — de la <b>Départementale 3</b>, accessible, jusqu\'à l\'<b>Élite</b>, ' +
      'hors de prix. On peut aussi racheter la fédération d\'un pays pour jouer des ' +
      'compétitions internationales. Plusieurs clubs sont possibles, même dans le ' +
      'même sport et le même pays.</div></div>';

    /* Étape 1 : la discipline. */
    h += '<div class="card-head">1 · Discipline</div><div class="sub-tabs">';
    for (var i = 0; i < G.DATA.sports.length; i++) {
      var sp = G.DATA.sports[i];
      h += '<button class="sub' + (shop.sport === sp.id ? ' active' : '') +
        '" data-act="mg.shopsport" data-id="' + sp.id + '">' + sp.icon + ' ' +
        sp.name + '</button>';
    }
    h += '</div>';

    if (!shop.sport) return h;

    var sport = G.DATA.sportById[shop.sport];

    /* Étape 2 : le pays. */
    h += '<div class="card-head" style="margin-top:12px">2 · Pays</div>';
    h += '<div class="card tight"><div class="mute2">Plus le championnat national ' +
      'est relevé, plus les ' + word + 's de ce pays coûtent cher et rapportent gros.</div></div>';

    for (var c = 0; c < sport.countries.length; c++) {
      var code = sport.countries[c];
      var nation = G.DATA.worldById[code];
      if (!nation) continue;
      var price = G.manager.clubPrice(shop.sport, code, G.manager.MAX_DIVISION);
      var coef = G.manager.countryCoef(sport, code);
      var can = G.state.money >= price;
      h += '<div class="item' + (shop.country === code ? ' sel' : '') +
        '" data-act="mg.shopcountry" data-id="' + code + '">' +
        '<div class="item-icon">' + nation.f + '</div>' +
        '<div class="item-main"><div class="t">' + u.esc(nation.n) + '</div>' +
        '<div class="s">Niveau du championnat : ' + stars(coef) + '</div></div>' +
        '<div class="item-side"><div class="' + (can ? 'good' : 'bad') + '">' +
        u.fmtMoney(price) + '</div>' +
        '<div class="mute2">à partir de D3</div></div></div>';
    }

    if (!shop.country) return h;
    var pickedNation = G.DATA.worldById[shop.country];

    /* Étape 3 : la division de départ. */
    h += '<div class="card-head" style="margin-top:12px">3 · Division de départ</div>';
    h += '<div class="card tight"><div class="mute2">Le prix en Élite est calé sur le ' +
      'club le plus cher et le plus fort au monde dans ce sport, et chaque division ' +
      'que l\'on descend divise le prix par 3. Commencer en D3 est de très, très loin ' +
      'le plus raisonnable.</div></div>';

    for (var dv = G.manager.MAX_DIVISION; dv >= G.manager.MIN_DIVISION; dv--) {
      var dprice = G.manager.clubPrice(shop.sport, shop.country, dv);
      var dcan = G.state.money >= dprice;
      h += '<div class="item"><div class="item-icon" style="font-size:14px;font-weight:800">' +
        G.manager.divisionShort(sport, dv) + '</div>' +
        '<div class="item-main"><div class="t">' + G.manager.divisionName(sport, dv) + '</div>' +
        '<div class="s">Niveau moyen ' + Math.round(G.manager.divisionLevel(dv)) + '</div></div>' +
        '<div class="item-side"><button class="btn sm ' + (dcan ? 'primary' : '') +
        '" data-act="mg.pickdiv" data-div="' + dv + '"' + (dcan ? '' : ' disabled') + '>' +
        u.fmtMoney(dprice) + '</button></div></div>';
    }

    if (sport.type !== 'race') {
      var natPrice = G.manager.nationalTeamPrice(shop.sport, shop.country);
      var natCan = G.state.money >= natPrice;
      h += '<div class="card-head" style="margin-top:12px">🌍 Ou racheter la fédération</div>';
      h += '<div class="card tight"><div class="mute2">Plus de championnat domestique : ' +
        'l\'équipe nationale affronte les autres pays en compétition internationale.' +
        '</div></div>';
      h += '<div class="item"><div class="item-icon">' + (pickedNation ? pickedNation.f : '🌍') +
        '</div><div class="item-main"><div class="t">Équipe nationale</div>' +
        '<div class="s">Niveau moyen ' + Math.round(G.manager.divisionLevel(0)) +
        ' · prestige maximal</div></div>' +
        '<div class="item-side"><button class="btn sm ' + (natCan ? 'primary' : '') +
        '" data-act="mg.picknational"' + (natCan ? '' : ' disabled') + '>' +
        u.fmtMoney(natPrice) + '</button></div></div>';
    }
    return h;
  }

  function stars(coef) {
    var n = u.clamp(Math.round(coef * 3), 1, 5);
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  ui.act('mg.shopsport', function (d) { shop.sport = d.id; shop.country = null; ui.refresh(); });
  ui.act('mg.shopcountry', function (d) { shop.country = d.id; ui.refresh(); });

  ui.act('mg.pickdiv', function (d) {
    var sport = G.DATA.sportById[shop.sport];
    var nation = G.DATA.worldById[shop.country];
    var div = parseInt(d.div, 10);
    var price = G.manager.clubPrice(shop.sport, shop.country, div);
    var suggested = G.manager.clubNameFor(shop.sport, shop.country);
    var word = entityWord(shop.sport);

    var h = '<div class="row" style="gap:10px;margin-bottom:10px">' +
      '<div style="font-size:32px">' + sport.icon + '</div><div>' +
      '<div style="font-weight:800">' + sport.name + '</div>' +
      '<div class="mute2">' + nation.f + ' ' + nation.n + ' · ' +
      G.manager.divisionName(sport, div) + '</div></div></div>';

    h += '<label class="field">Nom du ' + word + '</label>' +
      '<input type="text" id="mg-name" maxlength="30" value="' + u.esc(suggested) + '">' +
      '<button class="btn xs" style="margin-top:6px" data-act="mg.shopname">' +
      '🎲 Autre proposition</button>';

    h += '<div class="grid2" style="margin-top:12px">' +
      ui.stat('Prix du ' + word, u.fmtMoney(price)) +
      ui.stat('Recettes par match', u.fmtMoney(
        (sport.economy.gateBase + sport.economy.sponsorBase) *
        G.manager.countryCoef(sport, shop.country) * G.manager.divisionCoef(div)), 'good') +
      '</div>';

    if (div > G.manager.MIN_DIVISION) {
      h += '<div class="mute2" style="margin-top:8px">Les deux premiers de chaque ' +
        'championnat montent, les deux derniers descendent.</div>';
    }

    h += '<button class="btn primary full" style="margin-top:12px" data-act="mg.dobuy" ' +
      'data-div="' + div + '">Racheter le ' + word + '</button>';
    ui.modal('Acquisition d\'un ' + word, h, {});
  });

  ui.act('mg.shopname', function () {
    var input = document.getElementById('mg-name');
    if (input) input.value = G.manager.clubNameFor(shop.sport, shop.country);
  });

  ui.act('mg.dobuy', function (d) {
    var input = document.getElementById('mg-name');
    var name = input ? input.value.trim() : '';
    var club = G.manager.buyClub(shop.sport, shop.country, name, parseInt(d.div, 10));
    if (club) {
      ui.closeModal();
      sub = 'club';
      shopMode = false;
      var indiv = G.DATA.sportById[shop.sport] && G.DATA.sportById[shop.sport].individual;
      ui.toast(indiv ? '🎾 Joueur recruté !' : '🏟️ Club acquis !', club.name, 'good');
      ui.refresh();
    }
  });

  ui.act('mg.picknational', function () {
    var sport = G.DATA.sportById[shop.sport];
    var nation = G.DATA.worldById[shop.country];
    var price = G.manager.nationalTeamPrice(shop.sport, shop.country);
    var suggested = 'Équipe de ' + nation.n;

    var h = '<div class="row" style="gap:10px;margin-bottom:10px">' +
      '<div style="font-size:32px">' + sport.icon + '</div><div>' +
      '<div style="font-weight:800">' + sport.name + '</div>' +
      '<div class="mute2">' + nation.f + ' ' + nation.n + ' · Équipe nationale</div></div></div>';

    h += '<p class="muted">Vous prenez la tête de la fédération. Fini le championnat ' +
      'domestique : place aux compétitions internationales, face aux autres nations.</p>';

    h += '<label class="field">Nom de la sélection</label>' +
      '<input type="text" id="mg-name" maxlength="30" value="' + u.esc(suggested) + '">';

    h += '<div class="grid2" style="margin-top:12px">' +
      ui.stat('Prix', u.fmtMoney(price)) +
      ui.stat('Niveau moyen', Math.round(G.manager.divisionLevel(0))) +
      '</div>';

    h += '<button class="btn primary full" style="margin-top:12px" data-act="mg.donational">' +
      'Racheter la fédération</button>';
    ui.modal('🌍 Rachat d\'une fédération', h, {});
  });

  ui.act('mg.donational', function () {
    var input = document.getElementById('mg-name');
    var name = input ? input.value.trim() : '';
    var club = G.manager.buyNationalTeam(shop.sport, shop.country, name);
    if (club) {
      ui.closeModal();
      sub = 'club';
      shopMode = false;
      ui.toast('🌍 Fédération rachetée !', club.name, 'good');
      ui.refresh();
    }
  });

  /* ====================================================== SÉLECTEUR ====== */

  function clubSelector() {
    var l = clubs();
    if (!l.length) return '';
    var active = G.state.manager.active;
    var h = '<div class="sub-tabs">';
    for (var i = 0; i < l.length; i++) {
      var c = l[i];
      var sp = G.DATA.sportById[c.sport];
      var nation = G.DATA.worldById[c.country];
      h += '<button class="sub' + (active === c.uid ? ' active' : '') +
        '" data-act="mg.select" data-uid="' + c.uid + '">' + sp.icon +
        (nation ? ' ' + nation.f : '') + ' ' + u.esc(c.name) +
        ' <span class="divtag">' + G.manager.divisionShort(sp, c.division) + '</span></button>';
    }
    h += '<button class="sub" data-act="mg.shop">➕ Nouveau club</button></div>';
    return h;
  }

  function sectionTabs(club) {
    var sp = G.DATA.sportById[club.sport];
    var tabs = [['club', '🏟️ Club'], ['effectif', '👥 Effectif'],
    ['transferts', '💱 Transferts'],
    ['tactique', sp.type === 'race' ? '🔧 Voiture' : '📋 Tactique'],
    ['infra', '🏗️ Structure'], ['palmares', '🏆 Palmarès']];
    return '<div class="sub-tabs">' + tabs.map(function (t) {
      return '<button class="sub' + (sub === t[0] ? ' active' : '') +
        '" data-act="mg.sub" data-sub="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</div>';
  }

  ui.act('mg.select', function (d) {
    G.state.manager.active = d.uid; sub = 'club'; shopMode = false; ui.refresh();
  });
  ui.act('mg.shop', function () {
    shopMode = true; shop.sport = null; shop.country = null; ui.refresh();
  });
  ui.act('mg.sub', function (d) { sub = d.sub; ui.refresh(); });

  /* ========================================================= APERÇU ====== */

  function renderClub(club) {
    var sp = G.DATA.sportById[club.sport];
    var nation = G.DATA.worldById[club.country];
    var r = G.manager.teamRatings(club);
    var h = '';

    h += '<div class="card"><div class="row">' +
      '<div class="item-icon" style="font-size:30px">' + sp.icon + '</div>' +
      '<div class="item-main">' +
      '<div class="t">' + u.esc(club.name) +
      ' <button class="btn xs" data-act="mg.rename" data-uid="' + club.uid + '">✏️</button>' +
      '</div>' +
      '<div class="s">' + (nation ? nation.f + ' ' + nation.n : '') + ' · ' +
      G.manager.divisionName(sp, club.division) + ' · saison ' + club.season + '</div>' +
      '<div class="mute2">' + (club.league.isRace
        ? 'Grand Prix ' + Math.min(club.league.round + 1, club.league.fixtures.length) +
          '/' + club.league.fixtures.length
        : 'Journée ' + Math.min(club.league.round + 1, club.league.fixtures.length) +
          '/' + club.league.fixtures.length) + '</div></div>' +
      '<div class="item-side"><div class="ov ' + ui.ovrClass(r.ovr) + '">' +
      Math.round(r.ovr) + '</div></div></div>';

    /* Échelle des divisions (les équipes nationales n'y figurent pas). */
    if (club.division > 0) {
      h += '<div class="divbar">';
      for (var d = G.manager.MAX_DIVISION; d >= G.manager.MIN_DIVISION; d--) {
        h += '<div class="divstep' + (club.division === d ? ' on' : '') +
          (club.division < d ? ' done' : '') + '">' + G.manager.divisionShort(sp, d) + '</div>';
      }
      h += '</div>';
    } else {
      h += '<div class="mute2" style="margin-top:6px">🌍 Équipe nationale · compétitions ' +
        'internationales, pas de montée ni de descente.</div>';
    }

    h += '<div class="grid4" style="margin-top:8px">' +
      ui.stat('Attaque', Math.round(r.att)) +
      ui.stat('Défense', Math.round(r.def)) +
      ui.stat('Renom', Math.round(club.rep)) +
      ui.stat('Classement', G.manager.rankOf(club) + 'e') +
      '</div></div>';

    h += nextMatchCard(club, sp);

    var last = club.finances.last;
    h += '<div class="card"><div class="card-head">💶 Finances<span class="sub">saison ' +
      club.season + '</span></div><div class="grid3">' +
      ui.stat('Recettes', u.fmtMoney(club.finances.seasonIn), 'good') +
      ui.stat('Salaires', u.fmtMoney(club.finances.seasonOut), 'bad') +
      ui.stat('Solde', u.fmtSigned(club.finances.seasonIn - club.finances.seasonOut),
        ui.signCls(club.finances.seasonIn - club.finances.seasonOut)) + '</div>';
    if (last) {
      h += '<div class="mute2" style="margin-top:7px">Dernière rencontre : ' +
        'billetterie ' + u.fmtMoney(last.gate) + ' · sponsors ' + u.fmtMoney(last.sponsor) +
        ' · primes ' + u.fmtMoney(last.prize) + ' · salaires ' + u.fmtMoney(last.wages) +
        ' → <b class="' + ui.signCls(last.net) + '">' + u.fmtSigned(last.net) + '</b></div>';
    }
    h += '<div class="mute2" style="margin-top:4px">Masse salariale par rencontre : ' +
      u.fmtMoney(G.manager.wageBill(club)) + '</div></div>';

    h += standingsCard(club);

    if (club.results.length) {
      h += '<div class="card"><div class="card-head">📊 Derniers résultats</div><div class="feed">';
      for (var i = 0; i < Math.min(8, club.results.length); i++) {
        var res = club.results[i];
        var cls = res.race ? (res.you > 0 ? 'good' : '')
          : (res.you > res.opp ? 'good' : res.you === res.opp ? '' : 'bad');
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
        '<div style="font-size:16px;font-weight:700">' + u.esc(evt.circuit) + '</div>' +
        '<div class="mute2">Course ' + evt.round + ' sur ' + evt.total + '</div>';
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

      if (fx.twin) {
        h += '<div class="card tight" style="margin-top:10px;border-color:rgba(240,180,41,.4)">' +
          '<div class="mute2">👀 Derby entre deux de vos clubs : vous n\'êtes ni l\'un ni ' +
          'l\'autre, vous assistez juste au résultat.</div></div>';
        h += '<button class="btn primary full" style="margin-top:10px" data-act="mg.derby">' +
          '👀 Regarder le derby</button>';
        return h + '</div>';
      }
    }

    if (sp.type === 'race') {
      h += '<div class="grid2" style="margin-top:10px">' +
        '<button class="btn primary" data-act="mg.action">🎮 Piloter</button>' +
        '<button class="btn" data-act="mg.coach">📋 Diriger depuis le banc</button></div>';
    } else {
      h += '<button class="btn primary full" style="margin-top:10px" data-act="mg.coach">' +
        '👀 Regarder le match</button>';
    }
    h += '<button class="btn sm full" style="margin-top:6px" data-act="mg.sim">' +
      '⏩ Simuler la rencontre</button>';

    var injured = club.players.filter(function (p) { return p.injury > 0; }).length;
    var tired = club.players.filter(function (p) { return p.starter && p.energy < 45; }).length;
    if (injured || tired) {
      h += '<div class="mute2" style="margin-top:6px">' +
        (injured ? '🚑 ' + injured + ' blessé(s). ' : '') +
        (tired ? '😮‍💨 ' + tired + ' titulaire(s) à court de jus.' : '') + '</div>';
    }
    h += programmedHtml(club);
    return h + '</div>';
  }

  /** Matchs programmés : ils se jouent tout seuls, sans aucune intervention,
   * un toutes les 4 minutes réelles, même hors ligne. */
  function programmedHtml(club) {
    var q = club.programmed;
    var max = G.manager.MAX_PROGRAMMED;
    if (q && q.count > 0) {
      var pct = (1 - q.timeLeft / G.manager.PROGRAM_DURATION) * 100;
      return '<div class="card-head" style="margin-top:14px">📅 Matchs programmés</div>' +
        '<div class="mute2">' + q.count + ' match' + (q.count > 1 ? 's' : '') +
        ' en attente · prochain dans ' + u.fmtDuration(Math.max(0, q.timeLeft) * 1000) +
        '</div>' + ui.bar(pct, 'blue') +
        '<div class="mute2" style="margin-top:4px">Aucune intervention possible : ils se ' +
        'jouent tout seuls, même hors ligne.</div>' +
        '<button class="btn sm full" style="margin-top:6px" data-act="mg.cancelprog">' +
        '✕ Annuler</button>';
    }
    var h = '<div class="card-head" style="margin-top:14px">📅 Programmer des matchs</div>' +
      '<div class="mute2">4 minutes réelles par match, jusqu\'à ' + max +
      ' à la suite, sans aucune intervention possible.</div>' +
      '<div class="grid3" style="margin-top:6px">';
    [1, 3, max].forEach(function (n) {
      h += '<button class="btn sm" data-act="mg.program" data-n="' + n + '">+' + n + '</button>';
    });
    return h + '</div>';
  }

  function standingsCard(club) {
    var st = G.manager.standings(club);
    var isRace = !!club.league.isRace;
    var international = club.division === 0;
    var n = st.length;
    var h = '<div class="card"><div class="card-head">🏆 ' +
      (isRace ? 'Championnat constructeurs' : international ? 'Compétition internationale'
        : 'Classement') + '</div>' +
      '<div class="scroll-x"><table class="table"><tr><th>#</th><th>Équipe</th>' +
      '<th class="num">J</th>' + (isRace ? '' :
        '<th class="num">V</th><th class="num">N</th><th class="num">D</th>' +
        '<th class="num">+/-</th>') + '<th class="num">Pts</th></tr>';
    for (var i = 0; i < n; i++) {
      var t = st[i].t;
      var zone = '';
      if (!isRace && !international) {
        if (i < 2 && club.division > G.manager.MIN_DIVISION) zone = ' promo';
        else if (i >= n - 2 && club.division < G.manager.MAX_DIVISION) zone = ' releg';
      }
      h += '<tr class="' + (st[i].i === 0 ? 'you' : '') + zone + '"><td>' + (i + 1) + '</td>' +
        '<td>' + u.esc(t.name) + '</td><td class="num">' + t.played + '</td>' +
        (isRace ? '' : '<td class="num">' + t.w + '</td><td class="num">' + t.d +
          '</td><td class="num">' + t.l + '</td><td class="num">' +
          (t.sf - t.sa > 0 ? '+' : '') + (t.sf - t.sa) + '</td>') +
        '<td class="num"><b>' + t.pts + '</b></td></tr>';
    }
    h += '</table></div>';
    if (!isRace && !international) {
      h += '<div class="mute2" style="margin-top:6px">' +
        (club.division > G.manager.MIN_DIVISION ? '<span class="promo-dot"></span> montée · ' : '') +
        (club.division < G.manager.MAX_DIVISION ? '<span class="releg-dot"></span> relégation' : '') +
        '</div>';
    }
    return h + '</div>';
  }

  ui.act('mg.rename', function (d) {
    var c = G.manager.byUid(d.uid);
    if (!c) return;
    ui.modal('✏️ Renommer le club',
      '<label class="field">Nouveau nom</label>' +
      '<input type="text" id="mg-newname" maxlength="30" value="' + u.esc(c.name) + '">' +
      '<button class="btn primary full" style="margin-top:12px" data-act="mg.dorename" ' +
      'data-uid="' + d.uid + '">Valider</button>', {});
  });
  ui.act('mg.dorename', function (d) {
    var input = document.getElementById('mg-newname');
    if (input && input.value.trim()) {
      G.manager.renameClub(d.uid, input.value.trim());
      ui.closeModal();
    }
  });

  /* ======================================================== EFFECTIF ===== */

  function playerRow(club, p) {
    var sp = G.DATA.sportById[club.sport];
    var o = G.manager.ovr(p, sp);
    var pd = G.manager.posDef(sp, p.pos);
    return '<div class="pl' + (p.starter ? ' start' : '') + '" data-act="mg.player" data-id="' +
      p.id + '">' +
      '<div class="pos">' + p.pos + '</div>' +
      '<div class="nm"><div class="n">' + u.esc(p.name) +
      (p.injury ? ' 🚑' : '') + (p.starter ? ' <span class="pill gold">titulaire</span>' : '') +
      '</div>' +
      '<div class="d">' + p.age + ' ans · ' + (pd ? pd.name : '') +
      ' · ' + u.fmtMoney(p.value) + ' · ' + u.fmtMoney(p.wage) + '/match</div>' +
      '<div class="row" style="gap:4px;margin-top:3px">' +
      '<span class="mute2">Forme</span>' + miniBar(p.form) +
      '<span class="mute2">Jus</span>' + miniBar(p.energy) + '</div></div>' +
      '<div class="ov ' + ui.ovrClass(o) + '">' + o + '</div></div>';
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
      '<button class="btn xs" data-act="mg.auto">🔄 Composition auto</button></div>' +
      '<div class="mute2">Touchez un joueur pour le faire entrer dans le onze, ' +
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
    for (var i = 0; i < club.players.length; i++) {
      if (club.players[i].id === d.id) p = club.players[i];
    }
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
      if (p.starter) p.starter = false;
      else {
        if (p.injury) { ui.toast('🚑 Joueur blessé', 'Il ne peut pas jouer', 'bad'); return; }
        if (G.manager.starters(club).length >= sp.lineupSize) {
          ui.toast('👥 Onze complet', 'Sortez d\'abord un titulaire', 'bad');
          return;
        }
        p.starter = true;
      }
    }
    ui.closeModal();
  });

  ui.act('mg.sell', function (d) {
    if (G.manager.sellPlayer(activeClub(), d.id)) ui.closeModal();
  });

  /* ======================================================= TRANSFERTS ==== */

  function renderTransfers(club) {
    var sp = G.DATA.sportById[club.sport];
    var list = G.manager.refreshTransfers(club);
    var h = '<div class="card"><div class="row between">' +
      '<div><b>Joueurs disponibles</b><div class="mute2">Recruteurs niveau ' +
      club.staff.scout + ' · plus votre division est haute, meilleurs sont les ' +
      'joueurs proposés</div></div>' +
      '<button class="btn xs" data-act="mg.scoutnow">🔍 Prospecter</button></div></div>';

    h += '<div class="card">';
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var o = G.manager.ovr(p, sp);
      var can = G.state.money >= p.askPrice;
      h += '<div class="pl"><div class="pos">' + p.pos + '</div>' +
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
    if (G.manager.signPlayer(activeClub(), d.id)) {
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

    var groups = [['mentality', 'Approche'], ['pressing', 'Organisation'],
    ['style', 'Style de jeu']];
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
    h += '<div class="mute2" style="margin-top:6px">Ces consignes s\'appliquent aussi ' +
      'quand vous jouez vous-même : elles règlent le comportement de vos ' +
      'coéquipiers gérés par l\'ordinateur.</div></div>';
    return h;
  }

  ui.act('mg.tac', function (d) {
    activeClub().tactics[d.k] = parseInt(d.v, 10);
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
    var cap = G.manager.facilityCap(club);
    var h = '<div class="card"><div class="card-head">🏗️ Installations</div>';
    if (club.groupId) {
      h += '<div class="mute2">Structures communes à tout le groupe omnisports ' +
        '(niveau maximal ' + cap + ' au lieu de 10).</div>';
    }
    for (var i = 0; i < G.DATA.facilities.length; i++) {
      var f = G.DATA.facilities[i];
      var lvl = club.facilities[f.id] || 1;
      var cost = G.manager.facilityCost(club, f.id);
      var can = G.state.money >= cost && lvl < cap;
      h += '<div class="item"><div class="item-icon">' + f.icon + '</div>' +
        '<div class="item-main"><div class="t">' + f.name +
        ' <span class="pill gold">Niv. ' + lvl + '/' + cap + '</span></div>' +
        '<div class="s">' + f.desc + '</div>' + ui.bar(lvl / cap * 100) + '</div>' +
        '<div class="item-side"><button class="btn sm ' + (can ? 'primary' : '') +
        '" data-act="mg.fac" data-id="' + f.id + '"' + (can ? '' : ' disabled') + '>' +
        (lvl >= cap ? 'MAX' : u.fmtMoney(cost)) + '</button></div></div>';
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

    /* Sponsoring. */
    var maxed = G.manager.sponsorMaxed(club);
    var tier = G.manager.sponsorTierDef(club);
    var spCost = G.manager.sponsorCost(club);
    var canSp = !maxed && G.state.money >= spCost;
    h += '<div class="card"><div class="card-head">📣 Sponsoring</div>' +
      '<div class="item"><div class="item-icon">🤝</div>' +
      '<div class="item-main"><div class="t">' + tier.name + '</div>' +
      '<div class="s">Revenus sponsors ×' + u.dec(1 + ((club.sponsorTier || 1) - 1) * 0.5, 2) +
      '</div></div>' +
      '<div class="item-side"><button class="btn sm ' + (canSp ? 'primary' : '') +
      '" data-act="mg.sponsor"' + (canSp ? '' : ' disabled') + '>' +
      (maxed ? 'MAX' : u.fmtMoney(spCost)) + '</button></div></div></div>';

    /* Groupe omnisports : bonus de revenus si le club est fusionné avec des
     * clubs d'autres disciplines. */
    var groupSports = G.manager.groupSports(club);
    if (club.groupId && groupSports.length > 1) {
      var groupBonus = Math.round((G.manager.groupBonusMult(club) - 1) * 100);
      var groupNames = groupSports.map(function (s) {
        var gsp = G.DATA.sportById[s];
        return gsp ? gsp.icon + ' ' + gsp.name : s;
      }).join(' · ');
      h += '<div class="card"><div class="card-head">🌐 Groupe omnisports</div>' +
        '<div class="mute2">' + groupNames + ' · toutes les équipes portent le nom ' +
        u.esc(club.name) + ' et partagent les mêmes installations.</div>' +
        '<div class="good" style="font-weight:800;margin-top:4px">+' + groupBonus +
        '% sur les recettes de tous les clubs du groupe</div></div>';
    }

    /* Fusion avec un autre club possédé. */
    var others = clubs().filter(function (c) { return c.uid !== club.uid && !c.national; });
    others = others.filter(function (c) {
      return G.manager.canMergeClubs(club, c);
    });
    if (!club.national && others.length) {
      h += '<div class="card"><div class="card-head">🤝 Fusionner</div>' +
        '<div class="mute2">Même sport : les effectifs se combinent en un seul club, ' +
        'plus fort. Sport différent : les deux équipes restent distinctes, chacune ' +
        'dans son championnat, mais prennent le même nom, partagent les mêmes ' +
        'installations (avec un niveau maximal plus élevé) et rejoignent un même ' +
        'groupe omnisports qui augmente durablement leurs recettes.</div>';
      for (var m = 0; m < others.length; m++) {
        var osp = G.DATA.sportById[others[m].sport];
        var sameSport = others[m].sport === club.sport;
        h += '<div class="item"><div class="item-icon">' + osp.icon + '</div>' +
          '<div class="item-main"><div class="t">' + u.esc(others[m].name) + '</div>' +
          '<div class="s">' + osp.name + (sameSport ? ' · valeur ' +
          u.fmtMoney(G.manager.clubValue(others[m])) : ' · groupe omnisports') + '</div></div>' +
          '<div class="item-side"><button class="btn sm" data-act="mg.merge" ' +
          'data-a="' + club.uid + '" data-b="' + others[m].uid + '">Fusionner</button></div></div>';
      }
      h += '</div>';
    }

    if (!club.national) {
      h += '<div class="card"><div class="card-head">⚠️ Céder le club</div>' +
        '<div class="mute2">Valeur estimée : ' + u.fmtMoney(G.manager.clubValue(club)) +
        ' (revente à 85 %).</div>' +
        '<button class="btn danger full" style="margin-top:8px" data-act="mg.sellclub" ' +
        'data-uid="' + club.uid + '">Vendre ' + u.esc(club.name) + '</button></div>';
    } else {
      h += '<div class="card"><div class="card-head">⚠️ Quitter la fédération</div>' +
        '<div class="mute2">Valeur estimée : ' + u.fmtMoney(G.manager.clubValue(club)) +
        ' (revente à 85 %).</div>' +
        '<button class="btn danger full" style="margin-top:8px" data-act="mg.sellclub" ' +
        'data-uid="' + club.uid + '">Quitter · ' + u.esc(club.name) + '</button></div>';
    }
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
  ui.act('mg.sellclub', function (d) {
    var club = G.manager.byUid(d.uid);
    ui.confirm('Vendre ' + u.esc(club.name) + ' ?',
      'Vous récupérez ' + u.fmtMoney(G.manager.clubValue(club) * 0.85) +
      ' mais perdez l\'effectif, les installations et la place en championnat.',
      function () { G.manager.sellClub(d.uid); ui.refresh(); }, 'Vendre');
  });
  ui.act('mg.sponsor', function () {
    if (G.manager.upgradeSponsor(activeClub())) {
      ui.toast('📣 Nouveau sponsor', 'Les revenus sponsors augmentent', 'good');
    }
    ui.refresh();
  });
  ui.act('mg.merge', function (d) {
    var a = G.manager.byUid(d.a), b = G.manager.byUid(d.b);
    if (!a || !b) return;
    ui.confirm('Fusionner avec ' + u.esc(b.name) + ' ?',
      a.sport === b.sport
        ? 'Les effectifs se combinent (les meilleurs joueurs sont conservés) et ' +
          a.name + ' garde la meilleure des deux divisions. ' + b.name + ' disparaît.'
        : a.name + ' et ' + b.name + ' restent tous les deux en activité, chacun dans ' +
          'son propre championnat, mais rejoignent un même groupe omnisports : leurs ' +
          'recettes augmentent durablement.',
      function () {
        if (G.manager.mergeClub(d.a, d.b)) ui.refresh();
      }, 'Fusionner');
  });

  /* ========================================================= PALMARÈS ==== */

  function renderPalmares(club) {
    var clubSport = G.DATA.sportById[club.sport];
    var h = '<div class="card"><div class="card-head">🏆 Trophées</div>';
    var t = G.state.manager.trophies;
    if (!t.length) h += '<div class="mute2">Aucun titre pour l\'instant. Ça viendra.</div>';
    for (var i = 0; i < t.length; i++) {
      var sp = G.DATA.sportById[t[i].sport];
      var nation = t[i].country ? G.DATA.worldById[t[i].country] : null;
      h += '<div class="item"><div class="item-icon">' + (sp ? sp.icon : '🏆') + '</div>' +
        '<div class="item-main"><div class="t">' + u.esc(t[i].name || 'Championnat') + '</div>' +
        '<div class="s">' + u.esc(t[i].club) + ' · saison ' + t[i].season +
        (nation ? ' · ' + nation.f : '') + '</div></div></div>';
    }
    h += '</div>';

    h += '<div class="card"><div class="card-head">📚 Historique du club</div>';
    if (!club.history.length) h += '<div class="mute2">Première saison en cours.</div>';
    else {
      h += '<div class="scroll-x"><table class="table"><tr><th>Saison</th>' +
        '<th class="num">Div.</th><th class="num">Place</th><th class="num">Pts</th>' +
        '<th class="num">Solde</th></tr>';
      for (var j = club.history.length - 1; j >= 0; j--) {
        var hh = club.history[j];
        h += '<tr><td>' + hh.season + (hh.promoted ? ' ⬆️' : hh.relegated ? ' ⬇️' : '') +
          '</td><td class="num">' +
          (hh.division === undefined ? '?' : G.manager.divisionShort(clubSport, hh.division)) + '</td>' +
          '<td class="num">' + hh.rank + 'e</td><td class="num">' + hh.pts + '</td>' +
          '<td class="num ' + ui.signCls(hh.in - hh.out) + '">' +
          u.fmtSigned(hh.in - hh.out) + '</td></tr>';
      }
      h += '</table></div>';
    }

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

  /* ============================================ RENCONTRE DEPUIS LE BANC == */

  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  ui.act('mg.action', function () {
    var club = activeClub();
    if (!club) return;
    G.play.startRace(club);
  });

  ui.act('mg.sim', function () {
    var club = activeClub();
    var sp = G.DATA.sportById[club.sport];
    var M = sp.type === 'race' ? G.race.quickSim(club) : G.match.quickSim(club);
    if (!M) { ui.toast('📅 Saison terminée', 'Le calendrier est bouclé', 'bad'); return; }
    live = M;
    ui.modal(sp.type === 'race' ? '🏁 Résultat du Grand Prix' : '📋 Résultat',
      matchHtml(M, sp.type === 'race'), { onClose: function () { live = null; } });
  });

  ui.act('mg.derby', function () {
    var club = activeClub();
    if (!club) return;
    var r = G.manager.resolveDerby(club);
    if (!r) { ui.toast('📅 Indisponible', 'Ce derby n\'est plus jouable', 'bad'); return; }
    var homeName = r.homeIsA ? r.a.name : r.b.name;
    var awayName = r.homeIsA ? r.b.name : r.a.name;
    var homeScore = r.homeIsA ? r.sa : r.sb;
    var awayScore = r.homeIsA ? r.sb : r.sa;
    var h = '<div class="mute2" style="text-align:center;margin-bottom:6px">' +
      '👀 Vous n\'êtes ni l\'un ni l\'autre : simple spectateur</div>' +
      '<div class="scorebar"><div class="team">' + u.esc(homeName) + '</div>' +
      '<div class="min" style="font-size:22px;font-weight:800">' + homeScore + ' - ' + awayScore + '</div>' +
      '<div class="team r">' + u.esc(awayName) + '</div></div>' +
      '<button class="btn primary full" style="margin-top:14px" data-act="ui.close">Fermer</button>';
    ui.modal('👀 Résultat du derby', h, {});
    ui.refresh();
  });

  ui.act('mg.program', function (d) {
    var club = activeClub();
    if (!club) return;
    if (G.manager.programMatches(club, parseInt(d.n, 10))) {
      ui.toast('📅 Matchs programmés', club.programmed.count + ' match(s) en attente, ' +
        'aucune intervention possible', 'good');
      ui.refresh();
    }
  });

  ui.act('mg.cancelprog', function () {
    var club = activeClub();
    if (!club) return;
    G.manager.cancelProgrammed(club);
    ui.refresh();
  });

  ui.act('mg.coach', function () {
    var club = activeClub();
    var sp = G.DATA.sportById[club.sport];

    if (sp.type === 'race') {
      live = G.race.create(club);
      if (!live) { ui.toast('📅 Saison terminée', 'Le calendrier est bouclé', 'bad'); return; }
      paused = false;
      ui.modal('🏁 ' + u.esc(live.circuit), matchHtml(live, true), {
        onClose: function () {
          stopTimer();
          if (live && !live.done) {
            var guard = 0;
            while (!live.done && guard++ < 400) {
              if (live.decision) G.race.decide(live, 1);
              else G.race.step(live);
            }
            if (!live.done) G.race.finish(live);
          }
          live = null;
        }
      });
      tickMatch(true);
      return;
    }

    /* Sports animés en canevas : on regarde le match, sans y intervenir. */
    if (G.action.supports(club.sport)) {
      if (!G.play.watchMatch(club)) { /* toast déjà affiché par watchMatch */ }
      return;
    }

    /* Autres sports : suivi textuel du match, sans intervention possible. */
    live = G.match.create(club);
    if (!live) { ui.toast('📅 Saison terminée', 'Le calendrier est bouclé', 'bad'); return; }
    paused = false;
    ui.modal('⚔️ Match en direct', matchHtml(live, false), {
      onClose: function () {
        stopTimer();
        if (live && !live.done) {
          var guard2 = 0;
          while (!live.done && guard2++ < 400) G.match.step(live);
          if (!live.done) G.match.finish(live);
        }
        live = null;
      }
    });
    tickMatch(false);
  });

  function tickMatch(isRace) {
    stopTimer();
    var engine = isRace ? G.race : G.match;
    timer = setInterval(function () {
      if (!live) { stopTimer(); return; }
      if (paused || live.decision || live.done) {
        if (live.done) stopTimer();
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
    var h = '<div class="scorebar">' +
      '<div class="team">' + u.esc(M.club.name) + '</div>' +
      '<div><div class="sc">' + M.score.you + ' - ' + M.score.opp + '</div>' +
      '<div class="min">' + u.fmtClock(M.minute) + ' / ' + M.sport.duration + "'</div></div>" +
      '<div class="team r">' + u.esc(M.oppName) + '</div></div>';

    h += ui.bar(M.seg / M.segments * 100, 'blue');

    h += '<div class="grid3" style="margin:9px 0">' +
      ui.stat('Possession', M.stats.poss + ' %') +
      ui.stat('Occasions', M.stats.youShots + ' - ' + M.stats.oppShots) +
      ui.stat('Dynamique', M.mom > 0.15 ? 'Pour vous' : M.mom < -0.15 ? 'Contre vous' : 'Neutre',
        M.mom > 0.15 ? 'good' : M.mom < -0.15 ? 'bad' : '') + '</div>';

    if (!M.done) {
      h += '<div class="grid3" style="margin-bottom:9px">' +
        '<button class="btn sm" data-act="mg.pause">' + (paused ? '▶️ Reprendre' : '⏸️ Pause') +
        '</button>' +
        '<button class="btn sm" data-act="mg.step">⏭️ Séquence</button>' +
        '<button class="btn sm" data-act="mg.rush">⏩ Fin du match</button></div>';
    } else {
      h += resultBlock(M, false);
    }

    h += '<div class="card tight"><div class="feed">';
    for (var i = 0; i < M.feed.length; i++) {
      h += '<div class="entry ' + M.feed[i].type + '"><span class="m">' +
        M.feed[i].min + "'</span><span>" + u.esc(M.feed[i].txt) + '</span></div>';
    }
    return h + '</div></div>';
  }

  function raceHtml(R) {
    var mine = G.race.myCars(R);
    var h = '<div class="scorebar"><div class="team">' + u.esc(R.club.name) + '</div>' +
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
    var won = isRace ? (inc.prize > 0) : M.score.you > M.score.opp;
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

    var srcKey = 'manager:' + M.club.sport;
    var pend = G.state.pending[srcKey] || 0;
    if (pend > 100) {
      h += '<button class="btn green full" style="margin-top:9px" data-act="mk.reinvest" ' +
        'data-src="' + srcKey + '">♻️ Replacer ' + u.fmtMoney(pend) + ' en Bourse</button>';
    }
    h += '<button class="btn full" style="margin-top:6px" data-act="ui.close">Fermer</button>';
    return h + '</div>';
  }

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
    (isRace ? G.race : G.match).decide(live, parseInt(d.i, 10));
    ui.modalUpdate(matchHtml(live, isRace));
    if (!live.done) tickMatch(isRace);
  });

  /* ------------------------------------------------------------- vue ---- */

  G.ui.register('manager', {
    icon: '🏟️', label: 'Manager',
    live: true, liveEvery: 1.0,
    render: function () {
      var h = '<div class="view-title">Manager</div>';
      var club = activeClub();
      if (shopMode || !club) return h + clubSelector() + renderShop();

      h += clubSelector() + sectionTabs(club);
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
