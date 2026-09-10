/* Définition des disciplines gérables dans l'onglet Manager.
 *
 * Chaque sport partage le même moteur de match (js/game/match.js) mais avec
 * ses propres postes, durées, façons de marquer et économie.
 *
 * roles utilisés par le moteur : gk (gardien), def, mid, att
 * attW / defW : poids de chaque rôle dans la puissance offensive / défensive
 */
window.G = window.G || {};
G.DATA = G.DATA || {};

G.DATA.attrLabels = {
  att: 'Attaque', def: 'Défense', phy: 'Physique', tec: 'Technique', men: 'Mental'
};

G.DATA.sports = [
  /* ------------------------------------------------------------- FOOT --- */
  {
    id: 'football', name: 'Football', icon: '⚽', type: 'team',
    unit: 'but', unitPlural: 'buts',
    squadSize: 20, lineupSize: 11,
    duration: 90, segments: 18, periods: 2,
    avgEvents: 1.35, spread: 1.9,     // occasions converties par équipe
    scoreEvents: [{ label: 'But', pts: 1, w: 1 }],
    attW: { att: 0.50, mid: 0.33, def: 0.14, gk: 0.03 },
    defW: { def: 0.44, mid: 0.26, gk: 0.26, att: 0.04 },
    positions: [
      { code: 'G', name: 'Gardien', role: 'gk', need: 1, w: { def: .30, phy: .20, tec: .15, men: .30, att: .05 } },
      { code: 'DC', name: 'Défenseur central', role: 'def', need: 2, w: { def: .45, phy: .25, men: .15, tec: .10, att: .05 } },
      { code: 'DL', name: 'Latéral', role: 'def', need: 2, w: { def: .30, phy: .25, tec: .20, att: .15, men: .10 } },
      { code: 'MDF', name: 'Milieu défensif', role: 'mid', need: 1, w: { def: .32, phy: .22, tec: .22, men: .16, att: .08 } },
      { code: 'MC', name: 'Milieu central', role: 'mid', need: 2, w: { tec: .34, men: .22, phy: .16, att: .16, def: .12 } },
      { code: 'MO', name: 'Meneur de jeu', role: 'mid', need: 1, w: { tec: .38, att: .28, men: .20, phy: .08, def: .06 } },
      { code: 'AIL', name: 'Ailier', role: 'att', need: 1, w: { att: .34, tec: .28, phy: .20, men: .12, def: .06 } },
      { code: 'BU', name: 'Buteur', role: 'att', need: 1, w: { att: .48, tec: .20, phy: .18, men: .12, def: .02 } }
    ],
    tactics: {
      mentality: ['Ultra défensif', 'Prudent', 'Équilibré', 'Offensif', 'Tout pour l\'attaque'],
      pressing: ['Bloc bas', 'Bloc médian', 'Pressing haut'],
      style: ['Jeu direct', 'Possession', 'Contre-attaque']
    },
    economy: {
      clubCost: 3.0e7, gateBase: 1.1e6, sponsorBase: 2.2e6,
      prizeWin: 2.4e6, prizeDraw: 1.2e6, prizeLoss: 4.0e5,
      wageBase: 120000, valueMul: 1.0, tvSeason: 4.5e7
    },
    leagueSize: 12,
    countries: ['ESP', 'GBR', 'DEU', 'ITA', 'FRA', 'BRA', 'PRT', 'NLD', 'ARG',
      'BEL', 'TUR', 'MEX', 'USA', 'SAU', 'JPN', 'MAR', 'GRC', 'CHE', 'AUT', 'POL']
  },

  /* ------------------------------------------------------------ RUGBY --- */
  {
    id: 'rugby', name: 'Rugby à XV', icon: '🏉', type: 'team',
    unit: 'point', unitPlural: 'points',
    squadSize: 26, lineupSize: 15,
    duration: 80, segments: 16, periods: 2,
    avgEvents: 4.6, spread: 1.5,
    scoreEvents: [
      { label: 'Essai', pts: 5, w: 0.52, convert: { pts: 2, p: 0.74, label: 'Transformation' } },
      { label: 'Pénalité', pts: 3, w: 0.40 },
      { label: 'Drop', pts: 3, w: 0.08 }
    ],
    attW: { att: 0.42, mid: 0.30, def: 0.24, gk: 0.04 },
    defW: { def: 0.46, mid: 0.30, att: 0.20, gk: 0.04 },
    positions: [
      { code: 'PIL', name: 'Pilier', role: 'def', need: 2, w: { phy: .50, def: .28, men: .12, tec: .08, att: .02 } },
      { code: 'TAL', name: 'Talonneur', role: 'def', need: 1, w: { phy: .38, tec: .24, def: .24, men: .12, att: .02 } },
      { code: '2L', name: 'Deuxième ligne', role: 'def', need: 2, w: { phy: .46, def: .30, men: .12, tec: .08, att: .04 } },
      { code: '3L', name: 'Troisième ligne', role: 'mid', need: 3, w: { phy: .34, def: .26, att: .20, men: .12, tec: .08 } },
      { code: 'DM', name: 'Demi de mêlée', role: 'mid', need: 1, w: { tec: .36, men: .26, att: .18, phy: .12, def: .08 } },
      { code: 'DO', name: 'Demi d\'ouverture', role: 'mid', need: 1, w: { tec: .34, men: .30, att: .22, def: .08, phy: .06 } },
      { code: 'CEN', name: 'Centre', role: 'att', need: 2, w: { att: .32, phy: .26, def: .20, tec: .14, men: .08 } },
      { code: 'AIL', name: 'Ailier', role: 'att', need: 2, w: { att: .44, phy: .26, tec: .16, men: .08, def: .06 } },
      { code: 'ARR', name: 'Arrière', role: 'att', need: 1, w: { att: .28, tec: .26, def: .22, men: .16, phy: .08 } }
    ],
    tactics: {
      mentality: ['Jeu au pied', 'Prudent', 'Équilibré', 'Jeu de mouvement', 'Tout terrain'],
      pressing: ['Défense en retrait', 'Défense en ligne', 'Défense montante'],
      style: ['Domination des avants', 'Jeu équilibré', 'Jeu de ligne']
    },
    economy: {
      clubCost: 9.0e6, gateBase: 4.2e5, sponsorBase: 6.5e5,
      prizeWin: 6.2e5, prizeDraw: 3.5e5, prizeLoss: 1.2e5,
      wageBase: 38000, valueMul: 0.35, tvSeason: 1.1e7
    },
    leagueSize: 12,
    countries: ['NZL', 'ZAF', 'FRA', 'IRL', 'GBR', 'AUS', 'ARG', 'ITA', 'JPN',
      'GEO', 'FJI', 'URY', 'ROU', 'ESP', 'USA']
  },

  /* ------------------------------------------------------- WATER-POLO --- */
  {
    id: 'waterpolo', name: 'Water-polo', icon: '🤽', type: 'team',
    unit: 'but', unitPlural: 'buts',
    squadSize: 13, lineupSize: 7,
    duration: 32, segments: 16, periods: 4,
    avgEvents: 9.5, spread: 1.0,
    scoreEvents: [{ label: 'But', pts: 1, w: 1 }],
    attW: { att: 0.48, mid: 0.32, def: 0.16, gk: 0.04 },
    defW: { gk: 0.38, def: 0.36, mid: 0.22, att: 0.04 },
    positions: [
      { code: 'G', name: 'Gardien', role: 'gk', need: 1, w: { def: .34, men: .28, phy: .22, tec: .12, att: .04 } },
      { code: 'DEF', name: 'Défenseur', role: 'def', need: 2, w: { def: .42, phy: .30, men: .14, tec: .10, att: .04 } },
      { code: 'AIL', name: 'Ailier', role: 'mid', need: 2, w: { tec: .32, att: .28, phy: .20, men: .12, def: .08 } },
      { code: 'PC', name: 'Pointe centrale', role: 'att', need: 1, w: { att: .38, tec: .26, men: .18, phy: .14, def: .04 } },
      { code: 'CEN', name: 'Centre', role: 'att', need: 1, w: { phy: .40, att: .32, def: .14, tec: .10, men: .04 } }
    ],
    tactics: {
      mentality: ['Béton', 'Prudent', 'Équilibré', 'Offensif', 'Tir à tout va'],
      pressing: ['Zone', 'Mixte', 'Pressing individuel'],
      style: ['Jeu de centre', 'Jeu extérieur', 'Contre rapide']
    },
    economy: {
      clubCost: 1.2e6, gateBase: 4.5e4, sponsorBase: 7.0e4,
      prizeWin: 9.0e4, prizeDraw: 5.0e4, prizeLoss: 1.8e4,
      wageBase: 9000, valueMul: 0.07, tvSeason: 1.2e6
    },
    leagueSize: 10,
    countries: ['HRV', 'SRB', 'HUN', 'ITA', 'ESP', 'GRC', 'MNE', 'FRA', 'USA',
      'AUS', 'JPN', 'ROU', 'DEU', 'NLD']
  },

  /* ----------------------------------------------------------- BASKET --- */
  {
    id: 'basket', name: 'Basket-ball', icon: '🏀', type: 'team',
    unit: 'point', unitPlural: 'points',
    squadSize: 12, lineupSize: 5,
    duration: 40, segments: 20, periods: 4,
    avgEvents: 35, spread: 0.55,
    scoreEvents: [
      { label: 'Panier à 2 points', pts: 2, w: 0.56 },
      { label: 'Panier à 3 points', pts: 3, w: 0.26 },
      { label: 'Lancers francs', pts: 2, w: 0.18 }
    ],
    attW: { att: 0.44, mid: 0.34, def: 0.20, gk: 0.02 },
    defW: { def: 0.44, mid: 0.34, att: 0.20, gk: 0.02 },
    positions: [
      { code: 'MEN', name: 'Meneur', role: 'mid', need: 1, w: { tec: .38, men: .26, att: .20, phy: .10, def: .06 } },
      { code: 'ARR', name: 'Arrière', role: 'att', need: 1, w: { att: .40, tec: .26, phy: .16, men: .12, def: .06 } },
      { code: 'AIL', name: 'Ailier', role: 'att', need: 1, w: { att: .32, phy: .24, def: .20, tec: .16, men: .08 } },
      { code: 'AF', name: 'Ailier fort', role: 'def', need: 1, w: { phy: .36, def: .30, att: .20, tec: .08, men: .06 } },
      { code: 'PIV', name: 'Pivot', role: 'def', need: 1, w: { phy: .42, def: .32, att: .16, tec: .06, men: .04 } }
    ],
    tactics: {
      mentality: ['Jeu lent', 'Contrôlé', 'Équilibré', 'Rythme élevé', 'Run and gun'],
      pressing: ['Zone 2-3', 'Mixte', 'Individuelle tout terrain'],
      style: ['Jeu intérieur', 'Équilibré', 'Tir extérieur']
    },
    economy: {
      clubCost: 1.4e7, gateBase: 5.2e5, sponsorBase: 9.0e5,
      prizeWin: 9.5e5, prizeDraw: 0, prizeLoss: 2.0e5,
      wageBase: 75000, valueMul: 0.55, tvSeason: 1.8e7
    },
    leagueSize: 12,
    countries: ['USA', 'ESP', 'GRC', 'TUR', 'ITA', 'FRA', 'DEU', 'SRB', 'LTU',
      'ISR', 'AUS', 'CHN', 'ARG', 'BRA', 'PHL']
  },

  /* -------------------------------------------------------- HANDBALL --- */
  {
    id: 'handball', name: 'Handball', icon: '🤾', type: 'team',
    unit: 'but', unitPlural: 'buts',
    squadSize: 16, lineupSize: 7,
    duration: 60, segments: 15, periods: 2,
    avgEvents: 27, spread: 0.6,
    scoreEvents: [{ label: 'But', pts: 1, w: 1 }],
    attW: { att: 0.46, mid: 0.34, def: 0.16, gk: 0.04 },
    defW: { gk: 0.34, def: 0.36, mid: 0.26, att: 0.04 },
    positions: [
      { code: 'G', name: 'Gardien', role: 'gk', need: 1, w: { def: .36, men: .28, tec: .18, phy: .14, att: .04 } },
      { code: 'ARG', name: 'Arrière gauche', role: 'att', need: 1, w: { att: .38, phy: .26, tec: .20, men: .10, def: .06 } },
      { code: 'DC', name: 'Demi-centre', role: 'mid', need: 1, w: { tec: .34, men: .28, att: .20, phy: .12, def: .06 } },
      { code: 'ARD', name: 'Arrière droit', role: 'att', need: 1, w: { att: .38, phy: .26, tec: .20, men: .10, def: .06 } },
      { code: 'AIG', name: 'Ailier gauche', role: 'mid', need: 1, w: { tec: .30, att: .30, phy: .22, men: .12, def: .06 } },
      { code: 'AID', name: 'Ailier droit', role: 'mid', need: 1, w: { tec: .30, att: .30, phy: .22, men: .12, def: .06 } },
      { code: 'PIV', name: 'Pivot', role: 'def', need: 1, w: { phy: .42, def: .28, att: .20, tec: .06, men: .04 } }
    ],
    tactics: {
      mentality: ['Défense 6-0', 'Prudent', 'Équilibré', 'Offensif', 'Kamikaze'],
      pressing: ['Bloc 6-0', 'Bloc 5-1', 'Bloc 3-2-1'],
      style: ['Jeu de pivot', 'Équilibré', 'Tirs de loin']
    },
    economy: {
      clubCost: 4.0e6, gateBase: 1.4e5, sponsorBase: 2.4e5,
      prizeWin: 2.5e5, prizeDraw: 1.4e5, prizeLoss: 5.0e4,
      wageBase: 20000, valueMul: 0.18, tvSeason: 4.0e6
    },
    leagueSize: 12,
    countries: ['FRA', 'DEU', 'ESP', 'DNK', 'HUN', 'POL', 'HRV', 'NOR', 'SWE',
      'SVN', 'PRT', 'QAT', 'EGY', 'ISL']
  },

  /* --------------------------------------------------- SPORT AUTOMOBILE - */
  {
    id: 'motorsport', name: 'Sport automobile', icon: '🏎️', type: 'race',
    unit: 'point', unitPlural: 'points',
    squadSize: 2, lineupSize: 2,
    /* Les deux pilotes portent toute la performance humaine ; la voiture est
       ajoutée par-dessus dans G.manager.teamRatings(). */
    attW: { att: 1.0 }, defW: { att: 1.0 },
    positions: [
      { code: 'P1', name: 'Pilote n°1', role: 'att', need: 1, w: { tec: .34, men: .26, phy: .18, att: .18, def: .04 } },
      { code: 'P2', name: 'Pilote n°2', role: 'att', need: 1, w: { tec: .34, men: .26, phy: .18, att: .18, def: .04 } }
    ],
    car: [
      { id: 'moteur', name: 'Moteur', icon: '🔧', desc: 'Vitesse de pointe en ligne droite.' },
      { id: 'aero', name: 'Aérodynamique', icon: '🪽', desc: 'Vitesse dans les courbes rapides.' },
      { id: 'chassis', name: 'Châssis', icon: '🛠️', desc: 'Traction et usure des pneus.' },
      { id: 'fiabilite', name: 'Fiabilité', icon: '🧰', desc: 'Réduit le risque d\'abandon.' }
    ],
    race: {
      laps: 30, grid: 14, pitLoss: 22,
      points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
      tyres: [
        { id: 'tendre', name: 'Tendres', pace: 1.9, wear: 2.35 },
        { id: 'medium', name: 'Mediums', pace: 0.9, wear: 1.55 },
        { id: 'dur', name: 'Durs', pace: 0.0, wear: 1.00 },
        { id: 'pluie', name: 'Pluie', pace: -1.5, wear: 1.20, rain: true }
      ]
    },
    tactics: {
      mentality: ['Économie totale', 'Conservateur', 'Équilibré', 'Agressif', 'Attaque permanente'],
      pressing: ['1 arrêt', '2 arrêts', 'Réactif'],
      style: ['Setup vitesse', 'Setup équilibré', 'Setup appui']
    },
    economy: {
      clubCost: 8.0e7, gateBase: 0, sponsorBase: 5.5e6,
      prizeWin: 0, prizeDraw: 0, prizeLoss: 0,
      prizePerPoint: 4.2e5,
      wageBase: 1.2e6, valueMul: 2.4, tvSeason: 6.0e7
    },
    leagueSize: 7,
    countries: ['GBR', 'ITA', 'DEU', 'FRA', 'AUT', 'CHE', 'USA', 'JPN', 'ESP',
      'NLD', 'ARE', 'BRA']
  }
];

G.DATA.sportById = (function () {
  var m = {};
  for (var i = 0; i < G.DATA.sports.length; i++) m[G.DATA.sports[i].id] = G.DATA.sports[i];
  return m;
})();

/* Installations améliorables, communes à tous les clubs. */
G.DATA.facilities = [
  {
    id: 'stade', name: 'Enceinte', icon: '🏟️',
    desc: 'Capacité et confort : billetterie et revenus les jours de match.',
    baseCost: 1.0, effect: 'Recettes de match +12 % par niveau'
  },
  {
    id: 'entrainement', name: 'Centre d\'entraînement', icon: '🎯',
    desc: 'Progression des joueurs et récupération entre les matchs.',
    baseCost: 0.8, effect: 'Progression et récupération accélérées'
  },
  {
    id: 'formation', name: 'Centre de formation', icon: '🌱',
    desc: 'Fait éclore de jeunes talents à la fin de chaque saison.',
    baseCost: 0.9, effect: 'Jeunes pousses de meilleur niveau'
  },
  {
    id: 'medical', name: 'Pôle médical', icon: '⚕️',
    desc: 'Réduit la fréquence et la durée des blessures.',
    baseCost: 0.6, effect: 'Risque de blessure -10 % par niveau'
  },
  {
    id: 'marketing', name: 'Direction marketing', icon: '📣',
    desc: 'Négocie les contrats sponsors et le merchandising.',
    baseCost: 0.7, effect: 'Revenus sponsors +15 % par niveau'
  }
];

/* Personnel d'encadrement. */
G.DATA.staffRoles = [
  { id: 'coach', name: 'Entraîneur principal', icon: '📋', effect: 'Bonus tactique en match' },
  { id: 'adjoint', name: 'Préparateur physique', icon: '💪', effect: 'Endurance des joueurs' },
  { id: 'scout', name: 'Recruteur en chef', icon: '🔍', effect: 'Qualité des joueurs proposés' },
  { id: 'medecin', name: 'Médecin de club', icon: '🩺', effect: 'Guérison des blessures' }
];
