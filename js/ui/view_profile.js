/* Onglet Profil : patrimoine, flux d'argent, classement mondial, réglages. */
window.G = window.G || {};

(function () {
  'use strict';
  var u = G.util, ui = G.ui;

  var sub = 'patrimoine';

  function subTabs() {
    var tabs = [['patrimoine', '💎 Patrimoine'], ['fortune', '🌍 Fortunes mondiales'],
    ['journal', '🧾 Journal'], ['reglages', '⚙️ Réglages']];
    return '<div class="sub-tabs">' + tabs.map(function (t) {
      return '<button class="sub' + (sub === t[0] ? ' active' : '') +
        '" data-act="pf.sub" data-sub="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</div>';
  }
  ui.act('pf.sub', function (d) { sub = d.sub; ui.refresh(); });

  /* ======================================================= PATRIMOINE ==== */

  function renderWealth() {
    var s = G.state;
    var parts = [
      ['💵 Liquidités', s.money],
      ['🏢 Entreprises', G.eco.bizValue()],
      ['📈 Actions', G.eco.portfolioValue()],
      ['🏘️ Immobilier', G.eco.realEstateValue()],
      ['🪙 Cryptomonnaies', G.eco.cryptoValue()],
      ['🖼️ Collections', G.eco.collectionValue()],
      ['🏟️ Clubs sportifs', G.eco.clubsValue()]
    ];
    var total = u.sum(parts, function (p) { return p[1]; });
    var h = '';

    h += '<div class="card hero"><div class="hero-v">' + u.fmtMoney(total) + '</div>' +
      '<div class="hero-l">Patrimoine total</div></div>';

    h += '<div class="card">';
    for (var i = 0; i < parts.length; i++) {
      if (parts[i][1] <= 0) continue;
      var pct = total > 0 ? parts[i][1] / total * 100 : 0;
      h += '<div style="margin-bottom:7px">' +
        '<div class="row between small"><span>' + parts[i][0] + '</span><b>' +
        u.fmtMoney(parts[i][1]) + ' <span class="mute2">' + u.dec(pct, 0) + ' %</span></b></div>' +
        ui.bar(pct) + '</div>';
    }
    h += '</div>';

    /* Revenus. */
    h += '<div class="card"><div class="card-head">💼 Revenus passifs</div>' +
      '<div class="row between"><span>🏢 Entreprises</span><b class="good">' +
      u.fmtMoney(G.business.totalHourly()) + ' / h</b></div>' +
      '<div class="row between"><span>🏘️ Loyers</span><b class="good">' +
      u.fmtMoney(G.realestate.totalHourly()) + ' / h</b></div>' +
      '<div class="hr"></div>' +
      '<div class="row between"><b>Total</b><b class="good">' +
      u.fmtMoney(G.business.totalHourly() + G.realestate.totalHourly()) + ' / h</b></div>' +
      '<div class="mute2" style="margin-top:6px">Versé automatiquement sur votre ' +
      'compte toutes les minutes.</div></div>';

    /* Flux par activité. */
    h += '<div class="card"><div class="card-head">🔀 Flux par activité</div>' +
      '<div class="scroll-x"><table class="table"><tr><th>Activité</th>' +
      '<th class="num">Encaissé</th><th class="num">Dépensé</th><th class="num">Net</th></tr>';
    var rows = [];
    for (var k in s.stats.bySource) {
      var v = s.stats.bySource[k];
      rows.push({ k: k, meta: G.eco.meta(k), in: v.in, out: v.out, net: v.in - v.out });
    }
    rows = u.sortBy(rows, function (r) { return Math.abs(r.net); }, true);
    if (!rows.length) h += '<tr><td colspan="4" class="mute2">Rien encore.</td></tr>';
    for (var j = 0; j < rows.length; j++) {
      h += '<tr><td>' + rows[j].meta.icon + ' ' + u.esc(rows[j].meta.label) + '</td>' +
        '<td class="num good">' + u.fmtMoney(rows[j].in) + '</td>' +
        '<td class="num bad">' + u.fmtMoney(rows[j].out) + '</td>' +
        '<td class="num ' + ui.signCls(rows[j].net) + '"><b>' + u.fmtSigned(rows[j].net) +
        '</b></td></tr>';
    }
    h += '</table></div></div>';

    /* Capitaux réinvestis. */
    var re = [];
    for (var r2 in s.reinvested) {
      if (s.reinvested[r2] > 1) re.push({ k: r2, v: s.reinvested[r2], meta: G.eco.meta(r2) });
    }
    if (re.length) {
      re = u.sortBy(re, function (x) { return x.v; }, true);
      h += '<div class="card"><div class="card-head">♻️ Capitaux replacés sur les marchés</div>';
      for (var q = 0; q < re.length; q++) {
        h += '<div class="row between small" style="padding:3px 0"><span>' +
          re[q].meta.icon + ' ' + u.esc(re[q].meta.label) + '</span><b>' +
          u.fmtMoney(re[q].v) + '</b></div>';
      }
      h += '</div>';
    }

    h += '<div class="grid2">' +
      ui.stat('Total encaissé', u.fmtMoney(s.stats.earned), 'good') +
      ui.stat('Total dépensé', u.fmtMoney(s.stats.spent), 'bad') +
      ui.stat('Matchs joués', s.stats.matchesPlayed) +
      ui.stat('Mains de casino', s.stats.casinoHands) +
      ui.stat('Séances boursières', s.market.day) +
      ui.stat('Temps de jeu', u.fmtDuration(s.playTime * 1000)) +
      '</div>';
    return h;
  }

  /* =================================================== FORTUNES MONDE ==== */

  function renderRich() {
    var worth = G.eco.netWorth();
    var list = G.DATA.richList.slice();
    var h = '';

    /* Position dans le classement. */
    var rank = 1;
    for (var i = 0; i < list.length; i++) if (list[i].w > worth) rank++;

    h += '<div class="card hero">' +
      '<div class="hero-v">' + u.fmtMoney(worth) + '</div>' +
      '<div class="hero-l">Votre fortune</div>';
    if (rank === 1) {
      h += '<div class="pill gold" style="margin-top:8px">🥇 Personne la plus riche du monde</div>';
    } else if (rank <= list.length) {
      h += '<div class="pill" style="margin-top:8px">' + rank +
        'e fortune mondiale (classement de référence)</div>';
    } else {
      var next = list[list.length - 1];
      h += '<div class="mute2" style="margin-top:8px">Il vous manque ' +
        u.fmtMoney(next.w - worth) + ' pour entrer dans le top ' + list.length + '.</div>';
    }
    h += '</div>';

    /* Classement mêlé : le joueur est inséré à sa place. */
    h += '<div class="card"><div class="card-head">🏆 Les plus grandes fortunes' +
      '<span class="sub">ordres de grandeur publics</span></div>';
    var entries = list.map(function (p) {
      return { name: p.name, src: p.src, w: p.w, you: false };
    });
    entries.push({ name: 'Vous', src: 'Empire Total', w: worth, you: true });
    entries = u.sortBy(entries, function (e) { return e.w; }, true);

    for (i = 0; i < entries.length; i++) {
      var e = entries[i];
      var pct = entries[0].w > 0 ? e.w / entries[0].w * 100 : 0;
      h += '<div class="rich' + (e.you ? ' you' : '') + '">' +
        '<div class="rk">' + (i + 1) + '</div>' +
        '<div class="item-main"><div class="t">' + u.esc(e.name) + '</div>' +
        '<div class="s">' + u.esc(e.src) + '</div>' + ui.bar(pct, e.you ? 'green' : '') +
        '</div>' +
        '<div class="item-side"><b>' + u.fmtMoney(e.w) + '</b></div></div>';
    }
    h += '<div class="mute2" style="margin-top:8px">Montants indicatifs, en dollars, ' +
      'du milieu des années 2020. Ils servent uniquement d\'échelle de comparaison.</div>';
    h += '</div>';

    /* Repères d'échelle. */
    h += '<div class="card"><div class="card-head">📏 Où vous situez-vous ?</div>';
    var marks = G.DATA.wealthMarks;
    for (i = 0; i < marks.length; i++) {
      var m = marks[i];
      var reached = worth >= m.w;
      h += '<div class="row between small" style="padding:4px 0;opacity:' +
        (reached ? 1 : 0.55) + '">' +
        '<span>' + (reached ? '✅ ' : '⬜ ') + u.esc(m.name) + '</span>' +
        '<b>' + u.fmtMoney(m.w) + '</b></div>';
    }
    h += '<div class="mute2" style="margin-top:8px">Votre fortune représente ' +
      u.dec(worth / 1.05e14 * 100, 4) + ' % du PIB mondial.</div></div>';

    return h;
  }

  /* ========================================================== JOURNAL ==== */

  function renderJournal() {
    var s = G.state;
    var h = '<div class="card"><div class="card-head">🧾 Derniers mouvements</div>' +
      '<div class="feed" style="max-height:none">';
    if (!s.log.length) h += '<div class="mute2">Aucun mouvement enregistré.</div>';
    for (var m = 0; m < Math.min(60, s.log.length); m++) {
      var e = s.log[m];
      h += '<div class="entry ' + (e.a >= 0 ? 'good' : '') + '">' +
        '<span class="m">' + G.eco.meta(e.s).icon + '</span>' +
        '<span style="flex:1">' + u.esc(e.l || G.eco.meta(e.s).label) + '</span>' +
        '<b>' + u.fmtSigned(e.a) + '</b></div>';
    }
    return h + '</div></div>';
  }

  /* ========================================================= RÉGLAGES ==== */

  function renderSettings() {
    var s = G.state;
    var h = '<div class="card hero" data-act="pf.sub" data-sub="patrimoine" ' +
      'style="cursor:pointer">' +
      '<div class="hero-v">' + u.fmtMoney(G.eco.netWorth()) + '</div>' +
      '<div class="hero-l">💎 Patrimoine total</div>' +
      '<div class="mute2" style="margin-top:4px">Voir le détail →</div></div>';

    h += '<div class="card"><div class="card-head">⚙️ Réglages</div>' +
      '<div class="mute2" style="margin-bottom:4px">Vitesse des rencontres dirigées ' +
      'depuis le banc</div><div class="row wrap" style="gap:5px">' +
      [[1400, 'Lente'], [700, 'Normale'], [350, 'Rapide'], [120, 'Éclair']].map(function (o) {
        return '<button class="btn xs' + (s.settings.matchSpeed === o[0] ? ' primary' : '') +
          '" data-act="pf.speed" data-v="' + o[0] + '">' + o[1] + '</button>';
      }).join('') + '</div>';

    h += '<div class="grid2" style="margin-top:12px">' +
      '<button class="btn sm" data-act="pf.save">💾 Sauvegarder</button>' +
      '<button class="btn sm" data-act="pf.export">📤 Exporter</button>' +
      '<button class="btn sm" data-act="pf.import">📥 Importer</button>' +
      '<button class="btn sm danger" data-act="pf.reset">🗑️ Recommencer</button></div>';
    h += '<div class="mute2" style="margin-top:8px">La partie est enregistrée ' +
      'automatiquement dans ce navigateur. Aucun compte, aucune connexion : ' +
      'tout fonctionne hors ligne.</div></div>';

    h += '<div class="card flat"><div class="card-head">❓ Comment jouer</div>' +
      '<div class="mute2">Un seul portefeuille alimente tout le jeu : entreprises, ' +
      'placements, clubs sportifs, casino et gouvernement puisent au même compte. ' +
      'Ce que vous gagnez quelque part finance immédiatement autre chose.</div>' +
      '<button class="btn sm full" style="margin-top:8px" data-act="pf.help">' +
      'Revoir le guide</button></div>';
    return h;
  }

  ui.act('pf.speed', function (d) {
    G.state.settings.matchSpeed = parseInt(d.v, 10);
    ui.refresh();
  });
  ui.act('pf.save', function () {
    if (G.save.write()) ui.toast('💾 Partie sauvegardée', 'Vous pouvez fermer le jeu', 'good');
  });
  ui.act('pf.export', function () {
    var code = G.save.exportSave();
    ui.modal('📤 Exporter la partie',
      '<p class="muted">Copiez ce code et conservez-le : il contient toute votre ' +
      'progression.</p><textarea rows="6" readonly onclick="this.select()">' +
      u.esc(code) + '</textarea>' +
      '<button class="btn full" style="margin-top:10px" data-act="ui.close">Fermer</button>',
      {});
  });
  ui.act('pf.import', function () {
    ui.modal('📥 Importer une partie',
      '<p class="muted">Collez ici un code d\'export. La partie en cours sera ' +
      'remplacée.</p><textarea rows="6" id="pf-code" placeholder="Code…"></textarea>' +
      '<button class="btn primary full" style="margin-top:10px" data-act="pf.doimport">' +
      'Importer</button>', {});
  });
  ui.act('pf.doimport', function () {
    var ta = document.getElementById('pf-code');
    if (ta && G.save.importSave(ta.value)) {
      ui.closeModal();
      ui.toast('📥 Partie chargée', 'Bon retour', 'good');
      ui.setTab('empire');
    } else {
      ui.toast('❌ Code invalide', 'Vérifiez le texte collé', 'bad');
    }
  });
  ui.act('pf.reset', function () {
    ui.confirm('Tout recommencer ?',
      'Votre empire, vos clubs, votre pays et votre palmarès seront définitivement ' +
      'effacés.',
      function () {
        G.save.wipe();
        G.state = G.newState();
        G.save.write();
        ui.setTab('empire');
        ui.toast('🗑️ Nouvelle partie', 'Tout repart de zéro');
      }, 'Effacer');
  });
  ui.act('pf.help', function () { G.ui.showGuide(); });

  G.ui.register('profil', {
    icon: '👤', label: 'Profil',
    render: function () {
      var h = '<div class="view-title">Profil</div>' + subTabs();
      if (sub === 'patrimoine') h += renderWealth();
      else if (sub === 'fortune') h += renderRich();
      else if (sub === 'journal') h += renderJournal();
      else h += renderSettings();
      return h;
    }
  });
})();
