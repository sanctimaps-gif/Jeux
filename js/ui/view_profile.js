/* Onglet Profil : patrimoine, flux d'argent, journal, réglages, sauvegarde. */
window.G = window.G || {};

(function () {
  'use strict';
  var u = G.util, ui = G.ui;

  function render() {
    var s = G.state;
    var h = '<div class="view-title">Profil</div>';

    /* ---- patrimoine ---- */
    var parts = [
      ['💵 Liquidités', s.money],
      ['🏢 Entreprises', G.eco.bizValue()],
      ['📈 Portefeuille', G.eco.portfolioValue()],
      ['🖼️ Collections', G.eco.collectionValue()],
      ['🏟️ Clubs sportifs', G.eco.clubsValue()]
    ];
    var total = u.sum(parts, function (p) { return p[1]; });

    h += '<div class="card"><div class="card-head">💎 Patrimoine' +
      '<span class="sub">' + u.fmtMoney(total) + '</span></div>';
    for (var i = 0; i < parts.length; i++) {
      var pct = total > 0 ? parts[i][1] / total * 100 : 0;
      h += '<div style="margin-bottom:7px">' +
        '<div class="row between small"><span>' + parts[i][0] + '</span><b>' +
        u.fmtMoney(parts[i][1]) + '</b></div>' + ui.bar(pct) + '</div>';
    }
    h += '</div>';

    /* ---- flux par activité : le cœur du mélange ---- */
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

    /* ---- capitaux réinvestis ---- */
    var re = [];
    for (var r2 in s.reinvested) {
      if (s.reinvested[r2] > 1) re.push({ k: r2, v: s.reinvested[r2], meta: G.eco.meta(r2) });
    }
    if (re.length) {
      re = u.sortBy(re, function (x) { return x.v; }, true);
      h += '<div class="card"><div class="card-head">♻️ Capitaux replacés en Bourse</div>';
      for (var q = 0; q < re.length; q++) {
        h += '<div class="row between small" style="padding:3px 0"><span>' +
          re[q].meta.icon + ' ' + u.esc(re[q].meta.label) + '</span><b>' +
          u.fmtMoney(re[q].v) + '</b></div>';
      }
      h += '</div>';
    }

    /* ---- chiffres clés ---- */
    h += '<div class="grid2" style="margin-bottom:10px">' +
      ui.stat('Total encaissé', u.fmtMoney(s.stats.earned), 'good') +
      ui.stat('Total dépensé', u.fmtMoney(s.stats.spent), 'bad') +
      ui.stat('Matchs joués', s.stats.matchesPlayed) +
      ui.stat('Mains de casino', s.stats.casinoHands) +
      ui.stat('Séances boursières', s.market.day) +
      ui.stat('Temps de jeu', u.fmtDuration(s.playTime * 1000)) +
      '</div>';

    /* ---- journal ---- */
    h += '<div class="card"><div class="card-head">🧾 Derniers mouvements</div><div class="feed">';
    if (!s.log.length) h += '<div class="mute2">Aucun mouvement enregistré.</div>';
    for (var m = 0; m < Math.min(25, s.log.length); m++) {
      var e = s.log[m];
      h += '<div class="entry ' + (e.a >= 0 ? 'good' : '') + '">' +
        '<span class="m">' + G.eco.meta(e.s).icon + '</span>' +
        '<span style="flex:1">' + u.esc(e.l || G.eco.meta(e.s).label) + '</span>' +
        '<b>' + u.fmtSigned(e.a) + '</b></div>';
    }
    h += '</div></div>';

    /* ---- réglages ---- */
    h += '<div class="card"><div class="card-head">⚙️ Réglages</div>' +
      '<div class="mute2" style="margin-bottom:4px">Vitesse des matchs</div>' +
      '<div class="row wrap" style="gap:5px">' +
      [[1400, 'Lente'], [700, 'Normale'], [350, 'Rapide'], [120, 'Éclair']].map(function (o) {
        return '<button class="btn xs' +
          (s.settings.matchSpeed === o[0] ? ' primary' : '') +
          '" data-act="pf.speed" data-v="' + o[0] + '">' + o[1] + '</button>';
      }).join('') + '</div>';
    h += '<div class="grid2" style="margin-top:10px">' +
      '<button class="btn sm" data-act="pf.save">💾 Sauvegarder</button>' +
      '<button class="btn sm" data-act="pf.export">📤 Exporter</button>' +
      '<button class="btn sm" data-act="pf.import">📥 Importer</button>' +
      '<button class="btn sm danger" data-act="pf.reset">🗑️ Recommencer</button>' +
      '</div>';
    h += '<div class="mute2" style="margin-top:8px">La partie est enregistrée ' +
      'automatiquement dans ce navigateur. Aucun compte, aucune connexion : ' +
      'tout fonctionne hors ligne.</div></div>';

    h += '<div class="card flat"><div class="card-head">❓ Comment jouer</div>' +
      '<div class="mute2">' + helpText() + '</div>' +
      '<button class="btn sm full" style="margin-top:8px" data-act="pf.help">' +
      'Revoir le guide complet</button></div>';

    return h;
  }

  function helpText() {
    return 'Un seul portefeuille alimente tout le jeu. Les entreprises produisent ' +
      'du revenu passif, les clubs sportifs rapportent à chaque rencontre, le ' +
      'casino accélère (ou ruine) une trésorerie, le gouvernement oriente ' +
      'l\'économie — et la Bourse transforme n\'importe lequel de ces gains ' +
      'en capital qui travaille.';
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

  G.ui.register('profil', { icon: '👤', label: 'Profil', render: render });
})();
