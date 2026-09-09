/* Démarrage du jeu. */
window.G = window.G || {};

(function () {
  'use strict';
  var u = G.util;

  /* -------------------------------------------------------------- guide - */

  var GUIDE = [
    ['🏢', 'Bâtir un empire',
      'Achetez des entreprises, montez-les en niveau, recrutez un directeur pour ' +
      'qu\'elles encaissent toutes seules. Chaque palier de niveau double le rendement.'],
    ['📈', 'Placer en Bourse',
      'Seize valeurs cotées évoluent en continu, avec dividendes et actualités. ' +
      'Posséder des entreprises dans un secteur soutient discrètement les titres ' +
      'de ce secteur.'],
    ['🏟️', 'Diriger des clubs',
      'Football, rugby, water-polo, basket, handball, sport automobile : achetez un ' +
      'club, gérez l\'effectif, les transferts, la tactique et les installations — ' +
      'puis jouez vos matchs, décision après décision.'],
    ['🎰', 'Tenter le casino',
      'Blackjack, Texas hold\'em, roulette et machines à sous. La maison garde ' +
      'l\'avantage, mais une bonne série finance un transfert.'],
    ['🏛️', 'Prendre le pouvoir',
      'Avec assez de fortune, financez une campagne et dirigez un pays : impôts, ' +
      'budgets, lois, élections. L\'économie nationale se répercute sur vos ' +
      'entreprises et sur les marchés.'],
    ['♻️', 'Et surtout : tout communique',
      'Un seul portefeuille pour tout le jeu. La prime touchée après une victoire ' +
      'au rugby ou un gros pot au poker peut être replacée immédiatement sur une ' +
      'action — le bandeau vert en haut de l\'écran vous le propose, et le jeu ' +
      'garde la trace de l\'origine de chaque capital investi.']
  ];

  function showGuide() {
    var h = '';
    for (var i = 0; i < GUIDE.length; i++) {
      h += '<div class="item"><div class="item-icon">' + GUIDE[i][0] + '</div>' +
        '<div class="item-main"><div class="t">' + GUIDE[i][1] + '</div>' +
        '<div class="s">' + GUIDE[i][2] + '</div></div></div>';
    }
    h += '<button class="btn primary full" style="margin-top:12px" data-act="ui.close">' +
      'Commencer</button>';
    G.ui.modal('Bienvenue dans Empire Total', h, {});
  }
  G.ui.showGuide = showGuide;

  /* ---------------------------------------------------- rapport hors ligne */

  function showOffline(off) {
    var h = '<p class="muted">Vous étiez absent pendant ' +
      u.fmtDuration(off.seconds * 1000) +
      (off.seconds > off.capped ? ' (production plafonnée à 8 heures)' : '') + '.</p>';
    h += '<div class="grid2">' +
      G.ui.stat('Encaissé automatiquement', u.fmtMoney(off.earned), 'good') +
      G.ui.stat('En attente dans les caisses', u.fmtMoney(off.pending), 'warn') +
      '</div>';
    h += '<div class="mute2" style="margin-top:8px">' + off.days +
      ' séance(s) de Bourse se sont écoulées pendant votre absence.</div>';
    h += '<button class="btn primary full" style="margin-top:12px" data-act="ui.close">' +
      'Reprendre les affaires</button>';
    G.ui.modal('👋 De retour', h, {});
  }

  /* --------------------------------------------------------------- boot - */

  function boot() {
    var loaded = G.save.read();
    var isNew = !loaded;
    G.state = loaded || G.newState();

    G.ui.init();

    var off = isNew ? null : G.loop.offlineProgress();
    G.loop.start();

    if (isNew) {
      showGuide();
      G.save.write();
    } else if (off && (off.earned > 0 || off.pending > 0)) {
      showOffline(off);
    }

    /* Mise en cache pour un fonctionnement complet hors ligne. */
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* hors ligne déjà */ });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
