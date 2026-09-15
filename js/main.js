/* Démarrage du jeu. */
window.G = window.G || {};

(function () {
  'use strict';
  var u = G.util;

  /* -------------------------------------------------------------- guide - */

  var GUIDE = [
    ['🏢', 'Fonder ses entreprises',
      'Choisissez un type d\'entreprise dans le catalogue, donnez-lui le nom que ' +
      'vous voulez, puis touchez-la pour investir palier par palier. Chaque palier ' +
      'lance un chantier ; les revenus sont ensuite versés en continu sur votre compte. ' +
      'Le revenu brut est calé sur le chiffre d\'affaires mensuel réel d\'une entreprise ' +
      'comparable (en 24h de jeu, vous gagnez ce qu\'elle gagne en un mois), moins des ' +
      'salaires réalistes qui varient selon le secteur (charge légère dans l\'énergie, ' +
      'lourde dans la restauration, la santé ou le droit). ' +
      'Les flottes (taxis, transport routier, compagnie maritime, aviation régionale, ' +
      'réseau de métro) fonctionnent autrement : on y achète des véhicules un par un, ' +
      'dans la limite de la capacité du garage, qui s\'agrandit contre paiement.'],
    ['🧾', 'Payer ses impôts',
      '15 % de tout ce que vous gagnez, prélevés tous les 3 à 4 jours avec 24h de ' +
      'sursis avant blocage des revenus. Vous pouvez aussi régler la note par ' +
      'anticipation à tout moment depuis l\'onglet Entreprise : les impôts ne se ' +
      'paient jamais tout seuls, c\'est toujours vous qui décidez.'],
    ['🏛️', 'Fusionner ses entreprises',
      'Une douzaine de grands conglomérats ne s\'achètent pas directement : chacun naît ' +
      'd\'une combinaison différente de vos entreprises et flottes existantes (niveaux ' +
      'atteints, véhicules possédés), plus un investissement d\'ouverture. Le Conglomérat ' +
      'mondial, lui, naît de la fusion d\'autres conglomérats. Les entreprises fusionnées ' +
      'restent à vous : rien n\'est perdu dans l\'opération.'],
    ['📈', 'Placer son argent',
      'Actions cotées, immobilier dans douze villes et cryptomonnaies très ' +
      'volatiles. Les collections d\'objets de prestige donnent en plus des bonus ' +
      'permanents à tout le reste du jeu.'],
    ['🏟️', 'Diriger des clubs',
      '15 sports (foot, rugby, basket, hand, water-polo, sport auto, volley, ' +
      'hockey, baseball, cyclisme, et les sports de raquette : tennis, ' +
      'badminton, squash, tennis de table, padel), des dizaines de pays. Le ' +
      'prix d\'un club est calé sur la valeur du plus grand club réel de la ' +
      'discipline (façon PSG ou Grand Chelem), divisé par 3 à chaque palier ' +
      'en dessous — commencez en bas (D3 ou circuit amateur) pour pas cher, ou ' +
      'visez d\'emblée plus haut si votre fortune le permet. Vous pouvez aussi ' +
      'racheter la fédération d\'un pays pour jouer les compétitions ' +
      'internationales, fusionner deux clubs, signer des sponsors, et posséder ' +
      'plusieurs clubs à la fois.'],
    ['🎮', 'Jouer les matchs vous-même',
      'Football, rugby, water-polo, basket, handball : joystick à gauche, tirer ' +
      'et passer à droite, la caméra suit le ballon. En sport automobile, vous ' +
      'pilotez la voiture. Vous pouvez aussi rester sur le banc et donner les ' +
      'consignes, ou simuler la rencontre.'],
    ['🌍', 'Prendre le pouvoir',
      '194 pays réels sur une mappemonde interactive. Impôts, budgets, ressources, ' +
      'usines, centrales, armée, guerres, annexions, ONU, technologies, merveilles ' +
      'du monde : vous gouvernez vraiment.'],
    ['🎰', 'Tenter le casino',
      'Blackjack, Texas hold\'em, roulette et machines à sous. La maison garde ' +
      'l\'avantage, mais une bonne série finance un transfert.'],
    ['♻️', 'Et surtout : tout communique',
      'Un seul portefeuille pour tout le jeu. La prime touchée après une victoire ' +
      'au rugby ou un gros pot au poker peut être replacée immédiatement en Bourse, ' +
      'en immobilier ou en crypto — le bandeau vert en haut de l\'écran vous le ' +
      'propose, et le jeu garde la trace de l\'origine de chaque capital investi.']
  ];

  function showGuide(onClose) {
    var h = '';
    for (var i = 0; i < GUIDE.length; i++) {
      h += '<div class="item"><div class="item-icon">' + GUIDE[i][0] + '</div>' +
        '<div class="item-main"><div class="t">' + GUIDE[i][1] + '</div>' +
        '<div class="s">' + GUIDE[i][2] + '</div></div></div>';
    }
    h += '<button class="btn primary full" style="margin-top:12px" data-act="ui.close">' +
      'Commencer</button>';
    G.ui.modal('Bienvenue dans Empire Total', h, { onClose: onClose });
  }
  G.ui.showGuide = showGuide;

  /* ---------------------------------------------------- rapport hors ligne */

  function showOffline(off, onClose) {
    var h = '<p class="muted">Vous étiez absent pendant ' +
      u.fmtDuration(off.seconds * 1000) +
      (off.seconds > off.capped ? ' (production plafonnée à 8 heures)' : '') + '.</p>';
    h += G.ui.stat('Encaissé automatiquement', u.fmtMoney(off.earned), 'good');
    h += '<div class="mute2" style="margin-top:8px">' + off.days +
      ' séance(s) de Bourse se sont écoulées pendant votre absence.</div>';
    h += '<button class="btn primary full" style="margin-top:12px" data-act="ui.close">' +
      'Reprendre les affaires</button>';
    G.ui.modal('👋 De retour', h, { onClose: onClose });
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
      showGuide(function () { G.ui.showAd(); });
      G.save.write();
    } else if (off && off.earned > 0) {
      showOffline(off, function () { G.ui.showAd(); });
    } else {
      G.ui.showAd();
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
